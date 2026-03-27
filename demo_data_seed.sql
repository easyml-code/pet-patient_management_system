-- Step 1: Get your tenant ID
-- Run this first: SELECT id, name FROM tenants;

-- Step 2: Set your tenant_id (replace the UUID below)
-- After running Step 1, replace '<YOUR_TENANT_ID>' with the actual value

DO $$
DECLARE
    t_id TEXT;
BEGIN
    -- Get the first tenant (your clinic)
    SELECT id INTO t_id FROM tenants LIMIT 1;
    
    IF t_id IS NULL THEN
        RAISE EXCEPTION 'No tenant found. Please sign up via the app first.';
    END IF;

    -- ─── DOCTORS ───────────────────────────────────────
    INSERT INTO doctors (id, tenant_id, full_name, specialization, email, phone, color, is_active) VALUES
    (gen_random_uuid()::text, t_id, 'Dr. Sarah Chen', 'General Practice', 'sarah.chen@clinic.com', '+1-555-0101', '#2563EB', true),
    (gen_random_uuid()::text, t_id, 'Dr. James Wilson', 'Pediatrics', 'james.wilson@clinic.com', '+1-555-0102', '#10B981', true),
    (gen_random_uuid()::text, t_id, 'Dr. Priya Sharma', 'Dermatology', 'priya.sharma@clinic.com', '+1-555-0103', '#F59E0B', true),
    (gen_random_uuid()::text, t_id, 'Dr. Michael Brown', 'Dental', 'michael.brown@clinic.com', '+1-555-0104', '#8B5CF6', true);

    -- ─── STAFF ─────────────────────────────────────────
    INSERT INTO staff (id, tenant_id, full_name, role, email, phone, is_active) VALUES
    (gen_random_uuid()::text, t_id, 'Emily Johnson', 'Receptionist', 'emily@clinic.com', '+1-555-0201', true),
    (gen_random_uuid()::text, t_id, 'David Park', 'Nurse', 'david@clinic.com', '+1-555-0202', true),
    (gen_random_uuid()::text, t_id, 'Lisa Martinez', 'Lab Technician', 'lisa@clinic.com', '+1-555-0203', true);

    -- ─── PATIENTS ──────────────────────────────────────
    INSERT INTO patients (id, tenant_id, full_name, email, phone, gender, notes) VALUES
    (gen_random_uuid()::text, t_id, 'Alice Thompson', 'alice@email.com', '+1-555-1001', 'Female', 'Regular checkup patient. No allergies.'),
    (gen_random_uuid()::text, t_id, 'Bob Martinez', 'bob@email.com', '+1-555-1002', 'Male', 'Diabetes management. Takes metformin.'),
    (gen_random_uuid()::text, t_id, 'Carol White', 'carol@email.com', '+1-555-1003', 'Female', 'Seasonal allergies. Prescribed antihistamines.'),
    (gen_random_uuid()::text, t_id, 'Daniel Kim', 'daniel@email.com', '+1-555-1004', 'Male', 'Sports injury follow-up.'),
    (gen_random_uuid()::text, t_id, 'Eva Rodriguez', 'eva@email.com', '+1-555-1005', 'Female', 'Prenatal care.'),
    (gen_random_uuid()::text, t_id, 'Frank Lee', 'frank@email.com', '+1-555-1006', 'Male', 'Annual wellness exam.'),
    (gen_random_uuid()::text, t_id, 'Grace Williams', 'grace@email.com', '+1-555-1007', 'Female', 'Skin consultation.'),
    (gen_random_uuid()::text, t_id, 'Henry Davis', 'henry@email.com', '+1-555-1008', 'Male', 'Dental cleaning scheduled.');

    -- ─── SERVICES ──────────────────────────────────────
    INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, color, is_active) VALUES
    (gen_random_uuid()::text, t_id, 'General Consultation', 'Standard doctor consultation', 30, 75.00, '#2563EB', true),
    (gen_random_uuid()::text, t_id, 'Follow-up Visit', 'Follow-up from previous visit', 15, 45.00, '#10B981', true),
    (gen_random_uuid()::text, t_id, 'Annual Physical Exam', 'Comprehensive annual check-up', 60, 150.00, '#8B5CF6', true),
    (gen_random_uuid()::text, t_id, 'Vaccination', 'Standard vaccination administration', 15, 35.00, '#F59E0B', true),
    (gen_random_uuid()::text, t_id, 'Lab Work', 'Blood test and lab panel', 30, 95.00, '#EC4899', true),
    (gen_random_uuid()::text, t_id, 'Dental Cleaning', 'Professional dental cleaning', 45, 120.00, '#06B6D4', true),
    (gen_random_uuid()::text, t_id, 'Skin Screening', 'Dermatology screening', 30, 85.00, '#D97706', true);

    -- ─── AVAILABILITY (weekly schedule per doctor) ─────
    -- Doctor 1: Mon-Fri 9am-5pm
    INSERT INTO availability (id, tenant_id, doctor_id, day_of_week, start_time, end_time, is_available)
    SELECT gen_random_uuid()::text, t_id, d.id, dow.d, '09:00', '17:00', true
    FROM doctors d, generate_series(0, 4) AS dow(d)
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Sarah Chen';

    -- Doctor 2: Mon-Thu 8am-4pm
    INSERT INTO availability (id, tenant_id, doctor_id, day_of_week, start_time, end_time, is_available)
    SELECT gen_random_uuid()::text, t_id, d.id, dow.d, '08:00', '16:00', true
    FROM doctors d, generate_series(0, 3) AS dow(d)
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. James Wilson';

    -- Doctor 3: Tue-Sat 10am-6pm
    INSERT INTO availability (id, tenant_id, doctor_id, day_of_week, start_time, end_time, is_available)
    SELECT gen_random_uuid()::text, t_id, d.id, dow.d, '10:00', '18:00', true
    FROM doctors d, generate_series(1, 5) AS dow(d)
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Priya Sharma';

    -- Doctor 4: Mon-Fri 9am-5pm
    INSERT INTO availability (id, tenant_id, doctor_id, day_of_week, start_time, end_time, is_available)
    SELECT gen_random_uuid()::text, t_id, d.id, dow.d, '09:00', '17:00', true
    FROM doctors d, generate_series(0, 4) AS dow(d)
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Michael Brown';

    -- ─── APPOINTMENTS (today and recent) ───────────────
    -- Today's appointments
    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE + '09:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE + '09:30'::time) AT TIME ZONE 'UTC',
        'scheduled', 'Regular checkup'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Sarah Chen'
    AND p.tenant_id = t_id AND p.full_name = 'Alice Thompson'
    AND s.tenant_id = t_id AND s.name = 'General Consultation';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE + '10:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE + '10:30'::time) AT TIME ZONE 'UTC',
        'confirmed', 'Follow-up on blood work'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Sarah Chen'
    AND p.tenant_id = t_id AND p.full_name = 'Bob Martinez'
    AND s.tenant_id = t_id AND s.name = 'Follow-up Visit';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE + '11:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE + '12:00'::time) AT TIME ZONE 'UTC',
        'scheduled', 'Annual physical'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. James Wilson'
    AND p.tenant_id = t_id AND p.full_name = 'Daniel Kim'
    AND s.tenant_id = t_id AND s.name = 'Annual Physical Exam';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE + '14:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE + '14:30'::time) AT TIME ZONE 'UTC',
        'completed', 'Skin check'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Priya Sharma'
    AND p.tenant_id = t_id AND p.full_name = 'Grace Williams'
    AND s.tenant_id = t_id AND s.name = 'Skin Screening';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE + '15:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE + '15:45'::time) AT TIME ZONE 'UTC',
        'scheduled', 'Dental cleaning'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Michael Brown'
    AND p.tenant_id = t_id AND p.full_name = 'Henry Davis'
    AND s.tenant_id = t_id AND s.name = 'Dental Cleaning';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE + '08:30'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE + '09:00'::time) AT TIME ZONE 'UTC',
        'no_show', 'Did not show up'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. James Wilson'
    AND p.tenant_id = t_id AND p.full_name = 'Frank Lee'
    AND s.tenant_id = t_id AND s.name = 'Follow-up Visit';

    -- Yesterday's appointments (historical data)
    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE - 1 + '09:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE - 1 + '09:30'::time) AT TIME ZONE 'UTC',
        'completed', 'Completed visit'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Sarah Chen'
    AND p.tenant_id = t_id AND p.full_name = 'Carol White'
    AND s.tenant_id = t_id AND s.name = 'General Consultation';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE - 1 + '14:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE - 1 + '14:15'::time) AT TIME ZONE 'UTC',
        'completed', 'Flu shot administered'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. James Wilson'
    AND p.tenant_id = t_id AND p.full_name = 'Eva Rodriguez'
    AND s.tenant_id = t_id AND s.name = 'Vaccination';

    INSERT INTO appointments (id, tenant_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes)
    SELECT 
        gen_random_uuid()::text, t_id, d.id, p.id, s.id,
        (CURRENT_DATE - 2 + '10:00'::time) AT TIME ZONE 'UTC',
        (CURRENT_DATE - 2 + '10:30'::time) AT TIME ZONE 'UTC',
        'cancelled', 'Patient cancelled'
    FROM doctors d, patients p, services s
    WHERE d.tenant_id = t_id AND d.full_name = 'Dr. Priya Sharma'
    AND p.tenant_id = t_id AND p.full_name = 'Alice Thompson'
    AND s.tenant_id = t_id AND s.name = 'Skin Screening';

    -- ─── NOTIFICATIONS ─────────────────────────────────
    INSERT INTO notifications (id, tenant_id, type, title, message, recipient_type, status, is_read) VALUES
    (gen_random_uuid()::text, t_id, 'appointment_booked', 'New Appointment Booked', 'Alice Thompson booked a General Consultation with Dr. Sarah Chen for today at 9:00 AM', 'doctor', 'sent', false),
    (gen_random_uuid()::text, t_id, 'appointment_booked', 'New Appointment Booked', 'Bob Martinez booked a Follow-up Visit with Dr. Sarah Chen for today at 10:00 AM', 'doctor', 'sent', false),
    (gen_random_uuid()::text, t_id, 'appointment_completed', 'Appointment Completed', 'Grace Williams completed Skin Screening with Dr. Priya Sharma', 'staff', 'sent', true),
    (gen_random_uuid()::text, t_id, 'appointment_no_show', 'No-Show Alert', 'Frank Lee did not show up for Follow-up Visit with Dr. James Wilson', 'staff', 'sent', false),
    (gen_random_uuid()::text, t_id, 'appointment_cancelled', 'Appointment Cancelled', 'Alice Thompson cancelled Skin Screening with Dr. Priya Sharma', 'staff', 'sent', true);

    RAISE NOTICE 'Demo data seeded successfully for tenant: %', t_id;
END $$;

-- ─── VERIFY ────────────────────────────────────────
SELECT 'Doctors' as entity, count(*) FROM doctors
UNION ALL SELECT 'Staff', count(*) FROM staff  
UNION ALL SELECT 'Patients', count(*) FROM patients
UNION ALL SELECT 'Services', count(*) FROM services
UNION ALL SELECT 'Availability', count(*) FROM availability
UNION ALL SELECT 'Appointments', count(*) FROM appointments
UNION ALL SELECT 'Notifications', count(*) FROM notifications;
