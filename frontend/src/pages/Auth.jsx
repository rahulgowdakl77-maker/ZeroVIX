import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../state.jsx';
import { ErrorNote } from '../components/ui.jsx';

const COPY = {
  login: { title: 'Welcome back', sub: 'Log in to your account', cta: 'Log in' },
  signup: { title: 'Create account', sub: 'Start your learning journey', cta: 'Sign up' },
  forgot: { title: 'Reset your password', sub: 'We will send a reset link to your email', cta: 'Send reset link' },
  reset: { title: 'Choose a new password', sub: 'Use at least 8 characters', cta: 'Update password' },
};

export default function Auth({ mode }) {
  const { authenticate } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') await authenticate('/auth/login', { email: form.email, password: form.password });
      else if (mode === 'signup') await authenticate('/auth/register', form);
      else if (mode === 'forgot') setInfo((await api('/auth/forgot-password', { method: 'POST', body: { email: form.email } })).message);
      else {
        const data = await api('/auth/reset-password', { method: 'POST', body: { token: params.get('token'), password: form.password } });
        setInfo(data.message);
        setTimeout(() => nav('/login'), 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand dark">LearnAI</div>
        <h1>{copy.title}</h1>
        <p className="muted">{copy.sub}</p>
        {mode === 'signup' && (
          <label>Full name<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>
        )}
        {mode !== 'reset' && (
          <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        )}
        {mode !== 'forgot' && (
          <label>Password<input type="password" value={form.password} onChange={set('password')} minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        )}
        <ErrorNote message={error} />
        {info && <p className="success" role="status">{info}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : copy.cta}</button>
        <div className="auth-links">
          {mode === 'login' && (<><Link to="/forgot">Forgot password?</Link><span>No account? <Link to="/signup">Sign up</Link></span></>)}
          {mode === 'signup' && <span>Already have an account? <Link to="/login">Log in</Link></span>}
          {(mode === 'forgot' || mode === 'reset') && <Link to="/login">Back to log in</Link>}
        </div>
      </form>
    </div>
  );
}
