# JSON Format

`Import / Export JSON` works with the extension's saved account bundle.

## Export format

Export writes an array of records like this:

```json
[
  {
    "email": "user@example.com",
    "id": "user@example.com:account-id",
    "tokens": {
      "idToken": "...",
      "accessToken": "...",
      "refreshToken": "...",
      "accountId": "..."
    }
  }
]
```

## Import format

Import accepts either:

- the export format above
- a single object with `id_token`, `access_token`, `refresh_token`, `account_id`

## Notes

- Only entries with both `idToken` and `accessToken` are imported.
- Import does not overwrite `~/.codex/auth.json` unless you later switch that account.
