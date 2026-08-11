-- Assessly database schema (fresh install)
-- Apply once against an empty PostgreSQL database.

CREATE TYPE role_enum AS ENUM ('INSTRUCTOR', 'STUDENT', 'TA', 'ADMIN');
CREATE TYPE assess_type_enum AS ENUM ('EXAM', 'QUIZ', 'ASSIGNMENT');
CREATE TYPE question_type_enum AS ENUM ('CODING', 'ESSAY', 'MCQ');

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    auc_id CHAR(9) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    google_id VARCHAR(50) UNIQUE,
    hashed_password VARCHAR(64),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    role role_enum NOT NULL,
    department VARCHAR(50) NOT NULL
);

CREATE TABLE email_verifications (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_reset_codes (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE instructor_invites (
    invite_id SERIAL PRIMARY KEY,
    email VARCHAR(50) UNIQUE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    invited_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE course (
    course_id SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL REFERENCES users(user_id),
    enrollementkey VARCHAR(50) NOT NULL,
    coursetitle VARCHAR(50) NOT NULL,
    max_num_students INT NOT NULL DEFAULT 0,
    num_enrolled_students INT NOT NULL DEFAULT 0,
    isopenenrollement BOOLEAN NOT NULL,
    classroom VARCHAR(32) NOT NULL DEFAULT '',
    meeting_time VARCHAR(45) NOT NULL DEFAULT ''
);

CREATE TABLE ta_course (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    ta_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (course_id, ta_id)
);

CREATE TABLE student_course (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (course_id, student_id)
);

CREATE TABLE assessment (
    assessment_id SERIAL PRIMARY KEY,
    assess_type assess_type_enum NOT NULL,
    title VARCHAR(50) NOT NULL,
    duration INT NOT NULL,
    max_grade FLOAT NOT NULL,
    due_date DATE,
    due_time TIME,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    course_id INT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE
);

CREATE TABLE security_settings (
    id SERIAL PRIMARY KEY,
    windowswitching BOOLEAN NOT NULL,
    clipboardaccess BOOLEAN NOT NULL,
    screensnapshot BOOLEAN NOT NULL,
    questionstats BOOLEAN NOT NULL,
    networkrestriction BOOLEAN NOT NULL DEFAULT false,
    processmonitoring BOOLEAN NOT NULL DEFAULT false,
    assessment_id INT NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE
);

CREATE TABLE question (
    question_id SERIAL PRIMARY KEY,
    question_type question_type_enum NOT NULL,
    prompt TEXT NOT NULL,
    max_grade FLOAT NOT NULL,
    num_choices INT NOT NULL DEFAULT 0,
    prog_lang VARCHAR(30) NOT NULL DEFAULT '',
    lang_version VARCHAR(30) NOT NULL DEFAULT '',
    code_snippet TEXT,
    time_limit_sec INT,
    memory_limit_bytes BIGINT,
    assessment_id INT NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE
);

CREATE TABLE choice (
    choice_id SERIAL PRIMARY KEY,
    is_true_answer BOOLEAN NOT NULL,
    choice_body TEXT NOT NULL,
    question_id INT NOT NULL REFERENCES question(question_id) ON DELETE CASCADE
);

CREATE TABLE student_assessment (
    id SERIAL PRIMARY KEY,
    grade FLOAT,
    percent FLOAT,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assessment_id INT NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    date_submitted DATE,
    time_submitted TIME,
    UNIQUE (student_id, assessment_id)
);

CREATE TABLE student_question_answer (
    id SERIAL PRIMARY KEY,
    grade FLOAT,
    answer TEXT NOT NULL DEFAULT '',
    active_time_sec INT,
    stale_time_sec INT,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES question(question_id) ON DELETE CASCADE,
    UNIQUE (student_id, question_id)
);

CREATE TABLE student_access_assessments (
    id SERIAL PRIMARY KEY,
    can_access BOOLEAN NOT NULL,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assessment_id INT NOT NULL REFERENCES assessment(assessment_id) ON DELETE CASCADE,
    UNIQUE (student_id, assessment_id)
);

CREATE TABLE question_feedback (
    id SERIAL PRIMARY KEY,
    feedback TEXT,
    resolved BOOLEAN DEFAULT false,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES question(question_id) ON DELETE CASCADE,
    student_question_answer_id INT NOT NULL REFERENCES student_question_answer(id) ON DELETE CASCADE
);

CREATE TABLE proctoring_event (
    id SERIAL PRIMARY KEY,
    student_assessment_id INT NOT NULL REFERENCES student_assessment(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- When a student_assessment row is deleted, remove that student's answers
-- for questions belonging to the same assessment.
CREATE OR REPLACE FUNCTION cascade_student_assessment_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM student_question_answer sqa
  USING question q
  WHERE sqa.question_id = q.question_id
    AND q.assessment_id = OLD.assessment_id
    AND sqa.student_id = OLD.student_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cascade_student_assessment_delete
BEFORE DELETE ON student_assessment
FOR EACH ROW
EXECUTE FUNCTION cascade_student_assessment_delete();
