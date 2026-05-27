import db from "../../db/index.js";

export const getCoursesByUserId = async (req , res) => {
  const {user_id:userId , role: role } = req.user;
  console.log(userId, role);
  if (role == "INSTRUCTOR") {
    const result = await db.query("SELECT * FROM COURSE WHERE instructor_id = $1" , [userId]);
    console.log(result.rows);
    res.status(200).json(result.rows);
  } else if (role == "STUDENT") {
    const result = await db.query("SELECT * FROM COURSE C INNER JOIN STUDENT_COURSE SC on SC.course_id = C.course_id WHERE student_id = $1;", [userId]);
    console.log(result.rows);
    res.status(200).json(result.rows);
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}