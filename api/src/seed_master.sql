-- Seed master sites registry
-- Safe to re-run: INSERT IGNORE skips existing rows

INSERT IGNORE INTO sites (name, domain, api_url, admin_url, version, db_name, db_user, db_password)
VALUES
  (
    'Lavpris Hjemmeside',
    'lavprishjemmeside.dk',
    'https://api.lavprishjemmeside.dk',
    'https://lavprishjemmeside.dk/admin/',
    '1.0.0',
    'theartis_lavpris',
    'theartis_lavpris',
    ''
  ),
  (
    'LJ Design Studio',
    'ljdesignstudio.dk',
    'https://api.ljdesignstudio.dk',
    'https://ljdesignstudio.dk/admin/',
    '1.0.0',
    'theartis_ljdesign',
    'theartis_ljdesign',
    ''
  );

-- Seed initial kanban items from known V1.1 pending items
INSERT IGNORE INTO kanban_items (title, description, column_name, priority, assigned_to, version_target, sort_order)
VALUES
  ('Date range filtering', 'Add date range selector to events/sessions traffic view', 'ideas', 'medium', 'human', '1.1.0', 10),
  ('Security logs page', 'Admin page at /admin/sikkerhed/ listing security_logs entries', 'ideas', 'medium', 'human', '1.1.0', 20),
  ('User management page', 'Admin page at /admin/brugere/ to list/invite/delete users', 'ideas', 'medium', 'human', '1.1.0', 30),
  ('Change password feature', 'Let logged-in admin change their own password', 'ideas', 'low', 'human', '1.1.0', 40),
  ('Charts/trends visualization', 'Canvas bar charts for sessions and pageviews over time', 'ideas', 'medium', 'human', '1.1.0', 50),
  ('Phase 7: AI Visual Page Builder', 'AI generates and previews full page layouts interactively', 'ideas', 'high', 'planner', '1.2.0', 60);
