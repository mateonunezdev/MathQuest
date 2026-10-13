# Premium Math Explorer candidate V1

This is an isolated character-production candidate. It does not replace the
official build or any earlier candidate.

## Selected build

- Body/outfit: Quaternius `Male_Ranger` from **Modular Character Outfits - Fantasy**.
- Animation sources: Quaternius **Universal Animation Library 1 and 2**.
- License: CC0; the exact vendor license files are stored beside the GLB.
- Output: `math-explorer-quaternius-ranger-v1.glb`.
- Build script: `tools/blender/build-premium-math-explorer.py`.
- Output SHA-256: `72a2f71a981ccd357c2b401a5a50aa50d2ca775997cad6f1a71995ac4b37ecd2`.
- Runtime content: 65-bone humanoid rig, 9 skinned parts, 27,062 source
  triangles, 15 curated authored clips, embedded 1024 px textures.

The Blender build imports only audited GLTF/GLB data. No vendor script is run.
The green ranger texture is replaced before import with the included third
vendor palette, whose dark neutral, aged-gold and pale-cyan surfaces are closer
to MathQuest. This is a legal customized base, not yet a final original hero.

## Authored runtime states

Idle, forward jog, sprint, jump start/air/land, slide start/loop/exit, sword
dash, sword attacks, hit, spell and interact are present. Left/right steering
currently reuses the authored forward jog and is explicitly reported as a
substitute. `SHIELD` has no accepted clip. Those gaps must not be described as
finished character production.

The earlier KayKit Mage remains in this directory as preserved rejected
selection evidence. Its rig is valid, but its hat/cape silhouette hid the legs
from the third-person camera and its pack had no true slide clip.

No paid tier or generated-media credit was used.
