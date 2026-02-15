-- Feature toggles for design_settings
-- Run once on existing installs. Ignore errors if columns already exist.

ALTER TABLE design_settings ADD COLUMN feature_smooth_scroll TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE design_settings ADD COLUMN feature_grain_overlay TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE design_settings ADD COLUMN feature_page_loader TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE design_settings ADD COLUMN feature_sticky_header TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE design_settings ADD COLUMN page_loader_text VARCHAR(100) NOT NULL DEFAULT 'Indlæser...';
ALTER TABLE design_settings ADD COLUMN page_loader_show_logo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE design_settings ADD COLUMN page_loader_duration DECIMAL(3,1) NOT NULL DEFAULT 2.5;
