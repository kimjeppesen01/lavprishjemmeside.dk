"""
tools/calendar_tool.py — Read/write macOS Calendar via AppleScript.

TCC PRE-GRANT REQUIRED:
  Run this file directly in terminal BEFORE installing the launchd service:
      .venv/bin/python tools/calendar_tool.py
  macOS will show an Automation permission popup — click Allow.
  If the agent is headless when the popup appears, it hangs forever.

Read operations: no approval required.
Write operations (create event): requires_approval = True.
"""
from __future__ import annotations

import subprocess
from typing import Any

from tools.base import BaseTool, ToolError


def _run_applescript(script: str) -> str:
    """Run an AppleScript and return stdout. Raises ToolError on failure."""
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        timeout=15,
    )
    if result.returncode != 0:
        raise ToolError(f"AppleScript error: {result.stderr.strip()}")
    return result.stdout.strip()


class CalendarReadTool(BaseTool):
    """Read upcoming calendar events. No approval required."""

    @property
    def name(self) -> str:
        return "calendar_read"

    @property
    def description(self) -> str:
        return "Read upcoming events from macOS Calendar for the next N days."

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "days_ahead": {
                    "type": "integer",
                    "description": "How many days ahead to look (default: 7).",
                    "default": 7,
                }
            },
        }

    @property
    def requires_approval(self) -> bool:
        return False

    def run(self, inputs: dict[str, Any]) -> str:
        days = int(inputs.get("days_ahead", 7))
        script = f"""
tell application "Calendar"
    set theEvents to {{}}
    set startDate to current date
    set endDate to startDate + ({days} * days)
    repeat with theCalendar in calendars
        set theEvents to theEvents & (events of theCalendar whose start date >= startDate and start date <= endDate)
    end repeat
    set resultText to ""
    repeat with ev in theEvents
        set resultText to resultText & (summary of ev) & " | " & (start date of ev as string) & "\\n"
    end repeat
    return resultText
end tell
"""
        result = _run_applescript(script)
        return result if result else "No events found in the next " + str(days) + " days."


class CalendarCreateTool(BaseTool):
    """Create a calendar event. Requires approval."""

    @property
    def name(self) -> str:
        return "calendar_create"

    @property
    def description(self) -> str:
        return (
            "Create a new event in macOS Calendar. "
            "Requires approval before executing."
        )

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Event title."},
                "start": {"type": "string", "description": "Start datetime ISO 8601 (e.g. '2026-02-20T10:00:00')."},
                "end": {"type": "string", "description": "End datetime ISO 8601."},
                "notes": {"type": "string", "description": "Optional event notes.", "default": ""},
                "calendar": {"type": "string", "description": "Calendar name (default: first available).", "default": ""},
            },
            "required": ["title", "start", "end"],
        }

    @property
    def requires_approval(self) -> bool:
        return True

    def run(self, inputs: dict[str, Any]) -> str:
        from datetime import datetime
        title = inputs["title"]
        start_str = inputs["start"]
        end_str = inputs["end"]
        notes = inputs.get("notes", "")
        cal_name = inputs.get("calendar", "")

        # Parse ISO datetimes for AppleScript
        def _to_as_date(iso: str) -> str:
            dt = datetime.fromisoformat(iso)
            return dt.strftime("%B %d, %Y at %I:%M:%S %p")

        start_as = _to_as_date(start_str)
        end_as = _to_as_date(end_str)

        cal_clause = f'calendar "{cal_name}"' if cal_name else "first calendar"

        script = f"""
tell application "Calendar"
    set startDate to date "{start_as}"
    set endDate to date "{end_as}"
    set theCalendar to {cal_clause}
    make new event at end of events of theCalendar with properties {{summary:"{title}", start date:startDate, end date:endDate, description:"{notes}"}}
    return "Created: {title}"
end tell
"""
        return _run_applescript(script)


# TCC pre-grant helper — run this file directly to trigger the permission popup
if __name__ == "__main__":
    print("Testing Calendar AppleScript access (click Allow if a dialog appears)...")
    tool = CalendarReadTool()
    result = tool.run({"days_ahead": 1})
    print("Calendar access OK:", result[:100])
