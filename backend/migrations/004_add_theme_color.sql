-- Migration: Add theme_color column to tenants table

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#2563EB';
