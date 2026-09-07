# Hardware Roadmap

## Philosophy

MathQuest is designed to run offline on modest hardware (laptops, tablets, classroom computers) with no runtime dependencies. Arduino and arcade hardware integration is planned for Phase 6 but does not affect the core game experience.

## Current Input (v0.1.0)

### Keyboard

- **Movement:** WASD / Arrow keys
- **Answers:** A, B, C keys
- **Restart:** Enter / Space (from victory screen)
- **Mute:** Top-right button (click or tap)

### Requirements

- Any device with a keyboard and browser supporting Canvas 2D
- Minimum: 800×600 viewport (game scales to 1100×700 with letterboxing)
- Recommended: 1100×700 or larger for full experience
- No touchscreen support in v0.1.0 (touch is not implemented)

## Phase 6: Arduino / Arcade Integration

### Goal

Extend the input abstraction to accept signals from Arduino or arcade controllers (A/B/C buttons + direction pad).

### Input Abstraction Layer

The existing `InputSystem` will be extended (not replaced) with:

```javascript
// Current (v0.1.0)
InputSystem.getMovementVector()  // returns {x, y} from WASD/Flechas
InputSystem.getAnswerKey()       // returns 'A' | 'B' | 'C' or null

// Phase 6 addition
InputSystem.getMovementVector()  // same API, but source can be keyboard OR arcade
InputSystem.getAnswerKey()       // same API, but source can be arcade buttons
```

### Arduino Integration

- Arduino sends serial data (e.g., `A`, `B`, `C`, `UP`, `DOWN`, `LEFT`, `RIGHT`)
- A small bridge firmware (or Firmata) translates serial → keyboard events
- The bridge runs on the Arduino Leonardo/Uno with built-in USB emulation
- Browser receives keyboard events from the Arduino as if they were local key presses
- No additional runtime dependencies — the bridge firmware is standalone

### Arcade Controller

- Standard arcade stick with 8-way joystick + A/B/C buttons
- USB HID emulation (works natively in browsers)
- Button mapping: joystick directions → movement; A/B/C → answers
- Plug-and-play; no drivers required

### Non-Goals (v0.1.0)

- Do not implement Arduino/Arcade input in this phase
- Do not add touchscreen support
- Do not add multiplayer or simultaneous local co-op
- Do not change the A/B/C key mapping (reserved for answers)

### Deliverable (Phase 6)

- Input system that works with both keyboard and external hardware
- Documentation on Arduino bridge firmware setup
- Button mapping configuration
- Tested with Arduino Leonardo (simulated keyboard)
- No impact on keyboard-only gameplay

### Why No Arduino in v0.1.0

- Keeps the release candidate focused on educational gameplay
- Avoids introducing hardware-dependent testing requirements
- Maintains the "no runtime dependencies" philosophy
- Arduino integration is a distinct phase (Phase 6) with its own deliverables

## Deprecated / Removed

- No features are removed for the hardware roadmap
- All v0.1.0 keyboard functionality remains intact
- Phase 6 additions are backward-compatible (keyboard still works)

## Roadmap Integration

| Phase | Deliverable |
|-------|-------------|
| Phase 1 | Keyboard-only vertical slice ✅ |
| Phase 5 | Accessibility improvements |
| Phase 6 | Arduino / arcade input abstraction |
| Phase 7 | Teacher workflows (may reference hardware for classroom sets) |

---

## Setup Notes (If Experimenting Early)

If you want to experiment with Arduino input before Phase 6 is documented:

1. Install Firmata on an Arduino Leonardo
2. Connect the Arduino via USB — it appears as a keyboard device
3. Press A/B/C on the Arduino — the browser receives those key presses
4. Note: This may interfere with local keyboard input; use with caution
5. The MathQuest InputSystem will accept either source since the API is the same

**Do not merge Arduino experiments into the main branch without Phase 6 approval.**