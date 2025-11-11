-- Script de migration de données pour transférer les horaires depuis site_content vers online_ordering_schedules
-- IMPORTANT: Ce script doit être exécuté APRÈS avoir créé la table online_ordering_schedules

-- Étape 1: Créer une fonction temporaire pour extraire et insérer les horaires
CREATE OR REPLACE FUNCTION migrate_schedules_from_site_content()
RETURNS void AS $$
DECLARE
  schedule_data jsonb;
  weekly_schedule jsonb;
BEGIN
  -- Récupérer le contenu depuis site_content
  SELECT content->'onlineOrdering'->'schedule'->'weeklySchedule'
  INTO weekly_schedule
  FROM site_content
  WHERE id = 'default';

  -- Si aucune donnée n'est trouvée, utiliser les valeurs par défaut
  IF weekly_schedule IS NULL THEN
    RAISE NOTICE 'Aucune donnée de schedule trouvée dans site_content, utilisation des valeurs par défaut';
    weekly_schedule := jsonb_build_object(
      'monday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false),
      'tuesday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false),
      'wednesday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false),
      'thursday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false),
      'friday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false),
      'saturday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false),
      'sunday', jsonb_build_object('startTime', '11:00', 'endTime', '23:00', 'closed', false)
    );
  END IF;

  -- Insérer les données pour chaque jour de la semaine
  INSERT INTO online_ordering_schedules (day_of_week, start_time, end_time, closed)
  VALUES 
    ('monday', 
     COALESCE(weekly_schedule->'monday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'monday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'monday'->>'closed')::boolean, false)),
    ('tuesday',
     COALESCE(weekly_schedule->'tuesday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'tuesday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'tuesday'->>'closed')::boolean, false)),
    ('wednesday',
     COALESCE(weekly_schedule->'wednesday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'wednesday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'wednesday'->>'closed')::boolean, false)),
    ('thursday',
     COALESCE(weekly_schedule->'thursday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'thursday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'thursday'->>'closed')::boolean, false)),
    ('friday',
     COALESCE(weekly_schedule->'friday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'friday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'friday'->>'closed')::boolean, false)),
    ('saturday',
     COALESCE(weekly_schedule->'saturday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'saturday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'saturday'->>'closed')::boolean, false)),
    ('sunday',
     COALESCE(weekly_schedule->'sunday'->>'startTime', '11:00'),
     COALESCE(weekly_schedule->'sunday'->>'endTime', '23:00'),
     COALESCE((weekly_schedule->'sunday'->>'closed')::boolean, false))
  ON CONFLICT (day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    closed = EXCLUDED.closed;

  RAISE NOTICE 'Migration des horaires terminée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Étape 2: Exécuter la migration
SELECT migrate_schedules_from_site_content();

-- Étape 3: Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS migrate_schedules_from_site_content();

-- Étape 4: (Optionnel) Supprimer les anciennes données de site_content
-- ATTENTION: Ne pas exécuter cette partie tant que le nouveau système n'est pas testé et validé en production
-- UPDATE site_content 
-- SET content = content #- '{onlineOrdering,schedule,weeklySchedule}'
-- WHERE id = 'default';

-- Vérification: Afficher les données migrées
SELECT day_of_week, start_time, end_time, closed 
FROM online_ordering_schedules 
ORDER BY 
  CASE day_of_week
    WHEN 'monday' THEN 1
    WHEN 'tuesday' THEN 2
    WHEN 'wednesday' THEN 3
    WHEN 'thursday' THEN 4
    WHEN 'friday' THEN 5
    WHEN 'saturday' THEN 6
    WHEN 'sunday' THEN 7
  END;
