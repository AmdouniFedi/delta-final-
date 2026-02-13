CREATE TABLE `stops` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  `Jour` DATE NOT NULL,
  `Début` TIME NOT NULL,
  `Fin`  TIME DEFAULT NULL,

  

  `Durée` INT UNSIGNED
    GENERATED ALWAYS AS (
      CASE
        WHEN `Fin` IS NULL THEN NULL
        WHEN `Fin` >= `Début` THEN TIME_TO_SEC(`Fin`) - TIME_TO_SEC(`Début`)
        ELSE TIME_TO_SEC(`Fin`) + 86400 - TIME_TO_SEC(`Début`)
      END
    ) STORED,
    `cause_id` INT UNSIGNED NOT NULL,

  `equipe` TINYINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE
        WHEN `Début` >= '06:00:00' AND `Début` < '14:00:00' THEN 1
        WHEN `Début` >= '14:00:00' AND `Début` < '22:00:00' THEN 2
        ELSE 3
      END
    ) STORED,

  PRIMARY KEY (`id`),

  KEY `idx_stops_day_start_time` (`Jour`, `Début`),
  KEY `idx_stops_day_equipe_start_time` (`Jour`, `equipe`, `Début`),
  KEY `idx_stops_cause_id` (`cause_id`),
  KEY `idx_stops_stop_time` (`Fin`),

  -- (optionnel) index utile si tu filtres souvent sur les micro-arrêts
  KEY `idx_stops_Durée` (`Durée`),

  CONSTRAINT `fk_stops_cause_id`
    FOREIGN KEY (`cause_id`) REFERENCES `causes` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE

) ENGINE=InnoDB

