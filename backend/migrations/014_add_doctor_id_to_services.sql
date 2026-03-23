-- Add doctor_id FK to services so doctors can own/manage their own services
ALTER TABLE services ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(36) REFERENCES doctors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_services_doctor_id ON services(doctor_id);
