import jwt from "jsonwebtoken";
import db from "../../db/index.js";

export const authenticate = async (req, res, next) => {
  if (!req.headers.authorization) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query("SELECT * FROM users WHERE user_id = $1", [
      decoded.id,
    ]);
    const data = result.rows[0];
    const { password: _, ...userWithoutPassword } = data;
    const user = { ...userWithoutPassword, token };
    req.user = user;
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    req.user = undefined;
    res.status(401).json({ error: "Unauthorized" });
  }
};
