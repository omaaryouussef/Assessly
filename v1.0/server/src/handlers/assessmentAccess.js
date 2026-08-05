import db from "../../db/index.js";

export async function canManageCourse(courseId, userId, role) {
  if (role === "INSTRUCTOR") {
    const owned = await db.query(
      "SELECT 1 FROM course WHERE course_id = $1 AND instructor_id = $2",
      [courseId, userId],
    );
    if (owned.rows.length > 0) {
      return true;
    }

    // Invited instructors assigned as course TAs
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

export async function getAssessmentCourseId(assessmentId) {
  const result = await db.query(
    "SELECT course_id FROM assessment WHERE assessment_id = $1",
    [assessmentId],
  );
  return result.rows[0]?.course_id ?? null;
}
