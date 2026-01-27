USE `dashboardv2`;
SELECT
  s.id,
  s.start_time,
  s.stop_time,
  s.cause_code,
  c.name AS cause_name,
  c.category AS cause_category
FROM stops s
JOIN causes c ON c.code = s.cause_code
ORDER BY s.start_time DESC;
