# Storage

This extension uses two storage locations.

## 1. Codex auth file

The active account is written to:

```text
~/.codex/auth.json
```

If `CODEX_HOME` is set, the file becomes:

```text
${CODEX_HOME}/auth.json
```

The file is rewritten when you switch accounts.

## 2. VS Code global storage

The extension stores account metadata and saved tokens in the VS Code global storage directory.

Platform paths:

- Windows: `%APPDATA%\\Code\\User\\globalStorage\\local-personal-use.codex-multi-login\\`
- macOS: `~/Library/Application Support/Code/User/globalStorage/local-personal-use.codex-multi-login/`
- Linux: `~/.config/Code/User/globalStorage/local-personal-use.codex-multi-login/`

Files:

- `accounts.json`
  - Account index
  - Active account ID
  - Account list
- `tokens.json`
  - Saved tokens keyed by account ID

## Notes

- `Switch Account` overwrites `auth.json` with the selected account tokens.
- `Delete` removes the selected account from both `accounts.json` and `tokens.json`.
