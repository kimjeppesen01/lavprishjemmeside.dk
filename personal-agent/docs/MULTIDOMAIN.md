# IAN — Multi-Client Channel Support (lavprishjemmeside.dk)

## Context

You sell "lavprishjemmeside.dk" — a CMS + websuite product. Each client gets their
own Slack channel. IAN monitors all client channels and responds to clients
automatically. When you jump in to chat directly with a client, IAN stays silent.

**6 files. No new dependencies. No DB changes. Fully backward-compatible.**

---

## .env Change (do this first)

```bash
# Add to .env — blank = no client channels (backward compatible)
SLACK_CLIENT_CHANNELS=        # e.g. SLACK_CLIENT_CHANNELS=C111AAA,C222BBB
```

---

## Step 1 — `agent/config.py`

**In `SlackConfig` dataclass**, add one field after `poll_interval_seconds`:
```python
client_channels: list[str]
```

**In `load()` → `slack=SlackConfig(...)`**, add:
```python
client_channels=[
    ch.strip()
    for ch in _optional("SLACK_CLIENT_CHANNELS", "").split(",")
    if ch.strip()
],
```

---

## Step 2 — `slack/middleware.py`

Add this function after `is_owner_message()`:

```python
def is_client_message(message: dict, owner_user_id: str) -> bool:
    """
    Return True for messages IAN should respond to in client channels.
    Drops: bot/system subtypes + messages FROM the owner
    (owner can talk directly to clients without IAN interrupting).
    Accepts: any other real user message.
    """
    if not owner_user_id:
        raise ValueError("owner_user_id must be set. Set SLACK_OWNER_USER_ID in .env")

    subtype = message.get("subtype", "")
    if subtype in ("bot_message", "message_changed", "message_deleted", "channel_join"):
        return False

    user_id = message.get("user", "")
    if user_id == owner_user_id:
        logger.debug("Dropped owner message in client channel (owner direct chat)")
        return False

    if user_id:
        return True

    logger.debug("Dropped message with no user field (subtype=%s)", subtype or "none")
    return False
```

---

## Step 3 — `slack/poller.py`

**Add type alias** after the existing `MessageHandler` line:
```python
MessageFilter = Callable[[dict, str], bool]
```

**In `__init__`**, add one parameter with a backward-compatible default:
```python
def __init__(
    self,
    read_client: WebClient,
    owner_user_id: str,
    channel_id: str,
    handler: MessageHandler,
    poll_interval_seconds: int = 5,
    message_filter: MessageFilter = is_owner_message,   # NEW
) -> None:
    ...
    self._message_filter = message_filter   # NEW — add after self._interval
```

**In `_poll()`**, replace line 119:
```python
# OLD:
if is_owner_message(msg, self._owner_user_id):
# NEW:
if self._message_filter(msg, self._owner_user_id):
```

---

## Step 4 — `slack/handlers.py`

### A) Add module-level constant (after imports, before `logger = ...`):

```python
_CLIENT_SUPPORT_CTX = """\
You are IAN, an AI support assistant for lavprishjemmeside.dk — a Danish CMS \
product for building affordable websites. You are responding to a client in \
their dedicated support channel.

Role:
- Answer product questions clearly and helpfully
- Help with website, account, billing, and feature questions
- Always respond in the same language the client writes in (Danish or English)
- Be professional, warm, and concise — clients are typically small business owners
- If an issue cannot be resolved here, direct them to email support@lavprishjemmeside.dk

Do NOT reveal internal tooling, owner information, or pricing margins.
"""
```

### B) In `handle()` inner function — add `is_client_ch` right after the channel/text extraction (around line 195, after `text = sanitise_input(text)`):

```python
is_client_ch = channel in cfg.slack.client_channels
```

### C) Wrap ALL admin commands in `if not is_client_ch:` so clients can't trigger them:

```python
# ---- Admin commands — owner-only, blocked in client channels ----
if not is_client_ch:
    if lower == "!status":
        ...
    if lower == "!help":
        ...
    # ... all existing admin if-blocks through !reset ...
    if lower == "!reset":
        ...
        return
```

### D) In the conversational path, replace `extra_system_context=project_context` with:

