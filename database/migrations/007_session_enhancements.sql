-- Session enhancements and performance optimizations

-- Add additional indexes for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_status_start ON sessions(user_id, status, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_vm_status_start ON sessions(vm_id, status, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time_status ON sessions(start_time, status);

-- Add session metadata GIN index for JSON queries
CREATE INDEX IF NOT EXISTS idx_sessions_metadata_gin ON sessions USING GIN (metadata);

-- Create function to automatically end expired sessions
CREATE OR REPLACE FUNCTION end_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE sessions 
    SET status = 'timeout', 
        end_time = CURRENT_TIMESTAMP,
        metadata = metadata || '{"endReason": "automatic_timeout"}'::jsonb
    WHERE status = 'active' 
      AND start_time < CURRENT_TIMESTAMP - INTERVAL '8 hours';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    DATE(s.start_time) as session_date,
    s.user_id,
    u.name as user_name,
    s.vm_id,
    vm.name as vm_name,
    vm.os_type,
    s.connection_type,
    COUNT(*) as session_count,
    SUM(s.duration_minutes) as total_minutes,
    AVG(s.duration_minutes) as avg_minutes,
    MIN(s.start_time) as first_session,
    MAX(s.start_time) as last_session
FROM sessions s
JOIN users u ON s.user_id = u.id
JOIN virtual_machines vm ON s.vm_id = vm.id
WHERE s.start_time >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(s.start_time), s.user_id, u.name, s.vm_id, vm.name, vm.os_type, s.connection_type;

-- Create function to get user session summary
CREATE OR REPLACE FUNCTION get_user_session_summary(p_user_id INTEGER, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_sessions BIGINT,
    total_minutes BIGINT,
    avg_session_minutes NUMERIC,
    unique_vms BIGINT,
    active_sessions BIGINT,
    last_session TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
        COALESCE(AVG(s.duration_minutes), 0) as avg_session_minutes,
        COUNT(DISTINCT s.vm_id) as unique_vms,
        COUNT(*) FILTER (WHERE s.status = 'active') as active_sessions,
        MAX(s.start_time) as last_session
    FROM sessions s
    WHERE s.user_id = p_user_id
      AND s.start_time >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Create function to get VM session summary
CREATE OR REPLACE FUNCTION get_vm_session_summary(p_vm_id INTEGER, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_sessions BIGINT,
    total_minutes BIGINT,
    avg_session_minutes NUMERIC,
    unique_users BIGINT,
    active_sessions BIGINT,
    last_session TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
        COALESCE(AVG(s.duration_minutes), 0) as avg_session_minutes,
        COUNT(DISTINCT s.user_id) as unique_users,
        COUNT(*) FILTER (WHERE s.status = 'active') as active_sessions,
        MAX(s.start_time) as last_session
    FROM sessions s
    WHERE s.vm_id = p_vm_id
      AND s.start_time >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update session metadata on status change
CREATE OR REPLACE FUNCTION update_session_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Add status change timestamp to metadata
    IF OLD.status != NEW.status THEN
        NEW.metadata = COALESCE(NEW.metadata, '{}'::jsonb) || 
                      jsonb_build_object('statusChanges', 
                        COALESCE(NEW.metadata->'statusChanges', '[]'::jsonb) || 
                        jsonb_build_array(jsonb_build_object(
                          'from', OLD.status,
                          'to', NEW.status,
                          'timestamp', CURRENT_TIMESTAMP
                        ))
                      );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS session_metadata_update ON sessions;
CREATE TRIGGER session_metadata_update
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_session_metadata();

-- Add constraints for data integrity
ALTER TABLE sessions 
ADD CONSTRAINT check_valid_session_status 
CHECK (status IN ('active', 'ended', 'timeout', 'error'));

ALTER TABLE sessions 
ADD CONSTRAINT check_valid_connection_type 
CHECK (connection_type IN ('ssh', 'rdp', 'vnc'));

ALTER TABLE sessions 
ADD CONSTRAINT check_end_time_after_start 
CHECK (end_time IS NULL OR end_time >= start_time);

-- Create materialized view for performance dashboards
CREATE MATERIALIZED VIEW session_daily_stats AS
SELECT 
    DATE(start_time) as date,
    COUNT(*) as total_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT vm_id) as unique_vms,
    SUM(duration_minutes) as total_minutes,
    AVG(duration_minutes) as avg_minutes,
    COUNT(*) FILTER (WHERE connection_type = 'rdp') as rdp_sessions,
    COUNT(*) FILTER (WHERE connection_type = 'ssh') as ssh_sessions,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_sessions
FROM sessions
WHERE start_time >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY DATE(start_time)
ORDER BY date DESC;

-- Create index on the materialized view
CREATE UNIQUE INDEX idx_session_daily_stats_date ON session_daily_stats(date);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_session_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY session_daily_stats;
END;
$$ LANGUAGE plpgsql;