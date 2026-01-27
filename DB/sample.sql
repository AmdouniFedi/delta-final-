

INSERT INTO `causes` (`code`, `name`, `category`, `description`, `affect_TRS`, `is_active`)
VALUES
  ('E022',  '  pressed',               'Safety',     '  opened',                     0, 1),
  ('E401',  'Emergency stop pressed',  'Safety',     'E-stop chain opened',          0, 1),
  ('M0410', 'Conveyor jam',            'Mechanical', 'Motor torque limit reached',   1, 1),
  ('S0405', 'Guard door open',         'Safety',     'Safety interlock open',        0, 0);
