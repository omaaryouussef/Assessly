import db from "../../db/index.js";

export const getCoursesByUserId = async (req, res) => {
  const { user_id: userId, role: role } = req.user;
  try {
    if (role == "INSTRUCTOR") {
      const result = await db.query(
        `SELECT DISTINCT c.* FROM users u
          JOIN COURSE c ON c.instructor_id = u.user_id
          WHERE c.instructor_id = $1`,
        [userId],
      );
      return res.status(200).json(result.rows);
    } else if (role == "STUDENT") {
      const result = await db.query(
        "SELECT * FROM COURSE C INNER JOIN STUDENT_COURSE SC on SC.course_id = C.course_id WHERE student_id = $1;",
        [userId],
      );
      return res.status(200).json(result.rows);
    } else if (role == "TA") {
      const result = await db.query(
        "SELECT * FROM COURSE C INNER JOIN TA_COURSE TC on TC.course_id = C.course_id WHERE ta_id = $1;",
        [userId],
      );
      return res.status(200).json(result.rows);
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve courses", error });
  }
};

export const createCourse = async (req, res) => {
  const { instructorId, courseTitle, maxNumStudents, openEnrollement } =
    req.body;

  async function generateRandomString(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomKey = "";
    for (let i = 0; i < length; i++) {
      randomKey += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    const result = await db.query(
      "SELECT * FROM COURSE WHERE enrollementkey = $1",
      [randomKey],
    );
    if (result.rows.length > 0) {
      return generateRandomString(length);
    }
    return randomKey;
  }

  const enrollementKey = await generateRandomString(8);
  try {
    const result = await db.query(
      "INSERT INTO COURSE (instructor_id, coursetitle, max_num_students, isopenenrollement, enrollementkey) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [
        instructorId,
        courseTitle,
        maxNumStudents,
        openEnrollement,
        enrollementKey,
      ],
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to create course", error });
  }
};

export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { courseTitle, maxNumStudents, openEnrollement } = req.body;
  const { user_id: userId, role } = req.user;

  if (role !== "INSTRUCTOR") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const existing = await db.query(
      "SELECT * FROM COURSE WHERE course_id = $1 AND instructor_id = $2",
      [id, userId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const result = await db.query(
      "UPDATE COURSE SET coursetitle = $1, max_num_students = $2, isopenenrollement = $3 WHERE course_id = $4 RETURNING *",
      [courseTitle, maxNumStudents, openEnrollement, id],
    );
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to update course" });
  }
};

export const deleteCourse = async (req, res) => {
  const { id } = req.params;
  const { user_id: userId, role } = req.user;

  if (role !== "INSTRUCTOR") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const existing = await db.query(
      "SELECT * FROM COURSE WHERE course_id = $1 AND instructor_id = $2",
      [id, userId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    await db.query("DELETE FROM STUDENT_COURSE WHERE course_id = $1", [id]);
    await db.query("DELETE FROM TA_COURSE WHERE course_id = $1", [id]);
    await db.query("DELETE FROM COURSE WHERE course_id = $1", [id]);
    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to delete course" });
  }
};

export const joinCourse = async (req, res) => {
  const { enrollementKey } = req.body;
  try {
    const { user_id: userId, role } = req.user;
    if (role == "TA") {
      const course = await db.query(
        "SELECT * FROM COURSE WHERE enrollementkey = $1",
        [enrollementKey],
      );
      if (course.rows.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }
      const existingTa = await db.query(
        "SELECT * FROM TA_COURSE WHERE ta_id = $1 AND course_id = $2",
        [userId, course.rows[0].course_id],
      );
      if (existingTa.rows.length > 0) {
        return res
          .status(400)
          .json({ error: "TA already assigned to a course" });
      }
      const result = await db.query(
        "INSERT INTO TA_COURSE (course_id, ta_id) VALUES ($1, $2) RETURNING *",
        [course.rows[0].course_id, userId],
      );
      return res.status(200).json(result.rows);
    } else if (role == "STUDENT") {
      const course = await db.query(
        "SELECT * FROM COURSE WHERE enrollementkey = $1",
        [enrollementKey],
      );
      if (course.rows.length === 0) {
        return res.status(404).json({ error: "Course not found" });
      }
      const existingStudent = await db.query(
        "SELECT * FROM STUDENT_COURSE WHERE course_id = $1 AND student_id = $2",
        [course.rows[0].course_id, userId],
      );
      if (existingStudent.rows.length > 0) {
        return res.status(400).json({ error: "Student already enrolled in this course" });
      }
      const result = await db.query(
        "INSERT INTO STUDENT_COURSE (course_id, student_id) VALUES ($1, $2) RETURNING *",
        [course.rows[0].course_id, userId],
      );
      return res.status(200).json(result.rows);
    }else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to join course" });
  }
};

export const getPeopleByCourseId = async (req, res) => {
  const { courseId } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM users u INNER JOIN STUDENT_COURSE sc on sc.student_id = u.user_id WHERE sc.course_id = $1",
      [courseId],
    );

    const instructor = await db.query(
      "SELECT * FROM users u INNER JOIN COURSE c on c.instructor_id = u.user_id WHERE c.course_id = $1",
      [courseId],
    );

    const tas = await db.query(
      "SELECT * FROM users u INNER JOIN TA_COURSE tc ON tc.ta_id = u.user_id WHERE tc.course_id = $1",
      [courseId],
    );

    const mapPerson = (row) => ({
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
    });

    return res.status(200).json({
      people: result.rows.map(mapPerson),
      tas: tas.rows.map(mapPerson),
      instructor: instructor.rows[0] ? mapPerson(instructor.rows[0]) : null,
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to fetch people" });
  }
};

export const removeStudentfromCourse = async (req, res) => {
  const { studentId } = req.body;
  const { courseId } = req.params;
  try {
    const response = await db.query(
      "DELETE FROM STUDENT_COURSE WHERE student_id = $1 AND course_id = $2 RETURNING *",
      [studentId, courseId],
    );
    if (response.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Student not found in this course" });
    }
    return res
      .status(200)
      .json({ message: "Student removed from course successfully" });
  } catch (error) {
    console.log("Error: ", error);
    return res
      .status(500)
      .json({ error: "Failed to remove student from course" });
  }
};

export const addStudentToCourse = async (req, res) => {
  const { aucId } = req.body;
  const { courseId } = req.params;
  const { user_id: instructorId, role } = req.user;

  if (role !== "INSTRUCTOR") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!aucId) {
    return res.status(400).json({ error: "University ID is required" });
  }

  try {
    const course = await db.query(
      "SELECT * FROM COURSE WHERE course_id = $1 AND instructor_id = $2",
      [courseId, instructorId],
    );
    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const student = await db.query(
      "SELECT * FROM users WHERE auc_id = $1 AND role = 'STUDENT'",
      [aucId.trim()],
    );
    if (student.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentId = student.rows[0].user_id;

    const alreadyJoined = await db.query(
      "SELECT * FROM STUDENT_COURSE WHERE course_id = $1 AND student_id = $2",
      [courseId, studentId],
    );
    if (alreadyJoined.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Student already enrolled in this course" });
    }

    const courseRow = course.rows[0];
    if (
      courseRow.max_num_students <= courseRow.num_enrolled_students &&
      courseRow.max_num_students > 0
    ) {
      return res.status(400).json({ error: "Course is full" });
    }

    await db.query(
      "INSERT INTO STUDENT_COURSE (course_id, student_id) VALUES ($1, $2) RETURNING *",
      [courseId, studentId],
    );

    return res.status(200).json({
      message: "Student added to course successfully",
      student: {
        user_id: student.rows[0].user_id,
        name: student.rows[0].name,
        email: student.rows[0].email,
        role: student.rows[0].role,
      },
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to add student to course" });
  }
};

export const addTaToCourse = async (req, res) => {
  const { aucId } = req.body;
  const { courseId } = req.params;
  const { user_id: instructorId, role } = req.user;

  if (role !== "INSTRUCTOR") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!aucId) {
    return res.status(400).json({ error: "University ID is required" });
  }

  try {
    const course = await db.query(
      "SELECT * FROM COURSE WHERE course_id = $1 AND instructor_id = $2",
      [courseId, instructorId],
    );
    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const ta = await db.query(
      "SELECT * FROM users WHERE auc_id = $1 AND role = 'TA'",
      [aucId.trim()],
    );
    if (ta.rows.length === 0) {
      return res.status(404).json({ error: "TA not found" });
    }

    const taId = ta.rows[0].user_id;

    const alreadyAssigned = await db.query(
      "SELECT * FROM TA_COURSE WHERE course_id = $1 AND ta_id = $2",
      [courseId, taId],
    );
    if (alreadyAssigned.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "TA already assigned to this course" });
    }

    await db.query(
      "INSERT INTO TA_COURSE (course_id, ta_id) VALUES ($1, $2) RETURNING *",
      [courseId, taId],
    );

    return res.status(200).json({
      message: "TA added to course successfully",
      ta: {
        user_id: ta.rows[0].user_id,
        name: ta.rows[0].name,
        email: ta.rows[0].email,
        role: ta.rows[0].role,
      },
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to add TA to course" });
  }
};

export const removeTaFromCourse = async (req, res) => {
  const { taId } = req.body;
  const { courseId } = req.params;
  const { user_id: instructorId, role } = req.user;

  if (role !== "INSTRUCTOR") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const course = await db.query(
      "SELECT * FROM COURSE WHERE course_id = $1 AND instructor_id = $2",
      [courseId, instructorId],
    );
    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const response = await db.query(
      "DELETE FROM TA_COURSE WHERE ta_id = $1 AND course_id = $2 RETURNING *",
      [taId, courseId],
    );
    if (response.rows.length === 0) {
      return res.status(404).json({ error: "TA not found in this course" });
    }
    return res
      .status(200)
      .json({ message: "TA removed from course successfully" });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to remove TA from course" });
  }
};
