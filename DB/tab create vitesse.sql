USE `dashboardv2`;

CREATE TABLE IF NOT EXISTS `vitesse_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recorded_at` DATETIME NOT NULL,
  `speed` DECIMAL(10,3) NOT NULL,
  `note` VARCHAR(255) NULL,

  PRIMARY KEY (`id`),
  KEY `idx_vitesse_recorded_at` (`recorded_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
