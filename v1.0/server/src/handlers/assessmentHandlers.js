import db, { txHttpError, withTransaction } from "../../db/index.js";
import {
  assessmentRequiresDesktop,
  normalizeSecuritySettings,
} from "../utils/securitySettings.js";

const TIMED_ASSESSMENT_TYPES = new Set(["QUIZ", "EXAM"]);
const MAX_INT32 = 2147483647;
const BYTES_PER_MB = 1024 * 1024;

function normalizeQuestionLimits(question) {
  const timeRaw = question.timeLimit;
  const memoryRaw = question.memoryLimit;

  const timeLimitSec =
    timeRaw === undefined || timeRaw === null || timeRaw === ""
      ? null
      : Number(timeRaw);
  const memoryLimitMb =
    memoryRaw === undefined || memoryRaw === null || memoryRaw === ""
      ? null
      : Number(memoryRaw);

  if (
    timeLimitSec !== null &&
    (!Number.isInteger(timeLimitSec) || timeLimitSec < 0 || timeLimitSec > MAX_INT32)
  ) {
    return {
      error:
        "Time limit must be a whole number of seconds between 0 and 2147483647.",
    };
  }

  if (
    memoryLimitMb !== null &&
    (!Number.isInteger(memoryLimitMb) || memoryLimitMb < 0)
  ) {
    return {
      error: "Memory limit must be a whole number of megabytes (0 or more).",
    };
  }

  const memoryLimitBytes =
    memoryLimitMb === null ? null : memoryLimitMb * BYTES_PER_MB;

  if (memoryLimitBytes !== null && memoryLimitBytes > MAX_INT32) {
    return {
      error: "Memory limit is too large. Maximum supported value is 2047 MB.",
    };
  }

  return { timeLimitSec, memoryLimitBytes };
}

