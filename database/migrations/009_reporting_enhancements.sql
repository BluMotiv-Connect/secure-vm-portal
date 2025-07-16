-- Reporting enhancements and performance optimizations

-- Create reports table for saving report templates
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('time', 'productivity', 'vmUsage', 'summary')),
    parameters JSONB DEFAULT '{}',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for reports table
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_public ON reports(is_public);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Create trigger for reports updated_at
CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for reporting performance
CREATE MATERIALIZED VIEW reporting_daily_summary AS
SELECT 
    DATE(wl.start_time) as report_date,
    wl.user_id,
    u.name as user_name,
    wl.vm_id,
    vm.name as vm_name,
    vm.os_type,
    wl.work_type,
    COUNT(*) as session_count,
    SUM(wl.duration_minutes) as total_minutes,
    AVG(wl.duration_minutes) as avg_session_minutes,
    MIN(wl.start_time) as first_session,
    MAX(COALESCE(wl.end_time, wl.start_time)) as last_session,
    COUNT(*) FILTER (WHERE wl.is_billable = true) as billable_sessions,
    SUM(wl.duration_minutes) FILTER (WHERE wl.is_billable = true) as billable_minutes,
    COUNT(DISTINCT wl.vm_id) as unique_vms_used
FROM work_logs wl
JOIN users u ON wl.user_id = u.id
JOIN virtual_machines vm ON wl.vm_id = vm.id
WHERE wl.start_time >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE(wl.start_time), wl.user_id, u.name, wl.vm_id, vm.name, vm.os_type, wl.work_type;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_reporting_daily_summary_unique 
ON reporting_daily_summary(report_date, user_id, vm_id, work_type);

