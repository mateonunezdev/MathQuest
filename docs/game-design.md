# Game Design

## Core Loop

1. **Explore** — Move player through maze-like level using WASD/Flechas
2. **Approach** — Get near MathDoor → interaction hint appears (↑ INTERACTUAR)
3. **Challenge** — Door opens challenge; answer A/B/C → correct opens door, incorrect loses life
4. **Progress** — Open door → reach Goal zone → trigger victory
5. **Restart** — Return to start screen, retain score/lives across runs

## Pillars

### Educational Integration

- Math challenges are embedded in door progression — you cannot bypass them
- Questions focus on order of operations (3rd-5th grade level)
- Feedback is immediate and constructive ✗ no answer revealed incorrectly
- Difficulty is fixed for Level 1; extensible for future levels

### Meaningful Feedback

- Correct answer: golden/cyan particle burst, door unlocks, audio cue
- Incorrect answer: red particle burst, life lost, audio cue, screen shake
- Victory: confetti-like particles, score display, "NIVEL 1 COMPLETADO"
- Game feel: screen shake, camera shake, particle spawns, sound events

### Difficulty Design

- Level 1 has a single door with one challenge type
- Challenge is deterministic (same question each time) — designed for repetition
- No progressive difficulty within a level (deliberate for first release)
- Future levels will extend challenge variety and complexity

## Feedback Systems

### Visual

- Particle spawns on key events (door unlock, incorrect, victory)
- Radial glows on goal, door, player energy core
- Screen/shake camera on collisions and state transitions
- Holographic challenge overlay with progress fading
- State-differentiated door rendering (LOCKED/UNLOCKING/OPEN)

### Audio

- Channel-separated events (uiClick, doorUnlock, doorHit, incorrect, victory, footstep)
- Volume mixing with mute toggle
- Spatial feel via Web Audio panning
- No background music — keeps focus on math challenges

## Visual Direction

- **Palette:** Navy (#07111f) → Teal (#0a1a28) → Cyan (#37c4ff) → Gold (#ffd700)
- **Theme:** Educational adventure — "matemático escape"
- **Aesthetic:** 2.5D Canvas with procedural depth (no pre-rendered sprites)
- **Mood:** Focused, atmospheric, not cartoonish
- **Typography:** JetBrains Mono for UI/answers, custom for titles

## Difficulty & Learning

- Challenges reinforce order of operations: 7 × (3 + 2) = ?
- Three answer options (A/B/C) with one correct
- Wrong answers don't reveal the correct one (prevents guessing strategy)
- Lives system (3 lives) provides gentle failure state
- Score tracking encourages replay

## Extensibility

- New levels via LevelData.js tilemap additions
- New challenge types by extending MathChallengeSystem.challenges[]
- New entities by following the entity render() pattern
- Input abstraction planned for Phase 6 (Arduino compatibility)
- No framework dependencies = easier forking and modification