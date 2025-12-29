use serde::{Deserialize, Serialize};
use serde_json;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};
use crate::utils::{chrome, config};

const MAX_DELAY: u32 = 400;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSpeedArgs {
    pub min: u32,
    pub max: u32,
}

#[tauri::command]
pub async fn quit(app: AppHandle) -> Result<(), String> {
    println!("Quit command called - forcing immediate exit...");

    // Spawn a separate task to attempt cleanup (won't block exit)
    if let Some(puppeteer_state) = app.try_state::<crate::PuppeteerProcess>() {
        let child_arc = puppeteer_state.child.clone();
        tokio::spawn(async move {
            if let Ok(mut child_guard) = child_arc.try_lock() {
                if let Some(mut child) = child_guard.take() {
                    let _ = child.kill().await;
                }
            }
        });
    }

    // Exit immediately without waiting
    std::process::exit(0);
}

#[tauri::command]
pub async fn save_api_key(api_key: String) -> Result<(), String> {
    let api_key_path = config::get_api_key_path()?;
    fs::write(&api_key_path, api_key)
        .map_err(|e| format!("Failed to write API key: {}", e))?;
    // Groq initialization is handled by the Node.js puppeteer script
    Ok(())
}

#[tauri::command]
pub async fn get_api_key() -> Result<Option<String>, String> {
    let api_key_path = config::get_api_key_path()?;
    if api_key_path.exists() {
        let content = fs::read_to_string(&api_key_path)
            .map_err(|e| format!("Failed to read API key: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn open_external(_app: AppHandle, url: String) -> Result<(), String> {
    // Use shell command to open URL (deprecated open method replaced with command)
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_browser(
    app: AppHandle,
    type_config: State<'_, crate::TypeConfig>,
) -> Result<(), String> {
    let chrome_path = chrome::get_chrome_path()
        .ok_or_else(|| "Chrome not found".to_string())?;

    // Get current config values
    let min_delay = *type_config.min_delay.lock().unwrap();
    let max_delay = *type_config.max_delay.lock().unwrap();
    let error_rate = *type_config.error_rate.lock().unwrap();

    // Get paths
    let data_dir = config::get_data_dir()?;
    let api_key_path = config::get_api_key_path()?;
    let api_key = if api_key_path.exists() {
        fs::read_to_string(&api_key_path).ok()
    } else {
        None
    };

    // Find the puppeteer script - try resource directory first (production), then dev paths
    let script_path = {
        // In production, resources are bundled next to the executable
        // Try to find the script in the resource directory relative to the executable
        let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
        println!("Current executable path: {:?}", exe_path);
        
        let resource_path = exe_path.parent().and_then(|exe_dir| {
            println!("Executable directory: {:?}", exe_dir);
            
            let mut possible_resource_paths = vec![
                exe_dir.join("puppeteer-node.cjs"),
                exe_dir.join("resources").join("puppeteer-node.cjs"),
            ];
            
            // On macOS, resources are in the app bundle
            // Tauri preserves the relative path structure, so "../src/main/utils/puppeteer-node.cjs"
            // becomes "_up_/src/main/utils/puppeteer-node.cjs" in Resources
            #[cfg(target_os = "macos")]
            {
                // Try the Resources directory with the preserved path structure
                if let Some(resources_dir) = exe_dir.parent()
                    .and_then(|p| p.parent())
                    .and_then(|p| p.parent())
                    .map(|p| p.join("Resources")) {
                    possible_resource_paths.push(resources_dir.join("puppeteer-node.cjs"));
                    possible_resource_paths.push(resources_dir.join("_up_").join("src").join("main").join("utils").join("puppeteer-node.cjs"));
                }
            }
            
            // On Windows/Linux, resources might be in a resources subdirectory
            #[cfg(not(target_os = "macos"))]
            {
                possible_resource_paths.push(exe_dir.join("resources").join("_up_").join("src").join("main").join("utils").join("puppeteer-node.cjs"));
            }
            
            println!("Checking resource paths:");
            for path in &possible_resource_paths {
                println!("  Checking: {:?} (exists: {})", path, path.exists());
            }
            
            possible_resource_paths
                .into_iter()
                .find(|p| p.exists())
        });
        
        if let Some(path) = resource_path {
            println!("Found script in resource directory: {:?}", path);
            path
        } else {
            println!("Script not found in resource directory, trying dev paths...");
            // Dev mode or fallback: use relative paths
            let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            println!("Current working directory: {:?}", current_dir);
            let possible_paths = vec![
                current_dir.join("src").join("main").join("utils").join("puppeteer-node.cjs"),
                current_dir.join("..").join("src").join("main").join("utils").join("puppeteer-node.cjs"),
                PathBuf::from("src").join("main").join("utils").join("puppeteer-node.cjs"),
                PathBuf::from("../src").join("main").join("utils").join("puppeteer-node.cjs"),
            ];
            println!("Checking dev paths:");
            for path in &possible_paths {
                println!("  Checking: {:?} (exists: {})", path, path.exists());
            }
            possible_paths
                .into_iter()
                .find(|p| p.exists())
                .ok_or_else(|| {
                    let error_msg = format!(
                        "Puppeteer script not found. Checked:\n  Executable dir: {:?}\n  Current dir: {:?}",
                        exe_path.parent(),
                        current_dir
                    );
                    eprintln!("{}", error_msg);
                    error_msg
                })?
        }
    };
    
    println!("Using script path: {:?}", script_path);

    // Emit event to frontend that browser is opening (before spawning process)
    if let Some(window) = app.get_webview_window("main") {
        println!("Emitting browser-opening event");
        if let Err(e) = window.emit::<()>("browser-opening", ()) {
            eprintln!("Failed to emit browser-opening event: {}", e);
        } else {
            println!("browser-opening event emitted successfully");
        }
    }

    // Write initial config to file
    let config_path = config::get_type_config_path()?;
    let config_json = serde_json::json!({
        "minDelay": min_delay,
        "maxDelay": max_delay,
        "errorRate": error_rate,
    });
    fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
        .map_err(|e| format!("Failed to write config: {}", e))?;

    // Check if Node.js is available
    let node_path = which::which("node")
        .ok()
        .or_else(|| {
            // Try common Node.js locations
            #[cfg(target_os = "macos")]
            {
                let path1 = PathBuf::from("/usr/local/bin/node");
                if path1.exists() {
                    Some(path1)
                } else {
                    let path2 = PathBuf::from("/opt/homebrew/bin/node");
                    if path2.exists() {
                        Some(path2)
                    } else {
                        None
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            {
                None
            }
        })
        .ok_or_else(|| {
            let error = "Node.js not found in PATH. Please ensure Node.js is installed and accessible.";
            eprintln!("{}", error);
            error.to_string()
        })?;
    
    println!("Using Node.js at: {:?}", node_path);
    println!("Spawning puppeteer process with args:");
    println!("  Script: {:?}", script_path);
    println!("  Chrome: {:?}", chrome_path);
    println!("  Data dir: {:?}", data_dir);
    println!("  Config: {:?}", config_path);
    
    // Spawn the puppeteer process
    let child = tokio::process::Command::new(&node_path)
        .arg(&script_path)
        .arg(chrome_path.to_string_lossy().to_string())
        .arg(data_dir.to_string_lossy().to_string())
        .arg(config_path.to_string_lossy().to_string())
        .arg(api_key.unwrap_or_default())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            let error = format!(
                "Failed to spawn puppeteer process: {}. Node path: {:?}, Script path: {:?}",
                e, node_path, script_path
            );
            eprintln!("{}", error);
            error
        })?;

    // Store the child process handle so we can kill it on app exit
    let puppeteer_state = app.state::<crate::PuppeteerProcess>();
    let child_arc = puppeteer_state.child.clone();

    // Store the child in the state and get a reference for monitoring
    let mut child_guard = child_arc.lock().await;
    *child_guard = Some(child);

    // Now spawn the monitoring task with the app handle
    let app_handle = app.clone();
    let child_arc_monitor = puppeteer_state.child.clone();

    // We need to drop the guard before spawning the monitoring task
    drop(child_guard);

    tokio::spawn(async move {
        // Wait for the process to exit
        let mut child_guard = child_arc_monitor.lock().await;
        if let Some(ref mut child) = *child_guard {
            // Monitoring started - will wait for process to exit
            match child.wait().await {
                Ok(status) => {
                    println!("Puppeteer process exited with status: {:?}", status);
                    // Clear the process from state
                    *child_guard = None;
                    // Small delay to ensure window is ready
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    // Emit to the main window
                    if let Some(window) = app_handle.get_webview_window("main") {
                        println!("Emitting enableBrowser event to main window");
                        if let Err(e) = window.emit::<()>("enableBrowser", ()) {
                            eprintln!("Failed to emit enableBrowser event: {}", e);
                        } else {
                            println!("enableBrowser event emitted successfully");
                        }
                    } else {
                        eprintln!("Main window not found! Trying app-level emit...");
                        let _ = app_handle.emit::<()>("enableBrowser", ());
                    }
                }
                Err(e) => {
                    eprintln!("Error waiting for puppeteer process: {}", e);
                    *child_guard = None;
                    // Still emit the event even on error
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.emit::<()>("enableBrowser", ());
                    } else {
                        let _ = app_handle.emit::<()>("enableBrowser", ());
                    }
                }
            }
        } else {
            println!("Warning: Child process not found in state when monitoring started");
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn update_type_speed(
    args: UpdateSpeedArgs,
    type_config: State<'_, crate::TypeConfig>,
) -> Result<(), String> {
    let mut min_delay = type_config.min_delay.lock().unwrap();
    let mut max_delay = type_config.max_delay.lock().unwrap();
    *min_delay = MAX_DELAY - args.max;
    *max_delay = MAX_DELAY - args.min;

    // Write config to file so puppeteer script can read it
    let config_path = config::get_type_config_path()?;
    let config_json = serde_json::json!({
        "minDelay": *min_delay,
        "maxDelay": *max_delay,
        "errorRate": *type_config.error_rate.lock().unwrap(),
    });
    fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_err_rate(
    err_rate: u32,
    type_config: State<'_, crate::TypeConfig>,
) -> Result<(), String> {
    let mut error_rate = type_config.error_rate.lock().unwrap();
    *error_rate = err_rate;

    // Write config to file so puppeteer script can read it
    let config_path = config::get_type_config_path()?;
    let config_json = serde_json::json!({
        "minDelay": *type_config.min_delay.lock().unwrap(),
        "maxDelay": *type_config.max_delay.lock().unwrap(),
        "errorRate": err_rate,
    });
    fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

