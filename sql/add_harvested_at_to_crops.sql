ALTER TABLE crops
ADD COLUMN IF NOT EXISTS harvested_at date;
