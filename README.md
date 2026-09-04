# MathQuest Starter

## Ejecutar
```bash
cd mathquest-starter
python3 -m http.server 8080
```
Abre http://localhost:8080

## Codex
Skills: `$game-dev`, `$math-level`, `$test-game`, `$ui-polish`.

Primer prompt:
```text
$game-dev $ui-polish
Analiza el prototipo actual de MathQuest y mejora SOLO la primera zona. Quiero una pantalla de inicio, un personaje más reconocible, una puerta matemática animada y mejor feedback al acertar o fallar. Conserva WASD/flechas y A/B/C. Prueba el flujo completo antes de terminar. No añadas dependencias salvo que sean necesarias.
```

## Claude Code
Skills: `/game-dev`, `/math-level`, `/test-game`, `/ui-polish`.

Primer prompt:
```text
/game-dev /ui-polish
Revisa el prototipo actual y mejora SOLO la primera zona. Conserva WASD/flechas y A/B/C, prueba el recorrido completo y evita refactors innecesarios.
```
