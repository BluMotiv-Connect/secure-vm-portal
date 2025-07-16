-- Fix session duration tracking

-- Ensure sessions table has required columns
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Create function to calculate duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND OLD.end_time IS NULL THEN
        -- Calculate duration in minutes when session ends
        NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS session_duration_trigger ON sessions;
CREATE TRIGGER session_duration_trigger
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_session_duration();

-- Update existing sessions with duration
UPDATE sessions
SET duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time))/60
WHERE end_time IS NOT NULL AND duration_minutes IS NULL; 