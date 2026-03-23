-- Add photo_url to users table (for admin users who don't have doctor/staff records)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
