CREATE TYPE role_enum AS ENUM ('INSTRUCTOR' , 'STUDENT', 'TA', 'ADMIN');
CREATE TYPE assess_type_enum AS ENUM ('EXAM' , 'QUIZ', 'ASSIGNMENT');
CREATE TYPE question_type_enum AS ENUM ('CODING' , 'ESSAY', 'MCQ');

CREATE TABLE Users
(
    user_id SERIAL PRIMARY KEY,
    auc_id CHAR(9) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(64) NOT NULL,
    role ROLE_ENUM NOT NULL,
    department VARCHAR(50) NOT NULL
);

CREATE TABLE Course(
    course_id SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL,
    enrollementKey VARCHAR(50) NOT NULL,
    courseTitle VARCHAR(50) NOT NULL,
    num_student INT NOT NULL,
    IsOpenEnrollement BOOLEAN NOT NULL,
    classroom VARCHAR(32) NOT NULL DEFAULT '',
    meeting_time VARCHAR(45) NOT NULL DEFAULT '',
    FOREIGN KEY (instructor_id) REFERENCES Users(user_id)
);

CREATE TABLE TA_COURSE(
	id SERIAL NOT NULL,
    course_id INT NOT NULL,
    TA_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (TA_id) REFERENCES Users(user_id)
);

CREATE TABLE Student_Course
(
    id SERIAL NOT NULL,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (student_id) REFERENCES Users(user_id)
);

CREATE TABLE Assessment
(
    assessment_id SERIAL NOT NULL,
    assess_type ASSESS_TYPE_ENUM NOT NULL,
    title VARCHAR(50) NOT NULL,
    duration INT NOT NULL,
    max_grade FLOAT NOT NULL,
    due_date DATE,
    due_time TIME,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    course_id INT NOT NULL,
    PRIMARY KEY (assessment_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

CREATE TABLE Security_Settings
(
    id SERIAL NOT NULL,
    windowSwitching BOOLEAN NOT NULL,
    clipboardAccess BOOLEAN NOT NULL,
    screenSnapshot BOOLEAN NOT NULL,
    questionStats BOOLEAN NOT NULL,
    assessment_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (assessment_id) REFERENCES Assessment(assessment_id)
);

CREATE TABLE Question
(
    question_id SERIAL NOT NULL,
    question_type QUESTION_TYPE_ENUM NOT NULL,
    prompt VARCHAR(1000) NOT NULL,
    max_grade FLOAT NOT NULL,
    num_choices INT NOT NULL,
    prog_lang VARCHAR(30) NOT NULL,
    lang_version VARCHAR(30) NOT NULL,
    assessment_id INT NOT NULL,
    PRIMARY KEY (question_id),
    FOREIGN KEY (assessment_id) REFERENCES Assessment(assessment_id)
);

CREATE TABLE Student_Assessment
(
    id SERIAL NOT NULL,
    grade FLOAT NOT NULL,
    percent FLOAT NOT NULL,
    student_id INT NOT NULL,
    assessment_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES Users(user_id),
    FOREIGN KEY (assessment_id) REFERENCES Assessment(assessment_id)
);

CREATE TABLE Student_Question_Answer
(
    id SERIAL NOT NULL,
    grade FLOAT NOT NULL,
    answer VARCHAR(1000) NOT NULL,
    active_time_sec INT NOT NULL,
    stale_time_sec INT NOT NULL,
    student_id INT NOT NULL,
    question_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (student_id) REFERENCES Users(user_id),
    FOREIGN KEY (question_id) REFERENCES Question(question_id)
);

CREATE TABLE choice
(
    choice_id SERIAL NOT NULL,
    is_true_answer BOOLEAN NOT NULL,
    choice_body VARCHAR(1000) NOT NULL,
    question_id INT NOT NULL,
    PRIMARY KEY (choice_id),
    FOREIGN KEY (question_id) REFERENCES Question(question_id)
);


CREATE TABLE student_access_assessments(
id SERIAL NOT NULL PRIMARY KEY,
can_access BOOLEAN NOT NULL,
student_id INT NOT NULL,
assessment_id INT NOT NULL,
FOREIGN KEY (student_id) REFERENCES users(user_id),
FOREIGN KEY (assessment_id) REFERENCES assessment(assessment_id)
)


CREATE TABLE question_feedback(
id SERIAL PRIMARY KEY,
feedback VARCHAR(1000), 
resolved BOOLEAN DEFAULT FALSE,
user_id INT NOT NULL,
question_id INT NOT NULL,
student_question_answer_id INT NOT NULL,
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
FOREIGN KEY (question_id) REFERENCES question(question_id) ON DELETE CASCADE,
FOREIGN KEY (student_question_answer_id) REFERENCES student_question_answer(id) ON DELETE CASCADE);