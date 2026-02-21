# Adding a New Tool to IAN

A tool is any capability the agent can call — web search, file reads, shell commands, API calls, etc.

## 1. Create the tool class

Add a file in `tools/` that subclasses `BaseTool`:

```python
# tools/my_tool.py
from typing import Any
from tools.base import BaseTool, ToolError

class MyTool(BaseTool):
    @property
    def name(self) -> str:
        return "my.tool"          # dot-namespaced, unique

    @property
    def description(self) -> str:
        return "One sentence describing what this tool does."

    @property
    def input_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "param": {"type": "string", "description": "What this param does."},
            },
            "required": ["param"],
        }

    @property
    def requires_approval(self) -> bool:
        return False   # True = Slack Approve/Reject button before running

    def run(self, inputs: dict[str, Any]) -> str:
        param = inputs["param"]
        # ... do the thing ...
        return f"Result: {param}"
```

**Rules:**
- `run()` must return a **string** — Claude sees this as the tool result
- Raise `ToolError` for expected failures (bad input, permission denied)
- Raise nothing for unexpected failures — the registry catches all exceptions
- Set `requires_approval = True` for anything destructive or irreversible

## 2. Register it in `slack/handlers.py`

```python
from tools.my_tool import MyTool

# Inside make_handler(), after the other registry.register() calls:
registry.register(MyTool())
# or if it needs config:
registry.register(MyTool(cfg))
```

## 3. Write a test

```python
# tests/test_my_tool.py
from tools.my_tool import MyTool

def test_my_tool_basic():
    tool = MyTool()
    result = tool.run({"param": "hello"})
    assert "hello" in result
```

Run tests: `.venv/bin/pytest tests/test_my_tool.py -v`

## 4. Update IDENTITY.md

Add a row to the capability table in `IDENTITY.md` so IAN knows what it can do:

```markdown
| my.tool | Active | Brief description |
```

## Approval Gate

If `requires_approval = True`, the agent will:
1. Post a message: `⚠️ Tool approval required — my.tool — inputs: {...}`
2. Include a request ID
3. Poll for your reply: `✅ approve <id>` or `❌ reject <id>`
4. Only call `run()` after approval

Timeout is configurable via `APPROVAL_TIMEOUT_SECONDS` (default 120s).

## Tool Naming Conventions

| Prefix | Use for |
|--------|---------|
| `filesystem.*` | File read/write/list |
| `shell.*` | Shell command execution |
| `web.*` | Search and fetch |
| `browser.*` | Headless browser |
| `calendar.*` | macOS Calendar |
| `email.*` | macOS Mail |
| `memory.*` | Agent memory operations |
| `project.*` | Project-specific actions |
