-- Header & Footer configuration (one row per site)
-- Run once on existing installs.

CREATE TABLE IF NOT EXISTS header_footer_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL DEFAULT 1,

  -- Header layout: regular | modern | mega
  header_layout ENUM('regular','modern','mega') NOT NULL DEFAULT 'regular',

  -- Logo (shared across layouts)
  header_logo_url VARCHAR(500) DEFAULT '/favicon.svg',
  header_logo_text VARCHAR(100) NOT NULL DEFAULT 'lavprishjemmeside.dk',

  -- Menus (Regular: Menu1 center, Menu2 right | Modern: Menu1 only)
  header_menu_1 JSON NOT NULL,
  header_menu_2 JSON NOT NULL,

  -- Mega menu: raw HTML (user copies template and customizes)
  header_mega_html MEDIUMTEXT DEFAULT NULL,

  -- Footer
  footer_columns JSON NOT NULL,
  footer_copyright VARCHAR(255) DEFAULT NULL,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT DEFAULT NULL,
  UNIQUE KEY idx_site_id (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default row
INSERT INTO header_footer_settings (site_id, header_menu_1, header_menu_2, footer_columns) VALUES
(1,
 '[{"href":"/","label":"Forside"},{"href":"/priser","label":"Priser"},{"href":"/om-os","label":"Om os"},{"href":"/kontakt","label":"Kontakt"}]',
 '[{"href":"/kontakt","label":"Få et tilbud"}]',
 '[{"title":"lavprishjemmeside.dk","text":"Professionelle hjemmesider til lav pris for danske virksomheder."},{"title":"Sider","links":[{"href":"/","label":"Forside"},{"href":"/priser","label":"Priser"},{"href":"/om-os","label":"Om os"},{"href":"/kontakt","label":"Kontakt"}]},{"title":"Kontakt","links":[{"href":"mailto:info@lavprishjemmeside.dk","label":"info@lavprishjemmeside.dk"}]}]'
)
ON DUPLICATE KEY UPDATE site_id = site_id;
