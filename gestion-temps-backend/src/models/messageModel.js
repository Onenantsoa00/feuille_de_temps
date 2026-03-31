const pool = require("../config/db");

const create = async ({ from_user_id, to_user_id, body }) => {
  const result = await pool.query(
    `INSERT INTO messages (from_user_id, to_user_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [from_user_id, to_user_id, body]
  );
  return result.rows[0];
};

const threadBetween = async (userId, otherUserId) => {
  const result = await pool.query(
    `
    SELECT m.*,
           fu.name AS from_name,
           fu.first_name AS from_first_name,
           tu.name AS to_name,
           tu.first_name AS to_first_name
    FROM messages m
    JOIN users fu ON m.from_user_id = fu.id
    JOIN users tu ON m.to_user_id = tu.id
    WHERE (m.from_user_id = $1 AND m.to_user_id = $2)
       OR (m.from_user_id = $2 AND m.to_user_id = $1)
    ORDER BY m.created_at ASC
    LIMIT 500
  `,
    [userId, otherUserId]
  );
  return result.rows;
};

const recentConversations = async (userId) => {
  const result = await pool.query(
    `
    WITH pairs AS (
      SELECT
        CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END AS other_id,
        MAX(created_at) AS last_at
      FROM messages
      WHERE from_user_id = $1 OR to_user_id = $1
      GROUP BY 1
    )
    SELECT p.other_id,
           p.last_at,
           u.name AS other_name,
           u.first_name AS other_first_name,
           u.email AS other_email,
           (
             SELECT body FROM messages m
             WHERE (m.from_user_id = $1 AND m.to_user_id = p.other_id)
                OR (m.from_user_id = p.other_id AND m.to_user_id = $1)
             ORDER BY m.created_at DESC
             LIMIT 1
           ) AS last_body,
           (
             SELECT COUNT(*)::int FROM messages m
             WHERE m.to_user_id = $1 AND m.from_user_id = p.other_id AND m.read_at IS NULL
           ) AS unread_count
    FROM pairs p
    JOIN users u ON u.id = p.other_id
    ORDER BY p.last_at DESC
  `,
    [userId]
  );
  return result.rows;
};

const markThreadRead = async (userId, fromOtherId) => {
  await pool.query(
    `UPDATE messages SET read_at = NOW()
     WHERE to_user_id = $1 AND from_user_id = $2 AND read_at IS NULL`,
    [userId, fromOtherId]
  );
};

module.exports = {
  create,
  threadBetween,
  recentConversations,
  markThreadRead,
};
