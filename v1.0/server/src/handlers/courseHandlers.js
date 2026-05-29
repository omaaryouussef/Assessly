import db from "../../db/index.js";

export const getCoursesByUserId = async (req, res) => {
  const { user_id: userId, role: role } = req.user;
  try {
    if (role == "INSTRUCTOR") {
      const result = await db.query(
        "SELECT * FROM COURSE WHERE instructor_id = $1",
        [userId],
      );
      res.status(200).json(result.rows);
    } else if (role == "STUDENT") {
      const result = await db.query(
        "SELECT * FROM COURSE C INNER JOIN STUDENT_COURSE SC on SC.course_id = C.course_id WHERE student_id = $1;",
        [userId],
      );
      res.status(200).json(result.rows);
    } else {
      res.status(401).json({ error: "Unauthorized" });
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
    res.status(200).json(result.rows);
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({ error: "Failed to create course", error });
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
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({ error: "Failed to update course" });
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
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.log("Error: ", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
};

export const joinCourse = async (req, res) => {
  console.log("req.body: ", req.body);
  const {enrollementKey} = req.body;
  try {
    const {user_id: userId, role} = req.user;
    const existing = await db.query(
      "SELECT * FROM COURSE WHERE enrollementkey = $1",
      [enrollementKey],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const alreadyJoined = await db.query(
      "SELECT * FROM STUDENT_COURSE WHERE course_id = $1 AND student_id = $2",
      [existing.rows[0].course_id, userId]
    )
    console.log("alreadyJoined: ", alreadyJoined.rows)
    if (alreadyJoined.rows.length > 0) {
      return res.status(400).json({ error: "Student already enrolled in this course" });
    }

    const result = await db.query(
      "INSERT INTO STUDENT_COURSE (course_id, student_id) VALUES ($1, $2) RETURNING *",
      [existing.rows[0].course_id, userId],
    );
    res.status(200).json(result.rows);
  }catch (error) {
    console.log("Error: ", error);
    res.status(500).json({ error: "Failed to join course" });
  }
}
