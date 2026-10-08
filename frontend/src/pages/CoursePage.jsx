import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../state.jsx';
import { Bar, ErrorNote } from '../components/ui.jsx';

const ICON = { completed: 'Done', current: 'Open', locked: 'Locked' };

export default function CoursePage() {
  const { id } = useParams();
  const { setActive } = useApp();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/courses/${id}`).then((d) => { setCourse(d.course); setActive(id); }).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <ErrorNote message={error} />;
  if (!course) return <div className="center-note">Loading...</div>;

  return (
    <>
      <h1>{course.title}</h1>
      <p className="muted">{course.description}</p>
      <Bar value={course.progress} color="teal" />
      <p className="muted">{course.progress}% complete</p>
      <div className="chapters">
        {course.chapters.map((ch) => (
          <button
            key={ch.index}
            className={`card chapter ${ch.status}`}
            disabled={ch.status === 'locked'}
            onClick={() => nav(`/materials?chapter=${ch.index}`)}
          >
            <div>
              <strong>Chapter {ch.index + 1}</strong>
              <span>{ch.title}</span>
            </div>
            <em className={`pill ${ch.status}`}>{ICON[ch.status]}</em>
          </button>
        ))}
      </div>
    </>
  );
}
