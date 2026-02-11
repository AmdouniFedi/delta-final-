SELECT
  DATE(start_time) AS jour,
  COUNT(*) AS nombre_arrets,
  SUM(TIMESTAMPDIFF(SECOND, start_time, COALESCE(stop_time, NOW()))) AS total_arrets_seconds,
  (8*3600) - SUM(TIMESTAMPDIFF(SECOND, start_time, COALESCE(stop_time, NOW()))) AS total_travail_seconds
FROM stops
WHERE start_time >= '2026-01-20 00:00:00'
  AND start_time <= '2026-01-24 23:59:59'
  -- AND equipe = 1
GROUP BY DATE(start_time)
ORDER BY jour DESC;
