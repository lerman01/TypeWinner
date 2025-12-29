use std::path::PathBuf;

pub fn get_config_dir() -> Result<PathBuf, String> {
    dirs::config_dir()
        .ok_or_else(|| "Config directory not found".to_string())
        .map(|dir| dir.join("TypeWinner"))
}

pub fn get_data_dir() -> Result<PathBuf, String> {
    dirs::data_dir()
        .ok_or_else(|| "Data directory not found".to_string())
        .map(|dir| dir.join("TypeWinner"))
}

pub fn get_api_key_path() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("grokKey"))
}

pub fn get_type_config_path() -> Result<PathBuf, String> {
    let config_dir = get_config_dir()?;
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("typeConfig.json"))
}

