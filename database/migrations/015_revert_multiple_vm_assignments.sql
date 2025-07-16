-- Drop the vm_user_assignments table
DROP TABLE IF EXISTS vm_user_assignments;

-- Add the old columns back to the virtual_machines table
ALTER TABLE virtual_machines
ADD COLUMN assigned_user_id INTEGER REFERENCES users(id),
ADD COLUMN assigned_user_name VARCHAR(255),
ADD COLUMN assigned_user_email VARCHAR(255);
