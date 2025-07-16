-- Work logging and time tracking tables

CREATE TYPE work_log_type AS ENUM ('work', 'break', 'meeting', 'training', 'other');

-- Work logs table
CREATE TABLE IF NOT EXISTS work_logs (
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
CREATE TABLE IF NOT EXISTS non_work_logs (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_vm_id ON work_logs(vm_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_session_id ON work_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_start_time ON work_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_work_logs_work_type ON work_logs(work_type);

CREATE INDEX IF NOT EXISTS idx_non_work_logs_user_id ON non_work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_non_work_logs_date ON non_work_logs(date);

-- Create triggers
CREATE TRIGGER update_work_logs_updated_at 
    BEFORE UPDATE ON work_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
