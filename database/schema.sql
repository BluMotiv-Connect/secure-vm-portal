-- Complete database schema for Secure VM Portal
-- Version: 1.0.0
-- Created: 2025-06-16

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE vm_status AS ENUM ('online', 'offline', 'maintenance', 'error');
CREATE TYPE os_type AS ENUM ('windows', 'linux', 'macos');
CREATE TYPE session_status AS ENUM ('active', 'ended', 'timeout', 'error');
CREATE TYPE connection_type AS ENUM ('rdp', 'ssh', 'vnc');
CREATE TYPE work_log_type AS ENUM ('work', 'break', 'meeting', 'training', 'other');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    azure_id VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Virtual machines table
CREATE TABLE virtual_machines (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address INET NOT NULL,
    os_type os_type NOT NULL,
    os_version VARCHAR(100),
    status vm_status DEFAULT 'offline',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    region VARCHAR(100),
    instance_id VARCHAR(255),
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_ip_address UNIQUE (ip_address)
);

-- VM credentials table (encrypted storage)
CREATE TABLE vm_credentials (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    private_key_encrypted TEXT,
    connection_port INTEGER DEFAULT 22,
    connection_type connection_type DEFAULT 'ssh',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_vm_credentials UNIQUE (vm_id)
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    status session_status DEFAULT 'active',
    connection_type connection_type NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    client_ip INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work logs table
CREATE TABLE work_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    work_type work_log_type DEFAULT 'work',
    task_title VARCHAR(255),
    task_description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    is_billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Non-work logs table
CREATE TABLE non_work_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX idx_users_azure_id ON users(azure_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_vms_assigned_to ON virtual_machines(assigned_to);
CREATE INDEX idx_vms_status ON virtual_machines(status);
CREATE INDEX idx_vms_os_type ON virtual_machines(os_type);
CREATE INDEX idx_vms_ip_address ON virtual_machines(ip_address);

CREATE INDEX idx_vm_credentials_vm_id ON vm_credentials(vm_id);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_vm_id ON sessions(vm_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);

CREATE INDEX idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX idx_work_logs_vm_id ON work_logs(vm_id);
CREATE INDEX idx_work_logs_session_id ON work_logs(session_id);
CREATE INDEX idx_work_logs_start_time ON work_logs(start_time);
CREATE INDEX idx_work_logs_work_type ON work_logs(work_type);

CREATE INDEX idx_non_work_logs_user_id ON non_work_logs(user_id);
CREATE INDEX idx_non_work_logs_date ON non_work_logs(date);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vms_updated_at 
    BEFORE UPDATE ON virtual_machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vm_credentials_updated_at 
    BEFORE UPDATE ON vm_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_logs_updated_at 
    BEFORE UPDATE ON work_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for session duration calculation
CREATE TRIGGER calculate_session_duration_trigger
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

-- Create function to calculate work log duration
CREATE OR REPLACE FUNCTION calculate_work_log_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for work log duration calculation
CREATE TRIGGER calculate_work_log_duration_trigger
    BEFORE INSERT OR UPDATE ON work_logs
    FOR EACH ROW EXECUTE FUNCTION calculate_work_log_duration();

-- Create trigger for non-work log duration calculation
CREATE TRIGGER calculate_non_work_log_duration_trigger
    BEFORE INSERT OR UPDATE ON non_work_logs
    FOR EACH ROW EXECUTE FUNCTION calculate_work_log_duration();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action, resource_type, resource_id, old_values)
        VALUES (TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values)
        VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action, resource_type, resource_id, new_values)
        VALUES (TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create audit triggers for important tables
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_vms_changes
    AFTER INSERT OR UPDATE OR DELETE ON virtual_machines
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_sessions_changes
    AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Create views for common queries
CREATE VIEW active_sessions AS
SELECT 
    s.id,
    s.session_id,
    s.start_time,
    s.duration_minutes,
    u.name as user_name,
    u.email as user_email,
    vm.name as vm_name,
    vm.ip_address,
    s.connection_type
FROM sessions s
JOIN users u ON s.user_id = u.id
JOIN virtual_machines vm ON s.vm_id = vm.id
WHERE s.status = 'active';

CREATE VIEW user_work_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    COUNT(wl.id) as total_work_sessions,
    SUM(wl.duration_minutes) as total_work_minutes,
    AVG(wl.duration_minutes) as avg_session_minutes,
    DATE(wl.start_time) as work_date
FROM users u
LEFT JOIN work_logs wl ON u.id = wl.user_id
WHERE wl.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.name, u.email, DATE(wl.start_time)
ORDER BY work_date DESC, total_work_minutes DESC;

CREATE VIEW vm_usage_summary AS
SELECT 
    vm.id as vm_id,
    vm.name as vm_name,
    vm.ip_address,
    vm.os_type,
    COUNT(s.id) as total_sessions,
    SUM(s.duration_minutes) as total_usage_minutes,
    AVG(s.duration_minutes) as avg_session_minutes,
    MAX(s.start_time) as last_used
FROM virtual_machines vm
LEFT JOIN sessions s ON vm.id = s.vm_id
WHERE s.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY vm.id, vm.name, vm.ip_address, vm.os_type
ORDER BY total_usage_minutes DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vm_portal_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vm_portal_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vm_portal_user;

-- Insert initial data will be handled by seeds
