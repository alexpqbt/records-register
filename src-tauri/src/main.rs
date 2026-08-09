// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {
    baptismal_records_lib::run();

    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lastname TEXT NOT NULL,
            firstname TEXT NOT NULL,
            middle TEXT,
            dofc TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')) 
            );",
            kind: MigrationKind::Up,
        }
    ];

    let _ = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:baptismal_records.db", migrations)
                .build(),
        );
}
