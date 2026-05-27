-- Migration: Add missing fields to crops table to support FarmRecords functionality

-- Add columns to crops table if they don't exist
ALTER TABLE crops
ADD COLUMN IF NOT EXISTS variety text,
ADD COLUMN IF NOT EXISTS date_planted date,
ADD COLUMN IF NOT EXISTS area numeric(10,2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Growing';

-- Set default values for existing crops
UPDATE crops SET status = 'Growing' WHERE status IS NULL;
UPDATE crops SET area = 0 WHERE area IS NULL;
