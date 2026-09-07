# Open Source Fund Readiness

## PROBLEM

Educational games that turn math practice into interactive experiences lack sustainable
open-source foundations. Teachers and schools cannot easily fork, modify, or deploy
the game without clear onboarding. Contributors face friction from missing documentation,
unclear contribution pathways, and no established governance. Projects often die because
onboarding is too difficult and maintainership is unclear.

MathQuest faces these exact barriers despite having solid gameplay.

## SOLUTION

Transform MathQuest from "finished prototype" to "mature open-source project" by
completing the documentation, tooling, and community infrastructure work. The gameplay
is already validated; what's missing is the socio-technical infrastructure that enables
a project to attract contributors, maintainers, and users sustainably.

## WHY OPEN SOURCE

- **Transparency:** Teachers can inspect how the game works, modify math challenges,
  and adapt it to their curriculum without waiting for developer updates.
- **Localization:** Communities can translate the game into Spanish, English, or other
  languages without proprietary barriers.
- **Longevity:** If the original maintainer stops, the project can continue via forks
  and contributor onboarding.
- **Customization:** Schools can add their own math challenges, levels, or visual
  themes without waiting for a commercial update cycle.
- **Trust:** No hidden telemetry, no external API calls at runtime, no proprietary
  lock-in. The game runs entirely offline.

## WHO BENEFITS

| Group | Benefit |
|-------|---------|
| **Teachers** | Can modify levels, challenges, and difficulty to match curriculum |
| **Students** | Access to educational game that works on classroom hardware (no internet required) |
| **Developers** | Fork-friendly codebase with clear contribution pathways |
| **Translators** | Add language support via standard localization (future Phase 5) |
| **Maintainers** | Onboarded contributors, documented processes, issue/PR triage ready |
| **Forkers** | Full access to tilemaps, challenge definitions, visual assets |

## CURRENT STATE

- ✅ Gameplay vertical slice (Level 1) — BFS-validated, no critical bugs
- ✅ Open-source documentation suite — 15+ files created (README through CHANGELOG)
- ✅ Community infrastructure — GitHub templates, CI, CODE_OF_CONDUCT, CONTRIBUTING
- ✅ License analysis — MIT recommended, evaluated
- ✅ QA tooling — 12-screenshot browser QA, level BFS validator
- ⚠️ License file — not yet created (pending user confirmation)
- ⚠️ First contributor — not yet onboarded (expected after public release)
- ⚠️ User adoption — not yet measured (will track via GitHub stars/forks)

## WHAT MAKES IT DIFFERENT

Most educational game projects fail at open source because:

| Barrier | MathQuest Status |
|---------|-----------------|
| No documentation | ✅ 15+ docs files completed |
| No contribution path | ✅ CONTRIBUTING.md with conventions |
| No license clarity | ✅ MIT analysis completed |
| No community tools | ✅ Issue templates, PR template, CI |
| Gameplay not validated | ✅ BFS pass, browser QA, 0 console errors |
| Framework lock-in | ✅ Zero runtime dependencies |
| Hardware requirements | ✅ Runs on modest hardware, offline |

**MathQuest avoids the common open-source death spiral because the gameplay is
already solid, and the documentation infrastructure is complete before the project
seeks contributors.**

## WHY CODEX

The Codex system (OpenCode) provides capabilities that directly support open-source
maintenance that this project can leverage (without embedding API keys in the runtime):

- **PR review automation** — Codex can help triage incoming PRs against the contributing
  guidelines, flagging style violations, dependency issues, or gameplay breakage.
- **Issue triage** — Codex can label issues (bug/enhancement/good first question)
  based on keyword analysis and template completion.
- **Test generation** — Codex can help write level validation scripts or test cases
  for new challenge types, reducing maintainer burden.
- **Maintenance automation** — Codex can track CHANGELOG entries, validate that
  `npm run test:level` passes after changes, and summarize diffs for release notes.
- **Accessibility** — Codex can audit docs/accessibility.md compliance and suggest
  improvements for new features.
- **Translations** — Codex can assist with message catalog generation for i18n
  (planned Phase 5), though runtime i18n is not implemented in v0.1.0.
- **Release workflows** — Codex can help draft CHANGELOG entries, version summaries,
  and release candidate notes (as documented in open-source-fund.md).
