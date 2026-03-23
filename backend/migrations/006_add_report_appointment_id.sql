-- Migration: Add appointment_id column to reports table

ALTER TABLE reports ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(36) REFERENCES appointments(id) ON DELETE SET NULL;
