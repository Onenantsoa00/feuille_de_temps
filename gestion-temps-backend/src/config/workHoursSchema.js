const pool = require("./db");

let cachedHasCaseId = null;

/**
 * Indique si la colonne work_hours.case_id existe (migration étendue).
 * Mis en cache pour éviter de solliciter information_schema à chaque requête.
 */
async function workHoursHasCaseIdColumn() {
  if (cachedHasCaseId !== null) return cachedHasCaseId;
  const r = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_hours'
        AND column_name = 'case_id'
    ) AS ok`
  );
  cachedHasCaseId = Boolean(r.rows[0] && r.rows[0].ok);
  return cachedHasCaseId;
}

/** Expression SQL pour lier une ligne work_hours à sa mission (tâche ou mission directe). */
async function resolveWorkHourMissionIdExpr() {
  const has = await workHoursHasCaseIdColumn();
  return has ? "COALESCE(wh.case_id, t.case_id)" : "t.case_id";
}

function resetWorkHoursSchemaCache() {
  cachedHasCaseId = null;
}

module.exports = {
  workHoursHasCaseIdColumn,
  resolveWorkHourMissionIdExpr,
  resetWorkHoursSchemaCache,
};
