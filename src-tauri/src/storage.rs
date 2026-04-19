use std::fs;
use std::path::PathBuf;

pub fn data_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    let dir = app_handle.path().app_data_dir().expect("failed to get app data dir").join("data");
    fs::create_dir_all(&dir).expect("failed to create data dir");
    dir
}

pub fn ensure_subdir(base: &PathBuf, name: &str) -> PathBuf {
    let dir = base.join(name);
    fs::create_dir_all(&dir).expect("failed to create subdir");
    dir
}

pub fn read_json<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn write_json<T: serde::Serialize>(path: &PathBuf, data: &T) {
    let content = serde_json::to_string_pretty(data).expect("failed to serialize");
    fs::write(path, content).expect("failed to write file");
}

pub fn list_json_files(dir: &PathBuf) -> Vec<PathBuf> {
    let entries = fs::read_dir(dir);
    match entries {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |ext| ext == "json"))
            .collect(),
        Err(_) => vec![],
    }
}

pub fn delete_json(path: &PathBuf) -> bool {
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

        write_json(&path.to_path_buf(), &data);
        let result: Option<HashMap<String, String>> = read_json(&path.to_path_buf());

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

        let files = list_json_files(&dir.path().to_path_buf());
        assert_eq!(files.len(), 2);
    }

    #[test]
    fn test_delete_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("delete_me.json");
        fs::write(&path, "{}").unwrap();

        assert!(delete_json(&path.to_path_buf()));
        assert!(!path.exists());
    }
}
