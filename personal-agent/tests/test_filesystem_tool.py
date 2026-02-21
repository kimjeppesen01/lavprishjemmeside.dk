"""Tests for tools/filesystem.py"""
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from tools.base import ToolError
from tools.filesystem import FilesystemListTool, FilesystemReadTool, FilesystemWriteTool


@pytest.fixture
def cfg(tmp_path):
    mock = MagicMock()
    mock.filesystem.safe_roots = [tmp_path]
    mock.filesystem.deny_patterns = [".env", "id_rsa"]
    return mock


def test_read_existing_file(cfg, tmp_path):
    f = tmp_path / "hello.txt"
    f.write_text("hello world")
    tool = FilesystemReadTool(cfg)
    result = tool.run({"path": str(f)})
    assert "hello world" in result


def test_read_missing_file(cfg, tmp_path):
    tool = FilesystemReadTool(cfg)
    with pytest.raises(ToolError, match="not found"):
        tool.run({"path": str(tmp_path / "missing.txt")})


def test_read_outside_safe_root(cfg, tmp_path):
    tool = FilesystemReadTool(cfg)
    with pytest.raises(ToolError, match="safe roots"):
        tool.run({"path": "/etc/hosts"})


def test_read_deny_pattern(cfg, tmp_path):
    f = tmp_path / ".env"
    f.write_text("SECRET=abc")
    tool = FilesystemReadTool(cfg)
    with pytest.raises(ToolError, match="deny pattern"):
        tool.run({"path": str(f)})


def test_write_creates_file(cfg, tmp_path):
    tool = FilesystemWriteTool(cfg)
    out = tmp_path / "output.txt"
    result = tool.run({"path": str(out), "content": "test content"})
    assert out.read_text() == "test content"
    assert "Written" in result


def test_list_directory(cfg, tmp_path):
    (tmp_path / "a.py").write_text("")
    (tmp_path / "b.py").write_text("")
    tool = FilesystemListTool(cfg)
    result = tool.run({"path": str(tmp_path), "pattern": "*.py"})
    assert "a.py" in result
    assert "b.py" in result
