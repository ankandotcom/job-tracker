import pool from '../db/index.js';

export async function getAll(userId, { status, sort = 'applied_at', order = 'DESC' } = {}) {
  const allowed = ['applied_at', 'updated_at', 'company', 'ai_score'];
  const sortCol = allowed.includes(sort) ? sort : 'applied_at';
  const sortDir = order === 'ASC' ? 'ASC' : 'DESC';

  const params = [userId];
  let where = 'WHERE user_id = $1';
  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT id, company, role, status, applied_at, salary_range, url,
            ai_score, ai_score_reason, ai_scored_at, updated_at
     FROM applications
     ${where}
     ORDER BY ${sortCol} ${sortDir}`,
    params
  );
  return rows;
}

export async function getOne(id, userId) {
  const { rows } = await pool.query(
    `SELECT a.*,
            json_agg(sh ORDER BY sh.changed_at ASC) FILTER (WHERE sh.id IS NOT NULL) AS history
     FROM applications a
     LEFT JOIN status_history sh ON sh.application_id = a.id
     WHERE a.id = $1 AND a.user_id = $2
     GROUP BY a.id`,
    [id, userId]
  );
  if (!rows.length) throw Object.assign(new Error('Application not found'), { status: 404 });
  return rows[0];
}

export async function create(userId, data) {
  const { company, role, status = 'applied', applied_at, notes, salary_range, url } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO applications (user_id, company, role, status, applied_at, notes, salary_range, url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [userId, company, role, status, applied_at || new Date(), notes, salary_range, url]
    );
    const app = rows[0];
    // Record initial status in history
    await client.query(
      `INSERT INTO status_history (application_id, from_status, to_status)
       VALUES ($1, NULL, $2)`,
      [app.id, app.status]
    );
    await client.query('COMMIT');
    return app;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(id, userId, data) {
  const current = await getOne(id, userId);

  const { company, role, status, notes, salary_range, url } = data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE applications
       SET company=$1, role=$2, status=$3, notes=$4, salary_range=$5, url=$6
       WHERE id=$7 AND user_id=$8
       RETURNING *`,
      [
        company ?? current.company,
        role ?? current.role,
        status ?? current.status,
        notes ?? current.notes,
        salary_range ?? current.salary_range,
        url ?? current.url,
        id,
        userId,
      ]
    );
    // Log status change
    if (status && status !== current.status) {
      await client.query(
        `INSERT INTO status_history (application_id, from_status, to_status)
         VALUES ($1, $2, $3)`,
        [id, current.status, status]
      );
    }
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function remove(id, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM applications WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (!rowCount) throw Object.assign(new Error('Application not found'), { status: 404 });
}
