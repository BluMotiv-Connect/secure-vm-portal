-- Create default admin user
-- This should be run after initial setup to create the first admin user

-- Insert default admin user (replace with actual Azure AD details)
INSERT INTO users (name, email, azure_id, role, is_active) 
VALUES 
  ('System Administrator', 'admin@yourdomain.com', 'azure-admin-id-here', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample admin user for development (remove in production)
INSERT INTO users (name, email, azure_id, role, is_active) 
VALUES 
  ('Dev Admin', 'dev.admin@yourdomain.com', 'dev-azure-admin-id', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Create admin API token for system operations
INSERT INTO api_tokens (user_id, token_name, token_hash, permissions, expires_at)
SELECT 
  u.id,
  'System Admin Token',
  encode(sha256('admin-system-token-change-me'::bytea), 'hex'),
  '["admin", "system"]'::jsonb,
  CURRENT_TIMESTAMP + INTERVAL '1 year'
FROM users u 
WHERE u.email = 'admin@yourdomain.com'
ON CONFLICT (token_name) DO NOTHING;

-- Log admin user creation
INSERT INTO audit_logs (action, resource_type, resource_id, metadata, created_at)
SELECT 
  'ADMIN_USER_CREATED',
  'users',
  u.id,
  jsonb_build_object(
    'email', u.email,
    'role', u.role,
    'created_by', 'system_seed'
  ),
  CURRENT_TIMESTAMP
FROM users u 
WHERE u.email = 'admin@yourdomain.com';

-- Grant admin permissions
UPDATE users 
SET 
  role = 'admin',
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE email IN ('admin@yourdomain.com', 'dev.admin@yourdomain.com');

-- Create default admin preferences
INSERT INTO user_preferences (user_id, preferences)
SELECT 
  u.id,
  jsonb_build_object(
    'theme', 'light',
    'notifications', true,
    'dashboard_layout', 'default',
    'timezone', 'UTC'
  )
FROM users u 
WHERE u.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;
