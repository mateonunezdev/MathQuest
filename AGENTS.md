# AGENTS.md — MathQuest

Build MathQuest: maze exploration + math challenges + later Arduino controls.

## Official stack
MathQuest 3.0 targets vanilla Three.js/WebGL, a `PerspectiveCamera`, true third-person movement, and a real XYZ world. The Canvas 2D implementation is `LEGACY_2D`; preserve it, but never use it as the current visual or gameplay presentation baseline. Prefer zero dependencies unless clearly useful.

## Controls
Official 3D movement/actions = arrows plus J/K/L. Preserve A/B/C-compatible math choice semantics for future Arduino keyboard emulation.

## Working rules
- Inspect relevant files before editing.
- Prefer the smallest coherent patch.
- Do not refactor unrelated code.
- Keep the game runnable.
- Test interactions after meaningful changes.
- Do not add dependencies without stating why.
- Finish with changed files, tests performed, and remaining issues.

## Persistent project brain
- For every substantial MathQuest mission, first read `MathQuest-Brain/16 - Handoff.md`, `MathQuest-Brain/02 - Current State.md`, and `MathQuest-Brain/10 - Decisions.md`, then inspect Git.
- Read only the additional Brain notes and specialist skills relevant to the mission.
- Before completing substantial work, update the affected Brain notes, append `MathQuest-Brain/15 - Session Log.md`, and rewrite `MathQuest-Brain/16 - Handoff.md` with current truth.
- Repository behavior, gameplay video, and measured tests outrank stale documentation. Trivial questions and tiny edits do not require a full Brain update.

## Autonomous visual review gate
- Substantial visual, movement, animation, camera, environment, or integration work is incomplete until Codex runs it, captures evidence, visually inspects that evidence, fixes verified defects, captures again, and records the outcome in the Brain.
- Motion requires continuous gameplay video and chronological contact sheets; screenshots and passing code/tests are not visual proof.
- If evidence cannot be inspected, report `VISUAL REVIEW BLOCKED` and do not claim a visual pass.
