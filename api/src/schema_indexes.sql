-- Production infrastructure indexes for lavprishjemmeside.dk API
-- Run this on theartis_lavpris database after initial schema.sql

-- Optimize sessions summary query (ORDER BY last_activity DESC in sessions.js line 26)
ALTER TABLE sessions ADD INDEX idx_last_activity (last_activity);

-- Optimize security_logs for date range + action filtering (future admin dashboard feature)
-- Composite index: created_at first makes it usable for date-only queries too
ALTER TABLE security_logs ADD INDEX idx_created_at_action (created_at, action);
