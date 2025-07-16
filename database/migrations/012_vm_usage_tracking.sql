-- Add VM usage tracking enhancements

-- Add detailed tracking columns to sessions table
ALTER TABLE sessions
ADD COLUMN start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN duration_minutes INTEGER;

-- Create VM usage summary table
CREATE TABLE vm_usage_summary (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER REFERENCES virtual_machines(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_sessions INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_vm_usage_vm_user ON vm_usage_summary(vm_id, user_id);

-- Create function to update vm_usage_summary
CREATE OR REPLACE FUNCTION update_vm_usage_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        -- Calculate duration when session ends
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/60;
        
        -- Update or insert into summary table
        INSERT INTO vm_usage_summary (vm_id, user_id, total_sessions, total_duration_minutes, last_used_at)
        VALUES (NEW.vm_id, NEW.user_id, 1, NEW.duration_minutes, NEW.end_time)
        ON CONFLICT (vm_id, user_id) DO UPDATE
        SET total_sessions = vm_usage_summary.total_sessions + 1,
            total_duration_minutes = vm_usage_summary.total_duration_minutes + EXCLUDED.total_duration_minutes,
            last_used_at = EXCLUDED.last_used_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session updates
CREATE TRIGGER session_end_trigger
AFTER UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_vm_usage_summary(); 