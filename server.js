require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const { rateLimit } = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "";
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "").split(",").map(v => v.trim()).filter(Boolean);
const FRONTEND_URL = (process.env.FRONTEND_URL || "https://tanshi2003.github.io/Password_Manager/").replace(/\/$/, "") + "/";

if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with a random value of at least 32 characters.");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER,
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.DB_NAME || process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
});

const mailReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
const transporter = mailReady ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}) : null;

let hasLegacyPlainPasswordColumn = false;

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || FRONTEND_ORIGIN.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));
app.use(express.json({ limit: "2mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." }
});
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many reset requests. Please try again later." }
});

function cleanEmail(value) { return String(value || "").trim().toLowerCase(); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 190; }
function safeUser(row) {
  return { id: String(row.id), first_name: row.first_name, last_name: row.last_name, email: row.email, mobile: row.mobile || "" };
}
function createToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, {
    expiresIn: "8h", issuer: "password-manager-api", audience: "password-manager-web"
  });
}
function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Please sign in again." });
  try {
    req.auth = jwt.verify(token, JWT_SECRET, { issuer: "password-manager-api", audience: "password-manager-web" });
    return next();
  } catch (_) {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}
function validEncryptedVault(body) {
  if (!body || typeof body !== "object") return false;
  const iterations = Number(body.iterations);
  return body.version === 1 &&
    body.algorithm === "AES-GCM" &&
    body.kdf === "PBKDF2-SHA-256" &&
    Number.isInteger(iterations) && iterations >= 100000 && iterations <= 1000000 &&
    typeof body.salt === "string" && /^[A-Za-z0-9+/]+=*$/.test(body.salt) && body.salt.length <= 64 &&
    typeof body.iv === "string" && /^[A-Za-z0-9+/]+=*$/.test(body.iv) && body.iv.length <= 32 &&
    typeof body.ciphertext === "string" && body.ciphertext.length >= 1 && body.ciphertext.length <= 1500000;
}
async function insertUser({ firstName, lastName, email, mobile, passwordHash }) {
  if (hasLegacyPlainPasswordColumn) {
    // Legacy field receives an empty value only. The new application never stores or reads plaintext passwords.
    return pool.execute(
      "INSERT INTO users (first_name, last_name, email, mobile, password, plain_password) VALUES (?, ?, ?, ?, ?, '')",
      [firstName, lastName, email, mobile || null, passwordHash]
    );
  }
  return pool.execute(
    "INSERT INTO users (first_name, last_name, email, mobile, password) VALUES (?, ?, ?, ?, ?)",
    [firstName, lastName, email, mobile || null, passwordHash]
  );
}
async function updateAccountPassword(userId, passwordHash) {
  if (hasLegacyPlainPasswordColumn) {
    await pool.execute("UPDATE users SET password = ?, plain_password = '' WHERE id = ?", [passwordHash, userId]);
  } else {
    await pool.execute("UPDATE users SET password = ? WHERE id = ?", [passwordHash, userId]);
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL,
      email VARCHAR(190) NOT NULL,
      mobile VARCHAR(25) DEFAULT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [legacyColumns] = await pool.execute(
    "SELECT COUNT(*) AS total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'plain_password'"
  );
  hasLegacyPlainPasswordColumn = Number(legacyColumns[0].total) > 0;

  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true, service: "password-manager-api", database: "connected" });
  } catch (error) {
    console.error("Health check error:", error.code || error.message);
    return res.status(503).json({ ok: false, service: "password-manager-api", database: "unavailable" });
  }
});

app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
  try {
    const firstName = String(req.body.first_name || "").trim();
    const lastName = String(req.body.last_name || "").trim();
    const email = cleanEmail(req.body.email);
    const mobile = String(req.body.mobile || "").trim();
    const password = String(req.body.password || "");
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) return res.status(400).json({ message: "Please enter a valid first and last name." });
    if (!validEmail(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    if (mobile.length > 25) return res.status(400).json({ message: "Mobile number is too long." });
    if (password.length < 12 || password.length > 200) return res.status(400).json({ message: "Your account password must be at least 12 characters." });
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await insertUser({ firstName, lastName, email, mobile, passwordHash });
    const user = { id: result.insertId, first_name: firstName, last_name: lastName, email, mobile };
    return res.status(201).json({ token: createToken(user), user: safeUser(user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "An account with this email already exists." });
    return next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!validEmail(email) || !password) return res.status(400).json({ message: "Enter your email and password." });
    const [rows] = await pool.execute(
      "SELECT id, first_name, last_name, email, mobile, password FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (!rows.length) return res.status(401).json({ message: "Incorrect email or password." });
    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Incorrect email or password." });
    return res.json({ token: createToken(user), user: safeUser(user) });
  } catch (error) { return next(error); }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT id, first_name, last_name, email, mobile FROM users WHERE id = ? LIMIT 1", [req.auth.sub]);
    if (!rows.length) return res.status(401).json({ message: "Account not found. Please sign in again." });
    return res.json({ user: safeUser(rows[0]) });
  } catch (error) { return next(error); }
});

