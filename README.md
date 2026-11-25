# Keynest Password Vault

A local-first password vault built with HTML, CSS, JavaScript, and the browser Web Crypto API. It is designed to run as a static site on GitHub Pages, without Render, Express, or a database.

## Play online

https://tanshi2003.github.io/Password_Manager/

## Features

- Create a vault protected by a master password.
- Encrypt the full vault in the browser using AES-256-GCM.
- Derive the encryption key with PBKDF2-SHA-256 (600,000 iterations).
- Save only the encrypted vault envelope in browser local storage.
- Add, edit, search, and delete credential entries.
- Generate strong random passwords.
- Copy usernames and passwords when needed.
- Lock manually or automatically after five minutes of inactivity.
- Export and import an encrypted JSON backup.

## How storage works

This is a local-first vault. Encrypted data is saved in the current browser profile on the current device. It is not synced to a server or automatically shared with another device.

- Export encrypted backups regularly and store them securely.
- To move to another device, transfer the encrypted backup and import it there using the same master password.
- If you forget the master password, the vault cannot be decrypted.
- If browser site data is cleared and you have no backup, the vault is lost.

## Security model and limitations

A random salt is used with PBKDF2-SHA-256 to derive an AES-256-GCM key from the master password. Each save uses a fresh 96-bit random IV. The master password and decrypted entries are kept in memory while the vault is unlocked; the value saved in local storage is ciphertext.

This is a personal learning project, not an independently audited commercial password manager. A browser app cannot protect against malware, malicious browser extensions, compromised devices, or same-origin script injection. Do not use it as your only password manager for critical accounts.

## Run locally

Because the app uses Web Crypto, use a secure context such as HTTPS or localhost. From the repository folder, run a local static server:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/web/ (or serve the contents of `web/` as the site root).

## GitHub Pages deployment

The Pages workflow publishes the `web/` directory. In the repository, open **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**, and save once. Future pushes to `main` deploy automatically.

## Repository history and credential rotation

The repository previously contained a Node/Express + MySQL prototype. It has been removed from the active branch because it stored plaintext account passwords and included credentials in tracked source/configuration. Removing those values from the latest commit does not erase them from Git history. **Rotate/revoke any database and email credentials that were ever committed** in their provider dashboards.
