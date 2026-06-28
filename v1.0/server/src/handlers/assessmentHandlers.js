import db from "../../db/index.js";

const TIMED_ASSESSMENT_TYPES = new Set(["QUIZ", "EXAM"]);

async function canManageCourse(courseId, userId, role) {
  if (role === "INSTRUCTOR") {
    const result = await db.query(
      "SELECT 1 FROM course WHERE course_id = $1 AND instructor_id = $2",
      [courseId, userId],
    );
    return result.rows.length > 0;
  }

  if (role === "TA") {
    const result = await db.query(
      "SELECT 1 FROM ta_course WHERE course_id = $1 AND ta_id = $2",
      [courseId, userId],
    );
    return result.rows.length > 0;
  }

  return false;
}

const QUESTION_TYPE_SUBQUERY = `(SELECT q.question_type FROM question q WHERE q.assessment_id = a.assessment_id LIMIT 1) AS question_type`;

const mapAssessment = (row) => ({
  assessment_id: row.assessment_id,
  title: row.title,
  max_grade: row.max_grade,
  is_published: row.is_published,
  due_date: row.due_date ?? null,
  due_time: row.due_time ?? null,
  question_type: row.question_type ?? null,
  date_submitted: row.date_submitted ?? null,
  time_submitted: row.time_submitted ?? null,
});

const mapQuiz = (row) => ({
  ...mapAssessment(row),
  duration: row.duration,
  is_closed: row.is_closed ?? false,
  ...(row.has_submitted !== undefined && {
    has_submitted: Boolean(row.has_submitted),
  }),
});

async function upsertStudentAccess(studentId, assessmentId, canAccess) {
  const existing = await db.query(
    "SELECT id FROM student_access_assessments WHERE student_id = $1 AND assessment_id = $2",
    [studentId, assessmentId],
  );

  if (existing.rows.length > 0) {
    await db.query(
      "UPDATE student_access_assessments SET can_access = $1 WHERE student_id = $2 AND assessment_id = $3",
      [canAccess, studentId, assessmentId],
    );
    return;
  }

  await db.query(
    "INSERT INTO student_access_assessments (can_access, student_id, assessment_id) VALUES ($1, $2, $3)",
    [canAccess, studentId, assessmentId],
  );
}

export const getAssignmentsByCourseId = async (req, res) => {
  const { courseId } = req.params;
  const { user_id: userId, role } = req.user;
  try {
    const existCourse = await db.query(
      "SELECT * FROM course WHERE course_id = $1",
      [courseId],
    );
    if (existCourse.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (role === "STUDENT") {
      const result = await db.query(
        `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time,
                a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY},
                (sa_sub.id IS NOT NULL) AS has_submitted, TO_CHAR(sa_sub.date_submitted, 'YYYY-MM-DD') AS date_submitted, sa_sub.time_submitted AS time_submitted
         FROM assessment a
         INNER JOIN student_access_assessments saa ON saa.assessment_id = a.assessment_id
         LEFT JOIN student_assessment sa_sub
           ON sa_sub.assessment_id = a.assessment_id
          AND sa_sub.student_id = $2
         WHERE a.course_id = $1
           AND a.assess_type = 'ASSIGNMENT'
           AND saa.student_id = $2
           AND saa.can_access = true
           AND a.is_published = true`,
        [courseId, userId],
      );
      return res.status(200).json(result.rows.map(mapQuiz));
    }
    const result = await db.query(
      "SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time, a.is_published, a.is_closed FROM assessment WHERE course_id = $1 AND assess_type = 'ASSIGNMENT'",
      [courseId],
    );
    return res.status(200).json(result.rows.map(mapQuiz));
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: `Failed to fetch ${label}` });
  }
};
async function getTimedAssessmentsByCourseId(req, res, assessType) {
  const { courseId } = req.params;
  const { user_id: userId, role } = req.user;
  const label = assessType === "QUIZ" ? "quizzes" : "exams";

  try {
    const existCourse = await db.query(
      "SELECT * FROM course WHERE course_id = $1",
      [courseId],
    );
    if (existCourse.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (role === "STUDENT") {
      const result = await db.query(
        `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time,
                a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY},
                (sa_sub.id IS NOT NULL) AS has_submitted
         FROM assessment a
         INNER JOIN student_access_assessments saa ON saa.assessment_id = a.assessment_id
         LEFT JOIN student_assessment sa_sub
           ON sa_sub.assessment_id = a.assessment_id
          AND sa_sub.student_id = $2
         WHERE a.course_id = $1
           AND a.assess_type = $3
           AND saa.student_id = $2
           AND saa.can_access = true
           AND a.is_published = true`,
        [courseId, userId, assessType],
      );
      return res.status(200).json(result.rows.map(mapQuiz));
    }

    const result = await db.query(
      `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time,
              a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY}
       FROM assessment a
       WHERE a.course_id = $1 AND a.assess_type = $2`,
      [courseId, assessType],
    );
    return res.status(200).json(result.rows.map(mapQuiz));
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: `Failed to fetch ${label}` });
  }
}

