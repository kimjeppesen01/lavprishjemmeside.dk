-- Add modern-mega layout and header_mega_menu column
-- Run once on existing installs that already have header_footer_settings.

ALTER TABLE header_footer_settings
  MODIFY COLUMN header_layout ENUM('regular','modern','mega','modern-mega') NOT NULL DEFAULT 'regular';

ALTER TABLE header_footer_settings
  ADD COLUMN header_mega_menu JSON DEFAULT NULL AFTER header_mega_html;
