# Security Policy

## Supported Versions

Security updates are applied to the active development branch (`master`) and the latest stable release.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0   | No        |

---

## Reporting a Vulnerability

If you discover a security vulnerability within Cacophony, please do NOT file a public issue on GitHub.

Instead, please send a private message to the project maintainer directly on GitHub.

Please include in your report:

1. A description of the vulnerability, its impact, and potential attack scenarios.
2. Steps to reproduce the issue, including proof-of-concept code, payloads, or configurations.
3. Relevant environment details (Node.js version, Docker setup, OS, local models involved).

### Response Process

1. We will acknowledge receipt of your vulnerability report within 48 hours.
2. We will validate and investigate the issue within 5 business days.
3. Once validated, a remediation patch will be prepared and tested.
4. We will coordinate disclosure with you to ensure safe release.

---

## Secret Management

- Never commit real credentials, private keys, or API tokens into source control.
- Use `.env` files for local development secrets, referencing `.env.example` as a template.
- Master vault keys should be managed through secure environment variables or vault backends.

### Vault Master Key (VAULT_MASTER_KEY)

The vault master key is a 256-bit AES-GCM key used to encrypt sensitive data stored in the local database vault (API keys, OAuth tokens, etc.).

**Generating a new key:**

```bash
openssl rand -hex 32
```

**Startup safety check:** The daemon will refuse to start if the vault key is set to the default all-zeros placeholder (`00000000...`). This prevents running with a trivially guessable key. Demo/simulation mode is exempt from this check.

### Key Rotation Procedure

When rotating the vault master key:

1. **Export current vault entries** using the current key:
   ```bash
   bin/cacophony vault export --output vault-backup.json
   ```

2. **Stop the daemon** to prevent concurrent access:
   ```bash
   bin/cacophony stop
   ```

3. **Generate and set the new key** in your `.env` file:
   ```bash
   # Generate new key
   NEW_KEY=$(openssl rand -hex 32)
   # Update .env with the new key value
   ```

4. **Re-encrypt vault entries** with the new key:
   ```bash
   bin/cacophony vault re-encrypt \
     --old-key <previous_64_hex_chars> \
     --new-key <new_64_hex_chars>
   ```

5. **Restart the daemon** and verify vault access:
   ```bash
   bin/cacophony start
   bin/cacophony vault list
   ```

6. **Securely destroy** the old key material and any plaintext export files.

### API Key Management

- **Frontier API keys** (OpenAI, Anthropic, Gemini) can be stored either in `.env` or in the encrypted database vault via the UI.
- **Gitea API tokens** should be rotated periodically. The system supports OAuth2 refresh token flow for automated rotation.
- **Heroku API keys** should use `heroku auth:token` for local use and Heroku CI secrets for deployment pipelines.

### Gitea Admin Credentials

The `GITEA_ADMIN_PASSWORD` in `.env` is used for initial Gitea bootstrap only. After first setup:
1. Change the admin password via the Gitea web UI.
2. Generate a personal access token for API operations.
3. Store the token in `GITEA_API_TOKEN` in `.env`.
