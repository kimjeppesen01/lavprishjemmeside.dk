-- lavprishjemmeside.dk Database Schema
-- Run this in phpMyAdmin on theartis_lavpris

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  page_url VARCHAR(500),
  referrer VARCHAR(500),
  user_agent VARCHAR(500),
  ip_address VARCHAR(45),
  session_id VARCHAR(100),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  path VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  description TEXT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'published',
  last_deployed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  user_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  first_page VARCHAR(500),
  last_page VARCHAR(500),
  page_count INT DEFAULT 1,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_started_at (started_at)
);

-- Insert initial admin user (password: change_me_immediately)
-- Hash generated with bcrypt, 12 rounds
-- You MUST change this password after first login
INSERT INTO users (email, password_hash, name, role) VALUES (
  'admin@lavprishjemmeside.dk',
  '$2b$12$82ls3lBCFLh7kI9jkxQ81.7xUWIC3/2mozqgZIk1yHt7DnbhFtx1q',
  'Admin',
  'admin'
);
