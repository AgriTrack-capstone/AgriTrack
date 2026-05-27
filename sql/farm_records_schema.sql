-- Complete Farm Records Schema for Supabase
-- This file creates all necessary tables for full Farm Records functionality

-- ============ UPDATE CROPS TABLE ============
ALTER TABLE crops
ADD COLUMN IF NOT EXISTS variety text,
ADD COLUMN IF NOT EXISTS date_planted date,
ADD COLUMN IF NOT EXISTS area numeric(10,2),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Growing';

-- ============ CREATE INPUTS TABLE ============
CREATE TABLE IF NOT EXISTS inputs (
  id bigserial primary key,
  name text not null,
  type text,
  quantity numeric(10,2) default 0,
  unit text,
  date_added date,
  status text default 'In Stock',
  created_at timestamptz default now()
);

ALTER TABLE inputs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE inputs TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'inputs'
      AND policyname = 'Allow anon full access to inputs'
  ) THEN
    CREATE POLICY "Allow anon full access to inputs"
      ON inputs FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ============ CREATE EQUIPMENT TABLE ============
CREATE TABLE IF NOT EXISTS equipment (
  id bigserial primary key,
  name text not null,
  type text,
  status text default 'Active',
  last_maintenance date,
  cost numeric(12,2),
  created_at timestamptz default now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE equipment TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'equipment'
      AND policyname = 'Allow anon full access to equipment'
  ) THEN
    CREATE POLICY "Allow anon full access to equipment"
      ON equipment FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ============ CREATE FUELS TABLE ============
CREATE TABLE IF NOT EXISTS fuels (
  id bigserial primary key,
  type text not null,
  quantity numeric(10,2) default 0,
  unit text default 'liters',
  date date,
  cost numeric(12,2),
  created_at timestamptz default now()
);

ALTER TABLE fuels ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fuels TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fuels'
      AND policyname = 'Allow anon full access to fuels'
  ) THEN
    CREATE POLICY "Allow anon full access to fuels"
      ON fuels FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ============ CREATE HARVESTS TABLE ============
CREATE TABLE IF NOT EXISTS harvests (
  id bigserial primary key,
  crop_name text not null,
  quantity numeric(10,2) default 0,
  unit text default 'kg',
  date_harvested date,
  status text default 'Harvested',
  created_at timestamptz default now()
);

ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE harvests TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'harvests'
      AND policyname = 'Allow anon full access to harvests'
  ) THEN
    CREATE POLICY "Allow anon full access to harvests"
      ON harvests FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END
$$;
