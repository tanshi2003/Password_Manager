# Password Manager

A Node.js, Express, and MySQL password-manager learning project with signup, signin, a dashboard, and password-reset flows.

> **Security notice:** This repository is not production-ready. Do not enter real passwords or sensitive credentials into the current app. The existing backend stores a plaintext copy of each account password in the database and returns it to the dashboard. That must be redesigned before real use.

## Hosting: GitHub Pages vs. a backend

GitHub Pages only hosts static files (HTML, CSS, JavaScript, and images). It cannot run the Express server, maintain Express sessions, connect to MySQL, or send password-reset emails.

The current app depends on Express routes in `app.js`, MySQL, Express sessions, and Nodemailer. The frontend also calls an older Render API URL. Selecting GitHub Pages alone will not make signup, signin, dashboard data, or password reset work.

## Run locally

1. Install Node.js.
2. Clone this repository.
3. Install packages: `npm install`.
4. Create your own untracked `.env` file with the environment variables required by your database setup. Never commit this file.
5. Start the server: `npm start`.
6. Open http://localhost:3000.

A compatible MySQL database and configured email provider are also required for password-reset functionality.

## Before using real credentials

The current implementation needs a security redesign:

- Never store account passwords in plaintext. Store only strong password hashes for user authentication.
- Do not return password hashes or plaintext passwords from API responses.
- Do not put vault secrets in `localStorage` without a carefully designed encryption model.
- Use a strong session secret from environment configuration, secure cookies, and HTTPS.
- Generate cryptographically secure, expiring, single-use password-reset tokens.
- Keep database and email credentials on the server, never in browser code or Git.
- Rotate credentials that were previously committed to this repository.

## GitHub Pages

GitHub Pages can host a marketing page or a carefully designed client-side encrypted demo vault, but it cannot provide this project's current server-backed account system. A secure client-side vault would need a separate design using browser cryptography, a key derived from a user passphrase, authenticated encryption, and carefully considered recovery and data-sync behavior.

Until that redesign is complete, run this as a learning project locally or deploy it with a properly secured backend. GitHub Pages alone is not a replacement for the current Express + MySQL backend.
