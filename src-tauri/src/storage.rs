use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub fn validate_id(id: &str) -> Result<(), String> {
    Uuid::parse_str(id).map_err(|_| format!("invalid id: {}", id))?;
    Ok(())
}

pub fn data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("failed to get app data dir: {}", e))?
        .join("data");
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create data dir: {}", e))?;
    Ok(dir)
}

pub fn ensure_subdir(base: &Path, name: &str) -> Result<PathBuf, String> {
    let dir = base.join(name);
    fs::create_dir_all(&dir).map_err(|e| format!("failed to create subdir: {}", e))?;
    Ok(dir)
}

pub fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn write_json<T: serde::Serialize>(path: &Path, data: &T) -> Result<(), String> {
    let content = serde_json::to_string_pretty(data).map_err(|e| format!("failed to serialize: {}", e))?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, &content).map_err(|e| format!("failed to write temp file: {}", e))?;
    fs::rename(&tmp, path).map_err(|e| format!("failed to rename temp file: {}", e))
}

pub fn list_json_files(dir: &Path) -> Vec<PathBuf> {
    let entries = fs::read_dir(dir);
    match entries {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().is_some_and(|ext| ext == "json"))
            .collect(),
        Err(_) => vec![],
    }
}

pub fn delete_json(path: &Path) -> bool {
    fs::remove_file(path).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_write_and_read_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.json");

        let mut data: HashMap<String, String> = HashMap::new();
        data.insert("key".to_string(), "value".to_string());

        write_json(&path, &data).unwrap();
        let result: Option<HashMap<String, String>> = read_json(&path);

        assert!(result.is_some());
        assert_eq!(result.unwrap().get("key").unwrap(), "value");
    }

    #[test]
    fn test_read_json_missing_file() {
        let path = PathBuf::from("/nonexistent/file.json");
        let result: Option<HashMap<String, String>> = read_json(&path);
        assert!(result.is_none());
    }

    #[test]
    fn test_list_json_files() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.json"), "{}").unwrap();
        fs::write(dir.path().join("b.json"), "{}").unwrap();
        fs::write(dir.path().join("c.txt"), "").unwrap();

        let files = list_json_files(dir.path());
        assert_eq!(files.len(), 2);
    }

    #[test]
    fn test_delete_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("delete_me.json");
        fs::write(&path, "{}").unwrap();

        assert!(delete_json(&path));
        assert!(!path.exists());
    }

    #[test]
    fn test_validate_id_accepts_uuid() {
        assert!(validate_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
    }

    #[test]
    fn test_validate_id_rejects_path_traversal() {
        assert!(validate_id("../../../etc/passwd").is_err());
        assert!(validate_id("not-a-uuid").is_err());
    }
}