async function canManageCourse(courseId, userId, role) {
  if (role === "INSTRUCTOR") {
    const owned = await db.query(
      "SELECT 1 FROM course WHERE course_id = $1 AND instructor_id = $2",
      [courseId, userId],
    );
    if (owned.rows.length > 0) {
      return true;
    }
    const asTa = await db.query(
      "SELECT 1 FROM ta_course WHERE course_id = $1 AND ta_id = $2",
      [courseId, userId],
    );
    return asTa.rows.length > 0;
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

async function getAssessmentCourseId(assessmentId) {
  const result = await db.query(
    `SELECT course_id FROM assessment WHERE assessment_id = $1`,
    [assessmentId],
  );
  return result.rows[0]?.course_id ?? null;
}

async function canAccessStudentFeedback(assessmentId, studentId, userId, role) {
  if (role === "STUDENT") {
    return Number(userId) === Number(studentId);
  }

  if (role === "INSTRUCTOR" || role === "TA") {
    const courseId = await getAssessmentCourseId(assessmentId);
    if (!courseId) return false;
    return canManageCourse(courseId, userId, role);
  }

  return false;
}

function isGraderRole(role) {
  return role === "INSTRUCTOR" || role === "TA";
}

async function getLatestStudentAnswerId(studentId, questionId) {
  const result = await db.query(
    `SELECT id FROM student_question_answer
     WHERE student_id = $1 AND question_id = $2
     ORDER BY id DESC
     LIMIT 1`,
    [studentId, questionId],
  );
  return result.rows[0]?.id ?? null;
}

async function getOrCreateStudentAnswerId(studentId, questionId) {
  const existingId = await getLatestStudentAnswerId(studentId, questionId);
  if (existingId) return existingId;

  const insertResult = await db.query(
    `INSERT INTO student_question_answer
      (grade, answer, active_time_sec, stale_time_sec, student_id, question_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [0, "", 0, 0, studentId, questionId],
  );
  return insertResult.rows[0].id;
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

async function upsertStudentAccess(
  studentId,
  assessmentId,
  canAccess,
  client = db,
) {
  const existing = await client.query(
    "SELECT id FROM student_access_assessments WHERE student_id = $1 AND assessment_id = $2",
    [studentId, assessmentId],
  );

  if (existing.rows.length > 0) {
    await client.query(
      "UPDATE student_access_assessments SET can_access = $1 WHERE student_id = $2 AND assessment_id = $3",
      [canAccess, studentId, assessmentId],
    );
    return;
  }

  await client.query(
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
                (sa_sub.date_submitted IS NOT NULL) AS has_submitted, TO_CHAR(sa_sub.date_submitted, 'YYYY-MM-DD') AS date_submitted, sa_sub.time_submitted AS time_submitted
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
      `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time, a.is_published, a.is_closed 
      FROM assessment a WHERE course_id = $1 AND assess_type = 'ASSIGNMENT'`,
      [courseId],
    );
    return res.status(200).json(result.rows.map(mapQuiz));
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: `Failed to fetch assignments` });
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
                a.is_published, a.is_closed, ${QUESTION_TYPE_SUBQUERY}, TO_CHAR(sa_sub.date_submitted, 'YYYY-MM-DD') AS date_submitted, sa_sub.time_submitted,
                (sa_sub.date_submitted IS NOT NULL) AS has_submitted
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
      return res.status(200).json(result.rows);
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
        await withTransaction(async (client) => {
          await client.query(
            "UPDATE assessment SET is_published = true WHERE assessment_id = $1",
            [assessmentId],
          );

          if (publish_mode === "all") {
            for (const student of students.rows) {
              await upsertStudentAccess(
                student.student_id,
                assessmentId,
                true,
                client,
              );
            }
          } else {
            if (!Array.isArray(student_ids) || student_ids.length === 0) {
              throw txHttpError(
                400,
                "student_ids must be a non-empty array for selected publish",
              );
            }

            const enrolled = await client.query(
              "SELECT student_id FROM student_course WHERE course_id = $1 AND student_id = ANY($2::int[])",
              [courseId, student_ids],
            );

            if (enrolled.rows.length !== student_ids.length) {
              throw txHttpError(
                400,
                "One or more students are not enrolled in this course",
              );
            }

            for (const studentId of student_ids) {
              await upsertStudentAccess(studentId, assessmentId, true, client);
            }
          }
        });
      } catch (transactionError) {
        if (transactionError.statusCode) {
          return res.status(transactionError.statusCode).json({
            error: transactionError.message,
          });
        }
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
      const normalizedLimits = normalizeQuestionLimits(question);
      if (normalizedLimits.error) {
        return res.status(400).json({ error: normalizedLimits.error });
      }

      const questionsResult = await db.query(
        "INSERT INTO question (question_type, prompt, max_grade, prog_lang, lang_version, num_choices, code_snippet, time_limit_sec, memory_limit_bytes, assessment_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [
          question.qType,
          question.qPrompt,
          question.qMaxGrade,
          question.progLang || "",
          question.langVersion || "",
          question.options.length,
          question.codeSnippet || null,
          normalizedLimits.timeLimitSec,
          normalizedLimits.memoryLimitBytes,
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
      `INSERT INTO security_settings
        (windowswitching, clipboardaccess, screensnapshot, questionstats, networkrestriction, processmonitoring, assessment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        securitySettings.windowSwitching,
        securitySettings.clipboardAccess,
        securitySettings.screenSnapshot,
        securitySettings.questionStats,
        securitySettings.networkRestriction ?? false,
        securitySettings.processMonitoring ?? false,
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

      const normalizedLimits = normalizeQuestionLimits(question);
      if (normalizedLimits.error) {
        return res.status(400).json({ error: normalizedLimits.error });
      }

      let savedQuestionId;

      if (isExistingQuestion) {
        const questionsResult = await db.query(
          "UPDATE question SET question_type = $1, prompt = $2, max_grade = $3, prog_lang = $4, lang_version = $5, num_choices = $6, code_snippet = $7, time_limit_sec = $8, memory_limit_bytes = $9 WHERE question_id = $10 AND assessment_id = $11 RETURNING question_id",
          [
            question.qType,
            question.qPrompt,
            question.qMaxGrade,
            question.progLang || "",
            question.langVersion || "",
            (question.options || []).length,
            question.codeSnippet || null,
            normalizedLimits.timeLimitSec,
            normalizedLimits.memoryLimitBytes,
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
          "INSERT INTO question (question_type, prompt, max_grade, prog_lang, lang_version, num_choices, code_snippet, time_limit_sec, memory_limit_bytes, assessment_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING question_id",
          [
            question.qType,
            question.qPrompt,
            question.qMaxGrade,
            question.progLang || "",
            question.langVersion || "",
            (question.options || []).length,
            question.codeSnippet || null,
            normalizedLimits.timeLimitSec,
            normalizedLimits.memoryLimitBytes,
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
      `UPDATE security_settings
       SET windowswitching = $1,
           clipboardaccess = $2,
           screensnapshot = $3,
           questionstats = $4,
           networkrestriction = $5,
           processmonitoring = $6
       WHERE assessment_id = $7`,
      [
        securitySettings.windowSwitching,
        securitySettings.clipboardAccess,
        securitySettings.screenSnapshot,
        securitySettings.questionStats,
        securitySettings.networkRestriction ?? false,
        securitySettings.processMonitoring ?? false,
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

    const questionsTemplate = await Promise.all(
      questions.rows.map(async (question) => {
        if (question.question_type === "MCQ") {
          const choices = await db.query(
            "SELECT choice_body FROM choice WHERE question_id = $1 ORDER BY choice_id",
            [question.question_id],
          );
          question = {
            ...question,
            options: choices.rows.map((choice) => choice.choice_body),
          };
        }

        if (question.code_snippet) {
          question = { ...question, codeSnippet: question.code_snippet };
        }
        return question;
      }),
    );

    const securityRow = securitySettings.rows[0] ?? null;
    const normalizedSecuritySettings = normalizeSecuritySettings(securityRow);

    return res.status(200).json({
      assessment: row,
      securitySettings: securityRow,
      normalizedSecuritySettings,
      requiresDesktop: assessmentRequiresDesktop(securityRow),
      questions: questionsTemplate,
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to get assessment by id" });
  }
};

export const submitAssessment = async (req, res) => {
  const { assessmentId } = req.params;
  const answersByQuestion = req.body?.answers ?? req.body;

  const todayDate =
    req.body?.todayDate ?? new Date().toLocaleDateString("en-CA");

  const todayTime =
    req.body?.todayTime ?? new Date().toLocaleTimeString("en-CA");

  const { user_id: userId } = req.user;

  if (!answersByQuestion || typeof answersByQuestion !== "object") {
    return res.status(400).json({ error: "Answers are required" });
  }

  try {
    const message = await withTransaction(async (client) => {
      // Verify assessment exists
      const assessment = await client.query(
        "SELECT assessment_id FROM assessment WHERE assessment_id = $1",
        [assessmentId],
      );

      if (assessment.rows.length === 0) {
        throw txHttpError(404, "Assessment not found");
      }

      // Get all questions
      const questions = await client.query(
        "SELECT question_id FROM question WHERE assessment_id = $1",
        [assessmentId],
      );

      if (questions.rows.length === 0) {
        throw txHttpError(404, "Questions not found");
      }

      // Check whether the student has already submitted
      const existingSubmission = await client.query(
        `SELECT id
         FROM student_assessment
         WHERE student_id = $1
           AND assessment_id = $2`,
        [userId, assessmentId],
      );

      let submitMessage;

      if (existingSubmission.rows.length > 0) {
        await client.query(
          `UPDATE student_assessment
           SET date_submitted = $1,
               time_submitted = $2
           WHERE student_id = $3
             AND assessment_id = $4`,
          [todayDate, todayTime, userId, assessmentId],
        );

        submitMessage = "Assessment Updated Successfully";
      } else {
        await client.query(
          `INSERT INTO student_assessment
            (grade, percent, student_id, assessment_id, date_submitted, time_submitted)
           VALUES
            (NULL, NULL, $1, $2, $3, $4)`,
          [userId, assessmentId, todayDate, todayTime],
        );

        submitMessage = "Assessment Submitted Successfully";
      }

      // Insert or update each answer
      for (const question of questions.rows) {
        const questionId = question.question_id;

        const rawAnswer =
          answersByQuestion[questionId]?.answer ??
          answersByQuestion[String(questionId)]?.answer;

        const answer =
          rawAnswer === undefined || rawAnswer === null
            ? ""
            : String(rawAnswer);

        await client.query(
          `
          INSERT INTO student_question_answer
            (grade, answer, active_time_sec, stale_time_sec, student_id, question_id)
          VALUES
            (NULL, $1, NULL, NULL, $2, $3)
          ON CONFLICT (student_id, question_id)
          DO UPDATE SET
            answer = EXCLUDED.answer,
            grade = EXCLUDED.grade,
            active_time_sec = EXCLUDED.active_time_sec,
            stale_time_sec = EXCLUDED.stale_time_sec
          `,
          [answer, userId, questionId],
        );
      }

      return submitMessage;
    });

    return res.status(200).json({ message });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error(error);

    return res.status(500).json({
      error: "Failed to submit assessment",
    });
  }
};

export const runCode = async (req, res) => {
  const { code, progLang, progVersion } = req.body;

  if (!code || !progLang) {
    return res
      .status(400)
      .json({ error: "Code and programming language are required" });
  }

  const pistonUrl =
    process.env.PISTON_API_URL || "http://localhost:5050/api/v2/execute";

  const languageAliases = {
    cpp: "c++",
    c: "c",
    python: "python",
  };
  const pistonLanguage = languageAliases[progLang] ?? progLang;
  const sourceFileName =
    pistonLanguage === "c++"
      ? "main.cpp"
      : pistonLanguage === "c"
        ? "main.c"
        : pistonLanguage === "python"
          ? "main.py"
          : "main.txt";

  try {
    const pistonPayload = {
      language: pistonLanguage,
      version: progVersion,
      files: [
        {
          name: sourceFileName,
          content: code,
        },
      ],
      run_timeout: 2000,
    };

    const result = await fetch(pistonUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pistonPayload),
    });

    const data = await result.json();
    if (!result.ok) {
      return res.status(result.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.log("Error: ", error);
    if (error?.cause?.code === "ECONNREFUSED") {
      return res.status(503).json({
        error:
          "Code runner is unavailable. Start Piston with docker compose up -d api in the piston folder.",
      });
    }
    return res.status(500).json({ error: "Failed to run code" });
  }
};

export const getAllAssessments = async (req, res) => {
  const { user_id: userId, role } = req.user;
  const { courseId } = req.params;
  try {
    const assessments = await db.query(
      `SELECT a.assessment_id, a.title, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time, a.is_published, a.is_closed,
        (sa.date_submitted IS NOT NULL) AS has_submitted, sa.grade, sa.percent, TO_CHAR(sa.date_submitted, 'YYYY-MM-DD') AS date_submitted, sa.time_submitted,
        (sa.grade IS NOT NULL) AS graded
      FROM assessment a LEFT JOIN student_assessment sa
      ON a.assessment_id = sa.assessment_id
      AND sa.student_id = $1
      LEFT JOIN student_access_assessments saa ON saa.assessment_id = a.assessment_id AND saa.student_id = $1
      WHERE a.course_id = $2 AND saa.can_access = true`,
      [userId, courseId],
    );

    return res.status(200).json(assessments.rows);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to get all assessments" });
  }
};

export const getAllAssessmentsForAllStudents = async (req, res) => {
  const { courseId } = req.params;
  const { user_id: userId, role } = req.user;
  const assessmentsForAllStudents = [];
  try {
    const students = await db.query(
      `SELECT u.name, u.user_id FROM users u INNER JOIN student_course sc ON u.user_id = sc.student_id WHERE sc.course_id = $1`,
      [courseId],
    );

    for (const student of students.rows) {
      const assessments = await db.query(
        `SELECT a.assessment_id, a.title, a.assess_type, a.max_grade, a.duration, TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date, a.due_time, a.is_published, a.is_closed,
          (sa.date_submitted IS NOT NULL) AS has_submitted, sa.grade, TO_CHAR(sa.date_submitted, 'YYYY-MM-DD') AS date_submitted, sa.time_submitted,
          (sa.grade IS NOT NULL) AS graded
        FROM assessment a LEFT JOIN student_assessment sa
        ON a.assessment_id = sa.assessment_id
        AND sa.student_id = $1
        WHERE a.course_id = $2`,
        [student.user_id, courseId],
      );
      assessmentsForAllStudents.push({
        student: student.name,
        student_id: student.user_id,
        assessments: assessments.rows,
      });
    }
    return res.status(200).json(assessmentsForAllStudents);
  } catch (error) {
    console.log("Error: ", error);
    return res
      .status(500)
      .json({ error: "Failed to get all assessments for all students" });
  }
};

export const saveStudentGrades = async (req, res) => {
  const { courseId } = req.params;
  const { grades } = req.body;
  const { user_id: userId, role } = req.user;

  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ error: "grades array is required" });
  }

  try {
    if (!(await canManageCourse(courseId, userId, role))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await withTransaction(async (client) => {
      for (const entry of grades) {
        const studentId = Number(entry.studentId);
        const assessmentId = Number(entry.assessmentId);
        const grade = entry.grade;

        if (
          !studentId ||
          !assessmentId ||
          grade === "" ||
          grade === null ||
          grade === undefined
        ) {
          continue;
        }

        const numericGrade = Number(grade);
        if (Number.isNaN(numericGrade)) {
          throw txHttpError(400, "Grade must be a number");
        }

        const assessment = await client.query(
          `SELECT assessment_id, max_grade, course_id
           FROM assessment
           WHERE assessment_id = $1 AND course_id = $2`,
          [assessmentId, courseId],
        );
        if (assessment.rows.length === 0) {
          throw txHttpError(400, "Invalid assessment for course");
        }

        const maxGrade = Number(assessment.rows[0].max_grade);
        if (numericGrade < 0 || numericGrade > maxGrade) {
          throw txHttpError(400, `Grade must be between 0 and ${maxGrade}`);
        }

        const percent = maxGrade > 0 ? (numericGrade / maxGrade) * 100 : 0;

        const enrollment = await client.query(
          `SELECT 1 FROM student_course WHERE student_id = $1 AND course_id = $2`,
          [studentId, courseId],
        );
        if (enrollment.rows.length === 0) {
          throw txHttpError(400, "Student not enrolled in course");
        }

        const existing = await client.query(
          `SELECT id FROM student_assessment
           WHERE student_id = $1 AND assessment_id = $2`,
          [studentId, assessmentId],
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE student_assessment
             SET grade = $1, percent = $2
             WHERE student_id = $3 AND assessment_id = $4`,
            [numericGrade, percent, studentId, assessmentId],
          );
        } else {
          await client.query(
            `INSERT INTO student_assessment (grade, percent, student_id, assessment_id)
             VALUES ($1, $2, $3, $4)`,
            [numericGrade, percent, studentId, assessmentId],
          );
        }
      }
    });

    return res.status(200).json({ message: "Grades saved successfully" });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to save grades" });
  }
};

export const getStudentAnswers = async (req, res) => {
  const { assessmentId, studentId } = req.params;
  const answers = {};
  try {
    const answersByQuestion = await db.query(
      `SELECT sqa.question_id, sqa.answer, sqa.grade
       FROM student_question_answer sqa
       INNER JOIN question q ON q.question_id = sqa.question_id
       WHERE q.assessment_id = $1 AND sqa.student_id = $2`,
      [assessmentId, studentId],
    );
    for (const answer of answersByQuestion.rows) {
      answers[answer.question_id] = {
        answer: answer.answer,
        grade: answer.grade,
      };
    }

    const submissionResult = await db.query(
      `SELECT sa.grade, sa.percent,
              TO_CHAR(sa.date_submitted, 'YYYY-MM-DD') AS date_submitted,
              sa.time_submitted,
              (sa.date_submitted IS NOT NULL) AS has_submitted,
              (sa.grade IS NOT NULL) AS graded
       FROM student_assessment sa
       WHERE sa.student_id = $1 AND sa.assessment_id = $2`,
      [studentId, assessmentId],
    );

    const submission = submissionResult.rows[0] ?? {
      has_submitted: false,
      graded: false,
      date_submitted: null,
      time_submitted: null,
      grade: null,
      percent: null,
    };

    return res.status(200).json({ answers, submission });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to get student answers" });
  }
};

export const getQuestionsFeedback = async (req, res) => {
  const { assessmentId, studentId } = req.params;
  const { user_id: userId, role } = req.user;

  try {
    if (
      !(await canAccessStudentFeedback(assessmentId, studentId, userId, role))
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const feedbackResult = await db.query(
      `
      SELECT
          qf.id,
          qf.question_id,
          qf.feedback,
          qf.resolved,
          qf.user_id,
          u.name,
          u.role
      FROM question_feedback qf
      JOIN users u
          ON qf.user_id = u.user_id
      WHERE qf.student_question_answer_id IN (
          SELECT sqa.id
          FROM student_question_answer sqa
          INNER JOIN question q ON q.question_id = sqa.question_id
          WHERE q.assessment_id = $1 AND sqa.student_id = $2
      )
      `,
      [assessmentId, studentId],
    );

    const questionsFeedback = {};

    for (const row of feedbackResult.rows) {
      if (!questionsFeedback[row.question_id]) {
        questionsFeedback[row.question_id] = {
          instructorFeedback: [],
          studentFeedback: [],
        };
      }

      const feedback = {
        id: row.id,
        userId: row.user_id,
        userName: row.name,
        feedback: row.feedback,
        resolved: row.resolved,
      };

      if (row.role === "INSTRUCTOR" || row.role === "TA") {
        questionsFeedback[row.question_id].instructorFeedback.push(feedback);
      } else {
        questionsFeedback[row.question_id].studentFeedback.push(feedback);
      }
    }

    return res.status(200).json(questionsFeedback);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to get questions feedback",
    });
  }
};

export const saveQuestionGradesForStudent = async (req, res) => {
  const { assessmentId, studentId } = req.params;
  const { grades } = req.body;
  const { user_id: userId, role } = req.user;

  if (!isGraderRole(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ error: "grades array is required" });
  }

  try {
    if (
      !(await canAccessStudentFeedback(assessmentId, studentId, userId, role))
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const assessmentResult = await db.query(
      `SELECT assessment_id, max_grade, course_id
       FROM assessment
       WHERE assessment_id = $1`,
      [assessmentId],
    );
    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const assessment = assessmentResult.rows[0];
    const assessmentMaxGrade = Number(assessment.max_grade);

    const { totalGrade, percent } = await withTransaction(async (client) => {
      let runningTotal = 0;

      for (const entry of grades) {
        const questionId = Number(entry.questionId);
        const grade = entry.grade;

        if (
          !questionId ||
          grade === "" ||
          grade === null ||
          grade === undefined
        ) {
          continue;
        }

        const numericGrade = Number(grade);
        if (Number.isNaN(numericGrade)) {
          throw txHttpError(400, "Grade must be a number");
        }

        const questionResult = await client.query(
          `SELECT question_id, max_grade
           FROM question
           WHERE question_id = $1 AND assessment_id = $2`,
          [questionId, assessmentId],
        );
        if (questionResult.rows.length === 0) {
          throw txHttpError(400, "Invalid question for assessment");
        }

        const questionMaxGrade = Number(questionResult.rows[0].max_grade);
        if (numericGrade < 0 || numericGrade > questionMaxGrade) {
          throw txHttpError(
            400,
            `Grade must be between 0 and ${questionMaxGrade}`,
          );
        }

        const answerResult = await client.query(
          `SELECT id FROM student_question_answer
           WHERE student_id = $1 AND question_id = $2
           ORDER BY id DESC
           LIMIT 1`,
          [studentId, questionId],
        );

        if (answerResult.rows.length > 0) {
          await client.query(
            `UPDATE student_question_answer
             SET grade = $1
             WHERE id = $2`,
            [numericGrade, answerResult.rows[0].id],
          );
        } else {
          await client.query(
            `INSERT INTO student_question_answer
              (grade, answer, active_time_sec, stale_time_sec, student_id, question_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [numericGrade, "", 0, 0, studentId, questionId],
          );
        }

        runningTotal += numericGrade;
      }

      const computedPercent =
        assessmentMaxGrade > 0
          ? (runningTotal / assessmentMaxGrade) * 100
          : 0;

      const existingSubmission = await client.query(
        `SELECT id FROM student_assessment
         WHERE student_id = $1 AND assessment_id = $2`,
        [studentId, assessmentId],
      );

      if (existingSubmission.rows.length > 0) {
        await client.query(
          `UPDATE student_assessment
           SET grade = $1, percent = $2
           WHERE student_id = $3 AND assessment_id = $4`,
          [runningTotal, computedPercent, studentId, assessmentId],
        );
      } else {
        await client.query(
          `INSERT INTO student_assessment (grade, percent, student_id, assessment_id)
           VALUES ($1, $2, $3, $4)`,
          [runningTotal, computedPercent, studentId, assessmentId],
        );
      }

      return { totalGrade: runningTotal, percent: computedPercent };
    });

    return res.status(200).json({
      message: "Question grades saved successfully",
      totalGrade,
      percent,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to save question grades" });
  }
};

export const upsertQuestionFeedback = async (req, res) => {
  const { assessmentId, studentId } = req.params;
  const questionId = Number(req.body.questionId);
  const { feedback } = req.body;
  const { user_id: userId, role, name } = req.user;

  const trimmedFeedback = feedback?.trim();
  if (!questionId || !trimmedFeedback) {
    return res
      .status(400)
      .json({ error: "questionId and feedback are required" });
  }

  try {
    if (
      !(await canAccessStudentFeedback(assessmentId, studentId, userId, role))
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const questionResult = await db.query(
      `SELECT question_id FROM question
       WHERE question_id = $1 AND assessment_id = $2`,
      [questionId, assessmentId],
    );
    if (questionResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid question for assessment" });
    }

    const answerId = await getOrCreateStudentAnswerId(studentId, questionId);

    const existing = await db.query(
      `SELECT id FROM question_feedback
       WHERE question_id = $1
         AND user_id = $2
         AND student_question_answer_id = $3
         AND resolved = false`,
      [questionId, userId, answerId],
    );

    let savedFeedback;
    if (existing.rows.length > 0) {
      const updateResult = await db.query(
        `UPDATE question_feedback
         SET feedback = $1
         WHERE id = $2
         RETURNING id, question_id, feedback, resolved, user_id`,
        [trimmedFeedback, existing.rows[0].id],
      );
      savedFeedback = updateResult.rows[0];
    } else {
      const insertResult = await db.query(
        `INSERT INTO question_feedback
          (feedback, resolved, user_id, question_id, student_question_answer_id)
         VALUES ($1, false, $2, $3, $4)
         RETURNING id, question_id, feedback, resolved, user_id`,
        [trimmedFeedback, userId, questionId, answerId],
      );
      savedFeedback = insertResult.rows[0];
    }

    return res.status(200).json({
      feedback: {
        id: savedFeedback.id,
        userId: savedFeedback.user_id,
        userName: name,
        feedback: savedFeedback.feedback,
        resolved: savedFeedback.resolved,
        questionId: savedFeedback.question_id,
      },
    });
  } catch (error) {
    console.error("upsertQuestionFeedback error:", error);
    return res.status(500).json({ error: "Failed to save question feedback" });
  }
};

export const resolveQuestionFeedback = async (req, res) => {
  const { feedbackId } = req.params;
  const { user_id: userId, role } = req.user;

  try {
    const feedbackResult = await db.query(
      `SELECT qf.id, qf.question_id, qf.feedback, qf.resolved, qf.user_id,
              sqa.student_id, u.role AS author_role, q.assessment_id
       FROM question_feedback qf
       INNER JOIN student_question_answer sqa ON sqa.id = qf.student_question_answer_id
       INNER JOIN users u ON u.user_id = qf.user_id
       INNER JOIN question q ON q.question_id = qf.question_id
       WHERE qf.id = $1`,
      [feedbackId],
    );

    if (feedbackResult.rows.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    const row = feedbackResult.rows[0];
    if (row.resolved) {
      return res.status(200).json({ message: "Feedback already resolved" });
    }

    if (
      !(await canAccessStudentFeedback(
        row.assessment_id,
        row.student_id,
        userId,
        role,
      ))
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (Number(row.user_id) === Number(userId)) {
      return res
        .status(400)
        .json({ error: "You cannot resolve your own comment" });
    }

    const authorRole = row.author_role;
    const canResolve =
      (isGraderRole(role) && authorRole === "STUDENT") ||
      (role === "STUDENT" &&
        (authorRole === "INSTRUCTOR" || authorRole === "TA"));

    if (!canResolve) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.query(
      `UPDATE question_feedback SET resolved = true WHERE id = $1`,
      [feedbackId],
    );

    return res.status(200).json({ message: "Feedback resolved successfully" });
  } catch (error) {
    console.log("Error: ", error);
    return res
      .status(500)
      .json({ error: "Failed to resolve question feedback" });
  }
};


function mapAssessmentsByDueDate(rows) {
  const assessmentsByDate = {};

  for (const assessment of rows) {
    if (!assessment.due_date) {
      continue;
    }

    if (!assessmentsByDate[assessment.due_date]) {
      assessmentsByDate[assessment.due_date] = [];
    }

    assessmentsByDate[assessment.due_date].push({
      title: assessment.title,
      courseTitle: assessment.course_title,
      courseId: assessment.course_id,
    });
  }

  return assessmentsByDate;
}

async function getStudentScheduleAssessmentsByType(userId, assessType) {
  const result = await db.query(
    `SELECT
        a.title,
        TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
        c.coursetitle AS course_title, c.course_id
     FROM assessment a
     JOIN course c
        ON a.course_id = c.course_id
     JOIN student_course sc
        ON sc.course_id = c.course_id
     INNER JOIN student_access_assessments saa
        ON saa.assessment_id = a.assessment_id
       AND saa.student_id = sc.student_id
     LEFT JOIN student_assessment sa
        ON sa.student_id = sc.student_id
       AND sa.assessment_id = a.assessment_id
     WHERE
        sc.student_id = $1
        AND a.assess_type = $2
        AND a.is_published = true
        AND saa.can_access = true
        AND a.due_date IS NOT NULL
        AND sa.date_submitted IS NULL`,
    [userId, assessType],
  );

  return result.rows;
}

export const getExamsByUserId = async (req, res) => {
  const { user_id: userId, role } = req.user;
  const exams = {};

  try {
    if (role === "STUDENT") {
      const rows = await getStudentScheduleAssessmentsByType(userId, "EXAM");
      return res.status(200).json(mapAssessmentsByDueDate(rows));
    }

    let userExams;

    if (role === "INSTRUCTOR") {
      userExams = await db.query(
        `SELECT
            a.title,
            TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
            c.coursetitle AS course_title, c.course_id 
         FROM assessment a
         JOIN course c
            ON a.course_id = c.course_id
         WHERE
            a.assess_type = 'EXAM'
            AND (
              c.instructor_id = $1
              OR EXISTS (
                SELECT 1 FROM ta_course tc
                WHERE tc.course_id = c.course_id AND tc.ta_id = $1
              )
            )`,
        [userId]
      );
    } else if (role === "TA") {
      userExams = await db.query(
        `SELECT
            a.title,
            TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
            c.coursetitle AS course_title, c.course_id
         FROM assessment a
         JOIN course c
            ON a.course_id = c.course_id
         WHERE
            c.ta_id = $1
            AND a.assess_type = 'EXAM';`,
        [userId]
      );
    } else {
      return res.status(403).json({ error: "Invalid role" });
    }

    for (const exam of userExams.rows) {
      if (!exams[exam.due_date]) {
        exams[exam.due_date] = [];
      }

      exams[exam.due_date].push({
        title: exam.title,
        courseTitle: exam.course_title,
        courseId: exam.course_id,
      });
    }

    return res.status(200).json(exams);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Failed to get exams by user id",
    });
  }
};

export const getQuizzesByUserId = async (req, res) => {
  const { user_id: userId, role } = req.user;
  const quizzes = {};

  try {
      if (role === "STUDENT") {
          const rows = await getStudentScheduleAssessmentsByType(userId, "QUIZ");
          return res.status(200).json(mapAssessmentsByDueDate(rows));
      }

      let userQuizzes;

      if (role === "INSTRUCTOR") {
          userQuizzes = await db.query(
              `SELECT a.title,
                      TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
                      c.coursetitle AS course_title, c.course_id
               FROM assessment a
               JOIN course c
                   ON a.course_id = c.course_id
               WHERE a.assess_type = 'QUIZ'
                 AND (
                   c.instructor_id = $1
                   OR EXISTS (
                     SELECT 1 FROM ta_course tc
                     WHERE tc.course_id = c.course_id AND tc.ta_id = $1
                   )
                 )`,
              [userId]
          );
      } else if (role === "TA") {
          userQuizzes = await db.query(
              `SELECT a.title,
                      TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
                      c.coursetitle AS course_title, c.course_id
               FROM assessment a
               JOIN course c
                   ON a.course_id = c.course_id
               WHERE c.ta_id = $1
                 AND a.assess_type = 'QUIZ'`,
              [userId]
          );
      } else {
          return res.status(403).json({ error: "Invalid role" });
      }

      for (const quiz of userQuizzes.rows) {
          if (!quizzes[quiz.due_date]) {
              quizzes[quiz.due_date] = [];
          }

          quizzes[quiz.due_date].push({
              title: quiz.title,
              courseTitle: quiz.course_title,
              courseId: quiz.course_id,
          });
      }

      return res.status(200).json(quizzes);
  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to get quizzes by user id" });
  }
};


export const getAssignmentsByUserId = async (req, res) => {
  const { user_id: userId, role } = req.user;
  const assignments = {};

  try {
    if (role === "STUDENT") {
      const rows = await getStudentScheduleAssessmentsByType(userId, "ASSIGNMENT");
      return res.status(200).json(mapAssessmentsByDueDate(rows));
    }

    let userAssignments;

    if (role === "INSTRUCTOR") {
      userAssignments = await db.query(
        `SELECT
            a.title,
            TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
            c.coursetitle AS course_title, c.course_id
         FROM assessment a
         JOIN course c
            ON a.course_id = c.course_id
         WHERE
            a.assess_type = 'ASSIGNMENT'
            AND (
              c.instructor_id = $1
              OR EXISTS (
                SELECT 1 FROM ta_course tc
                WHERE tc.course_id = c.course_id AND tc.ta_id = $1
              )
            )`,
        [userId]
      );
    } else if (role === "TA") {
      userAssignments = await db.query(
        `SELECT
            a.title,
            TO_CHAR(a.due_date, 'YYYY-MM-DD') AS due_date,
            c.coursetitle AS course_title, c.course_id
         FROM assessment a
         JOIN course c
            ON a.course_id = c.course_id
         WHERE
            c.ta_id = $1
            AND a.assess_type = 'ASSIGNMENT';`,
        [userId]
      );
    } else {
      return res.status(403).json({ error: "Invalid role" });
    }

    for (const assignment of userAssignments.rows) {
      if (!assignments[assignment.due_date]) {
        assignments[assignment.due_date] = [];
      }

      assignments[assignment.due_date].push({
        title: assignment.title,
        courseTitle: assignment.course_title,
        courseId: assignment.course_id,
      });
    }

    return res.status(200).json(assignments);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Failed to get assignments by user id",
    });
  }
};