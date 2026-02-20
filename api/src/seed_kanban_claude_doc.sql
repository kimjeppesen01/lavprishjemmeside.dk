-- Add "Document Claude Code integration" to Kanban in the in_progress column.
-- Run once on theartis_lavpris (or your main DB). Safe to run multiple times (inserts a new row each time).

INSERT INTO kanban_items (title, description, column_name, priority, assigned_to, sort_order)
VALUES (
  'Document Claude Code integration',
  'Full reference: docs/CLAUDE_CODE_INTEGRATION.md. Covers architecture, API, OAuth, safeguards, env, troubleshooting.',
  'in_progress',
  'medium',
  'human',
  5
);
