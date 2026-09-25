# MathQuest Fair Edition — art delivery checklist

Canvas interno: 960×540. Entregar archivos locales optimizados en `assets/fair/`; sin URLs externas. PNG/WebP para pintura y sprites, SVG solo para elementos vectoriales genuinos. Cada sprite sheet es una tira horizontal con frames de igual tamaño. El arte puede exceder el collider; no cambiar hitboxes para ajustarlo.

Registrar cada archivo instalado en `assets/fair/art-pack.json`. Cada entrada usa `{ "src": "level1/background.webp", "width": 960, "height": 540, "anchor": "top-left", "x": 0, "y": 0 }`. `src` es relativo a `assets/fair/`. `frames` y `fps` son opcionales; `offsetX`, `offsetY` y `parallax` (0–0.2) también. `x,y` son coordenadas de mundo para capas. Una capa admite un objeto o una lista de objetos. `levels` se indexa por `"1"`, `"2"`, `"3"`; sus claves son `farBackground`, `background`, `ground`, `architectureBack`, `architectureFront`, `foreground`, `lightingOverlay`, `fx`. `gameplayEntities` es el hueco de render, no una imagen. Para reemplazar el fondo V2, instalar al menos `background` del nivel. Archivos ausentes usan fallback de desarrollo.

| Archivo exacto (`assets/fair/…`) | Uso | Píxeles | Alfa | Ancla | Notas / frames |
|---|---|---:|---|---|---|
| `level1/far-background.webp` | profundidad lejana | 960×540 | no | top-left | entrada antigua a la izquierda; parallax ≤0.1 |
| `level1/background.webp` | cámara ritual | 960×540 | sí | top-left | centro dominante, Hero Gate a la derecha, santuario al otro lado |
| `level1/ground.webp` | suelo pintado | 960×540 | sí | top-left | lectura clara de pasos; ocultar cuadrícula visual |
| `level1/architecture-back.webp` | pilares detrás | 960×540 | sí | top-left | no tapar al jugador ni la puerta |
| `level1/architecture-front.webp` | pilares delante | 960×540 | sí | top-left | oclusión 2.5D controlada |
| `level1/foreground.webp` | primer plano | 960×540 | sí | top-left | viñeta/materiales, centro jugable despejado |
| `level1/lighting-overlay.webp` | luz pintada | 960×540 | sí | top-left | cian/dorado sutil, no sustituye FX dinámicos |
| `level2/background.webp` | escenario base | 960×540 | no | top-left | observatorio, composición propia |
| `level2/ground.webp` | suelo | 960×540 | sí | top-left | coherente con colisión existente |
| `level2/architecture-back.webp` | arquitectura trasera | 960×540 | sí | top-left | capas de profundidad |
| `level2/architecture-front.webp` | arquitectura delantera | 960×540 | sí | top-left | oclusión 2.5D |
| `level3/background.webp` | escenario base | 960×540 | no | top-left | cámara final, composición propia |
| `level3/ground.webp` | suelo | 960×540 | sí | top-left | coherente con colisión existente |
| `level3/architecture-back.webp` | arquitectura trasera | 960×540 | sí | top-left | capas de profundidad |
| `level3/architecture-front.webp` | arquitectura delantera | 960×540 | sí | top-left | oclusión 2.5D |
| `player/idle-down.webp` | reposo sur | 384×96 | sí | bottom-center | 4 frames 96×96, 6 fps |
| `player/idle-up.webp` | reposo norte | 384×96 | sí | bottom-center | 4 frames 96×96, 6 fps |
| `player/idle-left.webp` | reposo oeste | 384×96 | sí | bottom-center | 4 frames 96×96, 6 fps |
| `player/idle-right.webp` | reposo este | 384×96 | sí | bottom-center | 4 frames 96×96, 6 fps |
| `player/walk-down.webp` | caminar sur | 576×96 | sí | bottom-center | 6 frames 96×96, 10 fps |
| `player/walk-up.webp` | caminar norte | 576×96 | sí | bottom-center | 6 frames 96×96, 10 fps |
| `player/walk-left.webp` | caminar oeste | 576×96 | sí | bottom-center | 6 frames 96×96, 10 fps |
| `player/walk-right.webp` | caminar este | 576×96 | sí | bottom-center | 6 frames 96×96, 10 fps |
| `common/hero-gate-locked.webp` | puerta cerrada | 240×300 | sí | bottom-center | abertura sellada; render sugerido 180×225 |
| `common/hero-gate-active.webp` | reto disponible | 240×300 | sí | bottom-center | misma silueta; sello activo |
| `common/hero-gate-unlocking.webp` | apertura | 1200×300 | sí | bottom-center | 5 frames 240×300, 6 fps; abertura progresiva |
| `common/hero-gate-open.webp` | puerta abierta | 240×300 | sí | bottom-center | paso central visiblemente libre |
| `common/portal-base.webp` | arquitectura/pedestal | 320×360 | sí | bottom-center | silueta monumental; render sugerido 240×270 |
| `common/portal-core.webp` | núcleo animado | 512×128 | sí | center | 4 frames 128×128, 8 fps |
| `common/portal-foreground.webp` | marco delantero | 320×360 | sí | bottom-center | delante del núcleo, sin tapar acceso |
| `fx/portal-energy.webp` | energía animada | 512×128 | sí | center | 4 frames 128×128, 8 fps; overlay ligero |
| `common/boss-phase-1.webp` | guardián sellado | 256×256 | sí | center | silueta inicial; health/telegraph quedan en Canvas |
| `common/boss-phase-2.webp` | guardián expuesto | 256×256 | sí | center | daño visible, misma huella visual |
| `common/boss-phase-3.webp` | guardián crítico | 256×256 | sí | center | clímax legible sin cambiar collider |
| `common/station-shield.webp` | estación de escudo | 128×128 | sí | center | interactiva, lectura de protección |
| `common/station-pulse.webp` | estación de pulso | 128×128 | sí | center | misma familia visual, energía ofensiva |
| `common/station-heal.webp` | estación de cura | 128×128 | sí | center | misma familia visual, energía restauradora |
| `common/math-sentinel.webp` | centinela del nivel 2 | 192×192 | sí | center | amenaza clara; sin collider adicional |

Total requerido: **38 archivos** (15 ambientes + 8 jugador + 4 puerta + 4 portal + 3 boss + 4 encuentros). Las capas `fx` de nivel y parallax adicional son opcionales. En `art-pack.json`, registrar el boss bajo `"boss": { "phase-1": {...}, "phase-2": {...}, "phase-3": {...} }` y las estaciones/centinela bajo `"encounter": { "shield": {...}, "pulse": {...}, "heal": {...}, "sentinel": {...} }`. Tamaños visuales del JSON son independientes de los píxeles fuente y del collider. Para el jugador, render sugerido 72×72; puerta y portal comparten las mismas posiciones de mundo de los colliders existentes.