-- Create function to refresh reporting views
CREATE OR REPLACE FUNCTION refresh_reporting_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY reporting_daily_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_work_stats;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive reporting function
CREATE OR REPLACE FUNCTION generate_comprehensive_report(
    p_start_date DATE,
    p_end_date DATE,
    p_user_ids INTEGER[] DEFAULT NULL,
    p_vm_ids INTEGER[] DEFAULT NULL,
    p_work_types TEXT[] DEFAULT NULL
)
RETURNS TABLE(
    report_date DATE,
    user_id INTEGER,
    user_name TEXT,
    vm_id INTEGER,
    vm_name TEXT,
    os_type TEXT,
    work_type TEXT,
    session_count BIGINT,
    total_minutes BIGINT,
    avg_session_minutes NUMERIC,
    billable_sessions BIGINT,
    billable_minutes BIGINT,
    efficiency_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rds.report_date,
        rds.user_id,
        rds.user_name,
        rds.vm_id,
        rds.vm_name,
        rds.os_type,
        rds.work_type,
        rds.session_count,
        rds.total_minutes,
        rds.avg_session_minutes,
        rds.billable_sessions,
        rds.billable_minutes,
        CASE 
            WHEN rds.total_minutes > 0 THEN
                ROUND((rds.billable_minutes * 100.0 / rds.total_minutes), 2)
            ELSE 0
        END as efficiency_percentage
    FROM reporting_daily_summary rds
    WHERE rds.report_date >= p_start_date
      AND rds.report_date <= p_end_date
      AND (p_user_ids IS NULL OR rds.user_id = ANY(p_user_ids))
      AND (p_vm_ids IS NULL OR rds.vm_id = ANY(p_vm_ids))
      AND (p_work_types IS NULL OR rds.work_type = ANY(p_work_types))
    ORDER BY rds.report_date DESC, rds.user_name, rds.vm_name, rds.work_type;
END;
$$ LANGUAGE plpgsql;

-- Create function for productivity analytics
CREATE OR REPLACE FUNCTION get_productivity_analytics(
    p_start_date DATE,
    p_end_date DATE,
    p_user_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE(
    user_id INTEGER,
    user_name TEXT,
    active_days BIGINT,
    total_work_minutes BIGINT,
    total_break_minutes BIGINT,
    total_meeting_minutes BIGINT,
    avg_daily_work_minutes NUMERIC,
    productivity_score NUMERIC,
    consistency_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_user_stats AS (
        SELECT 
            rds.user_id,
            rds.user_name,
            rds.report_date,
            SUM(rds.total_minutes) FILTER (WHERE rds.work_type = 'work') as daily_work_minutes,
            SUM(rds.total_minutes) FILTER (WHERE rds.work_type = 'break') as daily_break_minutes,
            SUM(rds.total_minutes) FILTER (WHERE rds.work_type = 'meeting') as daily_meeting_minutes
        FROM reporting_daily_summary rds
        WHERE rds.report_date >= p_start_date
          AND rds.report_date <= p_end_date
          AND (p_user_ids IS NULL OR rds.user_id = ANY(p_user_ids))
        GROUP BY rds.user_id, rds.user_name, rds.report_date
    )
    SELECT 
        dus.user_id,
        dus.user_name,
        COUNT(DISTINCT dus.report_date) as active_days,
        COALESCE(SUM(dus.daily_work_minutes), 0) as total_work_minutes,
        COALESCE(SUM(dus.daily_break_minutes), 0) as total_break_minutes,
        COALESCE(SUM(dus.daily_meeting_minutes), 0) as total_meeting_minutes,
        COALESCE(AVG(dus.daily_work_minutes), 0) as avg_daily_work_minutes,
        CASE 
            WHEN SUM(dus.daily_work_minutes + dus.daily_break_minutes + dus.daily_meeting_minutes) > 0 THEN
                ROUND((SUM(dus.daily_work_minutes) * 100.0 / 
                       SUM(dus.daily_work_minutes + dus.daily_break_minutes + dus.daily_meeting_minutes)), 2)
            ELSE 0
        END as productivity_score,
        CASE 
            WHEN COUNT(DISTINCT dus.report_date) > 1 THEN
                ROUND(100.0 - (STDDEV(dus.daily_work_minutes) * 100.0 / 
                               NULLIF(AVG(dus.daily_work_minutes), 0)), 2)
            ELSE 100
        END as consistency_score
    FROM daily_user_stats dus
    GROUP BY dus.user_id, dus.user_name
    ORDER BY total_work_minutes DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for VM utilization analytics
CREATE OR REPLACE FUNCTION get_vm_utilization_analytics(
    p_start_date DATE,
    p_end_date DATE,
    p_vm_ids INTEGER[] DEFAULT NULL
)
RETURNS TABLE(
    vm_id INTEGER,
    vm_name TEXT,
    os_type TEXT,
    total_usage_minutes BIGINT,
    unique_users BIGINT,
    total_sessions BIGINT,
    avg_session_minutes NUMERIC,
    peak_usage_date DATE,
    utilization_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH vm_daily_stats AS (
        SELECT 
            rds.vm_id,
            rds.vm_name,
            rds.os_type,
            rds.report_date,
            SUM(rds.total_minutes) as daily_usage_minutes,
            COUNT(DISTINCT rds.user_id) as daily_unique_users,
            SUM(rds.session_count) as daily_sessions
        FROM reporting_daily_summary rds
        WHERE rds.report_date >= p_start_date
          AND rds.report_date <= p_end_date
          AND (p_vm_ids IS NULL OR rds.vm_id = ANY(p_vm_ids))
        GROUP BY rds.vm_id, rds.vm_name, rds.os_type, rds.report_date
    ),
    vm_peak_usage AS (
        SELECT 
            vm_id,
            report_date as peak_date,
            daily_usage_minutes,
            ROW_NUMBER() OVER (PARTITION BY vm_id ORDER BY daily_usage_minutes DESC) as rn
        FROM vm_daily_stats
    )
    SELECT 
        vds.vm_id,
        vds.vm_name,
        vds.os_type,
        SUM(vds.daily_usage_minutes) as total_usage_minutes,
        COUNT(DISTINCT vds.daily_unique_users) as unique_users,
        SUM(vds.daily_sessions) as total_sessions,
        COALESCE(AVG(vds.daily_usage_minutes / NULLIF(vds.daily_sessions, 0)), 0) as avg_session_minutes,
        vpu.peak_date as peak_usage_date,
        CASE 
            WHEN COUNT(DISTINCT vds.report_date) > 0 THEN
                ROUND((COUNT(DISTINCT vds.report_date) * 100.0 / 
                       (p_end_date - p_start_date + 1)), 2)
            ELSE 0
        END as utilization_score
    FROM vm_daily_stats vds
    LEFT JOIN vm_peak_usage vpu ON vds.vm_id = vpu.vm_id AND vpu.rn = 1
    GROUP BY vds.vm_id, vds.vm_name, vds.os_type, vpu.peak_date
    ORDER BY total_usage_minutes DESC;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger for reports
CREATE TRIGGER audit_reports_changes
    AFTER INSERT OR UPDATE OR DELETE ON reports
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- Create scheduled job to refresh reporting views (if pg_cron is available)
-- SELECT cron.schedule('refresh-reporting-views', '0 2 * * *', 'SELECT refresh_reporting_views();');
