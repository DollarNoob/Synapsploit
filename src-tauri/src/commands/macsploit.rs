use std::fs;
use tauri::{State, AppHandle};
use crate::{msapi, AppState};

#[tauri::command]
pub fn attach(state: State<crate::AppState>, handle: AppHandle, port: u16) -> Result<(), String> {
    let mut api_lock = state.api.lock().unwrap();
    if api_lock.is_none() {
        match connect(handle, port) {
            Ok(api) => {
                *api_lock = Some(api);
                Ok(())
            }
            Err(e) => Err(e)
        }
    } else {
        let alive = api_lock.as_mut().unwrap().is_alive();
        match alive {
            Ok(true) => Err("AlreadyInjected".into()),
            Ok(false) => {
                match connect(handle, port) {
                    Ok(api) => {
                        *api_lock = Some(api);
                        Ok(())
                    }
                    Err(e) => Err(e)
                }
            },
            Err(e) => Err(e)
        }
    }
}

fn connect(handle: AppHandle, port: u16) -> Result<msapi::MsApi, String> {
    match msapi::MsApi::connect(port) {
        Ok(mut api) => {
            let alive = api.is_alive();
            match alive {
                Ok(true) => {
                    auto_execute(&mut api, handle).expect("Failed to auto execute");
                    Ok(api)
                }
                Ok(false) => Err("SocketNotAlive".into()),
                Err(e) => Err(e)
            }
        }
        Err(e) => Err(e)
    }
}

#[tauri::command]
pub fn execute(state: State<AppState>, script: String) -> Result<(), String> {
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

fn auto_execute(api: &mut msapi::MsApi, handle: AppHandle) -> Result<(), String> {
    let cfg = super::config::read_config(handle.clone()).ok().unwrap();
    if cfg.auto_execute == true {
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