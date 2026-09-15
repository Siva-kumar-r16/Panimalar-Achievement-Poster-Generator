
### `SECURITY.md`

```md
# 🔐 Security Policy

## Supported Version

Security issues should be reported for the latest version of the project.

| Version | Supported |
|---|---|
| Latest | ✅ Yes |
| Older versions | ❌ No |

## 🚨 Reporting a Security Issue

If you discover a security vulnerability, please do not publicly disclose the issue before it has been reviewed.

Contact the project maintainer privately with:

- A description of the issue
- Steps to reproduce it
- Affected file or component
- Potential impact
- Any suggested solution

## 🔒 Data Handling

This application is designed as a client-side static application.

User-uploaded photos are handled locally by the browser.

The application uses:

- IndexedDB for local photo storage
- LocalStorage for poster settings

No backend database is required for normal operation.

## ⚠️ Sensitive Information

Do not upload or store:

- Passwords
- API keys
- Authentication tokens
- Private credentials
- Confidential documents
- Sensitive personal information

Do not commit secrets to the repository.
