-- Link Kanban tasks to planning markdown files used by Claude runs.
-- Run on the main DB (same DB as sites + kanban_items).

CREATE TABLE IF NOT EXISTS kanban_task_md_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_task_file (task_id, file_path),
  INDEX idx_task_id (task_id)
);
