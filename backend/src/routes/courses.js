import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { query, tx } from '../db.js';
import { asyncHandler, httpError, requireAuth, requireRole } from '../middleware/auth.js';
import { chapterStatuses, summarize } from '../utils/progress.js';
import { extractText } from '../utils/text.js';
import { enroll, getCourse, getEnrollment } from '../repo.js';

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const KIND_BY_EXT = { '.pdf': 'pdf', '.ppt': 'ppt', '.pptx': 'ppt', '.mp4': 'video', '.webm': 'video', '.txt': 'text', '.md': 'text' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    KIND_BY_EXT[path.extname(file.originalname).toLowerCase()] ? cb(null, true) : cb(new Error('Upload a PDF, PPT/PPTX, MP4/WebM, TXT or MD file.')),
});

const LIST_SQL = (join) => `
  SELECT c.id, c.title, c.description,
         (SELECT count(*)::int FROM chapters ch WHERE ch.course_id = c.id) AS "chapterCount",
         e.id IS NOT NULL AS enrolled,
         COALESCE(cardinality(e.completed_chapters), 0) AS done
  FROM courses c ${join} JOIN enrollments e ON e.course_id = c.id AND e.user_id = $1
  ORDER BY c.title`;
const shape = ({ done, ...c }) => ({ ...c, progress: c.chapterCount ? Math.round((done / c.chapterCount) * 100) : 0 });

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(LIST_SQL('LEFT'), [req.user.id]);
  res.json({ courses: rows.map(shape) });
}));

router.get('/mine', asyncHandler(async (req, res) => {
  const { rows } = await query(LIST_SQL('INNER'), [req.user.id]);
  res.json({ courses: rows.map(shape) });
}));

router.post('/', requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const { title, description = '', chapters } = req.body ?? {};
  if (!title?.trim()) throw httpError(400, 'Course title is required.');
  if (!Array.isArray(chapters) || !chapters.length || chapters.some((c) => !c.title || !c.topic)) throw httpError(400, 'Each chapter needs a title and a topic.');
  const id = await tx(async (db) => {
    const { rows } = await db.query('INSERT INTO courses (title, description, created_by) VALUES ($1,$2,$3) RETURNING id', [title.trim(), description, req.user.id]);
    for (const [i, c] of chapters.entries()) {
      await db.query('INSERT INTO chapters (course_id, position, title, topic, description) VALUES ($1,$2,$3,$4,$5)', [rows[0].id, i, c.title, c.topic, c.description ?? null]);
    }
    return rows[0].id;
  });
  res.status(201).json({ id });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const course = await getCourse(req.params.id);
  if (!course) throw httpError(404, 'Course not found.');
  const enrollment = await getEnrollment(req.user.id, course.id);
  res.json({
    course: {
      id: course.id, title: course.title, description: course.description,
      enrolled: Boolean(enrollment),
      progress: enrollment ? summarize(course, enrollment).overall : 0,
      chapters: chapterStatuses(course, enrollment),
    },
  });
}));

router.post('/:id/enroll', asyncHandler(async (req, res) => {
  const course = await getCourse(req.params.id);
  if (!course) throw httpError(404, 'Course not found.');
  await enroll(req.user.id, course.id);
  res.status(201).json({ ok: true });
}));

router.post('/:id/chapters/:index/complete', asyncHandler(async (req, res) => {
  const course = await getCourse(req.params.id);
  const index = Number(req.params.index);
  if (!course || !Number.isInteger(index) || index < 0 || index >= course.chapters.length) throw httpError(404, 'Chapter not found.');
  const enrollment = await getEnrollment(req.user.id, course.id);
  if (!enrollment) throw httpError(403, 'Enroll in this course first.');
  if (chapterStatuses(course, enrollment)[index].status === 'locked') throw httpError(400, 'Finish the earlier chapters first.');
  await query(
    `UPDATE enrollments SET last_activity = now(),
       completed_chapters = CASE WHEN $1::int = ANY(completed_chapters) THEN completed_chapters ELSE array_append(completed_chapters, $1::int) END
     WHERE id = $2`,
    [index, enrollment.id]
  );
  const fresh = await getEnrollment(req.user.id, course.id);
  res.json({ chapters: chapterStatuses(course, fresh), progress: summarize(course, fresh).overall });
}));

// ---- Materials ----
const MATERIAL_COLS = `id, chapter_index AS "chapterIndex", title, kind, url, size_bytes AS "sizeBytes"`;

router.get('/:id/materials', asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let where = 'course_id = $1';
  if (req.query.chapter !== undefined) { params.push(Number(req.query.chapter)); where += ` AND chapter_index = $${params.length}`; }
  if (req.query.kind) { params.push(String(req.query.kind)); where += ` AND kind = $${params.length}`; }
  const { rows } = await query(`SELECT ${MATERIAL_COLS} FROM materials WHERE ${where} ORDER BY chapter_index, created_at`, params);
  res.json({ materials: rows.map((r) => ({ ...r, sizeBytes: r.sizeBytes ? Number(r.sizeBytes) : null })) });
}));

router.get('/:id/materials/:materialId/text', asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT title, text FROM materials WHERE id = $1 AND course_id = $2', [req.params.materialId, req.params.id]);
  if (!rows[0]) throw httpError(404, 'Material not found.');
  res.json({ title: rows[0].title, text: rows[0].text ?? '' });
}));

router.post('/:id/materials', upload.single('file'), asyncHandler(async (req, res) => {
  const course = await getCourse(req.params.id);
  if (!course) throw httpError(404, 'Course not found.');
  const chapterIndex = Number(req.body.chapterIndex ?? 0);
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= course.chapters.length) throw httpError(400, 'Choose a valid chapter.');

  const { videoUrl, title } = req.body;
  let values;
  if (req.file) {
    const ext = path.extname(req.file.originalname).toLowerCase();
    values = [course.id, chapterIndex, title?.trim() || req.file.originalname, KIND_BY_EXT[ext], `/uploads/${req.file.filename}`, req.file.size, await extractText(req.file.path, ext), req.user.id];
  } else if (videoUrl && /^https?:\/\//.test(videoUrl)) {
    values = [course.id, chapterIndex, title?.trim() || 'Video lecture', 'video', videoUrl, null, null, req.user.id];
  } else {
    throw httpError(400, 'Attach a file or provide a video link starting with http(s)://.');
  }
  const { rows } = await query(
    `INSERT INTO materials (course_id, chapter_index, title, kind, url, size_bytes, text, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${MATERIAL_COLS}`,
    values
  );
  res.status(201).json({ material: rows[0] });
}));

export default router;
