# MathQuest 3D

**Videojuego educativo 3D de aventura matemática — convierte la práctica de matemáticas en una expedición interactiva.**

> **MATHQUEST 3.0 — DIRECCIÓN OFICIAL:** Three.js vanilla, tercera persona real con cámara chase en perspectiva, movimiento XYZ auténtico, ruinas monumentales de fantasía y matemáticas integradas en la arquitectura. La raíz del repositorio lanza `/spikes/mathquest-integrated-v1/`, clasificado como `OFFICIAL_3D_CANDIDATE`.
>
> Ejecuta `npm run serve` y abre `http://127.0.0.1:8080/`. La suite de aceptación 3D actual se ejecuta con `npm test`.
>
> El candidato actual contiene una campaña 3D de tres capítulos: **Santuarios de las Cascadas**, **Observatorio de Fracciones** y **Forja del Núcleo Algebraico**. El jugador elige **Explorador**, **Aventurero** o **Maestro** una vez y completa los tres niveles con puntuación acumulativa. Cada capítulo incluye seis obstáculos de acción, una ruta física de respuesta, un laberinto manual de bifurcación/retorno con tres runas y tres puertas de paso, un segundo mecanismo matemático arquitectónico, un miniboss Acechador de Runas, un combate contra guardián matemático y un salto de portal animado. Dos bancos rotativos de matemáticas proporcionan **54 configuraciones de encuentro verificadas** a lo largo de la campaña.
>
> El juego usa acciones abstractas —mover izq/der, saltar, deslizar, atacar, dash, poder, confirmar, pausar, y respuestas A/B/C— para que teclado, pantalla táctil, futuro joystick o controles Arduino compartan una sola autoridad. Controles de teclado actuales: flechas/WASD más **J/K/L**, **Enter**, **Esc**, y **A/B/C**. Sesiones locales **Un Jugador**, **Duelo 2J** y **Equipo 2J** aceptan nombres de jugador y rastrean resultados individuales/de equipo; ambos participantes comparten actualmente una corrida de Explorador.
>
> Acceso QA directo soporta `?level=1|2|3`, `&difficulty=0|1|2`, y `&mathSet=0|1`. Añade `&playtest=1` para recopilar un reporte local sin nombres `mathquest-playtest-v1` para sesiones de usabilidad facilitada. Comandos de verificación útiles incluyen `npm run test:campaign-3d`, `npm run test:exploration-3d`, `npm run test:all-ages-3d`, y `npm run test:campaign-visual -- 1 2 3`. Ver [`docs/ALL_AGES_PLAYTEST_PROTOCOL.md`](docs/ALL_AGES_PLAYTEST_PROTOCOL.md).
>
> La campaña Canvas/top-down anterior se preserva en `/legacy-2d.html` como `LEGACY_2D`. La documentación orientada a Canvas más antigua es histórica y no es la línea visual base actual de MathQuest 3.0. Ver [`docs/MATHQUEST_BUILD_CLASSIFICATION.md`](docs/MATHQUEST_BUILD_CLASSIFICATION.md) y [`docs/MATHQUEST_MEDIA_CLASSIFICATION.md`](docs/MATHQUEST_MEDIA_CLASSIFICATION.md).

---

## 🎮 Características Principales

- **Tres mundos únicos**: Santuario de las Cascadas (aritmética), Observatorio de Fracciones (fracciones), Forja del Núcleo Algebraico (álgebra)
- **Tres dificultades**: Explorador (guiado), Aventurero (estándar), Maestro (avanzado, más puntos)
- **Modos de juego**: Un Jugador (récord personal), Duelo 2J (competencia matemática), Equipo 2J (puntuación compartida)
- **Controles UCOM USB**: Dos mandos tipo PlayStation con mapeo Botón 4=A, Botón 1=B, Botón 2=C, Botón 3=Acción, START=Iniciar
- **Matemáticas sincronizadas**: En modo dos jugadores, cada explorador recibe su propio desafío y los letreros 3D se actualizan correctamente
- **Combate contra jefes**: Golpea 3 veces al guardián → pregunta matemática → respuesta correcta → el gigante levanta la mano → paso libre
- **Puntuación y resultados**: Ganador por puntuación final, no por velocidad. Pantalla final con nombres completos, aciertos/errores, precisión, tiempo
- **Clasificación e historial**: Guarda récords y partidas en localStorage
- **Audio procedural**: WebAudio con compresor/master chain, mute persistente (tecla M)
- **Cero dependencias en runtime**: Solo Three.js vanilla, sin frameworks

---

## 🎯 Controles

