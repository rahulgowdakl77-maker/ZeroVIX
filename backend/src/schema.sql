-- LearnAI PostgreSQL schema (idempotent; requires PostgreSQL 13+)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  reset_token_hash text,
  reset_expires timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position int NOT NULL,
  title text NOT NULL,
  topic text NOT NULL,            -- links a chapter to quiz topics
  description text,
  UNIQUE (course_id, position)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed_chapters int[] NOT NULL DEFAULT '{}',
  last_activity timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS topic_stats (
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  topic text NOT NULL,
  topic_key text GENERATED ALWAYS AS (lower(btrim(topic))) STORED,
  correct int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3), -- 1 beginner, 2 intermediate, 3 advanced
  PRIMARY KEY (enrollment_id, topic_key)
);

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chapter_index int NOT NULL DEFAULT 0,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pdf','ppt','video','text')),
  url text,                        -- /uploads/... or external video link
  size_bytes bigint,
  text text,                       -- extracted text used by the AI tutor
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS materials_course_idx ON materials (course_id, chapter_index);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic text NOT NULL,
  difficulty int NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation text,
  source text NOT NULL DEFAULT 'bank' CHECK (source IN ('ai','bank')),
  answered boolean NOT NULL DEFAULT false,
  selected_index int,
  is_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_user_topic_idx ON quiz_questions (user_id, course_id, topic, created_at DESC);
