-- Rôles attendus: admin, secretaire, chef_mission, employe
-- Exécuter une fois sur une base existante.

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_validated BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE work_hours ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES cases(id);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
-- Status mission: 0 = pending validation, 1 = validated
ALTER TABLE cases ADD COLUMN IF NOT EXISTS status INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS validated_by INTEGER REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS case_assignments (
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages (
  LEAST(from_user_id, to_user_id),
  GREATEST(from_user_id, to_user_id)
);
