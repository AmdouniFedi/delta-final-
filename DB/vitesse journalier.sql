SELECT
  DATE(recorded_at) AS day,
  ROUND(AVG(speed), 3) AS avg_speed,
  ROUND(MAX(speed), 3) AS max_speed,
  COUNT(*) AS samples
FROM vitesse_entries
WHERE recorded_at >= '2026-01-20 00:00:00'
  AND recorded_at <= '2026-01-24 23:59:59'
GROUP BY DATE(recorded_at)
ORDER BY day ASC;
