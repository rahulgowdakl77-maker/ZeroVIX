import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../state.jsx';
import { Bar, ErrorNote } from '../components/ui.jsx';

export default function Courses() {
  const { setActive, loadCourses } = useApp();
  const nav = useNavigate();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/courses').then((d) => setCourses(d.courses)).catch((e) => setError(e.message));
  }, []);

  async function open(course) {
    try {
      if (!course.enrolled) {
        await api(`/courses/${course.id}/enroll`, { method: 'POST' });
        await loadCourses();
      }
      setActive(course.id);
      nav('/courses/' + course.id);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <h1>My Courses</h1>
      <p className="muted">Select a course to continue, or enroll in a new one.</p>
      <ErrorNote message={error} />
      {!courses && !error && <div className="center-note">Loading...</div>}
      <div className="cards">
        {courses?.map((c) => (
          <section key={c.id} className="card course-card">
            <h2>{c.title}</h2>
            <p className="muted">{c.description || 'No description yet.'}</p>
            <p className="muted">{c.chapterCount} chapters</p>
            {c.enrolled && <Bar value={c.progress} color="teal" />}
            <button className="btn" onClick={() => open(c)}>{c.enrolled ? 'Select course' : 'Enroll'}</button>
          </section>
        ))}
      </div>
    </>
  );
}
