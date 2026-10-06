-- Crop Monitoring Schema
-- Adds the normalized data model for crop-only operations while preserving existing auth.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- Crop master
-- =========================
ALTER TABLE crops
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS expected_harvest_days integer,
  ADD COLUMN IF NOT EXISTS minimum_harvest_days integer,
  ADD COLUMN IF NOT EXISTS maximum_harvest_days integer,
  ADD COLUMN IF NOT EXISTS suitable_seasons text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crops_updated_at'
  ) THEN
    CREATE TRIGGER trg_crops_updated_at
    BEFORE UPDATE ON crops
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- =========================
-- Core farm hierarchy
-- =========================
CREATE TABLE IF NOT EXISTS farms (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  location text,
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fields (
  id bigserial PRIMARY KEY,
  farm_id bigint NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  area numeric(12,2),
  area_unit text DEFAULT 'ha',
  description text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (farm_id, name)
);

CREATE TABLE IF NOT EXISTS field_seasonal_restrictions (
  id bigserial PRIMARY KEY,
  field_id bigint NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  season text NOT NULL,
  status text NOT NULL DEFAULT 'Not Recommended',
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (field_id, season)
);

CREATE TABLE IF NOT EXISTS farmers (
  id bigserial PRIMARY KEY,
  account_id bigint REFERENCES accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS labor (
  id bigserial PRIMARY KEY,
  account_id bigint REFERENCES accounts(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================
-- Crop lifecycle
-- =========================
CREATE TABLE IF NOT EXISTS crop_growth_stages (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

INSERT INTO crop_growth_stages (name, sort_order)
VALUES
  ('Planting', 1),
  ('Seedling', 2),
  ('Vegetative Growth', 3),
  ('Flowering', 4),
  ('Fruit Development', 5),
  ('Pre-Harvest', 6),
  ('Ready for Harvest', 7),
  ('Harvested', 8)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS crop_plantings (
  id bigserial PRIMARY KEY,
  farm_id bigint NOT NULL REFERENCES farms(id) ON DELETE RESTRICT,
  field_id bigint NOT NULL REFERENCES fields(id) ON DELETE RESTRICT,
  crop_id bigint NOT NULL REFERENCES crops(id) ON DELETE RESTRICT,
  planted_by bigint REFERENCES labor(id) ON DELETE SET NULL,
  planting_date date NOT NULL,
  expected_harvest_date date,
  additional_harvest_date date,
  actual_harvest_date date,
  quantity_planted numeric(12,2),
  unit text,
  status text NOT NULL DEFAULT 'Planned',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_monitorings (
  id bigserial PRIMARY KEY,
  crop_planting_id bigint NOT NULL REFERENCES crop_plantings(id) ON DELETE CASCADE,
  monitoring_date date NOT NULL,
  growth_stage text NOT NULL,
  status text NOT NULL DEFAULT 'Monitoring',
  notes text,
  recorded_by bigint REFERENCES labor(id) ON DELETE SET NULL,
  image text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_images (
  id bigserial PRIMARY KEY,
  crop_monitoring_id bigint NOT NULL REFERENCES crop_monitorings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  taken_at date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harvest_records (
  id bigserial PRIMARY KEY,
  crop_planting_id bigint NOT NULL REFERENCES crop_plantings(id) ON DELETE CASCADE,
  harvest_date date NOT NULL,
  quantity numeric(12,2),
  unit text,
  status text NOT NULL DEFAULT 'Harvested',
  notes text,
  recorded_by bigint REFERENCES labor(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waste_records (
  id bigserial PRIMARY KEY,
  crop_planting_id bigint NOT NULL REFERENCES crop_plantings(id) ON DELETE CASCADE,
  waste_date date NOT NULL,
  quantity numeric(12,2),
  unit text,
  reason text,
  notes text,
  recorded_by bigint REFERENCES labor(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================
-- Maintenance triggers
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_farms_updated_at'
  ) THEN
    CREATE TRIGGER trg_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fields_updated_at'
  ) THEN
    CREATE TRIGGER trg_fields_updated_at
    BEFORE UPDATE ON fields
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_restrictions_updated_at'
  ) THEN
    CREATE TRIGGER trg_restrictions_updated_at
    BEFORE UPDATE ON field_seasonal_restrictions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_farmers_updated_at'
  ) THEN
    CREATE TRIGGER trg_farmers_updated_at
    BEFORE UPDATE ON farmers
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_labor_updated_at'
  ) THEN
    CREATE TRIGGER trg_labor_updated_at
    BEFORE UPDATE ON labor
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crop_plantings_updated_at'
  ) THEN
    CREATE TRIGGER trg_crop_plantings_updated_at
    BEFORE UPDATE ON crop_plantings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_harvest_records_updated_at'
  ) THEN
    CREATE TRIGGER trg_harvest_records_updated_at
    BEFORE UPDATE ON harvest_records
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_waste_records_updated_at'
  ) THEN
    CREATE TRIGGER trg_waste_records_updated_at
    BEFORE UPDATE ON waste_records
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

-- =========================
-- Access control
-- =========================
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_seasonal_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_growth_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_plantings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_monitorings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE farms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fields TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE field_seasonal_restrictions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE farmers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE labor TO anon, authenticated;
GRANT SELECT ON TABLE crop_growth_stages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE crop_plantings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE crop_monitorings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE crop_images TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE harvest_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE waste_records TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'farms' AND policyname = 'Allow anon full access to farms'
  ) THEN
    CREATE POLICY "Allow anon full access to farms" ON farms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fields' AND policyname = 'Allow anon full access to fields'
  ) THEN
    CREATE POLICY "Allow anon full access to fields" ON fields FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'field_seasonal_restrictions' AND policyname = 'Allow anon full access to field_seasonal_restrictions'
  ) THEN
    CREATE POLICY "Allow anon full access to field_seasonal_restrictions" ON field_seasonal_restrictions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'farmers' AND policyname = 'Allow anon full access to farmers'
  ) THEN
    CREATE POLICY "Allow anon full access to farmers" ON farmers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'labor' AND policyname = 'Allow anon full access to labor'
  ) THEN
    CREATE POLICY "Allow anon full access to labor" ON labor FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crop_growth_stages' AND policyname = 'Allow anon read crop_growth_stages'
  ) THEN
    CREATE POLICY "Allow anon read crop_growth_stages" ON crop_growth_stages FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crop_plantings' AND policyname = 'Allow anon full access to crop_plantings'
  ) THEN
    CREATE POLICY "Allow anon full access to crop_plantings" ON crop_plantings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crop_monitorings' AND policyname = 'Allow anon full access to crop_monitorings'
  ) THEN
    CREATE POLICY "Allow anon full access to crop_monitorings" ON crop_monitorings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crop_images' AND policyname = 'Allow anon full access to crop_images'
  ) THEN
    CREATE POLICY "Allow anon full access to crop_images" ON crop_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'harvest_records' AND policyname = 'Allow anon full access to harvest_records'
  ) THEN
    CREATE POLICY "Allow anon full access to harvest_records" ON harvest_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'waste_records' AND policyname = 'Allow anon full access to waste_records'
  ) THEN
    CREATE POLICY "Allow anon full access to waste_records" ON waste_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- =========================
