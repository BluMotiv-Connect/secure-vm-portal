-- Sample data for testing and development
-- This creates realistic test data for the Secure VM Portal

-- Sample work logs for development VMs
INSERT INTO work_logs (user_id, vm_id, session_id, work_type, task_title, task_description, start_time, end_time, duration_minutes, is_billable)
SELECT 
  u.id,
  vm.id,
  'session_' || generate_random_uuid(),
  (ARRAY['work', 'meeting', 'training'])[floor(random() * 3 + 1)],
  (ARRAY[
    'Frontend Development',
    'Backend API Work', 
    'Database Optimization',
    'Code Review',
    'Testing Implementation',
    'Bug Fixes',
    'Feature Development',
    'Documentation Update'
  ])[floor(random() * 8 + 1)],
  'Sample task description for development and testing purposes.',
  CURRENT_TIMESTAMP - (random() * INTERVAL '30 days'),
  CURRENT_TIMESTAMP - (random() * INTERVAL '30 days') + (random() * INTERVAL '4 hours'),
  floor(random() * 240 + 30), -- 30-270 minutes
  random() > 0.2 -- 80% billable
FROM users u
CROSS JOIN virtual_machines vm
WHERE u.role = 'admin' AND vm.name LIKE 'DEV-%'
AND random() < 0.3; -- Only create logs for 30% of combinations

-- Sample non-work logs
INSERT INTO non_work_logs (user_id, reason, start_time, end_time, date)
SELECT 
  u.id,
  (ARRAY[
    'Sick leave',
    'Personal time off',
    'Training session (no VM needed)',
    'Team meeting',
    'Administrative work',
    'Client meeting'
  ])[floor(random() * 6 + 1)],
  CURRENT_DATE - (random() * INTERVAL '30 days')::int + (random() * INTERVAL '8 hours'),
  CURRENT_DATE - (random() * INTERVAL '30 days')::int + (random() * INTERVAL '8 hours') + INTERVAL '2 hours',
  CURRENT_DATE - (random() * INTERVAL '30 days')::int
FROM users u
WHERE u.role = 'admin'
AND random() < 0.1; -- 10% chance of non-work logs

-- Sample sessions (some active, some ended)
INSERT INTO sessions (session_id, user_id, vm_id, connection_type, status, start_time, end_time, metadata)
SELECT 
  'session_' || generate_random_uuid(),
  u.id,
  vm.id,
  CASE WHEN vm.os_type = 'windows' THEN 'rdp' ELSE 'ssh' END,
  CASE WHEN random() < 0.1 THEN 'active' ELSE 'ended' END,
  CURRENT_TIMESTAMP - (random() * INTERVAL '7 days'),
  CASE WHEN random() < 0.1 THEN NULL ELSE CURRENT_TIMESTAMP - (random() * INTERVAL '7 days') + (random() * INTERVAL '3 hours') END,
  jsonb_build_object(
    'clientIP', '192.168.1.' || floor(random() * 254 + 1),
    'userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'connectionMethod', 'bastion'
  )
FROM users u
CROSS JOIN virtual_machines vm
WHERE u.role = 'admin' AND vm.status = 'online'
AND random() < 0.2; -- 20% chance of session

-- Sample audit logs
INSERT INTO audit_logs (action, resource_type, resource_id, user_id, metadata)
SELECT 
  (ARRAY[
    'USER_LOGIN',
    'VM_CONNECTED',
    'VM_DISCONNECTED', 
    'WORK_SESSION_STARTED',
    'WORK_SESSION_ENDED',
    'REPORT_GENERATED'
  ])[floor(random() * 6 + 1)],
  (ARRAY['users', 'virtual_machines', 'sessions', 'work_logs'])[floor(random() * 4 + 1)],
  floor(random() * 10 + 1),
  u.id,
  jsonb_build_object(
    'ip_address', '192.168.1.' || floor(random() * 254 + 1),
    'user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'timestamp', CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
  )
FROM users u
WHERE random() < 0.3; -- 30% chance of audit log

-- Update VM statistics based on sample data
UPDATE virtual_machines vm
SET 
  total_sessions = (
    SELECT COUNT(*) 
    FROM sessions s 
    WHERE s.vm_id = vm.id
  ),
  total_usage_minutes = (
    SELECT COALESCE(SUM(duration_minutes), 0)
    FROM work_logs wl 
    WHERE wl.vm_id = vm.id
  ),
  unique_users = (
    SELECT COUNT(DISTINCT user_id)
    FROM work_logs wl 
    WHERE wl.vm_id = vm.id
  ),
  active_days = (
    SELECT COUNT(DISTINCT DATE(start_time))
    FROM work_logs wl 
    WHERE wl.vm_id = vm.id
  );

-- Create sample user preferences
INSERT INTO user_preferences (user_id, preferences)
SELECT 
  u.id,
  jsonb_build_object(
    'theme', (ARRAY['light', 'dark'])[floor(random() * 2 + 1)],
    'notifications', random() > 0.3,
    'dashboard_layout', (ARRAY['default', 'compact', 'detailed'])[floor(random() * 3 + 1)],
    'timezone', (ARRAY['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])[floor(random() * 4 + 1)],
    'language', 'en',
    'auto_logout', floor(random() * 480 + 120) -- 2-8 hours in minutes
  )
FROM users u
ON CONFLICT (user_id) DO UPDATE SET
  preferences = EXCLUDED.preferences;

-- Sample API tokens for testing
INSERT INTO api_tokens (user_id, token_name, token_hash, permissions, expires_at)
SELECT 
  u.id,
  'Development Token',
  encode(sha256(('dev-token-' || u.id || '-' || extract(epoch from now()))::bytea), 'hex'),
  CASE 
    WHEN u.role = 'admin' THEN '["admin", "read", "write"]'::jsonb
    ELSE '["read"]'::jsonb
  END,
  CURRENT_TIMESTAMP + INTERVAL '90 days'
FROM users u
WHERE random() < 0.5; -- 50% of users get API tokens

-- Log sample data creation
INSERT INTO audit_logs (action, resource_type, metadata)
VALUES (
  'SAMPLE_DATA_CREATED',
  'system',
  jsonb_build_object(
    'created_by', 'seed_script',
    'timestamp', CURRENT_TIMESTAMP,
    'description', 'Sample data created for development and testing'
  )
);

-- Refresh materialized views if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'daily_work_stats') THEN
    REFRESH MATERIALIZED VIEW daily_work_stats;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'reporting_daily_summary') THEN
    REFRESH MATERIALIZED VIEW reporting_daily_summary;
  END IF;
END $$;
