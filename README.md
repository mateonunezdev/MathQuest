# MathQuest

**Educational adventure game — turn math practice into interactive maze experiences.**

![MathQuest Screenshot](screenshots/01-start-screen.png)

---

## ¿Qué es MathQuest?

MathQuest es un juego de aventura educativo de código abierto que transforma la práctica de matemáticas en una experiencia interactiva de laberinto y puertas. Los jugadores navegan por zonas temáticas, desbloquean puertas resolviendo desafíos matemáticos y avanzan hacia la meta. Diseñado para funcionar sin conexión en hardware modesto y extensible hacia controles de arcade/Arduino físicos.

---

## Objetivo

Convierte ejercicios matemáticos aislados en desafíos significativos dentro de una aventura de exploración, reforzando la resolución de problemas y el pensamiento lógico mediante retroalimentación inmediata y progresión estructurada.

---

## Features

- **Gameplay vertical slice completa** — Nivel 1 con puzzles de puerta matemática, sistema de desafío y victoria
- **Controles intuitivos** — WASD/Flechas para mover, A/B/C para responder
- **Sistema de puertas matemáticas** — Desbloquea progresando a través de desafíos de orden de operaciones y álgebra básica
- **Diseño 2.5D con canvas 2D** — Renderizado atmosférico sin dependencias externas
- **Audio system integrado** — Efectos de sonido para acciones y retroalimentación
- **Preparado para hardware** — Abstracción de entrada lista para Arduino y controles de arcade
- **Diseño educativo cuidadoso** — Feedback constructivo, sin revelar respuestas incorrectas

---

## Controles

| Acción | Tecla |
|--------|-------|
| Moverse | WASD / Flechas del cursor |
| Responder | A, B, C |
| Silenciar/Desilenciar | Botón en pantalla |

---

## Instalación local (1 minuto)

```bash
# 1. Clonar
git clone https://github.com/mateonunezdev/mathquest-starter.git
cd mathquest-starter

# 2. Instalar dependencias
npm install

# 3. Servir el juego
python3 -m http.server 8080

# 4. Abrir http://localhost:8080 en el navegador
```

---

## Cómo jugar

1. Haz clic en **INICIAR MISIÓN** en la pantalla de inicio
2. Mueve al personaje con WASD o flechas hacia la puerta
3. Cuando estés cerca, presiona **Flecha arriba** o **W** para interactuar
4. Responde al desafío matemático usando A, B o C
5. Respuestas correctas abren la puerta; respuestas incorrectas pierden una vida
6. Llega a la zona dorada para completar el nivel

---

## Arquitectura resumida

- **Game loop** — bucle a 60 FPS con fixed timestep de 1/60s
- **Systems** — Input, Collision, Renderer, MathChallenge, HUD, Audio
- **Entities** — Player, MathDoor, Goal, Particle
- **State** — START → PLAYING → CHALLENGE → VICTORY → TRANSITION
- **Rendering** — Canvas 2D con gradientes, patrones y iluminación procedural
- **Input** — Mapeo de teclado W/A/S/D y flechas + A/B/C para respuestas

---

## Roadmap

- **Phase 1** ✅ Nivel 1 vertical slice completado
- **Phase 2** Open-source readiness (documentación, licencias, tooling)
- **Phase 3** System for authoring new levels
- **Phase 4** Más niveles educativos (multiplicación, fracciones, etc.)
- **Phase 5** Accesibilidad y localización
- **Phase 6** Hardware arcade / Arduino integration
- **Phase 7** Workflows amigables para docentes

---

## Licencia

Véase la sección de Licencia a continuación o el archivo LICENSE en desarrollo.

---

## Cómo contribuir

CONTRIBUTING.md — Reglas para branches, commits, pruebas y Pull Requests.

---

## Estado actual

**v0.1.0** — Nivel 1 vertical slice funcional. BFS pass, browser QA pass, segunda partida pass, 0 errores de consola.

---

## Agradecimientos

Desarrollado con OpenCode y Canvas 2D. Sin dependencias externas.