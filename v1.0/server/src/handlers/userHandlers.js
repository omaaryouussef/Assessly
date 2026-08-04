import db from "../../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PENDING_PURPOSE = "google_complete";

function stripPassword(user) {
  if (!user) return user;
  const { hashed_password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}


function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
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

    const isUserVerified = await db.query("SELECT is_verified FROM users WHERE user_id = $1", [user.user_id]);
    if (!isUserVerified.rows[0].is_verified) {
      return res.status(401).json({ error: "Please verify your email first!", needVerification: true });
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
      "INSERT INTO users (name, auc_id, email, hashed_password, role, department, is_verified) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [name, auc_id, email, hashed_password, role, department, false],
    );
    const verificationCode = generateVerificationCode();
    const codeHash = await bcrypt.hash(verificationCode, 10);
    await db.query("INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1,$2,$3)", [result.rows[0].user_id, codeHash, new Date(Date.now() + 1000 * 60 * 60 * 24)]);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verification Code",
      text: `Your verification code is: ${verificationCode}`,
    };
    await transporter.sendMail(mailOptions);
    res.status(201).json({ needVerification: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }

    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    if (user.is_verified) {
      const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.json({ token, user: stripPassword(user) });
    }

    const verification = await db.query(
      "SELECT * FROM email_verifications WHERE user_id = $1",
      [user.user_id],
    );
    if (verification.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "No verification code found. Please register again." });
    }

    const record = verification.rows[0];
    if (new Date(record.expires_at) < new Date()) {
      return res
        .status(400)
        .json({ error: "Verification code has expired. Please register again." });
    }

    const isValid = await bcrypt.compare(String(code).trim(), record.code_hash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const updated = await db.query(
      "UPDATE users SET is_verified = true WHERE user_id = $1 RETURNING *",
      [user.user_id],
    );
    await db.query("DELETE FROM email_verifications WHERE user_id = $1", [
      user.user_id,
    ]);

    const verifiedUser = updated.rows[0];
    const token = jwt.sign({ id: verifiedUser.user_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token, user: stripPassword(verifiedUser) });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
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
      `INSERT INTO users (name, email, google_id, auc_id, department, role, hashed_password, is_verified)
i       VALUES ($1, $2, $3, $4, $5, 'STUDENT', NULL, true)
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
