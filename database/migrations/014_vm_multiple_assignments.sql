-- Create vm_user_assignments table for multiple VM assignments
CREATE TABLE IF NOT EXISTS vm_user_assignments (
    id SERIAL PRIMARY KEY,
    vm_id INTEGER NOT NULL REFERENCES virtual_machines(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(vm_id, user_id)
);

-- Copy existing assignments to the new table
INSERT INTO vm_user_assignments (vm_id, user_id)
SELECT id, assigned_user_id
FROM virtual_machines
WHERE assigned_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vm_user_assignments_vm_id ON vm_user_assignments(vm_id);
CREATE INDEX IF NOT EXISTS idx_vm_user_assignments_user_id ON vm_user_assignments(user_id);

-- Remove the old assignment columns (will be handled by the new table)
ALTER TABLE virtual_machines 
  DROP COLUMN IF EXISTS assigned_user_id,
  DROP COLUMN IF EXISTS assigned_user_name,
  DROP COLUMN IF EXISTS assigned_user_email; 