import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorNote, NeedCourse } from '../components/ui.jsx';

export default function RecommendationsPage() {
  return <NeedCourse>{(active) => <Recommendations active={active} />}</NeedCourse>;
}

function Recommendations({ active }) {
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    api(`/recommendations/${active.id}`).then((d) => setItems(d.recommendations)).catch((e) => setError(e.message));
  }, [active.id]);

  const start = (r) => nav(r.type === 'quiz' ? `/quiz?topic=${encodeURIComponent(r.topic)}` : `/materials?chapter=${r.chapterIndex}`);

  if (error) return <ErrorNote message={error} />;
  if (!items) return <div className="center-note">Loading...</div>;

  return (
    <>
      <h1>Recommended for you</h1>
      <p className="muted">Based on your quiz results and course progress in {active.title}.</p>
      {items.length === 0 && <p className="card muted">You are all caught up. Try a quiz to unlock more recommendations.</p>}
      {items.map((r, i) => (
        <section key={i} className={`card rec ${i === 0 ? 'primary' : ''}`}>
          <div>
            <strong>{r.title}</strong>
            <p className="muted">{r.level} - {r.minutes} min - {r.reason}</p>
          </div>
          <button className="btn" onClick={() => start(r)}>{r.type === 'quiz' ? 'Start quiz' : 'Start learning'}</button>
        </section>
      ))}
    </>
  );
}
