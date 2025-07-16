-- Complete Database Setup Script for Secure VM Portal
-- This script creates the database from scratch with all required tables, functions, triggers, and views
-- Version: 2.0.0
-- Created: 2025-01-27

-- Drop database if exists and recreate (CAREFUL: This will delete all data!)
-- DROP DATABASE IF EXISTS secure_vm_portal;
-- CREATE DATABASE secure_vm_portal;

-- Connect to the database
\c secure_vm_portal;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing types if they exist to avoid conflicts
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vm_status CASCADE;
DROP TYPE IF EXISTS os_type CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS connection_type CASCADE;
DROP TYPE IF EXISTS work_log_type CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE vm_status AS ENUM ('online', 'offline', 'maintenance', 'error');
CREATE TYPE os_type AS ENUM ('windows', 'linux', 'macos');
CREATE TYPE session_status AS ENUM ('active', 'ended', 'timeout', 'error');
CREATE TYPE connection_type AS ENUM ('rdp', 'ssh', 'vnc');
CREATE TYPE work_log_type AS ENUM ('work', 'break', 'meeting', 'training', 'other');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'on-hold', 'cancelled');
CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed', 'blocked', 'other');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    azure_id VARCHAR(255) UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
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
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    os_type VARCHAR(50) NOT NULL,
    os_version VARCHAR(100),
    status VARCHAR(50) DEFAULT 'offline',
    region VARCHAR(100),
    instance_id VARCHAR(255),
    tags JSONB DEFAULT '{}',
    assigned_user_name VARCHAR(255),
    assigned_user_email VARCHAR(255),
    active_sessions_count INTEGER DEFAULT 0,
    assigned_user_id INTEGER REFERENCES users(id),
    cloud_provider VARCHAR(50) DEFAULT 'azure',
    connection_method VARCHAR(50) DEFAULT 'bastion',
    subscription_id VARCHAR(255),
    resource_group VARCHAR(255),
    vm_name VARCHAR(255),
    account_id VARCHAR(255),
    key_pair_name VARCHAR(255),
    security_group_id VARCHAR(255),
    zone VARCHAR(100),
    project_id VARCHAR(255),
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

-- ============================================================================
-- PROJECT MANAGEMENT TABLES
-- ============================================================================

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    priority VARCHAR(50) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_project_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Project assignments junction table (many-to-many)
CREATE TABLE project_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'member',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    project_outcome_id VARCHAR(100),
    task_name VARCHAR(255) NOT NULL,
    dependency VARCHAR(255),
    proposed_start_date DATE,
    actual_start_date DATE,
    proposed_end_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    status_description TEXT,
    file_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VM assignments table
CREATE TABLE vm_assignments (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_vm_user UNIQUE (vm_id, user_id)
);

-- Work sessions table (enhanced version that works with current system)
CREATE TABLE work_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    vm_id INTEGER REFERENCES virtual_machines(id) ON DELETE SET NULL,
    session_name VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    is_billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_session_dates CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Temporary connections table
CREATE TABLE temp_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    connection_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Summary tables for reporting
CREATE TABLE user_activity_summary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_work_minutes INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

