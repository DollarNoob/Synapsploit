#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod msapi;

use serde::Serialize;
use serde::Deserialize;
use std::{env, path};
use std::cmp::{min, max};
use std::sync::Mutex;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::process::Command;
use rfd::FileDialog;
use tauri::{AppHandle, CustomMenuItem, Manager, PhysicalPosition, Position, LogicalSize, Size, State, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

struct AppState {
    api: Mutex<Option<msapi::MsApi>>
}

#[derive(Serialize)]
struct ConfigSerialize {
    always_on_top: bool,
    auto_attach: bool,
    auto_execute: bool,
    scan_port: bool
}

#[derive(Deserialize)]
struct ConfigDeserialize {
    always_on_top: bool,
    auto_attach: bool,
    auto_execute: bool,
    scan_port: bool
}

fn auto_execute(api: &mut msapi::MsApi, handle: AppHandle) -> Result<(), String> {
    let cfg = read_config(handle.clone()).expect("Failed to read config");
    if cfg[2] == true {
        let autoexec_dir = handle.path_resolver().app_data_dir().unwrap().join("autoexec");
        if !autoexec_dir.exists() {
            return Err("Auto execute directory does not exist".into())
        }

        for script in autoexec_dir.read_dir().expect("Failed to read auto execute directory") {
            if let Ok(script) = script {
                if let Some(path_str) = script.path().to_str() {
                    if path_str.ends_with(".lua") || path_str.ends_with(".txt") {
                        println!("Auto-executing file {}", path_str);
                        let scr = fs::read_to_string(path_str).expect("Failed to read auto execute file");
                        api.send_script(scr).expect("Failed to auto execute script");
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn read_config(handle: AppHandle) -> Result<Vec<bool>, String> {
    let cfg_path = handle.path_resolver().app_data_dir().unwrap().join("config.toml");
    if !cfg_path.exists() {
        return Err("Config file does not exist".into())
    }

    let cfg_str = fs::read_to_string(cfg_path).expect("Failed to read config");
    let cfg: ConfigDeserialize = toml::from_str(&cfg_str).unwrap();

    Ok(vec![ cfg.always_on_top, cfg.auto_attach, cfg.auto_execute, cfg.scan_port ])
}

#[tauri::command]
fn write_config(handle: AppHandle, always_on_top: bool, auto_attach: bool, auto_execute: bool, scan_port: bool) -> Result<(), String> {
    if let Some(main) = handle.get_window("main") {
        main.set_always_on_top(always_on_top).expect("Failed to set always on top");
    }

    let cfg_path = handle.path_resolver().app_data_dir().unwrap().join("config.toml");

    let cfg = ConfigSerialize {
        always_on_top,
        auto_attach,
        auto_execute,
        scan_port
    };

    let mut file = File::create(&cfg_path).expect("Failed to create config");
    file.write_all(toml::to_string(&cfg).unwrap().as_bytes()).expect("Failed to write config");

    Ok(())
}

#[tauri::command]
fn attach(state: State<AppState>, handle: AppHandle, port: u16) -> Result<(), String> {
    let mut api_lock = state.api.lock().unwrap();
    if api_lock.is_none() {
        let mut api = msapi::MsApi::connect(port)?;
        let alive = api.is_alive();
        match alive {
            Ok(true) => {
                auto_execute(&mut api, handle).expect("Failed to auto execute");
                *api_lock = Some(api);
                Ok(())
            }
            Ok(false) => Err("SocketNotAlive".into()),
            Err(e) => Err(e)
        }
    } else {
        let alive = api_lock.as_mut().unwrap().is_alive();
        match alive {
            Ok(true) => Err("AlreadyInjected".into()),
            Ok(false) => {
                let mut api = msapi::MsApi::connect(port)?;
                let alive = api.is_alive();
                match alive {
                    Ok(true) => {
                        auto_execute(&mut api, handle).expect("Failed to auto execute");
                        *api_lock = Some(api);
                        Ok(())
                    }
                    Ok(false) => {
                        *api_lock = None;
                        Err("SocketNotAlive".into())
                    }
                    Err(e) => Err(e)
                }
            },
            Err(e) => Err(e)
        }
    }
}

#[tauri::command]
fn execute(state: State<AppState>, script: String) -> Result<(), String> {
    let mut api_lock = state.api.lock().unwrap();
    if let Some(api) = api_lock.as_mut() {
        match api.is_alive() {
            Ok(true) => {
                api.send_script(script)?;
                Ok(())
            }
            Ok(false) => Err("NotInjected".into()),
            Err(e) => Err(e)
        }
    } else {
        Err("NotInjected".into())
    }
}

#[tauri::command]
fn open_file() -> Result<Vec<String>, String> {
    if let Some(path) = FileDialog::new()
        .set_title("Synapse X - Open File")
        .add_filter("Script Files", &["lua", "txt"])
        .pick_file()
    {
        let mut vec: Vec<String> = Vec::new();
        let script = fs::read_to_string(path.clone()).expect("Failed to read file. Check if it is accessible.");

        let path_str = path::absolute(path).unwrap().display().to_string();
        vec.push(path_str);
        vec.push(script);
        Ok(vec.into())
    } else {
        Err("FileNotSelected".into())
    }
}

#[tauri::command]
fn execute_file(state: State<AppState>) -> Result<(), String> {
    if let Some(path) = FileDialog::new()
        .set_title("Synapse X - Execute File")
        .add_filter("Script Files", &["lua", "txt"])
        .pick_file()
    {
        let mut api_lock = state.api.lock().unwrap();
        if let Some(api) = api_lock.as_mut() {
            match api.is_alive() {
                Ok(true) => {
                    let script = fs::read_to_string(path).expect("Failed to read file. Check if it is accessible.");
                    api.send_script(script)?;
                    Ok(())
                }
                Ok(false) => Err("NotInjected".into()),
                Err(e) => Err(e)
            }
        } else {
            Err("NotInjected".into())
        }
    } else {
        Err("FileNotSelected".into())
    }
}

#[tauri::command]
fn save_file(handle: AppHandle, contents: String) -> Result<(), String> {
    let scripts_path = handle.path_resolver().app_local_data_dir().unwrap().join("scripts");

    if let Some(path) = FileDialog::new()
        .add_filter("Script Files", &["lua", "txt"])
        .set_directory(scripts_path)
        .save_file()
    {
        let mut file = File::create(&path).expect("Failed to create file. Check if it is accessible.");
        file.write_all(contents.as_bytes()).expect("Failed to write file. Check if it is accessible.");
        Ok(())
    } else {
        Err("FileNotSelected".into())
    }
}

#[tauri::command]
fn open_options(handle: AppHandle) -> Result<(), String> {
    if let Some(window) = handle.get_window("options") {
        window.center().expect("Failed to center window");
        window.set_focus().expect("Failed to set focus");
        return Ok(())
    }

    tauri::WindowBuilder::new(
        &handle,
        "options",
        tauri::WindowUrl::App("options".into())
    )
        .visible(false)
        .decorations(false)
        .resizable(false)
        .inner_size(271.0, 242.0)
        .center()
        .always_on_top(true)
        .build()
        .unwrap();

    Ok(())
}

#[tauri::command]
fn open_folder(handle: AppHandle, folder_name: String) -> Result<(), String> {
    let folder_dir = handle.path_resolver().app_data_dir().unwrap().join(folder_name);
    if !folder_dir.exists() {
        return Err("Directory does not exist".into());
    }

    // MacOS only
    Command::new("open")
        .args([&folder_dir.to_str().unwrap()])
        .spawn()
        .unwrap();

    Ok(())
}

#[tauri::command]
fn close_window(handle: AppHandle) {
    handle.exit(0);
}

#[tauri::command]
fn scriptbox_execute(state: State<AppState>, path: String) -> Result<(), String> {
    let script = fs::read_to_string(path).expect("Failed to read file. Check if it is accessible.");
    match execute(state, script) {
        Ok(()) => Ok(()),
        Err(e) => Err(e)
    }
}

#[tauri::command]
fn scriptbox_load(path: String) -> Result<String, String> {
    let script = fs::read_to_string(path).expect("Failed to read file. Check if it is accessible.");
    Ok(script)
}

#[tauri::command]
fn scriptbox_refresh(handle: AppHandle) -> Result<Vec<String>, String> {
    let scripts_dir = handle.path_resolver().app_data_dir().unwrap().join("scripts");
    if !scripts_dir.exists() {
        return Err("Scripts directory does not exist".into())
    }

    let mut scripts = Vec::new();
    for script in scripts_dir.read_dir().expect("Failed to read scripts directory") {
        if let Ok(script) = script {
            if let Some(path_str) = script.path().to_str() {
                scripts.push(path_str.to_string());
            }
        }
    }

    Ok(scripts)
}

#[tauri::command]
fn open_popup(handle: AppHandle, title: String, text: String) {
    if let Some(window) = handle.get_window("popup") {
        let size = Size::Logical(LogicalSize::new(271.0, 97.0 + (12.0 * text.matches("<br/>").count() as f64)));
        window.set_size(size).expect("Failed to set window size");
        window.emit("update-title", title).expect("Failed to emit update-title");
        window.emit("update-text", text).expect("Failed to emit update-text");
        window.set_focus().expect("Failed to set focus");
        return;
    }

    let window = tauri::WindowBuilder::new(
        &handle,
        "popup",
        tauri::WindowUrl::App(format!("popup?title={}#{}", title, text).into())
    )
        .visible(false)
        .decorations(false)
        .resizable(false)
        .inner_size(271.0, 97.0 + (12.0 * text.matches("<br/>").count() as f64))
        .center()
        .always_on_top(true)
        .build()
        .unwrap();

    window.once("request-data", move |_event| {
        if let Some(window) = handle.get_window("popup") {
            window.emit("update-title", title).expect("Failed to emit update-title");
            window.emit("update-text", text).expect("Failed to emit update-text");
        }
    });
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
                Err(_e) => {
                    eprintln!("How did you even return error");
                }
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
            let item_handle = handle.tray_handle().get_item(&id);
            match id.as_str() {
                "toggle-visibility" => {
                    let window = handle.get_window("main").unwrap();
                    match window.is_visible() {
                        Ok(true) => {
                            window.hide().expect("Failed to hide window");
                            item_handle.set_title("Show").expect("Failed to set title");
                        }
                        Ok(false) => {
                            window.show().expect("Failed to show window");
                            item_handle.set_title("Hide").expect("Failed to set title");
                        }
                        Err(_e) => {
                            eprintln!("Failed to get window visibility");
                        }
                    }
                }
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
            CustomMenuItem::new("title", "Synapse X - v1.2").disabled()
        )
        .add_item(
            CustomMenuItem::new("title", "MacSploit Edition").disabled()
        )
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(
            CustomMenuItem::new("toggle-visibility", "Hide")
        )
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
            read_config,
            write_config,
            execute,
            open_file,
            execute_file,
            save_file,
            open_options,
            open_folder,
            attach,
            close_window,
            scriptbox_execute,
            scriptbox_load,
            scriptbox_refresh,
            open_popup
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::Ready { } => {
                let app_data_dir = app_handle.path_resolver().app_data_dir().unwrap();

                let autoexec_dir = app_data_dir.join("autoexec");
                if !autoexec_dir.exists() {
                    fs::create_dir_all(autoexec_dir).expect("Failed to create auto execute directory");
                }

                let scripts_dir = app_data_dir.join("scripts");
                if !scripts_dir.exists() {
                    fs::create_dir_all(scripts_dir).expect("Failed to create scripts directory");
                }

                let config_dir = app_data_dir.join("config.toml");
                if !config_dir.exists() {
                    let config = ConfigSerialize {
                        always_on_top: true,
                        auto_attach: true,
                        auto_execute: true,
                        scan_port: true
                    };

                    let mut file = File::create(&config_dir).expect("Failed to create config");
                    file.write_all(toml::to_string(&config).unwrap().as_bytes()).expect("Failed to write config");
                }
            }
            tauri::RunEvent::ExitRequested {
                api, ..
            } => {
                api.prevent_exit();
            } _ => {}
        });
}
