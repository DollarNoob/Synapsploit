#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod msapi;
mod commands;

use std::env;
use std::cmp::{min, max};
use std::sync::Mutex;
use std::fs;
use tauri::{AppHandle, CustomMenuItem, Manager, PhysicalPosition, Position, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use commands::config;
use commands::macsploit;
use commands::window;
use commands::settings;

pub struct AppState {
    pub api: std::sync::Mutex<Option<msapi::MsApi>>
}

#[derive(serde::Serialize)]
#[derive(serde::Deserialize)]
pub struct Config {
    pub always_on_top: bool,
    pub auto_attach: bool,
    pub scan_port: bool
}

fn on_system_tray_event(handle: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            let window = handle.get_window("main").unwrap();
            match window.is_visible() {
                Ok(true) => {
                    window.set_focus().expect("Failed to set focus");
                }
                Ok(false) => {}
                Err(_) => {}
            }

            if let Some(monitor) = window.current_monitor().ok().flatten() {
                let monitor_size = monitor.size();
                let window_size = window.inner_size().expect("Failed to get window size");
                let window_position = window.outer_position().expect("Failed to get window position");

                let centered_x = min(max(window_position.x, 40), monitor_size.width as i32 - window_size.width as i32 - 40);
                let centered_y = min(max(window_position.y, 40), monitor_size.height as i32 - window_size.height as i32 - 40);
                window.set_position(Position::Physical(PhysicalPosition::new(centered_x, centered_y))).expect("Failed to center window position");
            } else {
                eprintln!("Failed to get current monitor");
            }
        } SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "exit" => {
                    handle.exit(0);
                }
                _ => {}
            }
        } _ => {}
    }
}

fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(
            CustomMenuItem::new("title", "Synapse X - v1.2.1").disabled()
        )
        .add_item(
            CustomMenuItem::new("title", "MacSploit v1.2.4 Edition").disabled()
        )
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(
            CustomMenuItem::new("exit", "Exit")
        );
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .plugin(tauri_plugin_context_menu::init())
        .system_tray(system_tray)
        .on_system_tray_event(on_system_tray_event)
        .manage(AppState {
            api: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            config::read_config,
            config::write_config,
            macsploit::execute,
            macsploit::attach,
            macsploit::update_setting,
            window::open_options,
            window::open_popup,
            window::open_folder,
            window::close_window,
            settings::read_setting,
            settings::write_setting
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::Ready { } => {
                let app_data_dir = app_handle.path_resolver().app_data_dir().unwrap();

                let scripts_dir = app_data_dir.join("scripts");
                if !scripts_dir.exists() {
                    fs::create_dir_all(scripts_dir).expect("Failed to create scripts directory");
                }

                let config_dir = app_data_dir.join("config.toml");
                if !config_dir.exists() {
                    config::write_config(app_handle.clone(), true, true, true).expect("Failed to save default config");
                }
            }
            tauri::RunEvent::ExitRequested {
                api, ..
            } => {
                api.prevent_exit();
            } _ => {}
        });
}