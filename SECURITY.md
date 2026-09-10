# Security

## Reporting Vulnerabilities

If you discover a security vulnerability in MathQuest, please report it responsibly by opening an issue with the `security` label or contacting the project maintainers directly.

**What to include:**
- Description of the vulnerability and its potential impact
- Steps to reproduce (if applicable)
- Browser and version used
- Any relevant screenshots or console output
- Whether the issue affects the standalone HTML file or requires a development server

**What to expect:**
- You will receive acknowledgment within 5 business days
- The maintainers will investigate the issue
- A fix will be prioritized based on severity
- You will be credited in the project's security history (unless you request anonymity)

## Sensitive Information

- Do not include API keys, tokens, or credentials in issue reports or pull requests
- The project does not handle user data, personal information, or authentication tokens
- All game state is client-side and does not transmit personal data

## Supported Versions

| Version | Supported | Notes |
|---------|-----------|-------|
| v0.1.0 | ✅ | Current release candidate |
| < v0.1.0 | ❌ | Please upgrade to latest |

## Reasonable Security Scope

MathQuest is an offline educational game with the following security considerations:

- **No network communication** — the game runs entirely client-side without external API calls
- **No user accounts** — no registration or login system
- **No persistent storage** of personal data — local storage is used only for optional game progress; any claims of persistent storage must be verified against the source code
- **No code execution from external sources** — all game logic is embedded in the HTML/JS bundle
- **Canvas 2D only** — no WebGL shader exploits or external binary dependencies

## Reasonable Expectations

Report issues related to:
- Potential XSS or code injection vectors
- Credential exposure in the repo
- Issues that could affect the integrity of the game state

Do not report:
- Gameplay balancing issues
- Visual design preferences
- Browser compatibility (unless a security vector)
- Missing features

## Security Checklist for Contributors

Before committing changes:
- [ ] No API keys, tokens, or secrets added to source files
- [ ] No debug logging that exposes internal state
- [ ] No accidental inclusion of local file paths
- [ ] Linter passes without new warnings
- [ ] Level validation passes (`npm run test:level`)
- [ ] No new console errors introduced