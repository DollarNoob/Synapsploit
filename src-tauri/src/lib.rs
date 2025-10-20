mod macsploit;

use macsploit::TcpState;
use std::process::Command;
use std::sync::{Arc, Mutex};

#[tauri::command]
async fn prompt(title: String, message: String, default: String) -> Option<String> {
    let script = format!(
        "display dialog \"{}\" default answer \"{}\" with title \"{}\"",
        message, default, title
    );
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.split(":").collect();
    parts.last().map(|s| s.trim().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(Mutex::new(TcpState { stream: None })))
        .invoke_handler(tauri::generate_handler![
            prompt,
            macsploit::attach,
            macsploit::detach,
            macsploit::execute,
            macsploit::settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
