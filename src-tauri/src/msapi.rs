use std::io::{Read, Write};
use std::net::TcpStream;

const IPC_EXECUTE: u8 = 0;
const IPC_SETTING: u8 = 1;
const IPC_PING: u8 = 2;

pub struct MsApi {
    stream: TcpStream
}

impl MsApi {
    pub fn connect(port: u16) -> Result<MsApi, String> {
        match TcpStream::connect(("127.0.0.1", port)) {
            Ok(stream) => Ok(MsApi { stream }),
            Err(e) => Err(e.to_string())
        }
    }

    fn build_header(&self, msg_type: u8, payload_len: usize) -> Vec<u8> {
        let mut data = vec![0u8; 16 + payload_len];
        data[0] = msg_type;
        data[8..12].copy_from_slice(&(payload_len as u32).to_le_bytes());
        data
    }

    pub fn send_script(&mut self, script: String) -> Result<(), String> {
        let mut data = self.build_header(IPC_EXECUTE, script.len() + 1);
        data[16..16 + script.len()].copy_from_slice(script.as_bytes());

        match self.stream.write_all(&data) {
            Ok(_) => Ok(()),
            Err(_) => Err("NotInjected".into())
        }
    }

    pub fn send_setting(&mut self, key: String, value: String) -> Result<(), String> {
        let payload = format!("{} {}", key, value);
        let mut data = self.build_header(IPC_SETTING, payload.len() + 1);
        data[16..16 + payload.len()].copy_from_slice(payload.as_bytes());

        match self.stream.write_all(&data) {
            Ok(_) => Ok(()),
            Err(_) => Err("NotInjected".into())
        }
    }

    pub fn is_alive(&mut self) -> Result<bool, String> {
        let data = self.build_header(IPC_PING, 0);

        match self.stream.write_all(&data) {
            Ok(()) => {
                let mut buffer = [0; 1024];
                match self.stream.read(&mut buffer) {
                    Ok(_) => {
                        if buffer[0] == 0x10 {
                            Ok(true)
                        } else {
                            Ok(false)
                        }
                    },
                    Err(_) => Ok(false)
                }
            }
            Err(_) => Ok(false)
        }
    }
}