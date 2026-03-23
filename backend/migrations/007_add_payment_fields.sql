-- Migration: Add payment tracking fields to appointments table

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
