-- Decoupled theme state (separate from design_settings styling tokens)

CREATE TABLE IF NOT EXISTS site_theme_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL DEFAULT 1,
  active_theme_key ENUM('simple','modern','kreativ') NOT NULL DEFAULT 'simple',
  motion_profile ENUM('standard','reduced','expressive') NOT NULL DEFAULT 'standard',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT DEFAULT NULL,
  UNIQUE KEY idx_site_id (site_id),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial seed for canonical single-site install.
INSERT INTO site_theme_settings (site_id, active_theme_key, motion_profile)
VALUES (1, 'simple', 'standard')
ON DUPLICATE KEY UPDATE
  site_id = VALUES(site_id);

-- Backfill from legacy design_settings.theme_mode when present.
UPDATE site_theme_settings sts
JOIN design_settings ds ON ds.site_id = sts.site_id
SET sts.active_theme_key = CASE
  WHEN ds.theme_mode = 'modern' THEN 'modern'
  ELSE 'simple'
END;
