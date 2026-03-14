CREATE TABLE IF NOT EXISTS assistant_settings (
  site_id INT PRIMARY KEY,
  assistant_status ENUM('draft','active','disabled') NOT NULL DEFAULT 'draft',
  assistant_name VARCHAR(120) DEFAULT NULL,
  site_key VARCHAR(191) DEFAULT NULL,
  client_agent_id VARCHAR(191) DEFAULT NULL,
  last_session_id VARCHAR(191) DEFAULT NULL,
  last_synced_at TIMESTAMP NULL DEFAULT NULL,
  questionnaire_json JSON NULL,
  preview_user_md MEDIUMTEXT NULL,
  preview_soul_md MEDIUMTEXT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO assistant_settings (
  site_id,
  assistant_status,
  site_key,
  client_agent_id
) VALUES (
  1,
  'draft',
  NULL,
  NULL
);
