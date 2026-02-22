-- IAN control-plane migration for existing installs
-- Safe to re-run with run-schema.cjs duplicate guards

ALTER TABLE ian_heartbeat
  ADD COLUMN work_state ENUM('operating','idle','off') DEFAULT 'idle' AFTER status;

ALTER TABLE ian_heartbeat
  ADD COLUMN assignments_completed_today INT NOT NULL DEFAULT 0 AFTER cost_usd_today;

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
