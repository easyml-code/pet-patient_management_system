-- Migration: Add photo_url column to pets table

ALTER TABLE pets ADD COLUMN IF NOT EXISTS photo_url TEXT;
