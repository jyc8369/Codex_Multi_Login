# ~/.codex/auth.json Example

```json
{
  "auth_mode": "chatgpt",
  "OPENAI_API_KEY": null,
  "tokens": {
    "id_token": "<2000_character_string>",
    "access_token": "<2000_character_string>",
    "refresh_token": "<300_character_string>",
    "account_id": "<random_string>"
  },
  "last_refresh": "2026-06-14T23:11:35.278694478Z"
}
```


# rate_limits example
```bush
ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$HOME/.codex/auth.json'))['tokens']['access_token'])")
ACCOUNT_ID=$(python3 -c "import json; print(json.load(open('$HOME/.codex/auth.json'))['tokens'].get('account_id',''))")
```

```bush
curl -s "https://chatgpt.com/backend-api/wham/usage" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -H "ChatGPT-Account-Id: $ACCOUNT_ID" | python3 -m json.tool
```

```json
{
    "user_id": "user-<random_string>",
    "account_id": "user-<random_string>",
    "email": "example_email@example.com",
    "plan_type": "plus",
    "rate_limit": {
        "allowed": true,
        "limit_reached": false,
        "primary_window": {
            "used_percent": 6,
            "limit_window_seconds": 18000,
            "reset_after_seconds": 16977,
            "reset_at": 1781495484
        },
        "secondary_window": {
            "used_percent": 1,
            "limit_window_seconds": 604800,
            "reset_after_seconds": 603777,
            "reset_at": 1782082284
        }
    },
    "code_review_rate_limit": null,
    "additional_rate_limits": null,
    "credits": {
        "has_credits": false,
        "unlimited": false,
        "overage_limit_reached": false,
        "balance": "0",
        "approx_local_messages": [
            0,
            0
        ],
        "approx_cloud_messages": [
            0,
            0
        ]
    },
    "spend_control": {
        "reached": false,
        "individual_limit": null
    },
    "rate_limit_reached_type": null,
    "promo": null,
    "referral_beacon": null,
    "rate_limit_reset_credits": {
        "available_count": 0
    }
}
```

```json
{
    "user_id": "user-<random_string>",
    "account_id": "user-<random_string>",
    "email": "example_email@example.com",
    "plan_type": "free",
    "rate_limit": {
        "allowed": true,
        "limit_reached": false,
        "primary_window": {
            "used_percent": 76,
            "limit_window_seconds": 2592000,
            "reset_after_seconds": 2516891,
            "reset_at": 1783995655
        },
        "secondary_window": null
    },
    "code_review_rate_limit": null,
    "additional_rate_limits": null,
    "credits": {
        "has_credits": false,
        "unlimited": false,
        "overage_limit_reached": false,
        "balance": null,
        "approx_local_messages": null,
        "approx_cloud_messages": null
    },
    "spend_control": {
        "reached": false,
        "individual_limit": null
    },
    "rate_limit_reached_type": null,
    "promo": null,
    "referral_beacon": null,
    "rate_limit_reset_credits": {
        "available_count": 0
    }
}

```