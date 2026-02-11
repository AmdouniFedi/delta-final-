DELIMITER $$

CREATE TRIGGER trg_stops_cause_default
BEFORE INSERT ON stops
FOR EACH ROW
BEGIN
  -- Si cause_code vide/null -> défaut E401
  IF NEW.cause_code IS NULL OR NEW.cause_code = '' THEN
    SET NEW.cause_code = 'E401';
  END IF;

  -- Si stop < 30 sec -> forcer NC
  IF NEW.stop_time IS NOT NULL
     AND TIMESTAMPDIFF(SECOND, NEW.start_time, NEW.stop_time) < 30 THEN
    SET NEW.cause_code = 'NC';
  END IF;
END$$

DELIMITER ;
