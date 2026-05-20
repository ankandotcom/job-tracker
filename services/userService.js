import pool from '../db/index.js';

export async function getProfile(userId) {
  const { rows } = await pool.query(
    'SELECT id, name, email, resume_text, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) throw Object.assign(new Error('User not found'), { status: 404 });
  return rows[0];
}

export async function updateProfile(userId, { name }) {
  const { rows } = await pool.query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email',
    [name, userId]
  );
  return rows[0];
}

export async function updateResume(userId, resumeText) {
  await pool.query(
    'UPDATE users SET resume_text = $1 WHERE id = $2',
    [resumeText, userId]
  );
}
