-- Run if your database predates TA_COURSE support.

CREATE TABLE IF NOT EXISTS TA_COURSE
(
    id SERIAL NOT NULL,
    course_id INT NOT NULL,
    ta_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (ta_id) REFERENCES Users(user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'role_enum' AND e.enumlabel = 'TA'
    ) THEN
        ALTER TYPE role_enum ADD VALUE 'TA';
    END IF;
END $$;
