#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent, Emitter, command
};
use std::{thread, time::Duration, mem};
use serde::Serialize;
use base64::{Engine as _, engine::general_purpose};

// Windows API Imports
use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
use windows::Win32::UI::WindowsAndMessaging::{GetIconInfo, DestroyIcon, ICONINFO, GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
use windows::Win32::Graphics::Gdi::{GetDIBits, DeleteObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, CreateCompatibleDC, SelectObject, DeleteDC};
use windows::core::PCWSTR;
use windows::Win32::Foundation::{HWND, MAX_PATH};
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
use windows::Win32::System::ProcessStatus::GetModuleFileNameExW;
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;

#[derive(Clone, Serialize)]
struct WindowInfo {
    title: String,
    path: String,
}

// --- HELPER: Fenstertitel ---
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

// --- HELPER: EXE Pfad ---
fn get_process_path(hwnd: HWND) -> String {
    unsafe {
        let mut process_id = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        if process_id == 0 { return "".to_string(); }

        let process_handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, process_id);

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

// --- CORE: Icon Extraktion (Native Windows API) ---
#[command]
fn get_exe_icon(path: String) -> Result<String, String> {
    if path.is_empty() { return Err("Pfad leer".into()); }

    unsafe {
        let wide_path: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
        
        let mut shfi: SHFILEINFOW = mem::zeroed();
        
        let result = SHGetFileInfoW(
            PCWSTR(wide_path.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        );

        if result == 0 || shfi.hIcon.is_invalid() {
            return Err("Kein Icon gefunden".into());
        }

        let mut icon_info: ICONINFO = mem::zeroed();
        if GetIconInfo(shfi.hIcon, &mut icon_info).is_err() {
            let _ = DestroyIcon(shfi.hIcon);
            return Err("GetIconInfo fehlgeschlagen".into());
        }

        let hdc = CreateCompatibleDC(None);
        let old_bmp = SelectObject(hdc, icon_info.hbmColor);
        let mut bmi: BITMAPINFO = mem::zeroed();
        bmi.bmiHeader.biSize = mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = 32;
        bmi.bmiHeader.biHeight = -32; 
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB.0; 

        let mut buffer = vec![0u8; 32 * 32 * 4];
        GetDIBits(hdc, icon_info.hbmColor, 0, 32, Some(buffer.as_mut_ptr() as *mut _), &mut bmi, DIB_RGB_COLORS);

        SelectObject(hdc, old_bmp);
        
        // FIX: Resultate ignorieren um Warnungen zu vermeiden
        let _ = DeleteDC(hdc);
        let _ = DeleteObject(icon_info.hbmColor);
        let _ = DeleteObject(icon_info.hbmMask);
        let _ = DestroyIcon(shfi.hIcon);

        // BGRA zu RGBA swappen
        for chunk in buffer.chunks_exact_mut(4) {
            let b = chunk[0];
            let r = chunk[2];
            chunk[0] = r;
            chunk[2] = b;
        }

        let img = image::ImageBuffer::<image::Rgba<u8>, _>::from_raw(32, 32, buffer)
            .ok_or("Bildfehler")?;
        
        let mut png_buffer = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_buffer);
        img.write_to(&mut cursor, image::ImageOutputFormat::Png).map_err(|e| e.to_string())?;

        let b64 = general_purpose::STANDARD.encode(&png_buffer);
        Ok(format!("data:image/png;base64,{}", b64))
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
        .invoke_handler(tauri::generate_handler![get_exe_icon])
        .setup(|app| {
            let handle = app.handle();
            let main_window = app.get_webview_window("main").unwrap();

            // Falls mit --minimized gestartet (Standard bei Autostart), Fenster verstecken
            let args: Vec<String> = std::env::args().collect();
            if args.contains(&"--minimized".to_string()) {
                let _ = main_window.hide();
            } else {
                let _ = main_window.maximize();
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }

            // --- SYSTEM TRAY SETUP (Tauri v2) ---
            let show_i = MenuItem::with_id(handle, "show", "Öffnen", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(handle, "quit", "Beenden", true, None::<&str>)?;
            let menu = Menu::with_items(handle, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // --- TRACKING THREAD ---
            let window_clone = main_window.clone();
            thread::spawn(move || {
                let mut last_title = String::new();
                loop {
                    unsafe {
                        let hwnd = GetForegroundWindow();
                        if hwnd.0 != 0 {
                            let title = get_window_title(hwnd);
                            if title != last_title {
                                let path = get_process_path(hwnd);
                                let info = WindowInfo { title: title.clone(), path: path };
                                window_clone.emit("active-window-change", info).ok();
                                last_title = title;
                            }
                        }
                    }
                    thread::sleep(Duration::from_secs(1));
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
