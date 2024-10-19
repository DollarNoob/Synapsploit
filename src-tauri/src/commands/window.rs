use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl, Size, LogicalSize};

#[tauri::command]
pub fn open_options(handle: AppHandle) -> Result<(), String> {
    if let Some(window) = handle.get_window("options") {
        window.center().expect("Failed to center window");
        window.set_focus().expect("Failed to set focus");
        return Ok(())
    }

    WindowBuilder::new(
        &handle,
        "options",
        WindowUrl::App("options".into())
    )
        .visible(false)
        .decorations(false)
        .resizable(false)
        .title("Synapse X - Options")
        .inner_size(271.0, 230.0)
        .center()
        .accept_first_mouse(true)
        .build()
        .unwrap();

    Ok(())
}

#[tauri::command]
pub fn open_popup(handle: AppHandle, title: String, text: String) {
    let popup_width = 271.0;
    let popup_height = 97.0 + (12.0 * text.matches("<br/>").count() as f64);

    if let Some(window) = handle.get_window("popup") {
        let size = Size::Logical(LogicalSize::new(popup_width, popup_height));
        window.set_size(size).expect("Failed to set window size");
        window.emit("update-title", title).expect("Failed to emit update-title");
        window.emit("update-text", text).expect("Failed to emit update-text");
        window.set_focus().expect("Failed to set focus");
        return;
    }

    WindowBuilder::new(
        &handle,
        "popup",
        WindowUrl::App(format!("popup?title={}#{}", title, text).into())
    )
        .visible(false)
        .decorations(false)
        .resizable(false)
        .title(title)
        .inner_size(popup_width, popup_height)
        .center()
        .accept_first_mouse(true)
        .build()
        .expect("Failed to create popup window");
}

#[tauri::command]
pub fn open_folder(handle: AppHandle, directory: Option<String>, folder_name: String) -> Result<(), String> {
    let folder_dir;
    if let Some(directory) = directory {
        folder_dir = std::path::Path::new(&directory).join(folder_name);
        if !folder_dir.exists() {
            return Err("Directory does not exist".into());
        }
    } else {
        folder_dir = handle.path_resolver().app_data_dir().unwrap().join(folder_name);
        if !folder_dir.exists() {
            return Err("Directory does not exist".into());
        }
    }

    // MacOS only
    std::process::Command::new("open")
        .args([&folder_dir.to_str().unwrap()])
        .spawn()
        .unwrap();

    Ok(())
}

#[tauri::command]
pub fn close_window(handle: AppHandle) {
    handle.exit(0);
}