SELECT
  DATE(recorded_at) AS day,
  ROUND(SUM(meters), 3) AS total_meters
FROM metrage_entries
WHERE recorded_at >= '2026-01-20 00:00:00'
  AND recorded_at <= '2026-01-24 23:59:59'
GROUP BY DATE(recorded_at)
ORDER BY day ASC;
