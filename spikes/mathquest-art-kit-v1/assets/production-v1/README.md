# MathQuest Waterfall Production V1 assets

This directory contains an isolated production experiment for Level 1. It does
not replace the approved earlier candidates.

## Original MathQuest assets

- `waterfall-sanctuary-production-v1.blend`: editable environment source.
- `waterfall-sanctuary-production-v1.glb`: Three.js runtime environment.
- `math-explorer-rig-v1.blend`: editable rig and animation source.
- `math-explorer-rig-v1.glb`: Three.js runtime actor.

These files are original project-owned MathQuest work generated with the
reviewed script at `tools/blender/build-mathquest-waterfall-production-v1.py`.
The runtime packages were exported with Blender 4.5.7 LTS. The portable Blender
archive used outside the repository was downloaded from the official Blender
Foundation release server and verified with SHA-256:

`c15c53f4ba219fc1871f25116e4aa4f8e4d62dab24144170e5f0890e89223875`

## CC0 source used

The environment contains linked copies of Poly Haven `Rock 07`:

- Source: https://polyhaven.com/a/rock_07
- License: CC0 1.0
- Downloaded source and textures: `spikes/production-art/assets/polyhaven/rock_07/`
- Original binary MD5: `817b2cfd1626cb06f18a825f87f58ec3`

No third-party Blender script was downloaded or executed. No paid or
credit-consuming asset service was used.

## Runtime contract

- Units: meters
- Up: +Y after glTF export
- Actor forward correction: runtime `rotationY = PI`
- Environment mechanism nodes: `MATH_WHEEL`, `SLUICE_GATE_A/B/C`, and
  `BRIDGE_SECTION_1..5`
- Actor clips: IDLE, RUN, RUN_LEFT, RUN_RIGHT, JUMP_ANTICIPATION, JUMP_ASCEND,
  JUMP_FALL, LAND, SLIDE_ENTER, SLIDE_LOOP, SLIDE_EXIT, DASH, ATTACK, POWER,
  HIT, INTERACT, SHIELD, PORTAL

Measured in the integrated candidate at 1280x800:

- 59.85 FPS average
- 16.71 ms average frame time
- 228 draw calls
- 102,594 rendered triangles
- 233 geometries
- 12 textures

