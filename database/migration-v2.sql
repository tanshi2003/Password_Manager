-- Password Manager v2 additive migration.
-- BACK UP the existing Railway MySQL database before running this script.
-- The old users table is intentionally preserved. Existing ids, emails and bcrypt hashes remain untouched.

CREATE TABLE IF NOT EXISTS user_vaults (
  user_id BIGINT UNSIGNED NOT NULL,
  version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  algorithm VARCHAR(24) NOT NULL DEFAULT 'AES-GCM',
  kdf VARCHAR(32) NOT NULL DEFAULT 'PBKDF2-SHA-256',
  iterations INT UNSIGNED NOT NULL,
  salt VARCHAR(64) NOT NULL,
  iv VARCHAR(32) NOT NULL,
  ciphertext LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_user_vaults_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
