# Password Manager

An account-based password manager with a static GitHub Pages frontend, a separate Node.js/Express API, and MySQL storage.

The browser encrypts the complete vault before synchronising it. MySQL stores the encrypted vault payload, not individual website passwords in readable form.

## Architecture

- **Frontend:** `web/`, published by GitHub Pages.
- **Backend:** `server.js`, deployed as a separate Railway service.
- **Database:** MySQL. The existing `users` table is reused where its columns match the previous project.
- **Account authentication:** bcrypt password hashes and short-lived signed bearer tokens.
- **Vault encryption:** AES-256-GCM with a PBKDF2-SHA-256 key derived from a separate vault master password.

There are two separate passwords:
1. The **account password** signs in to your user account.
2. The **vault master password** decrypts your saved website credentials.

Resetting the account password does not reset or decrypt the vault master password.

## Preserving the existing database

The v2 backend is designed to reuse the existing MySQL `users` table and bcrypt hashes. It does not delete or rewrite existing user rows during startup. It adds two tables:

- `user_vaults`: one encrypted vault payload per account.
- `password_resets`: hashed, expiring, single-use account reset tokens.

The backend detects whether the old `plain_password` column exists. If it does, new registrations and account password resets write an empty value to that legacy field only. The API never reads or returns that column.

**Before reconnecting the backend, take a full MySQL backup and rotate the old database password.** The previous repository contained credentials in a committed `.env` file. Removing that file from the current branch does not erase it from Git history.

The additive migration is in `database/migration-v2.sql`. The optional removal of the old plaintext column is in `database/optional-cleanup-legacy-plaintext.sql`. Do not run the cleanup script until you have a verified backup and have confirmed existing accounts can sign in with their bcrypt hashes.

The original project did not have a separate website-credential table in the inspected backend. Old user accounts can be preserved, but website-password entries must be imported from an existing encrypted browser vault or backup if one exists.

## 1. Deploy the backend to Railway

Create a new Railway service from this GitHub repository. Use the repository root as the service root.

- **Build command:** `npm install`
- **Start command:** `npm start`

Add these variables to the Railway service:

| Variable | Value |
|---|---|
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | Newly rotated MySQL password |
| `DB_NAME` | Database name |
| `DB_SSL` | `true` if your MySQL provider requires TLS, otherwise `false` |
| `JWT_SECRET` | Random secret with at least 32 characters |
| `FRONTEND_ORIGIN` | `https://tanshi2003.github.io` (origin only, no path) |
| `FRONTEND_URL` | `https://tanshi2003.github.io/Password_Manager/` |

Generate a JWT secret locally with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For account password-reset emails, also configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Forgot-password returns a clear configuration error until SMTP is configured.

On first start, the API creates the additive vault/reset tables if they do not already exist. It does not drop or recreate the existing users table.

After the service deploys, test:

```
https://YOUR-RAILWAY-SERVICE.up.railway.app/api/health
```

The response should show `ok: true` and `database: "connected"`.

## 2. Connect GitHub Pages to Railway

Edit `web/config.js` and replace the placeholder with your actual Railway public URL:

```js
window.PASSWORD_MANAGER_API_BASE = "https://YOUR-RAILWAY-SERVICE.up.railway.app";
```

Do not add a trailing slash. Do not put database credentials, SMTP credentials, or JWT secrets in this file.

Commit and push the change. GitHub Actions publishes the `web/` folder automatically. GitHub Pages must have **Settings → Pages → Build and deployment → Source → GitHub Actions** selected.

## 3. How users sign in and access the vault

- Existing users sign in with the email and account password they already used in the old project, provided their stored bcrypt hash is still valid.
- New users create an account with an account password of at least 12 characters.
- After account sign-in, the user creates or enters a separate vault master password.
- On another device, sign in to the same account and enter the same vault master password. The encrypted vault is downloaded and decrypted in that browser.
- The account password reset flow does not reset the vault master password.

The API holds the account token in browser memory only. A page refresh requires another account sign-in. The vault master password and decrypted entries are not stored in local storage.

## 4. Existing local Keynest vault migration

If the earlier local-only Keynest version created an encrypted vault in this same browser, the new app detects that encrypted local data when the signed-in account has no cloud vault. Enter the old vault master password to decrypt and upload it. The local copy is only removed after the cloud save succeeds.

If you do not know the old local vault master password, it cannot be recovered from the ciphertext. Do not clear browser site data before checking for an encrypted backup.

## 5. Local backend development

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env` and fill in local MySQL, JWT and optional SMTP values.
3. Install packages:

   ```bash
   npm install
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

5. Serve the `web/` folder over localhost, set `web/config.js` to the local API URL, and add your local frontend origin to `FRONTEND_ORIGIN`.

Never commit `.env` or any service credentials.

## Security notes

- User account passwords are stored as bcrypt hashes (cost 12) and compared server-side.
- New account passwords must be at least 12 characters. Existing accounts can still sign in with their existing password.
- Vault entries are encrypted in the browser with AES-256-GCM before they are sent to the API.
- The API validates and stores the encrypted envelope only. It does not have the vault key.
- API login and password-reset routes are rate-limited.
- The vault master password cannot be recovered if forgotten. Keep an encrypted backup.
- This is a personal project, not an independently audited password manager. Do not use it as the only protection for critical credentials until it has received a proper security review.
