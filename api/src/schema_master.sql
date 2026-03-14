-- Master dashboard schema: sites registry and legacy master kanban
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
