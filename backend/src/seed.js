import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initSchema, pool, tx } from './db.js';

const chapters = [
  { title: 'Introduction to Python', topic: 'Python Basics', text: 'Python is a high-level, readable programming language. You run code line by line with the interpreter. Use print() to show output. Python uses indentation, not braces, to mark blocks of code. Comments start with the # symbol. The / operator always returns a float, while // performs floor division.' },
  { title: 'Data Types and Variables', topic: 'Data Types', text: 'A variable is a name that refers to a value. Common types are int, float, str and bool. Convert between types with int(), float() and str(). Strings are immutable. Tuples are immutable sequences, while lists are mutable. Use type(x) to inspect a value\'s type.' },
  { title: 'Loops', topic: 'Loops', text: 'A for loop iterates over a sequence such as a list or range(). range(3) produces 0, 1, 2. A while loop repeats its block as long as its condition is true; make sure the condition eventually becomes false to avoid an infinite loop. The break statement exits a loop immediately and continue skips to the next iteration. Loops can be nested.' },
  { title: 'Functions', topic: 'Functions', text: 'Define a function with the def keyword. Parameters are the names in the definition; arguments are the values you pass. A function without a return statement returns None. Parameters can have default values, such as def greet(name, greeting="Hello"). Use docstrings to describe what a function does.' },
  { title: 'Lists and Dictionaries', topic: 'Data Structures', text: 'Lists are ordered, mutable collections written with square brackets. Dictionaries map keys to values and are written with curly braces; read a value with d["key"] or d.get("key"). Dictionary lookups take constant time on average because they use hashing. Sets store unique values.' },
];

await initSchema();

const existing = await pool.query(`SELECT 1 FROM courses WHERE title = 'Python Programming'`);
if (existing.rowCount) {
  console.log('Seed data already exists. Nothing to do.');
} else {
  await tx(async (db) => {
    const user = async (name, email, role, pw) =>
      (await db.query('INSERT INTO users (name, email, role, password_hash) VALUES ($1,$2,$3,$4) RETURNING id', [name, email, role, await bcrypt.hash(pw, 10)])).rows[0].id;
    const teacherId = await user('Demo Teacher', 'teacher@learnai.dev', 'teacher', 'teacher123');
    const studentId = await user('Rahul', 'rahul@example.com', 'student', 'password123');

    const { rows } = await db.query(
      'INSERT INTO courses (title, description, created_by) VALUES ($1,$2,$3) RETURNING id',
      ['Python Programming', 'Learn Python from the basics to data structures.', teacherId]
    );
    const courseId = rows[0].id;
    for (const [i, c] of chapters.entries()) {
      await db.query('INSERT INTO chapters (course_id, position, title, topic) VALUES ($1,$2,$3,$4)', [courseId, i, c.title, c.topic]);
      await db.query(
        `INSERT INTO materials (course_id, chapter_index, kind, title, text, uploaded_by) VALUES ($1,$2,'text',$3,$4,$5)`,
        [courseId, i, `${c.title} - Notes`, c.text, teacherId]
      );
    }
    await db.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2)', [studentId, courseId]);
  });
  console.log('Seeded. Log in as rahul@example.com / password123 (student) or teacher@learnai.dev / teacher123 (teacher).');
}
await pool.end();
