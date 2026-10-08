import { Router } from 'express';
import { asyncHandler, httpError, requireAuth } from '../middleware/auth.js';
import { chat, grokEnabled } from '../services/grok.js';
import { relevantChunks } from '../services/retrieval.js';
import { getCourse, getEnrollment } from '../repo.js';

const router = Router();
router.use(requireAuth);

router.post('/ask', asyncHandler(async (req, res) => {
  const { courseId, question, history = [] } = req.body ?? {};
  if (!question?.trim() || question.length > 1000) throw httpError(400, 'Ask a question of up to 1000 characters.');
  const course = await getCourse(courseId);
  if (!course) throw httpError(404, 'Course not found.');
  if (!(await getEnrollment(req.user.id, course.id))) throw httpError(403, 'Enroll in this course first.');

  const chunks = await relevantChunks(course.id, question, 4);
  const sources = chunks.map((c) => ({
    title: c.title,
    chapter: c.chapterIndex + 1,
    chapterTitle: course.chapters[c.chapterIndex]?.title,
    snippet: c.text.slice(0, 160) + (c.text.length > 160 ? '...' : ''),
  }));

  if (!grokEnabled()) {
    const answer = chunks.length
      ? `The AI service is not configured, so here is the most relevant passage from your course materials:\n\n${chunks[0].text}`
      : 'The AI service is not configured and no uploaded material matches your question. Add a GROK_API_KEY to the backend .env, or upload materials for this course.';
    return res.json({ answer, sources, offline: true });
  }

  const context = chunks.map((c, i) => `[${i + 1}] (${c.title}, Chapter ${c.chapterIndex + 1})\n${c.text}`).join('\n\n');
  const system =
    `You are a patient AI tutor for the course "${course.title}". Explain clearly for a student, with short examples when helpful. ` +
    'Prefer the course material below. When you use it, cite it as [1], [2]. ' +
    'If the material does not cover the question, say so and answer from general knowledge.\n\n' +
    (context ? `Course material:\n${context}` : 'No course material matched this question.');
  const past = Array.isArray(history)
    ? history.slice(-6).filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  try {
    const answer = await chat([{ role: 'system', content: system }, ...past, { role: 'user', content: question }], { maxTokens: 700 });
    res.json({ answer, sources });
  } catch (err) {
    console.error('Tutor error:', err.message);
    throw httpError(502, 'The AI tutor could not answer right now. Try again in a moment.');
  }
}));

export default router;
