-- Migration: Unlink prescriptions from future/uncompleted appointments

UPDATE prescriptions SET appointment_id = NULL
WHERE appointment_id IN (
  SELECT id FROM appointments
  WHERE status IN ('scheduled', 'confirmed')
  AND start_time > NOW()
);
