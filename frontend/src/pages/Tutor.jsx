import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { ErrorNote, NeedCourse } from '../components/ui.jsx';

export default function TutorPage() {
  return <NeedCourse>{(active) => <Tutor active={active} />}</NeedCourse>;
}

function Tutor({ active }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => { setMessages([]); }, [active.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setInput(''); setError(''); setBusy(true);
    try {
      const data = await api('/tutor/ask', { method: 'POST', body: { courseId: active.id, question, history } });
      setMessages((m) => [...m, { role: 'assistant', content: data.answer, sources: data.sources }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return setError('Voice input is not supported in this browser.');
    const rec = new SR();
    rec.onresult = (ev) => setInput(ev.results[0][0].transcript);
    rec.onerror = () => setError('Could not hear you. Check microphone permission.');
    rec.start();
  }

  return (
    <>
      <h1>AI Tutor</h1>
      <p className="muted">Ask anything about {active.title}. Answers cite your course materials when they can.</p>
      <div className="card chat">
        <div className="messages" aria-live="polite">
          {messages.length === 0 && <p className="muted">Try: "What is a while loop?"</p>}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              <div className="text">{m.content}</div>
              {m.sources?.length > 0 && (
                <ul className="sources">
                  {m.sources.map((s, j) => (
                    <li key={j}>[{j + 1}] {s.title} - Chapter {s.chapter}{s.chapterTitle ? `: ${s.chapterTitle}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {busy && <div className="bubble assistant muted">Thinking...</div>}
          <div ref={endRef} />
        </div>
        <ErrorNote message={error} />
        <form className="chat-input" onSubmit={send}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything..." maxLength={1000} aria-label="Your question" />
          <button type="button" className="btn ghost" onClick={listen} aria-label="Speak your question">Mic</button>
          <button className="btn" disabled={busy || !input.trim()}>Send</button>
        </form>
      </div>
    </>
  );
}
