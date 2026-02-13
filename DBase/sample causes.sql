INSERT INTO causes (name, description, affect_trs, is_active) VALUES
('Panne machine', 'Arrêt dû à une panne ou dysfonctionnement machine.', 1, 1),
('Maintenance préventive', 'Maintenance planifiée (préventif).', 0, 1),
('Maintenance 1er niveau & Nettoyage', 'Intervention opérateur + nettoyage de routine.', 0, 1),
('Tare & Enregistrement défaut', 'Contrôle tare + saisie/validation défaut.', 1, 1),
('Attente décision', 'Arrêt en attente de décision qualité/production.', 1, 1),
('Enregistrement check list', 'Saisie ou vérification check-list.', 0, 1),
('Mesure de biais et côtes Articles spécifiques', 'Mesures dimensionnelles sur articles spécifiques.', 0, 1),
('Validation tirelle/SDM', 'Validation tirelle / SDM avant reprise.', 0, 1),
('Pause', 'Pause planifiée.', 1, 1),
('Conditionnement & emballage fut', 'Conditionnement et emballage en fut.', 1, 1),
('Conditionnement & Emballage vrac', 'Conditionnement et emballage en vrac.', 1, 1),
('Embarquement chevalet', 'Mise en place / embarquement sur chevalet.', 1, 1),
('Prélèvement Echantillon Labo & A4', 'Prélèvement échantillon pour labo + A4.', 0, 1),
('Manque Matière', 'Arrêt par manque de matière première.', 1, 1),
('Passation entre équipes', 'Passation / relève entre équipes.', 0, 1),
('Arrêt  non considéré', 'un Arrêt < 30 sec', 0, 1);

