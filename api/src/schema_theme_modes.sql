-- Theme modes and canonical presets (Simple + Modern)

ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS theme_mode ENUM('simple','modern') NOT NULL DEFAULT 'simple' AFTER active_preset_id;

UPDATE design_settings
SET theme_mode = 'simple'
WHERE theme_mode IS NULL OR theme_mode = '';

-- Ensure canonical presets exist (keeps existing presets intact)
INSERT INTO theme_presets (name, label_da, description_da, settings, is_default)
VALUES
(
  'simple',
  'Simple',
  'Nuværende klassiske stil med rene tokens og høj kompatibilitet.',
  '{
    "theme_mode":"simple",
    "color_primary":"#2563EB",
    "color_primary_hover":"#1D4ED8",
    "color_primary_light":"#DBEAFE",
    "color_secondary":"#7C3AED",
    "color_secondary_hover":"#6D28D9",
    "color_secondary_light":"#EDE9FE",
    "color_accent":"#F59E0B",
    "color_accent_hover":"#D97706",
    "font_heading":"Inter",
    "font_body":"Inter",
    "font_size_base":"1rem",
    "border_radius":"medium",
    "shadow_style":"subtle"
  }',
  1
),
(
  'modern',
  'Modern',
  'Google-inspireret design language med semantiske overflader, rounded corners og blød dybde.',
  '{
    "theme_mode":"modern",
    "color_primary":"#1A73E8",
    "color_primary_hover":"#1558B0",
    "color_primary_light":"#E8F0FE",
    "color_secondary":"#3279F9",
    "color_secondary_hover":"#255EC4",
    "color_secondary_light":"#E9F1FF",
    "color_accent":"#0B57D0",
    "color_accent_hover":"#0842A0",
    "font_heading":"Google Sans Flex",
    "font_body":"Google Sans Flex",
    "font_size_base":"1.0625rem",
    "border_radius":"large",
    "shadow_style":"medium"
  }',
  0
)
ON DUPLICATE KEY UPDATE
  label_da = VALUES(label_da),
  description_da = VALUES(description_da),
  settings = VALUES(settings),
  is_default = VALUES(is_default);
