use std::fs;
use std::io::Write;
use tauri::{AppHandle, Manager};
use crate::Config;

#[tauri::command]
pub fn read_config(handle: AppHandle) -> Result<Config, String> {
    let cfg_path = handle.path_resolver().app_data_dir().unwrap().join("config.toml");
    if !cfg_path.exists() {
        return Err("Config file does not exist".into())
    }

    let cfg_str = fs::read_to_string(cfg_path).expect("Failed to read config");
    let cfg: Config = toml::from_str(&cfg_str).unwrap();

    Ok(cfg)
}

#[tauri::command]
pub fn write_config(handle: AppHandle, always_on_top: bool, auto_attach: bool, auto_execute: bool, scan_port: bool) -> Result<(), String> {
    if let Some(main) = handle.get_window("main") {
        main.set_always_on_top(always_on_top).expect("Failed to set always on top");
    }

    let cfg_path = handle.path_resolver().app_data_dir().unwrap().join("config.toml");

    let cfg = Config {
        always_on_top,
        auto_attach,
        auto_execute,
        scan_port
    };

    let mut file = fs::File::create(&cfg_path).expect("Failed to create config");
    file.write_all(toml::to_string(&cfg).unwrap().as_bytes()).expect("Failed to write config");

    if let Some(window) = handle.get_window("main") {
        window.emit("config-update", format!("{}{}{}{}", always_on_top as i32, auto_attach as i32, auto_execute as i32, scan_port as i32)).expect("Failed to emit config-update");
    }

    Ok(())
}