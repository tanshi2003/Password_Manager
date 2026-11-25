# Password Manager

An account-based password manager with a static GitHub Pages frontend, a separate Node.js/Express API, and a MySQL-compatible database.

## Hosting architecture

- **Frontend:** `web/`, deployed on GitHub Pages.
- **Backend:** `server.js`, running on the existing Render Free Web Service `Password_Manager`.
- **Database:** TiDB Cloud Starter, MySQL-compatible, with a zero spending limit.
- **Account authentication:** bcrypt password hashes and short-lived signed bearer tokens.
- **Vault encryption:** AES-256-GCM with a PBKDF2-SHA-256 key derived from a separate vault master password. The browser encrypts the full vault before upload.

The account password signs in to the account. The separate vault master password decrypts saved website credentials.

## Free-tier limitations

Render Free services sleep after 15 minutes without inbound traffic and can take about a minute to wake. They have limited monthly usage and no persistent disk. TiDB Cloud Starter has a free quota and can block new connections if the quota is exhausted while the spending limit is zero. These are hobby-project hosting tiers, not production-grade availability.

Render Free blocks outbound SMTP ports 25, 465 and 587. The password-reset route supports the Resend HTTPS API, but requires a verified sender. Without it, signup, login and vault sync work; email-based account recovery is unavailable.

## Deployment layout

The existing Render service is already linked to this repository and uses:
- Build command: `npm install`
- Start command: `node app.js`
- Plan: Free

`app.js` is a compatibility entry point that starts the new `server.js`, so the Render service's existing start command does not need to change.

GitHub Pages serves the `web/` directory. `web/config.js` points to the existing Render API URL.

## Render environment variables

Set these in the existing Render service's **Environment** page:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `TIDB_HOST` | TiDB connection host from the Connect dialog |
| `TIDB_PORT` | `4000` |
| `TIDB_USER` | TiDB connection username |
| `TIDB_PASSWORD` | The newly generated TiDB password |
| `TIDB_DATABASE` | `password_manager` |
| `TIDB_SSL` | `true` |
| `JWT_SECRET` | A unique random secret of at least 32 characters |
| `FRONTEND_ORIGIN` | `https://tanshi2003.github.io` |
| `FRONTEND_URL` | `https://tanshi2003.github.io/Password_Manager/` |

Do not put database credentials, Resend keys or JWT secrets in GitHub or frontend code.

After setting the variables, deploy the existing Render service. Test:

```
https://password-manager-pptl.onrender.com/api/health
```

A healthy response includes `"ok": true` and `"database": "connected"`.

## TiDB network access

The TiDB public endpoint must allow connections from the Render service. In Render, open the service's **Connect → Outbound** tab and copy its Singapore-region outbound CIDR ranges. Add those ranges to the TiDB Starter firewall rules. Do not use `0.0.0.0/0` (allow all IP addresses).

## Database schema and safety

The backend creates the `users`, `user_vaults` and `password_resets` tables if they do not exist. It does not drop existing tables or delete user rows.

This TiDB instance is a new database. Existing users from old Railway databases are not automatically copied over. Account records can only be migrated if an export of the original database is available.

The backend detects whether a legacy `plain_password` column exists but never reads it. It writes an empty value to that column only when the legacy schema still requires it. The optional cleanup SQL is not run automatically.

## Account and vault access

- Users create an account with an account password of at least 12 characters.
- After sign-in, they create or enter a separate vault master password.
- On another device, sign in to the same account and enter the same vault master password to retrieve the encrypted cloud vault.
- Resetting the account password does not reset the vault master password.
- The API token is held in memory, so a page refresh requires signing in again.
- The vault master password and decrypted entries are not stored in local storage.

## Password reset email (optional)

Render Free blocks SMTP. To enable account password-reset emails, configure `RESEND_API_KEY` and `EMAIL_FROM` in Render. The sender must be verified with Resend. Until then, the reset-email endpoint remains unavailable; account login and vault storage are unaffected.

## Local development

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env` and provide MySQL-compatible connection settings and a strong `JWT_SECRET`.
3. Run `npm install`.
4. Run `npm start`.
5. Serve the `web/` directory locally and set `web/config.js` to your local API URL.

Never commit `.env` or service credentials.

## Security notes

The previous project prototype stored plaintext account passwords and exposed credentials in the Git history. The rebuilt backend uses bcrypt for account passwords and client-side authenticated encryption for vault contents. Rotate any previously committed database/email credentials. This is a personal learning project, not an independently audited commercial password manager; do not use it as your sole protection for critical credentials.
