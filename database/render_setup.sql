-- ============================================================================
-- RENDER DEPLOYMENT DATABASE SETUP SCRIPT FOR SECURE VM PORTAL
-- ============================================================================
-- This script creates the entire database schema for Render PostgreSQL
-- Based on local database analysis
-- Version: 1.0.0
-- Created: 2025-01-17
-- Compatible with: PostgreSQL 12+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
    last_login TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    priority VARCHAR(50) DEFAULT 'medium',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_project_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Virtual machines table
CREATE TABLE virtual_machines (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    os_type VARCHAR(50) NOT NULL,
    os_version VARCHAR(100),
    status VARCHAR(50) DEFAULT 'offline',
    region VARCHAR(100),
    instance_id VARCHAR(255),
    tags JSONB DEFAULT '{}',
    active_sessions_count INTEGER DEFAULT 0,
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
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_user_id INTEGER,
    assigned_user_name VARCHAR(255),
    assigned_user_email VARCHAR(255),
    
    CONSTRAINT virtual_machines_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    project_id INTEGER,
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
    assigned_to INTEGER,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_task_dates CHECK (actual_end_date IS NULL OR actual_start_date IS NULL OR actual_end_date >= actual_start_date),
    CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Work sessions table
CREATE TABLE work_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER,
    project_id INTEGER,
    task_id INTEGER,
    vm_id INTEGER,
    session_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    duration_minutes INTEGER,
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT work_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT work_sessions_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT work_sessions_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT work_sessions_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id)
);

-- Project assignments table
CREATE TABLE project_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(100) DEFAULT 'member',
    
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id),
    CONSTRAINT project_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT project_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT project_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- VM assignments table
CREATE TABLE vm_assignments (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER,
    user_id INTEGER,
    assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    
    CONSTRAINT unique_vm_user_assignment UNIQUE (vm_id, user_id),
    CONSTRAINT vm_assignments_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE CASCADE,
    CONSTRAINT vm_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT vm_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- VM credentials table
CREATE TABLE vm_credentials (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    private_key_encrypted TEXT,
    connection_port INTEGER DEFAULT 22,
    connection_type VARCHAR(10) DEFAULT 'ssh',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_vm_credentials UNIQUE (vm_id),
    CONSTRAINT vm_credentials_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    vm_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    connection_type VARCHAR(10) NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    duration_minutes INTEGER,
    client_ip INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT sessions_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE CASCADE
);

-- Work logs table
CREATE TABLE work_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL,
    vm_id INTEGER NOT NULL,
    session_id INTEGER,
    work_type VARCHAR(20) DEFAULT 'work',
    task_title VARCHAR(255),
    task_description TEXT,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    duration_minutes INTEGER,
    is_billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT work_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT work_logs_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE CASCADE,
    CONSTRAINT work_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- Non-work logs table
CREATE TABLE non_work_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    duration_minutes INTEGER,
    date DATE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT non_work_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Temporary connections table
CREATE TABLE temp_connections (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    vm_id INTEGER,
    user_id INTEGER,
    session_id INTEGER,
    content TEXT NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT temp_connections_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id),
    CONSTRAINT temp_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT temp_connections_session_id_fkey FOREIGN KEY (session_id) REFERENCES work_sessions(id)
);

-- User activity tracking table
CREATE TABLE user_activity_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    task_id INTEGER,
    vm_id INTEGER,
    activity_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    duration_minutes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_activity_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_activity_tracking_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT user_activity_tracking_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    CONSTRAINT user_activity_tracking_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE SET NULL
);

-- VM usage tracking table
CREATE TABLE vm_usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    vm_id INTEGER NOT NULL,
    session_start TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    session_end TIMESTAMP WITHOUT TIME ZONE,
    duration_minutes INTEGER,
    activity_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT vm_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT vm_usage_tracking_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE CASCADE
);

-- User activity summary table
CREATE TABLE user_activity_summary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    total_work_minutes INTEGER DEFAULT 0,
    total_break_minutes INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    productivity_score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_date UNIQUE (user_id, date),
    CONSTRAINT user_activity_summary_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- VM usage summary table
CREATE TABLE vm_usage_summary (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER NOT NULL,
    date DATE NOT NULL,
    total_usage_minutes INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_vm_date UNIQUE (vm_id, date),
    CONSTRAINT vm_usage_summary_vm_id_fkey FOREIGN KEY (vm_id) REFERENCES virtual_machines(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_azure_id ON users(azure_id);

-- Projects indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Virtual machines indexes
CREATE INDEX idx_vms_status ON virtual_machines(status);
CREATE INDEX idx_vms_assigned_user_id ON virtual_machines(assigned_user_id);

-- Tasks indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);

-- Work sessions indexes
CREATE INDEX idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_project_id ON work_sessions(project_id);
CREATE INDEX idx_work_sessions_task_id ON work_sessions(task_id);

-- Project assignments indexes
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);

-- VM assignments indexes
CREATE INDEX idx_vm_assignments_vm_id ON vm_assignments(vm_id);
CREATE INDEX idx_vm_assignments_user_id ON vm_assignments(user_id);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_vm_id ON sessions(vm_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);

-- Work logs indexes
CREATE INDEX idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX idx_work_logs_vm_id ON work_logs(vm_id);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Temp connections indexes
CREATE INDEX idx_temp_connections_token ON temp_connections(token);
CREATE INDEX idx_temp_connections_expires ON temp_connections(expires_at);

-- ============================================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ language 'plpgsql';

-- Function to calculate work session duration
CREATE OR REPLACE FUNCTION calculate_work_session_duration()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$func$ language 'plpgsql';

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_virtual_machines_updated_at 
    BEFORE UPDATE ON virtual_machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at 
    BEFORE UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vm_credentials_updated_at 
    BEFORE UPDATE ON vm_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_logs_updated_at 
    BEFORE UPDATE ON work_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_summary_updated_at 
    BEFORE UPDATE ON user_activity_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vm_usage_summary_updated_at 
    BEFORE UPDATE ON vm_usage_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Duration calculation triggers
CREATE TRIGGER calculate_work_session_duration_trigger
    BEFORE INSERT OR UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION calculate_work_session_duration();

-- ============================================================================
-- INSERT INITIAL DATA
-- ============================================================================

-- Insert admin user
INSERT INTO users (azure_id, email, name, role, is_active) 
VALUES ('f7219976-3d76-499e-aa34-6807c7bbeff1', 'vivin@blumotiv.com', 'Vivin', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample admin user for development
INSERT INTO users (name, email, azure_id, role, is_active) 
VALUES 
  ('System Administrator', 'admin@yourdomain.com', 'azure-admin-id-here', 'admin', true),
  ('Dev Admin', 'dev.admin@yourdomain.com', 'dev-azure-admin-id', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================

SELECT 'Database setup completed successfully!' as message;