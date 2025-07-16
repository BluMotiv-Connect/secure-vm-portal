-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    connection_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id and vm_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_vm_id ON sessions(vm_id);

-- Create function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL THEN
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate duration when session ends
CREATE TRIGGER update_session_duration
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    WHEN (OLD.end_time IS NULL AND NEW.end_time IS NOT NULL)
    EXECUTE FUNCTION calculate_session_duration();

-- Add foreign key constraints
ALTER TABLE sessions
    ADD CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

ALTER TABLE sessions
    ADD CONSTRAINT fk_sessions_vm
    FOREIGN KEY (vm_id)
    REFERENCES virtual_machines(id)
    ON DELETE CASCADE; 