-- Migration pour créer une table dédiée aux horaires de commande en ligne
-- Cette table permet de séparer les données opérationnelles des données de contenu du site

-- Table pour stocker les horaires de commande en ligne
CREATE TABLE IF NOT EXISTS online_ordering_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Index pour recherche rapide par jour de la semaine
CREATE INDEX IF NOT EXISTS idx_online_ordering_schedules_day ON online_ordering_schedules(day_of_week);

-- Trigger pour mettre à jour le timestamp updated_at
DROP TRIGGER IF EXISTS update_online_ordering_schedules_updated_at ON online_ordering_schedules;
CREATE TRIGGER update_online_ordering_schedules_updated_at
BEFORE UPDATE ON online_ordering_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Migration des données existantes depuis site_content vers la nouvelle table
-- Cette section doit être exécutée manuellement après avoir vérifié la structure des données
-- IMPORTANT: Vérifier les données dans site_content.content->'onlineOrdering'->'schedule'->'weeklySchedule'
-- avant d'exécuter cette migration

-- Exemple de migration (à adapter selon les données réelles):
-- INSERT INTO online_ordering_schedules (day_of_week, start_time, end_time, closed)
-- SELECT * FROM (
--   VALUES 
--     ('monday', '11:00', '23:00', false),
--     ('tuesday', '11:00', '23:00', false),
--     ('wednesday', '11:00', '23:00', false),
--     ('thursday', '11:00', '23:00', false),
--     ('friday', '11:00', '23:00', false),
--     ('saturday', '11:00', '23:00', false),
--     ('sunday', '11:00', '23:00', false)
-- ) AS v(day_of_week, start_time, end_time, closed)
-- ON CONFLICT (day_of_week) DO UPDATE SET
--   start_time = EXCLUDED.start_time,
--   end_time = EXCLUDED.end_time,
--   closed = EXCLUDED.closed;
