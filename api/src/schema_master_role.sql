-- Add 'master' role for /admin/master access control.
-- Only users with role = 'master' may use Master Hub and /master/* API.
-- Run once on theartis_lavpris (or your main DB).

ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'master') DEFAULT 'user';
