import crypto from "crypto";
import db from "../../db/index.js";
import { sendMail } from "../utils/mail.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashInviteToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export const createInstructorInvite = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await db.query(
      "SELECT user_id FROM users WHERE LOWER(email) = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }

    const pending = await db.query(
      `SELECT invite_id FROM instructor_invites
       WHERE LOWER(email) = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [email]
    );
    if (pending.rows.length > 0) {
      return res.status(409).json({ error: "A pending invite already exists for this email" });
    }

    // Replace any expired unused invite for this email
    await db.query(
      `DELETE FROM instructor_invites
       WHERE LOWER(email) = $1 AND accepted_at IS NULL`,
      [email]
    );

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const result = await db.query(
      `INSERT INTO instructor_invites (email, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING invite_id, email, expires_at, accepted_at, created_at`,
      [email, tokenHash, req.user.user_id, expiresAt]
    );

    const inviteLink = `${CLIENT_URL}/accept-invite?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: email,
      subject: "Assessly instructor invitation",
      text: `You have been invited to join Assessly as an instructor.\n\nOpen this link to create your account (expires in 7 days):\n${inviteLink}\n`,
    });

    return res.status(201).json({ invite: result.rows[0] });
  } catch (error) {
    console.log(error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "A pending invite already exists for this email" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listInstructorInvites = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT invite_id, email, invited_by, expires_at, accepted_at, created_at
       FROM instructor_invites
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return res.json({ invites: result.rows });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteInstructorInvite = async (req, res) => {
  try {
    const inviteId = Number(req.params.id);
    if (!Number.isFinite(inviteId)) {
      return res.status(400).json({ error: "Invalid invite id" });
    }

    const result = await db.query(
      `DELETE FROM instructor_invites
       WHERE invite_id = $1 AND accepted_at IS NULL
       RETURNING invite_id`,
      [inviteId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pending invite not found" });
    }
    return res.json({ message: "Invite cancelled" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
