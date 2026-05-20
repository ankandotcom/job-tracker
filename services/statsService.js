import pool from '../db/index.js';

export async function getStats(userId) {
  const [statusRes, timelineRes, topCompaniesRes] = await Promise.all([
    // Status breakdown
    pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM applications WHERE user_id = $1
       GROUP BY status`,
      [userId]
    ),
    // Applications per week (last 12 weeks)
    pool.query(
      `SELECT DATE_TRUNC('week', applied_at)::date AS week,
              COUNT(*)::int AS count
       FROM applications
       WHERE user_id = $1 AND applied_at >= NOW() - INTERVAL '12 weeks'
       GROUP BY week ORDER BY week`,
      [userId]
    ),
    // Top companies applied to
    pool.query(
      `SELECT company, COUNT(*)::int AS count
       FROM applications WHERE user_id = $1
       GROUP BY company ORDER BY count DESC LIMIT 5`,
      [userId]
    ),
  ]);

  const total = statusRes.rows.reduce((s, r) => s + r.count, 0);
  const statusMap = Object.fromEntries(statusRes.rows.map((r) => [r.status, r.count]));

  return {
    total,
    by_status: statusMap,
    weekly_timeline: timelineRes.rows,
    top_companies: topCompaniesRes.rows,
  };
}
