-- À exécuter si la colonne n’existait pas encore (complète 001_extended_features.sql).
ALTER TABLE work_hours ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES cases(id);

-- Associe les anciennes lignes feuille de temps à leur mission si la tâche porte un case_id.
UPDATE work_hours wh
SET case_id = t.case_id
FROM tasks t
WHERE wh.task_id = t.id
  AND wh.case_id IS NULL
  AND t.case_id IS NOT NULL;
