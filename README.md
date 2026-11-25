# Password Manager

An account-based password manager with a static GitHub Pages frontend, a separate Node.js/Express API, and a MySQL-compatible database.

## Free hosting architecture

- **Frontend:** `web/`, deployed on GitHub Pages.
- **Backend:** `server.js`, deployed as a Render Free Web Service using `render.yaml`.
- **Database:** TiDB Cloud Starter in MySQL-compatible mode with a zero spending limit.
- **Account authentication:** bcrypt password hashes and short-lived signed bearer tokens.
- **Vault encryption:** AES-256-GCM with a PBKDF2-SHA-256 key derived from a separate vault master password. Vault data is encrypted in the browser before upload.

The account password signs in to the account. The separate vault master password decrypts saved website credentials.

## Free-tier limitations

- Render Free web services spin down after 15 minutes without inbound traffic. A sleeping service takes about a minute to wake. Render can restart a free service at any time and free services do not include persistent disks or always-on availability. Suitable for a hobby project, not a production-critical password manager. See [Render Free services](https://render.com/docs/free) and [Render FAQ](https://render.com/docs/faq).
- TiDB Cloud Starter offers MySQL-compatible free quotas for eligible initial instances: 5 GiB row storage, 5 GiB columnar storage and 50 million request units per month. Set the monthly spending limit to **0** to remain free; once quota is reached, new connections are denied until the quota resets. See [TiDB Starter plan](https://docs.pingcap.com/tidbcloud/select-cluster-tier/) and [spending limits](https://docs.pingcap.com/tidbcloud/manage-serverless-spend-limit/).
- Render Free blocks outbound SMTP traffic on ports 25, 465 and 587. Account password-reset email therefore uses the optional Resend HTTPS API. Resend requires a verified sender for real delivery. Without that configuration, normal signup, login and vault syncing work, but the forgot-password email route remains disabled. See [Render SMTP restrictions](https://render.com/articles/can-i-send-email-over-smtp-from-render).

These providers are free within the published limits. Do not add a payment method or set a positive TiDB spending limit if your requirement is strictly zero cost. Free quotas and provider policies can change; check the linked provider pages before provisioning.

## 1. Create a TiDB Cloud Starter database

1. Open [TiDB Cloud](https://tidbcloud.com/) and create/sign in to your account.
2. Create a **TiDB Cloud Starter** instance in **MySQL-compatible** mode.
3. Keep the monthly spending limit at **0**. Do not add a card or enable paid overages.
4. Name the database `password_manager`.
5. Create a database password and store it privately.
6. Copy the connection details: host, port, username and password. The port is typically `4000`.
7. Keep TLS enabled.

TiDB supports the MySQL protocol and the project uses the Node `mysql2` driver with TLS 1.2. See [TiDB Node.js mysql2 guide](https://docs.pingcap.com/tidb/dev/dev-guide-sample-application-nodejs-mysql2/).

## 2. Deploy the API to Render Free

The repository includes a Render Blueprint at `render.yaml`.

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Connect your GitHub account if needed.
3. Choose **New → Blueprint** and select `tanshi2003/Password_Manager`.
4. Review the service `password-manager-api`. Confirm the instance plan is **Free**.
5. Render reads `render.yaml` and prompts for the unsynced database connection values and optional email configuration.
6. Enter the TiDB host, username and password. Keep `TIDB_PORT=4000`, `TIDB_DATABASE=password_manager`, and `TIDB_SSL=true`.
7. Keep the generated `JWT_SECRET`. Never put it in GitHub or frontend code.
8. Deploy the service.

The API creates the `users`, `user_vaults` and `password_resets` tables if absent. It does not drop tables or delete rows.

After deployment, Render provides a public URL similar to:

```
https://password-manager-api.onrender.com
```

Test:

```
https://YOUR-RENDER-SERVICE.onrender.com/api/health
```

A healthy response should include `"ok": true` and `"database": "connected"`.

## 3. Connect GitHub Pages to Render

After Render provides the public service URL, edit `web/config.js` and replace the placeholder:

```js
window.PASSWORD_MANAGER_API_BASE = "https://YOUR-RENDER-SERVICE.onrender.com";
```

Do not add a trailing slash. Commit and push. GitHub Actions publishes `web/` automatically. GitHub Pages must use **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## 4. Account and vault access

- Existing users can sign in with their previous email and account password only if their old bcrypt hash is migrated into the new database. A fresh TiDB database starts empty, so old accounts do not appear automatically.
- New users create an account with an account password of at least 12 characters.
- After sign-in, the user creates or enters a separate vault master password.
- On another device, sign in to the same account and enter the same vault master password to retrieve the encrypted cloud vault.
- Resetting the account password does not reset the vault master password.

The API token is held in browser memory only, so refreshing the page requires signing in again. The vault master password and decrypted entries are not stored in local storage.

## 5. Password-reset email (optional)

Render Free blocks SMTP ports 25, 465 and 587. The API can send password-reset emails through Resend's HTTPS API:

1. Create a Resend account.
2. Verify a sender domain/address you control.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in Render environment variables.
4. Keep the API key private and never put it in `web/config.js`.

If no sender is verified, leave these variables unset. Account signup, login, vault storage and sync still work; email-based account recovery remains disabled until an email provider is configured.

## Database safety and previous Railway data

This free-hosting route uses a **new TiDB database**. It does not connect to or modify the old Railway MySQL volumes. Existing account rows and any historic database data will not be present in TiDB unless they are exported and migrated from the old database later. The API schema is additive and will not drop tables or user rows from a database you connect.

The previous repository contained credentials in Git history. Rotate the old Railway database password and revoke the old Gmail app password. Removing a secret from the latest branch does not erase earlier Git history.

This is a personal learning project, not an independently audited commercial password manager. Do not use it as your only protection for critical credentials.
