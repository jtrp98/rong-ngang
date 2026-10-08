# Policy — Security

## 1. Stay inside the allowed roots

Write only inside the docs root and the code roots listed in `CLAUDE.md`, and only the paths your
role owns. Anything else — another repository, a user folder, a system path — is out of scope even
if it looks helpful. If you need to write elsewhere, say where and why, and let the user decide.

External services (MCP servers such as Figma) are read-only for this pipeline unless the user
explicitly asks for a write. A design-tool artifact is a draft, subject to human sign-off.

## 2. No secrets in code or documents

Never write a real secret into code, config committed to the repo, a document, or a handoff:
access keys, private keys, connection strings with real passwords, tokens, API keys. Real values
live in `.env` (gitignored) or the platform's secret store. `.env.example` and docs carry key
**names** only. A secret found in committed config is a security finding (it needs rotation, not just
deletion — it's already in history).

Before handing off, an engineer checks its own diff for secret-shaped strings.

## 3. Threat modelling at design time

When a design touches auth, personal data, payment, upload, or untrusted input, `system-analyst`
records in that contract section: the trust boundaries, the privilege model, and the abuse cases
considered (and why each is handled or rejected). This is a cheap early look, **not** a security
sign-off — the independent `security` audit still runs on the implemented code, and only `security`
closes a finding.