export const getQuizzesByCourseId = (req, res) =>
  getTimedAssessmentsByCourseId(req, res, "QUIZ");

export const getExamsByCourseId = (req, res) =>
  getTimedAssessmentsByCourseId(req, res, "EXAM");

export const getAllowedStudentsByAssessmentId = async (req, res) => {
  const { assessmentId } = req.params;
  const { user_id: userId, role } = req.user;

  if (role !== "INSTRUCTOR" && role !== "TA") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const assessment = await db.query(
      `SELECT assessment_id, course_id, assess_type
       FROM assessment
       WHERE assessment_id = $1`,
      [assessmentId],
    );

    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const row = assessment.rows[0];
    if (!TIMED_ASSESSMENT_TYPES.has(row.assess_type)) {
      return res.status(400).json({
        error: "Only quizzes and exams have selective student access",
      });
    }

    const allowed = await canManageCourse(row.course_id, userId, role);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await db.query(
      `SELECT u.user_id, u.name, u.email
       FROM users u
       INNER JOIN student_access_assessments saa
         ON saa.student_id = u.user_id
       INNER JOIN student_course sc
         ON sc.student_id = u.user_id
        AND sc.course_id = $2
       WHERE saa.assessment_id = $1
         AND saa.can_access = true
       ORDER BY u.name`,
      [assessmentId, row.course_id],
    );

    const students = result.rows.map((student) => ({
      user_id: student.user_id,
      name: student.name,
      email: student.email,
    }));

    return res.status(200).json({
      students,
      student_ids: students.map((student) => student.user_id),
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to fetch allowed students" });
  }
};

export const toggleAssessmentPublish = async (req, res) => {
  const { assessmentId } = req.params;
  const { is_published, publish_mode, student_ids } = req.body;
  const { user_id: userId, role } = req.user;

  if (role !== "INSTRUCTOR" && role !== "TA") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (typeof is_published !== "boolean") {
    return res
      .status(400)
      .json({ error: "is_published must be a boolean value" });
  }

  try {
    const assessment = await db.query(
      `SELECT a.assessment_id, a.course_id, a.title, a.max_grade, a.is_published,
              a.assess_type, a.duration, a.is_closed, ${QUESTION_TYPE_SUBQUERY}
       FROM assessment a
       WHERE a.assessment_id = $1`,
      [assessmentId],
    );

    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const row = assessment.rows[0];
    const courseId = row.course_id;
    const allowed = await canManageCourse(courseId, userId, role);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const students = await db.query(
      "SELECT student_id FROM student_course WHERE course_id = $1",
      [courseId],
    );

    if (TIMED_ASSESSMENT_TYPES.has(row.assess_type) && is_published === true) {
      if (publish_mode !== "all" && publish_mode !== "selected") {
        return res.status(400).json({
          error:
            "publish_mode must be 'all' or 'selected' when publishing a quiz or exam",
        });
      }

      try {
        await db.query("BEGIN");

        await db.query(
          "UPDATE assessment SET is_published = true WHERE assessment_id = $1",
          [assessmentId],
        );

        if (publish_mode === "all") {
          for (const student of students.rows) {
            await upsertStudentAccess(student.student_id, assessmentId, true);
          }
        } else {
          if (!Array.isArray(student_ids) || student_ids.length === 0) {
            await db.query("ROLLBACK");
            return res.status(400).json({
              error:
                "student_ids must be a non-empty array for selected publish",
            });
          }

          const enrolled = await db.query(
            "SELECT student_id FROM student_course WHERE course_id = $1 AND student_id = ANY($2::int[])",
            [courseId, student_ids],
          );

          if (enrolled.rows.length !== student_ids.length) {
            await db.query("ROLLBACK");
            return res.status(400).json({
              error: "One or more students are not enrolled in this course",
            });
          }

          for (const studentId of student_ids) {
            await upsertStudentAccess(studentId, assessmentId, true);
          }
        }

        await db.query("COMMIT");
      } catch (transactionError) {
        await db.query("ROLLBACK");
        throw transactionError;
      }

      const updated = await db.query(
        `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time,
                a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY}
         FROM assessment a
         WHERE a.assessment_id = $1`,
        [assessmentId],
      );

      return res.status(200).json(mapQuiz(updated.rows[0]));
    }

    const result = await db.query(
      `UPDATE assessment
       SET is_published = $1
       WHERE assessment_id = $2
       RETURNING assessment_id, title, max_grade, is_published, duration, due_date, due_time, is_closed`,
      [is_published, assessmentId],
    );

    for (const student of students.rows) {
      await upsertStudentAccess(student.student_id, assessmentId, true);
    }

    if (TIMED_ASSESSMENT_TYPES.has(row.assess_type)) {
      const withType = await db.query(
        `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time,
                a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY}
         FROM assessment a
         WHERE a.assessment_id = $1`,
        [assessmentId],
      );
      return res.status(200).json(mapQuiz(withType.rows[0]));
    }

    return res.status(200).json(mapAssessment(result.rows[0]));
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to update assessment" });
  }
};

export const toggleAssessmentClose = async (req, res) => {
  const { assessmentId } = req.params;
  const { is_closed } = req.body;
  const { user_id: userId, role } = req.user;

  if (role !== "INSTRUCTOR" && role !== "TA") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (typeof is_closed !== "boolean") {
    return res.status(400).json({ error: "is_closed must be a boolean value" });
  }

  try {
    const assessment = await db.query(
      `SELECT a.assessment_id, a.course_id, a.assess_type
       FROM assessment a
       WHERE a.assessment_id = $1`,
      [assessmentId],
    );

    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const row = assessment.rows[0];
    if (!TIMED_ASSESSMENT_TYPES.has(row.assess_type)) {
      return res.status(400).json({
        error: "Only quizzes and exams can be closed",
      });
    }

    const allowed = await canManageCourse(row.course_id, userId, role);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.query(
      "UPDATE assessment SET is_closed = $1 WHERE assessment_id = $2",
      [is_closed, assessmentId],
    );

    const updated = await db.query(
      `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time,
              a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY}
       FROM assessment a
       WHERE a.assessment_id = $1`,
      [assessmentId],
    );

    return res.status(200).json(mapQuiz(updated.rows[0]));
  } catch (error) {
    console.log("Error: ", error);
    return res
      .status(500)
      .json({ error: "Failed to update assessment close state" });
  }
};

export const toggleQuizClose = toggleAssessmentClose;

export const deleteAssessment = async (req, res) => {
  const { assessmentId } = req.params;
  const { user_id: userId, role } = req.user;
  if (role !== "INSTRUCTOR" && role !== "TA") {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const assessment = await db.query(
      "SELECT * FROM assessment WHERE assessment_id = $1",
      [assessmentId],
    );
    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    const row = assessment.rows[0];
    const allowed = await canManageCourse(row.course_id, userId, role);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.query("DELETE FROM assessment WHERE assessment_id = $1", [
      assessmentId,
    ]);
    return res.status(200).json({ message: "Assessment deleted successfully" });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to delete assessment" });
  }
};

export const createAssessment = async (req, res) => {
  const { courseId } = req.params;
  const {
    title,
    duration,
    maxGrade,
    dueDate,
    dueTime,
    type,
    securitySettings,
    questions,
  } = req.body;

  try {
    const course = await db.query("SELECT * FROM course WHERE course_id = $1", [
      courseId,
    ]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }
    const alreadyExists = await db.query(
      "SELECT * FROM assessment WHERE title = $1 AND course_id = $2",
      [title, courseId],
    );
    if (alreadyExists.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Assessment with this title already exists" });
    }
    const assessment = await db.query(
      "INSERT INTO assessment (title, assess_type, duration, max_grade, due_date, due_time, course_id, is_published, is_closed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING assessment_id, assess_type",
      [
        title,
        type,
        duration,
        maxGrade,
        dueDate,
        dueTime,
        courseId,
        false,
        false,
      ],
    );
    const assessmentId = assessment.rows[0].assessment_id;
    for (const question of questions) {
      const questionsResult = await db.query(
        "INSERT INTO question (question_type, prompt, max_grade, prog_lang, lang_version, num_choices, assessment_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          question.qType,
          question.qPrompt,
          question.qMaxGrade,
          question.progLang || "",
          question.langVersion || "",
          question.options.length,
          assessmentId,
        ],
      );
      const questionId = questionsResult.rows[0].question_id;
      if (question.qType === "MCQ") {
        for (const option of question.options) {
          await db.query(
            "INSERT INTO choice (is_true_answer, choice_body, question_id) VALUES ($1, $2, $3)",
            [false, option, questionId],
          );
        }
      }
    }
    await db.query(
      "INSERT INTO security_settings (windowswitching, clipboardaccess, screensnapshot, questionstats, assessment_id) VALUES ($1, $2, $3, $4, $5)",
      [
        securitySettings.windowSwitching,
        securitySettings.clipboardAccess,
        securitySettings.screenSnapshot,
        securitySettings.questionStats,
        assessmentId,
      ],
    );
    return res.status(200).json(assessment.rows[0]);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to create assessment" });
  }
};

