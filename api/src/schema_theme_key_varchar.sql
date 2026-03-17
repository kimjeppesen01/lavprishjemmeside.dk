-- Migrate active_theme_key from ENUM to VARCHAR(64).
-- Safe to re-run: MODIFY is idempotent if column is already VARCHAR(64).

ALTER TABLE site_theme_settings
  MODIFY COLUMN active_theme_key VARCHAR(64) NOT NULL DEFAULT 'simple';
