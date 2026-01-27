USE `dashboardv2`;
ALTER TABLE stops
  ADD COLUMN equipe TINYINT
  GENERATED ALWAYS AS (
    CASE
      WHEN TIME(start_time) >= '06:00:00' AND TIME(start_time) < '14:00:00' THEN 1
      WHEN TIME(start_time) >= '14:00:00' AND TIME(start_time) < '22:00:00' THEN 2
      ELSE 3
    END
  ) STORED;

-- Index for fast filtering/grouping by shift
CREATE INDEX idx_stops_equipe_start_time ON stops (equipe, start_time);