| Acción | Teclado | Mando UCOM (Jugador 1/2) |
|--------|---------|--------------------------|
| Mover izquierda/derecha | ← → / A D | Palanca izq/der / Cruceta |
| Saltar | ↑ / W / Espacio | Palanca arriba / ↑ |
| Deslizar | ↓ / S | Palanca abajo / ↓ (P1) / N (P2) |
| Dash | K | — |
| Atacar / Interactuar | J | Botón 3 (Cuadrado/X) |
| Poder (Escudo Σ) | L | — |
| Respuesta A (Izquierda) | A | Botón 4 (Triángulo/Y) |
| Respuesta B (Centro) | B | Botón 1 (Cruz/A) |
| Respuesta C (Derecha) | C | Botón 2 (Círculo/B) |
| Confirmar / Iniciar | Enter | START |
| Pausa | Esc | START (en menús) |
| Silenciar audio | M | — |

> **Nota**: El mando del jugador 2 usa tecla **N** para deslizar. Los botones de respuesta del jugador 2 en teclado son **U/I/O**.

---

## 🚀 Instalación Local (1 minuto)

```bash
# 1. Clonar
git clone https://github.com/mateonunezdev/MathQuest.git
cd MathQuest

# 2. Instalar dependencias (solo para QA con Playwright)
npm install

# 3. Servir el juego
npm run serve
# O directamente: python3 -m http.server 8080

# 4. Abrir http://127.0.0.1:8080 en el navegador
```

> **Requisitos**: Navegador moderno con WebGL 2 (Chrome, Firefox, Edge, Brave). No requiere Node.js para jugar, solo para ejecutar tests QA.

---

## 🌐 Demo en Línea

**GitHub Pages**: https://mateonunezdev.github.io/MathQuest/

La versión publicada se actualiza automáticamente desde la rama `main` via GitHub Actions.

---

## 🧪 Tests y QA

```bash
# Suite principal de movimiento/integración 3D
npm test

# Tests específicos de campaña 3D
npm run test:campaign-3d

# Tests de sesiones multijugador
npm run test:session-3d

# Tests de gamepad UCOM
npm run test:gamepad-3d

# Tests de etiquetas matemáticas visuales
npm run test:math-label-visual

# Tests de mecanismos Maestro (presión)
npm run test:mastery-3d

# Tests de combate guardián
npm run test:guardian-combat

# Tests de exploración/labyrinth
npm run test:exploration-3d

# Tests de all-ages (accesibilidad)
npm run test:all-ages-3d
```

> Los tests usan Playwright con Brave/Chromium headless. Requieren `npm install` previo.

---

## 🏗️ Arquitectura

- **Motor**: Three.js r180 (ES modules via importmap)
- **Cámara**: Perspectiva chase third-person con anti-oclusión por raycast
- **Movimiento**: Curva Catmull-Rom para ruta, steer lateral, salto parabólico, deslizamiento, dash
- **Matemáticas**: Aritmética exacta (racionales), validación de unicidad de respuesta, sin `eval`
- **Estado**: Máquina de fases (MENU → SESSION → DIFFICULTY → CONTROLS → INTRO → COUNTDOWN → PLAYING → PORTAL → RESULT)
- **Persistencia**: localStorage para clasificación, historial, ajustes, calibración gamepad
- **Audio**: WebAudio procedural con compresor dinámico, 12 voces máx, mute persistente

---

## 📁 Estructura del Proyecto

```
mathquest-starter/
├── index.html                          # Punto de entrada (redirige a /spikes/mathquest-integrated-v1/)
├── legacy-2d.html                      # Campaña Canvas 2D histórica (LEGACY_2D)
├── package.json                        # Scripts QA, dependencias dev (Playwright)
├── README.md                           # Este archivo
├── AGENTS.md                           # Instrucciones para agentes IA
├── MathQuest-Brain/                    # Memoria persistente del proyecto
│   ├── 02 - Current State.md
│   ├── 10 - Decisions.md
│   └── 16 - Handoff.md
├── spikes/
│   ├── mathquest-integrated-v1/        # JUEGO OFICIAL 3D
│   │   ├── index.html                  # HTML principal con menús, HUD, pantallas
│   │   ├── game.css                    # Estilos completos
│   │   └── assets/                     # Recursos locales (textura jugador)
│   ├── mathquest-art-kit-v1/           # Motor 3D y lógica de juego
│   │   ├── scene.js                    # Núcleo: mundo, juego, menús, gamepad, math sync
│   │   ├── character-controller.js     # Controlador personaje rigged (GLTF/AnimationMixer)
│   │   ├── procedural-explorer.js      # Fallback personaje procedural
│   │   ├── math-label-renderer.js      # Renderizado etiquetas matemáticas 512px
│   │   ├── content/                    # Contenido de niveles (data-driven)
│   │   │   ├── current-campaign-content.mjs    # Campaña oficial 3 mundos
│   │   │   ├── transformed-campaign-content.mjs # V2 rutas distintas
│   │   │   ├── rebuilt-campaign-content.mjs     # Rebuild V1
│   │   │   ├── level-content-contract.mjs       # Esquema de contrato
│   │   │   └── math-value.mjs                   # Utilidades matemáticas exactas
│   │   └── assets/                     # GLB premium (cascada, personaje)
│   ├── thirdperson-camera/             # Spike cámara tercera persona base
│   └── production-art/                 # Spike arte producción (GLB, shaders)
├── tools/                              # Herramientas QA (Playwright)
│   ├── mathquest-motion-integration-v2.cjs
│   ├── mathquest-session-qa.cjs
│   ├── mathquest-gamepad-qa.cjs
│   └── ... (20+ tests especializados)
└── docs/                               # Documentación técnica y protocolos
```

