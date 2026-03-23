-- Add is_admin flag for multi-role support (e.g. doctor + admin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Existing admin-role users should have the flag set
UPDATE users SET is_admin = TRUE WHERE role = 'admin';
