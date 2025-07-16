-- Projects and Tasks Management Tables
-- Migration 010: Adding project management functionality with many-to-many user assignments

-- Create enum for project and task statuses
CREATE TYPE project_status AS ENUM ('active', 'completed', 'on-hold', 'cancelled');
CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_project_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Project assignments junction table (many-to-many)
CREATE TABLE IF NOT EXISTS project_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'member', -- e.g., 'lead', 'member', 'viewer'
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    status task_status DEFAULT 'pending',
    status_description TEXT, -- Description when status is 'other' or custom explanation
    priority task_priority DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    start_date DATE,
    end_date DATE,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    dependencies INTEGER[], -- Array of task IDs this task depends on
    file_links TEXT[], -- Array of file/document links
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_task_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_hours CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    CONSTRAINT valid_actual_hours CHECK (actual_hours IS NULL OR actual_hours >= 0)
);

-- Work sessions table (links work_logs to tasks and projects)
CREATE TABLE IF NOT EXISTS work_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    vm_id INTEGER REFERENCES virtual_machines(id) ON DELETE SET NULL,
    work_log_id INTEGER REFERENCES work_logs(id) ON DELETE SET NULL,
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

-- Project comments/notes table
CREATE TABLE IF NOT EXISTS project_comments (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_by ON project_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_project_id ON work_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_task_id ON work_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_start_time ON work_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_task ON project_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_user ON project_comments(user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at 
    BEFORE UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_comments_updated_at 
    BEFORE UPDATE ON project_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate work session duration
CREATE OR REPLACE FUNCTION calculate_work_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for work session duration calculation
CREATE TRIGGER calculate_work_session_duration_trigger
    BEFORE INSERT OR UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION calculate_work_session_duration();

-- Create function to update task completion percentage based on work sessions
CREATE OR REPLACE FUNCTION update_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- This could be expanded to automatically calculate completion based on estimated vs actual hours
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit triggers for project tables
CREATE TRIGGER audit_projects_changes
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_project_assignments_changes
    AFTER INSERT OR UPDATE OR DELETE ON project_assignments
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_tasks_changes
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_work_sessions_changes
    AFTER INSERT OR UPDATE OR DELETE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Create helpful views
CREATE OR REPLACE VIEW project_summary AS
SELECT 
    p.id,
    p.uuid,
    p.name,
    p.description,
    p.status,
    p.start_date,
    p.end_date,
    p.created_at,
    u.name as created_by_name,
    COUNT(DISTINCT pa.user_id) as assigned_users_count,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in-progress') as in_progress_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
    SUM(ws.duration_minutes) as total_work_minutes,
    COUNT(DISTINCT ws.id) as total_work_sessions
FROM projects p
LEFT JOIN users u ON p.created_by = u.id
LEFT JOIN project_assignments pa ON p.id = pa.project_id
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN work_sessions ws ON p.id = ws.project_id
GROUP BY p.id, p.uuid, p.name, p.description, p.status, p.start_date, p.end_date, p.created_at, u.name;

-- Create view for user project assignments
CREATE OR REPLACE VIEW user_project_assignments AS
SELECT 
    pa.id,
    pa.project_id,
    pa.user_id,
    pa.role,
    pa.assigned_at,
    p.name as project_name,
    p.status as project_status,
    p.start_date,
    p.end_date,
    u.name as user_name,
    u.email as user_email,
    ab.name as assigned_by_name
FROM project_assignments pa
JOIN projects p ON pa.project_id = p.id
JOIN users u ON pa.user_id = u.id
JOIN users ab ON pa.assigned_by = ab.id;

-- Create view for task details with project context
CREATE OR REPLACE VIEW task_details AS
SELECT 
    t.id,
    t.uuid,
    t.task_name,
    t.task_description,
    t.status,
    t.priority,
    t.completion_percentage,
    t.estimated_hours,
    t.actual_hours,
    t.start_date,
    t.end_date,
    t.dependencies,
    t.file_links,
    t.created_at,
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    u.name as assigned_to_name,
    u.email as assigned_to_email,
    c.name as created_by_name,
    COUNT(ws.id) as work_sessions_count,
    SUM(ws.duration_minutes) as total_work_minutes
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assigned_to = u.id
LEFT JOIN users c ON t.created_by = c.id
LEFT JOIN work_sessions ws ON t.id = ws.task_id
GROUP BY t.id, t.uuid, t.task_name, t.task_description, t.status, t.priority, 
         t.completion_percentage, t.estimated_hours, t.actual_hours, t.start_date, 
         t.end_date, t.dependencies, t.file_links, t.created_at, p.id, p.name, 
         p.status, u.name, u.email, c.name;

-- Create function to get user workload
CREATE OR REPLACE FUNCTION get_user_project_workload(p_user_id INTEGER)
RETURNS TABLE(
    active_projects_count BIGINT,
    total_projects_count BIGINT,
    pending_tasks_count BIGINT,
    in_progress_tasks_count BIGINT,
    total_tasks_count BIGINT,
    total_work_hours NUMERIC,
    avg_completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') as active_projects_count,
        COUNT(DISTINCT p.id) as total_projects_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in-progress') as in_progress_tasks_count,
        COUNT(DISTINCT t.id) as total_tasks_count,
        COALESCE(SUM(ws.duration_minutes) / 60.0, 0) as total_work_hours,
        CASE 
            WHEN COUNT(DISTINCT t.id) > 0 THEN
                ROUND(AVG(t.completion_percentage), 2)
            ELSE 0
        END as avg_completion_rate
    FROM project_assignments pa
    JOIN projects p ON pa.project_id = p.id
    LEFT JOIN tasks t ON p.id = t.project_id AND t.assigned_to = p_user_id
    LEFT JOIN work_sessions ws ON p.id = ws.project_id AND ws.user_id = p_user_id
    WHERE pa.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Remove credential columns from virtual_machines table
ALTER TABLE virtual_machines 
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS password;

-- Insert sample data for testing (optional - can be moved to seeds)
-- This creates some basic projects for the admin user

-- Get admin user ID for sample data
DO $$
DECLARE
    admin_user_id INTEGER;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert sample projects
        INSERT INTO projects (name, description, status, start_date, end_date, created_by) VALUES
        ('VM Portal Development', 'Development of the secure VM portal application', 'active', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', admin_user_id),
        ('Security Audit', 'Comprehensive security audit of the VM infrastructure', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', admin_user_id),
        ('Documentation Update', 'Update all system documentation and user guides', 'pending', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '45 days', admin_user_id);
        
        -- Assign projects to admin user
        INSERT INTO project_assignments (project_id, user_id, assigned_by, role)
        SELECT p.id, admin_user_id, admin_user_id, 'lead'
        FROM projects p
        WHERE p.created_by = admin_user_id;
        
        -- Insert sample tasks
        INSERT INTO tasks (project_id, task_name, task_description, status, priority, assigned_to, estimated_hours, start_date, end_date, created_by)
        SELECT 
            p.id,
            task_data.name,
            task_data.desc,
            task_data.status,
            task_data.priority,
            admin_user_id,
            task_data.hours,
            CURRENT_DATE + (task_data.start_offset || ' days')::INTERVAL,
            CURRENT_DATE + (task_data.end_offset || ' days')::INTERVAL,
            admin_user_id
        FROM projects p
        CROSS JOIN (VALUES
            ('Frontend UI Development', 'Develop the React frontend components', 'in-progress'::task_status, 'high'::task_priority, 40, -10, 20),
            ('Backend API Implementation', 'Implement REST API endpoints', 'completed'::task_status, 'high'::task_priority, 60, -20, 10),
            ('Database Schema Design', 'Design and implement database schema', 'completed'::task_status, 'medium'::task_priority, 20, -25, -15),
            ('Testing & QA', 'Comprehensive testing and quality assurance', 'pending'::task_status, 'medium'::task_priority, 30, 15, 45)
        ) as task_data(name, desc, status, priority, hours, start_offset, end_offset)
        WHERE p.name = 'VM Portal Development';
    END IF;
END $$; 