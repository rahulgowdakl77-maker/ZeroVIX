// Data access helpers. They return camelCase objects shaped like the ones utils/progress.js expects.
import { query } from './db.js';

export async function getCourse(id) {
  const { rows } = await query('SELECT id, title, description FROM courses WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const ch = await query('SELECT title, topic, description FROM chapters WHERE course_id = $1 ORDER BY position', [id]);
  return { ...rows[0], chapters: ch.rows };
}

export async function getEnrollment(userId, courseId) {
  const { rows } = await query(
    'SELECT id, completed_chapters AS "completedChapters" FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  if (!rows[0]) return null;
  const stats = await query('SELECT topic, correct, total, difficulty FROM topic_stats WHERE enrollment_id = $1 ORDER BY topic', [rows[0].id]);
  return { ...rows[0], topicStats: stats.rows };
}

export async function enroll(userId, courseId) {
  await query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, courseId]);
  return getEnrollment(userId, courseId);
}

// Every course the user is enrolled in, fully loaded.
export async function enrolledCourses(userId) {
  const { rows } = await query('SELECT course_id FROM enrollments WHERE user_id = $1 ORDER BY created_at', [userId]);
  const out = [];
  for (const r of rows) {
    const [course, enrollment] = await Promise.all([getCourse(r.course_id), getEnrollment(userId, r.course_id)]);
    if (course && enrollment) out.push({ course, enrollment });
  }
  return out;
}
