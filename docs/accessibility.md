# Accessibility

## Visual

### Contrast

- The color palette uses navy (#07111f) as base, teal (#0a1a28) as midtone, and cyan (#37c4ff) as accent
- Cyan against dark navy meets WCAG AA for large text (≥ 18pt bold)
- Body text and HUD elements are designed for ≥ 12pt readability on standard screens
- No low-contrast text-on-image situations — all text is on solid gradient backgrounds

### Legibility

- Font: JetBrains Mono, monospace, scaled for canvas 960×540 at 1100×700 viewport
- Size: 14px base for body, 22px for answers, 20px for challenge symbols, 32px for victory title
- Line-height: 1.5 for readability
- Language: Spanish with consistent terminology (no abbreviations or jargon without explanation)

### Color Blind Support

- Cyan (#37c4ff) is the primary accent color; it contrasts strongly against navy backgrounds
- Red (#ff6b6b) is used only for incorrect feedback; it is not the sole indicator of state
- Gold (#ffd700) is used for victory and correct feedback
- All state changes are also conveyed through particle effects and audio, not color alone
- The game is playable in grayscale: shapes and positions remain distinguishable

### Scalability

- The canvas scales responsively: `max-width: min(1100px, 94vw)` with aspect-ratio 16:9
- The HUD and UI reflow when the viewport changes
- Text never overflows its container due to `text-align: center` and constrained widths

## Audio

### Mute Control

- Mute button is always accessible in the top-right of the canvas
- Toggles all sound effects (uiClick, doorUnlock, doorHit, incorrect, victory, footstep)
- Visual indicator: 🔊 / 🔇 displayed in the button
- State is persistent across sessions (stored in AudioSystem.muted flag)

### Audio Descriptions

- All sound events have a visual counterpart (particle effects, HUD updates)
- No information is conveyed exclusively through audio
- The HUD flash and particle spawns replace audio-only cues

## Motor

### Keyboard-Only

- Full game playable with keyboard only
- WASD / Flechas → movement
- A / B / C → answers
- Enter / Space → restart from victory screen
- Tab navigation not implemented (game uses direct key polling)

### No Timed Presses

- No requirements for rapid key presses
- No "reaction time" challenges
- Walk movement has smooth acceleration (not instant)
- Challenge answers can be selected at the player's pace

## Hearing

### No Audio-Only Information

- Every sound event has a visual equivalent:
  - uiClick → button highlight + ripple
  - doorUnlock → particle burst + door animation
  - doorHit → screen shake + particle burst
  - incorrect → red particles + "ACCESO DENEGADO" text
  - victory → golden particles + victory screen
  - footstep → N/A (purely ambient, optional)
- No puzzle requires hearing to solve

### Optional Audio

- Audio can be fully muted without affecting gameplay
- Mute state is remembered across sessions
- Visual feedback replaces auditory feedback when muted

## Implementation

The following features already support accessibility:

- [x] Mute toggle in HUD
- [x] Visual feedback for all audio events
- [x] Keyboard-only input
- [x] Scalable UI typography
- [x] High-contrast color palette (navy/teal/cyan)
- [x] No audio-only game state
- [ ] Screen reader labels (canvas 2D limitations — considered out of scope for v0.1.0)
- [x] Color-independent state indicators (particles + text + audio)
- [ ] Keyboard focus management (game canvas has focus, but not formal ARIA)
- [ ] High contrast mode stylesheet (considered for v1.0.0)

## Known Limitations (v0.1.0)

- No screen reader support for canvas content
- No formal focus management beyond canvas key events
- No high-contrast mode stylesheet toggle
- Color choices rely on navy/teal/cyan palette; may not suit all color vision types without particle/audio fallback

## Roadmap

- Phase 5: Accessibility improvements (high-contrast toggle, screen reader labels)
- Future: Configurable font sizes, audio volume per event, language localization