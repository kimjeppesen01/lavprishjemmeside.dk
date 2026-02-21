-- Grant master access to info@lavprishjemmeside.dk (Master Hub + /master/* API).
-- Run once on theartis_lavpris. Requires schema_master_role.sql to have been run first.

UPDATE users SET role = 'master' WHERE email = 'info@lavprishjemmeside.dk';
