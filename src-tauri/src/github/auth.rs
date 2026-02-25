use crate::error::{AppError, AppResult};

/// 检测本地 gh CLI 是否可用，并获取其 token
pub fn detect_gh_token() -> AppResult<Option<String>> {
    let output = std::process::Command::new("gh")
        .args(["auth", "token"])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let token = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if token.is_empty() {
                Ok(None)
            } else {
                Ok(Some(token))
            }
        }
        _ => Ok(None),
    }
}

/// 检测 gh CLI 是否已安装
pub fn is_gh_cli_available() -> bool {
    std::process::Command::new("gh")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn store_token(token: &str) -> AppResult<()> {
    let entry = keyring::Entry::new("gitsage", "github-token")
        .map_err(|e| AppError::General(format!("Keyring error: {}", e)))?;
    entry
        .set_password(token)
        .map_err(|e| AppError::General(format!("Failed to store token: {}", e)))?;
    Ok(())
}

pub fn load_token() -> AppResult<Option<String>> {
    let entry = keyring::Entry::new("gitsage", "github-token")
        .map_err(|e| AppError::General(format!("Keyring error: {}", e)))?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::General(format!("Failed to load token: {}", e))),
    }
}

pub fn delete_token() -> AppResult<()> {
    let entry = keyring::Entry::new("gitsage", "github-token")
        .map_err(|e| AppError::General(format!("Keyring error: {}", e)))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::General(format!("Failed to delete token: {}", e))),
    }
}
