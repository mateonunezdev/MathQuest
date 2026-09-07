# Contributing to MathQuest

Thank you for wanting to contribute to MathQuest! This guide explains how you can help make this educational game better.

## Setup

```bash
# Clone the repository
git clone https://github.com/mateonunezdev/mathquest-starter.git
cd mathquest-starter

# Install dependencies
npm install

# Start the development server
python3 -m http.server 8080

# Open http://localhost:8080 in your browser
```

## Branches

- **`main`** — stable releases only. Merged PRs that pass all checks.
- **`dev`** — integration branch for ongoing development. Feature branches merge into `dev`.
- **Feature branches** — create from `dev`: `git checkout dev -b feat/xyz`
- **Hotfix branches** — create from `main`: `git checkout main -b fix/xyz`

**Never commit directly to `main`.**

## Commits

- Use clear, descriptive commit messages
- Format: `type: descriptive message`
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation changes
  - `chore:` maintenance, tooling, formatting
  - `refactor:` code restructuring (no behavior change)
  - `test:` adding missing tests
- Keep commits small and focused
- Squash unrelated changes before committing
- Never commit secrets, API keys, or tokens

**Bad example:** `stuff`
**Good example:** `feat: add holographic challenge overlay to MathChallengeSystem`

## Commitment Requirements

All contributions must:

- Pass `npm run test:level` (level validation)
- Not break existing gameplay (START → PLAYING → CHALLENGE → VICTORY)
- Not introduce new console errors
- Include screenshots for UI changes (run `node tools/browser-qa.js`)
- Follow the existing code style (no framework changes, no Arduino unless on roadmap)
- Maintain the "no unnecessary dependencies" principle

## Issues

- Use the `.github/issue_template/bug_report.yml` template for bug reports
- Use the `.github/issue_template/feature_request.yml` template for feature requests
- Include:
  - Steps to reproduce (for bugs)
  - Browser and version
  - Console errors (use F12 dev tools)
  - Screenshots or screen recording
  - Expected vs. actual behavior
- Label issues appropriately (bug, enhancement, good first issue, question)

## Pull Requests

1. Ensure your branch is up to date: `git pull upstream dev`
2. Run local QA: `node tools/browser-qa.js` (checks 12 screenshots, no console errors)
3. Run level validation: `npm run test:level`
4. Fill the PR template completely
5. Respond to reviewer feedback promptly
6. Keep the PR focused — one issue per PR

**PR Checklist:**
- [ ] All tests pass
- [ ] No console errors
- [ ] Screenshots updated if UI changed
- [ ] Commit messages follow conventions
- [ ] Documentation updated if needed
- [ ] No breaking changes to core loop

## Adding New Levels

1. Edit `js/levels/LevelData.js` — add a new level function (e.g., `level2()`)
2. The level format follows the existing tilemap structure (1 = wall, 0 = floor)
3. Ensure the BFS gate progression is valid — no bypass paths
4. Add decorative elements via `LevelData.generateDecorations()`
5. Test: complete the level from start to victory
6. Add screenshots to `screenshots/` if visuals change

**Do not add levels that make the door bypassable or the goal unreachable.**

## How Not to Break A/B/C

- A, B, C keys are reserved for answer input (never reassign)
- The challenge system uses `MathChallengeSystem.open(challengeId, callback)`
- If adding new challenge types, keep the same `submitAnswer(letter)` interface
- Test all three answer options (A, B, C) before merging

## Reporting Bugs

Use the bug report issue template. Include:
1. Steps to reproduce the bug
2. Browser and version (or "all browsers")
3. Console output (F12 / Cmd+Opt+I)
4. Screenshots or screen recording
5. Expected behavior
6. Actual behavior

**Do not include API keys, personal data, or secrets in bug reports.**

## Development Guidelines

- **No framework changes** — MathQuest uses vanilla Canvas 2D. Do not attempt to add React, Three.js, or other frameworks.
- **No Arduino changes in this phase** — hardware abstraction is planned for Phase 6. Do not add Arduino-specific code unless explicitly requested for Phase 6.
- **No new dependencies** — the project philosophy is zero-runtime dependencies. If you need a utility, ask first or implement vanilla JS.
- **Respect the visual style** — maintain the navy/teal/cyan color palette and 2.5D depth cues unless proposing a deliberate rebrand.
- **Gameplay is locked** — no balance changes, level difficulty adjustments, or new mechanics without a full QA cycle (12 screenshots, browser QA, second run verification).

Thank you for contributing to MathQuest!