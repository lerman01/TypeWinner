use std::path::PathBuf;

pub fn get_chrome_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let program_files = std::env::var("PROGRAMFILES")
            .unwrap_or_else(|_| "C:\\Program Files".to_string());
        let program_files_x86 = std::env::var("PROGRAMFILES(X86)")
            .unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());
        
        let possible_paths = vec![
            PathBuf::from(&program_files).join("Google").join("Chrome").join("Application").join("chrome.exe"),
            PathBuf::from(&program_files_x86).join("Google").join("Chrome").join("Application").join("chrome.exe"),
        ];
        
        possible_paths.into_iter().find(|p| p.exists())
    }
    
    #[cfg(target_os = "macos")]
    {
        let mac_path = PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
        if mac_path.exists() {
            Some(mac_path)
        } else {
            None
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let linux_paths = vec![
            PathBuf::from("/usr/bin/google-chrome"),
            PathBuf::from("/usr/bin/google-chrome-stable"),
            PathBuf::from("/snap/bin/chromium"),
        ];
        linux_paths.into_iter().find(|p| p.exists())
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        None
    }
}

pub fn check_chrome_exists() -> bool {
    get_chrome_path().is_some()
}

