/**
 * Durée décimale (heures) → "HH:MM" (ex. 4.0666 → "04:04")
 * @param {number|string|null|undefined} decimalHours
 * @returns {string}
 */
export function decimalHoursToHHMM(decimalHours) {
  const n = Number(decimalHours);
  if (!Number.isFinite(n) || n < 0) return "00:00";
  const totalMinutes = Math.round(n * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Deux heures type "HH:MM" ou "H:MM" le même jour → durée "HH:MM"
 * @param {string|null|undefined} start
 * @param {string|null|undefined} end
 * @returns {string}
 */
export function clockRangeToDurationHHMM(start, end) {
  if (!start || !end) return "00:00";
  const base = "1970-01-01T";
  const s = new Date(`${base}${String(start).slice(0, 5)}`);
  const e = new Date(`${base}${String(end).slice(0, 5)}`);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) return "00:00";
  let diffMs = e - s;
  if (diffMs < 0) diffMs = 0;
  const totalMinutes = Math.round(diffMs / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
