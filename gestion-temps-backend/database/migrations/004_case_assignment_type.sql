ALTER TABLE case_assignments
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20) NOT NULL DEFAULT 'collaborateur';

-- For legacy rows, keep existing behavior but allow future explicit typing.
-- Existing rows without explicit type will still work as collaborator by default.