---

## 📸 Capturas de Pantalla

| Menú Principal | Selección Dos Jugadores | Dificultades | Gameplay Nivel 1 |
|---|---|---|---|
| ![Menu](docs/assets/menu.png) | ![Session](docs/assets/session.png) | ![Difficulty](docs/assets/difficulty.png) | ![Level1](docs/assets/level1.png) |

| Gameplay Nivel 2 | Gameplay Nivel 3 | Resultado Duelo | Clasificación |
|---|---|---|---|
| ![Level2](docs/assets/level2.png) | ![Level3](docs/assets/level3.png) | ![Result](docs/assets/result.png) | ![Leaderboard](docs/assets/leaderboard.png) |

> Las capturas se generan automáticamente en `npm test` y `npm run test:campaign-visual`.

---

## 🛠️ Desarrollo

### Calibración de Mandos UCOM
1. Abre **AJUSTES** → **CONTROLES**
2. Pulsa **CALIBRAR MANDO UCOM**
3. Sigue las indicaciones: Botón 4 (A), Botón 1 (B), Botón 2 (C), Botón 3 (Acción), START
4. El mapeo se guarda automáticamente en localStorage por dispositivo

### Añadir Preguntas Matemáticas
Edita `spikes/mathquest-art-kit-v1/content/current-campaign-content.mjs`:
```javascript
questions: [
    { prompt: '8 × 3 − 5 = ?', choices: ['21', '19', '24'], correctLane: 0, answer: '19' },
    // correctLane: -1=izq, 0=centro, 1=der
],
altarQuestions: [
    { prompt: '15 − 7 = ?', choices: ['8', '6', '9'], correctIndex: 0, answer: '8' },
],
guardianQuestions: [
    { prompt: '4 + 4 = ?', choices: ['6', '8', '10'], correctIndex: 1, answer: '8' },
],
```

### Modo Playtest (Observación Facilitada)
```bash
# Añade ?playtest=1 a la URL o ejecuta:
npm run serve
# Abre http://127.0.0.1:8080/?playtest=1
```
Genera reporte `mathquest-playtest-v1` en localStorage con latencias, vacilaciones, fallos de obstáculos, respuestas matemáticas.

---

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License** — ver archivo [LICENSE](LICENSE) para detalles.

---

## 👨‍💻 Autor

**Mateo Núñez** — Desarrollador y creador de MathQuest

- GitHub: [@mateonunezdev](https://github.com/mateonunezdev)
- Repositorio: [github.com/mateonunezdev/MathQuest](https://github.com/mateonunezdev/MathQuest)
- Demo: [mateonunezdev.github.io/MathQuest](https://mateonunezdev.github.io/MathQuest/)

---

## 🙏 Agradecimientos

- **Three.js** — Motor 3D ligero y potente
- **Quaternius** — Modelo de personaje Ranger (CC0)
- **Poly Haven** — Assets de entorno CC0 para spikes de arte
- **Comunidad WebGL/Three.js** — Referencias y ejemplos

---

## 📋 Estado del Proyecto

**v0.1.0 — Candidato Oficial 3D** ✅
- ✅ Tres mundos jugables (Cascadas, Fracciones, Álgebra)
- ✅ Tres dificultades (Explorador, Aventurero, Maestro)
- ✅ Un Jugador y Dos Jugadores (Duelo/Equipo)
- ✅ Controles UCOM USB con calibración
- ✅ Matemáticas sincronizadas en modo dúo
- ✅ Combate guardián (3 golpes → pregunta → gigante levanta mano)
- ✅ Laberintos de exploración con runas y bucles
- ✅ Clasificación e historial persistentes
- ✅ Audio procedural accesible
- ✅ GitHub Pages deploy automático
- ✅ Suite QA Playwright (20+ tests)

**Próximos pasos**: Asset rigging producción, validación hardware Arduino física, playtest multiedad presencial.