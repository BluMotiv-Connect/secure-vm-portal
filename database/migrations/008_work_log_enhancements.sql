-- Work log enhancements and performance optimizations

-- Add additional indexes for work log queries
CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_work_logs_vm_date ON work_logs(vm_id, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_work_logs_type_billable ON work_logs(work_type, is_billable);
CREATE INDEX IF NOT EXISTS idx_work_logs_active ON work_logs(user_id) WHERE end_time IS NULL;

-- Add indexes for non-work logs
CREATE INDEX IF NOT EXISTS idx_non_work_logs_user_date ON non_work_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_non_work_logs_date_range ON non_work_logs(date, start_time);

-- Create function to calculate work efficiency
CREATE OR REPLACE FUNCTION calculate_work_efficiency(p_user_id INTEGER, p_start_date DATE, p_end_date DATE)
RETURNS TABLE(
    work_minutes INTEGER,
    break_minutes INTEGER,
    meeting_minutes INTEGER,
    total_minutes INTEGER,
    efficiency_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'work'), 0)::INTEGER as work_minutes,
        COALESCE(SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'break'), 0)::INTEGER as break_minutes,
        COALESCE(SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'meeting'), 0)::INTEGER as meeting_minutes,
        COALESCE(SUM(wl.duration_minutes), 0)::INTEGER as total_minutes,
        CASE 
            WHEN SUM(wl.duration_minutes) > 0 THEN
                ROUND((SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'work') * 100.0 / SUM(wl.duration_minutes)), 2)
            ELSE 0
        END as efficiency_percentage
    FROM work_logs wl
    WHERE wl.user_id = p_user_id
      AND DATE(wl.start_time) >= p_start_date
      AND DATE(wl.start_time) <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for daily work statistics
CREATE MATERIALIZED VIEW daily_work_stats AS
SELECT 
    DATE(wl.start_time) as work_date,
    wl.user_id,
    u.name as user_name,
    COUNT(*) as total_sessions,
    SUM(wl.duration_minutes) as total_minutes,
    SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'work') as work_minutes,
    SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'break') as break_minutes,
    SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'meeting') as meeting_minutes,
    COUNT(*) FILTER (WHERE wl.is_billable = true) as billable_sessions,
    COUNT(DISTINCT wl.vm_id) as unique_vms,
    MIN(wl.start_time) as first_session,
    MAX(COALESCE(wl.end_time, wl.start_time)) as last_session
FROM work_logs wl
JOIN users u ON wl.user_id = u.id
WHERE wl.start_time >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY DATE(wl.start_time), wl.user_id, u.name;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_daily_work_stats_date_user ON daily_work_stats(work_date, user_id);

-- Create function to refresh work statistics
CREATE OR REPLACE FUNCTION refresh_work_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_work_stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-end expired work sessions
CREATE OR REPLACE FUNCTION auto_end_expired_work_sessions()
RETURNS INTEGER AS $$
DECLARE
    ended_count INTEGER;
BEGIN
    UPDATE work_logs 
    SET end_time = start_time + INTERVAL '8 hours'
    WHERE end_time IS NULL 
      AND start_time < CURRENT_TIMESTAMP - INTERVAL '8 hours';
    
    GET DIAGNOSTICS ended_count = ROW_COUNT;
    
    -- Log the auto-end action
    INSERT INTO audit_logs (action, resource_type, metadata)
    VALUES ('AUTO_END_WORK_SESSIONS', 'work_logs', 
            jsonb_build_object('ended_count', ended_count, 'timestamp', CURRENT_TIMESTAMP));
    
    RETURN ended_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for work log analytics
CREATE OR REPLACE VIEW work_log_analytics AS
SELECT 
    wl.id,
    wl.user_id,
    u.name as user_name,
    wl.vm_id,
    vm.name as vm_name,
    wl.work_type,
    wl.task_title,
    wl.start_time,
    wl.end_time,
    wl.duration_minutes,
    wl.is_billable,
    DATE(wl.start_time) as work_date,
    EXTRACT(HOUR FROM wl.start_time) as start_hour,
    EXTRACT(DOW FROM wl.start_time) as day_of_week,
    CASE 
        WHEN wl.duration_minutes IS NULL THEN 'active'
        WHEN wl.duration_minutes <= 30 THEN 'short'
        WHEN wl.duration_minutes <= 120 THEN 'medium'
        WHEN wl.duration_minutes <= 480 THEN 'long'
        ELSE 'extended'
    END as session_length_category