export const updateAssessment = async (req, res) => {
  const { assessmentId } = req.params;
  const {
    title,
    duration,
    maxGrade,
    dueDate,
    dueTime,
    type,
    securitySettings,
    questions,
  } = req.body;
  const { user_id: userId, role } = req.user;

  const isDbQuestionId = (id) => {
    const numericId = Number(id);
    return (
      Number.isInteger(numericId) && numericId > 0 && numericId <= 2147483647
    );
  };

  const upsertQuestionChoices = async (question) => {
    await db.query("DELETE FROM choice WHERE question_id = $1", [
      question.questionId,
    ]);

    if (question.qType !== "MCQ") {
      return;
    }

    for (const option of question.options || []) {
      await db.query(
        "INSERT INTO choice (is_true_answer, choice_body, question_id) VALUES ($1, $2, $3)",
        [false, option, question.questionId],
      );
    }
  };

  try {
    const assessment = await db.query(
      "SELECT * FROM assessment WHERE assessment_id = $1",
      [assessmentId],
    );
    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    const row = assessment.rows[0];
    const allowed = await canManageCourse(row.course_id, userId, role);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const newAssessment = await db.query(
      "UPDATE assessment SET title = $1, duration = $2, max_grade = $3, due_date = $4, due_time = $5, assess_type = $6 WHERE assessment_id = $7 RETURNING *",
      [title, duration, maxGrade, dueDate, dueTime, type, assessmentId],
    );
    const newAssessmentId = newAssessment.rows[0].assessment_id;

    const existingQuestions = await db.query(
      "SELECT question_id FROM question WHERE assessment_id = $1",
      [assessmentId],
    );
    const existingQuestionIds = new Set(
      existingQuestions.rows.map((questionRow) => questionRow.question_id),
    );
    const keptQuestionIds = new Set();

    for (const question of questions) {
      const questionId = Number(question.id);
      const isExistingQuestion =
        isDbQuestionId(question.id) && existingQuestionIds.has(questionId);

      let savedQuestionId;

      if (isExistingQuestion) {
        const questionsResult = await db.query(
          "UPDATE question SET question_type = $1, prompt = $2, max_grade = $3, prog_lang = $4, lang_version = $5, num_choices = $6 WHERE question_id = $7 AND assessment_id = $8 RETURNING question_id",
          [
            question.qType,
            question.qPrompt,
            question.qMaxGrade,
            question.progLang || "",
            question.langVersion || "",
            (question.options || []).length,
            questionId,
            assessmentId,
          ],
        );

        if (questionsResult.rows.length === 0) {
          continue;
        }

        savedQuestionId = questionsResult.rows[0].question_id;
      } else {
        const questionsResult = await db.query(
          "INSERT INTO question (question_type, prompt, max_grade, prog_lang, lang_version, num_choices, assessment_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING question_id",
          [
            question.qType,
            question.qPrompt,
            question.qMaxGrade,
            question.progLang || "",
            question.langVersion || "",
            (question.options || []).length,
            assessmentId,
          ],
        );
        savedQuestionId = questionsResult.rows[0].question_id;
      }

      keptQuestionIds.add(savedQuestionId);
      await upsertQuestionChoices({ ...question, questionId: savedQuestionId });
    }

    for (const existingQuestionId of existingQuestionIds) {
      if (!keptQuestionIds.has(existingQuestionId)) {
        await db.query("DELETE FROM choice WHERE question_id = $1", [
          existingQuestionId,
        ]);
        await db.query("DELETE FROM question WHERE question_id = $1", [
          existingQuestionId,
        ]);
      }
    }

    await db.query(
      "UPDATE security_settings SET windowswitching = $1, clipboardaccess = $2, screensnapshot = $3, questionstats = $4 WHERE assessment_id = $5",
      [
        securitySettings.windowSwitching,
        securitySettings.clipboardAccess,
        securitySettings.screenSnapshot,
        securitySettings.questionStats,
        newAssessmentId,
      ],
    );
    return res.status(200).json(newAssessment.rows[0]);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to update assessment" });
  }
};

