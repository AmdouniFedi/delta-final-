CREATE TABLE `causes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `description` VARCHAR(100) NULL,

  `affect_trs` BOOLEAN NOT NULL,
  `is_active`  BOOLEAN NOT NULL,

  CONSTRAINT `chk_causes_affect_trs` CHECK (`affect_trs` IN (0, 1)),
  CONSTRAINT `chk_causes_is_active`  CHECK (`is_active`  IN (0, 1)),

  PRIMARY KEY (`id`)
) ENGINE=InnoDB;
