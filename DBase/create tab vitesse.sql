CREATE TABLE IF NOT EXISTS `vitesse_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recorded_at` DATETIME NOT NULL,
  `speed` DECIMAL(10,3) NOT NULL,
  `note` VARCHAR(40) NULL,

  PRIMARY KEY (`id`),
  KEY `idx_vitesse_recorded_at` (`recorded_at`),
  KEY `idx_vitesse_recorded_at_id` (`recorded_at`, `id`)
) ENGINE=InnoDB

