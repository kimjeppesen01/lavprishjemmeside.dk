-- Media table v2: Add dimensions, source tracking, and Pexels metadata
-- Run this migration on the production database.
-- Backwards compatible: existing rows get source='upload', new columns NULL/default.

ALTER TABLE media
  ADD COLUMN width INT DEFAULT NULL AFTER file_size,
  ADD COLUMN height INT DEFAULT NULL AFTER width,
  ADD COLUMN source ENUM('upload', 'pexels') DEFAULT 'upload' AFTER height,
  ADD COLUMN pexels_photo_id INT DEFAULT NULL AFTER source,
  ADD COLUMN pexels_photographer VARCHAR(255) DEFAULT NULL AFTER pexels_photo_id,
  ADD COLUMN pexels_photographer_url VARCHAR(500) DEFAULT NULL AFTER pexels_photographer,
  ADD COLUMN pexels_page_url VARCHAR(500) DEFAULT NULL AFTER pexels_photographer_url,
  ADD COLUMN tags VARCHAR(500) DEFAULT '' AFTER pexels_page_url,
  ADD UNIQUE INDEX idx_pexels_photo_id (pexels_photo_id);
