import { query } from '../db.js';
import { chunkText, topChunks } from '../utils/text.js';

// Builds searchable chunks from every material in the course that has extracted text.
export async function relevantChunks(courseId, q, k = 4) {
  const { rows } = await query(
    `SELECT id, title, chapter_index, text FROM materials WHERE course_id = $1 AND text IS NOT NULL AND text <> ''`,
    [courseId]
  );
  const chunks = rows.flatMap((m) =>
    chunkText(m.text).map((text) => ({ text, title: m.title, chapterIndex: m.chapter_index, materialId: m.id }))
  );
  return topChunks(chunks, q, k);
}
