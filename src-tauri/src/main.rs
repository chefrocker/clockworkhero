#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::Emitter;
use std::{thread, time::Duration};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};

// Hilfsfunktion: Holt den Titel des aktiven Fensters
fn get_active_window_title() -> String {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0 == 0 {
            return "Unbekannt".to_string();
        }

        let mut buffer = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buffer);

        if len > 0 {
            String::from_utf16_lossy(&buffer[..len as usize])
        } else {
            "Unbekannt".to_string()
        }
    }
}

fn main() {
    tauri::Builder::default()
        // WICHTIG: Hier wird das SQL Plugin geladen
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // Fenster holen (Tauri v2 Syntax)
            let main_window = app.get_webview_window("main").unwrap();

            // Watcher Thread starten
            thread::spawn(move || {
                loop {
                    let title = get_active_window_title();
                    
                    // Event senden (Fehler werden ignoriert mit .ok())
                    main_window.emit("active-window-change", title).ok();

                    thread::sleep(Duration::from_secs(1));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
