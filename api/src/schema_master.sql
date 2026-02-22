-- Master dashboard schema: sites registry, kanban board, IAN agent heartbeat
-- Safe to run on existing DBs (all IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  api_url VARCHAR(255) NOT NULL,
  admin_url VARCHAR(255) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0.0',
  db_host VARCHAR(100) DEFAULT '127.0.0.1',
  db_name VARCHAR(100),
  db_user VARCHAR(100),
  db_password VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kanban_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_name ENUM('ideas','plans','in_review','completed') DEFAULT 'ideas',
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  assigned_to ENUM('brainstormer','planner','human') DEFAULT 'human',
  version_target VARCHAR(20) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ian_heartbeat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_type ENUM('brainstormer','planner','ian') NOT NULL UNIQUE,
  status ENUM('online','offline','busy') DEFAULT 'offline',
  work_state ENUM('operating','idle','off') DEFAULT 'idle',
  current_task TEXT,
  messages_sent_today INT DEFAULT 0,
  tokens_used_today INT DEFAULT 0,
  cost_usd_today DECIMAL(10,6) DEFAULT 0,
  assignments_completed_today INT DEFAULT 0,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  metadata JSON
);

-- Default rows for IAN agent types
INSERT IGNORE INTO ian_heartbeat (agent_type, status) VALUES ('brainstormer', 'offline');
INSERT IGNORE INTO ian_heartbeat (agent_type, status) VALUES ('planner', 'offline');
INSERT IGNORE INTO ian_heartbeat (agent_type, status) VALUES ('ian', 'offline');

-- Runtime control-plane for IAN (singleton row id=1)
CREATE TABLE IF NOT EXISTS ian_control (
  id TINYINT PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  desired_state ENUM('on','off') NOT NULL DEFAULT 'on',
  updated_by_user_id INT NULL,
  note VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO ian_control (id, enabled, desired_state, note)
VALUES (1, 1, 'on', 'Default enabled state');

-- Assignment-level accounting events (for immediate dashboard increments + reconciliation)
CREATE TABLE IF NOT EXISTS ian_assignment_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agent_type ENUM('brainstormer','planner','ian') NOT NULL,
  ticket_id VARCHAR(64) NULL,
  assignment_type VARCHAR(64) NULL,
  tokens_delta INT NOT NULL DEFAULT 0,
  cost_delta_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  messages_delta INT NOT NULL DEFAULT 0,
  metadata JSON NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_completed_at (completed_at),
  INDEX idx_agent_type (agent_type),
  INDEX idx_ticket_id (ticket_id)
);
