-- Add source column to components: 'library' (seed) vs 'custom' (user/Claude).
-- Seed only updates rows with source='library'; custom rows are never overwritten.
-- Run after schema_phase6.sql and seed_components_v2.sql (or on existing DB).

ALTER TABLE components
  ADD COLUMN source ENUM('library','custom') NOT NULL DEFAULT 'library' AFTER slug;

CREATE INDEX idx_components_source ON components(source);
