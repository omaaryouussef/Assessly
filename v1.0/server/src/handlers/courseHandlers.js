import db from "../../db/index.js";

export const getCoursesByUserId = async (req, res) => {
  const { user_id: userId, role: role } = req.user;
  try {
    if (role == "INSTRUCTOR") {
      const result = await db.query(
        "SELECT * FROM COURSE WHERE instructor_id = $1",
        [userId],
      );
      return res.status(200).json(result.rows);
    } else if (role == "STUDENT") {
      const result = await db.query(
        "SELECT * FROM COURSE C INNER JOIN STUDENT_COURSE SC on SC.course_id = C.course_id WHERE student_id = $1;",
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
    await db.query("DELETE FROM COURSE WHERE course_id = $1", [id]);
    return res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to delete course" });
  }
};

export const joinCourse = async (req, res) => {
  console.log("req.body: ", req.body);
  const { enrollementKey } = req.body;
  try {
    const { user_id: userId, role } = req.user;
    const existing = await db.query(
      "SELECT * FROM COURSE WHERE enrollementkey = $1",
      [enrollementKey],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const alreadyJoined = await db.query(
      "SELECT * FROM STUDENT_COURSE WHERE course_id = $1 AND student_id = $2",
      [existing.rows[0].course_id, userId],
    );
    console.log("alreadyJoined: ", alreadyJoined.rows);
    if (alreadyJoined.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Student already enrolled in this course" });
    }
    if (
      existing.rows[0].max_num_students >
        existing.rows[0].num_enrolled_students &&
      existing.rows[0].isopenenrollement === true
    ) {
      const result = await db.query(
        "INSERT INTO STUDENT_COURSE (course_id, student_id) VALUES ($1, $2) RETURNING *",
        [existing.rows[0].course_id, userId],
      );
      return res.status(200).json(result.rows);
    } else {
      return res
        .status(400)
        .json({ error: "Course is full or enrollment is closed" });
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
    return res.status(200).json({
      people: result.rows.map((row) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
      })),
      instructor: instructor.rows[0],
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({ error: "Failed to fetch people" });
  }
};

export const removePersonfromCourse = async (req, res) => {
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