app.post("/api/auth/forgot-password", resetLimiter, async (req, res, next) => {
  try {
    if (!transporter) return res.status(503).json({ message: "Password-reset email is not configured on the backend yet." });
    const email = cleanEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const [rows] = await pool.execute("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
    if (!rows.length) return res.json({ message: "If an account exists for that email, a reset link will be sent." });
    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.execute("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
    await pool.execute(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))",
      [user.id, tokenHash]
    );
    const resetUrl = FRONTEND_URL + "?reset=" + encodeURIComponent(token);
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: "Reset your Password Manager account password",
        text: "Use this link within 30 minutes to reset your account password: " + resetUrl
      });
    } catch (mailError) {
      await pool.execute("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
      console.error("Password reset email error:", mailError.message);
      return res.status(503).json({ message: "The reset email could not be sent. Please try again later." });
    }
    return res.json({ message: "If an account exists for that email, a reset link will be sent." });
  } catch (error) { return next(error); }
});

app.post("/api/auth/reset-password", resetLimiter, async (req, res, next) => {
  const resetToken = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (!/^[a-f0-9]{64}$/i.test(resetToken)) return res.status(400).json({ message: "This reset link is invalid or expired." });
  if (password.length < 12 || password.length > 200) return res.status(400).json({ message: "Your new account password must be at least 12 characters." });
  const connection = await pool.getConnection();
  try {
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const [rows] = await connection.execute(
      "SELECT id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1",
      [tokenHash]
    );
    if (!rows.length) return res.status(400).json({ message: "This reset link is invalid or expired." });
    const hash = await bcrypt.hash(password, 12);
    await connection.beginTransaction();
    if (hasLegacyPlainPasswordColumn) {
      await connection.execute("UPDATE users SET password = ?, plain_password = '' WHERE id = ?", [hash, rows[0].user_id]);
    } else {
      await connection.execute("UPDATE users SET password = ? WHERE id = ?", [hash, rows[0].user_id]);
    }
    await connection.execute("DELETE FROM password_resets WHERE user_id = ?", [rows[0].user_id]);
    await connection.commit();
    return res.json({ message: "Account password updated. You can now sign in." });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally { connection.release(); }
});

app.get("/api/vault", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT version, algorithm, kdf, iterations, salt, iv, ciphertext, updated_at FROM user_vaults WHERE user_id = ? LIMIT 1",
      [req.auth.sub]
    );
    if (!rows.length) return res.json({ vault: null });
    const row = rows[0];
    return res.json({ vault: {
      version: Number(row.version), algorithm: row.algorithm, kdf: row.kdf,
      iterations: Number(row.iterations), salt: row.salt, iv: row.iv,
      ciphertext: row.ciphertext, updated_at: row.updated_at
    }});
  } catch (error) { return next(error); }
});

app.put("/api/vault", requireAuth, async (req, res, next) => {
  try {
    const vault = req.body;
    if (!validEncryptedVault(vault)) return res.status(400).json({ message: "The encrypted vault payload is invalid." });
    await pool.execute(
      `INSERT INTO user_vaults (user_id, version, algorithm, kdf, iterations, salt, iv, ciphertext)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE version = VALUES(version), algorithm = VALUES(algorithm),
       kdf = VALUES(kdf), iterations = VALUES(iterations), salt = VALUES(salt),
       iv = VALUES(iv), ciphertext = VALUES(ciphertext), updated_at = CURRENT_TIMESTAMP`,
      [req.auth.sub, vault.version, vault.algorithm, vault.kdf, vault.iterations, vault.salt, vault.iv, vault.ciphertext]
    );
    return res.json({ message: "Encrypted vault synchronised.", updated_at: new Date().toISOString() });
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin is not allowed by CORS.") return res.status(403).json({ message: "This website is not allowed to access the API." });
  console.error("API error:", error.code || error.message);
  return res.status(500).json({ message: "Something went wrong. Please try again." });
});

async function start() {
  await initializeDatabase();
  app.listen(PORT, "0.0.0.0", () => console.log("Password Manager API listening on port " + PORT));
}
start().catch(error => {
  console.error("Could not start API:", error.code || error.message);
  process.exit(1);
});