-- Crop master seed data
-- =========================
INSERT INTO crops (name, description, expected_harvest_days, minimum_harvest_days, maximum_harvest_days, suitable_seasons, status)
SELECT 'Eggplant', 'Crop master entry for eggplant.', 75, 65, 90, ARRAY['Dry Season', 'Rainy Season'], 'Active'
WHERE NOT EXISTS (SELECT 1 FROM crops WHERE name = 'Eggplant');

INSERT INTO crops (name, description, expected_harvest_days, minimum_harvest_days, maximum_harvest_days, suitable_seasons, status)
SELECT 'Corn', 'Crop master entry for corn.', 90, 80, 110, ARRAY['Dry Season'], 'Active'
WHERE NOT EXISTS (SELECT 1 FROM crops WHERE name = 'Corn');

INSERT INTO crops (name, description, expected_harvest_days, minimum_harvest_days, maximum_harvest_days, suitable_seasons, status)
SELECT 'Sweet Potato', 'Crop master entry for sweet potato.', 100, 90, 120, ARRAY['Dry Season', 'Rainy Season'], 'Active'
WHERE NOT EXISTS (SELECT 1 FROM crops WHERE name = 'Sweet Potato');

INSERT INTO crops (name, description, expected_harvest_days, minimum_harvest_days, maximum_harvest_days, suitable_seasons, status)
SELECT 'Tomato', 'Crop master entry for tomato.', 75, 65, 95, ARRAY['Dry Season'], 'Active'
WHERE NOT EXISTS (SELECT 1 FROM crops WHERE name = 'Tomato');

-- =========================
-- Recovery from legacy data
-- =========================
INSERT INTO farms (name, location, description, status)
SELECT 'Unassigned Farm', NULL, 'Recovered from legacy crop records.', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM farms);

INSERT INTO fields (farm_id, name, area, area_unit, description, status)
SELECT
  (SELECT id FROM farms ORDER BY id LIMIT 1),
  legacy_fields.legacy_name,
  NULL,
  'ha',
  'Recovered from legacy crop and record data.',
  'Active'
FROM (
  SELECT DISTINCT field AS legacy_name FROM crops WHERE field IS NOT NULL AND field <> ''
  UNION
  SELECT DISTINCT field AS legacy_name FROM records WHERE field IS NOT NULL AND field <> ''
) AS legacy_fields
WHERE NOT EXISTS (
  SELECT 1 FROM fields existing_fields
  WHERE existing_fields.name = legacy_fields.legacy_name
    AND existing_fields.farm_id = (SELECT id FROM farms ORDER BY id LIMIT 1)
);

INSERT INTO farmers (account_id, name, contact, status)
SELECT accounts.id, accounts.full_name, accounts.email, accounts.status
FROM accounts
WHERE accounts.role IN ('Admin', 'Supervisor')
  AND NOT EXISTS (
    SELECT 1 FROM farmers existing_farmers WHERE existing_farmers.account_id = accounts.id
  );

