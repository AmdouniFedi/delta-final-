DROP TABLE IF EXISTS `causes`;

CREATE TABLE `causes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NULL,
  `affect_TRS` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_causes_code` (`code`),

  KEY `idx_causes_category` (`category`),
  KEY `idx_causes_name` (`name`),
  KEY `idx_causes_affect_trs` (`affect_TRS`),
  KEY `idx_causes_is_active` (`is_active`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
