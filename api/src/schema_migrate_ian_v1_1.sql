-- IAN v1.1 migration: rename Kanban stages and agent identities
-- Run once against the live master DB BEFORE deploying v1.1 API/UI code
-- Safe: ALTER expands ENUM, then UPDATE migrates existing rows

-- Step 1: Rename column_name ENUM values
ALTER TABLE kanban_items
  MODIFY COLUMN column_name
    ENUM('ideas','plans','in_review','completed') DEFAULT 'ideas';

UPDATE kanban_items SET column_name = 'ideas'     WHERE column_name = 'backlog';
UPDATE kanban_items SET column_name = 'plans'     WHERE column_name = 'in_progress';
UPDATE kanban_items SET column_name = 'in_review' WHERE column_name = 'review';
UPDATE kanban_items SET column_name = 'completed' WHERE column_name = 'done';

-- Step 2: Rename assigned_to ENUM values
ALTER TABLE kanban_items
  MODIFY COLUMN assigned_to
    ENUM('brainstormer','planner','human') DEFAULT 'human';

UPDATE kanban_items SET assigned_to = 'brainstormer' WHERE assigned_to = 'haiku';
UPDATE kanban_items SET assigned_to = 'planner'      WHERE assigned_to = 'sonnet';

-- Step 3: Rename ian_heartbeat agent_type ENUM values
ALTER TABLE ian_heartbeat
  MODIFY COLUMN agent_type
    ENUM('brainstormer','planner','ian') NOT NULL;

UPDATE ian_heartbeat SET agent_type = 'brainstormer' WHERE agent_type = 'haiku';
UPDATE ian_heartbeat SET agent_type = 'planner'      WHERE agent_type = 'sonnet';
