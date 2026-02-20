-- Audit log for all /master/* requests. Run on theartis_lavpris (or your main DB).

CREATE TABLE IF NOT EXISTS master_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  email VARCHAR(255) NULL,
  path VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  meta JSON NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_user_id (user_id),
  INDEX idx_path (path)
);