```python
project_context = project_router.get_context(prompt)
if is_client_ch:
    extra_ctx = _CLIENT_SUPPORT_CTX + ("\n\n" + project_context if project_context else "")
else:
    extra_ctx = project_context

# ... then in _run_with_tools call:
extra_system_context=extra_ctx,
```

---

## Step 5 — `slack/app.py`

### Add imports at top:
```python
import threading
from slack.middleware import is_client_message
```

### In `start()`, add client poller threads BEFORE the existing control-channel poller:

```python
handler = make_handler(cfg, haiku_client, sonnet_client)

# --- Client channel pollers (daemon threads, one per client) ---
for channel_id in cfg.slack.client_channels:
    client_poller = SlackPoller(
        read_client=haiku_client,
        owner_user_id=cfg.slack.owner_user_id,
        channel_id=channel_id,
        handler=handler,
        poll_interval_seconds=cfg.slack.poll_interval_seconds,
        message_filter=is_client_message,
    )
    t = threading.Thread(
        target=client_poller.start,
        name=f"client-poller-{channel_id}",
        daemon=True,   # dies automatically when main thread exits
    )
    t.start()
    logger.info("Client poller started | channel=%s", channel_id)

# --- Control channel poller (main thread, blocking — unchanged) ---
poller = SlackPoller(
    read_client=haiku_client,
    owner_user_id=cfg.slack.owner_user_id,
    channel_id=cfg.slack.control_channel_id,
    handler=handler,
    poll_interval_seconds=cfg.slack.poll_interval_seconds,
    # message_filter defaults to is_owner_message — no change
)
try:
    poller.start()
finally:
    scheduler.stop()
```

---

## Step 6 — `projects/lavprishjemmeside.md` (new file)

```markdown
# lavprishjemmeside.dk — Product Context

## What It Is
A Danish CMS product for small businesses. Drag-and-drop website builder,
built-in hosting, Danish-language UI, custom domain support, optional e-commerce.

## Common Support Questions
- **Change template** → Settings > Design > Templates
- **Connect custom domain** → Settings > Domain > Connect Domain
- **Add e-commerce** → Apps > E-commerce
- **Billing / invoice** → direct to support@lavprishjemmeside.dk

## Escalation
If the issue cannot be resolved in this channel:
> "Please email support@lavprishjemmeside.dk with your account email
> and a description of the issue — our team will help you within 24 hours."

## Tone
Warm, non-technical, concise. Most clients are small business owners, not developers.
Always match the client's language (Danish or English).
```

Optionally add to `agent/project_router.py` for keyword-triggered loading in the control channel too:
```python
"lavpris": "lavprishjemmeside.md",
"lavprishjemmeside": "lavprishjemmeside.md",
```

---

## Thread Safety (why this is safe)

| Resource | Why safe |
|---|---|
| `ConversationHistory` | SQLite WAL, new connection per call |
| `BudgetTracker` | Atomic SQL row operations |
| `ClaudeClient` | Stateless SDK wrapper |
| `ToolRegistry` | Read-only after construction |
| `ApprovalGate` | Always posts to control channel — owner approves regardless of which client triggered it |

---

## Onboarding a New Client

1. Create a Slack channel for them (e.g. `#client-acme`)
2. Invite the client as a guest/member
3. Copy the channel ID (starts with `C`)
4. Add it to `.env`: `SLACK_CLIENT_CHANNELS=Cexisting,Cnew`
5. Restart IAN: `launchctl kickstart -k gui/$(id -u)/com.samlino.personalagent`
6. IAN immediately starts monitoring their channel

---

## Verification Checklist

1. `SLACK_CLIENT_CHANNELS=` (empty) → restart → no client pollers in logs ✓
2. Add one real channel ID → restart → `Client poller started | channel=Cxxx` in logs ✓
3. Client sends message in their channel → IAN replies with lavprishjemmeside.dk support context ✓
4. Owner sends message in client channel → IAN stays silent ✓
5. Client sends `!tools` in their channel → IAN stays silent (admin commands blocked) ✓
6. Owner sends message in control channel → normal behavior unchanged ✓
7. Add second channel ID → two `client-poller-Cxxx` threads in logs ✓