export const getAssessmentById = async (req, res) => {
  const { assessmentId } = req.params;
  try {
    const assessment = await db.query(
      "SELECT * FROM assessment WHERE assessment_id = $1",
      [assessmentId],
    );
    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    const row = assessment.rows[0];
    const securitySettings = await db.query(
      "SELECT * FROM security_settings WHERE assessment_id = $1",
      [assessmentId],
    );
    const questions = await db.query(
      "SELECT * FROM question WHERE assessment_id = $1",
      [assessmentId],
    );

    const questionsWithOptions = await Promise.all(
      questions.rows.map(async (question) => {
        if (question.question_type !== "MCQ") {
          return { ...question, options: [] };
        }

        const choices = await db.query(
          "SELECT choice_body FROM choice WHERE question_id = $1 ORDER BY choice_id",
          [question.question_id],
        );

        return {
          ...question,
          options: choices.rows.map((choice) => choice.choice_body),
        };
      }),
    );

    return res.status(200).json({
      assessment: row,
      securitySettings: securitySettings.rows[0],
      questions: questionsWithOptions,
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to get assessment by id" });
  }
};

export const submitAssessment = async (req, res) => {
  const { assessmentId } = req.params;
  const answersByQuestion = req.body?.answers ?? req.body;
  const { user_id: userId } = req.user;

  if (!answersByQuestion || typeof answersByQuestion !== "object") {
    return res.status(400).json({ error: "Answers are required" });
  }

  try {
    const assessment = await db.query(
      "SELECT assessment_id FROM assessment WHERE assessment_id = $1",
      [assessmentId],
    );
    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const existingSubmission = await db.query(
      `SELECT id FROM student_assessment
       WHERE student_id = $1 AND assessment_id = $2`,
      [userId, assessmentId],
    );
    if (existingSubmission.rows.length > 0) {
      return res.status(400).json({ error: "Assessment already submitted" });
    }

    const questions = await db.query(
      "SELECT question_id FROM question WHERE assessment_id = $1",
      [assessmentId],
    );
    if (questions.rows.length === 0) {
      return res.status(404).json({ error: "Questions not found" });
    }

    await db.query("BEGIN");

    for (const question of questions.rows) {
      const questionId = question.question_id;
      const rawAnswer =
        answersByQuestion[questionId]?.answer ??
        answersByQuestion[String(questionId)]?.answer;
      const answer =
        rawAnswer === undefined || rawAnswer === null ? "" : String(rawAnswer);

      await db.query(
        `INSERT INTO student_question_answer
          (grade, answer, active_time_sec, stale_time_sec, student_id, question_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [0, answer, 0, 0, userId, questionId],
      );
    }

    const submission = await db.query(
      `INSERT INTO student_assessment (grade, percent, student_id, assessment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [0, 0, userId, assessmentId],
    );

    if (submission.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({ error: "Failed to submit assessment" });
    }

    await db.query("COMMIT");

    return res
      .status(200)
      .json({ message: "Assessment submitted successfully" });
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {
      // No active transaction to roll back.
    }
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to submit assessment" });
  }
};
