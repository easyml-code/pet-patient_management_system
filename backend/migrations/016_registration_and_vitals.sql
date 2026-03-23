-- Migration 016: Add registration_status to patients + vitals to appointments

-- Patient registration status (registered = full registration, pending = quick-booked)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'registered';
CREATE INDEX IF NOT EXISTS idx_patients_registration_status ON patients(tenant_id, registration_status);

-- Appointment vitals (recorded by staff before doctor initiates)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS vitals JSON;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS vitals_recorded_by VARCHAR(36) REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS vitals_recorded_at TIMESTAMPTZ;
