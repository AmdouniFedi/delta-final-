CREATE TABLE IF NOT EXISTS `metrage_entries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recorded_at` DATETIME NOT NULL,
  `meters` DECIMAL(12,3) NOT NULL,
  `note` VARCHAR(255) NULL,

  PRIMARY KEY (`id`),
  KEY `idx_metrage_recorded_at` (`recorded_at`),
  KEY `idx_metrage_recorded_at_id` (`recorded_at`, `id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
