# RUNBOOK — Personal Agent

## How to Get Slack User Tokens (xoxp-)

The agent posts as two real Slack user accounts — not as a bot.
Each account needs its own `xoxp-` user token.

### Step 1 — Create a Slack App (once)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it anything (e.g. "Personal Agent Token Generator") — the app is just used to generate tokens; it won't post anything itself
3. Select your workspace

### Step 2 — Add User Token Scopes

In the app settings → **OAuth & Permissions** → scroll to **User Token Scopes** → add:

| Scope | Why |
|-------|-----|
| `channels:history` | Read messages in public channels |
| `channels:read` | List channels to find the control channel |
| `groups:history` | Read messages in private channels |
| `groups:read` | List private channels |
| `im:history` | Read DMs |
| `im:read` | List DM conversations |
| `chat:write` | Post messages as the user |
| `users:read` | Look up user info |

**Do NOT add bot token scopes** — only user token scopes.

### Step 3 — Get Token for Account 1 (Haiku)

1. Make sure you are logged into Slack in your browser **as Account 1** (the Haiku account)
2. In the app → **OAuth & Permissions** → click **Install to Workspace**
3. Click **Allow** on the OAuth consent screen
4. Copy the **User OAuth Token** — it starts with `xoxp-`
5. Paste it as `SLACK_USER_TOKEN_HAIKU=xoxp-...` in your `.env`

### Step 4 — Get Token for Account 2 (Sonnet)

1. **Log out** of Slack in your browser and log in **as Account 2** (the Sonnet account)
2. Go back to [api.slack.com/apps](https://api.slack.com/apps) → find your app → **OAuth & Permissions**
3. Click **Install to Workspace** (or **Reinstall**)
4. Click **Allow**
5. Copy the new **User OAuth Token** — it starts with `xoxp-` (different from Account 1's)
6. Paste it as `SLACK_USER_TOKEN_SONNET=xoxp-...` in your `.env`

> **Note:** Each install/reinstall generates a token for the currently logged-in user. The app settings don't change — only the token owner changes.

### Step 5 — Find Your Owner User ID

1. In Slack, click your profile picture → **Profile**
2. Click the three-dot menu → **Copy member ID**
3. It looks like `U0XXXXXXXXX`
4. Paste as `SLACK_OWNER_USER_ID=U...` in `.env`

### Step 6 — Find Your Control Channel ID

1. Right-click the channel in Slack sidebar → **View channel details**
2. Scroll to the bottom — Channel ID starts with `C` (e.g. `C0XXXXXXXXX`)
3. Paste as `SLACK_CONTROL_CHANNEL_ID=C...` in `.env`

### Step 7 — Invite Both Accounts to the Channel

Both Haiku and Sonnet accounts must be members of the control channel so they can read and post:

```
/invite @haiku-account-name
/invite @sonnet-account-name
```

---

## First Run

```bash
# 1. Fill in your .env (all blank fields)
nano .env

# 2. Install Python packages
bash scripts/setup.sh

# 3. Test the agent runs (Ctrl+C to stop)
.venv/bin/python agent/main.py

# 4. Once verified, install as a background service
bash scripts/install_service.sh
```

**Signs it's working:**
- Both tokens pass `auth.test` (you'll see log lines: `Token verified | account=Haiku | user=...`)
- Polling starts: `Poller started | channel=C... | interval=5s`
- Send a message in your control channel → Haiku account replies
- Send `!sonnet what is the architecture of this project` → Sonnet account replies

---

## Admin Commands

| Command | What it does | Posted by |
|---------|-------------|-----------|
| `!status` | Agent status, model, budget | Haiku account |
| `!help` | Command list | Haiku account |
| `!sonnet <prompt>` | Force Sonnet for this message | Sonnet account |

---

## AppleScript TCC Permissions (Calendar & Email)

**Run these BEFORE installing the launchd service** — macOS will show permission popups that you must click Allow on. If the agent is already running headless when these popups appear, it will silently hang forever.

```bash
# Grant Calendar access
.venv/bin/python tools/calendar_tool.py

# Grant Mail.app access
.venv/bin/python tools/email_tool.py
```

Click **Allow** on each macOS permission dialog that appears, then install the service.

---

## Launchd Service Management

```bash
# Install (starts automatically at login)
bash scripts/install_service.sh

# Check status
launchctl print gui/$(id -u)/com.samlino.personalagent

# Stop permanently
bash scripts/uninstall_service.sh

# View logs
tail -f audit/logs/system/stdout.log
tail -f audit/logs/system/stderr.log
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Token failed auth.test` | Check `xoxp-` token in `.env`; regenerate if expired |
| Agent not posting | Verify both accounts are members of the control channel |
| `conversations_history: channel_not_found` | Check `SLACK_CONTROL_CHANNEL_ID` is correct |
| Only Haiku replies (never Sonnet) | Check `SLACK_USER_TOKEN_SONNET` is set and different from Haiku token |
| Agent doesn't start at login | Run `bash scripts/install_service.sh` again; check plist path |
| Context size > 8KB at startup | Check `MEMORY_STARTUP_FILES` — remove any large files |