- **Contributor assistance** — Codex can answer "how do I add a level?" by pointing
  to CONTRIBUTING.md, adding-levels.md, and the BFS validator.
- **Documentation maintenance** — Codex can flag docs that are out of sync with code
  changes, ensuring the project doesn't accumulate documentation drift.

**These Codex capabilities are documented for fund-readiness; they do not require
embedding API keys in the game runtime. They are external tooling supports.**

## HOW API CREDITS WOULD BE USED (NOT IN RUNTIME)

If OpenCode or Codex API credits were available, they would be used for:

- Automated PR comment summarization (first comment on new PRs)
- Quarterly maintainability reports (test coverage, issue age, contributor activity)
- i18n message catalog generation from challenge text
- Accessibility audit reports (contrast checks, font scaling validation)
- Release candidate CHANGELOG drafting from git log analysis
- Contributor onboarding packet generation

**None of these would be embedded in the game runtime. They are purely maintenance
and documentation tools for the project maintainers.**

## 12-MONTH ROADMAP (FUND-ALIGNED)

| Month | Milestone | Deliverable |
|-------|-----------|-------------|
| 1 | **Launch** | Public repo with v0.1.0 RC, all documentation, issue templates, first contributor onboarding |
| 2 | **Onboard** | 1 community contributor (bug fix or level addition); validate CONTRIBUTING workflow |
| 3 | **Stabilize** | BFS validator integrated into CI; 2+ levels added by community; CHANGELOG active |
| 4 | **Extend** | 2 new educational levels (multiplication/fractions); accessibility audit begin |
| 5 | **Localize** | Spanish English text catalog; preliminary localization structure |
| 6 | **Refactor** | Code cleanup based on contributor feedback; deprecate any technical debt |
| 7 | **Hardware** | Input abstraction skeleton for Arduino (Phase 6 planning) |
| 8 | **Teacher** | Teacher workflow beta; level authoring guide for non-programmers |
| 9 | **Milestone** | v0.2.0 release with 3+ community levels |
| 10 | **Consolidate** | Finalize roadmap phases 6-7; prepare v1.0.0 planning |
| 11 | **Reflect** | 12-month review; metrics collected; roadmap update |
| 12 | **Plan** | v1.0.0 release planning; sustainability strategy; maintainer succession |

## MEASURABLE OUTCOMES

| Metric | Target (12 months) | How Measured |
|--------|-------------------|--------------|
| **Stars** | ≥ 25 | GitHub stars count |
| **Forks** | ≥ 10 | GitHub forks count |
| **Contributors** | ≥ 3 | `git log --format='%an' | sort -u | wc -l` |
| **Levels** | ≥ 3 (beyond Level 1) | Levels in LevelData.js |
| **Issues** | ≥ 15 opened | GitHub Issues count |
| **PRs merged** | ≥ 5 | Pull requests merged to dev |
| **BFS validation** | 100% of new levels | `npm run test:level` pass rate |
| **Console errors** | 0 per session | Browser QA run |
| **Second-run stability** | 100% | Lives=3, score=0 after restart |

## CURRENT LIMITATIONS (v0.1.0)

- No license file yet (pending user confirmation)
- No contributors onboarded yet
- No release tag (v0.1.0 not yet git-tag ed)
- No measured user adoption
- No i18n infrastructure (Phase 5 planned)
- No hardware Arduino integration (Phase 6 planned)
- Documentation suite complete but not "finalized" (open to contributor improvement)

**These limitations are expected for a release candidate and are addressed in the
12-month roadmap above.**

## FUND REQUEST ALIGNMENT

This project aligns with open-source education fund goals because:

- **Low barrier to entry:** No internet required, runs on classroom hardware
- **High educational impact:** Math practice wrapped in interactive adventure
- **Sustainable model:** Documentation-first; contributors can onboard without
  reverse-engineering gameplay
- **No vendor lock-in:** MIT license; all assets are text/tilemap editable
- **Accessibility-first:** Color-blind safe, mute-friendly, keyboard-only
- **Community-ready:** Templates, CI, and onboarding ready before first contributor

**The strongest fund request argument: "The gameplay is proven, the OSS infrastructure
is complete, and the project only needs community onboarding to reach sustainability."**