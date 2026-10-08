import { Link } from 'react-router-dom';
import { useApp } from '../state.jsx';

export const Bar = ({ value, color = 'indigo' }) => (
  <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <span className={`fill ${color}`} style={{ width: `${value}%` }} />
  </div>
);

export function Ring({ value }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="ring" role="img" aria-label={`${value}% overall progress`}>
      <circle cx="64" cy="64" r={r} className="ring-bg" />
      <circle cx="64" cy="64" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 64 64)" />
      <text x="64" y="62" textAnchor="middle" className="ring-num">{value}%</text>
      <text x="64" y="82" textAnchor="middle" className="ring-sub">Overall progress</text>
    </svg>
  );
}

// Pages that need an enrolled, selected course render through this.
export function NeedCourse({ children }) {
  const { active } = useApp();
  if (!active) {
    return (
      <div className="card empty">
        <h2>Pick a course to get started</h2>
        <p>This page works on one course at a time. Enroll in a course first.</p>
        <Link className="btn" to="/courses">Browse courses</Link>
      </div>
    );
  }
  return children(active);
}

export const ErrorNote = ({ message }) => (message ? <p className="error" role="alert">{message}</p> : null);
