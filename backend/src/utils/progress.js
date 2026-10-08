export const LEVELS = ['', 'Beginner', 'Intermediate', 'Advanced'];

export const topicKey = (t) => t.trim().toLowerCase();

export function findStat(enrollment, topic) {
  return enrollment.topicStats.find((s) => topicKey(s.topic) === topicKey(topic));
}

export function summarize(course, enrollment) {
  const totalChapters = course.chapters.length;
  const done = new Set(enrollment.completedChapters);
  const completed = [...done].filter((i) => i >= 0 && i < totalChapters).length;
  const overall = totalChapters ? Math.round((completed / totalChapters) * 100) : 0;

  const topics = enrollment.topicStats.map((s) => ({
    topic: s.topic,
    correct: s.correct,
    total: s.total,
    mastery: s.total ? Math.round((s.correct / s.total) * 100) : 0,
    difficulty: s.difficulty,
    level: LEVELS[s.difficulty],
  }));
  const weak = topics.filter((t) => t.total >= 2 && t.mastery < 60);
  const strong = topics.filter((t) => t.total >= 2 && t.mastery >= 75);
  const totals = topics.reduce((a, t) => ({ c: a.c + t.correct, n: a.n + t.total }), { c: 0, n: 0 });
  const quizScore = totals.n ? Math.round((totals.c / totals.n) * 100) : null;

  return { totalChapters, completedChapters: completed, overall, topics, weak, strong, quizScore };
}

export function chapterStatuses(course, enrollment) {
  const done = new Set(enrollment?.completedChapters ?? []);
  let currentAssigned = false;
  return course.chapters.map((ch, index) => {
    let status = 'locked';
    if (done.has(index)) status = 'completed';
    else if (!currentAssigned) {
      status = 'current';
      currentAssigned = true;
    }
    return { index, title: ch.title, topic: ch.topic, description: ch.description, status };
  });
}

export function recommendations(course, enrollment) {
  const sum = summarize(course, enrollment);
  const out = [];
  const chapterOf = (topic) => Math.max(0, course.chapters.findIndex((c) => topicKey(c.topic) === topicKey(topic)));

  for (const w of sum.weak) {
    out.push({
      type: 'review', title: `Review: ${w.topic}`, topic: w.topic, level: 'Beginner',
      minutes: 10, chapterIndex: chapterOf(w.topic), reason: `Your score here is ${w.mastery}%`,
    });
  }
  const next = chapterStatuses(course, enrollment).find((c) => c.status === 'current');
  if (next) {
    out.push({
      type: 'learn', title: `Continue: ${next.title}`, topic: next.topic, level: 'Beginner',
      minutes: 15, chapterIndex: next.index, reason: 'Next chapter in your course',
    });
  }
  for (const s of sum.strong) {
    out.push({
      type: 'quiz', title: `Challenge quiz: ${s.topic}`, topic: s.topic, level: 'Advanced',
      minutes: 10, chapterIndex: chapterOf(s.topic), reason: `You scored ${s.mastery}% - try harder questions`,
    });
  }
  return out.slice(0, 6);
}
