-- ============================================================
-- PHASE 6: Component Library & Design System
-- Database Schema for lavprishjemmeside.dk
-- ============================================================

-- 1. DESIGN SETTINGS (one row per site, expandable)
CREATE TABLE IF NOT EXISTS design_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL DEFAULT 1,

  -- Brand Colors
  color_primary VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  color_primary_hover VARCHAR(7) NOT NULL DEFAULT '#1D4ED8',
  color_primary_light VARCHAR(7) NOT NULL DEFAULT '#DBEAFE',
  color_secondary VARCHAR(7) NOT NULL DEFAULT '#7C3AED',
  color_secondary_hover VARCHAR(7) NOT NULL DEFAULT '#6D28D9',
  color_secondary_light VARCHAR(7) NOT NULL DEFAULT '#EDE9FE',
  color_accent VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
  color_accent_hover VARCHAR(7) NOT NULL DEFAULT '#D97706',

  -- Neutral Scale
  color_neutral_50 VARCHAR(7) NOT NULL DEFAULT '#F9FAFB',
  color_neutral_100 VARCHAR(7) NOT NULL DEFAULT '#F3F4F6',
  color_neutral_200 VARCHAR(7) NOT NULL DEFAULT '#E5E7EB',
  color_neutral_300 VARCHAR(7) NOT NULL DEFAULT '#D1D5DB',
  color_neutral_600 VARCHAR(7) NOT NULL DEFAULT '#4B5563',
  color_neutral_700 VARCHAR(7) NOT NULL DEFAULT '#374151',
  color_neutral_800 VARCHAR(7) NOT NULL DEFAULT '#1F2937',
  color_neutral_900 VARCHAR(7) NOT NULL DEFAULT '#111827',

  -- Typography
  font_heading VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_body VARCHAR(100) NOT NULL DEFAULT 'Inter',
  font_size_base VARCHAR(10) NOT NULL DEFAULT '1rem',

  -- Shapes
  border_radius ENUM('none','small','medium','large','full') NOT NULL DEFAULT 'medium',
  shadow_style ENUM('none','subtle','medium','dramatic') NOT NULL DEFAULT 'subtle',

  -- Active theme preset (NULL = custom)
  active_preset_id INT DEFAULT NULL,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT DEFAULT NULL,
  UNIQUE KEY idx_site_id (site_id),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default row
INSERT INTO design_settings (site_id) VALUES (1)
ON DUPLICATE KEY UPDATE site_id = site_id;


-- 2. THEME PRESETS
CREATE TABLE IF NOT EXISTS theme_presets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  label_da VARCHAR(100) NOT NULL,
  description_da VARCHAR(255) DEFAULT NULL,
  settings JSON NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_preset_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO theme_presets (name, label_da, description_da, settings, is_default) VALUES
('business', 'Professionel', 'Klassisk og troværdig — perfekt til virksomheder og konsulenter', '{
  "color_primary":"#1E40AF","color_primary_hover":"#1E3A8A","color_primary_light":"#DBEAFE",
  "color_secondary":"#0F766E","color_secondary_hover":"#115E59","color_secondary_light":"#CCFBF1",
  "color_accent":"#D97706","color_accent_hover":"#B45309",
  "font_heading":"Inter","font_body":"Inter",
  "border_radius":"small","shadow_style":"subtle"
}', 1),
('vibrant', 'Kreativ', 'Farverig og energisk — til kreative brands og startups', '{
  "color_primary":"#7C3AED","color_primary_hover":"#6D28D9","color_primary_light":"#EDE9FE",
  "color_secondary":"#EC4899","color_secondary_hover":"#DB2777","color_secondary_light":"#FCE7F3",
  "color_accent":"#F59E0B","color_accent_hover":"#D97706",
  "font_heading":"Poppins","font_body":"Inter",
  "border_radius":"large","shadow_style":"medium"
}', 0),
('minimalist', 'Minimalistisk', 'Rent og simpelt — lader indholdet tale for sig selv', '{
  "color_primary":"#111827","color_primary_hover":"#030712","color_primary_light":"#F3F4F6",
  "color_secondary":"#6B7280","color_secondary_hover":"#4B5563","color_secondary_light":"#F9FAFB",
  "color_accent":"#2563EB","color_accent_hover":"#1D4ED8",
  "font_heading":"Inter","font_body":"Inter",
  "border_radius":"none","shadow_style":"none"
}', 0)
ON DUPLICATE KEY UPDATE name = name;


-- 3. COMPONENTS (the library registry)
CREATE TABLE IF NOT EXISTS components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL,
  name_da VARCHAR(100) NOT NULL,
  description_da TEXT NOT NULL,
  category ENUM('opener','trust','conversion','content','structure') NOT NULL,
  tier INT NOT NULL DEFAULT 1,

  -- Schema: JSON array defining the editable content fields
  schema_fields JSON NOT NULL,

  -- Default content: JSON object with example values
  default_content JSON NOT NULL,

  -- Docs reference
  doc_path VARCHAR(255) NOT NULL,

  -- SEO metadata for the AI
  seo_heading_level ENUM('h1','h2','none') NOT NULL DEFAULT 'h2',
  seo_schema_type VARCHAR(50) DEFAULT NULL,
  seo_notes TEXT DEFAULT NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_slug (slug),
  INDEX idx_active_category (is_active, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 4. PAGE COMPONENTS (content instances on pages)
CREATE TABLE IF NOT EXISTS page_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_path VARCHAR(255) NOT NULL,
  component_id INT NOT NULL,
  content JSON NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  heading_level_override ENUM('h1','h2','h3','none') DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT DEFAULT NULL,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_page_path (page_path),
  INDEX idx_page_published_sort (page_path, is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 5. AI USAGE TRACKING (shared across Phase 6 & Phase 7)
CREATE TABLE IF NOT EXISTS ai_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  operation ENUM('page_assembly', 'visual_generation') NOT NULL,
  model VARCHAR(50) NOT NULL,
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_usd DECIMAL(10, 4),
  input_metadata JSON DEFAULT NULL,   -- For visual: image size, instructions
  output_metadata JSON DEFAULT NULL,  -- Generated component count, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_operation (operation, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
