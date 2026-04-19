#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod storage;
mod decks;
mod review;
mod quiz;

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
