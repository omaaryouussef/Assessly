import db from "../../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PENDING_PURPOSE = "google_complete";

function stripPassword(user) {
  if (!user) return user;
  const { hashed_password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

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
    if (user.hashed_password == null) {
      return res.status(401).json({ error: "Use Sign in with Google" });
    }
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
    res.json({ user: stripPassword(user), token });
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
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, role, password, auc_id, department } = req.body;
    const emailExists = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (emailExists.rows.length > 0) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }
    const hashed_password = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, auc_id, email, hashed_password, role, department) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, auc_id, email, hashed_password, role, department],
    );
    res.status(201).json(stripPassword(result.rows[0]));
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

export const googleCallback = async (req, res) => {
  try {
    const payload = req.user;
    if (!payload) {
      return res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
    }

    // New Google user — pending complete-profile (strategy returns { isNew: true, ... })
    if (payload.isNew) {
      const { name, email, google_id } = payload;
      const pending = jwt.sign(
        { name, email, google_id, purpose: PENDING_PURPOSE },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );
      return res.redirect(
        `${CLIENT_URL}/complete-profile?pending=${encodeURIComponent(pending)}`,
      );
    }

    // Existing DB user (already looked up / linked in strategy)
    const existingUser = payload;
    if (!existingUser.user_id) {
      return res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
    }

    const token = jwt.sign(
      { id: existingUser.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.redirect(
      `${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`,
    );
  } catch (error) {
    console.log(error);
    return res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
  }
};

export const completeGoogleProfile = async (req, res) => {
  try {
    const pendingToken = req.body.pending ?? req.body.pendingToken;
    const { auc_id, department } = req.body;

    if (!pendingToken) {
      return res.status(401).json({ error: "Missing pending token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ error: "Invalid or expired pending token" });
    }

    if (decoded.purpose !== PENDING_PURPOSE) {
      return res.status(401).json({ error: "Invalid pending token" });
    }

    const { name, email, google_id } = decoded;
    if (!name || !email || !google_id) {
      return res.status(401).json({ error: "Invalid pending token" });
    }

    if (!auc_id || String(auc_id).length !== 9) {
      return res
        .status(400)
        .json({ error: "University ID must be exactly 9 characters" });
    }

    const dept = typeof department === "string" ? department.trim() : "";
    if (!dept) {
      return res.status(400).json({ error: "Department is required" });
    }

    const existing = await db.query(
      "SELECT user_id FROM users WHERE email = $1 OR google_id = $2",
      [email, google_id],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Account already exists" });
    }

    const result = await db.query(
      `INSERT INTO users (name, email, google_id, auc_id, department, role, hashed_password)
       VALUES ($1, $2, $3, $4, $5, 'STUDENT', NULL)
       RETURNING *`,
      [name, email, google_id, auc_id, dept],
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, user: stripPassword(user) });
  } catch (error) {
    console.log(error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "Account already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
