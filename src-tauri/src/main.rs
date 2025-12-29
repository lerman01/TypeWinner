// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod utils;

use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

pub struct TypeConfig {
    pub min_delay: Mutex<u32>,
    pub max_delay: Mutex<u32>,
    pub error_rate: Mutex<u32>,
}

pub struct PuppeteerProcess {
    pub child: Arc<tokio::sync::Mutex<Option<tokio::process::Child>>>,
}

impl Default for TypeConfig {
    fn default() -> Self {
        Self {
            min_delay: Mutex::new(20),
            max_delay: Mutex::new(25),
            error_rate: Mutex::new(0),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TypeConfig::default())
        .manage(PuppeteerProcess {
            child: Arc::new(tokio::sync::Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            commands::quit,
            commands::save_api_key,
            commands::get_api_key,
            commands::open_external,
            commands::open_browser,
            commands::update_type_speed,
            commands::update_err_rate,
        ])
        .setup(|app| {
            // Check for Chrome on startup
            if !utils::chrome::check_chrome_exists() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("chrome-error", "Google Chrome could not be found on this system.");
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill puppeteer process when window closes (non-blocking)
                let app_handle = window.app_handle().clone();
                if let Some(puppeteer_state) = app_handle.try_state::<PuppeteerProcess>() {
                    let child_arc = puppeteer_state.child.clone();
                    // Spawn async task to kill process - don't block the close
                    tokio::spawn(async move {
                        let mut child_guard = child_arc.lock().await;
                        if let Some(mut child) = child_guard.take() {
                            let _ = child.kill().await;
                        }
                    });
                }
                // Window will close by default (no need to prevent it)
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
