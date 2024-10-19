#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod msapi;
mod commands;

use std::env;
use std::sync::Mutex;
use std::fs;
use std::fs::create_dir;
use std::process::Command;
use directories::UserDirs;
use tauri::{AboutMetadata, CustomMenuItem, Manager, Menu, MenuItem, Submenu, WindowMenuEvent};
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

fn on_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "open_autoexecute" => {
            if let Some(user_dirs) = UserDirs::new() {
                let document_dir = user_dirs.document_dir().expect("Documents directory does not exist");
                let autoexec_dir = document_dir.join("Macsploit Automatic Execution");
                if !autoexec_dir.exists() {
                    create_dir(&autoexec_dir).expect("Could not create automatic execution folder");
                }

                // MacOS only
                Command::new("open")
                    .args([autoexec_dir.to_str().unwrap()])
                    .spawn()
                    .unwrap();
            }
        }
        "open_workspace" => {
            if let Some(user_dirs) = UserDirs::new() {
                let document_dir = user_dirs.document_dir().expect("Documents directory does not exist");
                let workspace_dir = document_dir.join("Macsploit Workspace");
                if !workspace_dir.exists() {
                    create_dir(&workspace_dir).expect("Could not create workspace folder");
                }

                // MacOS only
                Command::new("open")
                    .args([workspace_dir.to_str().unwrap()])
                    .spawn()
                    .unwrap();
            }
        }
        "open_scripts" => {
            let folder_dir = event.window().app_handle().path_resolver().app_data_dir().unwrap().join("scripts");
            if !folder_dir.exists() {
                return;
            }

            Command::new("open")
                .args([&folder_dir.to_str().unwrap()])
                .spawn()
                .unwrap();
        }
        "run_iyfe" => {
            if let Some(state) = event.window().app_handle().try_state::<AppState>() {
                if let Some(ref mut api) = *state.api.lock().unwrap() {
                    api.send_script("loadstring(game:HttpGet('https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source'))()".to_string()).expect("Failed to execute");
                }
            }
        }
        "run_dex" => {
            if let Some(state) = event.window().app_handle().try_state::<AppState>() {
                if let Some(ref mut api) = *state.api.lock().unwrap() {
                    api.send_script("loadstring(game:HttpGet('https://raw.githubusercontent.com/infyiff/backup/main/dex.lua'))()".to_string()).expect("Failed to execute");
                }
            }
        }
        _ => {}
    }
}

fn main() {
    let menu = Menu::new()
        .add_submenu(
            Submenu::new(
            "Synapse X",
            Menu::new()
                .add_native_item(
                    MenuItem::About(
                        "Synapse X".to_string(),
                        AboutMetadata::new()
                    )
                )
                .add_native_item(
                    MenuItem::Separator
                )
                .add_item(
                    CustomMenuItem::new("settings", "Settings...")
                        .accelerator("CMD+,")
                )
                .add_native_item(
                    MenuItem::Separator
                )
                .add_native_item(
                    MenuItem::Hide
                )
                .add_native_item(
                    MenuItem::HideOthers
                )
                .add_native_item(
                    MenuItem::ShowAll
                )
                .add_native_item(
                    MenuItem::Separator
                )
                .add_native_item(
                    MenuItem::Quit
                )
            )
        )
        .add_submenu(
            Submenu::new(
                "File",
                Menu::new()
                    .add_item(
                        CustomMenuItem::new("file_new", "New")
                            .accelerator("CMD+N")
                    )
                    .add_item(
                        CustomMenuItem::new("file_open", "Open...")
                            .accelerator("CMD+O")
                    )
                    .add_native_item(
                        MenuItem::Separator
                    )
                    .add_item(
                        CustomMenuItem::new("open_autoexecute", "Open Auto Execute Folder")
                    )
                    .add_item(
                        CustomMenuItem::new("open_workspace", "Open Workspace Folder")
                    )
                    .add_item(
                        CustomMenuItem::new("open_scripts", "Open Scripts Folder")
                    )
                    .add_native_item(
                        MenuItem::Separator
                    )
                    .add_item(
                        CustomMenuItem::new("file_close", "Close")
                            .accelerator("CMD+W")
                    )
                    .add_item(
                        CustomMenuItem::new("file_save", "Save")
                            .accelerator("CMD+S")
                    )
                    .add_item(
                        CustomMenuItem::new("file_saveas", "Save As")
                            .accelerator("SHIFT+CMD+S")
                    )
                    .add_item(
                        CustomMenuItem::new("file_rename", "Rename...")
                    )
            )
        )
        .add_submenu(
            Submenu::new(
                "Edit",
                Menu::new()
                    .add_native_item(
                        MenuItem::Undo
                    )
                    .add_native_item(
                        MenuItem::Redo
                    )
                    .add_native_item(
                        MenuItem::Separator
                    )
                    .add_native_item(
                        MenuItem::Cut
                    )
                    .add_native_item(
                        MenuItem::Copy
                    )
                    .add_native_item(
                        MenuItem::Paste
                    )
                    .add_native_item(
                        MenuItem::SelectAll
                    )
            )
        )
        .add_submenu(
            Submenu::new(
                "Run",
                Menu::new()
                    .add_item(
                        CustomMenuItem::new("run_iyfe", "Infinite Yield FE")
                    )
                    .add_item(
                        CustomMenuItem::new("run_dex", "Dex Explorer")
                    )
            )
        )
        .add_submenu(
            Submenu::new(
                "Window",
                Menu::new()
                    .add_native_item(
                        MenuItem::Minimize
                    )
                    .add_native_item(
                        MenuItem::Zoom
                    )
                    .add_item(
                        CustomMenuItem::new("window_center", "Center")
                            .accelerator("SUPER+CTRL+C")
                    )
                    .add_native_item(
                        MenuItem::EnterFullScreen
                    )
            )
        );

    tauri::Builder::default()
        .plugin(tauri_plugin_context_menu::init())
        .menu(menu)
        .on_menu_event(on_menu_event)
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