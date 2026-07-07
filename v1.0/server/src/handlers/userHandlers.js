import db from "../../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Please register first!" });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(
      password,
      user.hashed_password,
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Wrong password!" });
    }

    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const { hashed_password: _, ...userWithoutPassword } = user;
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

export const createUser = async (req, res) => {
  try {
    const { name, email, role, password, auc_id } = req.body;
    const emailExists = await db.query("SELECT * FROM users WHERE email = $1" , [email]);
    if (emailExists.rows.length > 0) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }
    const hashed_password = await bcrypt.hash(password, 10);
    const result = await db.query("INSERT INTO users (name, auc_id, email, hashed_password, role) VALUES ($1,$2,$3,$4,$5) RETURNING *" , [name, auc_id, email, hashed_password, role]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};
