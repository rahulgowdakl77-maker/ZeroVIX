import fs from 'fs/promises';
import path from 'path';

export async function extractText(filePath, ext) {
  try {
    ext = ext.toLowerCase();
    if (ext === '.pdf') {
      // import the inner module: pdf-parse's index.js runs a debug routine on import
      const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
      const data = await pdf(await fs.readFile(filePath));
      return data.text || '';
    }
    if (['.txt', '.md'].includes(ext)) return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    console.warn('Text extraction failed for', path.basename(filePath), err.message);
  }
  return ''; // ppt/pptx/video: not indexed
}

export function chunkText(text, size = 900, overlap = 150) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    chunks.push(clean.slice(i, i + size));
    if (i + size >= clean.length) break;
  }
  return chunks;
}

const STOP = new Set('a an the is are was were of to in on for and or what how why when which does do with as by it its this that be can i you'.split(' '));
export const tokenize = (s) =>
  s.toLowerCase().match(/[a-z0-9_]+/g)?.filter((w) => w.length > 1 && !STOP.has(w)) ?? [];

export function topChunks(chunks, query, k = 4) {
  const q = new Set(tokenize(query));
  if (!q.size) return [];
  return chunks
    .map((c) => {
      const words = tokenize(c.text);
      let hits = 0;
      for (const w of words) if (q.has(w)) hits++;
      return { ...c, score: hits / Math.sqrt(words.length + 1) };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
