-- VM enhancements and additional indexes

-- Add indexes for better VM query performance
CREATE INDEX IF NOT EXISTS idx_vms_status_assigned ON virtual_machines(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_vms_os_type_status ON virtual_machines(os_type, status);
CREATE INDEX IF NOT EXISTS idx_vms_region ON virtual_machines(region);
CREATE INDEX IF NOT EXISTS idx_vms_instance_id ON virtual_machines(instance_id);

-- Add GIN index for tags JSONB column
CREATE INDEX IF NOT EXISTS idx_vms_tags_gin ON virtual_machines USING GIN (tags);

-- Add indexes for VM credentials
CREATE INDEX IF NOT EXISTS idx_vm_credentials_connection_type ON vm_credentials(connection_type);

-- Create function to update VM status based on connectivity
CREATE OR REPLACE FUNCTION update_vm_status_from_connectivity()
RETURNS TRIGGER AS $$
BEGIN
    -- This function could be used to automatically update VM status
    -- based on connectivity checks or other external factors
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create view for VM summary with usage statistics
CREATE OR REPLACE VIEW vm_summary AS
SELECT 
    vm.id,
    vm.name,
    vm.ip_address,
    vm.os_type,
    vm.status,
    vm.assigned_to,
    u.name as assigned_user_name,
    u.email as assigned_user_email,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_sessions,
    COUNT(DISTINCT s.id) as total_sessions,
    SUM(s.duration_minutes) as total_usage_minutes,
    MAX(s.start_time) as last_used,
    vc.connection_type,
    vc.connection_port
FROM virtual_machines vm
LEFT JOIN users u ON vm.assigned_to = u.id
LEFT JOIN sessions s ON vm.id = s.vm_id
LEFT JOIN vm_credentials vc ON vm.id = vc.vm_id
GROUP BY vm.id, u.name, u.email, vc.connection_type, vc.connection_port;

-- Create function to get VM availability
CREATE OR REPLACE FUNCTION is_vm_available(vm_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    vm_status TEXT;
    active_sessions INTEGER;
BEGIN
    SELECT status INTO vm_status FROM virtual_machines WHERE id = vm_id;
    
    IF vm_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF vm_status != 'online' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if VM has too many active sessions (optional limit)
    SELECT COUNT(*) INTO active_sessions 
    FROM sessions 
    WHERE vm_id = vm_id AND status = 'active';
    
    -- Allow unlimited sessions for now, but this could be configurable
    RETURN TRUE;
END;
$$ language 'plpgsql';

-- Create function to get VM usage statistics
CREATE OR REPLACE FUNCTION get_vm_usage_stats(vm_id INTEGER, days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_sessions BIGINT,
    total_minutes BIGINT,
    avg_session_minutes NUMERIC,
    unique_users BIGINT,
    last_used TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(s.id) as total_sessions,
        COALESCE(SUM(s.duration_minutes), 0) as total_minutes,
        COALESCE(AVG(s.duration_minutes), 0) as avg_session_minutes,
        COUNT(DISTINCT s.user_id) as unique_users,
        MAX(s.start_time) as last_used
    FROM sessions s
    WHERE s.vm_id = get_vm_usage_stats.vm_id
      AND s.start_time >= CURRENT_DATE - INTERVAL '1 day' * days;
END;
$$ language 'plpgsql';

-- Update the audit trigger to include VM-specific events
CREATE OR REPLACE FUNCTION audit_vm_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log specific VM status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values, metadata)
            VALUES ('VM_STATUS_CHANGED', 'virtual_machines', NEW.id, 
                   json_build_object('status', OLD.status),
                   json_build_object('status', NEW.status),
                   json_build_object('vm_name', NEW.name, 'ip_address', NEW.ip_address));
        END IF;
        
        -- Log VM assignment changes
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO audit_logs (action, resource_type, resource_id, old_values, new_values, metadata)
            VALUES ('VM_ASSIGNMENT_CHANGED', 'virtual_machines', NEW.id,
                   json_build_object('assigned_to', OLD.assigned_to),
                   json_build_object('assigned_to', NEW.assigned_to),
                   json_build_object('vm_name', NEW.name, 'ip_address', NEW.ip_address));
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create the VM-specific audit trigger
DROP TRIGGER IF EXISTS audit_vm_specific_changes ON virtual_machines;
CREATE TRIGGER audit_vm_specific_changes
    AFTER UPDATE ON virtual_machines
    FOR EACH ROW EXECUTE FUNCTION audit_vm_changes();

-- Add some useful constraints
ALTER TABLE virtual_machines 
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('online', 'offline', 'maintenance', 'error'));

ALTER TABLE vm_credentials 
ADD CONSTRAINT check_valid_connection_type 
CHECK (connection_type IN ('ssh', 'rdp', 'vnc'));

ALTER TABLE vm_credentials 
ADD CONSTRAINT check_valid_port_range 
CHECK (connection_port > 0 AND connection_port <= 65535);

-- Create indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_sessions_vm_status ON sessions(vm_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time_vm ON sessions(start_time, vm_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_vm_date ON work_logs(vm_id, DATE(start_time));
