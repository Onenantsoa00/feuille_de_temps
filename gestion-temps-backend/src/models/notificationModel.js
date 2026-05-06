const pool = require("../config/db");

const create = async ({ user_id, content }) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, content)
     VALUES ($1, $2)
     RETURNING *`,
    [user_id, content]
  );
  return result.rows[0];
};

const listForUser = async (userId, { unreadOnly = false } = {}) => {
  let sql = `SELECT * FROM notifications WHERE user_id = $1`;
  const params = [userId];

  if (unreadOnly) {
    sql += ` AND is_read = 0`;
  }

  sql += ` ORDER BY sent_at DESC LIMIT 200`;

  const result = await pool.query(sql, params);
  return result.rows;
};

const markRead = async (id, userId) => {
  const result = await pool.query(
    `UPDATE notifications SET is_read = 1
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return result.rows[0] || null;
};

const markAllRead = async (userId) => {
  await pool.query(
    `UPDATE notifications SET is_read = 1
     WHERE user_id = $1 AND is_read = 0`,
    [userId]
  );
};

const countUnread = async (userId) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM notifications
     WHERE user_id = $1 AND is_read = 0`,
    [userId]
  );
  return result.rows[0].n;
};

const notifyMissingTimesheetForDate = async ({ workDate }) => {
  const result = await pool.query(
    `WITH target_users AS (
       SELECT u.id
       FROM users u
       WHERE u.role IN ('chef', 'chef_mission', 'chef_de_mission', 'employe', 'collaborateur')
     ),
     missing AS (
       SELECT tu.id AS user_id
       FROM target_users tu
       WHERE NOT EXISTS (
         SELECT 1
         FROM work_hours wh
         WHERE wh.user_id = tu.id
           AND wh.work_date = $1::date
       )
     ),
     inserted AS (
       INSERT INTO notifications (user_id, content)
       SELECT m.user_id,
              'Rappel: vous n''avez pas rempli votre feuille de temps du ' || $1::text
       FROM missing m
       WHERE NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = m.user_id
           AND n.content = 'Rappel: vous n''avez pas rempli votre feuille de temps du ' || $1::text
       )
       RETURNING user_id, content
     )
     SELECT user_id, content FROM inserted`,
    [workDate]
  );
  return result.rows;
};

module.exports = {
  create,
  listForUser,
  markRead,
  markAllRead,
  countUnread,
  notifyMissingTimesheetForDate,
};