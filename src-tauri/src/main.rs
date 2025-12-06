#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter, command};
use std::{thread, time::Duration};
use serde::Serialize;
// use base64::{Engine as _, engine::general_purpose}; // Vorerst auskommentiert
// use system_icons::get_icon; // ENTFERNT

// Windows API Imports
use windows::Win32::Foundation::{HWND, MAX_PATH};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
use windows::Win32::System::ProcessStatus::GetModuleFileNameExW;

// Datenstruktur für das Event
#[derive(Clone, Serialize)]
struct WindowInfo {
    title: String,
    path: String,
}

// --- HELPER: Fenstertitel holen ---
fn get_window_title(hwnd: HWND) -> String {
    unsafe {
        let mut buffer = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buffer);
        if len > 0 {
            String::from_utf16_lossy(&buffer[..len as usize])
        } else {
            "Unbekannt".to_string()
        }
    }
}

// --- HELPER: EXE Pfad holen ---
fn get_process_path(hwnd: HWND) -> String {
    unsafe {
        let mut process_id = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        
        if process_id == 0 { return "".to_string(); }

        // Prozess öffnen mit Leserechten
        let process_handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            process_id
        );

        if let Ok(handle) = process_handle {
            let mut buffer = [0u16; MAX_PATH as usize];
            let len = GetModuleFileNameExW(handle, None, &mut buffer);
            
            let _ = windows::Win32::Foundation::CloseHandle(handle);

            if len > 0 {
                return String::from_utf16_lossy(&buffer[..len as usize]);
            }
        }
        "".to_string()
    }
}

// --- COMMAND: Icon laden (Platzhalter) ---
#[command]
fn get_app_icon(_path: String) -> Result<String, String> {
    // Aktuell deaktiviert, da wir erst eine stabile Windows-Implementierung brauchen.
    // Das Frontend nutzt automatisch Fallback-Icons (FontAwesome), das sieht auch super aus!
    Err("Native Icons temporarily disabled".into())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        // Command registrieren
        .invoke_handler(tauri::generate_handler![get_app_icon])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();

            thread::spawn(move || {
                let mut last_title = String::new();

                loop {
                    unsafe {
                        let hwnd = GetForegroundWindow();
                        if hwnd.0 != 0 {
                            let title = get_window_title(hwnd);
                            
                            // Nur senden, wenn sich Titel ändert
                            if title != last_title {
                                let path = get_process_path(hwnd);
                                
                                let info = WindowInfo {
                                    title: title.clone(),
                                    path: path,
                                };

                                main_window.emit("active-window-change", info).ok();
                                last_title = title;
                            }
                        }
                    }
                    thread::sleep(Duration::from_secs(1));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
