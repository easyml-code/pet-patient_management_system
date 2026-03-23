-- Migration: Add credential fields to doctors table

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
