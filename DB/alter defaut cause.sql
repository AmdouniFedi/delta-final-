USE `dashboardv2`;
ALTER TABLE stops
  MODIFY cause_code VARCHAR(32) NOT NULL DEFAULT 'E401';
