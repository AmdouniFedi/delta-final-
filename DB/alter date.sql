ALTER TABLE stops
  ADD COLUMN day DATE GENERATED ALWAYS AS (DATE(start_time)) STORED,
  ADD INDEX idx_stops_day (day);
