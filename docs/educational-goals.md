# Educational Goals

## Design Principles

### Never Reveal the Wrong Answer

- When a player selects an incorrect answer (A, B, or C), the game marks only that selection as incorrect
- The correct answer is **never revealed** on the screen
- This prevents guessing strategies and encourages actual problem-solving
- After a wrong answer, the challenge closes and the player can try again

### Constructive Feedback

- **Correct:** "ACCESO CONCEDIDO" with green-cyan particle burst
- **Incorrect:** "ACCESO DENEGADO" with red particle burst, life lost
- The feedback is immediate, visual, and audio-supported
- No punitive design — losing a life is a setback, not a shaming mechanic

### Math Skill Integration

Level 1 focuses on **order of operations** (PEMDAS/BODMAS):

- Example: `7 × (3 + 2) = ?`
- Three distractors (wrong answers) are designed to catch common errors
- The correct answer tests precedence: parentheses first, then multiplication
- Skill label is displayed in the challenge overlay: `HABILIDAD: Orden de operaciones`

### Adaptive Difficulty (Future)

- Level 1 difficulty is fixed for the vertical slice
- Future phases will extend to:
  - Multiplication tables
  - Basic division
  - Fractions visual comparison
  - Simple algebraic equations
- Each new challenge type will follow the same `submitAnswer(letter)` interface
- Difficulty presets will be configurable for teacher workflows (Phase 7)

### Accessibility Considerations

- Answer keys (A/B/C) are consistent and never remapped
- High-contrast mode can be toggled via the mute/button UI layout
- Font size is scalable in the HUD (JetBrains Mono, 22px base for answers)
- Audio feedback is optional (mute button available)
- Keyboard-only input supported (no mouse dependency)

### Learning Outcomes (Level 1)

By completing Level 1, the player should:

1. Demonstrate understanding of order of operations (parentheses first)
2. Practice mental multiplication (7 × 5 = 35)
3. Develop problem-solving under time/pressure (challenge closes after answer)
4. Understand cause-and-effect: correct answer → door opens; incorrect → lose life
5. Build confidence through immediate, clear feedback

### Integration with Game Flow

- Challenges are **gatekeepers** — the player cannot progress without engaging
- The door is the only interaction point; challenges are always math-first
- No external math knowledge required beyond the specified skill level
- The game loop reinforces: attempt → feedback → adjust → retry → progress

### Cultural and Linguistic

- All text is in Spanish (the project's primary language)
- Challenge questions and feedback are translated consistently
- Numbers use standard notation (no locale-specific formatting)
- Skill descriptions are in Spanish: "Orden de operaciones"
- Future: localization files for English and other languages (Phase 5)