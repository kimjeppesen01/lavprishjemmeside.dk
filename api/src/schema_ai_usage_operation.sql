-- Expand ai_usage operation enum and normalize legacy invalid rows.

ALTER TABLE ai_usage
  MODIFY COLUMN operation ENUM('page_assembly', 'page_assembly_advanced', 'visual_generation') NOT NULL;

UPDATE ai_usage
SET operation = 'page_assembly_advanced'
WHERE operation = '' OR operation IS NULL;
