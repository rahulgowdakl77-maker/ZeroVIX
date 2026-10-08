import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorNote, NeedCourse } from '../components/ui.jsx';

const TOTAL = 10;

export default function QuizPage() {
  return <NeedCourse>{(active) => <Quiz active={active} />}</NeedCourse>;
}

function Quiz({ active }) {
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const nav = useNavigate();
  const [q, setQ] = useState(null);
  const [sel, setSel] = useState(null);
  const [result, setResult] = useState(null);
  const [n, setN] = useState(1);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError(''); setSel(null); setResult(null);
    try {
      setQ(await api('/quiz/next', { method: 'POST', body: { courseId: active.id, topic: topic || undefined } }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [active.id, topic]);

  useEffect(() => { setN(1); setScore(0); setDone(false); load(); }, [load]);

  async function submit() {
    setBusy(true); setError('');
    try {
      const r = await api('/quiz/answer', { method: 'POST', body: { questionId: q.questionId, selectedIndex: sel } });
      setResult(r);
      if (r.correct) setScore((s) => s + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (n >= TOTAL) return setDone(true);
    setN(n + 1);
    load();
  }

  if (done) {
    return (
      <div className="card empty">
        <h1>Quiz complete</h1>
        <p>You answered {score} of {TOTAL} correctly.</p>
        <div className="btn-row">
          <button className="btn" onClick={() => { setN(1); setScore(0); setDone(false); load(); }}>Take another quiz</button>
          <button className="btn ghost" onClick={() => nav('/progress')}>See progress</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1>Quiz</h1>
      <p className="muted">Question {n} / {TOTAL}{q ? ` - ${q.topic} (${q.level})` : ''}</p>
      <ErrorNote message={error} />
      {q && (
        <div className="quiz-grid">
          <section className="card">
            <h2>{q.question}</h2>
            <div className="options" role="radiogroup" aria-label="Answers">
              {q.options.map((opt, i) => {
                let cls = 'option';
                if (result) cls += i === result.correctIndex ? ' right' : i === sel ? ' wrong' : '';
                else if (i === sel) cls += ' picked';
                return (
                  <label key={i} className={cls}>
                    <input type="radio" name="answer" checked={sel === i} disabled={Boolean(result)} onChange={() => setSel(i)} />
                    <span>{String.fromCharCode(65 + i)}. {opt}</span>
                  </label>
                );
              })}
            </div>
            {!result && <button className="btn" disabled={sel === null || busy} onClick={submit}>Submit answer</button>}
          </section>

          {result && (
            <section className={`card feedback ${result.correct ? 'ok' : 'bad'}`} aria-live="polite">
              <h2>{result.correct ? 'Correct' : 'Incorrect'}</h2>
              {result.explanation && <p>{result.explanation}</p>}
              {result.difficultyChange !== 'unchanged' && <p className="muted">Difficulty {result.difficultyChange}.</p>}
              <p className="muted">Next question: {result.nextLevel} level</p>
              {!result.correct && <p><strong>Weak concept detected:</strong> {result.topic}</p>}
              <div className="btn-row">
                {!result.correct && <button className="btn ghost" onClick={() => nav(`/materials?chapter=${result.chapterIndex}`)}>Review concept</button>}
                <button className="btn" onClick={next}>{n >= TOTAL ? 'Finish' : result.correct ? 'Next question' : 'Try an easier question'}</button>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
