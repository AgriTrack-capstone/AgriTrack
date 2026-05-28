-- Reset all May 2026 records to 0 quantity
-- This will make all May report data show 0
UPDATE records
SET qty_amount = 0
WHERE EXTRACT(MONTH FROM schedule_at) = 5 
  AND EXTRACT(YEAR FROM schedule_at) = 2026;

-- Verify the update
SELECT id, title, qty_amount, schedule_at 
FROM records
WHERE EXTRACT(MONTH FROM schedule_at) = 5 
  AND EXTRACT(YEAR FROM schedule_at) = 2026
ORDER BY schedule_at DESC;
