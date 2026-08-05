-- Apply on existing databases that already ran schema.sql
CREATE TABLE IF NOT EXISTS instructor_invites (
    invite_id SERIAL PRIMARY KEY,
    email VARCHAR(50) UNIQUE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    invited_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
