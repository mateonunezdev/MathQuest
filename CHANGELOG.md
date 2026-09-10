# Changelog

All notable changes to MathQuest will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added
- Open-source readiness documentation suite (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, ROADMAP)
- Project positioning statement: "An open-source educational game framework for turning mathematics practice into interactive game experiences"
- License analysis (MIT recommended over Apache-2.0 for this codebase)
- GitHub community files (issue templates, PR template)
- CI workflow preparation
- Package.json scripts review
- Documentation structure (docs/ architecture, game-design, adding-levels, educational-goals, accessibility, hardware-roadmap)
- Open source fund readiness narrative
- Codex OSS readiness documentation
- Contributor experience validation

### Changed
- README.md — comprehensive overhaul with installation, features, controls, architecture, roadmap
- Replaced placeholder README with professional OSS-ready documentation
- Enhanced visual README with MathQuest branding and screenshots

### Fixed
- None (documentation-only changes)

## v0.1.0 — Release Candidate

### Added
- **Gameplay vertical slice** — Level 1 complete with BFS-validated gate progression
- **Hero Gate (MathDoor)** — LOCKED/UNLOCKED/OPEN state machine with full unlock animation
- **Challenge system** — Holographic overlay with diffraction grating, scanlines, grid pattern
- **Goal/Victory system** — Animated goal entity, victory screen with holographic effects
- **Audio system** — Offline AudioSystem with mute, footstep sounds, door events
- **2.5D rendering** — Tile-based renderer with depth cues, wall top faces, column shading, parallax
- **Player entity** — Directional walk animations, helmet visor, energy core, shadow, bobbing motion
- **HUD** — Score, lives, level badge, mute button, victory screen
- **Start screen** — Title, controls hint, hologram accent strips
- **Keyboard input** — WASD/Flechas + A/B/C for answers
- **Level data system** — Tilemaps, decorations, door progression, goal placement
- **Browser QA tooling** — 12-screenshot automated flow, console error detection
- **BFS validation** — Gate progression verification (no bypass paths)
- **Second-run state preservation** — Lives and score persist across restart
- **Git repository** — Full history, branching, issue templates, PR workflow
- **License analysis** — MIT recommended, Apache-2.0 evaluated
- **Contributing guide** — Branch policy, commit conventions, QA requirements
- **Code of Conduct** — Contributor Covenant v2.0 adapted
- **Security documentation** — Vulnerability reporting scope, supported versions
- **Roadmap** — 7-phase plan from vertical slice to teacher workflows
- **Technical docs** — architecture.md, game-design.md, adding-levels.md, educational-goals.md, accessibility.md, hardware-roadmap.md
- **Issue templates** — bug_report.yml, feature_request.yml
- **PR template** — PULL_REQUEST_TEMPLATE.md
- **License analysis** — MIT vs Apache-2.0 comparison
- **Positioning statement** — framework narrative, not "just an educational game"
- **Open source fund readiness doc** — problem, solution, roadmap, measurable outcomes
- **Codex OSS readiness doc** — PR review, issue triage, test generation, maintenance automation
- **Contributor experience validation** — git clone, npm install, npm test, local server
- **Cleanup** — Removed debug files, temporary assets, secrets from source

### Changed
- Enhanced visual composition: layered backgrounds, vertical gradients, depth cues
- Strengthened 2.5D depth perception (wall tops, column shading)
- Hero Gate state differentiation through color, striping, accent pulses
- Holographic challenge overlay with scanlines and grid pattern
- Goal signposting with holographic ring overlay
- Start screen hologram animation
- Victory screen holographic gradients and sweep
- README restructured for OSS presentation
- Positioning as framework, not just educational game

### Fixed
- Console error elimination across full gameplay cycle
- Browser QA: all 12 screenshots captured successfully
- Second-run: lives and score persist correctly
- Level BFS validation: no bypass paths detected
- Renderer ReferenceError fixed
- Audio gain shadowing fixed
- Door unlock stall fixed
- Victory restart button functional
- Goal core payoff visual polished
- Player directional walk animations
- Input cleanup on restart
- Level design validation

## v0.0.1 — Initial Prototype

### Added
- Basic player movement (WASD/Flechas)
- Single door with math challenge
- A/B/C answer input
- Win/lose state
- Simple dark theme

### Changed
- None

### Fixed
- None