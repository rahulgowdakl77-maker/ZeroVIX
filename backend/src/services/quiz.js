import { query } from '../db.js';
import { questionBank } from '../data/questionBank.js';
import { chat, grokEnabled, parseJsonLoose } from './grok.js';
import { LEVELS, topicKey } from '../utils/progress.js';

function validQuestion(q) {
  return q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every((o) => typeof o === 'string') && Number.isInteger(q.correctIndex) &&
    q.correctIndex >= 0 && q.correctIndex < 4;
}

async function generateWithGrok({ courseTitle, topic, difficulty, context, avoid }) {
  const system =
    'You write multiple-choice quiz questions for a student. Reply with ONLY a JSON object: ' +
    '{"question": string, "options": [4 strings], "correctIndex": 0-3, "explanation": string}. ' +
    'Exactly one option must be correct. No markdown, no extra text.';
  const user =
    `Course: ${courseTitle}\nTopic: ${topic}\nDifficulty: ${LEVELS[difficulty]}\n` +
    (context ? `Base the question on this course material when possible:\n"""${context}"""\n` : '') +
    (avoid.length ? `Do not repeat these questions:\n- ${avoid.join('\n- ')}\n` : '');
  const raw = await chat([{ role: 'system', content: system }, { role: 'user', content: user }], { temperature: 0.7, maxTokens: 500 });
  const q = parseJsonLoose(raw);
  if (!validQuestion(q)) throw new Error('Model returned an invalid question');
  return { question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation || '', source: 'ai' };
}

function pickFromBank(topic, difficulty, avoid) {
  const pool = questionBank.filter((q) => topicKey(q.topic) === topicKey(topic));
  if (!pool.length) return null;
  const fresh = pool.filter((q) => !avoid.includes(q.question));
  const candidates = fresh.length ? fresh : pool;
  const exact = candidates.filter((q) => q.difficulty === difficulty);
  const list = exact.length ? exact : candidates;
  return { ...list[Math.floor(Math.random() * list.length)], source: 'bank' };
}

export async function createQuestion({ userId, course, topic, difficulty, context }) {
  const recent = await query(
    'SELECT question FROM quiz_questions WHERE user_id = $1 AND course_id = $2 AND topic = $3 ORDER BY created_at DESC LIMIT 8',
    [userId, course.id, topic]
  );
  const avoid = recent.rows.map((r) => r.question);

  let q = null;
  if (grokEnabled()) {
    try {
      q = await generateWithGrok({ courseTitle: course.title, topic, difficulty, context, avoid });
    } catch (err) {
      console.warn('Grok quiz generation failed, using question bank:', err.message);
    }
  }
  if (!q) q = pickFromBank(topic, difficulty, avoid);
  if (!q) return null;

  const { rows } = await query(
    `INSERT INTO quiz_questions (user_id, course_id, topic, difficulty, question, options, correct_index, explanation, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, topic, question, options`,
    [userId, course.id, topic, difficulty, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, q.source]
  );
  return rows[0];
}