CREATE TABLE vm_usage_summary (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_usage_minutes INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_vm_date UNIQUE (vm_id, date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_azure_id ON users(azure_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- VM indexes
CREATE INDEX idx_vms_assigned_user ON virtual_machines(assigned_user_id);
CREATE INDEX idx_vms_status ON virtual_machines(status);
CREATE INDEX idx_vms_os_type ON virtual_machines(os_type);
CREATE INDEX idx_vms_cloud_provider ON virtual_machines(cloud_provider);
CREATE INDEX idx_vms_connection_method ON virtual_machines(connection_method);

-- VM credentials indexes
CREATE INDEX idx_vm_credentials_vm_id ON vm_credentials(vm_id);

-- Session indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_vm_id ON sessions(vm_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);

-- Work logs indexes
CREATE INDEX idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX idx_work_logs_vm_id ON work_logs(vm_id);
CREATE INDEX idx_work_logs_session_id ON work_logs(session_id);
CREATE INDEX idx_work_logs_start_time ON work_logs(start_time);
CREATE INDEX idx_work_logs_work_type ON work_logs(work_type);

-- Non-work logs indexes
CREATE INDEX idx_non_work_logs_user_id ON non_work_logs(user_id);
CREATE INDEX idx_non_work_logs_date ON non_work_logs(date);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Project indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- Project assignment indexes
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_assigned_by ON project_assignments(assigned_by);

-- Task indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Work session indexes
CREATE INDEX idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_project_id ON work_sessions(project_id);
CREATE INDEX idx_work_sessions_task_id ON work_sessions(task_id);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time);

-- VM assignment indexes
CREATE INDEX idx_vm_assignments_vm ON vm_assignments(vm_id);
CREATE INDEX idx_vm_assignments_user ON vm_assignments(user_id);
CREATE INDEX idx_vm_assignments_assigned_by ON vm_assignments(assigned_by);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Duration calculation functions
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION calculate_work_log_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION calculate_work_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Audit logging function
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

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
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

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at 
    BEFORE UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_summary_updated_at 
    BEFORE UPDATE ON user_activity_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vm_usage_summary_updated_at 
    BEFORE UPDATE ON vm_usage_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Duration calculation triggers
CREATE TRIGGER calculate_session_duration_trigger
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();

CREATE TRIGGER calculate_work_log_duration_trigger
    BEFORE INSERT OR UPDATE ON work_logs
    FOR EACH ROW EXECUTE FUNCTION calculate_work_log_duration();

CREATE TRIGGER calculate_non_work_log_duration_trigger
    BEFORE INSERT OR UPDATE ON non_work_logs
    FOR EACH ROW EXECUTE FUNCTION calculate_work_log_duration();

CREATE TRIGGER calculate_work_session_duration_trigger
    BEFORE INSERT OR UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION calculate_work_session_duration();

-- Audit triggers
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_vms_changes
    AFTER INSERT OR UPDATE OR DELETE ON virtual_machines
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_sessions_changes
    AFTER INSERT OR UPDATE OR DELETE ON sessions
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_projects_changes
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_tasks_changes
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active sessions view
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

-- User work summary view
CREATE VIEW user_work_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    COUNT(ws.id) as total_work_sessions,
    SUM(ws.duration_minutes) as total_work_minutes,
    AVG(ws.duration_minutes) as avg_session_minutes,
    DATE(ws.start_time) as work_date
FROM users u
LEFT JOIN work_sessions ws ON u.id = ws.user_id
WHERE ws.start_time >= CURRENT_DATE - INTERVAL '30 days' OR ws.start_time IS NULL
GROUP BY u.id, u.name, u.email, DATE(ws.start_time)
ORDER BY work_date DESC, total_work_minutes DESC;

-- VM usage summary view
CREATE VIEW vm_usage_summary_view AS
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
WHERE s.start_time >= CURRENT_DATE - INTERVAL '30 days' OR s.start_time IS NULL
GROUP BY vm.id, vm.name, vm.ip_address, vm.os_type
ORDER BY total_usage_minutes DESC;

-- Project summary view
CREATE VIEW project_summary AS
SELECT 
    p.id,
    p.uuid,
    p.name,
    p.description,
    p.status,
    p.start_date,
    p.end_date,
    p.created_at,
    COUNT(DISTINCT pa.user_id) as assigned_users_count,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in-progress') as in_progress_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
    SUM(ws.duration_minutes) as total_work_minutes
FROM projects p
LEFT JOIN project_assignments pa ON p.id = pa.project_id
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN work_sessions ws ON p.id = ws.project_id
GROUP BY p.id, p.uuid, p.name, p.description, p.status, p.start_date, p.end_date, p.created_at;

-- ============================================================================
-- INITIAL DATA (Optional - uncomment if needed)
-- ============================================================================

-- Create default admin user (uncomment and modify as needed)
-- INSERT INTO users (name, email, azure_id, role) 
-- VALUES ('Admin User', 'admin@company.com', 'admin-azure-id', 'admin');

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Display completion message
SELECT 'Database setup completed successfully! All tables, indexes, triggers, and views have been created.' as status;