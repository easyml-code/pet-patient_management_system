-- Migration: Add consultation fields to prescriptions table

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS lab_advice TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS advice TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_mode VARCHAR(20) DEFAULT 'structured';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS free_text_prescription TEXT;
