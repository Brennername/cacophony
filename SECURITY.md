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

Instead, please send an email to:
**security@cacophony-project.org**

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