INSERT INTO labor (account_id, name, contact, status)
SELECT accounts.id, accounts.full_name, accounts.email, accounts.status
FROM accounts
WHERE accounts.role IN ('Farm Worker', 'Supervisor')
  AND NOT EXISTS (
    SELECT 1 FROM labor existing_labor WHERE existing_labor.account_id = accounts.id
  );

INSERT INTO crop_plantings (farm_id, field_id, crop_id, planting_date, expected_harvest_date, quantity_planted, unit, status, notes)
SELECT
  (SELECT id FROM farms ORDER BY id LIMIT 1) AS farm_id,
  field_lookup.id AS field_id,
  crops.id AS crop_id,
  crops.date_planted AS planting_date,
  CASE
    WHEN crops.date_planted IS NOT NULL AND crops.expected_harvest_days IS NOT NULL
      THEN crops.date_planted + (crops.expected_harvest_days || ' days')::interval
    ELSE NULL
  END::date AS expected_harvest_date,
  crops.stock_amt AS quantity_planted,
  crops.stock_unit AS unit,
  COALESCE(crops.status, 'Planted') AS status,
  crops.description AS notes
FROM crops
JOIN fields AS field_lookup
  ON field_lookup.name = crops.field
WHERE crops.date_planted IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM crop_plantings existing_plantings
    WHERE existing_plantings.crop_id = crops.id
      AND existing_plantings.planting_date = crops.date_planted
      AND existing_plantings.field_id = field_lookup.id
  );

CREATE OR REPLACE VIEW crop_activity_log AS
  SELECT
    'planting'::text AS source,
    cp.id AS source_id,
    cr.name AS crop_name,
    fm.name AS farm_name,
    fd.name AS field_name,
    cp.planting_date AS activity_date,
    cp.status,
    NULL::text AS growth_stage,
    cp.notes,
    cp.quantity_planted AS quantity,
    cp.unit,
    cp.created_at
  FROM crop_plantings cp
  JOIN crops cr ON cr.id = cp.crop_id
  JOIN farms fm ON fm.id = cp.farm_id
  JOIN fields fd ON fd.id = cp.field_id

  UNION ALL

  SELECT
    'monitoring'::text AS source,
    cm.id AS source_id,
    cr.name AS crop_name,
    fm.name AS farm_name,
    fd.name AS field_name,
    cm.monitoring_date AS activity_date,
    cm.status,
    cm.growth_stage,
    cm.notes,
    NULL::numeric AS quantity,
    NULL::text AS unit,
    cm.created_at
  FROM crop_monitorings cm
  JOIN crop_plantings cp ON cp.id = cm.crop_planting_id
  JOIN crops cr ON cr.id = cp.crop_id
  JOIN farms fm ON fm.id = cp.farm_id
  JOIN fields fd ON fd.id = cp.field_id

  UNION ALL

  SELECT
    'harvest'::text AS source,
    hr.id AS source_id,
    cr.name AS crop_name,
    fm.name AS farm_name,
    fd.name AS field_name,
    hr.harvest_date AS activity_date,
    hr.status,
    'Harvested'::text AS growth_stage,
    hr.notes,
    hr.quantity,
    hr.unit,
    hr.created_at
  FROM harvest_records hr
  JOIN crop_plantings cp ON cp.id = hr.crop_planting_id
  JOIN crops cr ON cr.id = cp.crop_id
  JOIN farms fm ON fm.id = cp.farm_id
  JOIN fields fd ON fd.id = cp.field_id

  UNION ALL

  SELECT
    'waste'::text AS source,
    wr.id AS source_id,
    cr.name AS crop_name,
    fm.name AS farm_name,
    fd.name AS field_name,
    wr.waste_date AS activity_date,
    'Waste'::text AS status,
    NULL::text AS growth_stage,
    COALESCE(wr.reason, '') || CASE WHEN wr.notes IS NOT NULL AND wr.notes <> '' THEN ' - ' || wr.notes ELSE '' END AS notes,
    wr.quantity,
    wr.unit,
    wr.created_at
  FROM waste_records wr
  JOIN crop_plantings cp ON cp.id = wr.crop_planting_id
  JOIN crops cr ON cr.id = cp.crop_id
  JOIN farms fm ON fm.id = cp.farm_id
  JOIN fields fd ON fd.id = cp.field_id

  UNION ALL

  SELECT
    'legacy_record'::text AS source,
    r.id AS source_id,
    r.crop AS crop_name,
    NULL::text AS farm_name,
    r.field AS field_name,
    r.schedule_at::date AS activity_date,
    r.status,
    NULL::text AS growth_stage,
    r.notes,
    r.qty_amount AS quantity,
    r.qty_unit AS unit,
    r.created_at
  FROM records r

  UNION ALL

  SELECT
    'legacy_harvest'::text AS source,
    h.id AS source_id,
    h.crop_name,
    NULL::text AS farm_name,
    NULL::text AS field_name,
    h.date_harvested AS activity_date,
    h.status,
    'Harvested'::text AS growth_stage,
    NULL::text AS notes,
    h.quantity,
    h.unit,
    h.created_at
  FROM harvests h;
