-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_patients_tenant_phone ON patients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_availability_doctor_day ON availability(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_start ON appointments(doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_doctor_start ON appointments(tenant_id, doctor_id, start_time);
CREATE INDEX IF NOT EXISTS idx_services_tenant_doctor ON services(tenant_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON services(tenant_id, is_active);
