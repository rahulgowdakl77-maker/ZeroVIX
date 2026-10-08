import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [courses, setCourses] = useState([]);
  const [activeId, setActiveId] = useState(localStorage.getItem('courseId'));

  const loadCourses = useCallback(async () => {
    const { courses } = await api('/courses/mine');
    setCourses(courses);
    setActiveId((prev) => (courses.some((c) => c.id === prev) ? prev : courses[0]?.id ?? null));
    return courses;
  }, []);

  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/auth/me')
      .then(async ({ user }) => {
        setUser(user);
        await loadCourses();
      })
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, [loadCourses]);

  const authenticate = async (path, body) => {
    const data = await api(path, { method: 'POST', body });
    setToken(data.token);
    setUser(data.user);
    await loadCourses();
  };
  const logout = () => {
    setToken(null);
    setUser(null);
    setCourses([]);
  };
  const setActive = (id) => {
    localStorage.setItem('courseId', id);
    setActiveId(id);
  };

  const active = courses.find((c) => c.id === activeId) ?? null;
  return (
    <Ctx.Provider value={{ user, ready, courses, active, setActive, loadCourses, authenticate, logout }}>
      {children}
    </Ctx.Provider>
  );
}
