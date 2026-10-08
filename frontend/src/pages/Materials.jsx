import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, fileUrl } from '../api.js';
import { ErrorNote, NeedCourse } from '../components/ui.jsx';

const TABS = { Textbook: ['pdf', 'text'], PPT: ['ppt'], Video: ['video'] };
const size = (b) => (b ? (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`) : '');

export default function MaterialsPage() {
  return <NeedCourse>{(active) => <Materials active={active} />}</NeedCourse>;
}

function Materials({ active }) {
  const [params, setParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [tab, setTab] = useState('Textbook');
  const [open, setOpen] = useState(null); // {id, text} or {id, video}
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCourse = useCallback(() => api(`/courses/${active.id}`).then((d) => setCourse(d.course)).catch((e) => setError(e.message)), [active.id]);
  useEffect(() => { loadCourse(); }, [loadCourse]);

  const chapter = params.has('chapter')
    ? Number(params.get('chapter'))
    : course?.chapters.find((c) => c.status === 'current')?.index ?? 0;

  const loadMaterials = useCallback(() => {
    if (!course) return;
    api(`/courses/${active.id}/materials?chapter=${chapter}`).then((d) => setMaterials(d.materials)).catch((e) => setError(e.message));
  }, [active.id, chapter, course]);
  useEffect(() => { loadMaterials(); setOpen(null); }, [loadMaterials]);

  async function toggle(m) {
    if (open?.id === m.id) return setOpen(null);
    if (m.kind === 'text') {
      const { text } = await api(`/courses/${active.id}/materials/${m.id}/text`);
      setOpen({ id: m.id, text });
    } else if (m.kind === 'video' && m.url?.startsWith('/uploads')) {
      setOpen({ id: m.id, video: fileUrl(m.url) });
    } else {
      window.open(fileUrl(m.url), '_blank', 'noopener');
    }
  }

  async function upload(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const form = new FormData(e.target);
    form.append('chapterIndex', chapter);
    if (!form.get('videoUrl')) form.delete('videoUrl');
    if (!form.get('file')?.size) form.delete('file');
    try {
      await api(`/courses/${active.id}/materials`, { method: 'POST', form });
      e.target.reset();
      loadMaterials();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    try {
      await api(`/courses/${active.id}/chapters/${chapter}/complete`, { method: 'POST' });
      await loadCourse();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!course) return <div className="center-note">Loading...</div>;
  const current = course.chapters[chapter];
  const shown = materials.filter((m) => TABS[tab].includes(m.kind));

  return (
    <>
      <div className="head-row">
        <div>
          <h1>{current ? `Chapter ${chapter + 1}: ${current.title}` : 'Materials'}</h1>
          <p className="muted">{course.title}</p>
        </div>
        <select aria-label="Chapter" value={chapter} onChange={(e) => setParams({ chapter: e.target.value })}>
          {course.chapters.map((c) => (
            <option key={c.index} value={c.index} disabled={c.status === 'locked'}>Chapter {c.index + 1} - {c.title}</option>
          ))}
        </select>
      </div>
      <ErrorNote message={error} />

      <div className="tabs" role="tablist">
        {Object.keys(TABS).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {shown.length === 0 && <p className="muted card">No {tab.toLowerCase()} materials for this chapter yet.</p>}
      {shown.map((m) => (
        <div key={m.id} className="card material">
          <div className="material-row">
            <div><strong>{m.title}</strong><span className="muted"> {m.kind.toUpperCase()} {size(m.sizeBytes)}</span></div>
            <button className="btn small" onClick={() => toggle(m)}>{open?.id === m.id ? 'Close' : m.kind === 'video' ? 'Watch' : 'Open'}</button>
          </div>
          {open?.id === m.id && open.text !== undefined && <pre className="reader">{open.text || 'No readable text in this file.'}</pre>}
          {open?.id === m.id && open.video && <video className="player" src={open.video} controls />}
        </div>
      ))}

      <form className="card upload" onSubmit={upload}>
        <h2>Add material to this chapter</h2>
        <label>Title (optional)<input name="title" maxLength={120} /></label>
        <label>File (PDF, PPT, PPTX, MP4, WebM, TXT, MD)<input type="file" name="file" accept=".pdf,.ppt,.pptx,.mp4,.webm,.txt,.md" /></label>
        <label>Or video link<input type="url" name="videoUrl" placeholder="https://..." /></label>
        <button className="btn" disabled={busy}>{busy ? 'Uploading...' : 'Upload'}</button>
      </form>

      {current && current.status !== 'completed' && current.status !== 'locked' && (
        <button className="btn teal" onClick={complete}>Mark chapter complete</button>
      )}
      {current?.status === 'completed' && <p className="success">You completed this chapter.</p>}
    </>
  );
}
