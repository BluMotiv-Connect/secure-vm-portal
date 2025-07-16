-- Migration 011: Add status_description column to tasks table
-- This migration adds support for custom status descriptions when task status is 'other'

-- Add status_description column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tasks.status_description IS 'Custom description when status is other or additional status information';

-- Add index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_tasks_status_description ON tasks(status) WHERE status_description IS NOT NULL;

-- Update task_status enum to include 'other' if not already present
-- First check if 'other' value exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'other' AND enumtypid = 'task_status'::regtype) THEN
        ALTER TYPE task_status ADD VALUE 'other';
    END IF;
END
$$; 