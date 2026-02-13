

DELIMITER $$

CREATE TRIGGER `trg_stops_bi`
BEFORE INSERT ON `stops`
FOR EACH ROW
BEGIN
  DECLARE duration_sec INT;

  -- Si Fin est renseignée → calcul durée
  IF NEW.`Fin` IS NOT NULL THEN

    SET duration_sec = TIME_TO_SEC(NEW.`Fin`) - TIME_TO_SEC(NEW.`Début`);

    -- Traverse minuit
    IF duration_sec < 0 THEN
      SET duration_sec = duration_sec + 86400;
    END IF;

    -- Micro arrêt < 30 sec
    IF duration_sec < 30 THEN
      SET NEW.`cause_id` = 16;
    END IF;

  END IF;

  -- Si aucune cause fournie → mettre 1 par défaut
  IF NEW.`cause_id` IS NULL OR NEW.`cause_id` = 0 THEN
    SET NEW.`cause_id` = 1;
  END IF;

END$$

DELIMITER ;
