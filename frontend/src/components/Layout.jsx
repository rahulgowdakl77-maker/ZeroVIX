import { NavLink, Outlet } from 'react-router-dom';
import { useApp } from '../state.jsx';

const links = [
  ['/', 'Dashboard', true],
  ['/courses', 'My Courses'],
  ['/materials', 'Materials'],
  ['/tutor', 'AI Tutor'],
  ['/quiz', 'Quiz'],
  ['/progress', 'Progress'],
  ['/recommendations', 'Recommendations'],
];

export default function Layout() {
  const { user, active, logout } = useApp();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">LearnAI</div>
        <nav>
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="me">
          <div className="avatar">{user.name[0].toUpperCase()}</div>
          <div className="me-text">
            <strong>{user.name}</strong>
            <span>{active ? active.title : 'No course selected'}</span>
          </div>
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
