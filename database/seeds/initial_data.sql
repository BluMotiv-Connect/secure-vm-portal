-- Initial seed data for development and testing

-- Insert default admin user (will be replaced by actual Azure AD users)
INSERT INTO users (name, email, azure_id, role, is_active) VALUES
('System Administrator', 'admin@company.com', 'admin-azure-id-placeholder', 'admin', true),
('Test Employee', 'employee@company.com', 'employee-azure-id-placeholder', 'employee', true)
ON CONFLICT (azure_id) DO NOTHING;

-- Insert sample VMs for testing (replace with your actual VMs)
INSERT INTO virtual_machines (name, description, ip_address, os_type, os_version, status, region) VALUES
('Windows Dev Server', 'Development server for Windows applications', '192.168.1.100', 'windows', 'Windows Server 2019', 'online', 'Local'),
('Linux Web Server', 'Ubuntu web server for development', '192.168.1.101', 'linux', 'Ubuntu 20.04 LTS', 'online', 'Local'),
('Database Server', 'CentOS database server', '192.168.1.102', 'linux', 'CentOS 8', 'online', 'Local'),
('Test Windows VM', 'Windows testing environment', '192.168.1.103', 'windows', 'Windows 10 Pro', 'offline', 'Local'),
('Docker Host', 'Linux server for containerized applications', '192.168.1.104', 'linux', 'Ubuntu 22.04 LTS', 'maintenance', 'Local')
ON CONFLICT (ip_address) DO NOTHING;

-- Sample VM credentials (these will be encrypted in production)
-- Note: These are placeholder credentials - replace with actual encrypted credentials
INSERT INTO vm_credentials (vm_id, username, password_encrypted, connection_port, connection_type) VALUES
(1, 'administrator', 'placeholder_encrypted_password_1', 3389, 'rdp'),
(2, 'ubuntu', 'placeholder_encrypted_password_2', 22, 'ssh'),
(3, 'root', 'placeholder_encrypted_password_3', 22, 'ssh'),
(4, 'testuser', 'placeholder_encrypted_password_4', 3389, 'rdp'),
(5, 'docker', 'placeholder_encrypted_password_5', 22, 'ssh')
ON CONFLICT (vm_id) DO NOTHING;

-- Assign VMs to test employee
UPDATE virtual_machines SET assigned_to = (SELECT id FROM users WHERE email = 'employee@company.com' LIMIT 1)
WHERE name IN ('Linux Web Server', 'Windows Dev Server');

-- Insert sample audit log entry
INSERT INTO audit_logs (action, resource_type, resource_id, new_values, ip_address, metadata) VALUES
('SYSTEM_INIT', 'system', 0, '{"message": "Initial system setup completed"}', '127.0.0.1', '{"version": "1.0.0", "setup_date": "2025-06-16"}');
