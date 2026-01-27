USE `dashboardv2`;

DROP TABLE IF EXISTS `stops`;

CREATE TABLE `stops` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `start_time` DATETIME NOT NULL,
  `stop_time` DATETIME NULL,
  `cause_code` VARCHAR(32) NOT NULL,

  PRIMARY KEY (`id`),

  KEY `idx_stops_start_time` (`start_time`),
  KEY `idx_stops_stop_time` (`stop_time`),
  KEY `idx_stops_cause_code` (`cause_code`),

  CONSTRAINT `fk_stops_cause_code`
    FOREIGN KEY (`cause_code`)
    REFERENCES `causes` (`code`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT

  -- Optionnel (MySQL 8+): stop_time >= start_time
  -- ,CONSTRAINT `chk_stops_stop_after_start`
  --   CHECK (`stop_time` IS NULL OR `stop_time` >= `start_time`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
