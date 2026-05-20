import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';

const SALT_ROUNDS = 12;

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

export async function register({ name, email, password }) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw Object.assign(new Error('Email already registered'), { status: 409 });

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, password_hash]
  );
  return rows[0];
}

export async function login({ email, password }) {
  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user);

  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

export async function refresh(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, refresh_token FROM users WHERE id = $1',
    [payload.sub]
  );
  const user = rows[0];
  if (!user || user.refresh_token !== token) {
    throw Object.assign(new Error('Refresh token revoked'), { status: 401 });
  }

  const newAccess  = signAccess(user);
  const newRefresh = signRefresh(user);

  await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefresh, user.id]);

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logout(userId) {
  await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [userId]);
}
