-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT FOR SECURE VM PORTAL
-- ============================================================================
-- This script creates the entire database from scratch with all required:
-- - Tables and relationships
-- - Functions and triggers
-- - Indexes for performance
-- - Views for reporting
-- - Sample admin user
-- 
-- Version: 3.0.0
-- Created: 2025-01-27
-- Compatible with: PostgreSQL 12+
-- ============================================================================

-- Connect to the database (assumes secure_vm_portal database exists)
-- If database doesn't exist, create it first:
-- CREATE DATABASE secure_vm_portal;
\c secure_vm_portal;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DROP EXISTING OBJECTS (Clean slate setup)
-- ============================================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS active_sessions CASCADE;
DROP VIEW IF EXISTS user_work_summary CASCADE;
DROP VIEW IF EXISTS vm_usage_summary_view CASCADE;
DROP VIEW IF EXISTS project_summary CASCADE;

-- Drop tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS temp_connections CASCADE;
DROP TABLE IF EXISTS vm_assignments CASCADE;
DROP TABLE IF EXISTS work_sessions CASCADE;
DROP TABLE IF EXISTS non_work_logs CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vm_credentials CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_assignments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS virtual_machines CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS calculate_session_duration() CASCADE;
DROP FUNCTION IF EXISTS calculate_work_log_duration() CASCADE;
DROP FUNCTION IF EXISTS calculate_work_session_duration() CASCADE;
DROP FUNCTION IF EXISTS audit_table_changes() CASCADE;

-- Drop types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vm_status CASCADE;
DROP TYPE IF EXISTS os_type CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS connection_type CASCADE;
DROP TYPE IF EXISTS work_log_type CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;

-- ============================================================================
-- CREATE ENUM TYPES
-- ============================================================================

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
-- CREATE CORE TABLES
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
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(100) DEFAULT 'member',
    
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
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_task_dates CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date)
);

-- VM assignments table
CREATE TABLE vm_assignments (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER REFERENCES virtual_machines(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    
    CONSTRAINT unique_vm_user_assignment UNIQUE (vm_id, user_id)
);

-- Work sessions table
CREATE TABLE work_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    vm_id INTEGER REFERENCES virtual_machines(id),
    session_type VARCHAR(50) NOT NULL, -- 'vm', 'm365', 'personal'
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    reason TEXT, -- for personal computer work
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Temporary connections table for secure file downloads
CREATE TABLE temp_connections (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    vm_id INTEGER REFERENCES virtual_machines(id),
    user_id INTEGER REFERENCES users(id),
    session_id INTEGER REFERENCES work_sessions(id),
    content TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_azure_id ON users(azure_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Virtual machines indexes
CREATE INDEX idx_vms_assigned_user ON virtual_machines(assigned_user_id);
CREATE INDEX idx_vms_status ON virtual_machines(status);
CREATE INDEX idx_vms_os_type ON virtual_machines(os_type);
CREATE INDEX idx_vms_cloud_provider ON virtual_machines(cloud_provider);
CREATE INDEX idx_vms_connection_method ON virtual_machines(connection_method);

-- VM credentials indexes
CREATE INDEX idx_vm_credentials_vm_id ON vm_credentials(vm_id);

-- Sessions indexes
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

-- Projects indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- Project assignments indexes
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_assigned_by ON project_assignments(assigned_by);

-- Tasks indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status_description ON tasks(status) WHERE status_description IS NOT NULL;

-- Work sessions indexes
CREATE INDEX idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_project_id ON work_sessions(project_id);
CREATE INDEX idx_work_sessions_task_id ON work_sessions(task_id);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time);

-- VM assignments indexes
CREATE INDEX idx_vm_assignments_vm ON vm_assignments(vm_id);
CREATE INDEX idx_vm_assignments_user ON vm_assignments(user_id);
CREATE INDEX idx_vm_assignments_assigned_by ON vm_assignments(assigned_by);

-- Temp connections indexes
CREATE INDEX idx_temp_connections_token ON temp_connections(token);
CREATE INDEX idx_temp_connections_expires ON temp_connections(expires_at);

-- ============================================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate work log duration
CREATE OR REPLACE FUNCTION calculate_work_log_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate work session duration
CREATE OR REPLACE FUNCTION calculate_work_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for audit logging
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        timestamp
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)
            ELSE NULL
        END,
        CURRENT_TIMESTAMP
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ language 'plpgsql';

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Updated at triggers
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
-- CREATE VIEWS
-- ============================================================================

-- Active sessions view
CREATE VIEW active_sessions AS
SELECT 
    s.id,
    s.session_id,
    s.user_id,
    u.name as user_name,
    s.vm_id,
    vm.name as vm_name,
    s.status,
    s.connection_type,
    s.start_time,
    s.duration_minutes,
    s.client_ip
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
    COUNT(DISTINCT s.id) as total_sessions,
    COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
    COUNT(DISTINCT DATE(s.start_time)) as active_days,
    AVG(s.duration_minutes) as avg_session_duration
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.email;

-- VM usage summary view
CREATE VIEW vm_usage_summary_view AS
SELECT 
    vm.id as vm_id,
    vm.name as vm_name,
    vm.status,
    vm.os_type,
    COUNT(DISTINCT s.user_id) as unique_users,
    COUNT(s.id) as total_sessions,
    COALESCE(SUM(s.duration_minutes), 0) as total_usage_minutes,
    AVG(s.duration_minutes) as avg_session_duration,
    MAX(s.start_time) as last_used
FROM virtual_machines vm
LEFT JOIN sessions s ON vm.id = s.vm_id
GROUP BY vm.id, vm.name, vm.status, vm.os_type;

-- Project summary view
CREATE VIEW project_summary AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status,
    p.start_date,
    p.end_date,
    COUNT(DISTINCT pa.user_id) as team_size,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT ws.id) as total_work_sessions,
    COALESCE(SUM(ws.duration_minutes), 0) as total_work_minutes
FROM projects p
LEFT JOIN project_assignments pa ON p.id = pa.project_id
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN work_sessions ws ON p.id = ws.project_id
GROUP BY p.id, p.name, p.status, p.start_date, p.end_date;

-- ============================================================================
-- INSERT SAMPLE DATA
-- ============================================================================

-- Insert admin user
INSERT INTO users (azure_id, email, name, role, is_active) 
VALUES ('f7219976-3d76-499e-aa34-6807c7bbeff1', 'vivin@blumotiv.com', 'Vivin', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample admin user for development
INSERT INTO users (name, email, azure_id, role, is_active) 
VALUES 
  ('System Administrator', 'admin@yourdomain.com', 'azure-admin-id-here', 'admin', true),
  ('Dev Admin', 'dev.admin@yourdomain.com', 'dev-azure-admin-id', 'admin', true),
  ('Test Employee', 'employee@yourdomain.com', 'employee-azure-id', 'employee', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Verify table creation
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verify functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Verify triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify views
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Show final user count
SELECT 
    role,
    COUNT(*) as user_count,
    STRING_AGG(name, ', ') as users
FROM users 
GROUP BY role;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

\echo 'Database setup completed successfully!'
\echo 'Tables created, indexes added, functions/triggers installed'
\echo 'Views created for reporting'
\echo 'Sample admin users inserted'
\echo ''
\echo 'Next steps:'
\echo '1. Update admin user emails and Azure IDs'
\echo '2. Add VMs through the admin interface'
\echo '3. Create projects and assign users'
\echo '4. Start the backend server'
\echo ''
\echo 'Admin users:'
SELECT email, role FROM users WHERE role = 'admin'; 