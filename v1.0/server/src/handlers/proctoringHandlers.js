import db from "../../db/index.js";
import { canManageCourse, getAssessmentCourseId } from "./assessmentAccess.js";

const VALID_SEVERITIES = new Set(["warning", "critical"]);
const VALID_EVENT_TYPES = new Set([
  "FOCUS_ESCAPE_ATTEMPT",
  "FORBIDDEN_PROCESS",
  "CLIPBOARD_ATTEMPT",
  "WINDOW_BLUR",
  "SCREENSHOT_ATTEMPT",
  "FORCE_QUIT_ATTEMPT",
]);

async function getOrCreateStudentAssessmentId(studentId, assessmentId) {
  const existing = await db.query(
    `SELECT id FROM student_assessment
     WHERE student_id = $1 AND assessment_id = $2`,
    [studentId, assessmentId],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await db.query(
    `INSERT INTO student_assessment
      (grade, percent, student_id, assessment_id)
     VALUES (0, 0, $1, $2)
     RETURNING id`,
    [studentId, assessmentId],
  );

  return inserted.rows[0].id;
}

async function canStudentAccessAssessment(studentId, assessmentId) {
  const access = await db.query(
    `SELECT can_access
     FROM student_access_assessments
     WHERE student_id = $1 AND assessment_id = $2`,
    [studentId, assessmentId],
  );

  if (access.rows.length === 0) {
    return true;
  }

  return Boolean(access.rows[0].can_access);
}

export const createProctoringEvent = async (req, res) => {
  const { assessmentId } = req.params;
  const { eventType, severity = "warning", metadata = null } = req.body ?? {};
  const { user_id: userId, role } = req.user;

  if (role !== "STUDENT") {
    return res.status(403).json({ error: "Only students can submit proctoring events" });
  }

  if (!VALID_EVENT_TYPES.has(eventType)) {
    return res.status(400).json({ error: "Invalid proctoring event type" });
  }

  if (!VALID_SEVERITIES.has(severity)) {
    return res.status(400).json({ error: "Invalid proctoring event severity" });
  }

  try {
    const assessment = await db.query(
      "SELECT assessment_id FROM assessment WHERE assessment_id = $1",
      [assessmentId],
    );

    if (assessment.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const allowed = await canStudentAccessAssessment(userId, assessmentId);
    if (!allowed) {
      return res.status(403).json({ error: "Assessment access denied" });
    }

    const studentAssessmentId = await getOrCreateStudentAssessmentId(
      userId,
      assessmentId,
    );

    const result = await db.query(
      `INSERT INTO proctoring_event
        (student_assessment_id, event_type, severity, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_type, severity, metadata, created_at`,
      [
        studentAssessmentId,
        eventType,
        severity,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    return res.status(201).json({
      event: result.rows[0],
      studentAssessmentId,
    });
  } catch (error) {
    console.log("Error creating proctoring event:", error);
    return res.status(500).json({ error: "Failed to create proctoring event" });
  }
};

export const getProctoringEvents = async (req, res) => {
  const { assessmentId } = req.params;
  const { studentId } = req.query;
  const { user_id: userId, role } = req.user;

  try {
    const courseId = await getAssessmentCourseId(assessmentId);
    if (!courseId) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    if (role === "STUDENT") {
      if (!studentId || Number(studentId) !== Number(userId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else if (role === "INSTRUCTOR" || role === "TA") {
      const allowed = await canManageCourse(courseId, userId, role);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (!studentId) {
        return res.status(400).json({ error: "studentId query parameter is required" });
      }
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    const studentAssessment = await db.query(
      `SELECT sa.id, sa.student_id, u.name AS student_name
       FROM student_assessment sa
       JOIN users u ON u.user_id = sa.student_id
       WHERE sa.assessment_id = $1 AND sa.student_id = $2`,
      [assessmentId, studentId],
    );

    if (studentAssessment.rows.length === 0) {
      return res.status(200).json({ events: [], studentAssessmentId: null });
    }

    const studentAssessmentId = studentAssessment.rows[0].id;
    const events = await db.query(
      `SELECT id, event_type, severity, metadata, created_at
       FROM proctoring_event
       WHERE student_assessment_id = $1
       ORDER BY created_at ASC`,
      [studentAssessmentId],
    );

    return res.status(200).json({
      studentAssessmentId,
      studentName: studentAssessment.rows[0].student_name,
      events: events.rows,
    });
  } catch (error) {
    console.log("Error fetching proctoring events:", error);
    return res.status(500).json({ error: "Failed to fetch proctoring events" });
  }
};
