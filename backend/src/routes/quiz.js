import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, httpError, requireAuth } from '../middleware/auth.js';
import { chapterStatuses, findStat, LEVELS, summarize, topicKey } from '../utils/progress.js';
import { relevantChunks } from '../services/retrieval.js';
import { createQuestion } from '../services/quiz.js';
import { getCourse, getEnrollment } from '../repo.js';

const router = Router();
router.use(requireAuth);

router.post('/next', asyncHandler(async (req, res) => {
  const course = await getCourse(req.body?.courseId);
  if (!course) throw httpError(404, 'Course not found.');
  const enrollment = await getEnrollment(req.user.id, course.id);
  if (!enrollment) throw httpError(403, 'Enroll in this course first.');

  // Topic: explicit request -> weakest topic -> current chapter -> first chapter
  let topic = req.body.topic;
  if (topic && !course.chapters.some((c) => topicKey(c.topic) === topicKey(topic))) throw httpError(400, 'Unknown topic for this course.');
  if (!topic) {
    const weakest = [...summarize(course, enrollment).weak].sort((a, b) => a.mastery - b.mastery)[0];
    topic = weakest?.topic ?? chapterStatuses(course, enrollment).find((c) => c.status === 'current')?.topic ?? course.chapters[0]?.topic;
  }
  if (!topic) throw httpError(400, 'This course has no chapters yet.');

  const difficulty = findStat(enrollment, topic)?.difficulty ?? 1;
  const context = (await relevantChunks(course.id, topic, 2)).map((c) => c.text).join('\n');
  const q = await createQuestion({ userId: req.user.id, course, topic, difficulty, context });
  if (!q) throw httpError(404, `No quiz questions are available for "${topic}" yet.`);

  res.json({ questionId: q.id, topic: q.topic, difficulty, level: LEVELS[difficulty], question: q.question, options: q.options });
}));

router.post('/answer', asyncHandler(async (req, res) => {
  const { questionId, selectedIndex } = req.body ?? {};
  if (![0, 1, 2, 3].includes(selectedIndex)) throw httpError(400, 'Choose one of the answers.');

  // Atomically claim the question so it can only be scored once.
  const claimed = await query(
    `UPDATE quiz_questions SET answered = true, selected_index = $3, is_correct = (correct_index = $3)
     WHERE id = $1 AND user_id = $2 AND answered = false
     RETURNING course_id, topic, difficulty, correct_index, explanation, is_correct`,
    [questionId, req.user.id, selectedIndex]
  );
  const q = claimed.rows[0];
  if (!q) {
    const exists = await query('SELECT 1 FROM quiz_questions WHERE id = $1 AND user_id = $2', [questionId, req.user.id]);
    throw exists.rowCount ? httpError(409, 'You already answered this question.') : httpError(404, 'Question not found.');
  }

  const course = await getCourse(q.course_id);
  const enrollment = await getEnrollment(req.user.id, q.course_id);
  const before = findStat(enrollment, q.topic)?.difficulty ?? q.difficulty;
  const after = Math.min(3, Math.max(1, before + (q.is_correct ? 1 : -1)));

  const { rows } = await query(
    `INSERT INTO topic_stats (enrollment_id, topic, correct, total, difficulty) VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (enrollment_id, topic_key) DO UPDATE
       SET correct = topic_stats.correct + $3, total = topic_stats.total + 1, difficulty = $4
     RETURNING correct, total`,
    [enrollment.id, q.topic, q.is_correct ? 1 : 0, after]
  );
  await query('UPDATE enrollments SET last_activity = now() WHERE id = $1', [enrollment.id]);

  res.json({
    correct: q.is_correct,
    correctIndex: q.correct_index,
    explanation: q.explanation,
    topic: q.topic,
    chapterIndex: Math.max(0, course.chapters.findIndex((c) => topicKey(c.topic) === topicKey(q.topic))),
    difficultyChange: after > before ? 'increased' : after < before ? 'decreased' : 'unchanged',
    nextLevel: LEVELS[after],
    mastery: Math.round((rows[0].correct / rows[0].total) * 100),
  });
}));

export default router;
