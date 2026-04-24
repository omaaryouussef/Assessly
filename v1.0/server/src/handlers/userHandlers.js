import db from "../../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginUser = async (req, res) => {
  try {
    console.log("I have been fucked");
    const { email, password } = req.body;
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Please register first!" });
    }
    const user = result.rows[0];
    console.log(user, password, user.hashed_password)
    const isPasswordValid = await bcrypt.compare(
      password,
      user.hashed_password,
    );
    if (!isPasswordValid) {
      return res.   status(401).json({ error: "Wrong password!" });
    }

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUser = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    res.json(req.user);
  } catch (err) {
    console.log("Error: ", err);
    next(err);
  }
};
