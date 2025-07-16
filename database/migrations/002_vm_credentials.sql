-- VM credentials and session management tables

CREATE TYPE connection_type AS ENUM ('rdp', 'ssh', 'vnc');
CREATE TYPE session_status AS ENUM ('active', 'ended', 'timeout', 'error');

-- VM credentials table (encrypted storage)
CREATE TABLE IF NOT EXISTS vm_credentials (
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
CREATE TABLE IF NOT EXISTS sessions (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vm_credentials_vm_id ON vm_credentials(vm_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_vm_id ON sessions(vm_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);

-- Create triggers
CREATE TRIGGER update_vm_credentials_updated_at 
    BEFORE UPDATE ON vm_credentials
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
