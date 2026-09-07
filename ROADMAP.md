# MathQuest Roadmap

## Overview

MathQuest is an open-source educational game framework for turning mathematics practice into interactive game experiences. Designed to run offline on modest hardware and extensible toward physical arcade/Arduino controls.

## Phase 1 ✅

### Nivel 1 vertical slice

- Player movement (WASD/Flechas)
- Math door with challenge system
- A/B/C answer input
- Goal/victory condition
- Audio system (offline)
- 2.5D rendering with depth cues
- BFS-validated gate progression
- Browser QA tooling (12-screenshot flow)
- Second-run state preservation
- **Status: COMPLETE** — Release candidate ready

---

## Phase 2 📋

### Open-source readiness

- README professional rewrite ✅
- License selection (MIT recommended) ✅
- CODE_OF_CONDUCT.md ✅
- CONTRIBUTING.md ✅
- SECURITY.md ✅
- CHANGELOG.md ✅
- ROADMAP.md ✅
- Technical docs (architecture, game-design, adding-levels, educational-goals, accessibility, hardware-roadmap) ✅
- GitHub community files (issue templates, PR template) ✅
- CI workflow preparation ✅
- Package.json scripts review ✅
- Release readiness evaluation ✅
- Open source fund readiness narrative ✅
- Codex OSS readiness documentation ✅
- Contributor experience validation ✅
- **Status: IN PROGRESS** — Finalizing documentation and tooling

---

## Phase 3 📋

### Level authoring system

- Visual level editor or simplified DSL for tilemap creation
- Pre-built level templates for common educational scenarios
- BFS validation integrated into editor workflow
- Decoration system extensibility
- **Deliverable:** `docs/adding-levels.md` complete with workflow

---

## Phase 4 📋

### Más niveles educativos

- Multiplicación y división
- Fracciones y decimales
- Geometría básica
- Álgebra elemental
- **Deliverable:** 3+ new levels with full BFS validation

---

## Phase 5 📋

### Accesibilidad / localización

- Contraste mejorado y escalado de UI
- Idiomas adicionales (ES/EN al mínimo)
- Font legibility en canvas 2D
- Mute/audio control accessibility
- **Deliverable:** docs/accessibility.md with actionable improvements

---

## Phase 6 📋

### Hardware arcade / Arduino

- Input abstraction layer (generic event system)
- A/B/C keyboard compatibility mapping
- Arduino firmware skeleton (serial → canvas input)
- Test harness for hardware input
- **Deliverable:** Hardware-ready input system without runtime dependencies

---

## Phase 7 📋

### Teacher-friendly content workflows

- Non-programmer level creation workflow
- Math challenge bank (reusable questions)
- Difficulty adaptation presets
- Classroom progress tracking (basic)
- Deployment guide for school networks
- **Deliverable:** End-to-end workflow from teacher to student

---

## Version Recommendation

| Version | Status | When |
|---------|--------|------|
| **v0.1.0** | **Release Candidate** | **Now** — Open-source readiness complete |
| v1.0.0 | Full release | After Phase 4 (additional levels) + Phase 6 (hardware) validation |

**Recommended:** Start with v0.1.0 as the open-source foundation. The current release candidate state is appropriate for community contributions, bug reports, and initial level additions.

---

## Milestones

- [ ] v0.1.0 release candidate — Open-source readiness complete
- [ ] First community contribution (bug fix or level addition)
- [ ] v0.2.0 — Additional educational levels
- [ ] v1.0.0 — Full release with Phase 3-7 features
- [ ] Hardware Arduino integration (Phase 6)
- [ ] Teacher workflow beta (Phase 7)