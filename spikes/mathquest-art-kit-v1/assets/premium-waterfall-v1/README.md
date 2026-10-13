# Premium Waterfall Sanctuary V1

Isolated `OFFICIAL_3D_CANDIDATE` environment for the first MathQuest world.
It does not replace the official base or the earlier waterfall candidate.

## Runtime asset

- `premium-waterfall-sanctuary-v1.glb`
- Authored by `tools/blender/build-premium-waterfall-sanctuary-v1.py`
- Sculpted continuous valley, natural trail, waterfall system, detailed ruins,
  aqueduct, side-mounted A/B/C sluice console, waterwheel and lifting bridge.
- 132 Blender source meshes, approximately 91,237 source triangles and 30
  authored/imported materials (155 structural runtime pieces after loading).
- Source textures are capped at 512 px during export for the browser budget.

## External asset sources

Only geometry and textures are imported. No third-party script is executed.

1. Quaternius, **Stylized Nature MegaKit — Standard**
   - Official source: https://quaternius.com/packs/stylizednaturemegakit.html
   - Download archive SHA-256: `298f6732b872e4cf7b30e6e7abf9641c7f6dc6b326df37ac089533ed7e3d58c9`
   - Selected runtime models: CommonTree 2, Pine 3, Fern 1, Rock Medium 1/3
     and RockPath Round Wide. Other source templates are imported only during
     the authoring build and removed before export when unsuitable.
   - License: CC0 1.0 Universal.

2. Quaternius, **Medieval Village MegaKit — Standard**
   - Official source: https://quaternius.com/packs/medievalvillagemegakit.html
   - Download archive SHA-256: `e60dea67c10f30dccccfbff92a7933f5ea5cfe99be0e2a0fa5118cceabeec5c4`
   - Selected models: Wall Arch, Wall UnevenBrick Straight, Floor UnevenBrick,
     Stairs Exterior Straight, Prop Vine 5, Exterior Border Straight 1 and
     modular exterior borders. A roof template is inspected during the build
     but deliberately excluded from export because it obstructed the camera.
   - License: CC0 1.0 Universal.

The project-authored terrain, route, hydraulic mechanism and mathematical
integration remain MathQuest work. The original free archives stay outside the
repository and are not redistributed here.
