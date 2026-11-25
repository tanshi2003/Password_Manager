-- OPTIONAL ONLY AFTER VERIFIED DATABASE BACKUP.
-- This permanently removes the old prototype's plaintext account-password column.
-- Run only after the new backend is deployed, validated, and users can sign in with bcrypt hashes.
-- The v2 backend detects whether the legacy column exists and works either way.
UPDATE users SET plain_password = NULL;
ALTER TABLE users DROP COLUMN plain_password;