FROM work_logs wl
JOIN users u ON wl.user_id = u.id
JOIN virtual_machines vm ON wl.vm_id = vm.id;

-- Create function to get user productivity trends
CREATE OR REPLACE FUNCTION get_user_productivity_trends(p_user_id INTEGER, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    total_minutes INTEGER,
    work_minutes INTEGER,
    efficiency_percentage NUMERIC,
    session_count INTEGER,
    avg_session_length NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(wl.start_time) as date,
        COALESCE(SUM(wl.duration_minutes), 0)::INTEGER as total_minutes,
        COALESCE(SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'work'), 0)::INTEGER as work_minutes,
        CASE 
            WHEN SUM(wl.duration_minutes) > 0 THEN
                ROUND((SUM(wl.duration_minutes) FILTER (WHERE wl.work_type = 'work') * 100.0 / SUM(wl.duration_minutes)), 2)
            ELSE 0
        END as efficiency_percentage,
        COUNT(*)::INTEGER as session_count,
        COALESCE(AVG(wl.duration_minutes), 0) as avg_session_length
    FROM work_logs wl
    WHERE wl.user_id = p_user_id
      AND wl.start_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
      AND wl.end_time IS NOT NULL
    GROUP BY DATE(wl.start_time)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Add constraints for data integrity
ALTER TABLE work_logs 
ADD CONSTRAINT check_valid_work_type 
CHECK (work_type IN ('work', 'break', 'meeting', 'training', 'other'));

ALTER TABLE work_logs 
ADD CONSTRAINT check_end_time_after_start 
CHECK (end_time IS NULL OR end_time > start_time);

ALTER TABLE work_logs 
ADD CONSTRAINT check_reasonable_duration 
CHECK (duration_minutes IS NULL OR duration_minutes <= 720); -- Max 12 hours

ALTER TABLE non_work_logs 
ADD CONSTRAINT check_non_work_end_time_after_start 
CHECK (end_time IS NULL OR end_time > start_time);

ALTER TABLE non_work_logs 
ADD CONSTRAINT check_non_work_reasonable_duration 
CHECK (duration_minutes IS NULL OR duration_minutes <= 480); -- Max 8 hours

-- Create trigger to prevent overlapping work sessions
CREATE OR REPLACE FUNCTION prevent_overlapping_work_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping active sessions
    IF NEW.end_time IS NULL THEN
        IF EXISTS (
            SELECT 1 FROM work_logs 
            WHERE user_id = NEW.user_id 
              AND id != COALESCE(NEW.id, 0)
              AND end_time IS NULL
        ) THEN
            RAISE EXCEPTION 'User already has an active work session';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_overlapping_sessions ON work_logs;
CREATE TRIGGER prevent_overlapping_sessions
    BEFORE INSERT OR UPDATE ON work_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_overlapping_work_sessions();

-- Create function to generate work summary
CREATE OR REPLACE FUNCTION generate_work_summary(p_user_id INTEGER, p_start_date DATE, p_end_date DATE)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalSessions', COUNT(*),
        'totalMinutes', COALESCE(SUM(duration_minutes), 0),
        'workMinutes', COALESCE(SUM(duration_minutes) FILTER (WHERE work_type = 'work'), 0),
        'breakMinutes', COALESCE(SUM(duration_minutes) FILTER (WHERE work_type = 'break'), 0),
        'meetingMinutes', COALESCE(SUM(duration_minutes) FILTER (WHERE work_type = 'meeting'), 0),
        'billableMinutes', COALESCE(SUM(duration_minutes) FILTER (WHERE is_billable = true), 0),
        'uniqueVMs', COUNT(DISTINCT vm_id),
        'activeDays', COUNT(DISTINCT DATE(start_time)),
        'avgSessionLength', COALESCE(AVG(duration_minutes), 0),
        'efficiency', CASE 
            WHEN SUM(duration_minutes) > 0 THEN
                ROUND((SUM(duration_minutes) FILTER (WHERE work_type = 'work') * 100.0 / SUM(duration_minutes)), 2)
            ELSE 0
        END
    ) INTO result
    FROM work_logs
    WHERE user_id = p_user_id
      AND DATE(start_time) >= p_start_date
      AND DATE(start_time) <= p_end_date
      AND end_time IS NOT NULL;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
