import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../state.jsx';
import { Bar, ErrorNote } from '../components/ui.jsx';

export default function Dashboard() {
  const { setActive } = useApp();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <div className="center-note">Loading your dashboard...</div>;
  const { stats, courses, recentQuiz, recommended } = data;

  const startRecommended = () => {
    setActive(data.recommendedCourseId);
    nav(recommended.type === 'quiz' ? `/quiz?topic=${encodeURIComponent(recommended.topic)}` : `/materials?chapter=${recommended.chapterIndex}`);
  };

  return (
    <>
      <h1>Hello, {data.user.name}!</h1>
      <p className="muted">Keep going. You are doing great.</p>

      <div className="stats">
        <div className="stat indigo"><span>Current courses</span><strong>{stats.currentCourses}</strong></div>
        <div className="stat teal"><span>Overall progress</span><strong>{stats.overallProgress}%</strong></div>
        <div className="stat purple"><span>Quiz score</span><strong>{stats.quizScore === null ? '-' : `${stats.quizScore}%`}</strong></div>
        <div className="stat orange"><span>Weak topics</span><strong>{stats.weakTopics}</strong></div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Your courses</h2>
          {courses.length === 0 && <p className="muted">You are not enrolled in any course yet. <Link to="/courses">Browse courses</Link></p>}
          {courses.map((c) => (
            <div key={c.id} className="course-row">
              <div><strong>{c.title}</strong><Bar value={c.progress} /></div>
              <button className="btn small" onClick={() => { setActive(c.id); nav('/courses/' + c.id); }}>Continue</button>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Recent quiz scores</h2>
          {recentQuiz.length === 0 && <p className="muted">Take a quiz to see your scores here.</p>}
          {recentQuiz.map((q) => (
            <div key={q.topic} className="score-row"><span>{q.topic}</span><strong>{q.score}%</strong></div>
          ))}
        </section>
      </div>

      <section className="card recommend">
        <div>
          <h2>Recommended for you</h2>
          {recommended ? (
            <p><strong>{recommended.title}</strong><br /><span className="muted">{recommended.level} - {recommended.minutes} min - {recommended.reason}</span></p>
          ) : (
            <p className="muted">Enroll in a course to get recommendations.</p>
          )}
        </div>
        {recommended && <button className="btn" onClick={startRecommended}>Start learning</button>}
      </section>
    </>
  );
}
