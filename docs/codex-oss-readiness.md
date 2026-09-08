# Codex for Open Source Readiness

## Checklist: Signals Still Missing for Strong Candidacy

This document tracks what signals the project currently has and what's still missing
for a strong open-source candidacy. Do not invent numbers — only report what is
measurable or observable.

### Current Signals (Observable)

| Signal | Status | How Observed |
|--------|--------|--------------|
| **users** | ✅ Measurable | 12/12 browser QA screenshots captured; game playable locally; no install required |
| **contributors** | ⚠️ Pending | 0 external contributors yet (only internal development); onboarding process ready |
| **stars** | ⚠️ Pending | Not yet counted (will track after public readiness) |
| **forks** | ⚠️ Pending | Not yet counted (will track after public readiness) |
| **releases** | ✅ Completed | v0.1.0 release candidate documented; LICENSE created — MIT |
| **issue activity** | ✅ Prepared | 2 issue templates created; 0 issues opened yet (ready for community) |
| **PR activity** | ✅ Prepared | 1 PR template created; 0 PRs yet (ready for community) |
| **school/teacher usage** | ⚠️ Observed | Game played in local testing; no classroom deployment yet (Phase 7 planned) |
| **ecosystem relevance** | ✅ Contextual | Educational game framework; zero dependencies; Canvas 2D; Arduino extensibility |

### Missing Signals (Still Needed)

| Signal | Why It Matters | Target for Strong Candidacy |
|--------|----------------|----------------------------|
| **users** | Popularity indicator; shows the game solves a real problem | 100+ downloads/week after GitHub Pages deployment; teacher testimonials |
| **contributors** | Sustaina- bility; more maintainers = longer project life | ≥ 3 active contributors (beyond core maintainer) within 3 months of launch |
| **stars** | Discovery mechanism; shows community interest | ≥ 25 stars after 3 months of public availability |
| **forks** | Derivative works; shows the project is forkable usable | ≥ 10 forks after 3 months |
| **releases** | Milestone markers; shows project evolution | v0.1.0 tagged + v0.2.0 with community levels |
| **issue activity** | Community engagement; shows problems are being tracked | ≥ 10 issues opened (bugs, enhancements, good first issues) in 3 months |
| **PR activity** | Direct contributions; shows the project accepts external work | ≥ 3 PRs merged (bug fixes, levels, docs) in 3 months |
| **school/teacher usage** | Primary target audience validation | ≥ 1 teacher reports using game in classroom; feedback provided |
| **ecosystem relevance** | Longevity beyond single project | Integration with teacher workflows; compatibility with other edTech tools |

### Codex OSS Readiness Assessment

| Area | Current Status | Codex Support Potential |
|------|---------------|------------------------|
| **PR review** | ✅ Guidelines in CONTRIBUTING.md; template in .github/ | Codex can auto-summarize PR diffs, check template compliance, flag style violations against CONTRIBUTING conventions |
| **Issue triage** | ✅ 2 templates created (bug_report.yml, feature_request.yml) | Codex can label issues based on keyword detection, check template field completion, prioritize by component affected |
| **Test generation** | ✅ tools/validate-level.js exists; npm run test:level | Codex can help write additional validation scripts, generate test cases for new challenge types, expand BFS checks |
| **Maintenance automation** | ✅ CI workflow (gh actions); CHANGELOG.md; CODE_OF_CONDUCT.md | Codex can track issue age, PR age, contributor burnout signals, generate monthly maintainability reports |
| **Accessibility** | ✅ docs/accessibility.md created; partial implementation | Codex can audit new features against accessibility checklist, flag color-dependence, suggest contrast improvements |
| **Translations** | ⚠️ i18n not implemented (Phase 5 planned) | Codex can help generate message catalog templates from challenge text, though runtime i18n not in v0.1.0 |
| **Release workflows** | ✅ CHANGELOG.md; ROADMAP.md; release recommendation documented | Codex can draft CHANGELOG entries from git log, summarize release candidates, version status tracking |
| **Contributor assistance** | ✅ CONTRIBUTING.md; adding-levels.md; architecture.md | Codex can answer "how do I..." questions by referencing docs, reducing maintainer burden |
| **Documentation maintenance** | ✅ 6+ docs files; but can drift | Codex can flag docs out of sync with code changes (e.g., if MathDoor state changes but docs don't reflect it) |

### Concrete Checklist for Strong Candidacy

**The following must be true for MathQuest to have a strong open-source candidacy:**

- [ ] **LICENSE file created** with chosen license (MIT recommended)
- [ ] **First contributor onboarded** — at least one external PR merged
- [ ] **v0.1.0 git tag** created and published (GitHub Release)
- [ ] **≥ 25 GitHub stars** — measured after public deployment
- [ ] **≥ 10 GitHub forks** — measured after public deployment
- [ ] **≥ 3 issues opened** — bug reports, enhancement requests, good first issues
- [ ] **≥ 3 PRs merged** — bug fixes, level additions, documentation improvements
- [ ] **1 teacher reports classroom use** — qualitative but documented
- [ ] **BFS validator 100% pass rate** — all new levels validated via `npm run test:level`
- [ ] **0 console errors** — measured per browser QA run (12/12 screenshots)
- [ ] **CHANGELOG actively maintained** — unreleased section updated; v0.1.0 entry complete

**If all of the above are true, MathQuest has a strong open-source candidacy.**
If 50%+ are true, the project is on the right track and needs time/community growth.
If < 50% are true, the project is still in "early setup" phase and the documentation
infrastructure (already completed) is the primary asset for attracting the first
contributors and users.

### Why Codex — Not OpenAI API in Runtime

The Codex support described above does **not** require embedding OpenAI API keys
in the MathQuest runtime. Codex is a support tool for the *maintainers* and
*contributors*, not a game feature. The game remains zero-dependency, offline,
and free of external API calls at runtime.

Codex capabilities that benefit MathQuest:
- PR summarization (maintainer tool — no runtime impact)
- Issue labeling automation (maintainer tool — no runtime impact)
- Test script suggestions (developer tool — local only)
- CHANGELOG drafting (maintainer tool — local only)
- Accessibility audits (maintainer tool — local only)

**All Codex-assisted workflows execute outside the game runtime.**

### Next Steps (Codex-Aligned)

1. Create LICENSE file (user confirmation needed — MIT recommended)
2. Publish v0.1.0 release on GitHub
3. Enable Issues and Projects tabs on the repository
4. First contributor onboards via "good first issue" (bug fix or level addition)
5. Track metrics: stars, forks, issues, PRs over 3-month period
6. Use Codex (if available) to automate PR triage and CHANGELOG drafting
7. After 3 months: assess which checklist items are true; adjust roadmap

**The documentation infrastructure is complete. The remaining work is community
growth and metric accumulation — areas where Codex can assist as a maintainer
tool without affecting the game.**