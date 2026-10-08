import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './state.jsx';
import Layout from './components/Layout.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import CoursePage from './pages/CoursePage.jsx';
import Materials from './pages/Materials.jsx';
import Tutor from './pages/Tutor.jsx';
import Quiz from './pages/Quiz.jsx';
import Progress from './pages/Progress.jsx';
import Recommendations from './pages/Recommendations.jsx';

function Protected({ children }) {
  const { user, ready } = useApp();
  if (!ready) return <div className="center-note">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useApp();
  return (
    <Routes>
      {['login', 'signup', 'forgot', 'reset'].map((mode) => (
        <Route key={mode} path={`/${mode}`} element={user ? <Navigate to="/" replace /> : <Auth mode={mode} />} />
      ))}
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CoursePage />} />
        <Route path="materials" element={<Materials />} />
        <Route path="tutor" element={<Tutor />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="progress" element={<Progress />} />
        <Route path="recommendations" element={<Recommendations />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
