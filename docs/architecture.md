# Architecture

## Game Loop

The game runs on a fixed timestep loop at 60 FPS with the following structure:

```
requestAnimationFrame(gameLoop)
  → dt = time delta (capped at 0.1s)
  → accumulator += dt
  → while accumulator >= fixedTimeStep (1/60s):
       update(fixedTimeStep)
       accumulator -= fixedTimeStep
  → maxSubSteps = 5 (max iterations per frame)
  → render()
  → repeat
```

## Systems

MathQuest uses a modular system architecture with no external dependencies:

| System | Responsibility |
|--------|----------------|
| `InputSystem` | Keyboard/movement mapping (WASD/Flechas + A/B/C) |
| `CollisionSystem` | Tilemap collision, door/goal interaction, hit pause |
| `Renderer` | Canvas 2D rendering: backgrounds, tilemap, entities, particles |
| `MathChallengeSystem` | Holographic challenge overlay, answer submission, feedback |
| `HUD` | Heads-up display: score, lives, level, mute button, victory screen |
| `AudioSystem` | Offline sound effects (no runtime audio dependencies) |
| `Player` | Entity: movement, animation, direction, bobbing, shadow |
| `MathDoor` | Entity: state machine (LOCKED/UNLOCKING/OPEN), conduits, panels |
| `Goal` | Entity: victory trigger, radial glow, particle effects |
| `Particle` | Small visual effects (sparks, smoke, energy particles) |

## Entities

- **Player** — Controlled character with directional walk animations, helmet, energy core, shadow, and direction indicator
- **MathDoor** — Gate with state machine, conduit energy lines, panels, math seal, interaction hint
- **Goal** — Victory zone with pulsed glow, core animation, rings, symbolic display, ambient particles
- **Particle** — Base class for visual effects (sparks, energy conduits, golden bursts, ambient dust)

## State Management

- `GameState` enum: `START`, `PLAYING`, `CHALLENGE`, `VICTORY`, `TRANSITION`
- State transitions are driven by user input and game events
- Transition alpha animates between states
- Victory screen has its own anim state (easeOutBack scaling)
- No global game state store — each system manages its own state

## Input

- Mapping: WASD/Flechas → movement vector
- Answer: A, B, C keys → submitted via `MathChallengeSystem.submitAnswer(letter)`
- Input is read each frame via `input.getMovementVector()`
- Answer key is consumed and cleared each challenge cycle

## Collision

- Grid-based with tileSize = 60px
- 1 = wall, 0 = floor in tilemap
- Player hitbox: 36 × 44 px (smaller than tile for visual breathing room)
- Door collision only triggers when NOT unlocking (door must animate freely)
- Footstep sounds based on walkSpeed threshold
- Camera shake on wall/door collisions for game feel

## Rendering

- Canvas 2D with procedural gradients and patterns
- 60px tile grid with large-format variation (3×3 large tiles)
- Navy/teal/cyan color palette with gold accents
- Depth cues: wall top faces, column shading, bottom contact shadows
- Parallax background elements (floating geometric shapes)
- No shaders, no WebGL — pure Canvas 2D

## Audio

- Web Audio API-based SoundManager
- Sound effects: uiClick, doorUnlock, doorHit, incorrect, doorCharge, victory, footstep
- All sounds are short, preloaded, and offline-capable
- Mute toggle via HUD button
- Audio initialized on first user interaction (click/keydown)

## QA Tooling

- `tools/browser-qa.js` — Playwright-less browser automation, 12-screenshot capture, console error detection
- `tools/validate-level.js` — BFS gate progression validation (no bypass paths)
- Screenshots stored in `screenshots/`
- Errors logged to `screenshots/errors.txt`