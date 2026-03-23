-- Migration: Add profile fields (address, photo_url) to doctors and staff tables

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT;
