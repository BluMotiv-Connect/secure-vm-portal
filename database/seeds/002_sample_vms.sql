-- Create sample virtual machines for testing and development
-- Remove or modify for production use

-- Sample Windows VMs
-- INSERT INTO virtual_machines (name, description, ip_address, os_type, os_version, status, region, instance_id, tags) 
-- VALUES 
--   (
--     'DEV-WIN-01', 
--     'Windows development server for frontend team',
--     '192.168.1.100',
--     'windows',
--     'Windows Server 2019',
--     'online',
--     'us-east-1',
--     'i-1234567890abcdef0',
--     '{"environment": "development", "team": "frontend", "cost-center": "engineering"}'::jsonb
--   ),
--   (
--     'DEV-WIN-02',
--     'Windows development server for backend team', 
--     '192.168.1.101',
--     'windows',
--     'Windows Server 2022',
--     'online',
--     'us-east-1',
--     'i-1234567890abcdef1',
--     '{"environment": "development", "team": "backend", "cost-center": "engineering"}'::jsonb
--   ),
--   (
--     'PROD-WIN-01',
--     'Production Windows server for critical applications',
--     '192.168.2.100', 
--     'windows',
--     'Windows Server 2022',
--     'online',
--     'us-west-2',
--     'i-1234567890abcdef2',
--     '{"environment": "production", "criticality": "high", "cost-center": "operations"}'::jsonb
--   );

-- -- Sample Linux VMs  
-- INSERT INTO virtual_machines (name, description, ip_address, os_type, os_version, status, region, instance_id, tags)
-- VALUES
--   (
--     'DEV-LINUX-01',
--     'Ubuntu development server for web applications',
--     '192.168.1.200',
--     'linux', 
--     'Ubuntu 22.04 LTS',
--     'online',
--     'us-east-1',
--     'i-1234567890abcdef3',
--     '{"environment": "development", "team": "web", "cost-center": "engineering"}'::jsonb
--   ),
--   (
--     'DEV-LINUX-02',
--     'CentOS development server for data processing',
--     '192.168.1.201',
--     'linux',
--     'CentOS 8',
--     'online', 
--     'us-east-1',
--     'i-1234567890abcdef4',
--     '{"environment": "development", "team": "data", "cost-center": "engineering"}'::jsonb
--   ),
--   (
--     'STAGING-LINUX-01',
--     'Ubuntu staging server for testing',
--     '192.168.3.100',
--     'linux',
--     'Ubuntu 22.04 LTS', 
--     'online',
--     'us-central-1',
--     'i-1234567890abcdef5',
--     '{"environment": "staging", "team": "qa", "cost-center": "engineering"}'::jsonb
--   );

-- -- Create VM credentials (encrypted - replace with actual encrypted passwords)
-- INSERT INTO vm_credentials (vm_id, username, password_encrypted, connection_port, connection_type)
-- SELECT 
--   vm.id,
--   CASE 
--     WHEN vm.os_type = 'windows' THEN 'administrator'
--     ELSE 'ubuntu'
--   END,
--   'encrypted_password_placeholder_' || vm.id, -- Replace with actual encrypted passwords
--   CASE 
--     WHEN vm.os_type = 'windows' THEN 3389
--     ELSE 22
--   END,
--   CASE 
--     WHEN vm.os_type = 'windows' THEN 'rdp'
--     ELSE 'ssh'
--   END
-- FROM virtual_machines vm;

-- -- Create sample VM assignments (assign to admin users)
-- INSERT INTO vm_assignments (vm_id, user_id, assigned_by, assigned_at)
-- SELECT 
--   vm.id,
--   u.id,
--   u.id, -- Self-assigned for sample data
--   CURRENT_TIMESTAMP
-- FROM virtual_machines vm
-- CROSS JOIN users u 
-- WHERE u.role = 'admin'
--   AND vm.name LIKE 'DEV-%'
-- ON CONFLICT (vm_id) DO NOTHING;

-- -- Log VM creation
-- INSERT INTO audit_logs (action, resource_type, resource_id, metadata, created_at)
-- SELECT 
--   'VM_CREATED',
--   'virtual_machines',
--   vm.id,
--   jsonb_build_object(
--     'name', vm.name,
--     'os_type', vm.os_type,
--     'ip_address', vm.ip_address,
--     'created_by', 'system_seed'
--   ),
--   CURRENT_TIMESTAMP
-- FROM virtual_machines vm;

-- -- Update VM statistics
-- UPDATE virtual_machines 
-- SET 
--   total_sessions = 0,
--   total_usage_minutes = 0,
--   unique_users = 0,
--   active_days = 0,
--   updated_at = CURRENT_TIMESTAMP;
