# Codex Multi Login

Lightweight VS Code extension for managing multiple Codex accounts, switching the active `auth.json`, and refreshing quota.

## What it does

- Add an account through OAuth
- Import or export the extension's JSON account bundle
- Switch the active account
- Refresh quota for one account or all accounts
- Show a simple dashboard for the saved accounts

## Storage Paths

- `~/.codex/auth.json`
  - Active Codex CLI auth file that gets overwritten when you switch accounts.
  - `CODEX_HOME` is supported. If set, the file becomes `${CODEX_HOME}/auth.json`.
- VS Code global storage
  - Windows: `%APPDATA%\\Code\\User\\globalStorage\\local-personal-use.codex-multi-login\\`
  - macOS: `~/Library/Application Support/Code/User/globalStorage/local-personal-use.codex-multi-login/`
  - Linux: `~/.config/Code/User/globalStorage/local-personal-use.codex-multi-login/`
  - `accounts.json`: account index and active account state
  - `tokens.json`: saved account tokens

See [`STORAGE.md`](./STORAGE.md) and [`JSON_FORMAT.md`](./JSON_FORMAT.md) for details.

## Build

```bash
npm install
npm run compile
```

## Package

```bash
npm run package
```

The output will be a `.vsix` file in the workspace root.

## Notes

- This project is intentionally lightweight.
- The reference implementation lives in `codex-accounts-manager-master/` and is kept as a reference only.
- Tokens are stored in the extension global storage directory for this local/personal build.
