import { Router } from 'express';
import { enrolledCourses, getCourse, getEnrollment } from '../repo.js';
import { asyncHandler, httpError, requireAuth } from '../middleware/auth.js';
import { chapterStatuses, recommendations, summarize } from '../utils/progress.js';

const router = Router();
router.use(requireAuth);

async function load(userId, courseId) {
  const course = await getCourse(courseId);
  if (!course) throw httpError(404, 'Course not found.');
  const enrollment = await getEnrollment(userId, course.id);
  if (!enrollment) throw httpError(403, 'Enroll in this course first.');
  return { course, enrollment };
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const rows = (await enrolledCourses(req.user.id)).map((r) => ({ ...r, sum: summarize(r.course, r.enrollment) }));
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const scores = rows.map((r) => r.sum.quizScore).filter((s) => s !== null);

  const first = rows[0];
  res.json({
    user: { name: req.user.name },
    stats: {
      currentCourses: rows.length,
      overallProgress: avg(rows.map((r) => r.sum.overall)),
      quizScore: scores.length ? avg(scores) : null,
      weakTopics: rows.reduce((n, r) => n + r.sum.weak.length, 0),
    },
    courses: rows.map((r) => ({ id: r.course.id, title: r.course.title, progress: r.sum.overall })),
    recentQuiz: rows.flatMap((r) => r.sum.topics.map((t) => ({ topic: t.topic, score: t.mastery }))).slice(0, 5),
    recommended: first ? recommendations(first.course, first.enrollment)[0] ?? null : null,
    recommendedCourseId: first ? first.course.id : null,
  });
}));

router.get('/progress/:courseId', asyncHandler(async (req, res) => {
  const { course, enrollment } = await load(req.user.id, req.params.courseId);
  res.json({ course: { id: course.id, title: course.title }, ...summarize(course, enrollment), chapters: chapterStatuses(course, enrollment) });
}));

router.get('/recommendations/:courseId', asyncHandler(async (req, res) => {
  const { course, enrollment } = await load(req.user.id, req.params.courseId);
  res.json({ recommendations: recommendations(course, enrollment) });
}));

export default router;
