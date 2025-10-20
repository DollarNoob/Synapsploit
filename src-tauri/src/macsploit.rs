use std::{
    io::{ErrorKind, Read, Write},
    net::{IpAddr, Ipv4Addr, Shutdown, SocketAddr, TcpStream},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

const IPC_EXECUTE: u8 = 0;
const IPC_SETTING: u8 = 1;

pub struct TcpState {
    pub stream: Option<TcpStream>,
}

#[tauri::command]
pub fn attach(
    state: tauri::State<Arc<Mutex<TcpState>>>,
    app: AppHandle,
    port: u16,
) -> Result<bool, String> {
    let mut tcp_state = state.lock().unwrap();

    if tcp_state.stream.is_some() {
        return Err("AlreadyInjected".into());
    }

    let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
    let stream = match TcpStream::connect(&address) {
        Ok(s) => s,
        Err(e) => match e.kind() {
            ErrorKind::ConnectionRefused => {
                return Err("ConnectionRefused".into());
            }
            _ => {
                return Err(e.to_string());
            }
        },
    };

    stream.set_nonblocking(true).map_err(|e| e.to_string())?;
    let mut stream_clone = stream.try_clone().map_err(|e| e.to_string())?;

    let state_clone = state.inner().clone();
    let app_clone = app.clone();

    thread::spawn({
        move || {
            let mut buffer = [0u8; 1024];
            let mut receiving = false;
            loop {
                match stream_clone.peek(&mut buffer) {
                    Ok(0) => {
                        if let Ok(mut s) = state_clone.lock() {
                            s.stream = None;
                        }
                        println!("TCP stream disconnected on peek");
                        let _ = app.emit("disconnect", ());
                        break;
                    }
                    Ok(_) => match stream_clone.read(&mut buffer) {
                        Ok(0) => {
                            println!("TCP stream disconnected on read");
                            let _ = app.emit("disconnect", ());
                            break;
                        }
                        Ok(size) => {
                            receiving = true;
                            let data = buffer[..size].to_vec();
                            let _ = app_clone.emit("data", data);
                        }
                        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                            thread::sleep(Duration::from_millis(100));
                        }
                        Err(_) => {
                            println!("TCP stream disconnected");
                            let _ = app.emit("disconnect", ());
                            break;
                        }
                    },
                    Err(_) => {
                        if receiving {
                            receiving = false;
                            let _ = app_clone.emit("finish", ());
                        }
                        thread::sleep(Duration::from_millis(100));
                    }
                }
            }
        }
    });

    tcp_state.stream = Some(stream);
    Ok(true)
}

#[tauri::command]
pub fn detach(state: tauri::State<Arc<Mutex<TcpState>>>) -> Result<bool, String> {
    let mut tcp_state = state.lock().unwrap();

    if let Some(stream) = tcp_state.stream.take() {
        if let Err(e) = stream.shutdown(Shutdown::Both) {
            if e.kind() == ErrorKind::NotConnected {
                return Err("NotInjected".into());
            } else {
                println!("Failed to close stream: {}", e);
                return Err(e.to_string());
            }
        }
        Ok(true)
    } else {
        Err("NotInjected".into())
    }
}

fn build_header(msg_type: u8, payload_len: usize) -> Vec<u8> {
    let mut data = vec![0u8; 16 + payload_len];
    data[0] = msg_type;
    data[8..12].copy_from_slice(&(payload_len as u32).to_le_bytes());
    data
}

#[tauri::command]
pub fn execute(state: tauri::State<Arc<Mutex<TcpState>>>, script: String) -> Result<bool, String> {
    let mut tcp_state = state.lock().unwrap();

    if let Some(stream) = tcp_state.stream.as_mut() {
        let mut data = build_header(IPC_EXECUTE, script.len() + 1);
        data[16..16 + script.len()].copy_from_slice(script.as_bytes());

        match stream.write_all(&data) {
            Ok(_) => Ok(true),
            Err(_) => Err("NotInjected".into()),
        }
    } else {
        Err("NotInjected".into())
    }
}

#[tauri::command]
pub fn settings(
    state: tauri::State<Arc<Mutex<TcpState>>>,
    key: String,
    value: bool,
) -> Result<bool, String> {
    let mut tcp_state = state.lock().unwrap();

    if let Some(stream) = tcp_state.stream.as_mut() {
        let payload = format!("{} {}", key, value);
        let mut data = build_header(IPC_SETTING, payload.len() + 1);
        data[16..16 + payload.len()].copy_from_slice(payload.as_bytes());

        match stream.write_all(&data) {
            Ok(_) => Ok(true),
            Err(_) => Err("NotInjected".into()),
        }
    } else {
        Err("NotInjected".into())
    }
}
