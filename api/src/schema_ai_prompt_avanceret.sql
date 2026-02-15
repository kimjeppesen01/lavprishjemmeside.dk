-- Add avanceret personlighed (markdown) to ai_prompt_settings
-- Run once after schema_ai_prompt_settings.sql
-- Hvis kolonnen allerede findes, ignorer fejlen.

ALTER TABLE ai_prompt_settings
ADD COLUMN prompt_avanceret_personlighed TEXT DEFAULT NULL;
