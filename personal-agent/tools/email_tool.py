"""
tools/email_tool.py — Read/send email via macOS Mail.app AppleScript.

TCC PRE-GRANT REQUIRED:
  Run this file directly in terminal BEFORE installing the launchd service:
      .venv/bin/python tools/email_tool.py
  macOS will show an Automation permission popup — click Allow.

Read operations: no approval required.
Send operations: requires_approval = True (always).
"""
from __future__ import annotations

import subprocess
from typing import Any

from tools.base import BaseTool, ToolError


def _run_applescript(script: str) -> str:
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        timeout=20,
    )
    if result.returncode != 0:
        raise ToolError(f"AppleScript error: {result.stderr.strip()}")
    return result.stdout.strip()


class EmailReadTool(BaseTool):
    """Read recent unread emails from Mail.app. No approval required."""

    @property
    def name(self) -> str:
        return "email_read"

    @property
    def description(self) -> str:
        return "Read recent unread emails from macOS Mail.app. Returns sender, subject, and preview."

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "max_count": {
                    "type": "integer",
                    "description": "Max emails to return (default: 10).",
                    "default": 10,
                },
                "mailbox": {
                    "type": "string",
                    "description": "Mailbox name (default: 'INBOX').",
                    "default": "INBOX",
                },
            },
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        max_count = int(inputs.get("max_count", 10))
        mailbox = inputs.get("mailbox", "INBOX")

        script = f"""
tell application "Mail"
    set theMessages to (messages of mailbox "{mailbox}" of first account whose read status is false)
    set resultText to ""
    set counter to 0
    repeat with msg in theMessages
        if counter >= {max_count} then exit repeat
        set resultText to resultText & "FROM: " & (sender of msg) & "\\nSUBJECT: " & (subject of msg) & "\\nPREVIEW: " & (content of msg) & "\\n---\\n"
        set counter to counter + 1
    end repeat
    if resultText is "" then return "No unread emails."
    return resultText
end tell
"""
        return _run_applescript(script)


class EmailSendTool(BaseTool):
    """Send an email via Mail.app. Always requires approval."""

    @property
    def name(self) -> str:
        return "email_send"

    @property
    def description(self) -> str:
        return (
            "Send an email via macOS Mail.app. "
            "Always requires explicit approval before sending."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "to": {"type": "string", "description": "Recipient email address."},
                "subject": {"type": "string", "description": "Email subject."},
                "body": {"type": "string", "description": "Email body (plain text)."},
                "cc": {"type": "string", "description": "CC address (optional).", "default": ""},
            },
            "required": ["to", "subject", "body"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        to = inputs["to"]
        subject = inputs["subject"]
        body = inputs["body"].replace('"', '\\"').replace("\n", "\\n")
        cc = inputs.get("cc", "")

        cc_clause = f'make new to recipient at end of cc recipients of theMessage with properties {{address:"{cc}"}}' if cc else ""

        script = f"""
tell application "Mail"
    set theMessage to make new outgoing message with properties {{subject:"{subject}", content:"{body}", visible:false}}
    make new to recipient at end of to recipients of theMessage with properties {{address:"{to}"}}
    {cc_clause}
    send theMessage
    return "Sent to {to}"
end tell
"""
        return _run_applescript(script)


if __name__ == "__main__":
    print("Testing Mail.app AppleScript access (click Allow if a dialog appears)...")
    tool = EmailReadTool()
    result = tool.run({"max_count": 1})
    print("Email access OK:", result[:100])
