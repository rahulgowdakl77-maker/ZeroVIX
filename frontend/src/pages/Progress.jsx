import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Bar, ErrorNote, NeedCourse, Ring } from '../components/ui.jsx';

export default function ProgressPage() {
  return <NeedCourse>{(active) => <Progress active={active} />}</NeedCourse>;
}

const barColor = (m) => (m >= 75 ? 'teal' : m >= 60 ? 'orange' : 'red');

function Progress({ active }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api(`/progress/${active.id}`).then(setData).catch((e) => setError(e.message));
  }, [active.id]);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <div className="center-note">Loading...</div>;

  return (
    <>
      <h1>My Progress</h1>
      <p className="muted">{data.course.title} - {data.completedChapters} of {data.totalChapters} chapters complete</p>
      <div className="grid-2">
        <section className="card center"><Ring value={data.overall} /></section>
        <section className="card">
          <h2>Topic progress</h2>
          {data.topics.length === 0 && <p className="muted">Take a quiz to see your topic scores. <Link to="/quiz">Start a quiz</Link></p>}
          {data.topics.map((t) => (
            <div key={t.topic} className="topic-row">
              <div className="score-row"><span>{t.topic} <em className="muted">({t.level})</em></span><strong>{t.mastery}%</strong></div>
              <Bar value={t.mastery} color={barColor(t.mastery)} />
            </div>
          ))}
        </section>
      </div>
      <div className="grid-2">
        <section className="card tint-teal">
          <h2>Strong topics</h2>
          {data.strong.length ? data.strong.map((t) => <p key={t.topic}>{t.topic} - {t.mastery}%</p>) : <p className="muted">Strong topics appear after a few correct answers.</p>}
        </section>
        <section className="card tint-red">
          <h2>Needs practice</h2>
          {data.weak.length ? data.weak.map((t) => <p key={t.topic}>{t.topic} - {t.mastery}%</p>) : <p className="muted">Nothing needs extra practice right now.</p>}
        </section>
      </div>
    </>
  );
}
