import * as THREE from 'three';
import { mergeGeometries } from 'mergeGeometries';
import { GLTFLoader } from 'GLTFLoader';
import { CharacterController, verifySyntheticRigPipeline } from './character-controller.js';
import { ProceduralExplorer } from './procedural-explorer.js';
import { CURRENT_CAMPAIGN_ADAPTER } from './content/current-campaign-content.mjs';
import { REBUILT_CAMPAIGN_ADAPTER } from './content/rebuilt-campaign-content.mjs';
import { TRANSFORMED_CAMPAIGN_ADAPTER } from './content/transformed-campaign-content.mjs';
import { MathLabelRenderer } from './math-label-renderer.js';

const canvas = document.querySelector('#scene');
const fallback = document.querySelector('#fallback');
const query = new URLSearchParams(location.search);
const artAssetUrl = relativePath => new URL(`./assets/${relativePath}`, import.meta.url).href;
const INTEGRATED = document.body.dataset.mode === 'integrated' || query.get('integrated') === '1';
const EMBEDDED_SPLIT_PLAYER = query.get('embedded') === '1';
// The integrated build now opens on the premium campaign by default. Every
// previous candidate remains addressable through its explicit levelSet query.
const LEVEL_SET = query.get('levelSet') || (INTEGRATED ? 'official-premium-v1' : null);
const V1_REBUILD_ENABLED = LEVEL_SET === 'rebuild-v1';
const V2_REBUILD_ENABLED = LEVEL_SET === 'rebuild-v2';
const V3_MOTION_ENABLED = LEVEL_SET === 'rebuild-v3';
const MATHEO_WORLD_ENABLED = LEVEL_SET === 'matheo-v1';
const WATERFALL_PRODUCTION_REQUESTED = LEVEL_SET === 'waterfall-production-v1';
const PREMIUM_CHARACTER_REQUESTED = LEVEL_SET === 'premium-character-v1';
const PREMIUM_WATERFALL_REQUESTED = LEVEL_SET === 'premium-waterfall-v1';
const PREMIUM_WATERFALL_V2_REQUESTED = LEVEL_SET === 'premium-waterfall-v2';
const OFFICIAL_PREMIUM_CAMPAIGN = LEVEL_SET === 'official-premium-v1';
const PREMIUM_V2_LEVEL_ONE = PREMIUM_WATERFALL_V2_REQUESTED || (OFFICIAL_PREMIUM_CAMPAIGN && Number.parseInt(query.get('level') || '1', 10) === 1);
const PREMIUM_V2_RIG_ENABLED = PREMIUM_WATERFALL_V2_REQUESTED || OFFICIAL_PREMIUM_CAMPAIGN;
const PREMIUM_RIG_REQUESTED = PREMIUM_CHARACTER_REQUESTED || PREMIUM_WATERFALL_REQUESTED || PREMIUM_V2_RIG_ENABLED;
const ENHANCED_MOTION_ENABLED = V3_MOTION_ENABLED || MATHEO_WORLD_ENABLED || WATERFALL_PRODUCTION_REQUESTED || PREMIUM_RIG_REQUESTED;
const TRANSFORMED_WORLD_ENABLED = V2_REBUILD_ENABLED || ENHANCED_MOTION_ENABLED;
const REBUILD_ENABLED = V1_REBUILD_ENABLED || TRANSFORMED_WORLD_ENABLED;
const ACTIVE_CAMPAIGN_ADAPTER = TRANSFORMED_WORLD_ENABLED
    ? TRANSFORMED_CAMPAIGN_ADAPTER
    : V1_REBUILD_ENABLED ? REBUILT_CAMPAIGN_ADAPTER : CURRENT_CAMPAIGN_ADAPTER;
const { levels: LEVELS, replaySets: MATH_REPLAY_SETS } = ACTIVE_CAMPAIGN_ADAPTER;
const LEVEL_INDEX = THREE.MathUtils.clamp(Number.parseInt(query.get('level') || '1', 10) - 1, 0, LEVELS.length - 1);
const LEVEL = LEVELS[LEVEL_INDEX];
const WATERFALL_PRODUCTION_ENABLED = (WATERFALL_PRODUCTION_REQUESTED || PREMIUM_WATERFALL_REQUESTED || PREMIUM_WATERFALL_V2_REQUESTED || OFFICIAL_PREMIUM_CAMPAIGN) && LEVEL_INDEX === 0;
const productionReadiness = {
    world: !WATERFALL_PRODUCTION_ENABLED,
    character: !WATERFALL_PRODUCTION_ENABLED && !PREMIUM_RIG_REQUESTED,
    worldError: null,
    characterError: null
};
const LEVEL_RUNTIME = LEVEL.runtime;
const MATH_SET = THREE.MathUtils.clamp(Number.parseInt(query.get('mathSet') || '0', 10), 0, 1);
const ACTIVE_MATH = MATH_SET === 0 ? LEVEL : MATH_REPLAY_SETS[LEVEL_INDEX];
const CAMPAIGN_MODE = query.get('campaign') === '1';
const CAMPAIGN_SCORE = Math.max(0, Number.parseInt(query.get('campaignScore') || '1250', 10) || 1250);
const SESSION_MODES = new Set(['solo', 'duel']);
const INITIAL_SESSION_MODE = SESSION_MODES.has(query.get('sessionMode')) ? query.get('sessionMode') : 'solo';
function safePlayerName(value, fallback) {
    const cleaned = String(value || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, ' ').slice(0, 14);
    return cleaned || fallback;
}
function nonNegativeInt(value) {
    return Math.max(0, Number.parseInt(value || '0', 10) || 0);
}
const UP = new THREE.Vector3(0, 1, 0);
const BASE_FOV = 58;
const ROUTE_WIDTH = 8.4;

let renderer;
try {
    renderer = new THREE.WebGLRenderer({
        canvas, alpha: false, antialias: false, desynchronized: true,
        powerPreference: 'high-performance'
    });
} catch (error) {
    fallback.textContent = INTEGRATED ? 'NO SE PUDO ABRIR EL TEMPLO' : 'WEBGL ART SHOWCASE UNAVAILABLE';
    throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, EMBEDDED_SPLIT_PLAYER ? .64 : INTEGRATED ? .82 : .9));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = WATERFALL_PRODUCTION_ENABLED ? .98 : 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(LEVEL.background);
scene.fog = new THREE.FogExp2(LEVEL.fog, .0128);
const camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / Math.max(1, innerHeight), .1, 220);
const cameraLook = new THREE.Vector3();

function seeded(index) {
    const value = Math.sin(index * 93.137 + 19.771) * 43758.5453;
    return value - Math.floor(value);
}

function makeStoneTexture() {
    const size = 256;
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = size;
    const context = textureCanvas.getContext('2d');
    context.fillStyle = '#637477';
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 1900; index++) {
        const shade = 70 + Math.floor(seeded(index) * 55);
        const alpha = .025 + seeded(index + 3) * .1;
        context.fillStyle = `rgba(${shade - 8},${shade},${shade + 2},${alpha})`;
        const radius = .4 + seeded(index + 9) * 2.6;
        context.beginPath();
        context.arc(seeded(index + 11) * size, seeded(index + 17) * size, radius, 0, Math.PI * 2);
        context.fill();
    }
    context.lineCap = 'round';
    for (let index = 0; index < 18; index++) {
        const x = seeded(index + 2100) * size;
        const y = seeded(index + 2200) * size;
        context.strokeStyle = `rgba(22,35,37,${.1 + seeded(index + 2300) * .2})`;
        context.lineWidth = .6 + seeded(index + 2400) * 1.4;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + (seeded(index + 2500) - .5) * 44, y + 15 + seeded(index + 2600) * 30);
        context.lineTo(x + (seeded(index + 2700) - .5) * 60, y + 42 + seeded(index + 2800) * 35);
        context.stroke();
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.25, 2.25);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
}

function makeGroundTexture() {
    const size = 256;
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = size;
    const context = textureCanvas.getContext('2d');
    context.fillStyle = '#8aa08b';
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 1250; index++) {
        const x = seeded(index + 6100) * size;
        const y = seeded(index + 6200) * size;
        const length = 2 + seeded(index + 6300) * 10;
        const green = 72 + Math.floor(seeded(index + 6400) * 72);
        context.strokeStyle = `rgba(${green - 28},${green},${green - 18},${.08 + seeded(index + 6500) * .2})`;
        context.lineWidth = .5 + seeded(index + 6600) * 1.3;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + (seeded(index + 6700) - .5) * 4, y - length);
        context.stroke();
    }
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.5, 5.5);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
}

function makeSoftTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = 64;
    const context = textureCanvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(190,255,246,1)');
    gradient.addColorStop(.18, 'rgba(70,235,226,.92)');
    gradient.addColorStop(1, 'rgba(28,177,185,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const stoneTexture = makeStoneTexture();
const groundTexture = makeGroundTexture();
const softTexture = makeSoftTexture();
const MATERIALS = {
    STONE_PRIMARY: new THREE.MeshStandardMaterial({
        name: 'STONE_PRIMARY', color: LEVEL.stone, map: stoneTexture,
        roughness: .91, metalness: .02, envMapIntensity: .25
    }),
    STONE_DAMAGED: new THREE.MeshStandardMaterial({
        name: 'STONE_DAMAGED', color: LEVEL.damaged, map: stoneTexture,
        roughness: .98, metalness: 0, envMapIntensity: .18
    }),
    GOLD_AGED: new THREE.MeshStandardMaterial({
        name: 'GOLD_AGED', color: 0xc28a39, emissive: 0x291202,
        emissiveIntensity: .18, roughness: .46, metalness: .68
    }),
    CYAN_EMISSIVE: new THREE.MeshStandardMaterial({
        name: 'CYAN_EMISSIVE', color: 0x25aeb3, emissive: 0x08757c,
        emissiveIntensity: 1.32, roughness: .3, metalness: .1
    }),
    WOOD_RUIN: new THREE.MeshStandardMaterial({
        name: 'WOOD_RUIN', color: 0x6b3d20, roughness: .9, metalness: 0
    }),
    GROUND: new THREE.MeshStandardMaterial({
        color: LEVEL.ground, map: stoneTexture, roughness: 1, metalness: 0
    })
};

const route = new THREE.CatmullRomCurve3(LEVEL.route.map(point => new THREE.Vector3(...point)), false, 'catmullrom', .32);
const routeLength = route.getLength();

function sampleAtDistance(distance) {
    const progress = THREE.MathUtils.clamp(distance / routeLength, 0, 1);
    const point = route.getPointAt(progress);
    const tangent = route.getTangentAt(progress).normalize();
    // `tangent × up` is screen-right for the rear follow camera.  The previous
    // order inverted the world basis, so ArrowRight moved the Explorer left.
    const lateral = new THREE.Vector3().crossVectors(tangent, UP).normalize();
    return { progress, point, tangent, lateral };
}

function routeTurnDegrees(distance, halfSpan = 2.4) {
    const before = sampleAtDistance(Math.max(0, distance - halfSpan)).tangent;
    const after = sampleAtDistance(Math.min(routeLength, distance + halfSpan)).tangent;
    return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(before.dot(after), -1, 1)));
}

function placeAlong(object, distance, lateralOffset = 0, verticalOffset = 0) {
    const sample = sampleAtDistance(distance);
    object.position.copy(sample.point).addScaledVector(sample.lateral, lateralOffset).addScaledVector(UP, verticalOffset);
    object.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
    return sample;
}

function chamferedBox(width, height, depth, bevel = .08) {
    const cut = Math.min(bevel, width * .18, height * .18);
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + cut, -height / 2);
    shape.lineTo(width / 2 - cut, -height / 2);
    shape.lineTo(width / 2, -height / 2 + cut);
    shape.lineTo(width / 2, height / 2 - cut);
    shape.lineTo(width / 2 - cut, height / 2);
    shape.lineTo(-width / 2 + cut, height / 2);
    shape.lineTo(-width / 2, height / 2 - cut);
    shape.lineTo(-width / 2, -height / 2 + cut);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth, steps: 1, bevelEnabled: bevel > 0,
        bevelSegments: 1, bevelSize: cut * .34, bevelThickness: Math.min(cut * .34, depth * .12)
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.computeVertexNormals();
    return geometry;
}

function ringSegment(innerRadius, outerRadius, startAngle, endAngle, depth, bevel = .04) {
    const shape = new THREE.Shape();
    const divisions = Math.max(3, Math.ceil((endAngle - startAngle) * 8));
    for (let index = 0; index <= divisions; index++) {
        const angle = THREE.MathUtils.lerp(startAngle, endAngle, index / divisions);
        const point = new THREE.Vector2(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        if (index === 0) shape.moveTo(point.x, point.y); else shape.lineTo(point.x, point.y);
    }
    for (let index = divisions; index >= 0; index--) {
        const angle = THREE.MathUtils.lerp(startAngle, endAngle, index / divisions);
        shape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    }
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth, steps: 1, bevelEnabled: bevel > 0,
        bevelSegments: 1, bevelSize: bevel, bevelThickness: bevel
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.computeVertexNormals();
    return geometry;
}

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.rotation.set(...rotation);
    return object;
}

function stoneBlock(width, height, depth, position, material = MATERIALS.STONE_PRIMARY, bevel = .1) {
    return mesh(chamferedBox(width, height, depth, bevel), material, position);
}

// Lightweight camera collision volumes are captured before the authored kit is
// baked by material. This keeps the render-efficient merged meshes while still
// preserving per-piece obstruction data for the third-person camera.
const cameraOccluderBoxes = [];
function registerCameraOccluders(root, label) {
    root.updateWorldMatrix(true, true);
    let index = 0;
    root.traverse(object => {
        if (!object.isMesh || ![MATERIALS.STONE_PRIMARY, MATERIALS.STONE_DAMAGED, MATERIALS.GOLD_AGED].includes(object.material)) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld).expandByScalar(.18);
        const size = box.getSize(new THREE.Vector3());
        if (Math.max(size.x, size.y, size.z) < .42) return;
        cameraOccluderBoxes.push({ box, name: `${label}_${index++}` });
    });
}

function addRingSegments(group, options) {
    const {
        inner, outer, depth, start = 0, end = Math.PI * 2, count = 12,
        gap = .035, material = MATERIALS.STONE_PRIMARY, position = [0, 0, 0],
        rotationZ = 0, alternateDepth = 0
    } = options;
    const span = (end - start) / count;
    for (let index = 0; index < count; index++) {
        const geometry = ringSegment(inner, outer, start + index * span + gap, start + (index + 1) * span - gap,
            depth + (index % 2 ? alternateDepth : 0), .035);
        const part = mesh(geometry, material, position);
        part.rotation.z = rotationZ;
        group.add(part);
    }
}

function createColumn(variant = 0) {
    const group = new THREE.Group();
    group.name = `MQ_COLUMN_${variant + 1}`;
    const stone = variant ? MATERIALS.STONE_DAMAGED : MATERIALS.STONE_PRIMARY;
    group.add(
        stoneBlock(4.25, .65, 4.25, [0, .33, 0], stone, .18),
        stoneBlock(3.55, .55, 3.55, [0, .92, 0], MATERIALS.STONE_PRIMARY, .14),
        stoneBlock(3.05, .48, 3.05, [0, 1.43, 0], stone, .12)
    );
    for (let index = 0; index < 4; index++) {
        const height = 1.62;
        const top = 1.28 - index * .075;
        const bottom = top + .16;
        const shaft = mesh(new THREE.CylinderGeometry(top, bottom, height, 12, 1, false), stone,
            [0, 2.45 + index * 1.55, 0]);
        shaft.rotation.y = index * .09 + variant * .1;
        group.add(shaft);
        if (index < 3) {
            const collar = mesh(new THREE.CylinderGeometry(bottom + .12, bottom + .12, .16, 12),
                index === 1 ? MATERIALS.GOLD_AGED : MATERIALS.STONE_PRIMARY,
                [0, 3.22 + index * 1.55, 0]);
            group.add(collar);
        }
    }
    for (const side of [-1, 1]) {
        const inset = stoneBlock(.09, 3.85, .045, [side * .43, 4.83, 1.2], MATERIALS.CYAN_EMISSIVE, .014);
        inset.rotation.z = side * .028;
        group.add(inset);
    }
    group.add(
        mesh(new THREE.CylinderGeometry(1.48, 1.35, .28, 12), MATERIALS.GOLD_AGED, [0, 7.87, 0]),
        stoneBlock(3.25, .52, 3.25, [0, 8.28, 0], MATERIALS.STONE_PRIMARY, .12)
    );
    for (let index = 0; index < 4; index++) {
        const arm = stoneBlock(2.55, .48, .72, [Math.cos(index * Math.PI / 2) * .62, 8.75, Math.sin(index * Math.PI / 2) * .62], stone, .1);
        arm.rotation.y = index * Math.PI / 2;
        arm.rotation.z = index % 2 ? 0 : (index === 0 ? .24 : -.24);
        group.add(arm);
    }
    const crown = mesh(new THREE.DodecahedronGeometry(.77, 0), MATERIALS.GOLD_AGED, [0, 9.38, 0]);
    crown.rotation.set(.1, Math.PI / 4, 0);
    const rune = mesh(new THREE.OctahedronGeometry(.31, 0), MATERIALS.CYAN_EMISSIVE, [0, 9.38, 1.02]);
    rune.scale.set(.75, 1.45, .38);
    group.add(crown, rune);
    return group;
}

function createArch() {
    const group = new THREE.Group();
    group.name = 'MQ_ARCH';
    for (const side of [-1, 1]) {
        const x = side * 5.15;
        group.add(
            stoneBlock(3.05, .75, 3.45, [x, .38, 0], MATERIALS.STONE_DAMAGED, .16),
            stoneBlock(2.58, 1.05, 3.05, [x, 1.23, 0], MATERIALS.STONE_PRIMARY, .13),
            stoneBlock(2.12, 5.4, 2.65, [x, 4.42, 0], MATERIALS.STONE_PRIMARY, .15),
            stoneBlock(2.62, .52, 3.1, [x, 7.25, 0], MATERIALS.GOLD_AGED, .09),
            stoneBlock(.13, 3.55, .07, [x - side * .72, 4.45, 1.38], MATERIALS.CYAN_EMISSIVE, .02)
        );
        const buttress = stoneBlock(1.85, 4.7, 3.45, [side * 7.05, 2.85, .2], MATERIALS.STONE_DAMAGED, .16);
        buttress.rotation.z = side * -.055;
        group.add(buttress);
    }
    addRingSegments(group, {
        inner: 4.05, outer: 5.55, depth: 2.9, start: 0, end: Math.PI,
        count: 11, gap: .026, position: [0, 7.12, 0], alternateDepth: .16
    });
    addRingSegments(group, {
        inner: 3.63, outer: 3.86, depth: 3.06, start: 0, end: Math.PI,
        count: 15, gap: .018, material: MATERIALS.GOLD_AGED, position: [0, 7.12, 0]
    });
    addRingSegments(group, {
        inner: 3.43, outer: 3.48, depth: 3.12, start: 0, end: Math.PI,
        count: 18, gap: .012, material: MATERIALS.CYAN_EMISSIVE, position: [0, 7.12, 0]
    });
    const seal = new THREE.Group();
    seal.position.set(0, 12.25, 1.62);
    addRingSegments(seal, { inner: .74, outer: 1.2, depth: .24, count: 8, gap: .045, material: MATERIALS.GOLD_AGED });
    const diamond = mesh(new THREE.OctahedronGeometry(.46, 0), MATERIALS.CYAN_EMISSIVE);
    diamond.scale.set(.72, 1.25, .34);
    seal.add(diamond);
    group.add(seal);
    for (const side of [-1, 1]) {
        const brace = stoneBlock(3.1, .45, 1.1, [side * 3.1, 11.45, -.1], MATERIALS.STONE_DAMAGED, .1);
        brace.rotation.z = side * .42;
        group.add(brace);
    }
    return group;
}

function createBridgeModule(type) {
    const group = new THREE.Group();
    group.name = `MQ_BRIDGE_${type.toUpperCase()}`;
    group.add(
        stoneBlock(9.6, 1.0, 8.1, [0, -.52, 0], MATERIALS.STONE_PRIMARY, .16),
        stoneBlock(8.9, .48, 7.75, [0, .23, 0], MATERIALS.STONE_DAMAGED, .1)
    );
    for (const side of [-1, 1]) {
        group.add(stoneBlock(.54, 1.45, 7.7, [side * 4.45, .72, 0], MATERIALS.STONE_PRIMARY, .1));
        const goldRail = stoneBlock(.12, .19, 7.18, [side * 4.16, 1.25, 0], MATERIALS.GOLD_AGED, .025);
        group.add(goldRail);
        for (let index = -1; index <= 1; index++) {
            if (type === 'end' && side === 1 && index === -1) continue;
            const merlon = stoneBlock(.7, 1.1 - Math.abs(index) * .08, 1.15,
                [side * 4.47, 1.68, index * 2.55],
                type === 'end' && index === 1 ? MATERIALS.STONE_DAMAGED : MATERIALS.STONE_PRIMARY, .1);
            if (type === 'end' && index === 1) merlon.rotation.z = side * .16;
            group.add(merlon);
        }
        addRingSegments(group, {
            inner: 2.25, outer: 2.72, depth: .42, start: 0, end: Math.PI,
            count: 7, gap: .025, material: MATERIALS.STONE_DAMAGED,
            position: [side * 4.77, -1.0, 0], rotationZ: Math.PI / 2
        });
    }
    group.add(stoneBlock(.24, .055, 7.3, [0, .53, 0], MATERIALS.CYAN_EMISSIVE, .018));
    for (let index = -2; index <= 2; index++) {
        if (type === 'end' && index === 2) continue;
        const engraving = stoneBlock(2.15, .045, .12, [index % 2 ? -.85 : .85, .54, index * 1.25],
            index === 0 ? MATERIALS.GOLD_AGED : MATERIALS.STONE_PRIMARY, .015);
        engraving.rotation.z = index % 2 ? -.34 : .34;
        group.add(engraving);
    }
    if (type === 'start') {
        for (const side of [-1, 1]) {
            group.add(stoneBlock(1.2, 3.0, 1.8, [side * 4.55, 1.0, 3.25], MATERIALS.STONE_DAMAGED, .13));
            const marker = mesh(new THREE.OctahedronGeometry(.28, 0), MATERIALS.CYAN_EMISSIVE, [side * 4.56, 2.65, 3.82]);
            marker.scale.set(.7, 1.3, .35);
            group.add(marker);
        }
    }
    return group;
}

function createPortal(energyEnabled) {
    const group = new THREE.Group();
    group.name = 'MQ_PORTAL_FRAME';
    group.add(
        stoneBlock(15.4, .9, 7.0, [0, .45, 0], MATERIALS.STONE_DAMAGED, .2),
        stoneBlock(12.8, .58, 5.5, [0, 1.15, 0], MATERIALS.STONE_PRIMARY, .14)
    );
    for (const side of [-1, 1]) {
        const pylon = stoneBlock(2.05, 8.0, 2.8, [side * 6.0, 5.05, 0], MATERIALS.STONE_PRIMARY, .16);
        pylon.rotation.z = side * -.045;
        const brace = stoneBlock(4.3, .72, 1.72, [side * 4.75, 3.2, -.1], MATERIALS.STONE_DAMAGED, .11);
        brace.rotation.z = side * .72;
        group.add(pylon, brace,
            stoneBlock(2.65, .42, 3.25, [side * 6.0, 9.15, 0], MATERIALS.GOLD_AGED, .08),
            stoneBlock(.13, 4.65, .08, [side * 5.2, 5.15, 1.45], MATERIALS.CYAN_EMISSIVE, .02)
        );
    }
    addRingSegments(group, {
        inner: 4.46, outer: 5.72, depth: 2.65, count: 16, gap: .035,
        position: [0, 6.45, 0], alternateDepth: .18
    });
    addRingSegments(group, {
        inner: 4.05, outer: 4.34, depth: 2.9, count: 20, gap: .026,
        material: MATERIALS.GOLD_AGED, position: [0, 6.45, .02], rotationZ: .09
    });
    addRingSegments(group, {
        inner: 3.78, outer: 3.86, depth: 3.0, count: 24, gap: .018,
        material: MATERIALS.CYAN_EMISSIVE, position: [0, 6.45, .04], rotationZ: -.06
    });
    for (let index = 0; index < 4; index++) {
        const angle = Math.PI / 4 + index * Math.PI / 2;
        const lock = mesh(new THREE.DodecahedronGeometry(.5, 0), MATERIALS.GOLD_AGED,
            [Math.cos(angle) * 5.13, 6.45 + Math.sin(angle) * 5.13, 1.58]);
        lock.rotation.set(.15, angle, angle);
        group.add(lock);
    }
    const coreMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uEnabled: { value: energyEnabled ? 1 : 0 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
            precision mediump float; varying vec2 vUv; uniform float uTime; uniform float uEnabled;
            void main(){
                vec2 p=vUv-.5; float r=length(p)*2.0; float a=atan(p.y,p.x);
                float bands=sin(r*31.0-a*6.0-uTime*2.2)*.5+.5;
                float lattice=sin((p.x+p.y)*34.0+uTime)*sin((p.x-p.y)*30.0-uTime*.7);
                float edge=1.0-smoothstep(.79,1.0,r);
                vec3 deep=vec3(.004,.035,.06); vec3 cyan=vec3(.08,1.0,.92); vec3 gold=vec3(.9,.38,.05);
                vec3 color=mix(deep,cyan,.24+bands*.6+max(0.0,lattice)*.18);
                color=mix(color,gold,pow(bands,9.0)*.12);
                gl_FragColor=vec4(color,edge*(.78+bands*.18)*uEnabled);
            }`
    });
    // The energy surface needs an opaque visual throat. Without it, authored
    // environment masonry behind the frame reads as a sealed stone wall and
    // the portal leap drives the camera into that texture.
    const throatMaterial = new THREE.MeshBasicMaterial({
        color: 0x03171f, transparent: true, opacity: .96,
        side: THREE.DoubleSide, depthWrite: true, toneMapped: false
    });
    // Keep the active surface ahead of the authored ruin wall that supports
    // the frame. The player sees energy, not the masonry backing.
    const throat = mesh(new THREE.CircleGeometry(3.76, 64), throatMaterial, [0, 6.45, 3.5]);
    const core = mesh(new THREE.CircleGeometry(3.72, 64), coreMaterial, [0, 6.45, 3.56]);
    group.add(throat, core);
    const orbitA = new THREE.Group();
    orbitA.position.set(0, 6.45, 3.66);
    orbitA.scale.y = .72;
    addRingSegments(orbitA, { inner: 2.64, outer: 2.76, depth: .1, count: 12, gap: .035, material: MATERIALS.GOLD_AGED });
    const orbitB = new THREE.Group();
    orbitB.position.set(0, 6.45, 3.7);
    orbitB.scale.y = .54;
    addRingSegments(orbitB, { inner: 1.85, outer: 1.95, depth: .1, count: 10, gap: .04, material: MATERIALS.CYAN_EMISSIVE });
    group.add(orbitA, orbitB);

    const positions = new Float32Array(54 * 3);
    for (let index = 0; index < 54; index++) {
        const angle = seeded(index + 4000) * Math.PI * 2;
        const radius = 3.8 + seeded(index + 4100) * 3.1;
        positions[index * 3] = Math.cos(angle) * radius;
        positions[index * 3 + 1] = 6.45 + Math.sin(angle) * radius;
        positions[index * 3 + 2] = 1.35 + (seeded(index + 4200) - .5) * 1.2;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({
        map: softTexture, color: 0x8ffff4, size: .42, transparent: true,
        opacity: energyEnabled ? .68 : 0, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    group.add(particles);
    return { group, coreMaterial, throat, throatMaterial, orbitA, orbitB, particles };
}

const hemisphere = new THREE.HemisphereLight(TRANSFORMED_WORLD_ENABLED ? 0xe8f7ff : 0xa8e8ed, 0x091217,
    WATERFALL_PRODUCTION_ENABLED ? 1.72 : TRANSFORMED_WORLD_ENABLED ? 3.05 : 2.35);
scene.add(hemisphere);
const LIGHT_PALETTES = {
    waterfall: [0x315a65, 0xffd39a, 0x55c9cc],
    mountain: [0x303f73, 0xffd9aa, 0x78aaff],
    volcano: [0x5b2835, 0xff9a62, 0x63e8ee]
};
const [ambientColor, sunColor, fillColor] = LIGHT_PALETTES[LEVEL.theme];
scene.add(new THREE.AmbientLight(ambientColor, WATERFALL_PRODUCTION_ENABLED ? .44 : .78));
const sun = new THREE.DirectionalLight(sunColor, 4.25);
sun.position.set(-28, 38, 17);
if (WATERFALL_PRODUCTION_ENABLED) sun.intensity = 2.65;
scene.add(sun);
const cyanFill = new THREE.DirectionalLight(fillColor, .72);
cyanFill.position.set(24, 14, -35);
if (WATERFALL_PRODUCTION_ENABLED) cyanFill.intensity = .48;
scene.add(cyanFill);

const SKY_PALETTES = {
    waterfall: [0x04131d, 0x23717a],
    mountain: [0x070b24, 0x4a5f9c],
    volcano: [0x170713, 0x8a352e]
};
const TRANSFORMED_SKY_PALETTES = {
    waterfall: [0x2e75a7, 0x9adbd5],
    mountain: [0x164d98, 0xb3d7f3],
    volcano: [0x210713, 0xb83e22]
};
const [skyTop, skyHorizon] = (TRANSFORMED_WORLD_ENABLED ? TRANSFORMED_SKY_PALETTES : SKY_PALETTES)[LEVEL.theme];
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(skyTop) }, uHorizon: { value: new THREE.Color(skyHorizon) }, uTime: { value: 0 } },
    vertexShader: `varying float vY; void main(){vY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying float vY;uniform vec3 uTop;uniform vec3 uHorizon;uniform float uTime;
        void main(){float h=smoothstep(-.2,.62,vY);float band=pow(max(0.0,sin(vY*24.0-uTime*.16)),8.0)*(1.0-h)*.09;
        gl_FragColor=vec4(mix(uHorizon,uTop,h)+uHorizon*band,1.0);}`
}));
scene.add(sky);

const ground = mesh(new THREE.PlaneGeometry(230, 230, 1, 1), MATERIALS.GROUND, [0, -1.05, -28], [-Math.PI / 2, 0, 0]);
if (!WATERFALL_PRODUCTION_ENABLED) scene.add(ground);

for (let distance = 0; !WATERFALL_PRODUCTION_ENABLED && distance < routeLength - 2; distance += 2.05) {
    const sample = sampleAtDistance(distance + 1.0);
    const slab = stoneBlock(ROUTE_WIDTH, .62, 1.92,
        [sample.point.x, sample.point.y - .36, sample.point.z],
        MATHEO_WORLD_ENABLED || (distance > 32 && distance < 57)
            ? MATERIALS.STONE_PRIMARY : MATERIALS.STONE_DAMAGED, .1);
    slab.rotation.order = 'YXZ';
    slab.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
    slab.rotation.x = -Math.asin(THREE.MathUtils.clamp(sample.tangent.y, -.98, .98));
    scene.add(slab);
    if (!MATHEO_WORLD_ENABLED && Math.round(distance / 2.05) % 4 === 1) {
        const rune = stoneBlock(1.9, .04, .09, [sample.point.x, sample.point.y - .02, sample.point.z], MATERIALS.GOLD_AGED, .01);
        rune.rotation.order = 'YXZ';
        rune.rotation.y = slab.rotation.y;
        rune.rotation.x = slab.rotation.x;
        rune.rotation.z = Math.round(distance) % 2 ? .62 : -.62;
        scene.add(rune);
    }
    if (MATHEO_WORLD_ENABLED && Math.round(distance / 2.05) % 3 === 0) {
        for (const side of [-1, 1]) {
            const edge = stoneBlock(.18, .08, 1.55,
                [sample.point.x, sample.point.y + .015, sample.point.z],
                LEVEL_INDEX === 2 ? MATERIALS.CYAN_EMISSIVE : MATERIALS.GOLD_AGED, .015);
            edge.position.addScaledVector(sample.lateral, side * (ROUTE_WIDTH * .5 - .28));
            edge.rotation.order = 'YXZ';
            edge.rotation.y = slab.rotation.y;
            edge.rotation.x = slab.rotation.x;
            scene.add(edge);
        }
    }
}

const arch = createArch();
placeAlong(arch, 9.0, 0, -.12);
if (!MATHEO_WORLD_ENABLED && !WATERFALL_PRODUCTION_ENABLED) {
    scene.add(arch);
    registerCameraOccluders(arch, 'ARCH');
}

for (const [distance, offset, variant] of (MATHEO_WORLD_ENABLED || WATERFALL_PRODUCTION_ENABLED ? [] : [[20.5, 6.8, 0], [27.2, 7.15, 1]])) {
    for (const side of [-1, 1]) {
        const column = createColumn(variant);
        placeAlong(column, distance + side * .3, side * offset, -.68);
        column.rotation.y += side * .06;
        scene.add(column);
        registerCameraOccluders(column, `COLUMN_${distance}_${side}`);
    }
}

const BRIDGE_ANCHORS = (LEVEL_RUNTIME?.bridgeAnchors || [34.2, 38.7, 43.2, 47.7, 52.2])
    .map((distance, index, values) => [distance, index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle']);
for (const [distance, type] of (WATERFALL_PRODUCTION_ENABLED ? [] : BRIDGE_ANCHORS)) {
    const bridge = createBridgeModule(type);
    bridge.scale.z = .59;
    const bridgeSample = placeAlong(bridge, distance, 0, -.48);
    bridge.rotation.order = 'YXZ';
    bridge.rotation.x = -Math.asin(THREE.MathUtils.clamp(bridgeSample.tangent.y, -.98, .98));
    scene.add(bridge);
    registerCameraOccluders(bridge, `BRIDGE_${type}`);
}

const portalDistance = LEVEL_RUNTIME?.portalDistance ?? routeLength - 4.1;
const FIRST_OBSTACLES = LEVEL_RUNTIME?.firstObstacles || { jump: 15.2, slide: 26.2, dash: 37.6 };
const SECOND_OBSTACLES = LEVEL_RUNTIME?.secondObstacles || {
    jump: portalDistance - 44,
    slide: portalDistance - 34,
    dash: portalDistance - 25
};
const altarDistance = LEVEL_RUNTIME?.altarDistance ?? LEVEL.altarDistance;
const altarStopDistance = altarDistance - 4.4;
const MAZE_DISTANCES = LEVEL_RUNTIME?.mazeDistances || [62.5, 69.5, 76.5];
const MAZE_LANES = LEVEL_RUNTIME?.mazeLanes || [
    [-1, 1, 0],
    [1, -1, 1],
    [0, 1, -1]
][LEVEL_INDEX];
const EXPLORATION_CONFIGS = [
    {
        zone: 'SANTUARIO DE MAREA', objective: 'REACTIVA LAS 3 RUNAS DE MAREA',
        rune: 'RUNA DE MAREA', loopComplete: 'CAUCE CERRADO · LABERINTO DESBLOQUEADO',
        exitComplete: 'SANTUARIO REACTIVADO · RUTA RESTAURADA'
    },
    {
        zone: 'OBSERVATORIO LIBRE', objective: 'REÚNE LAS 3 RUNAS ASTRALES',
        rune: 'RUNA ASTRAL', loopComplete: 'CONSTELACIÓN CERRADA · LABERINTO DESBLOQUEADO',
        exitComplete: 'OBSERVATORIO ALINEADO · RUTA RESTAURADA'
    },
    {
        zone: 'CÁMARA DE LA FORJA', objective: 'ENCIENDE LAS 3 RUNAS ÍGNEAS',
        rune: 'RUNA ÍGNEA', loopComplete: 'CIRCUITO DE FORJA CERRADO · LABERINTO DESBLOQUEADO',
        exitComplete: 'FORJA ESTABILIZADA · RUTA RESTAURADA'
    }
];
const EXPLORATION_CONFIG = LEVEL_RUNTIME ? {
    zone: LEVEL_RUNTIME.zone,
    objective: LEVEL_RUNTIME.objective,
    rune: LEVEL_RUNTIME.rune,
    loopComplete: `${LEVEL_RUNTIME.zone} · MECANISMO ALINEADO`,
    exitComplete: `${LEVEL_RUNTIME.zone} · RUTA RESTAURADA`
} : EXPLORATION_CONFIGS[LEVEL_INDEX];

// Help content for each level
const HELP_CONTENT = [
    {
        title: 'SANTUARIO DE LAS CASCADAS — NIVEL 1',
        theme: 'Aritmética y agua',
        objective: 'Desciende por el valle, redirige el agua en la esclusa y despierta al Coloso para alcanzar el portal.',
        obstacles: [
            { name: 'Ruptura 1', key: '<span class="key">↑ / W</span>', desc: 'Salta sobre el hueco en el camino' },
            { name: 'Arco bajo 1', key: '<span class="key">↓ / S</span>', desc: 'Deslízate bajo el arco de piedra' },
            { name: 'Puerta de energía 1', key: '<span class="key">K</span>', desc: 'Usa Dash para cruzar la línea de energía' },
            { name: 'Ruptura 2', key: '<span class="key">↑ / W</span>', desc: 'Segunda ruptura — salta de nuevo' },
            { name: 'Arco bajo 2', key: '<span class="key">↓ / S</span>', desc: 'Segundo arco — deslízate a tiempo' },
            { name: 'Línea del guardián', key: '<span class="key">K</span>', desc: 'Dash para romper la barrera final' }
        ],
        math: 'Tres rutas (Izquierda/Centro/Derecha) con operaciones de aritmética: división, multiplicación y combinadas. Elige la ruta correcta (A/B/C).',
        altar: 'Pregunta de aritmética en el altar. Respuesta correcta abre el mecanismo de agua.',
        guardian: 'Golpea 3 veces al Coloso con <span class="key">J</span> (Ataque). Tras el 3er golpe, responde su pregunta. Si aciertas, el gigante levanta la mano y libera el paso.',
        labyrinth: 'Laberinto de 3 puertas: busca el paso iluminado (Cian). 3 runas de marea por recoger. Completa el bucle: elige rama → extremo → cruza → regresa → reúne.',
        controls: {
            move: '<span class="key">← →</span> / <span class="key">A D</span>',
            jump: '<span class="key">↑</span> / <span class="key">W</span> / <span class="key">Espacio</span>',
            slide: '<span class="key">↓</span> / <span class="key">S</span>',
            dash: '<span class="key">K</span>',
            attack: '<span class="key">J</span>',
            power: '<span class="key">L</span> (Escudo Σ, cuesta 1 energía)',
            answer: '<span class="key">A / B / C</span> (Izq / Centro / Der)'
        },
        duo: 'En DOS JUGADORES: ambos reciben la misma pregunta. El primero en acertar avanza y espera (sin penalización). El segundo recibe una NUEVA pregunta, pierde 50 pts/seg y debe acertar para reunirse. El ganador del desafío gana bonus de puntos.'
    },
    {
        title: 'OBSERVATORIO DE FRACCIONES — NIVEL 2',
        theme: 'Fracciones y astronomía',
        objective: 'Asciende las terrazas, alinea el orrery fraccionario y cruza el eclipse para vencer al Centinela.',
        obstacles: [
            { name: 'Salto terraza 1', key: '<span class="key">↑ / W</span>', desc: 'Salta entre plataformas giratorias' },
            { name: 'Dash orbital 1', key: '<span class="key">K</span>', desc: 'Dash a través de la órbita giratoria' },
            { name: 'Salto eclipse', key: '<span class="key">↑ / W</span>', desc: 'Cruza el puente celeste durante el eclipse' },
            { name: 'Dash orbital 2', key: '<span class="key">K</span>', desc: 'Segunda órbita — sincroniza tu dash' },
            { name: 'Deslizamiento estelar', key: '<span class="key">↓ / S</span>', desc: 'Deslízate bajo la barrera astral' }
        ],
        math: 'Tres instrumentos armilares con fracciones: suma, fracción de cantidad, división. Elige A/B/C en el instrumento correcto.',
        altar: 'Pregunta de fracciones en el altar del orrery. Respuesta correcta alinea las órbitas.',
        guardian: 'Golpea 3 veces al Centinela con <span class="key">J</span>. Tras el 3er golpe, responde su pregunta de fracciones. Si aciertas, el eclipse se disipa y el paso queda libre.',
        labyrinth: 'Laberinto de 3 puertas con patrón distinto. 3 runas astrales. Completa el bucle memorizando la ruta.',
        controls: {
            move: '<span class="key">← →</span> / <span class="key">A D</span>',
            jump: '<span class="key">↑</span> / <span class="key">W</span> / <span class="key">Espacio</span>',
            slide: '<span class="key">↓</span> / <span class="key">S</span>',
            dash: '<span class="key">K</span>',
            attack: '<span class="key">J</span>',
            power: '<span class="key">L</span> (Escudo Σ)',
            answer: '<span class="key">A / B / C</span>'
        },
        duo: 'Misma mecánica: el primero acierta → avanza y espera. El segundo recibe NUEVA pregunta de fracciones, pierde puntos por tiempo, y debe acertar para reunirse.'
    },
    {
        title: 'FORJA DEL VOLCÁN ALGEBRAICO — NIVEL 3',
        theme: 'Álgebra y magma',
        objective: 'Equilibra la fundición, domina los pistones y derriba al Titán para cerrar la expedición.',
        obstacles: [
            { name: 'Puente magma 1', key: '<span class="key">↑ / W</span>', desc: 'Salta sobre los puentes de magma' },
            { name: 'Deslizamiento 1', key: '<span class="key">↓ / S</span>', desc: 'Deslízate bajo la compuerta de la forja' },
            { name: 'Dash pistón 1', key: '<span class="key">K</span>', desc: 'Dash entre pistones activados' },
            { name: 'Puente magma 2', key: '<span class="key">↑ / W</span>', desc: 'Segunda zona de puentes — más rápido' },
            { name: 'Deslizamiento 2', key: '<span class="key">↓ / S</span>', desc: 'Compuerta final — timing preciso' },
            { name: 'Dash núcleo', key: '<span class="key">K</span>', desc: 'Dash al núcleo algebraico' }
        ],
        math: 'Tres contrapesos algebraicos: ecuaciones de 1 y 2 pasos (x + n = m, ax = b, ax + b = c). Elige la palanca correcta (A/B/C).',
        altar: 'Ecuación algebraica en el altar del equilibrio. Respuesta correcta activa los contrapesos.',
        guardian: 'Golpea 3 veces al Titán con <span class="key">J</span>. Tras el 3er golpe, resuelve su ecuación. Si aciertas, el Titán cede el paso al portal final.',
        labyrinth: 'Laberinto final con pistones activos. 3 runas ígneas. Bucle más exigente: memoriza la ruta entre pistones.',
        controls: {
            move: '<span class="key">← →</span> / <span class="key">A D</span>',
            jump: '<span class="key">↑</span> / <span class="key">W</span> / <span class="key">Espacio</span>',
            slide: '<span class="key">↓</span> / <span class="key">S</span>',
            dash: '<span class="key">K</span>',
            attack: '<span class="key">J</span>',
            power: '<span class="key">L</span> (Escudo Σ, vital en Maestro)',
            answer: '<span class="key">A / B / C</span>'
        },
        duo: 'El primero resuelve → avanza y espera. El segundo recibe NUEVA ecuación, pierde puntos por segundo, debe acertar para reunirse. En MAESTRO: penalización más dura, menos tiempo.'
    }
];

// General help sections
const GENERAL_HELP = {
    controls: `
        <h3>CONTROLES BÁSICOS</h3>
        <ul>
            <li><span class="key">← →</span> / <span class="key">A D</span> — Mover izquierda/derecha</li>
            <li><span class="key">↑</span> / <span class="key">W</span> / <span class="key">Espacio</span> — Saltar</li>
            <li><span class="key">↓</span> / <span class="key">S</span> — Deslizar</li>
            <li><span class="key">K</span> — Dash (atravesar barreras, invencibilidad breve)</li>
            <li><span class="key">J</span> — Atacar / Interactuar (golpear al guardián)</li>
            <li><span class="key">L</span> — Poder: Escudo Σ (cuesta 1 energía, inmunidad 3s)</li>
            <li><span class="key">A / B / C</span> — Responder: Izquierda / Centro / Derecha</li>
            <li><span class="key">Enter</span> — Confirmar / Iniciar</li>
            <li><span class="key">Esc</span> — Pausar / Menú</li>
            <li><span class="key">M</span> — Silenciar/Activar audio</li>
        </ul>
        <p class="note">En DOS JUGADORES: P1 desliza con <span class="key">↓</span>, P2 con <span class="key">N</span>. P2 responde con <span class="key">U / I / O</span>.</p>
    `,
    difficulties: `
        <h3>DIFICULTADES</h3>
        <ul>
            <li><b>EXPLORADOR</b> — Velocidad reducida, ventanas amplias, matemática base, guía reforzada. Multiplicador: x1.0</li>
            <li><b>AVENTURERO</b> — Experiencia estándar, retos combinados. Multiplicador: x1.25</li>
            <li><b>MAESTRO</b> — Velocidad máxima, matemática avanzada, menos tiempo, más puntos. Multiplicador: x1.6</li>
        </ul>
    `,
    ucom: `
        <h3>MANDOS UCOM USB (2 JUGADORES)</h3>
        <ul>
            <li><b>Botón 4 (△/Y)</b> — Respuesta A / Confirmar en menús</li>
            <li><b>Botón 1 (×/A)</b> — Respuesta B</li>
            <li><b>Botón 2 (○/B)</b> — Respuesta C</li>
            <li><b>Botón 3 (□/X)</b> — Atacar / Acción (J)</li>
            <li><b>START</b> — Iniciar / Confirmar en menús / Pausar</li>
            <li><b>Palanca ↑</b> — Saltar</li>
            <li><b>Palanca ↓</b> — Deslizar (P1)</li>
            <li><b>Palanca ← →</b> — Mover</li>
            <li><b>Cruzeta</b> — Navegación menús (igual que palanca)</li>
        </ul>
        <p class="note">Calibra en AJUSTES → CONTROLES → CALIBRAR MANDO UCOM. Guarda por dispositivo.</p>
    `,
    duo: `
        <h3>MODO DOS JUGADORES (DUELO 2J)</h3>
        <ul>
            <li>Ambos exploradores reciben la <b>misma pregunta inicial</b>.</li>
            <li>El <b>primero en acertar</b> avanza físicamente, gana bonus de puntos y <b>espera</b> sin penalización.</li>
            <li>El <b>segundo</b> recibe una <b>NUEVA pregunta</b> (distinta), comienza a perder <b>50 puntos/segundo</b> y debe acertar para reunirse.</li>
            <li>Si el segundo falla, recibe <b>otra pregunta válida</b> hasta acertar.</li>
            <li>Al acertar, <b>deja de perder puntos</b> y se reúne con el primero.</li>
            <li>La <b>ventaja de puntuación se conserva</b> para el resultado final.</li>
            <li>El ganador se determina por <b>puntuación final total</b>, no por velocidad.</li>
        </ul>
        <div class="duo-note">
            <b>Clave:</b> Nadie depende del otro para responder o avanzar. Cada uno resuelve su propio desafío matemático.
        </div>
    `
};
// Premium Waterfall V2 is an isolated, reviewable production section. The
// inherited campaign labyrinth started at the same distance as the hydraulic
// bridge and placed tall walls across the camera boom. Keep the campaign
// content untouched, but do not layer it over this focused Level 1 candidate.
const EXPLORATION_ENABLED = PREMIUM_WATERFALL_V2_REQUESTED ? false : (LEVEL_RUNTIME?.explorationEnabled ?? true);
const ALTAR_ENABLED = PREMIUM_WATERFALL_V2_REQUESTED ? false : (LEVEL_RUNTIME?.altarEnabled ?? true);
const STALKER_ENABLED = PREMIUM_WATERFALL_V2_REQUESTED ? false : (LEVEL_RUNTIME?.stalkerEnabled ?? true);
const ENABLED_OBSTACLES = new Set(LEVEL_RUNTIME?.enabledObstacles || ['jump', 'slide', 'dash', 'jump2', 'slide2', 'dash2']);
const EXPLORATION_START = LEVEL_RUNTIME?.explorationStart ?? 55.15;
const EXPLORATION_END = LEVEL_RUNTIME?.explorationEnd ?? 79.7;
const EXPLORATION_LOOP = {
    near: EXPLORATION_START + 1.9, far: EXPLORATION_START + 5.3, forwardSeal: EXPLORATION_START + 6.57,
    outerLane: 4.15, corridorInnerEdge: 2.55
};
const EXPLORATION_RUNES = MAZE_DISTANCES.map((distance, index) => ({
    distance: distance - 1.35,
    lateral: MAZE_LANES[index] * 2.35
}));
const guardianDistance = LEVEL_RUNTIME?.guardianDistance ?? portalDistance - 13.5;
const guardianStopDistance = guardianDistance - 5.1;
const stalkerDistance = LEVEL_RUNTIME?.stalkerDistance ?? guardianStopDistance - 1.9;
const stalkerStopDistance = stalkerDistance - 2.75;
const mathGateStopDistance = LEVEL_RUNTIME?.mathGateStop ?? 47.35;
const mathGateResolveDistance = LEVEL_RUNTIME?.mathGateResolve ?? 54.2;
const PREMIUM_WATERFALL_V2_EXIT_DISTANCE = mathGateResolveDistance + 28;
const portalApproachStart = portalDistance - 18;
const portalData = createPortal(query.get('energy') !== '0');
placeAlong(portalData.group, portalDistance, 0, -.72);
scene.add(portalData.group);
registerCameraOccluders(portalData.group, 'PORTAL_FRAME');
const portalSample = sampleAtDistance(portalDistance);
const portalLight = new THREE.PointLight(0x4ae3df, query.get('energy') === '0' ? 0 : 11, 25, 1.8);
portalLight.position.copy(portalSample.point).addScaledVector(UP, 6.2);
scene.add(portalLight);

// The legacy candidate used sharp, randomly rotated icosahedra as scenery.
// Their silhouette read as arbitrary spike hazards and competed with the real
// route. The Matheo structural candidate replaces them with authored terrain
// masses inside buildMatheoStructuralWorld().
for (let index = 0; index < (MATHEO_WORLD_ENABLED || WATERFALL_PRODUCTION_ENABLED ? 0 : 36); index++) {
    const distance = -3 + (index % 18) * 4.35;
    const sample = sampleAtDistance(distance);
    const side = index < 12 ? -1 : 1;
    const radius = 1.15 + seeded(index + 5000) * 2.7;
    const rock = mesh(new THREE.IcosahedronGeometry(radius, 0), MATERIALS.STONE_DAMAGED);
    rock.position.copy(sample.point)
        .addScaledVector(sample.lateral, side * (10.2 + seeded(index + 5100) * 13.5))
        .addScaledVector(UP, -1.3 + seeded(index + 5200) * .45);
    rock.scale.set(1.1 + seeded(index + 5300) * 1.45, .9 + seeded(index + 5400) * 1.65, .8 + seeded(index + 5500) * 1.5);
    rock.rotation.set(seeded(index + 5600), seeded(index + 5700) * Math.PI, seeded(index + 5800) * .8);
    scene.add(rock);
}

// Bake all non-animated authored pieces into one mesh per material. The kit keeps
// its modular source construction while rendering like a production prop set.
scene.updateMatrixWorld(true);
const mergeTargets = new Map(Object.values(MATERIALS).map(material => [material, []]));
const animatedRoots = [portalData.orbitA, portalData.orbitB];
function beneath(object, root) {
    for (let parent = object; parent; parent = parent.parent) if (parent === root) return true;
    return false;
}
const mergeCandidates = [];
scene.traverse(object => {
    if (!object.isMesh || !mergeTargets.has(object.material)) return;
    if (animatedRoots.some(root => beneath(object, root))) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    mergeTargets.get(object.material).push(geometry.index ? geometry.toNonIndexed() : geometry);
    mergeCandidates.push(object);
});
for (const object of mergeCandidates) object.parent?.remove(object);
for (const [material, geometries] of mergeTargets) {
    if (!geometries.length) continue;
    const mergedGeometry = mergeGeometries(geometries, false);
    if (!mergedGeometry) throw new Error(`Unable to merge authored ${material.name || 'environment'} geometry`);
    const mergedMesh = new THREE.Mesh(mergedGeometry, material);
    mergedMesh.name = `BAKED_${material.name || 'ENVIRONMENT'}`;
    scene.add(mergedMesh);
    geometries.forEach(geometry => geometry.dispose());
}

function createProductionWorld() {
    if (!REBUILD_ENABLED || !LEVEL_RUNTIME) {
        return { update() {}, snapshot: () => ({ enabled: false, mechanismId: null, activation: 0 }) };
    }
    if (WATERFALL_PRODUCTION_ENABLED) {
        const asset = {
            root: null, wheel: null, bridges: [], gates: [], waterfalls: [], portalBacking: null, activation: 0,
            stage: 'DORMANT', cameraOccluders: [],
            meshes: 0, materials: new Set(), triangles: 0, waterMaterial: null
        };
        const worldAssetUrl = PREMIUM_V2_LEVEL_ONE
            ? artAssetUrl('premium-waterfall-v2/premium-waterfall-sanctuary-v2.glb')
            : PREMIUM_WATERFALL_REQUESTED
                ? artAssetUrl('premium-waterfall-v1/premium-waterfall-sanctuary-v1.glb')
                : artAssetUrl('production-v1/waterfall-sanctuary-production-v1.glb');
        new GLTFLoader().loadAsync(worldAssetUrl)
            .then(gltf => {
                asset.root = gltf.scene;
                asset.root.name = 'WATERFALL_SANCTUARY_PRODUCTION_GLTF';
                asset.wheel = asset.root.getObjectByName('MATH_WHEEL');
                asset.bridges = Array.from({ length: 5 }, (_, index) => asset.root.getObjectByName(`BRIDGE_SECTION_${index + 1}`)).filter(Boolean);
                asset.gates = ['A', 'B', 'C'].map(lane => asset.root.getObjectByName(`SLUICE_GATE_${lane}`)).filter(Boolean);
                asset.waterfalls = Array.from({ length: 3 }, (_, index) => asset.root.getObjectByName(`WATERFALL_${index + 1}`)).filter(Boolean);
                if (PREMIUM_V2_LEVEL_ONE) {
                    // This authored wall is the removable portal seal. Keeping
                    // it visible after the guardian is defeated made the exit
                    // look physically blocked and occluded the leap camera.
                    asset.portalBacking = asset.root.getObjectByName('Wall_UnevenBrick_Straight005');
                }
                asset.waterMaterial = new THREE.ShaderMaterial({
                    name: 'LIVING_WATER_RUNTIME', transparent: true, depthWrite: false,
                    side: THREE.DoubleSide, fog: false,
                    uniforms: {
                        uTime: { value: 0 },
                        uFlow: { value: PREMIUM_V2_LEVEL_ONE ? .34 : 1 },
                        uColorDeep: { value: new THREE.Color(0x075878) },
                        uColorFoam: { value: new THREE.Color(0x96fff4) }
                    },
                    vertexShader: `varying vec2 vUv; varying vec3 vWorld;
                        void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;
                        gl_Position=projectionMatrix*viewMatrix*world;}`,
                    fragmentShader: PREMIUM_V2_LEVEL_ONE
                        ? `varying vec2 vUv;varying vec3 vWorld;uniform float uTime;uniform float uFlow;uniform vec3 uColorDeep;uniform vec3 uColorFoam;
                            void main(){
                                float bank=smoothstep(0.0,.07,vUv.x)*smoothstep(0.0,.07,1.0-vUv.x);
                                float narrow=sin(vUv.x*94.0+sin(vUv.y*13.0)*2.2-uTime*1.8)*.5+.5;
                                float filament=sin(vUv.x*211.0-vUv.y*31.0+uTime*3.2)*.5+.5;
                                float descent=sin(vUv.y*126.0-uTime*(6.5+uFlow*3.0)+vUv.x*12.0)*.5+.5;
                                float breakup=smoothstep(.72,.98,narrow)*.32+smoothstep(.86,1.0,filament)*.24;
                                float impact=smoothstep(.72,1.0,1.0-vUv.y)*(sin(vUv.x*47.0+uTime*4.0)*.15+.38);
                                float foam=clamp(breakup+descent*.12+impact,0.0,1.0);
                                vec3 water=mix(uColorDeep,uColorFoam,foam);
                                gl_FragColor=vec4(water,(.34+foam*.42)*bank*(.72+uFlow*.28));
                            }`
                        : `varying vec2 vUv;varying vec3 vWorld;uniform float uTime;uniform float uFlow;uniform vec3 uColorDeep;uniform vec3 uColorFoam;
                            void main(){float current=sin(vUv.y*46.0-uTime*5.8+sin(vUv.x*17.0)*1.8);
                            float ripple=sin((vUv.x+vUv.y)*72.0+uTime*2.1)*.5+.5;
                            float foam=smoothstep(.48,.96,current)*.52+smoothstep(.78,1.0,ripple)*.12;
                            float edge=smoothstep(0.0,.1,vUv.x)*smoothstep(0.0,.1,1.0-vUv.x);
                            gl_FragColor=vec4(mix(uColorDeep,uColorFoam,foam),(.43+foam*.38)*edge);}`
                });
                asset.root.traverse(object => {
                    if (!object.isMesh) return;
                    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
                    if (sourceMaterials.some(material => material?.name === 'WATER_LIVING')) object.material = asset.waterMaterial;
                    else sourceMaterials.forEach(material => {
                        if (!material?.isMeshStandardMaterial) return;
                        if (/STONE|CLIFF/.test(material.name)) {
                            material.bumpMap = stoneTexture;
                            material.bumpScale = /CLIFF/.test(material.name) ? .22 : .1;
                        } else if (/MOSS|LEAF|FERN/.test(material.name)) {
                            material.map = groundTexture;
                            material.roughness = 1;
                        }
                        material.needsUpdate = true;
                    });
                    asset.meshes += 1;
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    materials.filter(Boolean).forEach(material => asset.materials.add(material));
                    const indexCount = object.geometry?.index?.count || 0;
                    const vertexCount = object.geometry?.attributes?.position?.count || 0;
                    asset.triangles += Math.floor((indexCount || vertexCount) / 3);
                    object.castShadow = false;
                    object.receiveShadow = true;
                    object.frustumCulled = true;
                });
                scene.add(asset.root);
                asset.root.updateMatrixWorld(true);
                if (PREMIUM_V2_LEVEL_ONE) {
                    const occluderPattern = /TRAIL_RUIN_WALL|AQUEDUCT_(PIER|ARCH)|SLUICE_FOUNDATION|WHEEL_BEARING_TOWER/;
                    asset.root.traverse(object => {
                        if (!object.name || !occluderPattern.test(object.name)) return;
                        const box = new THREE.Box3().setFromObject(object);
                        const size = box.getSize(new THREE.Vector3());
                        if (size.x > .5 && size.y > .7 && size.z > .5) {
                            asset.cameraOccluders.push({ name: `GLB:${object.name}`, box: box.expandByScalar(.12) });
                        }
                    });
                }
                productionReadiness.world = true;
            })
            .catch(error => {
                productionReadiness.worldError = error.message;
                productionReadiness.world = true;
                console.error('Waterfall production GLB failed to load', error);
            });
        return {
            update(delta, runner, game) {
                const target = runner?.mathResolved ? 1 : 0;
                asset.activation = THREE.MathUtils.damp(asset.activation, target, PREMIUM_V2_LEVEL_ONE ? 1.15 : 3.4, delta);
                if (!asset.root) return;
                if (asset.portalBacking) {
                    asset.portalBacking.visible = game?.guardianCombat?.phase !== 'DEFEATED';
                }
                asset.waterMaterial.uniforms.uTime.value = state.elapsed;
                const gateStage = THREE.MathUtils.smoothstep(asset.activation, .03, .25);
                const flowStage = THREE.MathUtils.smoothstep(asset.activation, .2, .48);
                const wheelStage = THREE.MathUtils.smoothstep(asset.activation, .36, .68);
                const bridgeStage = THREE.MathUtils.smoothstep(asset.activation, .52, .98);
                asset.stage = bridgeStage > .96 ? 'BRIDGE_RAISED' : wheelStage > .45 ? 'WHEEL_DRIVEN' :
                    flowStage > .35 ? 'WATER_REDIRECTED' : gateStage > .2 ? 'SLUICE_OPENING' : 'DORMANT';
                asset.waterMaterial.uniforms.uFlow.value = PREMIUM_V2_LEVEL_ONE ? .34 + flowStage * .66 : 1;
                if (asset.wheel) asset.wheel.rotation.z -= delta * (PREMIUM_V2_LEVEL_ONE ? wheelStage * 1.55 : .24 + asset.activation * 1.3);
                asset.bridges.forEach((bridge, index) => {
                    const local = PREMIUM_V2_LEVEL_ONE
                        ? THREE.MathUtils.smoothstep(bridgeStage, index * .08, .62 + index * .08)
                        : THREE.MathUtils.smoothstep(asset.activation, index * .09, .55 + index * .09);
                    bridge.position.y = THREE.MathUtils.lerp(bridge.userData.restY ??= bridge.position.y, bridge.userData.restY + 2.9, local);
                    bridge.rotation.x = THREE.MathUtils.lerp((index % 2 ? -.08 : .08) * (1 - local), 0, local);
                });
                asset.gates.forEach((gate, index) => {
                    const selected = runner?.mathResolved && index === (game?.routeChoice ?? 0) + 1;
                    const restY = gate.userData.restY ??= gate.position.y;
                    gate.position.y = THREE.MathUtils.damp(gate.position.y, restY + (selected ? 4.4 * gateStage : 0), 4.2, delta);
                });
                asset.waterfalls.forEach((fall, index) => {
                    fall.scale.x = 1 + Math.sin(state.elapsed * 1.4 + index) * .035;
                });
            },
            snapshot: () => ({
                enabled: true,
                mechanismId: LEVEL_RUNTIME.mechanismId,
                activation: Number(asset.activation.toFixed(3)),
                stage: asset.stage,
                topologyId: PREMIUM_V2_LEVEL_ONE
                    ? 'premium-curved-waterfall-supported-hydraulics-v2'
                    : PREMIUM_WATERFALL_REQUESTED
                        ? 'premium-sculpted-valley-aqueduct-waterwheel-v1'
                    : 'authored-waterfall-terrain-sluice-section-v1',
                assetReady: Boolean(asset.root),
                assetError: productionReadiness.worldError,
                sourceFormat: 'GLB_FROM_BLENDER_4_5_LTS',
                physicalBridgePieces: asset.bridges.length,
                physicalSluiceGates: asset.gates.length,
                structuralPieces: asset.meshes,
                assetTriangles: asset.triangles,
                assetMaterials: asset.materials.size,
                structuralReference: PREMIUM_V2_LEVEL_ONE
                    ? 'quaternius-cc0-plus-project-authored-curved-water-and-supported-mechanism'
                    : PREMIUM_WATERFALL_REQUESTED
                        ? 'quaternius-cc0-curated-real-gltf-environment'
                    : 'matheo-composition-principles-not-copied',
                worldRoot: asset.root?.name || null,
                cameraOccluders: asset.cameraOccluders.length
            }),
            cameraOccluders: () => asset.cameraOccluders
        };
    }
    const root = new THREE.Group();
    root.name = `PRODUCTION_WORLD_${LEVEL.number}`;
    const cyan = MATERIALS.CYAN_EMISSIVE.clone();
    cyan.emissiveIntensity = 1.7;
    const gold = MATERIALS.GOLD_AGED.clone();
    const dark = MATERIALS.STONE_DAMAGED.clone();
    const water = new THREE.MeshPhysicalMaterial({
        color: LEVEL_INDEX === 2 ? 0xff6b31 : 0x35d8e2,
        emissive: LEVEL_INDEX === 2 ? 0x7a1308 : 0x063e4b,
        emissiveIntensity: .8, transparent: true, opacity: .66,
        roughness: .2, metalness: .12, depthWrite: false
    });
    const animated = [];
    const activated = [false, false, false];
    const centerDistance = (EXPLORATION_START + EXPLORATION_END) * .5;
    const transformed = { bridges: [], mechanisms: [], waterfalls: [], clouds: [], pistons: [], flames: [] };
    let structuralPieces = 0;

    function placeInRoot(object, distance, lateral = 0, vertical = 0) {
        const sample = sampleAtDistance(distance);
        object.position.copy(sample.point).addScaledVector(sample.lateral, lateral).addScaledVector(UP, vertical);
        object.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        root.add(object);
        return { object, sample };
    }

    function buildMatheoStructuralWorld() {
        if (!MATHEO_WORLD_ENABLED) return;
        const dummy = new THREE.Object3D();
        const terrainColor = [0x39694f, 0x36446f, 0x542d2b][LEVEL_INDEX];
        const terrainTop = new THREE.MeshStandardMaterial({ color: terrainColor, roughness: .96, metalness: 0 });
        const terrainEdge = new THREE.MeshStandardMaterial({
            color: [0x273f38, 0x202947, 0x2a2024][LEVEL_INDEX], roughness: .92, metalness: LEVEL_INDEX === 2 ? .12 : 0
        });
        const podGeometry = new THREE.DodecahedronGeometry(1, 0);
        const podCount = LEVEL_INDEX === 0 ? 30 : 24;
        const pods = new THREE.InstancedMesh(podGeometry, terrainEdge, podCount);
        for (let index = 0; index < podCount; index++) {
            const side = index % 2 ? 1 : -1;
            const distance = 4 + Math.floor(index / 2) * (routeLength - 12) / Math.max(1, podCount / 2 - 1);
            const sample = sampleAtDistance(distance);
            dummy.position.copy(sample.point)
                .addScaledVector(sample.lateral, side * (7.2 + seeded(index + 12100) * 5.2))
                .addScaledVector(UP, -2.55 + seeded(index + 12200) * .7);
            dummy.rotation.set(seeded(index + 12300) * .16, Math.atan2(sample.tangent.x, sample.tangent.z) + seeded(index + 12400) * .7, 0);
            dummy.scale.set(4.8 + seeded(index + 12500) * 3.6, 1.8 + seeded(index + 12600) * 2.1, 4.5 + seeded(index + 12700) * 4.4);
            dummy.updateMatrix(); pods.setMatrixAt(index, dummy.matrix);
        }
        pods.instanceMatrix.needsUpdate = true; root.add(pods); structuralPieces += podCount;

        if (LEVEL_INDEX === 0) {
            const meadowGeometry = new THREE.CylinderGeometry(1, 1.12, .58, 10);
            const terraces = new THREE.InstancedMesh(meadowGeometry, terrainTop, 18);
            for (let index = 0; index < 18; index++) {
                const side = index % 2 ? 1 : -1;
                const distance = 9 + Math.floor(index / 2) * 20.2;
                const sample = sampleAtDistance(distance);
                dummy.position.copy(sample.point).addScaledVector(sample.lateral, side * (7.5 + (index % 3) * 1.8)).addScaledVector(UP, -.72);
                dummy.rotation.set(0, Math.atan2(sample.tangent.x, sample.tangent.z), 0);
                dummy.scale.set(3.8 + seeded(index + 13100) * 2.6, 1, 4.6 + seeded(index + 13200) * 3.2);
                dummy.updateMatrix(); terraces.setMatrixAt(index, dummy.matrix);
            }
            terraces.instanceMatrix.needsUpdate = true; root.add(terraces); structuralPieces += 18;
            for (const [distance, side] of [[31, -1], [74, 1], [116, -1], [151, 1]]) {
                const aqueduct = new THREE.Group();
                for (const lane of [-1, 0, 1]) {
                    aqueduct.add(
                        new THREE.Mesh(chamferedBox(.72, 5.4, 1.1, .12), dark),
                        new THREE.Mesh(new THREE.TorusGeometry(1.25, .18, 8, 24, Math.PI), gold)
                    );
                    aqueduct.children.at(-2).position.set(lane * 2.7, 1.9, 0);
                    aqueduct.children.at(-1).position.set(lane * 2.7, 3.95, 0);
                    aqueduct.children.at(-1).rotation.z = Math.PI;
                }
                aqueduct.add(new THREE.Mesh(chamferedBox(8.5, .5, 1.3, .1), terrainTop));
                aqueduct.children.at(-1).position.y = 5.0;
                const cascade = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 8.5), water);
                cascade.position.set(0, -3.25, .38);
                aqueduct.add(cascade);
                transformed.waterfalls.push({ object: cascade, baseOpacity: .58 });
                placeInRoot(aqueduct, distance, side * 8.45, -1.25); structuralPieces += 8;
            }
        } else if (LEVEL_INDEX === 1) {
            const terraceGeometry = new THREE.CylinderGeometry(1, 1.1, .5, 16);
            const terraces = new THREE.InstancedMesh(terraceGeometry, terrainTop, 16);
            const pylons = new THREE.InstancedMesh(chamferedBox(1, 1, 1, .08), terrainEdge, 16);
            for (let index = 0; index < 16; index++) {
                const side = index % 2 ? 1 : -1;
                const distance = 12 + Math.floor(index / 2) * 24;
                const sample = sampleAtDistance(distance);
                const lateral = side * (7.7 + (index % 4) * 1.35);
                dummy.position.copy(sample.point).addScaledVector(sample.lateral, lateral).addScaledVector(UP, -.85 + (index % 3) * .52);
                dummy.rotation.set(0, Math.atan2(sample.tangent.x, sample.tangent.z), 0);
                dummy.scale.set(4.2 + (index % 3), 1, 4.2 + ((index + 1) % 3)); dummy.updateMatrix(); terraces.setMatrixAt(index, dummy.matrix);
                dummy.position.addScaledVector(UP, -6.2); dummy.scale.set(1.7, 12, 1.7); dummy.updateMatrix(); pylons.setMatrixAt(index, dummy.matrix);
            }
            terraces.instanceMatrix.needsUpdate = pylons.instanceMatrix.needsUpdate = true;
            root.add(terraces, pylons); structuralPieces += 32;
            for (const [distance, side, scale] of [[27, -1, 1], [67, 1, 1.2], [108, -1, 1.38], [149, 1, 1.55]]) {
                const observatory = new THREE.Group();
                const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1 * scale, .22, 8, 40), gold);
                ring.position.y = 5.4 * scale; ring.rotation.x = Math.PI / 2;
                const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.72 * scale, 1), cyan); core.position.y = 5.4 * scale;
                observatory.add(
                    new THREE.Mesh(chamferedBox(5.2 * scale, .7, 5.2 * scale, .12), terrainTop),
                    new THREE.Mesh(chamferedBox(.72, 6.4 * scale, .72, .1), terrainEdge),
                    ring, core
                );
                placeInRoot(observatory, distance, side * 14.2, -1.2); transformed.mechanisms.push({ object: ring, type: 'orrery-ring', direction: side, index: 1 });
                structuralPieces += 4;
            }
        } else {
            const lavaMaterial = new THREE.MeshStandardMaterial({ color: 0xff6a25, emissive: 0xd52a08, emissiveIntensity: 2.1, roughness: .3 });
            for (const distance of [18, 51, 84, 117, 150, 181]) {
                const bridge = new THREE.Group();
                const deck = new THREE.Mesh(chamferedBox(8.8, .55, 5.8, .1), dark); deck.position.y = -.55;
                bridge.add(deck);
                for (const side of [-1, 1]) {
                    const pier = new THREE.Mesh(chamferedBox(1.0, 8.5, 1.25, .12), terrainEdge); pier.position.set(side * 3.8, -4.6, 0);
                    const brace = new THREE.Mesh(chamferedBox(.35, 7.2, .45, .06), gold); brace.position.set(side * 2.2, -3.6, 0); brace.rotation.z = side * .55;
                    bridge.add(pier, brace);
                }
                const magma = new THREE.Mesh(new THREE.PlaneGeometry(13, 11), lavaMaterial); magma.rotation.x = -Math.PI / 2; magma.position.y = -8.6;
                bridge.add(magma); placeInRoot(bridge, distance, 0, 0); structuralPieces += 6;
            }
            for (const [distance, side] of [[34, -1], [72, 1], [111, -1], [153, 1]]) {
                const foundry = new THREE.Group();
                foundry.add(
                    new THREE.Mesh(chamferedBox(7.2, .7, 5.2, .12), terrainTop),
                    new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.7, 7.8, 10), terrainEdge),
                    new THREE.Mesh(new THREE.TorusGeometry(2.05, .26, 8, 28), gold),
                    new THREE.Mesh(new THREE.CircleGeometry(1.35, 24), lavaMaterial)
                );
                foundry.children[1].position.y = 3.4;
                foundry.children[2].position.set(0, 3.6, 2.15);
                foundry.children[3].position.set(0, 3.6, 2.42);
                placeInRoot(foundry, distance, side * 10.7, -1.3); structuralPieces += 4;
            }
        }
    }

    function buildTransformationWorld() {
        if (!TRANSFORMED_WORLD_ENABLED) return;
        if (LEVEL_INDEX === 0) {
            const foliage = new THREE.MeshStandardMaterial({ color: 0x28705d, roughness: .94, metalness: 0 });
            const foliageLight = foliage.clone(); foliageLight.color.set(0x54a85e);
            const trunk = new THREE.MeshStandardMaterial({ color: 0x594632, roughness: 1 });
            for (let index = 0; index < 34; index++) {
                const distance = 3 + (index % 17) * 10.4;
                const side = index < 17 ? -1 : 1;
                const sample = sampleAtDistance(distance);
                const tree = new THREE.Group();
                tree.add(
                    new THREE.Mesh(new THREE.CylinderGeometry(.16, .28, 2.4, 6), trunk),
                    new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 + seeded(index + 41) * .55, 1), index % 3 ? foliage : foliageLight)
                );
                tree.children[0].position.y = .7;
                tree.children[1].position.y = 2.15;
                tree.position.copy(sample.point).addScaledVector(sample.lateral, side * (7.5 + seeded(index + 57) * 9)).addScaledVector(UP, -.65);
                tree.scale.setScalar(.75 + seeded(index + 73) * .65);
                root.add(tree);
            }
            for (const [distance, lateral, height, width] of [[18, -11, 15, 7], [44, 12, 20, 9], [91, -12, 13, 6], [138, 13, 18, 8]]) {
                const fall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), water);
                const { sample } = placeInRoot(fall, distance, lateral, height * .45);
                fall.lookAt(sample.point.clone().addScaledVector(sample.lateral, -lateral).addScaledVector(UP, height * .4));
                transformed.waterfalls.push({ object: fall, baseOpacity: .58 });
                const basin = new THREE.Mesh(new THREE.CircleGeometry(width * .7, 24), water);
                basin.rotation.x = -Math.PI / 2;
                placeInRoot(basin, distance + 2.5, lateral * .82, -.5);
            }
            const temple = new THREE.Group();
            for (let index = -2; index <= 2; index++) {
                const tower = new THREE.Mesh(chamferedBox(index === 0 ? 4.5 : 3, 13 + (2 - Math.abs(index)) * 2.5, 3.2, .16), dark);
                tower.position.set(index * 4.2, 5.8 + (2 - Math.abs(index)), Math.abs(index) * 1.2);
                const crown = new THREE.Mesh(new THREE.ConeGeometry(index === 0 ? 2.5 : 1.8, 3.2, 6), gold);
                crown.position.set(index * 4.2, 13.7 + (2 - Math.abs(index)) * 1.25, Math.abs(index) * 1.2);
                temple.add(tower, crown);
            }
            placeInRoot(temple, 160, -13, -1.1);
            const sluice = new THREE.Group();
            const wheel = new THREE.Mesh(new THREE.TorusGeometry(3.4, .28, 10, 36), gold);
            wheel.position.y = 4.1;
            for (let spoke = 0; spoke < 8; spoke++) {
                const bar = new THREE.Mesh(chamferedBox(.16, 6.4, .16, .02), gold);
                bar.position.y = 4.1; bar.rotation.z = spoke * Math.PI / 4; sluice.add(bar);
            }
            sluice.add(wheel);
            placeInRoot(sluice, mathGateStopDistance + 10, -8.5, -.4);
            transformed.mechanisms.push({ object: sluice, type: 'water-wheel' });
            for (let index = 0; index < 5; index++) {
                const slab = new THREE.Mesh(chamferedBox(7.6, .38, 3.1, .08), index % 2 ? gold : dark);
                placeInRoot(slab, mathGateResolveDistance + 1.8 + index * 3.15, 0, -2.3);
                transformed.bridges.push({ object: slab, baseY: slab.position.y, delay: index * .12, rise: 2.25 });
            }
        } else if (LEVEL_INDEX === 1) {
            const cloudMaterial = new THREE.SpriteMaterial({ map: softTexture, color: 0xe8f6ff, transparent: true, opacity: .42, depthWrite: false, fog: true });
            for (let index = 0; index < 18; index++) {
                const cloud = new THREE.Sprite(cloudMaterial.clone());
                const distance = 8 + (index % 9) * 21;
                const side = index < 9 ? -1 : 1;
                const sample = sampleAtDistance(distance);
                cloud.position.copy(sample.point).addScaledVector(sample.lateral, side * (12 + seeded(index + 5) * 13)).addScaledVector(UP, -5 + seeded(index + 17) * 6);
                cloud.scale.set(10 + seeded(index + 29) * 8, 4 + seeded(index + 31) * 4, 1);
                root.add(cloud); transformed.clouds.push({ object: cloud, baseX: cloud.position.x, phase: index * .7 });
            }
            for (const [distance, side, height] of [[22, -1, 18], [48, 1, 25], [83, -1, 30], [119, 1, 34], [154, -1, 38]]) {
                const tower = new THREE.Group();
                tower.add(
                    new THREE.Mesh(chamferedBox(4.4, height, 4.4, .18), dark),
                    new THREE.Mesh(new THREE.ConeGeometry(3.1, 5.5, 8), gold)
                );
                tower.children[0].position.y = height * .5 - 1;
                tower.children[1].position.y = height + 1.7;
                placeInRoot(tower, distance, side * 14.2, -6);
            }
            const orrery = new THREE.Group();
            for (let index = 0; index < 4; index++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8 + index * 1.2, .18, 8, 56), index === 1 ? cyan : gold);
                ring.rotation.set(index * .38, index * .31, index * .44);
                ring.position.y = 7.2;
                orrery.add(ring); transformed.mechanisms.push({ object: ring, type: 'orrery-ring', direction: index % 2 ? -1 : 1, index });
            }
            const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 2), cyan); core.position.y = 7.2; orrery.add(core);
            placeInRoot(orrery, mathGateResolveDistance + 10, -12.5, -1);
            for (let index = 0; index < 7; index++) {
                const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, .34, 24), index % 2 ? gold : dark);
                placeInRoot(disc, mathGateResolveDistance + index * 3.3, (index % 2 ? 1 : -1) * 1.25, -1.35);
                disc.rotation.z = (index % 2 ? 1 : -1) * .42;
                transformed.bridges.push({ object: disc, baseY: disc.position.y, delay: index * .08, celestial: true });
            }
        } else {
            const lava = new THREE.MeshPhysicalMaterial({ color: 0xff5a19, emissive: 0xff2500, emissiveIntensity: 2.2, roughness: .22, metalness: .08 });
            for (let index = 0; index < 9; index++) {
                const river = new THREE.Mesh(new THREE.PlaneGeometry(6 + seeded(index + 9) * 5, 18), lava);
                river.rotation.x = -Math.PI / 2;
                placeInRoot(river, 12 + index * 21, index % 2 ? 7.2 : -7.2, -.72);
                transformed.flames.push({ object: river, phase: index * .8 });
            }
            for (const [distance, side, height] of [[12, -1, 15], [37, 1, 20], [72, -1, 25], [108, 1, 28], [148, -1, 31]]) {
                const furnace = new THREE.Group();
                const body = new THREE.Mesh(chamferedBox(5.4, height, 5.4, .2), dark); body.position.y = height * .5 - 1;
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 2.5, 8), gold); crown.position.y = height;
                const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.15, 20), lava); mouth.position.set(0, 2.2, 2.72);
                furnace.add(body, crown, mouth); placeInRoot(furnace, distance, side * 14.4, -2.2);
            }
            const balance = new THREE.Group();
            const fulcrum = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.7, 4), gold); fulcrum.position.y = 1.7; fulcrum.rotation.y = Math.PI / 4;
            const beam = new THREE.Mesh(chamferedBox(11.5, .5, .85, .08), cyan); beam.position.y = 4.15; beam.rotation.z = .28;
            balance.add(fulcrum, beam);
            for (const side of [-1, 1]) {
                const weight = new THREE.Mesh(chamferedBox(2.3, 2, 1.8, .12), dark); weight.position.set(side * 4.6, side < 0 ? 1.6 : .5, 0); balance.add(weight);
            }
            placeInRoot(balance, mathGateResolveDistance + 10, -10.8, -.5);
            transformed.mechanisms.push({ object: beam, type: 'balance' });
            for (let index = 0; index < 6; index++) {
                const piston = new THREE.Mesh(new THREE.CylinderGeometry(.75, .95, 5.5, 10), index % 2 ? gold : dark);
                placeInRoot(piston, 98 + index * 6.2, (index % 2 ? 1 : -1) * 3.1, 1.2);
                transformed.pistons.push({ object: piston, baseY: piston.position.y, phase: index * .85 });
            }
            for (let index = 0; index < 5; index++) {
                const slab = new THREE.Mesh(chamferedBox(7.7, .42, 3.25, .08), index % 2 ? gold : dark);
                placeInRoot(slab, mathGateResolveDistance + 1 + index * 3.3, 0, -2.5);
                transformed.bridges.push({ object: slab, baseY: slab.position.y, delay: index * .1, rise: 2.35 });
            }
        }
    }

    buildTransformationWorld();
    buildMatheoStructuralWorld();

    const mathFrame = new THREE.Group();
    for (let lane = -1; lane <= 1; lane++) {
        const pillar = new THREE.Mesh(chamferedBox(1.05, 4.8, .8, .12), dark);
        pillar.position.set(lane * 2.4, 2.25, 0);
        const glyph = new THREE.Mesh(new THREE.TorusGeometry(.34, .075, 8, 20), lane === LEVEL.questions[0].correctLane ? cyan : gold);
        glyph.position.set(lane * 2.4, 2.55, -.46);
        mathFrame.add(pillar, glyph);
        animated.push({ object: glyph, axis: 'z', speed: lane === 0 ? 1.1 : -.82 });
    }
    placeAlong(mathFrame, mathGateStopDistance + 3.2, 0, -.35);
    if (!TRANSFORMED_WORLD_ENABLED) root.add(mathFrame);

    const mechanism = new THREE.Group();
    if (LEVEL_INDEX === 0) {
        for (let index = 0; index < 3; index++) {
            const x = (index - 1) * 2.5;
            const channel = new THREE.Mesh(chamferedBox(1.55, .22, 10.5, .04), index === 1 ? cyan : water);
            channel.position.set(x, .04, 0);
            const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.05, .14, 8, 24), gold);
            wheel.position.set(x, 1.3, -3.5 + index * 3.5);
            mechanism.add(channel, wheel);
            animated.push({ object: wheel, axis: 'z', speed: .65 + index * .15 });
        }
        for (const side of [-1, 1]) {
            const fall = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 11), water);
            fall.position.set(side * 8, 5, 1.5);
            fall.rotation.y = side * -.24;
            mechanism.add(fall);
        }
    } else if (LEVEL_INDEX === 1) {
        for (let index = 0; index < 3; index++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + index * .78, .13, 8, 40), index === 1 ? cyan : gold);
            ring.position.y = 4.1;
            ring.rotation.set(index * .42, index * .28, index * .34);
            mechanism.add(ring);
            animated.push({ object: ring, axis: index === 1 ? 'y' : 'z', speed: (index % 2 ? -1 : 1) * (.25 + index * .11) });
        }
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 1), cyan);
        core.position.y = 4.1;
        mechanism.add(core);
        animated.push({ object: core, axis: 'y', speed: .8 });
        for (let index = 0; index < 6; index++) {
            const plate = new THREE.Mesh(chamferedBox(2.05, .25, 2.2, .06), index % 2 ? dark : gold);
            plate.position.set((index % 2 ? 1 : -1) * 1.1, .05, -7 + index * 2.7);
            mechanism.add(plate);
        }
    } else {
        const fulcrum = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.6, 4), gold);
        fulcrum.position.y = 1.15;
        fulcrum.rotation.y = Math.PI / 4;
        const beam = new THREE.Mesh(chamferedBox(8.5, .34, .6, .08), cyan);
        beam.position.y = 2.65;
        mechanism.add(fulcrum, beam);
        animated.push({ object: beam, axis: 'z', speed: 0 });
        for (const side of [-1, 1]) {
            const chain = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.1, 8), gold);
            chain.position.set(side * 3.25, 1.65, 0);
            const weight = new THREE.Mesh(chamferedBox(1.5, 1.15, 1.2, .12), dark);
            weight.position.set(side * 3.25, .35, 0);
            mechanism.add(chain, weight);
        }
        for (let index = 0; index < 4; index++) {
            const piston = new THREE.Mesh(new THREE.CylinderGeometry(.48, .65, 4.2, 10), index % 2 ? gold : dark);
            piston.position.set((index - 1.5) * 2.15, 2.1, -6.2);
            mechanism.add(piston);
            animated.push({ object: piston, axis: 'y', speed: 1 + index * .18, piston: true, baseY: 2.1 });
        }
    }
    placeAlong(mechanism, centerDistance, 0, -.24);
    if (!TRANSFORMED_WORLD_ENABLED) root.add(mechanism);

    const landmark = new THREE.Group();
    for (const side of [-1, 1]) {
        const tower = new THREE.Mesh(chamferedBox(3.2, 12 + LEVEL_INDEX * 2, 3.2, .18), dark);
        tower.position.set(side * 11.4, 5.4 + LEVEL_INDEX, 0);
        const crown = new THREE.Mesh(new THREE.TorusGeometry(1.55, .18, 8, 24), gold);
        crown.position.set(side * 11.4, 11.5 + LEVEL_INDEX * 2, 0);
        landmark.add(tower, crown);
        animated.push({ object: crown, axis: 'y', speed: side * .18 });
    }
    placeAlong(landmark, guardianDistance - 8, 0, -.8);
    root.add(landmark);

    if (MATHEO_WORLD_ENABLED) {
        // Keep motion-bearing parts independent, but batch the new landscape and
        // architecture by material. This preserves the authored silhouettes while
        // recovering the frame budget required by the playable candidate.
        root.updateMatrixWorld(true);
        const movingRoots = new Set([
            ...animated.map(item => item.object),
            ...transformed.bridges.map(item => item.object),
            ...transformed.mechanisms.map(item => item.object),
            ...transformed.waterfalls.map(item => item.object),
            ...transformed.clouds.map(item => item.object),
            ...transformed.pistons.map(item => item.object),
            ...transformed.flames.map(item => item.object)
        ]);
        const isMoving = object => {
            for (let parent = object; parent && parent !== root; parent = parent.parent) {
                if (movingRoots.has(parent)) return true;
            }
            return movingRoots.has(object);
        };
        const staticByMaterial = new Map();
        root.traverse(object => {
            if (!object.isMesh || object.isInstancedMesh || isMoving(object)) return;
            if (!staticByMaterial.has(object.material)) staticByMaterial.set(object.material, []);
            staticByMaterial.get(object.material).push(object);
        });
        for (const [material, objects] of staticByMaterial) {
            if (objects.length < 2) continue;
            const geometries = objects.map(object => {
                const geometry = object.geometry.clone();
                geometry.applyMatrix4(object.matrixWorld);
                return geometry.index ? geometry.toNonIndexed() : geometry;
            });
            const mergedGeometry = mergeGeometries(geometries, false);
            if (!mergedGeometry) continue;
            objects.forEach(object => object.parent?.remove(object));
            geometries.forEach(geometry => geometry.dispose());
            const merged = new THREE.Mesh(mergedGeometry, material);
            merged.name = `MATHEO_BATCH_${material.name || 'STATIC'}`;
            merged.castShadow = true;
            merged.receiveShadow = true;
            root.add(merged);
        }
    }
    scene.add(root);

    let activation = 0;
    return {
        update(delta, runner, game) {
            const target = game?.exploration?.completed || runner?.mathResolved ? 1 : .22;
            activation = THREE.MathUtils.damp(activation, target, 3.2, delta);
            game?.exploration?.runes?.forEach((value, index) => { activated[index] ||= value; });
            animated.forEach((item, index) => {
                if (item.piston) {
                    item.object.position.y = item.baseY + Math.sin(state.elapsed * item.speed + index) * (.4 + activation * .55);
                } else if (item.speed) {
                    item.object.rotation[item.axis] += delta * item.speed * (.55 + activation);
                } else if (LEVEL_INDEX === 2) {
                    item.object.rotation.z = Math.sin(state.elapsed * .8) * .12 * (1 - activation);
                }
            });
            transformed.bridges.forEach((item, index) => {
                const local = THREE.MathUtils.smoothstep(activation, item.delay, Math.min(1, item.delay + .55));
                item.object.position.y = item.baseY + (item.rise || 1.2) * local;
                if (item.celestial) {
                    item.object.rotation.z = THREE.MathUtils.lerp((index % 2 ? 1 : -1) * .42, 0, local);
                    item.object.rotation.y += delta * (1 - local) * (index % 2 ? -.42 : .42);
                }
            });
            transformed.mechanisms.forEach((item, index) => {
                if (item.type === 'water-wheel') item.object.rotation.z -= delta * (.35 + activation * 1.25);
                else if (item.type === 'orrery-ring') {
                    item.object.rotation.z += delta * item.direction * (.18 + activation * .55 + item.index * .05);
                    item.object.rotation.y += delta * item.direction * .08;
                } else if (item.type === 'balance') item.object.rotation.z = THREE.MathUtils.damp(item.object.rotation.z, activation > .8 ? 0 : .28, 3.5, delta);
            });
            transformed.waterfalls.forEach((item, index) => {
                item.object.material.opacity = item.baseOpacity + Math.sin(state.elapsed * 2.2 + index) * .07;
                item.object.material.emissiveIntensity = .62 + activation * .42;
            });
            transformed.clouds.forEach((item, index) => {
                item.object.position.x = item.baseX + Math.sin(state.elapsed * .11 + item.phase) * (1.4 + index % 3);
            });
            transformed.pistons.forEach((item, index) => {
                item.object.position.y = item.baseY + Math.sin(state.elapsed * (1.75 + index * .06) + item.phase) * (1.1 + activation * .35);
            });
            transformed.flames.forEach((item, index) => {
                item.object.material.emissiveIntensity = 1.8 + Math.sin(state.elapsed * 3.1 + item.phase) * .5;
            });
            cyan.emissiveIntensity = 1.35 + activation * 1.25;
            water.opacity = .48 + activation * .25;
        },
        snapshot: () => ({
            enabled: true,
            mechanismId: LEVEL_RUNTIME.mechanismId,
            activation: Number(activation.toFixed(3)),
            activatedNodes: activated.filter(Boolean).length,
            topologyId: LEVEL_RUNTIME.topologyId || null,
            physicalBridgePieces: transformed.bridges.length,
            structuralPieces,
            structuralReference: MATHEO_WORLD_ENABLED ? 'matheo-observed-principles-v1' : null,
            worldRoot: root.name
        })
    };
}

const productionWorld = createProductionWorld();

const valleyTexture = INTEGRATED ? null : new THREE.TextureLoader().load('../thirdperson-camera/temple-valley-v1.png');
if (valleyTexture) valleyTexture.colorSpace = THREE.SRGBColorSpace;
const valleyPlate = new THREE.Mesh(new THREE.PlaneGeometry(182, 112), new THREE.MeshBasicMaterial({
    map: valleyTexture, color: LEVEL.backplate, transparent: true, opacity: .62, depthWrite: false, fog: true
}));
valleyPlate.position.set(6, 16, -118);
// The production game uses a real 3D horizon. This plate remains available only
// for the isolated art-kit comparison and is never the official gameplay vista.
valleyPlate.visible = !INTEGRATED && query.get('backplate') === '1';
valleyPlate.renderOrder = -10;
if (!WATERFALL_PRODUCTION_ENABLED) scene.add(valleyPlate);

const explorerTextureUrl = INTEGRATED && !location.pathname.includes('/spikes/mathquest-integrated-v1/')
    ? './assets/fair/player/run-up.png'
    : '../../assets/fair/player/run-up.png';
const explorerTexture = new THREE.TextureLoader().load(explorerTextureUrl);
explorerTexture.colorSpace = THREE.SRGBColorSpace;
explorerTexture.wrapS = THREE.RepeatWrapping;
explorerTexture.repeat.set(.25, 1);
const explorer = new THREE.Sprite(new THREE.SpriteMaterial({
    map: explorerTexture, transparent: true, alphaTest: .12, depthWrite: false, fog: true
}));
explorer.center.set(.5, .03);
explorer.scale.set(3.55, 3.55, 1);
explorer.renderOrder = 3;
scene.add(explorer);
const contactShadow = mesh(new THREE.CircleGeometry(.8, 24), new THREE.MeshBasicMaterial({
    color: 0x010406, alphaMap: softTexture, transparent: true, opacity: .62, depthWrite: false
}), [0, 0, 0], [-Math.PI / 2, 0, 0]);
contactShadow.renderOrder = 1;
scene.add(contactShadow);
const contactCore = mesh(new THREE.CircleGeometry(.42, 20), new THREE.MeshBasicMaterial({
    color: 0x000204, alphaMap: softTexture, transparent: true, opacity: .48, depthWrite: false
}), [0, 0, 0], [-Math.PI / 2, 0, 0]);
contactCore.renderOrder = 1;
contactCore.visible = INTEGRATED;
scene.add(contactCore);

const state = {
    distance: INTEGRATED ? portalDistance - 7 : 0.8,
    elapsed: 0,
    finished: false,
    paused: INTEGRATED || query.get('static') === '1' || query.has('shot'),
    shot: INTEGRATED ? 'portal' : query.get('shot') || null,
    backplate: valleyPlate.visible,
    energy: query.get('energy') !== '0'
};

const shots = {
    arch: { distance: .5, side: 2.8, back: 1.4, up: 3.1, lookDistance: 9.0, lookSide: 0, lookUp: 5.8 },
    column: { distance: 16.2, side: 15.5, back: 6.6, up: 5.6, lookDistance: 21.0, lookSide: 6.6, lookUp: 4.8 },
    bridge: { distance: 36.0, side: 15.2, back: 5.5, up: 7.4, lookDistance: 44.0, lookSide: 0, lookUp: .45 },
    portal: { distance: portalDistance - 8.8, side: 7.8, back: 2.0, up: 5.6, lookDistance: portalDistance, lookSide: 0, lookUp: 5.7 },
    overview: { distance: 25.0, side: 32.0, back: 13.0, up: 17.0, lookDistance: 30.0, lookSide: 0, lookUp: 3.1 }
};

function createIntegratedGame() {
    const screens = [...document.querySelectorAll('.screen')];
    const ui = {
        hud: document.querySelector('#hud'),
        lives: document.querySelector('#hud-lives'),
        combo: document.querySelector('#hud-combo'),
        campaign: document.querySelector('#hud-campaign'),
        score: document.querySelector('#hud-score'),
        players: document.querySelector('#hud-players'),
        energy: document.querySelector('#hud-energy'),
        tutorial: document.querySelector('#tutorial-prompt'),
        question: document.querySelector('#math-question'),
        duoMath: document.querySelector('#duo-math'),
        duoCards: [...document.querySelectorAll('[data-duo-player]')],
        toast: document.querySelector('#toast'),
        countdown: document.querySelector('#countdown-value'),
        flash: document.querySelector('#portal-flash'),
        difficultyChoices: [...document.querySelectorAll('#difficulty-screen .choice')],
        pauseChoices: [...document.querySelectorAll('[data-menu="pause"] .choice')],
        resultChoices: [...document.querySelectorAll('[data-menu="result"] .choice')],
        resultTime: document.querySelector('#result-time'),
        resultAccuracy: document.querySelector('#result-accuracy'),
        resultCombo: document.querySelector('#result-combo'),
        resultLives: document.querySelector('#result-lives'),
        resultScore: document.querySelector('#result-score'),
        resultRank: document.querySelector('#result-rank'),
        resultPlayers: document.querySelector('#result-players'),
        sessionModes: [...document.querySelectorAll('[data-session-mode]')],
        sessionForm: document.querySelector('#session-form'),
        playerOneName: document.querySelector('#player-one-name'),
        playerTwoName: document.querySelector('#player-two-name'),
        playerTwoField: document.querySelector('#player-two-field'),
        intro: document.querySelector('#intro-screen'),
        energyPanel: document.querySelector('.energy'),
        audioToggle: document.querySelector('#audio-toggle'),
        touchControls: document.querySelector('#touch-controls'),
        touchButtons: [...document.querySelectorAll('[data-touch-code]')],
        touchPause: document.querySelector('[data-touch-command="pause"]'),
        // New screens
        menuOptions: [...document.querySelectorAll('[data-menu-action]')],
        leaderboardList: document.querySelector('#leaderboard-list'),
        leaderboardTabs: [...document.querySelectorAll('.leaderboard-tab')],
        historyList: document.querySelector('#history-list'),
        settingsAudioEnabled: document.querySelector('#setting-audio-enabled'),
        settingsMusicEnabled: document.querySelector('#setting-music-enabled'),
        settingsSfxEnabled: document.querySelector('#setting-sfx-enabled'),
        settingsGraphicsQuality: document.querySelector('#setting-graphics-quality'),
        settingsShadows: document.querySelector('#setting-shadows'),
        settingsParticles: document.querySelector('#setting-particles'),
        settingsVibration: document.querySelector('#setting-vibration'),
        settingsSensitivity: document.querySelector('#setting-sensitivity'),
        settingsTestGamepad: document.querySelector('#setting-test-gamepad'),
        gamepadIndicator: document.querySelector('.gamepad-indicator'),
        helpScreen: document.querySelector('#help-screen'),
        helpTitle: document.querySelector('#help-title'),
        helpContent: document.querySelector('#help-content'),
        levelIntroScreen: document.querySelector('#level-intro-screen'),
        levelIntroChapter: document.querySelector('#level-intro-chapter'),
        levelIntroTitle: document.querySelector('#level-intro-title'),
        levelIntroObjective: document.querySelector('#level-intro-objective'),
        levelIntroControls: document.querySelector('#level-intro-controls')
    };
    const touchEnabled = query.get('touch') === '1' || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch-enabled', touchEnabled);
    const chapterLabel = document.querySelector('#menu-screen .candidate-label');
    const introLevel = document.querySelector('#intro-screen .eyebrow');
    const introTitle = document.querySelector('#intro-screen h2');
    const introObjective = document.querySelector('#intro-screen .objective b');
    const mathQuestionValue = document.querySelector('#math-question b');
    const resultTitle = document.querySelector('#result-screen h2');
    const resultPrimary = document.querySelector('[data-menu="result"] .choice:first-child b');
    document.title = `MathQuest 3.0 — ${LEVEL.name}`;
    chapterLabel.textContent = `${LEVEL.chapter} · ${LEVEL.name}`;
    introLevel.textContent = `NIVEL ${LEVEL.number} DE ${LEVELS.length}`;
    introTitle.textContent = LEVEL.name;
    introObjective.textContent = LEVEL.objective;
    resultTitle.textContent = LEVEL_INDEX < LEVELS.length - 1 ? 'PORTAL DESBLOQUEADO' : 'EXPEDICIÓN COMPLETADA';
    resultPrimary.textContent = LEVEL_INDEX < LEVELS.length - 1 ? 'SIGUIENTE NIVEL' : 'NUEVA CAMPAÑA';
    
    // Level intro screen content
    ui.levelIntroChapter.textContent = `${LEVEL.chapter}`;
    ui.levelIntroTitle.textContent = LEVEL.name;
    ui.levelIntroObjective.textContent = LEVEL.objective;
    ui.levelIntroControls.innerHTML = `
        <div class="control-item"><b>← → / A D</b><span>Mover</span></div>
        <div class="control-item"><b>↑ / W / Espacio</b><span>Saltar</span></div>
        <div class="control-item"><b>↓ / S</b><span>Deslizar</span></div>
        <div class="control-item"><b>K</b><span>Dash</span></div>
        <div class="control-item"><b>J</b><span>Atacar</span></div>
        <div class="control-item"><b>L</b><span>Poder (Escudo Σ)</span></div>
        <div class="control-item"><b>A / B / C</b><span>Responder</span></div>
    `;
    
    const screenIds = {
        MENU: 'menu-screen', SESSION: 'session-screen', DIFFICULTY: 'difficulty-screen', CONTROLS: 'controls-screen',
        LEADERBOARD: 'leaderboard-screen', HISTORY: 'history-screen', SETTINGS: 'settings-screen',
        INTRO: 'intro-screen', COUNTDOWN: 'countdown-screen', PAUSED: 'pause-screen', RESULT: 'result-screen',
        HELP: 'help-screen', LEVEL_INTRO: 'level-intro-screen'
    };
    const ACTIONS = Object.freeze(Object.fromEntries(ACTIVE_CAMPAIGN_ADAPTER.actions.map(action => [action, action])));
    const profiles = ACTIVE_CAMPAIGN_ADAPTER.difficultyProfiles;
    const initialDifficulty = THREE.MathUtils.clamp(Number.parseInt(query.get('difficulty') || '1', 10), 0, profiles.length - 1);
    const session = {
        mode: INITIAL_SESSION_MODE,
        activeIndex: THREE.MathUtils.clamp(nonNegativeInt(query.get('activePlayer')), 0, INITIAL_SESSION_MODE === 'solo' ? 0 : 1),
        players: [
            {
                name: safePlayerName(query.get('p1'), 'EXPLORADOR 1'),
                score: nonNegativeInt(query.get('p1Score')),
                answers: nonNegativeInt(query.get('p1Answers')),
                correct: nonNegativeInt(query.get('p1Correct')),
                responseMs: nonNegativeInt(query.get('p1ResponseMs')),
                challengeWins: nonNegativeInt(query.get('p1Wins'))
            },
            {
                name: safePlayerName(query.get('p2'), 'EXPLORADOR 2'),
                score: nonNegativeInt(query.get('p2Score')),
                answers: nonNegativeInt(query.get('p2Answers')),
                correct: nonNegativeInt(query.get('p2Correct')),
                responseMs: nonNegativeInt(query.get('p2ResponseMs')),
                challengeWins: nonNegativeInt(query.get('p2Wins'))
            }
        ]
    };
    session.levelStart = session.players.map(player => ({ ...player }));
    session.levelStartActive = session.activeIndex;
    const duoRace = {
        context: null,
        order: [],
        rejoin: null,
        penaltyTimer: 0,
        penaltyActive: false,
        penaltyRate: 50, // points per second
        players: [0, 1].map(() => ({
            status: 'READY', problem: null, startedAt: 0, responseMs: 0,
            wrongFlash: 0, visualLead: 0,
            slideAnticipation: 0, slideTimer: 0,
            wrongCount: 0
        }))
    };
    const game = {
        phase: 'MENU', phaseTimer: 0, difficulty: initialDifficulty, selection: initialDifficulty, menuSelection: 0,
        pausedFrom: 'PLAYING', keys: new Set(), actions: new Set(), actionByCode: new Map(), lastCountdown: 4, toastTimer: 0,
        routeChoice: null, audioReady: false, tutorialMessage: null, questionVisible: null,
        routeGateActive: false, routeGateCommitted: false, routeGateSelectedLane: null,
        routeGateTimer: 0, routeGateFeedback: null, routeGateAttempts: 0,
        masteryActive: null,
        mastery: [],
        premiumSectionComplete: false,
        altarActive: false, altarResolved: !ALTAR_ENABLED, altarFeedback: null,
        altarTimer: 0, altarAttempts: 0,
        guardianActive: false, guardianResolved: false, guardianFeedback: null,
        guardianTimer: 0, guardianAttempts: 0,
        guardianCombat: {
            active: false, phase: 'LOCKED', timer: 0, health: 0, maxHealth: 0,
            strikes: 0, hits: 0, dodges: 0, damageTaken: 0,
            contactResolved: false, recoveryHit: false
        },
        stalker: {
            active: false, resolved: !STALKER_ENABLED, phase: STALKER_ENABLED ? 'DORMANT' : 'DEFEATED', timer: 0,
            health: 0, maxHealth: 0, charges: 0, hits: 0, dodges: 0, damageTaken: 0,
            contactResolved: false, recoveryHit: false
        },
        maze: { gates: [false, false, false], retries: 0 },
        exploration: {
            enabled: EXPLORATION_ENABLED, active: false, completed: false, entered: false,
            runes: [false, false, false], blockedExits: 0,
            loop: {
                branch: 0, phase: 'CHOOSE', completed: false,
                blockedAttempts: 0, checkpoints: [false, false, false, false]
            }
        },
        resultCount: 0, resultTarget: 0, portalRiseTimer: 0, levelStarted: false,
        cameraArm: 6.45, cameraObstruction: null, fadedOccluders: [], cameraTeleports: 0
    };
    const playtest = {
        enabled: query.get('playtest') === '1', version: 1, startedAt: Date.now(), events: [],
        firstGameplayActionAt: null, lastGameplayActionAt: null, initialHesitationRecorded: false,
        questionShownAt: null, questionContext: null, questionHesitationRecorded: false,
        navigationHesitationZones: new Set(), navigationPhase: null, navigationPhaseStartedAt: 0, saved: false
    };
    const runner = {
        state: 'DISABLED', lateral: 0, lateralVelocity: 0, forwardVelocity: 0, targetLateral: null,
        jumpY: 0, verticalVelocity: 0, jumpAnticipation: 0, slideAnticipation: 0,
        slideTimer: 0, dashTimer: 0, dashCooldown: 0, dashFlashTimer: 0,
        hitTimer: 0, landingTimer: 0, attackTimer: 0, attackImpactTimer: 0,
        shieldTimer: 0, powerActivationTimer: 0, stepTimer: 0, bodyLean: 0,
        mathFeedbackTimer: 0, mathFeedbackLane: 0, mathFeedbackCorrect: true,
        gameplayTime: 0, lives: 3, score: CAMPAIGN_MODE ? CAMPAIGN_SCORE : 1250, combo: 1, maxCombo: 1, energy: 0,
        questions: 0, correct: 0, mathResolved: false, lastDistance: 1.2,
        obstacles: { jump: false, slide: false, dash: false, jump2: false, slide2: false, dash2: false },
        tutorial: { move: false, jump: false, slide: false, dash: false }
    };
    const masteryDistances = [
        THREE.MathUtils.lerp(mathGateResolveDistance + 8, altarStopDistance - 8, .48),
        THREE.MathUtils.lerp(altarDistance + 10, guardianStopDistance - 7, .55)
    ];
    function createMasteryMechanism(distance, index) {
        const sample = sampleAtDistance(distance);
        const root = new THREE.Group();
        root.name = `MASTERY_PRESSURE_MECHANISM_${index + 1}`;
        root.position.copy(sample.point);
        root.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        const plate = mesh(new THREE.CylinderGeometry(1.05, 1.18, .16, 24), MATERIALS.GOLD_AGED.clone(), [0, .06, 2.15]);
        const plateRune = mesh(new THREE.TorusGeometry(.62, .07, 8, 24), MATERIALS.CYAN_EMISSIVE.clone(), [0, .16, 2.15], [-Math.PI / 2, 0, 0]);
        const leftBase = stoneBlock(.72, 2.45, .9, [-3.35, 1.15, 0], MATERIALS.STONE_DAMAGED, .12);
        const rightBase = stoneBlock(.72, 2.45, .9, [3.35, 1.15, 0], MATERIALS.STONE_DAMAGED, .12);
        const axle = mesh(new THREE.CylinderGeometry(.18, .18, 6.05, 12), MATERIALS.GOLD_AGED.clone(), [0, 2.1, 0], [0, 0, Math.PI / 2]);
        const gate = new THREE.Group(); gate.name = `MASTERY_RETRACTING_SEAL_${index + 1}`;
        // The group origin is the left hinge; the beam's center therefore sits
        // half a span to the right so the closed collision/readability volume
        // actually covers the whole route and retracts around a real axle.
        const beam = stoneBlock(5.75, .52, .58, [2.9, 0, 0], MATERIALS.STONE_PRIMARY, .14);
        const glyph = mesh(new THREE.TorusKnotGeometry(.27, .055, 40, 7), MATERIALS.CYAN_EMISSIVE.clone(), [2.9, .02, .33]);
        gate.position.set(-2.9, 1.98, 0); gate.add(beam, glyph);
        root.add(plate, plateRune, leftBase, rightBase, axle, gate);
        scene.add(root);
        return { index, distance, stopDistance: distance - 2.15, root, gate, plate, plateRune, resolved: false, active: false, attempts: 0, open: 0 };
    }
    game.mastery = masteryDistances.map(createMasteryMechanism);

    const audio = {
        context: null,
        master: null,
        compressor: null,
        activeVoices: 0,
        maxVoices: 12,
        muted: localStorage.getItem('mathquest-muted') === '1',
        ensure() {
            if (!this.context) {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
                this.master = this.context.createGain();
                this.compressor = this.context.createDynamicsCompressor();
                this.compressor.threshold.value = -18;
                this.compressor.knee.value = 14;
                this.compressor.ratio.value = 5;
                this.compressor.attack.value = .008;
                this.compressor.release.value = .18;
                this.compressor.connect(this.master).connect(this.context.destination);
                this.master.gain.value = this.muted ? 0 : .82;
            }
            if (this.context.state === 'suspended') this.context.resume();
            game.audioReady = true;
        },
        setMuted(muted) {
            this.muted = muted;
            localStorage.setItem('mathquest-muted', muted ? '1' : '0');
            if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : .82, this.context.currentTime, .018);
            ui.audioToggle?.classList.toggle('is-muted', muted);
            ui.audioToggle?.setAttribute('aria-pressed', String(muted));
            ui.audioToggle?.setAttribute('aria-label', muted ? 'Activar audio' : 'Silenciar audio');
            if (ui.audioToggle) ui.audioToggle.querySelector('b').textContent = muted ? '×' : '♪';
        },
        toggleMuted() { this.ensure(); this.setMuted(!this.muted); },
        tone(frequency, duration = .1, type = 'sine', volume = .035, glide = 0, delay = 0) {
            if (!this.context || this.context.state !== 'running' || this.activeVoices >= this.maxVoices) return;
            const now = this.context.currentTime + delay;
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            this.activeVoices++;
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);
            if (glide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + glide), now + duration);
            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume, now + .012);
            gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
            oscillator.connect(gain).connect(this.compressor);
            oscillator.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); oscillator.disconnect(); gain.disconnect(); };
            oscillator.start(now); oscillator.stop(now + duration + .02);
        },
        noise(duration = .1, volume = .015, highpass = 120, delay = 0) {
            if (!this.context || this.context.state !== 'running' || this.activeVoices >= this.maxVoices) return;
            const frames = Math.ceil(this.context.sampleRate * duration);
            const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            for (let index = 0; index < frames; index++) data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
            const source = this.context.createBufferSource();
            const filter = this.context.createBiquadFilter();
            const gain = this.context.createGain();
            const now = this.context.currentTime + delay;
            this.activeVoices++;
            source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = highpass;
            gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
            source.connect(filter).connect(gain).connect(this.compressor);
            source.onended = () => { this.activeVoices = Math.max(0, this.activeVoices - 1); source.disconnect(); filter.disconnect(); gain.disconnect(); };
            source.start(now); source.stop(now + duration);
        },
        cue(name) {
            const cue = (...spec) => this.tone(...spec);
            if (name === 'start') { cue(220, .28, 'triangle', .028, 440); cue(440, .3, 'sine', .018, 440, .1); }
            else if (name === 'confirm') { cue(480, .08, 'sine', .025, 150); cue(720, .07, 'triangle', .014, 80, .055); }
            else if (name === 'count') cue(420, .08, 'square', .018, 0);
            else if (name === 'go') { cue(520, .22, 'triangle', .032, 420); cue(780, .18, 'sine', .018, 280, .08); }
            else if (name === 'foot') { cue(92, .045, 'triangle', .009, -14); this.noise(.045, .006, 240); }
            else if (name === 'jump') { cue(210, .16, 'triangle', .025, 270); this.noise(.07, .007, 520); }
            else if (name === 'land') { cue(78, .17, 'sine', .035, -22); this.noise(.13, .015, 150); }
            else if (name === 'slide') { cue(145, .24, 'sawtooth', .014, -72); this.noise(.21, .012, 680); }
            else if (name === 'dash') { this.noise(.2, .018, 420); cue(165, .24, 'sawtooth', .025, 760); cue(420, .16, 'triangle', .012, 520, .06); }
            else if (name === 'attack') { cue(245, .1, 'square', .018, 390); this.noise(.1, .014, 760, .035); cue(92, .13, 'sine', .02, -18, .055); }
            else if (name === 'power') { cue(180, .38, 'sine', .025, 420); cue(360, .34, 'triangle', .018, 520, .08); }
            else if (name === 'correct') { cue(440, .16, 'triangle', .024, 80); cue(554, .16, 'triangle', .022, 80, .1); cue(659, .24, 'sine', .025, 180, .2); }
            else if (name === 'wrong') { cue(220, .18, 'sawtooth', .018, -70); cue(145, .22, 'triangle', .022, -45, .12); }
            else if (name === 'portal') { cue(92, .95, 'sine', .03, 90); cue(220, .9, 'triangle', .018, 660, .12); this.noise(.7, .009, 900, .18); }
            else if (name === 'result') { cue(330, .32, 'triangle', .022, 180); cue(494, .38, 'triangle', .023, 220, .16); cue(659, .48, 'sine', .026, 260, .32); }
        },
        dispose() { this.context?.close(); this.context = null; this.master = null; this.compressor = null; this.activeVoices = 0; }
    };
    audio.setMuted(audio.muted);

    const course = new THREE.Group();
    course.name = 'INTEGRATED_COURSE';
    scene.add(course);
    const labelTextures = [];
    const mathLabelRenderer = new MathLabelRenderer();
    function placeCourse(object, distance, lateral = 0, vertical = 0) {
        const sample = sampleAtDistance(distance);
        object.position.copy(sample.point).addScaledVector(sample.lateral, lateral).addScaledVector(UP, vertical);
        object.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        course.add(object);
        return object;
    }
    function mergeStaticChildrenByMaterial(root) {
        root.updateMatrixWorld(true);
        const byMaterial = new Map();
        for (const child of [...root.children]) {
            if (!child.isMesh) continue;
            if (!byMaterial.has(child.material)) byMaterial.set(child.material, []);
            byMaterial.get(child.material).push(child);
        }
        for (const [material, children] of byMaterial) {
            if (children.length < 2) continue;
            const geometries = children.map(child => {
                child.updateMatrix();
                const geometry = child.geometry.clone();
                geometry.applyMatrix4(child.matrix);
                return geometry.index ? geometry.toNonIndexed() : geometry;
            });
            const mergedGeometry = mergeGeometries(geometries, false);
            if (!mergedGeometry) continue;
            children.forEach(child => { root.remove(child); child.geometry.dispose(); });
            geometries.forEach(geometry => geometry.dispose());
            root.add(new THREE.Mesh(mergedGeometry, material));
        }
    }

    const themedMaterials = [];
    function themedMaterial(options) {
        const material = new THREE.MeshStandardMaterial(options);
        themedMaterials.push(material);
        return material;
    }
    const livingWorld = {
        waterfallMaterials: [], rotors: [], floatingCrystals: [], pulseMaterials: [],
        labyrinthDynamics: [],
        motes: null, moteBaseY: null, motePhases: null, terrain: null
    };
    function addLevelLandmarks() {
        if (LEVEL.number === 1) {
            const water = new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, side: THREE.DoubleSide,
                uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x66fff2) } },
                vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
                fragmentShader: `varying vec2 vUv;uniform float uTime;uniform vec3 uColor;
                    void main(){float flow=sin(vUv.y*54.0-uTime*7.0+sin(vUv.x*15.0)*1.8);
                    float foam=smoothstep(.25,.92,flow)*.34+pow(1.0-vUv.y,3.0)*.28;
                    float edge=smoothstep(0.0,.16,vUv.x)*smoothstep(0.0,.16,1.0-vUv.x);
                    gl_FragColor=vec4(uColor*(.48+foam),(.3+foam)*edge);}`
            });
            livingWorld.waterfallMaterials.push(water);
            for (const [distance, side, height, width] of [[31, -1, 8.5, 3.2], [69, 1, 11, 4.2], [82, -1, 7.5, 2.8]]) {
                const falls = new THREE.Group();
                falls.add(
                    stoneBlock(width + 3.2, height + 2, 3.8, [side * 1.8, height * .32, .7], MATERIALS.STONE_DAMAGED, .2),
                    mesh(new THREE.PlaneGeometry(width, height), water, [0, height * .42, -1.28]),
                    stoneBlock(width + 1.3, .35, 2.6, [0, -.25, -.7], MATERIALS.STONE_PRIMARY, .08)
                );
                placeCourse(falls, distance, side * 8.4, -.65);
                falls.rotation.y += side * .12;
            }
        } else if (LEVEL.number === 2) {
            for (const [distance, side, scaleValue] of [[10, -5.7, 1], [31, 5.8, 1.18], [44, -5.6, .9]]) {
                const observatory = new THREE.Group();
                const outer = mesh(new THREE.TorusGeometry(1.45 * scaleValue, .1, 8, 28), MATERIALS.GOLD_AGED, [0, 2.2, 0]);
                const inner = mesh(new THREE.TorusGeometry(.9 * scaleValue, .055, 6, 24), MATERIALS.CYAN_EMISSIVE, [0, 2.2, .08]);
                inner.rotation.z = .58;
                livingWorld.rotors.push(outer, inner);
                observatory.add(
                    stoneBlock(.55, 2.7, .75, [0, .9, 0], MATERIALS.STONE_DAMAGED, .08),
                    outer, inner,
                    mesh(new THREE.IcosahedronGeometry(.24, 1), MATERIALS.CYAN_EMISSIVE, [0, 2.2, .12])
                );
                livingWorld.floatingCrystals.push(observatory.children.at(-1));
                placeCourse(observatory, distance, side, -.15);
            }
            for (const [distance, side, height] of [[61, -1, 7.2], [74, 1, 9.4], [89, -1, 8.1]]) {
                const summit = new THREE.Group();
                const peak = mesh(new THREE.ConeGeometry(3.5, height, 6), MATERIALS.STONE_DAMAGED, [0, height * .44, 0]);
                peak.rotation.y = .35;
                summit.add(peak, mesh(new THREE.OctahedronGeometry(.42, 0), MATERIALS.CYAN_EMISSIVE, [0, height + .35, 0]));
                placeCourse(summit, distance, side * 9.8, -1.2);
            }
        } else if (LEVEL.number === 3) {
            for (const [distance, side] of [[9, -5.1], [22, 5.2], [33, -5.15], [45, 5.0]]) {
                const reactor = new THREE.Group();
                reactor.add(
                    stoneBlock(1.15, 3.2, 1.1, [0, 1.15, 0], MATERIALS.STONE_DAMAGED, .12),
                    stoneBlock(.16, 2.3, .08, [-.38, 1.3, .58], MATERIALS.CYAN_EMISSIVE, .02),
                    stoneBlock(.16, 2.3, .08, [.38, 1.3, .58], MATERIALS.CYAN_EMISSIVE, .02),
                    stoneBlock(1.38, .22, 1.28, [0, 2.88, 0], MATERIALS.GOLD_AGED, .04),
                    mesh(new THREE.OctahedronGeometry(.28, 0), MATERIALS.CYAN_EMISSIVE, [0, 3.38, .04])
                );
                placeCourse(reactor, distance, side, -.2);
            }
            const lava = themedMaterial({
                color: 0xf26d38, emissive: 0x9d1e08, emissiveIntensity: 1.7,
                roughness: .32, metalness: .05
            });
            livingWorld.pulseMaterials.push(lava);
            for (const [distance, side, height] of [[60, -1, 6.5], [72, 1, 9], [88, -1, 7.5]]) {
                const volcano = new THREE.Group();
                const cone = mesh(new THREE.ConeGeometry(4.2, height, 7, 1, true), MATERIALS.STONE_DAMAGED, [0, height * .42, 0]);
                cone.rotation.y = .24;
                volcano.add(cone,
                    mesh(new THREE.CylinderGeometry(1.25, 1.7, .22, 14), lava, [0, height * .84, 0]),
                    stoneBlock(.22, height * .7, .12, [0, height * .32, 2.05], lava, .02)
                );
                placeCourse(volcano, distance, side * 9.4, -1.25);
            }
        }
    }
    if (!WATERFALL_PRODUCTION_ENABLED) addLevelLandmarks();
    function addLivingWorld() {
        const palette = LEVEL.theme === 'volcano'
            ? { terrain: 0x2d1723, emissive: 0x3b0906, mote: 0xff6a32, ruin: 0x4b2830 }
            : LEVEL.theme === 'mountain'
                ? { terrain: 0x253657, emissive: 0x071631, mote: 0x8ddcff, ruin: 0x354b70 }
                : { terrain: 0x17444b, emissive: 0x06272d, mote: 0x69fff0, ruin: 0x285b5d };
        const terrainMaterial = themedMaterial({
            color: palette.terrain, emissive: palette.emissive, emissiveIntensity: .32,
            roughness: 1, metalness: 0, flatShading: true
        });
        const ruinMaterial = themedMaterial({
            color: palette.ruin, emissive: palette.emissive, emissiveIntensity: .18,
            roughness: .96, metalness: .02, flatShading: true
        });
        const peakGeometry = new THREE.ConeGeometry(1, 1, 7, 2);
        const peaks = new THREE.InstancedMesh(peakGeometry, terrainMaterial, 28);
        peaks.name = `LIVING_${LEVEL.theme.toUpperCase()}_RELIEF`;
        const vistaMatrix = new THREE.Matrix4();
        const vistaQuaternion = new THREE.Quaternion();
        const vistaScale = new THREE.Vector3();
        for (let index = 0; index < 28; index++) {
            const distance = 8 + (index % 14) * 9.35;
            const side = index < 14 ? -1 : 1;
            const sample = sampleAtDistance(distance);
            const height = 8 + seeded(index + LEVEL.number * 31) * 15;
            const width = 4.8 + seeded(index + 77) * 5.8;
            const position = sample.point.clone()
                .addScaledVector(sample.lateral, side * (15 + seeded(index + 17) * 12))
                .addScaledVector(UP, height * .43 - 3.2);
            vistaQuaternion.setFromAxisAngle(UP, seeded(index + 9) * Math.PI);
            vistaScale.set(width, height, width * (.72 + seeded(index + 3) * .35));
            vistaMatrix.compose(position, vistaQuaternion, vistaScale);
            peaks.setMatrixAt(index, vistaMatrix);
        }
        peaks.instanceMatrix.needsUpdate = true;
        course.add(peaks);
        livingWorld.terrain = peaks;

        const ruinGeometry = chamferedBox(1, 1, 1, .04);
        const distantRuins = new THREE.InstancedMesh(ruinGeometry, ruinMaterial, 18);
        for (let index = 0; index < 18; index++) {
            const distance = 14 + (index % 9) * 14.1;
            const side = index < 9 ? -1 : 1;
            const sample = sampleAtDistance(distance);
            const height = 4.8 + seeded(index + 125) * 8.5;
            const position = sample.point.clone()
                .addScaledVector(sample.lateral, side * (10.5 + seeded(index + 52) * 5.5))
                .addScaledVector(UP, height * .42 - 2.05);
            vistaQuaternion.setFromAxisAngle(UP, Math.atan2(sample.tangent.x, sample.tangent.z) + side * .18);
            vistaScale.set(1.6 + seeded(index + 6) * 2.8, height, 1.8 + seeded(index + 26) * 2.2);
            vistaMatrix.compose(position, vistaQuaternion, vistaScale);
            distantRuins.setMatrixAt(index, vistaMatrix);
        }
        distantRuins.instanceMatrix.needsUpdate = true;
        course.add(distantRuins);

        const bandGeometry = chamferedBox(1, 1, 1, .02);
        const goldBands = new THREE.InstancedMesh(bandGeometry, MATERIALS.GOLD_AGED, 9);
        const energyBands = new THREE.InstancedMesh(bandGeometry, MATERIALS.CYAN_EMISSIVE, 9);
        let goldBandIndex = 0;
        let energyBandIndex = 0;
        for (let index = 0; index < 18; index++) {
            const distance = 14 + (index % 9) * 14.1;
            const side = index < 9 ? -1 : 1;
            const sample = sampleAtDistance(distance);
            const height = 4.8 + seeded(index + 125) * 8.5;
            const width = 1.6 + seeded(index + 6) * 2.8;
            const depth = 1.8 + seeded(index + 26) * 2.2;
            const position = sample.point.clone()
                .addScaledVector(sample.lateral, side * (10.5 + seeded(index + 52) * 5.5))
                .addScaledVector(UP, height * .78 - 2.05);
            vistaQuaternion.setFromAxisAngle(UP, Math.atan2(sample.tangent.x, sample.tangent.z) + side * .18);
            vistaScale.set(width * 1.08, .13, depth * 1.08);
            vistaMatrix.compose(position, vistaQuaternion, vistaScale);
            const target = index % 2 ? energyBands : goldBands;
            const targetIndex = index % 2 ? energyBandIndex++ : goldBandIndex++;
            target.setMatrixAt(targetIndex, vistaMatrix);
        }
        goldBands.instanceMatrix.needsUpdate = true;
        energyBands.instanceMatrix.needsUpdate = true;
        course.add(goldBands, energyBands);

        const moteCount = 96;
        const motePositions = new Float32Array(moteCount * 3);
        const moteBaseY = new Float32Array(moteCount);
        const motePhases = new Float32Array(moteCount);
        for (let index = 0; index < moteCount; index++) {
            const distance = seeded(index + 203) * routeLength;
            const sample = sampleAtDistance(distance);
            const side = seeded(index + 307) > .5 ? 1 : -1;
            const position = sample.point.clone()
                .addScaledVector(sample.lateral, side * (5.5 + seeded(index + 401) * 18))
                .addScaledVector(sample.tangent, (seeded(index + 503) - .5) * 7)
                .addScaledVector(UP, 1.5 + seeded(index + 601) * 13);
            motePositions.set([position.x, position.y, position.z], index * 3);
            moteBaseY[index] = position.y;
            motePhases[index] = seeded(index + 701) * Math.PI * 2;
        }
        const moteGeometry = new THREE.BufferGeometry();
        moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
        const moteMaterial = new THREE.PointsMaterial({
            color: palette.mote, map: softTexture, transparent: true, opacity: .62,
            size: LEVEL.theme === 'volcano' ? .24 : .18, sizeAttenuation: true,
            depthWrite: false, blending: THREE.AdditiveBlending
        });
        const motes = new THREE.Points(moteGeometry, moteMaterial);
        motes.name = `LIVING_${LEVEL.theme.toUpperCase()}_MOTES`;
        course.add(motes);
        livingWorld.motes = motes;
        livingWorld.moteBaseY = moteBaseY;
        livingWorld.motePhases = motePhases;
    }
    if (!WATERFALL_PRODUCTION_ENABLED) addLivingWorld();

    function updateLivingWorld(delta) {
        livingWorld.waterfallMaterials.forEach(material => { material.uniforms.uTime.value = state.elapsed; });
        livingWorld.rotors.forEach((rotor, index) => { rotor.rotation.z += delta * (index % 2 ? -.42 : .28); });
        livingWorld.floatingCrystals.forEach((crystal, index) => {
            crystal.rotation.y += delta * (.7 + index * .08);
            crystal.position.y = 2.2 + Math.sin(state.elapsed * 1.55 + index * 1.7) * .22;
        });
        livingWorld.pulseMaterials.forEach((material, index) => {
            material.emissiveIntensity = 1.45 + Math.sin(state.elapsed * 2.4 + index) * .42;
        });
        livingWorld.labyrinthDynamics.forEach((item, index) => {
            if (item.type === 'water-wheel') item.object.rotation.z -= delta * (.55 + index * .06);
            else if (item.type === 'orbit') {
                item.object.rotation.z += delta * (item.direction || 1) * (.28 + index * .035);
                item.object.rotation.y = item.baseRotationY + Math.sin(state.elapsed * .55 + index) * .16;
            } else if (item.type === 'forge-piston') {
                item.object.position.y = item.baseY + Math.sin(state.elapsed * 2.15 + index * 1.7) * .18;
            }
        });
        if (livingWorld.motes) {
            const positions = livingWorld.motes.geometry.attributes.position;
            for (let index = 0; index < positions.count; index++) {
                positions.setY(index, livingWorld.moteBaseY[index] + Math.sin(state.elapsed * (LEVEL.theme === 'volcano' ? 1.7 : .65) + livingWorld.motePhases[index]) * (LEVEL.theme === 'volcano' ? 1.15 : .42));
            }
            positions.needsUpdate = true;
            livingWorld.motes.material.opacity = .5 + Math.sin(state.elapsed * 1.2) * .12;
        }
    }
    function textLabelTexture(value) {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const x = c.getContext('2d');
        x.clearRect(0, 0, 256, 256);
        x.font = '700 158px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.strokeStyle = 'rgba(8,35,37,.98)'; x.lineWidth = 20;
        x.strokeText(value, 128, 139);
        x.shadowColor = 'rgba(65,245,231,.82)'; x.shadowBlur = 22;
        x.fillStyle = '#fff7db';
        x.fillText(value, 128, 139);
        const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
        labelTextures.push(texture); return texture;
    }

    const jumpHazard = new THREE.Group();
    if (PREMIUM_WATERFALL_REQUESTED || PREMIUM_V2_LEVEL_ONE) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.48, .62, 7.5, 10), MATERIALS.WOOD_RUIN);
        trunk.rotation.z = Math.PI / 2;
        trunk.position.y = .56;
        jumpHazard.add(trunk);
        for (const [x, angle] of [[-2.45, -.72], [2.05, .64]]) {
            const branch = new THREE.Mesh(new THREE.CylinderGeometry(.16, .27, 2.4, 7), MATERIALS.WOOD_RUIN);
            branch.position.set(x, .76, -.12);
            branch.rotation.z = angle;
            jumpHazard.add(branch);
        }
    } else {
        for (const [x, y, w, angle] of [[-2.9, .28, 2.3, -.1], [-.7, .4, 2.0, .13], [1.25, .3, 1.8, -.16], [3.0, .45, 1.5, .12]]) {
            const block = stoneBlock(w, .72 + y, 1.0, [x, y, 0], MATERIALS.STONE_DAMAGED, .12);
            block.rotation.z = angle; jumpHazard.add(block);
        }
    }
    const crack = stoneBlock(7.2, .05, .22, [0, .03, .1], MATERIALS.CYAN_EMISSIVE, .01);
    jumpHazard.add(crack); placeCourse(jumpHazard, FIRST_OBSTACLES.jump, 0, -.1);
    const secondJumpHazard = jumpHazard.clone(true);
    secondJumpHazard.scale.set(.92, 1.08, 1.08);
    placeCourse(secondJumpHazard, SECOND_OBSTACLES.jump, 0, -.1);

    const slideHazard = new THREE.Group();
    for (const side of [-1, 1]) {
        slideHazard.add(
            stoneBlock(1.0, 2.82, .82, [side * 3.18, 1.25, 0], MATERIALS.STONE_DAMAGED, .12),
            stoneBlock(.1, 1.92, .07, [side * 2.72, 1.34, -.45], MATERIALS.CYAN_EMISSIVE, .015),
            stoneBlock(1.3, .22, 1.02, [side * 3.18, 2.68, 0], MATERIALS.GOLD_AGED, .04)
        );
    }
    const slideCanopy = new THREE.Group();
    const beam = stoneBlock(4.15, .42, .68, [-1.08, 2.54, 0], MATERIALS.STONE_PRIMARY, .1);
    beam.rotation.z = -.085;
    const brokenBeam = stoneBlock(2.08, .42, .68, [2.05, 2.41, .02], MATERIALS.STONE_DAMAGED, .1);
    brokenBeam.rotation.z = .13;
    slideCanopy.add(
        beam,
        brokenBeam,
        stoneBlock(3.72, .075, .71, [-1.24, 2.26, -.015], MATERIALS.CYAN_EMISSIVE, .018),
        stoneBlock(1.72, .075, .71, [2.07, 2.22, -.015], MATERIALS.CYAN_EMISSIVE, .018),
        stoneBlock(1.2, .13, .74, [-2.35, 2.78, 0], MATERIALS.GOLD_AGED, .025),
        stoneBlock(1.2, .13, .74, [2.35, 2.65, 0], MATERIALS.GOLD_AGED, .025)
    );
    mergeStaticChildrenByMaterial(slideCanopy);
    slideHazard.add(slideCanopy);
    placeCourse(slideHazard, FIRST_OBSTACLES.slide, 0, -.18);
    const secondSlideHazard = slideHazard.clone(true);
    secondSlideHazard.scale.set(1.04, .94, 1.06);
    placeCourse(secondSlideHazard, SECOND_OBSTACLES.slide, 0, -.18);

    const dashGate = new THREE.Group();
    for (const side of [-1, 1]) {
        const pylon = stoneBlock(2.3, 4.2, 2.2, [side * 3.25, 1.65, 0], MATERIALS.STONE_DAMAGED, .15);
        pylon.rotation.z = side * -.06;
        dashGate.add(
            pylon,
            stoneBlock(.12, 3.2, .08, [side * 2.35, 1.65, 1.14], MATERIALS.CYAN_EMISSIVE, .015),
            stoneBlock(.62, .22, .8, [side * 2.42, 3.52, .14], MATERIALS.GOLD_AGED, .04)
        );
    }
    const dashLintel = stoneBlock(4.55, .24, .4, [0, 3.6, .15], MATERIALS.GOLD_AGED, .05);
    dashLintel.rotation.z = .035;
    dashGate.add(dashLintel);
    mergeStaticChildrenByMaterial(dashGate);
    placeCourse(dashGate, FIRST_OBSTACLES.dash, 0, -.45);
    const secondDashGate = dashGate.clone(true);
    secondDashGate.scale.set(.96, 1.12, 1.08);
    placeCourse(secondDashGate, SECOND_OBSTACLES.dash, 0, -.45);
    jumpHazard.visible = ENABLED_OBSTACLES.has('jump');
    // This route-aligned arch supplies the actual readable crawl opening. The
    // environment arch is lateral scenery and cannot define gameplay clearance.
    slideHazard.visible = ENABLED_OBSTACLES.has('slide');
    dashGate.visible = ENABLED_OBSTACLES.has('dash');
    secondJumpHazard.visible = ENABLED_OBSTACLES.has('jump2');
    secondSlideHazard.visible = ENABLED_OBSTACLES.has('slide2');
    secondDashGate.visible = ENABLED_OBSTACLES.has('dash2');

    const obstacleRunes = [
        { key: 'jump', distance: FIRST_OBSTACLES.jump - 2, action: 'JUMP' },
        { key: 'slide', distance: FIRST_OBSTACLES.slide - 2.35, action: 'SLIDE' },
        { key: 'dash', distance: FIRST_OBSTACLES.dash - 2.4, action: 'DASH' },
        { key: 'jump2', distance: SECOND_OBSTACLES.jump - 2, action: 'JUMP' },
        { key: 'slide2', distance: SECOND_OBSTACLES.slide - 2.35, action: 'SLIDE' },
        { key: 'dash2', distance: SECOND_OBSTACLES.dash - 2.4, action: 'DASH' }
    ].map(({ key, distance, action }) => {
        const material = new THREE.MeshBasicMaterial({
            color: action === 'DASH' ? 0xe1a24d : 0x5af2e8,
            transparent: true, opacity: .14, depthWrite: false,
            blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        const rune = mesh(new THREE.RingGeometry(.64, .76, 24), material, [0, 0, 0], [-Math.PI / 2, 0, 0]);
        placeCourse(rune, distance, 0, .055);
        rune.visible = ENABLED_OBSTACLES.has(key);
        return { key, distance, action, rune, material };
    });

    const mazeSealMaterial = new THREE.MeshBasicMaterial({
        color: LEVEL.theme === 'volcano' ? 0x8f2f20 : LEVEL.theme === 'mountain' ? 0x294d84 : 0x17666b,
        transparent: true, opacity: .13, depthWrite: false,
        side: THREE.DoubleSide
    });
    const mazeGates = MAZE_DISTANCES.map((distance, gateIndex) => {
        const openLane = MAZE_LANES[gateIndex];
        const gate = new THREE.Group();
        gate.name = `LABYRINTH_GATE_${gateIndex + 1}`;
        for (const lane of [-1, 0, 1]) {
            if (lane === openLane) {
                gate.add(
                    mesh(new THREE.RingGeometry(.42, .54, 20), MATERIALS.CYAN_EMISSIVE,
                        [lane * 2.45, .08, .15], [-Math.PI / 2, 0, 0]),
                    stoneBlock(1.42, .08, 1.0, [lane * 2.45, .03, 0], MATERIALS.GOLD_AGED, .02),
                    stoneBlock(.16, 1.22, .18, [lane * 2.45 - .86, .58, 0], MATERIALS.CYAN_EMISSIVE, .018),
                    stoneBlock(.16, 1.22, .18, [lane * 2.45 + .86, .58, 0], MATERIALS.CYAN_EMISSIVE, .018)
                );
                continue;
            }
            const laneCenter = lane * 2.45;
            const leftPost = stoneBlock(.28, 2.28, .58, [laneCenter - .83, 1.04, 0], MATERIALS.STONE_DAMAGED, .055);
            const rightPost = stoneBlock(.28, 2.28, .58, [laneCenter + .83, 1.04, 0], MATERIALS.STONE_DAMAGED, .055);
            const braceA = stoneBlock(1.76, .16, .48, [laneCenter, 1.15, .03], MATERIALS.GOLD_AGED, .025);
            const braceB = stoneBlock(1.76, .12, .5, [laneCenter, 1.15, .06], MATERIALS.CYAN_EMISSIVE, .018);
            braceA.rotation.z = .62;
            braceB.rotation.z = -.62;
            gate.add(
                stoneBlock(2.0, .34, .88, [laneCenter, .08, 0], MATERIALS.STONE_DAMAGED, .06),
                leftPost, rightPost,
                stoneBlock(1.94, .18, .66, [laneCenter, 2.15, 0], MATERIALS.GOLD_AGED, .03),
                braceA, braceB,
                mesh(new THREE.PlaneGeometry(1.62, 1.7), mazeSealMaterial.clone(), [laneCenter, 1.15, .05])
            );
        }
        gate.add(
            stoneBlock(8.1, .28, 1.32, [0, -.08, 0], MATERIALS.STONE_PRIMARY, .06),
            stoneBlock(.36, 2.9, 1.1, [-3.88, 1.2, 0], MATERIALS.STONE_PRIMARY, .08),
            stoneBlock(.36, 2.9, 1.1, [3.88, 1.2, 0], MATERIALS.STONE_PRIMARY, .08)
        );
        mergeStaticChildrenByMaterial(gate);
        placeCourse(gate, distance, 0, -.2);
        if (EXPLORATION_ENABLED) registerCameraOccluders(gate, `LABYRINTH_GATE_${gateIndex + 1}`);
        gate.visible = EXPLORATION_ENABLED;
        return { distance, openLane, gate };
    });
    const explorationRunes = [];
    const explorationLoopWalls = [];
    const explorationLoopMarkers = [];
    const explorationArchitecture = [];
    if (EXPLORATION_ENABLED) {
        const floorDistances = Array.from({ length: 14 }, (_, index) => EXPLORATION_START + index * 1.9);
        const floorGeometry = chamferedBox(12.4, .24, 2.08, .06);
        const explorationFloor = new THREE.InstancedMesh(floorGeometry, MATERIALS.STONE_DAMAGED, floorDistances.length);
        const floorMatrix = new THREE.Matrix4();
        const floorQuaternion = new THREE.Quaternion();
        const floorScale = new THREE.Vector3(1, 1, 1);
        floorDistances.forEach((distance, index) => {
            const sample = sampleAtDistance(distance);
            const position = sample.point.clone().addScaledVector(UP, -.17);
            floorQuaternion.setFromAxisAngle(UP, Math.atan2(sample.tangent.x, sample.tangent.z));
            floorMatrix.compose(position, floorQuaternion, floorScale);
            explorationFloor.setMatrixAt(index, floorMatrix);
        });
        explorationFloor.instanceMatrix.needsUpdate = true;
        explorationFloor.name = `${LEVEL.theme.toUpperCase()}_EXPLORATION_FLOOR`;
        course.add(explorationFloor);

        const railGeometry = chamferedBox(1.45, .52, .32, .055);
        const railMesh = new THREE.InstancedMesh(railGeometry, MATERIALS.STONE_PRIMARY, 12);
        const railEnergyGeometry = chamferedBox(1.18, .055, .35, .014);
        const railEnergy = new THREE.InstancedMesh(railEnergyGeometry, MATERIALS.CYAN_EMISSIVE, 12);
        const railMatrix = new THREE.Matrix4();
        const railQuaternion = new THREE.Quaternion();
        const railScale = new THREE.Vector3(1, 1, 1);
        let railIndex = 0;
        for (const distance of [56.55, 57.8, 59.05, 60.3, 61.55, 62.8]) {
            const sample = sampleAtDistance(distance);
            railQuaternion.setFromAxisAngle(UP, Math.atan2(sample.tangent.x, sample.tangent.z));
            for (const side of [-1, 1]) {
                const position = sample.point.clone().addScaledVector(sample.lateral, side * 5.72).addScaledVector(UP, .12);
                railMatrix.compose(position, railQuaternion, railScale);
                railMesh.setMatrixAt(railIndex, railMatrix);
                const energyPosition = position.clone().addScaledVector(UP, .31);
                railMatrix.compose(energyPosition, railQuaternion, railScale);
                railEnergy.setMatrixAt(railIndex, railMatrix);
                railIndex++;
            }
        }
        railMesh.instanceMatrix.needsUpdate = true;
        railEnergy.instanceMatrix.needsUpdate = true;
        railMesh.name = `${LEVEL.theme.toUpperCase()}_LABYRINTH_RAILS`;
        railEnergy.name = `${LEVEL.theme.toUpperCase()}_LABYRINTH_RAIL_ENERGY`;
        course.add(railMesh, railEnergy);

        const createThreshold = (distance, role) => {
            const threshold = new THREE.Group();
            threshold.name = `${LEVEL.theme.toUpperCase()}_LABYRINTH_${role}`;
            for (const side of [-1, 1]) {
                threshold.add(
                    stoneBlock(.82, 3.25, .9, [side * 5.25, 1.42, 0], MATERIALS.STONE_PRIMARY, .1),
                    stoneBlock(1.12, .18, 1.02, [side * 5.25, 3.08, 0], MATERIALS.GOLD_AGED, .035),
                    stoneBlock(.08, 1.75, .96, [side * 4.78, 1.5, .02], MATERIALS.CYAN_EMISSIVE, .016),
                    mesh(new THREE.TorusGeometry(.31, .045, 6, 20), MATERIALS.CYAN_EMISSIVE, [side * 5.25, 3.44, .02])
                );
            }
            mergeStaticChildrenByMaterial(threshold);
            placeCourse(threshold, distance, 0, -.14);
            registerCameraOccluders(threshold, threshold.name);
            explorationArchitecture.push(threshold);
        };
        createThreshold(55.72, 'ENTRY');
        createThreshold(61.18, 'FAR_CROSSING');

        // A continuous, low floor circuit communicates the required loop without
        // adding collision or another wall silhouette. Longitudinal cyan lines
        // identify the two branches; gold transverse lines explain the crossings.
        const loopGuide = new THREE.Group();
        loopGuide.name = `${LEVEL.theme.toUpperCase()}_LOOP_GUIDE`;
        for (const lateral of [-EXPLORATION_LOOP.outerLane, EXPLORATION_LOOP.outerLane]) {
            for (let distance = EXPLORATION_LOOP.near + .35; distance <= EXPLORATION_LOOP.far - .25; distance += .72) {
                const segment = stoneBlock(.13, .035, .58, [0, 0, 0], MATERIALS.CYAN_EMISSIVE, .012);
                placeCourse(segment, distance, lateral, .045);
                loopGuide.add(segment);
            }
        }
        for (const distance of [EXPLORATION_LOOP.near, EXPLORATION_LOOP.far]) {
            const crossing = new THREE.Group();
            for (const lateral of [-3.6, -2.7, -1.8, -.9, 0, .9, 1.8, 2.7, 3.6]) {
                crossing.add(stoneBlock(.7, .035, .13, [lateral, 0, 0], MATERIALS.GOLD_AGED, .012));
            }
            placeCourse(crossing, distance, 0, .046);
            loopGuide.add(crossing);
        }
        course.add(loopGuide);

        // Keep the far transverse crossing clear: these define the island,
        // but never sit on the player's required side-to-side return line.
        for (const distance of [58.05, 59.1]) {
            const divider = new THREE.Group();
            divider.name = `${LEVEL.theme.toUpperCase()}_LOOP_DIVIDER_${distance}`;
            if (LEVEL.theme === 'waterfall') {
                divider.add(
                    stoneBlock(3.2, 1.18, 1.22, [0, .5, 0], MATERIALS.STONE_PRIMARY, .11),
                    stoneBlock(.24, .16, 1.34, [-1.36, 1.12, 0], MATERIALS.GOLD_AGED, .025),
                    stoneBlock(.24, .16, 1.34, [1.36, 1.12, 0], MATERIALS.GOLD_AGED, .025)
                );
                const water = livingWorld.waterfallMaterials[0];
                if (water) divider.add(mesh(new THREE.PlaneGeometry(2.28, .82), water, [0, 1.125, 0], [-Math.PI / 2, 0, 0]));
                mergeStaticChildrenByMaterial(divider);
                const wheel = mesh(new THREE.TorusGeometry(.48, .09, 8, 24), MATERIALS.GOLD_AGED, [0, 1.74, -.64]);
                wheel.add(
                    stoneBlock(1.02, .075, .08, [0, 0, 0], MATERIALS.CYAN_EMISSIVE, .015),
                    stoneBlock(.075, 1.02, .08, [0, 0, 0], MATERIALS.CYAN_EMISSIVE, .015)
                );
                divider.add(wheel);
                livingWorld.labyrinthDynamics.push({ object: wheel, type: 'water-wheel' });
            } else if (LEVEL.theme === 'mountain') {
                divider.add(
                    stoneBlock(2.75, 1.12, 1.16, [0, .48, 0], MATERIALS.STONE_DAMAGED, .1),
                    stoneBlock(2.48, .14, 1.25, [0, 1.08, 0], MATERIALS.GOLD_AGED, .03),
                    mesh(new THREE.OctahedronGeometry(.23, 0), MATERIALS.CYAN_EMISSIVE, [0, 1.55, 0])
                );
                mergeStaticChildrenByMaterial(divider);
                const outerOrbit = mesh(new THREE.TorusGeometry(.72, .065, 7, 28), MATERIALS.GOLD_AGED, [0, 1.55, 0]);
                const innerOrbit = mesh(new THREE.TorusGeometry(.49, .045, 6, 24), MATERIALS.CYAN_EMISSIVE, [0, 1.55, .04]);
                innerOrbit.rotation.z = .62;
                divider.add(outerOrbit, innerOrbit);
                livingWorld.labyrinthDynamics.push(
                    { object: outerOrbit, type: 'orbit', baseRotationY: 0, direction: 1 },
                    { object: innerOrbit, type: 'orbit', baseRotationY: 0, direction: -1 }
                );
            } else {
                const lava = livingWorld.pulseMaterials[0] || MATERIALS.CYAN_EMISSIVE;
                divider.add(
                    stoneBlock(3.25, 1.22, 1.26, [0, .52, 0], MATERIALS.STONE_DAMAGED, .11),
                    stoneBlock(3.0, .15, 1.36, [0, 1.16, 0], MATERIALS.GOLD_AGED, .03),
                    stoneBlock(2.4, .08, .82, [0, 1.25, 0], lava, .018)
                );
                mergeStaticChildrenByMaterial(divider);
                for (const side of [-1, 1]) {
                    const piston = stoneBlock(.34, 1.22, .34, [side * .92, 1.92, 0], MATERIALS.GOLD_AGED, .055);
                    const head = stoneBlock(.72, .26, .62, [0, -.58, 0], MATERIALS.STONE_PRIMARY, .055);
                    piston.add(head); divider.add(piston);
                    livingWorld.labyrinthDynamics.push({ object: piston, type: 'forge-piston', baseY: piston.position.y });
                }
            }
            placeCourse(divider, distance, 0, -.13);
            registerCameraOccluders(divider, divider.name);
            explorationLoopWalls.push(divider);
        }

        const markerPositions = [
            { distance: EXPLORATION_LOOP.near, lateral: -EXPLORATION_LOOP.outerLane, role: 'LEFT_ENTRY' },
            { distance: EXPLORATION_LOOP.near, lateral: EXPLORATION_LOOP.outerLane, role: 'RIGHT_ENTRY' },
            { distance: EXPLORATION_LOOP.far, lateral: -EXPLORATION_LOOP.outerLane, role: 'LEFT_TURN' },
            { distance: EXPLORATION_LOOP.far, lateral: EXPLORATION_LOOP.outerLane, role: 'RIGHT_TURN' },
            { distance: EXPLORATION_LOOP.near, lateral: 0, role: 'REJOIN' }
        ];
        markerPositions.forEach(({ distance, lateral, role }, index) => {
            const root = new THREE.Group();
            const material = new THREE.MeshBasicMaterial({
                color: role === 'REJOIN' ? 0xe3a84b : 0x63f3e9,
                transparent: true, opacity: .5, depthWrite: false,
                blending: THREE.AdditiveBlending, side: THREE.DoubleSide
            });
            const ring = mesh(new THREE.RingGeometry(.48, .62, 24), material, [0, .055, 0], [-Math.PI / 2, 0, 0]);
            const fin = stoneBlock(.16, .72, .16, [0, .36, 0], role === 'REJOIN' ? MATERIALS.GOLD_AGED : MATERIALS.CYAN_EMISSIVE, .025);
            root.add(ring, fin);
            root.name = `LOOP_MARKER_${role}`;
            placeCourse(root, distance, lateral, .01);
            explorationLoopMarkers.push({ root, ring, material, role, index });
        });

        EXPLORATION_RUNES.forEach(({ distance, lateral }, index) => {
            const root = new THREE.Group();
            const haloMaterial = new THREE.MeshBasicMaterial({
                color: 0x6ffff4, transparent: true, opacity: .62,
                depthWrite: false, blending: THREE.AdditiveBlending
            });
            const core = mesh(new THREE.OctahedronGeometry(.42, 1), MATERIALS.CYAN_EMISSIVE, [0, .72, 0]);
            const halo = mesh(new THREE.TorusGeometry(.65, .055, 6, 24), haloMaterial, [0, .72, 0], [Math.PI / 2, 0, 0]);
            const plinth = stoneBlock(1.22, .22, 1.22, [0, .02, 0], MATERIALS.GOLD_AGED, .04);
            root.add(plinth, halo, core);
            root.name = `${LEVEL.theme.toUpperCase()}_EXPLORATION_RUNE_${index + 1}`;
            placeCourse(root, distance, lateral, -.02);
            explorationRunes.push({ root, core, halo, haloMaterial, distance, lateral, baseY: root.position.y });
        });
    }

    const branchGeometry = chamferedBox(2.25, .2, 1.65, .08);
    const branchMesh = new THREE.InstancedMesh(branchGeometry, MATERIALS.STONE_PRIMARY, 21);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    let branchIndex = 0;
    for (const lane of [-1, 0, 1]) {
        for (let index = 0; index < 7; index++) {
            const distance = 45.8 + index * 1.45;
            const sample = sampleAtDistance(distance);
            const spread = lane * (index / 6) * 2.55;
            const position = sample.point.clone().addScaledVector(sample.lateral, spread).addScaledVector(UP, .03);
            quaternion.setFromAxisAngle(UP, Math.atan2(sample.tangent.x, sample.tangent.z));
            matrix.compose(position, quaternion, scale); branchMesh.setMatrixAt(branchIndex++, matrix);
        }
    }
    branchMesh.instanceMatrix.needsUpdate = true; course.add(branchMesh);

    const edgeTrimGeometry = chamferedBox(.16, .1, 1.28, .025);
    const edgeTrimDistances = Array.from({ length: 13 }, (_, index) => 4.5 + index * 4.45);
    const edgeTrim = new THREE.InstancedMesh(edgeTrimGeometry, MATERIALS.GOLD_AGED, edgeTrimDistances.length * 2);
    let edgeIndex = 0;
    for (const distance of edgeTrimDistances) {
        const sample = sampleAtDistance(distance);
        for (const side of [-1, 1]) {
            const position = sample.point.clone().addScaledVector(sample.lateral, side * 4.02).addScaledVector(UP, .06);
            quaternion.setFromAxisAngle(UP, Math.atan2(sample.tangent.x, sample.tangent.z));
            matrix.compose(position, quaternion, scale); edgeTrim.setMatrixAt(edgeIndex++, matrix);
        }
    }
    edgeTrim.instanceMatrix.needsUpdate = true; course.add(edgeTrim);

    const mathSigns = [];
    if (PREMIUM_V2_LEVEL_ONE) {
        const station = new THREE.Group();
        station.name = 'HYDRAULIC_MATH_STATION';
        station.add(
            stoneBlock(7.7, .48, 2.45, [0, .12, 0], MATERIALS.STONE_PRIMARY, .14),
            stoneBlock(7.25, .09, 2.18, [0, .39, -.02], MATERIALS.GOLD_AGED, .025),
            stoneBlock(.62, 2.18, 1.18, [-3.42, 1.16, .12], MATERIALS.STONE_DAMAGED, .1),
            stoneBlock(.62, 2.18, 1.18, [3.42, 1.16, .12], MATERIALS.STONE_DAMAGED, .1)
        );
        const headerPipe = mesh(new THREE.CylinderGeometry(.22, .22, 6.45, 12), MATERIALS.GOLD_AGED,
            [0, 2.05, .13], [0, 0, Math.PI / 2]);
        station.add(headerPipe);
        for (const x of [-2.18, 0, 2.18]) {
            station.add(mesh(new THREE.CylinderGeometry(.11, .11, 1.24, 9), MATERIALS.GOLD_AGED,
                [x, 1.42, .13]));
        }
        mergeStaticChildrenByMaterial(station);
        placeCourse(station, mathGateStopDistance + 3.7, 0, -.03);
    }
    for (const [index, answer] of ACTIVE_MATH.questions[game.difficulty].choices.entries()) {
        const lane = index - 1;
        const sign = new THREE.Group();
        if (PREMIUM_V2_LEVEL_ONE) {
            sign.name = `HYDRAULIC_SELECTOR_${String.fromCharCode(65 + index)}`;
            const faceMaterial = new THREE.MeshBasicMaterial({
                map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
                side: THREE.DoubleSide, toneMapped: false, depthWrite: false
            });
            const face = mesh(new THREE.PlaneGeometry(1.2, 1.2), faceMaterial,
                [0, 1.42, -.55], [0, Math.PI, 0]);
            const valve = mesh(new THREE.TorusGeometry(.7, .075, 8, 28), MATERIALS.GOLD_AGED,
                [0, 1.42, -.46]);
            valve.name = `SELECTOR_VALVE_${String.fromCharCode(65 + index)}`;
            for (let spoke = 0; spoke < 4; spoke++) {
                const bar = stoneBlock(1.13, .065, .065, [0, 1.42, -.455], MATERIALS.GOLD_AGED, .015);
                bar.rotation.z = spoke * Math.PI / 4;
                sign.add(bar);
            }
            face.renderOrder = 4;
            face.userData.cameraFadeHard = true;
            sign.add(
                stoneBlock(1.55, .68, 1.06, [0, .32, 0], MATERIALS.STONE_PRIMARY, .1),
                stoneBlock(1.3, .075, .84, [0, .71, -.03], MATERIALS.CYAN_EMISSIVE, .015),
                valve, face
            );
            sign.userData.valve = valve;
            placeCourse(sign, mathGateStopDistance + 3.7, lane * 2.18, .02);
            mathSigns.push({ lane, sign, face, faceMaterial, valve });
            continue;
        }
        if (PREMIUM_WATERFALL_REQUESTED) {
            const faceMaterial = new THREE.MeshBasicMaterial({
                map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
                side: THREE.DoubleSide, toneMapped: false, depthWrite: false
            });
            const face = mesh(new THREE.PlaneGeometry(1.18, 1.18), faceMaterial,
                [0, 1.38, -.56], [0, Math.PI, 0]);
            face.renderOrder = 4;
            face.userData.cameraFadeHard = true;
            sign.add(
                stoneBlock(1.62, .78, 1.12, [0, .36, 0], MATERIALS.STONE_PRIMARY, .12),
                mesh(new THREE.TorusGeometry(.72, .07, 8, 24), MATERIALS.GOLD_AGED,
                    [0, 1.38, -.48]),
                face,
                stoneBlock(1.34, .055, .84, [0, .78, -.05], MATERIALS.CYAN_EMISSIVE, .012)
            );
            placeCourse(sign, mathGateStopDistance + 3.7, lane * 2.18, .02);
            mathSigns.push({ lane, sign, face, faceMaterial });
            continue;
        }
        if (OFFICIAL_PREMIUM_CAMPAIGN && LEVEL_INDEX === 1) {
            // Observatory choices are independent armillary instruments, not
            // recoloured temple doors. The answer is embedded in the rotating
            // celestial mechanism and remains legible from the running camera.
            const faceMaterial = new THREE.MeshBasicMaterial({
                map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
                side: THREE.DoubleSide, toneMapped: false, depthWrite: false
            });
            const dial = mesh(new THREE.CylinderGeometry(.92, .92, .22, 24), MATERIALS.STONE_PRIMARY,
                [0, 1.68, 0], [Math.PI / 2, 0, 0]);
            const orbit = mesh(new THREE.TorusGeometry(1.12, .075, 8, 32), MATERIALS.GOLD_AGED,
                [0, 1.68, -.16]);
            const orbitCross = mesh(new THREE.TorusGeometry(.86, .045, 6, 28), MATERIALS.CYAN_EMISSIVE,
                [0, 1.68, -.19], [.42, 0, 0]);
            const face = mesh(new THREE.PlaneGeometry(1.42, 1.42), faceMaterial,
                [0, 1.68, -.25], [0, Math.PI, 0]);
            face.renderOrder = 4; face.userData.cameraFadeHard = true;
            sign.add(
                stoneBlock(1.52, .42, 1.5, [0, .18, 0], MATERIALS.STONE_DAMAGED, .1),
                mesh(new THREE.CylinderGeometry(.17, .3, 1.18, 10), MATERIALS.GOLD_AGED, [0, .85, 0]),
                dial, orbit, orbitCross, face,
                mesh(new THREE.OctahedronGeometry(.17, 0), MATERIALS.CYAN_EMISSIVE, [0, 2.93, 0])
            );
            placeCourse(sign, mathGateStopDistance + 4.1, lane * 2.32, .02);
            mathSigns.push({ lane, sign, face, faceMaterial, valve: orbit });
            continue;
        }
        if (OFFICIAL_PREMIUM_CAMPAIGN && LEVEL_INDEX === 2) {
            // Forge answers are load-bearing counterweight controls. Their
            // levers visibly rotate when selected and echo the algebra balance
            // that opens the route.
            const faceMaterial = new THREE.MeshBasicMaterial({
                map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
                side: THREE.DoubleSide, toneMapped: false, depthWrite: false
            });
            const counterweight = mesh(new THREE.CylinderGeometry(.78, .92, .72, 10), MATERIALS.STONE_DAMAGED,
                [0, .42, 0]);
            const lever = stoneBlock(1.78, .14, .18, [0, 1.34, -.18], MATERIALS.GOLD_AGED, .03);
            const hub = mesh(new THREE.CylinderGeometry(.24, .24, .26, 12), MATERIALS.CYAN_EMISSIVE,
                [0, 1.34, -.31], [Math.PI / 2, 0, 0]);
            const face = mesh(new THREE.PlaneGeometry(1.34, 1.34), faceMaterial,
                [0, 2.18, -.24], [0, Math.PI, 0]);
            face.renderOrder = 4; face.userData.cameraFadeHard = true;
            sign.add(
                counterweight,
                stoneBlock(.34, 1.58, .38, [0, 1.25, 0], MATERIALS.STONE_PRIMARY, .06),
                mesh(new THREE.TorusGeometry(.82, .085, 8, 24), MATERIALS.GOLD_AGED, [0, 2.18, -.16]),
                lever, hub, face,
                stoneBlock(1.7, .07, .86, [0, .82, -.08], MATERIALS.CYAN_EMISSIVE, .015)
            );
            placeCourse(sign, mathGateStopDistance + 4.0, lane * 2.3, .02);
            mathSigns.push({ lane, sign, face, faceMaterial, valve: lever });
            continue;
        }
        const isCenter = lane === 0;
        const gateStone = isCenter ? MATERIALS.STONE_PRIMARY : MATERIALS.STONE_DAMAGED;
        for (const side of [-1, 1]) {
            const pillar = stoneBlock(.58, isCenter ? 2.82 : 2.52, .82,
                [side * 1.12, isCenter ? 1.36 : 1.22, 0], gateStone, .1);
            if (!isCenter) pillar.rotation.z = side * (lane < 0 ? -.025 : .025);
            sign.add(pillar,
                stoneBlock(.92, .24, 1.0, [side * 1.12, .1, 0], MATERIALS.STONE_PRIMARY, .06),
                stoneBlock(.09, 1.62, .07, [side * .79, 1.32, -.44], MATERIALS.CYAN_EMISSIVE, .015)
            );
        }
        addRingSegments(sign, {
            inner: .83, outer: 1.21, depth: .78, start: 0, end: Math.PI,
            count: isCenter ? 9 : 7, gap: .035, material: gateStone,
            position: [0, isCenter ? 2.75 : 2.48, 0], alternateDepth: isCenter ? .08 : .13
        });
        addRingSegments(sign, {
            inner: .71, outer: .78, depth: .86, start: 0, end: Math.PI,
            count: 9, gap: .025, material: MATERIALS.GOLD_AGED,
            position: [0, isCenter ? 2.75 : 2.48, -.02]
        });
        const medallionY = isCenter ? 4.08 : 3.78;
        const medallion = mesh(new THREE.CylinderGeometry(.68, .68, .18, 12), gateStone,
            [0, medallionY, -.15], [Math.PI / 2, 0, 0]);
        const runeRing = mesh(new THREE.TorusGeometry(.72, .055, 6, 18), MATERIALS.GOLD_AGED,
            [0, medallionY, -.27]);
        const faceMaterial = new THREE.MeshBasicMaterial({
            map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
            side: THREE.DoubleSide, toneMapped: false, depthWrite: false
        });
        const face = mesh(new THREE.PlaneGeometry(1.26, 1.26), faceMaterial,
            [0, medallionY, -.31], [0, Math.PI, 0]);
        face.renderOrder = 4;
        face.userData.cameraFadeHard = true;
        sign.add(medallion, runeRing, face,
            stoneBlock(2.08, .075, .72, [0, .03, 0], MATERIALS.CYAN_EMISSIVE, .015));
        if (isCenter) {
            const crown = mesh(new THREE.OctahedronGeometry(.24, 0), MATERIALS.CYAN_EMISSIVE, [0, 4.78, 0]);
            crown.scale.set(.72, 1.25, .42); sign.add(crown);
        }
        mergeStaticChildrenByMaterial(sign);
        placeCourse(sign, mathGateStopDistance + 4.65, lane * 2.18, isCenter ? .18 : .02);
        mathSigns.push({ lane, sign, face, faceMaterial });
    }
    let guardianQuestion = ACTIVE_MATH.guardianQuestions[game.difficulty];
    let altarQuestion = ACTIVE_MATH.altarQuestions[game.difficulty];
    const guardianSigils = [];
    const altarSigils = [];
    function renderMathPrompt(element, prompt) {
        element.replaceChildren();
        element.setAttribute('aria-label', prompt);
        for (const token of prompt.split(/(\d+\/\d+)/g).filter(Boolean)) {
            const fraction = token.match(/^(\d+)\/(\d+)$/);
            if (!fraction) { element.append(document.createTextNode(token)); continue; }
            const wrapper = document.createElement('span');
            wrapper.className = 'math-fraction';
            const numerator = document.createElement('span');
            numerator.className = 'math-fraction-numerator';
            numerator.textContent = fraction[1];
            const denominator = document.createElement('span');
            denominator.textContent = fraction[2];
            wrapper.append(numerator, denominator);
            element.append(wrapper);
        }
    }
    function updateMathPresentation() {
        const problem = ACTIVE_MATH.questions[game.difficulty];
        guardianQuestion = ACTIVE_MATH.guardianQuestions[game.difficulty];
        altarQuestion = ACTIVE_MATH.altarQuestions[game.difficulty];
        renderMathPrompt(mathQuestionValue, problem.prompt);
        mathSigns.forEach(({ faceMaterial }, index) => {
            faceMaterial.map = mathLabelRenderer.texture(problem.choices[index], index);
            faceMaterial.needsUpdate = true;
            faceMaterial.color.set(0xffffff);
        });
        guardianSigils.forEach(({ faceMaterial }, index) => {
            faceMaterial.map = mathLabelRenderer.texture(guardianQuestion.choices[index], index);
            faceMaterial.needsUpdate = true;
            faceMaterial.color.set(0xffffff);
        });
        altarSigils.forEach(({ faceMaterial }, index) => {
            faceMaterial.map = mathLabelRenderer.texture(altarQuestion.choices[index], index);
            faceMaterial.needsUpdate = true;
            faceMaterial.color.set(0xffffff);
        });
    }

    // Update 3D math signs for duo mode when second player gets a new question
    function updateDuoMathSigns(context) {
        if (!duoEnabled()) return;
        const waitingPlayerIndex = duoRace.players.findIndex(p => p.status === 'ANSWERING');
        if (waitingPlayerIndex < 0) return;
        
        const racePlayer = duoRace.players[waitingPlayerIndex];
        if (!racePlayer?.problem) return;
        
        const problem = racePlayer.problem;
        console.log('[updateDuoMathSigns] context:', context, 'player:', waitingPlayerIndex, 'problem:', problem.prompt, 'choices:', problem.choices);
        
        if (context === 'ROUTE') {
            mathSigns.forEach(({ faceMaterial }, index) => {
                if (index < problem.choices.length) {
                    const texture = mathLabelRenderer.texture(problem.choices[index], index);
                    console.log('[updateDuoMathSigns] ROUTE sign', index, 'choice:', problem.choices[index], 'texture:', texture);
                    faceMaterial.map = texture;
                    faceMaterial.needsUpdate = true;
                    faceMaterial.color.set(0xffffff);
                }
            });
        } else if (context === 'ALTAR') {
            altarSigils.forEach(({ faceMaterial }, index) => {
                if (index < problem.choices.length) {
                    faceMaterial.map = mathLabelRenderer.texture(problem.choices[index], index);
                    faceMaterial.needsUpdate = true;
                    faceMaterial.color.set(0xffffff);
                }
            });
        } else if (context === 'GUARDIAN') {
            guardianSigils.forEach(({ faceMaterial }, index) => {
                if (index < problem.choices.length) {
                    faceMaterial.map = mathLabelRenderer.texture(problem.choices[index], index);
                    faceMaterial.needsUpdate = true;
                    faceMaterial.color.set(0xffffff);
                }
            });
        } else if (context.startsWith('MASTERY_')) {
            mathSigns.forEach(({ faceMaterial }, index) => {
                if (index < problem.choices.length) {
                    faceMaterial.map = mathLabelRenderer.texture(problem.choices[index], index);
                    faceMaterial.needsUpdate = true;
                    faceMaterial.color.set(0xffffff);
                }
            });
        }
    }

    const guardianPalette = LEVEL.theme === 'volcano'
        ? { stone: 0x5d2f35, accent: 0xff713d, metal: 0xd69a42 }
        : LEVEL.theme === 'mountain'
            ? { stone: 0x394f72, accent: 0x8bc8ff, metal: 0xb9a568 }
            : { stone: 0x245461, accent: 0x57f0df, metal: 0xc69345 };
    const guardianStoneMaterial = themedMaterial({
        color: guardianPalette.stone, map: stoneTexture, roughness: .78, metalness: .12
    });
    const guardianAccentMaterial = themedMaterial({
        color: guardianPalette.accent, emissive: guardianPalette.accent,
        emissiveIntensity: .72, roughness: .28, metalness: .22
    });
    const guardianMetalMaterial = themedMaterial({
        color: guardianPalette.metal, emissive: 0x2a1303,
        emissiveIntensity: .22, roughness: .4, metalness: .72
    });

    const stalkerNames = ACTIVE_CAMPAIGN_ADAPTER.stalkerNames;
    const stalkerRoot = new THREE.Group();
    stalkerRoot.name = `RUNE_STALKER_${LEVEL.number}`;
    const stalkerBody = mesh(new THREE.IcosahedronGeometry(1.08, 1), guardianStoneMaterial, [0, 1.18, 0]);
    stalkerBody.scale.set(1.18, .72, 1.55);
    const stalkerShell = mesh(new THREE.DodecahedronGeometry(.92, 0), guardianMetalMaterial, [0, 1.42, .2]);
    stalkerShell.scale.set(1.08, .48, 1.28);
    const stalkerHead = mesh(new THREE.DodecahedronGeometry(.67, 0), guardianStoneMaterial, [0, 1.18, -1.42]);
    stalkerHead.scale.set(1.12, .76, .9);
    const stalkerCore = mesh(new THREE.OctahedronGeometry(.36, 1), guardianAccentMaterial, [0, 1.45, -1.9]);
    const stalkerMandibles = [-1, 1].map(side => {
        const jaw = new THREE.Group();
        jaw.position.set(side * .38, 1.03, -1.82);
        jaw.add(mesh(new THREE.ConeGeometry(.16, .9, 5), guardianMetalMaterial, [side * .18, 0, -.3], [Math.PI / 2, 0, side * .28]));
        return jaw;
    });
    const stalkerLegs = [];
    const legGeometry = new THREE.CylinderGeometry(.11, .17, 1.55, 5);
    for (let index = 0; index < 6; index++) {
        const side = index % 2 ? 1 : -1;
        const row = Math.floor(index / 2);
        const pivot = new THREE.Group();
        pivot.position.set(side * .82, 1.03, -.68 + row * .72);
        const upper = mesh(legGeometry, guardianStoneMaterial, [side * .52, -.28, 0], [0, 0, side * .9]);
        const foot = mesh(new THREE.ConeGeometry(.15, .72, 5), guardianMetalMaterial,
            [side * 1.05, -.72, -.1], [Math.PI / 2, 0, side * .18]);
        pivot.add(upper, foot); stalkerLegs.push(pivot); stalkerRoot.add(pivot);
    }
    const stalkerRunes = Array.from({ length: 3 }, (_, index) => {
        const rune = mesh(new THREE.OctahedronGeometry(.17, 0), guardianAccentMaterial,
            [(index - 1) * .58, 1.92, .08]);
        stalkerRoot.add(rune); return rune;
    });
    stalkerRoot.add(stalkerBody, stalkerShell, stalkerHead, stalkerCore, ...stalkerMandibles);
    placeCourse(stalkerRoot, stalkerDistance, 0, -.06);
    stalkerRoot.visible = STALKER_ENABLED;
    const stalkerBasePosition = stalkerRoot.position.clone();
    const stalkerSample = sampleAtDistance(stalkerDistance);
    const stalkerLight = new THREE.PointLight(guardianPalette.accent, 2.4, 10, 1.9);
    stalkerLight.position.copy(stalkerBasePosition).addScaledVector(UP, 2.1).addScaledVector(stalkerSample.tangent, -.7);
    scene.add(stalkerLight);
    stalkerLight.visible = STALKER_ENABLED;
    const stalkerArena = new THREE.Group();
    stalkerArena.add(
        mesh(new THREE.RingGeometry(2.25, 2.46, 32), guardianMetalMaterial, [0, .035, 0], [-Math.PI / 2, 0, 0]),
        ...[-1, 1].map(side => stoneBlock(.52, 1.75, .62, [side * 3.25, .62, 0], MATERIALS.STONE_DAMAGED, .08)),
        ...[-1, 1].map(side => mesh(new THREE.OctahedronGeometry(.23, 0), guardianAccentMaterial, [side * 3.25, 1.72, 0]))
    );
    placeCourse(stalkerArena, stalkerDistance, 0, -.18);
    const stalkerNameTexture = textLabelTexture(stalkerNames[LEVEL_INDEX]);
    const stalkerName = new THREE.Sprite(new THREE.SpriteMaterial({
        map: stalkerNameTexture, transparent: true, depthWrite: false, toneMapped: false
    }));
    stalkerName.position.set(0, 2.9, .25); stalkerName.scale.set(4.8, .78, 1); stalkerName.renderOrder = 6;
    stalkerRoot.add(stalkerName);

    const guardianRoot = new THREE.Group();
    guardianRoot.name = `MATH_GUARDIAN_${LEVEL.number}`;
    const guardianBody = mesh(new THREE.CylinderGeometry(1.78, 2.18, 3.75, 6), guardianStoneMaterial, [0, 3.85, 0]);
    guardianBody.scale.z = .72;
    const guardianChest = stoneBlock(2.92, .22, 2.3, [0, 4.42, .05], guardianMetalMaterial, .05);
    const guardianHead = mesh(new THREE.DodecahedronGeometry(1.05, 0), guardianStoneMaterial, [0, 6.62, 0], [0, .18, 0]);
    guardianHead.scale.set(1.02, .78, .88);
    const guardianEye = stoneBlock(1.12, .14, .07, [0, 6.67, 1.0], guardianAccentMaterial, .02);
    const guardianEyeRear = stoneBlock(1.12, .14, .07, [0, 6.67, -1.0], guardianAccentMaterial, .02);
    const guardianLeftArm = new THREE.Group();
    const guardianRightArm = new THREE.Group();
    guardianLeftArm.position.set(-2.05, 5.1, 0);
    guardianRightArm.position.set(2.05, 5.1, 0);
    guardianLeftArm.add(mesh(new THREE.CylinderGeometry(.48, .64, 3.7, 6), guardianStoneMaterial, [0, -1.55, 0]));
    guardianRightArm.add(mesh(new THREE.CylinderGeometry(.48, .64, 3.7, 6), guardianStoneMaterial, [0, -1.55, 0]));
    guardianLeftArm.add(mesh(new THREE.DodecahedronGeometry(.68, 0), guardianMetalMaterial, [0, -3.38, .08]));
    guardianRightArm.add(mesh(new THREE.DodecahedronGeometry(.68, 0), guardianMetalMaterial, [0, -3.38, .08]));
    const guardianBarrier = stoneBlock(7.4, .42, .72, [0, 1.25, -1.55], guardianMetalMaterial, .08);
    const guardianRune = mesh(new THREE.TorusGeometry(1.12, .11, 8, 28), guardianAccentMaterial, [0, 4.0, 1.18]);
    const guardianCoreRunes = Array.from({ length: 4 }, (_, index) => {
        const angle = (index / 4) * Math.PI * 2;
        const rune = mesh(new THREE.OctahedronGeometry(.24, 0), guardianAccentMaterial,
            [Math.cos(angle) * 1.02, 4.03 + Math.sin(angle) * .72, 1.28]);
        rune.rotation.z = angle;
        return rune;
    });
    const guardianThemeParts = [];
    guardianRoot.add(
        stoneBlock(5.6, .75, 3.6, [0, .1, 0], MATERIALS.STONE_DAMAGED, .18),
        stoneBlock(1.2, 3.1, 1.3, [-1.05, 1.55, 0], MATERIALS.STONE_PRIMARY, .15),
        stoneBlock(1.2, 3.1, 1.3, [1.05, 1.55, 0], MATERIALS.STONE_PRIMARY, .15),
        stoneBlock(3.5, .28, 2.28, [0, 2.28, 0], MATERIALS.GOLD_AGED, .06),
        stoneBlock(1.38, 1.12, 1.42, [-1.82, 5.18, 0], MATERIALS.STONE_PRIMARY, .16),
        stoneBlock(1.38, 1.12, 1.42, [1.82, 5.18, 0], MATERIALS.STONE_PRIMARY, .16),
        mesh(new THREE.DodecahedronGeometry(.88, 0), guardianMetalMaterial, [-2.0, 5.28, 0]),
        mesh(new THREE.DodecahedronGeometry(.88, 0), guardianMetalMaterial, [2.0, 5.28, 0]),
        mesh(new THREE.ConeGeometry(1.62, 1.15, 6), guardianMetalMaterial, [0, 4.6, 1.0], [Math.PI / 2, 0, 0]),
        stoneBlock(2.22, .25, 1.98, [0, 7.42, 0], MATERIALS.GOLD_AGED, .06),
        mesh(new THREE.ConeGeometry(.42, 1.35, 5), guardianMetalMaterial, [-.72, 8.05, 0], [0, 0, -.18]),
        mesh(new THREE.ConeGeometry(.42, 1.35, 5), guardianMetalMaterial, [.72, 8.05, 0], [0, 0, .18]),
        mesh(new THREE.TorusGeometry(1.48, .09, 6, 24), guardianAccentMaterial, [0, 5.0, 1.18]),
        guardianBody, guardianChest, guardianHead, guardianEye, guardianEyeRear,
        guardianLeftArm, guardianRightArm, guardianBarrier, guardianRune, ...guardianCoreRunes
    );
    if (TRANSFORMED_WORLD_ENABLED && LEVEL_INDEX === 0) {
        guardianBody.scale.set(1.18, 1.08, .82);
        guardianHead.scale.set(1.2, .72, .96);
        const shoulderWheel = new THREE.Mesh(new THREE.TorusGeometry(2.05, .22, 8, 28), guardianMetalMaterial);
        shoulderWheel.position.set(0, 5.25, -.62);
        const aqueductCrown = new THREE.Group();
        for (let index = -2; index <= 2; index++) {
            const pillar = stoneBlock(.52, 2.2 + (2 - Math.abs(index)) * .42, .72, [index * 1.15, 7.5, 0], guardianStoneMaterial, .08);
            aqueductCrown.add(pillar);
        }
        for (const side of [-1, 1]) {
            const reservoir = mesh(new THREE.CylinderGeometry(.82, 1.08, 2.15, 10), guardianStoneMaterial,
                [side * 2.7, 5.55, 0], [0, 0, side * .18]);
            const spill = mesh(new THREE.CapsuleGeometry(.24, 1.35, 5, 8), guardianAccentMaterial,
                [side * 2.78, 3.9, .25], [0, 0, side * .08]);
            spill.scale.set(.7, 1, .42);
            const fistWheel = mesh(new THREE.TorusGeometry(.72, .13, 8, 22), guardianMetalMaterial,
                [0, -3.42, .12], [Math.PI / 2, 0, 0]);
            (side < 0 ? guardianLeftArm : guardianRightArm).add(fistWheel);
            guardianRoot.add(reservoir, spill);
            guardianThemeParts.push({ object: spill, type: 'water-spill', phase: side });
        }
        guardianThemeParts.push({ object: shoulderWheel, type: 'water-wheel' });
        guardianRoot.add(shoulderWheel, aqueductCrown);
    } else if (TRANSFORMED_WORLD_ENABLED && LEVEL_INDEX === 1) {
        guardianBody.scale.set(.76, 1.16, .58);
        guardianChest.scale.x = .78;
        guardianHead.scale.set(.82, .9, .72);
        for (let index = 0; index < 3; index++) {
            const halo = new THREE.Mesh(new THREE.TorusGeometry(2.1 + index * .58, .11, 8, 36), index === 1 ? guardianAccentMaterial : guardianMetalMaterial);
            halo.position.set(0, 6.25, -.75);
            halo.rotation.set(index * .38, index * .24, index * .52);
            halo.userData.eclipseHalo = true;
            guardianRoot.add(halo);
            guardianThemeParts.push({ object: halo, type: 'eclipse-halo', phase: index });
        }
        for (const side of [-1, 1]) {
            const wing = mesh(new THREE.ConeGeometry(.72, 4.8, 5), guardianMetalMaterial, [side * 3.25, 5.4, -.15], [0, 0, side * .9]);
            wing.scale.z = .36;
            const vane = mesh(new THREE.TorusGeometry(1.05, .08, 6, 24, Math.PI * 1.45), guardianAccentMaterial,
                [side * 3.52, 5.35, .08], [0, side * .55, side * .8]);
            guardianRoot.add(wing, vane);
            guardianThemeParts.push({ object: wing, type: 'eclipse-wing', phase: side });
        }
        guardianRoot.add(mesh(new THREE.OctahedronGeometry(1.05, 1), guardianAccentMaterial, [0, 2.05, 0]));
    } else if (TRANSFORMED_WORLD_ENABLED && LEVEL_INDEX === 2) {
        guardianBody.scale.set(1.3, 1.18, .9);
        guardianHead.scale.set(1.22, .88, 1.0);
        guardianLeftArm.scale.set(1.14, 1.16, 1.14);
        guardianRightArm.scale.set(1.14, 1.16, 1.14);
        for (const side of [-1, 1]) {
            const horn = mesh(new THREE.ConeGeometry(.55, 2.5, 6), guardianMetalMaterial, [side * 1.25, 8.45, 0], [0, 0, side * -.42]);
            const hammer = stoneBlock(2.2, 1.25, 1.45, [0, -4.05, 0], guardianStoneMaterial, .14);
            (side < 0 ? guardianLeftArm : guardianRightArm).add(hammer);
            guardianRoot.add(horn);
        }
        const furnaceCore = mesh(new THREE.IcosahedronGeometry(.7, 1), guardianAccentMaterial, [0, 4.05, 1.58]);
        const furnaceMouth = mesh(new THREE.TorusGeometry(1.18, .18, 8, 24), guardianMetalMaterial, [0, 4.05, 1.46]);
        const backChimney = mesh(new THREE.CylinderGeometry(.52, .74, 4.1, 8), guardianStoneMaterial, [0, 7.15, -1.0]);
        guardianRoot.add(furnaceCore, furnaceMouth, backChimney);
        guardianThemeParts.push({ object: furnaceCore, type: 'forge-core' });
    }
    const guardianArena = new THREE.Group();
    guardianArena.name = `GUARDIAN_ARENA_${LEVEL.number}`;
    if (LEVEL_INDEX === 0) {
        const basinWater = new THREE.MeshPhysicalMaterial({
            color: 0x2abfc9, emissive: 0x075565, emissiveIntensity: .65,
            transparent: true, opacity: .72, roughness: .22, depthWrite: false
        });
        guardianArena.add(
            mesh(new THREE.RingGeometry(3.8, 6.7, 44), guardianMetalMaterial, [0, .02, 0], [-Math.PI / 2, 0, 0]),
            mesh(new THREE.CircleGeometry(3.72, 40), MATERIALS.STONE_PRIMARY, [0, .045, 0], [-Math.PI / 2, 0, 0])
        );
        for (const side of [-1, 1]) {
            guardianArena.add(
                mesh(new THREE.CircleGeometry(2.15, 28), basinWater, [side * 5.15, -.12, 0], [-Math.PI / 2, 0, 0]),
                stoneBlock(.7, 2.8, 1.05, [side * 6.0, 1.0, .2], MATERIALS.STONE_DAMAGED, .12)
            );
        }
    } else if (LEVEL_INDEX === 1) {
        guardianArena.add(
            mesh(new THREE.CylinderGeometry(6.3, 6.8, .52, 20), MATERIALS.STONE_DAMAGED, [0, -.28, 0]),
            mesh(new THREE.RingGeometry(3.15, 6.05, 48), guardianMetalMaterial, [0, .015, 0], [-Math.PI / 2, 0, 0]),
            mesh(new THREE.RingGeometry(1.9, 2.05, 32), guardianAccentMaterial, [0, .035, 0], [-Math.PI / 2, 0, 0])
        );
        for (let index = 0; index < 8; index++) {
            const spoke = stoneBlock(.18, .055, 3.8, [0, .05, -3.7], index % 2 ? guardianMetalMaterial : guardianAccentMaterial, .015);
            spoke.rotation.y = index * Math.PI / 4;
            guardianArena.add(spoke);
        }
    } else {
        const magma = new THREE.MeshStandardMaterial({ color: 0xff5924, emissive: 0xd52808, emissiveIntensity: 2.1, roughness: .3 });
        guardianArena.add(
            mesh(new THREE.CylinderGeometry(6.5, 7.1, .7, 8), MATERIALS.STONE_DAMAGED, [0, -.36, 0], [0, Math.PI / 8, 0]),
            mesh(new THREE.RingGeometry(4.8, 6.35, 8), guardianMetalMaterial, [0, .02, 0], [-Math.PI / 2, 0, Math.PI / 8])
        );
        for (const side of [-1, 1]) {
            guardianArena.add(
                stoneBlock(1.05, .12, 10.5, [side * 5.3, -.02, 0], magma, .02),
                mesh(new THREE.CylinderGeometry(.62, .82, 4.8, 8), guardianStoneMaterial, [side * 6.0, 1.65, 0])
            );
        }
    }
    placeCourse(guardianArena, guardianDistance, 0, -.6);
    placeCourse(guardianRoot, guardianDistance, 0, -.55);
    const guardianBasePosition = guardianRoot.position.clone();
    const guardianSample = sampleAtDistance(guardianDistance);
    const guardianLight = new THREE.PointLight(0x63eee7, 3.6, 15, 1.8);
    guardianLight.position.copy(guardianBasePosition).addScaledVector(UP, 5.2).addScaledVector(guardianSample.tangent, -1.4);
    scene.add(guardianLight);
    const guardianNameCanvas = document.createElement('canvas');
    guardianNameCanvas.width = 512; guardianNameCanvas.height = 96;
    const guardianNameContext = guardianNameCanvas.getContext('2d');
    guardianNameContext.fillStyle = 'rgba(3,14,18,.84)'; guardianNameContext.fillRect(0, 15, 512, 66);
    guardianNameContext.strokeStyle = 'rgba(206,151,65,.9)'; guardianNameContext.lineWidth = 3;
    guardianNameContext.strokeRect(4, 18, 504, 60);
    guardianNameContext.fillStyle = '#8ffff4'; guardianNameContext.font = '700 30px Georgia';
    guardianNameContext.textAlign = 'center'; guardianNameContext.textBaseline = 'middle';
    guardianNameContext.fillText(LEVEL.guardian, 256, 49);
    const guardianNameTexture = new THREE.CanvasTexture(guardianNameCanvas);
    guardianNameTexture.colorSpace = THREE.SRGBColorSpace; labelTextures.push(guardianNameTexture);
    const guardianName = new THREE.Sprite(new THREE.SpriteMaterial({
        map: guardianNameTexture, transparent: true, depthWrite: false, toneMapped: false
    }));
    guardianName.position.set(0, 8.25, .2); guardianName.scale.set(6.3, 1.18, 1); guardianName.renderOrder = 6;
    guardianRoot.add(guardianName);

    guardianSigils.push(...guardianQuestion.choices.map((answer, index) => {
        const lane = index - 1;
        const group = new THREE.Group();
        const faceMaterial = new THREE.MeshBasicMaterial({
            map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
            side: THREE.DoubleSide, toneMapped: false, depthWrite: false
        });
        group.add(
            stoneBlock(1.72, .24, 1.22, [0, .12, 0], MATERIALS.STONE_PRIMARY, .06),
            mesh(new THREE.TorusGeometry(.62, .07, 6, 18), MATERIALS.GOLD_AGED, [0, .74, 0], [Math.PI / 2, 0, 0]),
            mesh(new THREE.PlaneGeometry(1.05, 1.05), faceMaterial, [0, .78, -.07], [0, Math.PI, 0])
        );
        placeCourse(group, guardianStopDistance + 1.45, lane * 2.25, .02);
        return { group, face: group.children.at(-1), faceMaterial };
    }));

    const altarRoot = new THREE.Group();
    altarRoot.name = `RUNE_ALTAR_${LEVEL.number}`;
    const altarBarrier = stoneBlock(7.2, .28, .42, [0, 2.05, -.35], guardianAccentMaterial, .05);
    const altarCoreMaterial = guardianAccentMaterial.clone();
    altarCoreMaterial.color.set(0x3fd7d2);
    altarCoreMaterial.emissive.set(0x168b88);
    altarCoreMaterial.emissiveIntensity = .42;
    altarCoreMaterial.roughness = .5;
    const altarCore = mesh(new THREE.OctahedronGeometry(.62, 1), altarCoreMaterial, [0, 3.4, 0]);
    altarRoot.add(
        stoneBlock(7.8, .38, 2.6, [0, .02, 0], MATERIALS.STONE_DAMAGED, .09),
        stoneBlock(.62, 4.1, .72, [-3.45, 1.65, 0], MATERIALS.STONE_PRIMARY, .09),
        stoneBlock(.62, 4.1, .72, [3.45, 1.65, 0], MATERIALS.STONE_PRIMARY, .09),
        stoneBlock(7.45, .42, .8, [0, 3.72, 0], guardianMetalMaterial, .07),
        mesh(new THREE.TorusGeometry(1.05, .09, 8, 28), guardianMetalMaterial, [0, 3.35, .18]),
        altarCore, altarBarrier
    );
    placeCourse(altarRoot, altarDistance, 0, -.24);
    altarRoot.visible = ALTAR_ENABLED;
    const altarLight = new THREE.PointLight(guardianPalette.accent, 2.4, 12, 1.8);
    const altarSample = sampleAtDistance(altarDistance);
    altarLight.position.copy(altarSample.point).addScaledVector(UP, 3.4);
    scene.add(altarLight);
    altarLight.visible = ALTAR_ENABLED;
    altarSigils.push(...altarQuestion.choices.map((answer, index) => {
        const lane = index - 1;
        const group = new THREE.Group();
        const faceMaterial = new THREE.MeshBasicMaterial({
            map: mathLabelRenderer.texture(answer, index), transparent: true, alphaTest: .04,
            side: THREE.DoubleSide, toneMapped: false, depthWrite: false
        });
        group.add(
            stoneBlock(1.55, .2, 1.25, [0, .1, 0], MATERIALS.STONE_PRIMARY, .05),
            mesh(new THREE.TorusGeometry(.55, .065, 6, 18), guardianMetalMaterial, [0, .68, 0], [Math.PI / 2, 0, 0]),
            mesh(new THREE.PlaneGeometry(.94, .94), faceMaterial, [0, .72, -.07], [0, Math.PI, 0])
        );
        placeCourse(group, altarStopDistance + 1.25, lane * 2.2, .02);
        group.visible = ALTAR_ENABLED;
        return { group, face: group.children.at(-1), faceMaterial };
    }));
    updateMathPresentation();

    const mathTrailGeometry = new THREE.PlaneGeometry(.16, 6.8);
    const mathTrailMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, vertexColors: true, transparent: true, opacity: .26,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const mathTrailMesh = new THREE.InstancedMesh(mathTrailGeometry, mathTrailMaterial, 3);
    const mathTrailBases = [];
    const mathTrailMatrix = new THREE.Matrix4();
    const mathTrailScale = new THREE.Vector3(1, 1, 1);
    const mathTrailIdleColor = new THREE.Color(0x1f7776);
    const mathTrailCorrectColor = new THREE.Color(0x56f3e8);
    const mathTrailWrongColor = new THREE.Color(0xff7858);
    [-1, 0, 1].forEach((lane, index) => {
        const sample = sampleAtDistance(mathGateStopDistance + 3.35);
        const dummy = new THREE.Object3D();
        dummy.position.copy(sample.point).addScaledVector(sample.lateral, lane * 1.82).addScaledVector(UP, .055);
        dummy.rotation.set(-Math.PI / 2, Math.atan2(sample.tangent.x, sample.tangent.z), 0);
        dummy.updateMatrix(); mathTrailBases.push(dummy.matrix.clone());
        mathTrailMesh.setMatrixAt(index, dummy.matrix); mathTrailMesh.setColorAt(index, mathTrailIdleColor);
    });
    mathTrailMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mathTrailMesh.instanceMatrix.needsUpdate = true; mathTrailMesh.instanceColor.needsUpdate = true;
    course.add(mathTrailMesh);

    const dust = Array.from({ length: 9 }, (_, index) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: softTexture, color: 0x8eaaa5, transparent: true, opacity: 0,
            depthWrite: false, fog: true
        }));
        sprite.visible = false; scene.add(sprite);
        return { sprite, life: 0, side: (seeded(index + 8000) - .5) * .8 };
    });
    const dashStreaks = Array.from({ length: 7 }, (_, index) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: softTexture, color: index % 3 ? 0x47e6df : 0xd69c45,
            transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        sprite.visible = false; scene.add(sprite); return sprite;
    });
    const afterImages = Array.from({ length: 3 }, (_, index) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: explorerTexture, color: index === 2 ? 0xd69c45 : 0x66fff3,
            transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        sprite.center.copy(explorer.center); sprite.scale.copy(explorer.scale); sprite.visible = false; scene.add(sprite); return sprite;
    });
    const backpackGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: softTexture, color: 0x42e7df, transparent: true, opacity: .17,
        depthWrite: false, blending: THREE.AdditiveBlending
    }));
    backpackGlow.scale.set(.72, .72, 1); backpackGlow.visible = false; scene.add(backpackGlow);
    const attackPulse = mesh(new THREE.TorusGeometry(1.05, .055, 6, 36), new THREE.MeshBasicMaterial({
        color: 0x55eee5, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    attackPulse.visible = false; scene.add(attackPulse);
    const attackImpact = new THREE.Sprite(new THREE.SpriteMaterial({
        map: softTexture, color: 0xffc86a, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending
    }));
    attackImpact.visible = false; scene.add(attackImpact);
    const shield = mesh(new THREE.IcosahedronGeometry(1.55, 2), new THREE.MeshBasicMaterial({
        color: 0x55efe5, wireframe: true, transparent: true, opacity: .24,
        depthWrite: false, blending: THREE.AdditiveBlending
    }));
    shield.visible = false; scene.add(shield);
    const powerRing = mesh(new THREE.TorusGeometry(1.22, .045, 6, 36), new THREE.MeshBasicMaterial({
        color: 0xd69c45, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }), [0, 0, 0], [Math.PI / 2, 0, 0]);
    powerRing.visible = false; scene.add(powerRing);
    const mathWave = mesh(new THREE.TorusGeometry(.9, .055, 6, 36), new THREE.MeshBasicMaterial({
        color: 0x66fff3, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    }), [0, 0, 0], [Math.PI / 2, 0, 0]);
    mathWave.visible = false; scene.add(mathWave);
    const portalSpill = mesh(new THREE.CircleGeometry(4.8, 32), new THREE.MeshBasicMaterial({
        color: 0x50ebe4, transparent: true, opacity: .11, depthWrite: false, blending: THREE.AdditiveBlending
    }), [0, 0, 0], [-Math.PI / 2, 0, 0]);
    portalSpill.position.copy(portalSample.point).addScaledVector(UP, .035);
    scene.add(portalSpill);
    const portalTint = new THREE.Color(0x61eee7);
    const playerWarmTint = new THREE.Color(0xfff6e8);
    const playerCyanTint = new THREE.Color(0xbdfdf5);
    const playerFillLight = new THREE.PointLight(0x65e8df, .72, 6.5, 2);
    scene.add(playerFillLight);
    const playerRimLight = new THREE.PointLight(0xffb75f, ENHANCED_MOTION_ENABLED ? .42 : 0, 5.2, 2);
    scene.add(playerRimLight);

    const atmospherePositions = new Float32Array(72 * 3);
    for (let index = 0; index < 72; index++) {
        const sample = sampleAtDistance(2 + seeded(index + 9100) * (routeLength - 4));
        const position = sample.point.clone()
            .addScaledVector(sample.lateral, (seeded(index + 9200) - .5) * 17)
            .addScaledVector(UP, .8 + seeded(index + 9300) * 8);
        atmospherePositions.set(position.toArray(), index * 3);
    }
    const atmosphereGeometry = new THREE.BufferGeometry();
    atmosphereGeometry.setAttribute('position', new THREE.BufferAttribute(atmospherePositions, 3));
    const atmosphere = new THREE.Points(atmosphereGeometry, new THREE.PointsMaterial({
        map: softTexture, color: 0x83d9d5, size: .18, transparent: true,
        opacity: .24, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    scene.add(atmosphere);

    const routePulseDistances = [];
    for (let distance = 7; distance < portalDistance - 3; distance += 5.4) routePulseDistances.push(distance);
    const routePulseMaterial = new THREE.MeshBasicMaterial({
        color: 0x53e6df, transparent: true, opacity: .15, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const routePulseMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.12, 1.35), routePulseMaterial, routePulseDistances.length);
    const routePulseDummy = new THREE.Object3D();
    routePulseDistances.forEach((distance, index) => {
        const sample = sampleAtDistance(distance);
        routePulseDummy.position.copy(sample.point)
            .addScaledVector(sample.lateral, distance % 10.8 < 5.4 ? -3.35 : 3.35)
            .addScaledVector(UP, .035);
        routePulseDummy.rotation.set(-Math.PI / 2, Math.atan2(sample.tangent.x, sample.tangent.z), 0);
        routePulseDummy.updateMatrix(); routePulseMesh.setMatrixAt(index, routePulseDummy.matrix);
    });
    routePulseMesh.instanceMatrix.needsUpdate = true;
    scene.add(routePulseMesh);

    const portalVeil = new THREE.Sprite(new THREE.SpriteMaterial({
        map: softTexture, color: 0x8afff6, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending
    }));
    portalVeil.position.copy(portalSample.point).addScaledVector(UP, 4.6);
    portalVeil.scale.set(4.5, 7.4, 1); portalVeil.visible = false; portalVeil.renderOrder = 6;
    scene.add(portalVeil);

    const visualPose = { x: 3.55, y: 3.55, offsetY: .04, offsetSide: 0, offsetForward: 0, rotation: 0 };
    const proceduralExplorer = new ProceduralExplorer({
        scene, metrics: visualPose, enhancedMotion: ENHANCED_MOTION_ENABLED
    });
    const motionController = new CharacterController({
        scene,
        transitionDuration: .12,
        aliases: PREMIUM_RIG_REQUESTED ? {
            IDLE: ['Idle_Loop'], RUN: ['Jog_Fwd_Loop'],
            RUN_LEFT: PREMIUM_V2_RIG_ENABLED ? ['SideRun_Left_Loop'] : ['Jog_Fwd_Loop'],
            RUN_RIGHT: PREMIUM_V2_RIG_ENABLED ? ['SideRun_Right_Loop'] : ['Jog_Fwd_Loop'],
            JUMP_ANTICIPATION: ['Jump_Start'],
            JUMP_ASCEND: ['Jump_Loop'], JUMP_FALL: ['Jump_Loop'], LAND: ['Jump_Land'],
            SLIDE_ENTER: ['Slide_Start'], SLIDE_LOOP: ['Slide_Loop'], SLIDE_EXIT: ['Slide_Exit'],
            DASH: ['Sword_Dash'], ATTACK: ['Sword_Regular_A', 'Sword_Attack'],
            POWER: ['Spell_Simple_Shoot'], HIT: ['Hit_Chest'], INTERACT: ['Interact'],
            SHIELD: ['Idle_Shield_Loop'],
            PORTAL: ['Jump_Start']
        } : {},
        stateConfig: PREMIUM_RIG_REQUESTED ? {
            RUN: { timeScale: PREMIUM_V2_RIG_ENABLED ? .42 : 1.08, referenceSpeed: 2.92 },
            RUN_LEFT: { timeScale: PREMIUM_V2_RIG_ENABLED ? .42 : 1.08, referenceSpeed: 2.92, fidelity: PREMIUM_V2_RIG_ENABLED ? 'same-skeleton-authored-lateral-derivative' : 'authored-forward-run-substitute' },
            RUN_RIGHT: { timeScale: PREMIUM_V2_RIG_ENABLED ? .42 : 1.08, referenceSpeed: 2.92, fidelity: PREMIUM_V2_RIG_ENABLED ? 'same-skeleton-authored-lateral-derivative' : 'authored-forward-run-substitute' },
            JUMP_ANTICIPATION: { timeScale: 2.8 }, LAND: { timeScale: 2.1 },
            DASH: { timeScale: 1.35 }, ATTACK: { timeScale: 1.5 }, HIT: { timeScale: 1.15 },
            POWER: { timeScale: 1.4 }, PORTAL: { timeScale: 1.25 }
        } : {},
        fallback: {
            setVisible(visible) { explorer.visible = false; proceduralExplorer.setVisible(visible); },
            applyPose(context) { proceduralExplorer.applyPose(context); },
            dispose() { proceduralExplorer.dispose(); }
        }
    });
    const partnerController = new CharacterController({
        scene,
        transitionDuration: .12,
        aliases: PREMIUM_RIG_REQUESTED ? {
            IDLE: ['Idle_Loop'], RUN: ['Jog_Fwd_Loop'],
            RUN_LEFT: PREMIUM_V2_RIG_ENABLED ? ['SideRun_Left_Loop'] : ['Jog_Fwd_Loop'],
            RUN_RIGHT: PREMIUM_V2_RIG_ENABLED ? ['SideRun_Right_Loop'] : ['Jog_Fwd_Loop'],
            JUMP_ANTICIPATION: ['Jump_Start'], JUMP_ASCEND: ['Jump_Loop'], JUMP_FALL: ['Jump_Loop'], LAND: ['Jump_Land'],
            SLIDE_ENTER: ['Slide_Start'], SLIDE_LOOP: ['Slide_Loop'], SLIDE_EXIT: ['Slide_Exit'],
            DASH: ['Sword_Dash'], ATTACK: ['Sword_Regular_A', 'Sword_Attack'], POWER: ['Spell_Simple_Shoot'],
            HIT: ['Hit_Chest'], INTERACT: ['Interact'], SHIELD: ['Idle_Shield_Loop'], PORTAL: ['Jump_Start']
        } : {},
        stateConfig: PREMIUM_RIG_REQUESTED ? {
            RUN: { timeScale: PREMIUM_V2_RIG_ENABLED ? .42 : 1.08, referenceSpeed: 2.92 },
            RUN_LEFT: { timeScale: PREMIUM_V2_RIG_ENABLED ? .42 : 1.08, referenceSpeed: 2.92 },
            RUN_RIGHT: { timeScale: PREMIUM_V2_RIG_ENABLED ? .42 : 1.08, referenceSpeed: 2.92 },
            JUMP_ANTICIPATION: { timeScale: 2.8 }, LAND: { timeScale: 2.1 }, DASH: { timeScale: 1.35 },
            ATTACK: { timeScale: 1.5 }, HIT: { timeScale: 1.15 }, POWER: { timeScale: 1.4 }, PORTAL: { timeScale: 1.25 }
        } : {}
    });
    let partnerLoadPromise = null;
    function attachMathCompassTool(controller = motionController, toolName = 'MATH_COMPASS_TOOL') {
        const hand = controller.root?.getObjectByName('hand_r');
        if (!hand || hand.getObjectByName(toolName)) return false;
        const tool = new THREE.Group();
        tool.name = toolName;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.028, .035, .72, 8), MATERIALS.GOLD_AGED.clone());
        shaft.position.y = -.22;
        const head = new THREE.Mesh(new THREE.TorusGeometry(.16, .026, 8, 24), MATERIALS.CYAN_EMISSIVE.clone());
        head.rotation.x = Math.PI / 2;
        head.position.y = -.6;
        const needle = new THREE.Mesh(new THREE.OctahedronGeometry(.085, 0), MATERIALS.CYAN_EMISSIVE.clone());
        needle.scale.set(.48, 1.8, .48);
        needle.position.y = -.6;
        tool.add(shaft, head, needle);
        tool.position.set(.02, -.02, -.03);
        tool.rotation.set(.18, 0, -.18);
        hand.add(tool);
        return true;
    }
    function ensurePartnerLoaded() {
        if (partnerController.mode === 'rigged') return Promise.resolve({ ok: true, cached: true });
        if (partnerLoadPromise) return partnerLoadPromise;
        const characterAssetUrl = PREMIUM_V2_RIG_ENABLED
            ? artAssetUrl('premium-waterfall-v2/math-explorer-quaternius-ranger-v2.glb')
            : artAssetUrl('premium-character-v1/math-explorer-quaternius-ranger-v1.glb');
        partnerLoadPromise = partnerController.load(characterAssetUrl, { scale: 1.35, position: [0, -.29, 0], rotationY: 0 })
            .then(result => {
                if (result.ok) {
                    attachMathCompassTool(partnerController, 'MATH_COMPASS_TOOL_P2');
                    partnerController.root?.traverse(object => {
                        if (!object.isMesh || !object.material) return;
                        const materials = Array.isArray(object.material) ? object.material : [object.material];
                        object.material = materials.map(material => {
                            const clone = material.clone();
                            if (clone.color) clone.color.lerp(new THREE.Color(0x79d9ff), .14);
                            return clone;
                        });
                        if (object.material.length === 1) object.material = object.material[0];
                    });
                }
                return result;
            }).finally(() => { partnerLoadPromise = null; });
        return partnerLoadPromise;
    }
    const partnerShadow = contactShadow.clone();
    partnerShadow.material = contactShadow.material.clone();
    partnerShadow.name = 'PLAYER_TWO_CONTACT_SHADOW';
    partnerShadow.visible = false;
    scene.add(partnerShadow);
    const partnerCore = contactCore.clone();
    partnerCore.material = contactCore.material.clone();
    partnerCore.name = 'PLAYER_TWO_CONTACT_CORE';
    partnerCore.visible = false;
    scene.add(partnerCore);
    if (PREMIUM_RIG_REQUESTED) {
        const characterAssetUrl = PREMIUM_V2_RIG_ENABLED
            ? artAssetUrl('premium-waterfall-v2/math-explorer-quaternius-ranger-v2.glb')
            : artAssetUrl('premium-character-v1/math-explorer-quaternius-ranger-v1.glb');
        motionController.load(characterAssetUrl, {
            scale: 1.35,
            position: [0, -.29, 0],
            rotationY: 0
        }).then(result => {
            if (result.ok) attachMathCompassTool();
            productionReadiness.characterError = result.ok ? null : result.error;
            productionReadiness.character = true;
        }).catch(error => {
            productionReadiness.characterError = error.message;
            productionReadiness.character = true;
            console.error('Premium Math Explorer rig failed to load', error);
        });
    } else if (WATERFALL_PRODUCTION_ENABLED) {
        motionController.load(artAssetUrl('production-v1/math-explorer-rig-v1.glb'), {
            scale: 1.34,
            rotationY: Math.PI
        }).then(result => {
            productionReadiness.characterError = result.ok ? null : result.error;
            productionReadiness.character = true;
        }).catch(error => {
            productionReadiness.characterError = error.message;
            productionReadiness.character = true;
            console.error('Math Explorer production rig failed to load', error);
        });
    }
    const rigPipelineVerification = verifySyntheticRigPipeline();
    const cameraTargetAnchor = new THREE.Vector3();
    const cameraBoomAnchor = new THREE.Vector3();
    const explorationFacing = new THREE.Vector3(0, 0, 1);
    const desiredExplorationFacing = new THREE.Vector3();
    let cameraLandingKick = 0;
    let cameraRoll = 0;

    course.updateMatrixWorld(true);
    const fadeGroups = [];
    const fadeMeshes = [];
    function registerFadeGroup(root, name, fadeDistance = 4.1) {
        const meshes = [];
        root.traverse(object => {
            if (!object.isMesh) return;
            // Fade authority must be local to this structure. Sharing a material
            // between the altar and guardian allowed the later group update to
            // restore the altar lintel to full opacity while it crossed camera.
            if (object.material?.clone) object.material = object.material.clone();
            object.material.transparent = true; object.material.opacity = 1;
            object.userData.cameraFadeGroup = name;
            meshes.push(object); fadeMeshes.push(object);
        });
        fadeGroups.push({
            name, meshes, opacity: 1, fadeDistance,
            box: new THREE.Box3().setFromObject(root).expandByScalar(.28)
        });
    }
    registerFadeGroup(slideCanopy, 'SLIDE_CANOPY');
    registerFadeGroup(dashGate, 'DASH_GATE');
    registerFadeGroup(secondSlideHazard, 'SECOND_SLIDE_CANOPY');
    registerFadeGroup(secondDashGate, 'SECOND_DASH_GATE');
    mazeGates.forEach(({ gate }, index) => registerFadeGroup(gate, `LABYRINTH_GATE_${index + 1}`));
    explorationLoopWalls.forEach((wall, index) => registerFadeGroup(wall, `${LEVEL.theme.toUpperCase()}_LOOP_WALL_${index + 1}`));
    explorationArchitecture.forEach((structure, index) => registerFadeGroup(structure, `${LEVEL.theme.toUpperCase()}_LOOP_ARCH_${index + 1}`));
    mathSigns.forEach(({ sign, lane }) => registerFadeGroup(sign, `MATH_GATE_${lane}`));
    registerFadeGroup(altarRoot, 'RUNE_ALTAR', 6.35);
    registerFadeGroup(guardianRoot, 'MATH_GUARDIAN');
    game.mastery.forEach((mechanism, index) => registerFadeGroup(mechanism.root, `MASTERY_MECHANISM_${index + 1}`, 5.2));
    const visibilityRaycaster = new THREE.Raycaster();
    const cameraRay = new THREE.Ray();
    const cameraHit = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    const safeCameraTarget = new THREE.Vector3();

    function resolveCameraObstruction(focus, desired, delta) {
        cameraDirection.subVectors(desired, focus);
        const desiredDistance = cameraDirection.length();
        if (desiredDistance <= .01) return desired;
        cameraDirection.multiplyScalar(1 / desiredDistance);
        cameraRay.set(focus, cameraDirection);
        let obstructionDistance = desiredDistance;
        let obstruction = null;
        const testOccluder = item => {
            if (item.box.containsPoint(focus)) return;
            const hit = cameraRay.intersectBox(item.box, cameraHit);
            if (!hit) return;
            const distance = focus.distanceTo(hit);
            if (distance > .55 && distance < obstructionDistance) {
                obstructionDistance = distance; obstruction = item.name;
            }
        };
        for (const item of cameraOccluderBoxes) testOccluder(item);
        for (const item of productionWorld.cameraOccluders?.() || []) testOccluder(item);
        const fadeableCircuitObstruction = game.exploration.active && obstruction && (
            obstruction.startsWith('LABYRINTH_GATE_') ||
            obstruction.includes('_LOOP_') ||
            obstruction.includes('_LABYRINTH_')
        );
        const targetArm = obstruction && !fadeableCircuitObstruction
            ? Math.max(.82, obstructionDistance - .28)
            : desiredDistance;
        game.cameraArm = THREE.MathUtils.damp(game.cameraArm, targetArm, obstruction ? 18 : 4.2, delta);
        game.cameraArm = Math.min(game.cameraArm, desiredDistance);
        game.cameraObstruction = fadeableCircuitObstruction ? `FADED:${obstruction}` : obstruction;
        return safeCameraTarget.copy(focus).addScaledVector(cameraDirection, game.cameraArm);
    }

    function updateOccluderFade(delta, focus) {
        cameraDirection.subVectors(focus, camera.position);
        const distance = cameraDirection.length();
        const hitGroups = new Set();
        if (distance > .3) {
            visibilityRaycaster.set(camera.position, cameraDirection.multiplyScalar(1 / distance));
            visibilityRaycaster.near = .2; visibilityRaycaster.far = distance - .18;
            for (const hit of visibilityRaycaster.intersectObjects(fadeMeshes, false)) {
                if (hit.object.userData.cameraFadeGroup) hitGroups.add(hit.object.userData.cameraFadeGroup);
            }
        }
        const activeGroups = new Set(hitGroups);
        for (const group of fadeGroups) {
            const nearCamera = group.box.distanceToPoint(camera.position) < group.fadeDistance;
            if (nearCamera) activeGroups.add(group.name);
            const targetOpacity = nearCamera ? .025 : hitGroups.has(group.name) ? .16 : 1;
            group.opacity = THREE.MathUtils.damp(group.opacity, targetOpacity, targetOpacity < 1 ? 18 : 5, delta);
            for (const object of group.meshes) {
                object.material.opacity = object.userData.cameraFadeHard ? Math.pow(group.opacity, 3) : group.opacity;
                object.material.depthWrite = group.opacity > .72;
            }
        }
        game.fadedOccluders = [...activeGroups];
    }

    function showScreen(phase) {
        const id = screenIds[phase];
        screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
    }
    function select(items, index) { items.forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex === index)); }
    function participatingPlayers() { return session.mode === 'solo' ? session.players.slice(0, 1) : session.players; }
    function duoEnabled() { return session.mode !== 'solo'; }
    function sessionModeLabel() { return session.mode === 'duel' ? 'DOS JUGADORES' : 'UN JUGADOR'; }
    function setSessionMode(mode) {
        if (!SESSION_MODES.has(mode)) return;
        session.mode = mode;
        if (mode === 'solo') session.activeIndex = 0;
        if (mode !== 'solo') void ensurePartnerLoaded();
        ui.sessionModes.forEach(button => {
            const selected = button.dataset.sessionMode === mode;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        ui.playerTwoField.classList.toggle('is-hidden', mode === 'solo');
    }
    function syncSessionSetup() {
        ui.playerOneName.value = session.players[0].name;
        ui.playerTwoName.value = session.players[1].name;
        setSessionMode(session.mode);
    }
    function applySessionSetup() {
        session.players[0].name = safePlayerName(ui.playerOneName.value, 'EXPLORADOR 1');
        session.players[1].name = safePlayerName(ui.playerTwoName.value, 'EXPLORADOR 2');
        session.players.forEach(player => Object.assign(player, { score: 0, answers: 0, correct: 0, responseMs: 0, challengeWins: 0 }));
        session.activeIndex = 0;
        session.levelStart = session.players.map(player => ({ ...player }));
        session.levelStartActive = session.activeIndex;
        ui.playerOneName.value = session.players[0].name;
        ui.playerTwoName.value = session.players[1].name;
        confirmSweep(); audio.cue('confirm'); updateHud(); setPhase('DIFFICULTY');
    }
    function activePlayer() { return session.players[session.mode === 'solo' ? 0 : session.activeIndex]; }
    function recordMathAttempt(correct, points = 0) {
        const player = activePlayer();
        player.answers++;
        if (correct) { player.correct++; player.score += Math.max(0, Math.round(points)); }
    }
    function advanceResponder() {
        if (session.mode !== 'solo') session.activeIndex = (session.activeIndex + 1) % 2;
        updateHud();
    }
    function renderPlayerHud() {
        ui.players.innerHTML = participatingPlayers().map((player, index) => `
            <div class="player-chip ${duoRace.players[index]?.status === 'WAITING' ? 'active' : ''}">
                <span>${duoRace.players[index]?.status === 'WAITING' ? '✓ ' : ''}${player.name}</span><b>${String(player.score).padStart(4, '0')}</b>
                ${duoEnabled() ? `<small>${(player.responseMs / 1000).toFixed(1)}s · ${player.challengeWins} primero</small>` : ''}
            </div>`).join('');
        ui.players.classList.toggle('solo', session.mode === 'solo');
    }
    function renderResultPlayers() {
        const players = participatingPlayers();
        const bestScore = Math.max(...players.map(player => player.score));
        const winners = players.filter(player => player.score === bestScore);
        const isTie = winners.length > 1;
        const isDuel = duoEnabled();
        ui.resultPlayers.innerHTML = players.map(player => {
            const accuracy = player.answers ? Math.round(player.correct / player.answers * 100) : 0;
            const isWinner = player.score === bestScore && bestScore > 0;
            const winnerPrefix = isDuel && isWinner && !isTie ? '◆ GANADOR · ' : isTie && isWinner ? '◆ EMPATE · ' : '';
            return `<div class="result-player-row ${isWinner ? 'winner' : ''}">${winnerPrefix}<span>${player.name}</span><small>${player.correct}/${player.answers} · ${accuracy}% · ${(player.responseMs / 1000).toFixed(1)}s</small><b>${Math.round(player.score)}</b></div>`;
        }).join('') + (session.mode === 'team' && duoEnabled()
            ? `<div class="team-total">TOTAL DEL EQUIPO · ${participatingPlayers().reduce((sum, player) => sum + player.score, 0)}</div>`
            : '');
    }
    function writeSessionQuery(url, includeScores = true) {
        url.searchParams.set('sessionMode', session.mode);
        url.searchParams.set('p1', session.players[0].name);
        if (session.mode !== 'solo') url.searchParams.set('p2', session.players[1].name);
        else url.searchParams.delete('p2');
        url.searchParams.set('activePlayer', String(session.activeIndex));
        for (const [index, player] of session.players.entries()) {
            const prefix = `p${index + 1}`;
            if (includeScores) {
                url.searchParams.set(`${prefix}Score`, String(player.score));
                url.searchParams.set(`${prefix}Answers`, String(player.answers));
                url.searchParams.set(`${prefix}Correct`, String(player.correct));
                url.searchParams.set(`${prefix}ResponseMs`, String(player.responseMs));
                url.searchParams.set(`${prefix}Wins`, String(player.challengeWins));
            } else {
                url.searchParams.delete(`${prefix}Score`);
                url.searchParams.delete(`${prefix}Answers`);
                url.searchParams.delete(`${prefix}Correct`);
                url.searchParams.delete(`${prefix}ResponseMs`);
                url.searchParams.delete(`${prefix}Wins`);
            }
        }
    }
    function updateHud() {
        ui.lives.textContent = Array.from({ length: 3 }, (_, index) => index < runner.lives ? '♥' : '♡').join(' ');
        ui.combo.innerHTML = `COMBO <b>x${runner.combo}</b>`;
        ui.campaign.textContent = `NIVEL ${LEVEL.number}/${LEVELS.length} · ${profiles[game.difficulty].name} · ${sessionModeLabel()}`;
        ui.score.textContent = Math.round(runner.score).toString().padStart(4, '0');
        ui.energy.textContent = `${'●'.repeat(runner.energy)}${'○'.repeat(5 - runner.energy)}`;
        renderPlayerHud();
        const prompt = ui.question.querySelector('span');
        if (prompt) prompt.textContent = `${activePlayer().name} · ELIGE A / B / C`;
    }
    function toast(message, duration = 1.25) {
        ui.toast.textContent = message; ui.toast.classList.add('active'); game.toastTimer = duration;
    }
    function playtestZone() {
        if (game.guardianCombat.active || game.guardianActive) return 'GUARDIAN';
        if (game.stalker.active) return 'RUNE_STALKER';
        if (game.altarActive) return 'ALTAR';
        if (game.routeGateActive) return 'MATH_ROUTE';
        if (game.exploration.active) return `LABYRINTH_${game.exploration.loop.phase}`;
        if (state.distance < FIRST_OBSTACLES.jump) return 'ONBOARDING_MOVE_JUMP';
        if (state.distance < FIRST_OBSTACLES.dash) return 'ONBOARDING_SLIDE_DASH';
        return 'RUNNER_ROUTE';
    }
    function recordPlaytest(type, details = {}) {
        if (!playtest.enabled) return;
        playtest.events.push({
            type, level: LEVEL.number, difficulty: profiles[game.difficulty].id,
            gameplayTime: Number(runner.gameplayTime.toFixed(2)), distance: Number(state.distance.toFixed(2)),
            zone: playtestZone(), ...details
        });
    }
    function beginQuestionPlaytest(context) {
        if (!playtest.enabled || playtest.questionContext === context) return;
        playtest.questionContext = context;
        playtest.questionShownAt = runner.gameplayTime;
        playtest.questionHesitationRecorded = false;
        recordPlaytest('MATH_PRESENTED', { context });
    }
    function resolveQuestionPlaytest(context, correct) {
        const latency = playtest.questionContext === context && playtest.questionShownAt !== null
            ? runner.gameplayTime - playtest.questionShownAt : null;
        recordPlaytest('MATH_RESOLVED', {
            context, correct, responseSeconds: latency === null ? null : Number(latency.toFixed(2))
        });
        playtest.questionContext = null; playtest.questionShownAt = null; playtest.questionHesitationRecorded = false;
    }
    function playtestReport() {
        return {
            schema: 'mathquest-playtest-v1', generatedAt: new Date().toISOString(),
            sessionMode: session.mode, level: LEVEL.number, difficulty: profiles[game.difficulty].id,
            summary: {
                durationSeconds: Number(runner.gameplayTime.toFixed(2)), livesRemaining: runner.lives,
                mathAttempts: runner.questions, mathCorrect: runner.correct, mazeRetries: game.maze.retries,
                blockedExits: game.exploration.blockedExits,
                hesitationEvents: playtest.events.filter(event => event.type === 'HESITATION').length,
                misunderstoodObstacles: playtest.events.filter(event => event.type === 'OBSTACLE_FAILURE').length
            },
            events: playtest.events.map(event => ({ ...event }))
        };
    }
    function savePlaytestReport() {
        if (!playtest.enabled || playtest.saved) return;
        playtest.saved = true;
        try {
            const key = 'mathquest-playtest-reports-v1';
            const previous = JSON.parse(localStorage.getItem(key) || '[]');
            const reports = Array.isArray(previous) ? previous.slice(-19) : [];
            reports.push(playtestReport());
            localStorage.setItem(key, JSON.stringify(reports));
        } catch {}
    }
    
    // Leaderboard & History System
    const LEADERBOARD_KEY = 'mathquest-leaderboard-v1';
    const HISTORY_KEY = 'mathquest-history-v1';
    const MAX_LEADERBOARD_ENTRIES = 50;
    const MAX_HISTORY_ENTRIES = 100;
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
    
    function loadLeaderboard() {
        try {
            const data = localStorage.getItem(LEADERBOARD_KEY);
            const parsed = data ? JSON.parse(data) : [];
            return Array.isArray(parsed) ? parsed.filter(entry => entry && typeof entry === 'object') : [];
        } catch { return []; }
    }
    
    function saveLeaderboard(entries) {
        try {
            localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, MAX_LEADERBOARD_ENTRIES)));
        } catch {}
    }
    
    function loadHistory() {
        try {
            const data = localStorage.getItem(HISTORY_KEY);
            const parsed = data ? JSON.parse(data) : [];
            return Array.isArray(parsed) ? parsed.filter(entry => entry && typeof entry === 'object' && Array.isArray(entry.players)) : [];
        } catch { return []; }
    }
    
    function saveHistory(entries) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
        } catch {}
    }
    
    function addLeaderboardEntry(entry) {
        const leaderboard = loadLeaderboard();
        // Check if player already has an entry for this mode/difficulty - keep best
        const existingIndex = leaderboard.findIndex(e => 
            e.playerName === entry.playerName && 
            e.mode === entry.mode && 
            e.difficulty === entry.difficulty
        );
        if (existingIndex >= 0) {
            if (entry.score > leaderboard[existingIndex].score) {
                leaderboard[existingIndex] = entry;
            }
        } else {
            leaderboard.push(entry);
        }
        // Sort by score descending
        leaderboard.sort((a, b) => b.score - a.score);
        saveLeaderboard(leaderboard);
    }
    
    function addHistoryEntry(entry) {
        const history = loadHistory();
        history.unshift(entry); // Most recent first
        saveHistory(history);
    }
    
    function recordGameCompletion() {
        const players = participatingPlayers();
        const timestamp = new Date().toISOString();
        const difficultyName = profiles[game.difficulty].name;
        const modeLabel = sessionModeLabel();
        
        // Create history entry
        const historyEntry = {
            timestamp,
            date: new Date(timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            level: LEVEL.number,
            levelName: LEVEL.name,
            difficulty: difficultyName,
            mode: session.mode,
            modeLabel,
            players: players.map(p => ({
                name: p.name,
                score: p.score,
                correct: p.correct,
                answers: p.answers,
                responseMs: p.responseMs,
                challengeWins: p.challengeWins
            })),
            totalScore: players.reduce((sum, p) => sum + p.score, 0),
            winner: players.length > 1 ? players.reduce((a, b) => a.score > b.score ? a : b).name : players[0].name,
            isTie: players.length > 1 && players[0].score === players[1].score,
            campaignCompleted: LEVEL_INDEX === LEVELS.length - 1,
            campaignScore: runner.score
        };
        addHistoryEntry(historyEntry);
        
        // Add leaderboard entries (per player)
        for (const player of players) {
            const lbEntry = {
                playerName: player.name,
                score: player.score,
                mode: session.mode,
                modeLabel,
                difficulty: difficultyName,
                difficultyId: profiles[game.difficulty].id,
                timestamp,
                date: historyEntry.date,
                level: LEVEL.number,
                correct: player.correct,
                answers: player.answers,
                responseMs: player.responseMs,
                challengeWins: player.challengeWins
            };
            addLeaderboardEntry(lbEntry);
        }
        
        }
    
    function renderLeaderboard() {
        if (!ui.leaderboardList) return;
        const leaderboard = loadLeaderboard();
        let filtered = leaderboard;
        if (currentLeaderboardFilter !== 'all') {
            const modeMap = { solo: 'solo', duel: 'duel' };
            filtered = leaderboard.filter(e => e.mode === modeMap[currentLeaderboardFilter]);
        }
        if (filtered.length === 0) {
            ui.leaderboardList.innerHTML = '<div class="leaderboard-empty">SIN RÉCORDS AÚN · JUEGA TU PRIMERA PARTIDA</div>';
            return;
        }
        ui.leaderboardList.innerHTML = filtered.map((entry, index) => `
            <div class="leaderboard-entry ${index < 3 ? `rank-${index + 1}` : ''}" role="option">
                <span class="rank">${index + 1}.</span>
                <span class="name">${escapeHtml(entry.playerName)}</span>
                <span class="score">${escapeHtml(String(Math.max(0, Number(entry.score) || 0)).padStart(5, '0'))}</span>
                <span class="meta">
                    <span class="mode">${escapeHtml(entry.modeLabel)}</span>
                    <span class="difficulty">${escapeHtml(entry.difficulty)}</span>
                </span>
            </div>
        `).join('');
    }
    
    function renderHistory() {
        if (!ui.historyList) return;
        const history = loadHistory();
        if (history.length === 0) {
            ui.historyList.innerHTML = '<div class="history-empty">SIN PARTIDAS REGISTRADAS AÚN</div>';
            return;
        }
        ui.historyList.innerHTML = history.map(entry => `
            <div class="history-entry" role="option">
                <span class="date">${escapeHtml(entry.date)}</span>
                <div class="info">
                    <div class="players">
                        ${entry.players.map((p, i) => `
                            <span class="player ${entry.isTie ? '' : (p.name === entry.winner ? 'winner' : '')}">
                                <span class="name">${escapeHtml(p.name)}</span>
                                <span class="score">${escapeHtml(Math.max(0, Number(p.score) || 0))}</span>
                            </span>
                        `).join('')}
                        ${entry.isTie ? '<span class="player" style="color:var(--cyan);">EMPATE</span>' : ''}
                    </div>
                    <div class="details">
                        <span class="badge">${escapeHtml(entry.modeLabel)}</span>
                        <span class="badge">${escapeHtml(entry.difficulty)}</span>
                        <span class="badge">${escapeHtml(entry.levelName)}</span>
                        ${entry.campaignCompleted ? '<span class="badge campaign">CAMPAÑA COMPLETA</span>' : ''}
                        <span>Total: ${escapeHtml(Math.max(0, Number(entry.totalScore) || 0))}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function confirmSweep() {
        ui.flash.classList.remove('active', 'confirm'); void ui.flash.offsetWidth;
        ui.flash.classList.add('confirm');
        setTimeout(() => ui.flash.classList.remove('confirm'), 520);
    }
    function resetRunner() {
        game.keys.clear(); game.actions.clear(); game.actionByCode.clear();
        duoRace.context = null; duoRace.order = []; duoRace.rejoin = null;
        duoRace.penaltyTimer = 0; duoRace.penaltyActive = false;
        duoRace.players.forEach(player => Object.assign(player, {
            status: 'READY', problem: null, startedAt: 0, responseMs: 0,
            wrongFlash: 0, visualLead: 0, slideAnticipation: 0, slideTimer: 0
        }));
        playtest.events.length = 0; playtest.firstGameplayActionAt = null; playtest.lastGameplayActionAt = null;
        playtest.initialHesitationRecorded = false; playtest.questionShownAt = null; playtest.questionContext = null;
        playtest.questionHesitationRecorded = false; playtest.navigationHesitationZones.clear();
        playtest.navigationPhase = null; playtest.navigationPhaseStartedAt = 0; playtest.saved = false;
        Object.assign(runner, {
            state: 'DISABLED', lateral: 0, lateralVelocity: 0, forwardVelocity: 0, targetLateral: null,
            jumpY: 0, verticalVelocity: 0, jumpAnticipation: 0, slideAnticipation: 0,
            slideTimer: 0, dashTimer: 0, dashCooldown: 0, dashFlashTimer: 0,
            hitTimer: 0, landingTimer: 0, attackTimer: 0, attackImpactTimer: 0,
            shieldTimer: 0, powerActivationTimer: 0, stepTimer: 0, bodyLean: 0,
            mathFeedbackTimer: 0, mathFeedbackLane: 0, mathFeedbackCorrect: true,
            gameplayTime: 0, lives: 3, score: CAMPAIGN_MODE ? CAMPAIGN_SCORE : 1250, combo: 1, maxCombo: 1, energy: 0,
            questions: 0, correct: 0, mathResolved: false, lastDistance: 1.2,
            obstacles: { jump: false, slide: false, dash: false, jump2: false, slide2: false, dash2: false },
            tutorial: { move: false, jump: false, slide: false, dash: false }
        });
        state.distance = 1.2; state.finished = false; state.shot = null;
        game.routeChoice = null; game.portalRiseTimer = 0; game.cameraArm = 6.45;
        game.routeGateActive = false; game.routeGateCommitted = false; game.routeGateSelectedLane = null;
        game.routeGateTimer = 0; game.routeGateFeedback = null; game.routeGateAttempts = 0;
        game.masteryActive = null;
        game.mastery.forEach(mechanism => {
            Object.assign(mechanism, { resolved: false, active: false, attempts: 0, open: 0 });
            mechanism.gate.rotation.z = 0; mechanism.plate.position.y = .06;
            mechanism.root.visible = game.difficulty === 2;
        });
        game.premiumSectionComplete = false;
        game.altarActive = false; game.altarResolved = !ALTAR_ENABLED; game.altarFeedback = null;
        game.altarTimer = 0; game.altarAttempts = 0;
        game.guardianActive = false; game.guardianResolved = false; game.guardianFeedback = null;
        game.guardianTimer = 0; game.guardianAttempts = 0;
        Object.assign(game.guardianCombat, {
            active: false, phase: 'LOCKED', timer: 0, health: 0, maxHealth: 0,
            strikes: 0, hits: 0, dodges: 0, damageTaken: 0,
            contactResolved: false, recoveryHit: false
        });
        Object.assign(game.stalker, {
            active: false, resolved: !STALKER_ENABLED, phase: STALKER_ENABLED ? 'DORMANT' : 'DEFEATED', timer: 0,
            health: 0, maxHealth: 0, charges: 0, hits: 0, dodges: 0, damageTaken: 0,
            contactResolved: false, recoveryHit: false
        });
        game.maze.gates = [false, false, false]; game.maze.retries = 0;
        Object.assign(game.exploration, {
            active: false, completed: false, entered: false,
            runes: [false, false, false], blockedExits: 0
        });
        Object.assign(game.exploration.loop, {
            branch: 0, phase: 'CHOOSE', completed: false,
            blockedAttempts: 0, checkpoints: [false, false, false, false]
        });
        explorationRunes.forEach(({ root, haloMaterial, baseY }) => {
            root.visible = true; root.position.y = baseY; root.scale.setScalar(1); haloMaterial.opacity = .62;
        });
        game.cameraObstruction = null; game.fadedOccluders = [];
        cameraLandingKick = 0; motionController.setState('IDLE', { restart: true });
        explorer.scale.set(3.55, 3.55, 1); explorer.material.rotation = 0;
        explorer.material.color.set(0xffffff); explorer.material.opacity = 1; proceduralExplorer.resetAppearance(); backpackGlow.visible = false;
        portalVeil.visible = false; portalVeil.material.opacity = 0; renderer.toneMappingExposure = 1.2;
        afterImages.forEach(image => { image.visible = false; image.material.opacity = 0; });
        mathWave.visible = false; powerRing.visible = false; attackImpact.visible = false;
        mathSigns.forEach(({ faceMaterial }) => faceMaterial.color.set(0xffffff));
        altarBarrier.scale.x = 1; altarCore.scale.setScalar(1);
        altarSigils.forEach(({ group, faceMaterial }) => { group.visible = true; faceMaterial.color.set(0xffffff); });
        guardianRoot.position.copy(guardianBasePosition); guardianBarrier.scale.x = 1;
        guardianBody.rotation.set(0, 0, 0); guardianHead.rotation.set(0, 0, 0);
        guardianLeftArm.rotation.z = 0; guardianRightArm.rotation.z = 0;
        guardianCoreRunes.forEach(rune => { rune.visible = true; rune.scale.setScalar(1); });
        guardianSigils.forEach(({ group, faceMaterial }) => { group.visible = true; faceMaterial.color.set(0xffffff); });
        updateMathPresentation();
        updateHud();
    }
    function setPhase(phase) {
        game.phase = phase; game.phaseTimer = 0; game.lastCountdown = 4;
        game.tutorialMessage = null; game.questionVisible = null;
        if (!['PLAYING', 'PORTAL'].includes(phase)) {
            duoRace.context = null; duoRace.order = []; duoRace.rejoin = null;
            duoRace.players.forEach(player => Object.assign(player, { status: 'READY', visualLead: 0 }));
        }
        showScreen(phase);
        ui.hud.classList.toggle('active', ['PLAYING', 'PORTAL'].includes(phase));
        ui.question.classList.remove('active'); ui.duoMath?.classList.remove('active'); ui.tutorial.classList.remove('active');
        ui.intro.classList.remove('pre-title', 'title-only');
        if (phase === 'MENU') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED'; state.distance = portalDistance - 7;
            game.menuSelection = 0;
            // Update menu option selection
            ui.menuOptions.forEach((opt, i) => opt.classList.toggle('selected', i === 0));
        } else if (phase === 'SESSION') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED';
            syncSessionSetup();
        } else if (phase === 'DIFFICULTY') {
            game.selection = game.difficulty; select(ui.difficultyChoices, game.selection);
        } else if (phase === 'LEADERBOARD') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED';
            renderLeaderboard();
        } else if (phase === 'HISTORY') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED';
            renderHistory();
        } else if (phase === 'SETTINGS') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED';
            loadSettingsUI();
        } else if (phase === 'HELP') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED';
            game.menuSelection = 0;
        } else if (phase === 'LEVEL_INTRO') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED';
            game.menuSelection = 0;
        } else if (phase === 'INTRO') {
            if (game.levelStarted) {
                session.players.forEach((player, index) => Object.assign(player, session.levelStart[index]));
                session.activeIndex = session.levelStartActive;
            } else {
                session.levelStart = session.players.map(player => ({ ...player }));
                session.levelStartActive = session.activeIndex;
                game.levelStarted = true;
            }
            resetRunner(); motionController.setVisible(true); contactShadow.visible = true; contactCore.visible = true; runner.state = 'DISABLED'; motionController.setState('IDLE');
            ui.intro.classList.add('pre-title');
        } else if (phase === 'COUNTDOWN') {
            motionController.setVisible(true); contactShadow.visible = true; contactCore.visible = true; runner.state = 'DISABLED'; motionController.setState('IDLE'); ui.countdown.textContent = '3';
            ui.countdown.classList.remove('go');
        } else if (phase === 'PLAYING') {
            runner.state = 'RUN'; motionController.setVisible(true); contactShadow.visible = true; contactCore.visible = true; state.paused = false;
            recordPlaytest('RUN_STARTED', { guidance: profiles[game.difficulty].guidance });
        } else if (phase === 'RESULT') {
            motionController.setVisible(false); contactShadow.visible = false; contactCore.visible = false; runner.state = 'DISABLED'; game.menuSelection = 0;
            select(ui.resultChoices, 0);
            resultTitle.textContent = PREMIUM_WATERFALL_V2_REQUESTED && game.premiumSectionComplete
                ? 'SECCIÓN DEL SANTUARIO COMPLETADA'
                : duoEnabled() ? 'EXPEDICIÓN DE DOS COMPLETADA' :
                    LEVEL_INDEX < LEVELS.length - 1 ? 'PORTAL DESBLOQUEADO' : 'EXPEDICIÓN COMPLETADA';
            if (PREMIUM_WATERFALL_V2_REQUESTED && game.premiumSectionComplete) resultPrimary.textContent = 'REPETIR DEMOSTRACIÓN';
            const seconds = Math.floor(runner.gameplayTime);
            ui.resultTime.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            ui.resultAccuracy.textContent = `${runner.questions ? Math.round(runner.correct / runner.questions * 100) : 0}%`;
            ui.resultCombo.textContent = `x${runner.maxCombo}`; ui.resultLives.textContent = runner.lives;
            game.resultTarget = Math.round(runner.score); game.resultCount = 0; ui.resultScore.textContent = '0000';
            const accuracy = runner.questions ? runner.correct / runner.questions : 0;
            const rank = accuracy >= 1 && runner.lives >= 2 ? 'ORO' : accuracy >= .5 ? 'PLATA' : 'BRONCE';
            ui.resultRank.querySelector('b').textContent = rank; ui.resultRank.classList.remove('active'); renderResultPlayers(); audio.cue('result');
            recordPlaytest('RUN_COMPLETED', { rank, accuracy: Number(accuracy.toFixed(3)) }); savePlaytestReport();
        }
        const partnerVisible = duoEnabled() && ['INTRO', 'COUNTDOWN', 'PLAYING', 'PORTAL'].includes(phase);
        if (partnerVisible) void ensurePartnerLoaded().then(() => partnerController.setVisible(true));
        else partnerController.setVisible(false);
        partnerShadow.visible = partnerVisible; partnerCore.visible = partnerVisible;
    }

    function navigateMenu(direction) {
        if (game.phase === 'DIFFICULTY') {
            game.selection = (game.selection + direction + profiles.length) % profiles.length;
            select(ui.difficultyChoices, game.selection); audio.cue('confirm'); return;
        }
        if (game.phase === 'MENU') {
            game.menuSelection = (game.menuSelection + direction + ui.menuOptions.length) % ui.menuOptions.length;
            ui.menuOptions.forEach((opt, i) => opt.classList.toggle('selected', i === game.menuSelection));
            audio.cue('confirm'); return;
        }
        if (game.phase === 'SESSION') {
            game.menuSelection = (game.menuSelection + direction + ui.sessionModes.length) % ui.sessionModes.length;
            const mode = ui.sessionModes[game.menuSelection].dataset.sessionMode;
            setSessionMode(mode);
            audio.cue('confirm'); return;
        }
        if (game.phase === 'LEADERBOARD') {
            // Navigate leaderboard entries
            const entries = ui.leaderboardList.querySelectorAll('.leaderboard-entry');
            if (entries.length > 0) {
                game.menuSelection = (game.menuSelection + direction + entries.length) % entries.length;
                entries.forEach((entry, i) => entry.classList.toggle('selected', i === game.menuSelection));
                entries[game.menuSelection]?.scrollIntoView({ block: 'nearest' });
                audio.cue('confirm');
            }
            return;
        }
        if (game.phase === 'HISTORY') {
            const entries = ui.historyList.querySelectorAll('.history-entry');
            if (entries.length > 0) {
                game.menuSelection = (game.menuSelection + direction + entries.length) % entries.length;
                entries.forEach((entry, i) => entry.classList.toggle('selected', i === game.menuSelection));
                entries[game.menuSelection]?.scrollIntoView({ block: 'nearest' });
                audio.cue('confirm');
            }
            return;
        }
        if (game.phase === 'SETTINGS') {
            const focusable = [...ui.settingsAudioEnabled, ui.settingsMusicEnabled, ui.settingsSfxEnabled, ui.settingsGraphicsQuality, ui.settingsShadows, ui.settingsParticles, ui.settingsVibration, ui.settingsSensitivity, ui.settingsTestGamepad].filter(Boolean);
            if (focusable.length > 0) {
                game.menuSelection = (game.menuSelection + direction + focusable.length) % focusable.length;
                focusable[game.menuSelection]?.focus();
                audio.cue('confirm');
            }
            return;
        }
        if (game.phase === 'PAUSED') {
            game.menuSelection = (game.menuSelection + direction + ui.pauseChoices.length) % ui.pauseChoices.length;
            select(ui.pauseChoices, game.menuSelection); audio.cue('confirm'); return;
        }
        if (game.phase === 'RESULT') {
            game.menuSelection = (game.menuSelection + direction + ui.resultChoices.length) % ui.resultChoices.length;
            select(ui.resultChoices, game.menuSelection); audio.cue('confirm'); return;
        }
    }
    function confirm() {
        audio.ensure();
        if (game.phase === 'MENU') {
            const action = ui.menuOptions[game.menuSelection]?.dataset.menuAction;
            if (action === 'play') { confirmSweep(); audio.cue('start'); setPhase('SESSION'); }
            else if (action === 'leaderboard') { confirmSweep(); setPhase('LEADERBOARD'); }
            else if (action === 'history') { confirmSweep(); setPhase('HISTORY'); }
            else if (action === 'settings') { confirmSweep(); setPhase('SETTINGS'); }
            else if (action === 'controls') { confirmSweep(); setPhase('CONTROLS'); }
        } else if (game.phase === 'SESSION') { applySessionSetup(); }
        else if (game.phase === 'DIFFICULTY') { confirmSweep(); game.difficulty = game.selection; game.mastery.forEach(mechanism => { mechanism.root.visible = game.difficulty === 2; }); updateMathPresentation(); audio.cue('confirm'); setPhase('CONTROLS'); }
        else if (game.phase === 'CONTROLS') { audio.cue('confirm'); setPhase('LEVEL_INTRO'); }
        else if (game.phase === 'LEVEL_INTRO') { audio.cue('confirm'); setPhase('INTRO'); }
        else if (game.phase === 'INTRO') { audio.cue('confirm'); setPhase('COUNTDOWN'); }
        else if (game.phase === 'PLAYING') pause();
        else if (game.phase === 'PAUSED') {
            if (game.menuSelection === 0) resume();
            else if (game.menuSelection === 1) showHelp();
            else if (game.menuSelection === 2) setPhase('INTRO');
            else setPhase('MENU');
        } else if (game.phase === 'RESULT') {
            if (game.menuSelection === 0) {
                confirmSweep();
                const nextLevel = LEVEL_INDEX < LEVELS.length - 1 ? LEVEL.number + 1 : 1;
                const next = new URL(location.href);
                next.searchParams.set('level', String(nextLevel));
                next.searchParams.set('difficulty', String(game.difficulty));
                if (LEVEL_INDEX < LEVELS.length - 1) {
                    next.searchParams.set('campaign', '1');
                    next.searchParams.set('campaignScore', String(Math.round(runner.score)));
                    writeSessionQuery(next, true);
                } else {
                    next.searchParams.set('mathSet', String((MATH_SET + 1) % 2));
                    next.searchParams.delete('campaign');
                    next.searchParams.delete('campaignScore');
                    writeSessionQuery(next, false);
                }
                location.href = next.toString();
            } else setPhase('MENU');
        } else if (game.phase === 'LEADERBOARD' || game.phase === 'HISTORY' || game.phase === 'SETTINGS') {
            setPhase('MENU');
        } else if (game.phase === 'HELP') {
            setPhase('PAUSED');
        } else if (game.phase === 'LEVEL_INTRO') {
            setPhase('PAUSED');
        }
    }
    function showHelp() {
        const levelHelp = HELP_CONTENT[LEVEL_INDEX];
        let html = `<h3>${levelHelp.title}</h3>
        <p class="note">${levelHelp.theme}</p>
        <h3>OBJETIVO</h3>
        <p>${levelHelp.objective}</p>
        <h3>OBSTÁCULOS</h3>
        <ul>`;
        levelHelp.obstacles.forEach(obs => {
            html += `<li><b>${obs.name}</b> — ${obs.key} ${obs.desc}</li>`;
        });
        html += `</ul>
        <h3>MATEMÁTICAS</h3>
        <p>${levelHelp.math}</p>
        <h3>ALTAR</h3>
        <p>${levelHelp.altar}</p>
        <h3>GUARDIÁN</h3>
        <p>${levelHelp.guardian}</p>
        <h3>LABERINTO</h3>
        <p>${levelHelp.labyrinth}</p>
        <h3>CONTROLES</h3>
        <ul>
            <li>Mover: ${levelHelp.controls.move}</li>
            <li>Saltar: ${levelHelp.controls.jump}</li>
            <li>Deslizar: ${levelHelp.controls.slide}</li>
            <li>Dash: ${levelHelp.controls.dash}</li>
            <li>Atacar: ${levelHelp.controls.attack}</li>
            <li>Poder: ${levelHelp.controls.power}</li>
            <li>Responder: ${levelHelp.controls.answer}</li>
        </ul>
        <div class="duo-note">${levelHelp.duo}</div>
        <h3>GENERAL</h3>
        ${GENERAL_HELP.controls}
        ${GENERAL_HELP.difficulties}
        ${GENERAL_HELP.ucom}
        ${GENERAL_HELP.duo}`;
        ui.helpContent.innerHTML = html;
        ui.helpTitle.textContent = levelHelp.title;
        setPhase('HELP');
    }
    function pause() {
        if (!['PLAYING', 'PORTAL'].includes(game.phase)) return;
        game.pausedFrom = game.phase; game.menuSelection = 0; select(ui.pauseChoices, 0); setPhase('PAUSED');
    }
    function resume() {
        game.phase = game.pausedFrom; game.phaseTimer = 0; showScreen(game.phase);
        ui.hud.classList.add('active'); runner.state = runner.jumpY > 0 ? 'JUMP' : 'RUN';
    }
    function requestJump() {
        if (runner.jumpY > .001 || runner.jumpAnticipation > 0 || runner.slideTimer > 0 || runner.slideAnticipation > 0 || runner.hitTimer > 0) return;
        runner.jumpAnticipation = .12; runner.state = 'JUMP'; runner.tutorial.jump = true;
    }
    function requestSlide() {
        if (runner.jumpY > .01 || runner.jumpAnticipation > 0 || runner.slideTimer > 0 || runner.slideAnticipation > 0 || runner.hitTimer > 0) return;
        runner.slideAnticipation = .1; runner.state = 'SLIDE'; runner.tutorial.slide = true;
    }
    function requestPlayerSlide(playerIndex) {
        const player = duoRace.players[playerIndex];
        if (!duoEnabled() || !player || player.slideTimer > 0 || player.slideAnticipation > 0 || runner.hitTimer > 0) return false;
        player.slideAnticipation = .1;
        runner.tutorial.slide = true;
        return true;
    }
    function requestDash() {
        if (runner.dashCooldown > 0 || runner.hitTimer > 0) return;
        runner.dashTimer = .46; runner.dashFlashTimer = .13; runner.dashCooldown = 2.5; runner.state = 'DASH'; runner.tutorial.dash = true;
        runner.score += Math.round(100 * profiles[game.difficulty].multiplier); audio.cue('dash'); updateHud();
    }
    function requestAttack() {
        if (runner.hitTimer > 0 || runner.attackTimer > 0) return;
        runner.attackTimer = .42; runner.attackImpactTimer = .24; attackPulse.visible = true; attackPulse.scale.setScalar(.25); audio.cue('attack');
        if (!strikeStalkerCore() && !strikeGuardianBlocker()) strikeGuardianCore();
    }

    function strikeGuardianBlocker() {
        const combat = game.guardianCombat;
        if (!game.stalker.resolved || game.guardianResolved || game.guardianActive ||
            state.distance < guardianStopDistance - 1.15 || !['BLOCKING', 'BLOCK_STAGGER'].includes(combat.phase)) return false;
        combat.hits = Math.min(3, combat.hits + 1);
        combat.health = Math.max(0, 3 - combat.hits);
        combat.phase = combat.hits >= 3 ? 'QUESTION' : 'BLOCK_STAGGER';
        combat.timer = combat.hits >= 3 ? 0 : .34;
        runner.score += Math.round(90 * profiles[game.difficulty].multiplier);
        guardianCoreRunes.forEach((rune, index) => { rune.visible = index < combat.health; });
        guardianLight.color.set(0xffd36a); guardianLight.intensity = 8.2;
        if (combat.hits >= 3) {
            game.guardianActive = true;
            toast('TRES SELLOS ROTOS · RESPONDE PARA QUE EL GIGANTE LIBERE EL PASO', 2.1);
            audio.cue('correct');
        } else {
            toast(`GOLPE ${combat.hits}/3 · ROMPE LOS SELLOS DEL GIGANTE`, 1.05);
            audio.cue('attack');
        }
        updateHud();
        return true;
    }

    function strikeStalkerCore() {
        const combat = game.stalker;
        if (!combat.active || combat.phase !== 'RECOVERY' || combat.recoveryHit) return false;
        combat.recoveryHit = true; combat.hits++; combat.health = Math.max(0, combat.health - 1);
        runner.score += Math.round(150 * profiles[game.difficulty].multiplier);
        stalkerRunes.forEach((rune, index) => { rune.visible = index < combat.health; });
        stalkerLight.color.set(0xffd36a); stalkerLight.intensity = 7.2;
        if (combat.health <= 0) {
            combat.active = false; combat.resolved = true; combat.phase = 'DEFEATED'; combat.timer = 1.15;
            runner.combo++; runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
            toast(`${stalkerNames[LEVEL_INDEX]} DERROTADO · AVANZA AL GUARDIÁN`, 1.8); audio.cue('correct');
        } else {
            combat.phase = 'STAGGER'; combat.timer = .46;
            toast(`CAPARAZÓN ROTO · ${combat.health} RUNA${combat.health === 1 ? '' : 'S'}`, .9); audio.cue('attack');
        }
        updateHud();
        return true;
    }

    function strikeGuardianCore() {
        const combat = game.guardianCombat;
        if (!combat.active || combat.phase !== 'RECOVERY' || combat.recoveryHit) return false;
        combat.recoveryHit = true;
        combat.hits++;
        combat.health = Math.max(0, combat.health - 1);
        runner.score += Math.round(175 * profiles[game.difficulty].multiplier);
        guardianCoreRunes.forEach((rune, index) => { rune.visible = index < combat.health; });
        guardianLight.color.set(0xffd36a); guardianLight.intensity = 8.5;
        if (combat.health <= 0) {
            combat.active = false; combat.phase = 'DEFEATED'; combat.timer = 0;
            game.guardianFeedback = 'correct'; game.guardianTimer = 1.55;
            runner.combo++; runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
            toast(`${LEVEL.guardian} DERROTADO · RUTA LIBERADA`, 2.0);
            audio.cue('correct');
        } else {
            combat.phase = 'STAGGER'; combat.timer = .42;
            toast(`NÚCLEO IMPACTADO · ${combat.health} SELLO${combat.health === 1 ? '' : 'S'} RESTANTE${combat.health === 1 ? '' : 'S'}`, 1.0);
            audio.cue('attack');
        }
        updateHud();
        return true;
    }
    function requestPower() {
        if (runner.energy <= 0) {
            toast('ENERGÍA Σ INSUFICIENTE'); ui.energyPanel.classList.remove('denied'); void ui.energyPanel.offsetWidth;
            ui.energyPanel.classList.add('denied'); setTimeout(() => ui.energyPanel.classList.remove('denied'), 700);
            audio.cue('wrong'); return;
        }
        runner.energy--; runner.shieldTimer = 3.0; runner.powerActivationTimer = .55; shield.visible = true;
        toast('ESCUDO Σ ACTIVADO'); audio.cue('power'); updateHud();
    }
    function normalizedProblem(problem, context) {
        return {
            prompt: problem.prompt,
            choices: [...problem.choices],
            answer: problem.answer,
            correctIndex: context === 'ROUTE' ? problem.correctLane + 1 : problem.correctIndex
        };
    }
    function duoProblemCandidates(context) {
        const replay = MATH_REPLAY_SETS[LEVEL_INDEX];
        const alternateMath = ACTIVE_MATH === LEVEL ? replay : LEVEL;
        const key = context === 'ROUTE' ? 'questions' : context === 'ALTAR' ? 'altarQuestions' : 'guardianQuestions';
        if (context.startsWith('MASTERY_')) {
            const index = Number(context.split('_')[1]);
            return index === 0
                ? [
                    normalizedProblem(replay.questions[2], 'ROUTE'),
                    normalizedProblem(LEVEL.altarQuestions[2], 'ALTAR')
                ]
                : [
                    normalizedProblem(replay.altarQuestions[2], 'ALTAR'),
                    normalizedProblem(LEVEL.guardianQuestions[2], 'ALTAR')
                ];
        }
        const activeQuestions = ACTIVE_MATH[key][game.difficulty];
        const replayQuestions = replay[key][game.difficulty];
        const alternateQuestions = alternateMath[key][game.difficulty];
        const candidates = [
            normalizedProblem(activeQuestions, context),
            normalizedProblem(replayQuestions, context),
            normalizedProblem(alternateQuestions, context)
        ];
        const seen = new Set();
        return candidates.filter(p => {
            if (seen.has(p.prompt)) return false;
            seen.add(p.prompt);
            return true;
        });
    }
    function duoProblem(context, alternate = false, previousProblem = null, wrongCount = 0) {
        const candidates = duoProblemCandidates(context);
        if (!alternate || !previousProblem) return candidates[0];
        const filtered = candidates.filter(p => p.prompt !== previousProblem.prompt);
        if (filtered.length === 0) return candidates[0];
        const index = Math.min(wrongCount, filtered.length - 1);
        return filtered[index];
    }
    function beginDuoChallenge(context) {
        if (!duoEnabled() || duoRace.context === context) return;
        duoRace.context = context; duoRace.order = []; duoRace.rejoin = null;
        duoRace.players.forEach(player => Object.assign(player, {
            status: 'ANSWERING', problem: duoProblem(context, false), startedAt: runner.gameplayTime,
            responseMs: 0, wrongFlash: 0, visualLead: 0,
            wrongCount: 0
        }));
        session.activeIndex = 0;
        updateHud();
        updateDuoMathSigns(context);
    }
    function duoCrossingLead(context) {
        if (context === 'ROUTE') return 7.15;
        if (context === 'ALTAR') return 6.65;
        if (context === 'GUARDIAN') return 7.35;
        return 4.45;
    }
    function finishDuoWorldChallenge(context) {
        if (context === 'ROUTE') {
            const problem = ACTIVE_MATH.questions[game.difficulty];
            runner.mathResolved = true; game.routeChoice = problem.correctLane;
            game.routeGateActive = false; game.routeGateCommitted = false;
            game.routeGateFeedback = 'correct'; game.routeGateTimer = .72;
            mathSigns.forEach(({ lane, faceMaterial }) => faceMaterial.color.set(lane === problem.correctLane ? 0x7ffff4 : 0xffffff));
        } else if (context === 'ALTAR') {
            game.altarResolved = true; game.altarActive = false;
            game.altarFeedback = 'correct'; game.altarTimer = 1.1;
            altarSigils.forEach(({ faceMaterial }, index) => faceMaterial.color.set(index === altarQuestion.correctIndex ? 0x79fff2 : 0xffffff));
        } else if (context === 'GUARDIAN') {
            game.guardianResolved = true; game.guardianActive = false;
            game.guardianFeedback = 'correct'; game.guardianTimer = 1.55;
            game.guardianCombat.phase = 'RELEASED';
            // Giant lifts hand animation - no combat phase needed
            // Both players can now proceed to the portal
            toast('¡EL GIGANTE LEVANTA LA MANO · PASO LIBRE!', 2);
            audio.cue('correct');
            guardianCoreRunes.forEach((rune, runeIndex) => {
                rune.visible = runeIndex < game.guardianCombat.health; rune.scale.setScalar(1);
            });
        } else if (context.startsWith('MASTERY_')) {
            const index = Number(context.split('_')[1]);
            const mechanism = game.mastery[index];
            mechanism.resolved = true; mechanism.active = false; game.masteryActive = null;
        }
        const leaderIndex = duoRace.order[0];
        const leadOffset = duoRace.players[leaderIndex]?.visualLead || duoCrossingLead(context);
        duoRace.rejoin = { leaderIndex, anchorDistance: state.distance, leadOffset };
        duoRace.players.forEach((racePlayer, index) => {
            racePlayer.status = index === leaderIndex ? 'REJOINING' : 'RUNNING';
            if (index !== leaderIndex) racePlayer.visualLead = 0;
        });
        runner.correct += 2; runner.energy = Math.min(5, runner.energy + 1);
        runner.combo++; runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
        duoRace.context = null; session.activeIndex = 0;
        // Clear any pending penalty timer
        duoRace.penaltyTimer = 0;
        duoRace.penaltyActive = false;
        toast(context === 'GUARDIAN' ? 'AMBOS EXPLORADORES PASAN · RUTA LIBERADA' : 'EQUIPO COMPLETO · MECANISMO DESBLOQUEADO', 2);
        audio.cue('correct'); updateHud();
    }
    function resolveDuoAnswer(context, playerIndex, answerIndex) {
        if (!duoEnabled()) return null;
        beginDuoChallenge(context);
        if (duoRace.context !== context || ![0, 1].includes(playerIndex)) return false;
        const racePlayer = duoRace.players[playerIndex];
        if (racePlayer.status !== 'ANSWERING') return false;
        const player = session.players[playerIndex];
        const elapsedMs = Math.max(100, Math.round((runner.gameplayTime - racePlayer.startedAt) * 1000));
        player.answers++; runner.questions++;
        const correct = answerIndex === racePlayer.problem.correctIndex;
        if (!correct) {
            racePlayer.wrongCount++;
            racePlayer.wrongFlash = .6; racePlayer.problem = duoProblem(context, true, racePlayer.problem, racePlayer.wrongCount);
            player.score = Math.max(0, player.score - 80); runner.score = Math.max(0, runner.score - 80); runner.combo = 1;
            toast(`${player.name} · RESPUESTA INCORRECTA · NUEVO RETO`, 1.25); audio.cue('wrong'); updateHud();
            console.log('[resolveDuoAnswer] incorrect answer, new problem:', racePlayer.problem?.prompt, 'choices:', racePlayer.problem?.choices, 'wrongCount:', racePlayer.wrongCount);
            updateDuoMathSigns(context);
            return false;
        }
        racePlayer.wrongCount = 0;
        const first = duoRace.order.length === 0;
        const base = context === 'ROUTE' ? 750 : context === 'ALTAR' ? 900 : context === 'GUARDIAN' ? 1100 : 640;
        const speedBonus = Math.max(0, 360 - Math.round(elapsedMs / 35));
        const points = Math.round(base * profiles[game.difficulty].multiplier + speedBonus + (first ? 220 : 0));
        Object.assign(racePlayer, {
            status: 'WAITING', responseMs: elapsedMs,
            visualLead: first ? duoCrossingLead(context) : 0
        });
        duoRace.order.push(playerIndex);
        player.correct++; player.score += points; player.responseMs += elapsedMs;
        if (first) player.challengeWins++;
        runner.score += points;
        if (first) {
            const otherIndex = 1 - playerIndex;
            const other = duoRace.players[otherIndex];
            // Keep the shared challenge clock running. The remaining explorer
            // receives a fresh question, but their total response time still
            // includes the time spent at the original gate.
            other.problem = duoProblem(context, true, other.problem, 0);
            session.activeIndex = otherIndex;
            // Update 3D math signs for the second player's new question
            console.log('[resolveDuoAnswer] first correct, other player:', otherIndex, 'new problem:', other.problem?.prompt, 'choices:', other.problem?.choices);
            updateDuoMathSigns(context);
            // Activate progressive penalty for the waiting player
            duoRace.penaltyActive = true;
            duoRace.penaltyTimer = 0;
            toast(`${player.name} PASÓ PRIMERO · ${session.players[otherIndex].name} RECIBE OTRO RETO`, 2);
            audio.cue('correct'); updateHud(); return true;
        }
        finishDuoWorldChallenge(context);
        return true;
    }
    function resolveMasteryAnswer(index) {
        const mechanismIndex = game.masteryActive;
        if (mechanismIndex === null) return false;
        const context = `MASTERY_${mechanismIndex}`;
        if (duoEnabled()) return resolveDuoAnswer(context, session.activeIndex, index);
        const mechanism = game.mastery[mechanismIndex];
        const problem = duoProblem(context, false);
        mechanism.attempts++; runner.questions++;
        if (index !== problem.correctIndex) {
            recordMathAttempt(false);
            runner.combo = 1; runner.score = Math.max(0, runner.score - 100);
            toast('SELLO MAESTRO INCORRECTO · LA PLACA SIGUE BLOQUEADA', 1.35); audio.cue('wrong'); return false;
        }
        mechanism.resolved = true; mechanism.active = false; game.masteryActive = null;
        runner.correct++; runner.combo++; runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
        const points = Math.round(640 * profiles[game.difficulty].multiplier);
        runner.score += points; recordMathAttempt(true, points);
        toast('PLACA MAESTRA ACTIVADA · SELLO RETRAÍDO', 1.55); audio.cue('correct'); updateHud(); return true;
    }
    function resolveGuardianAnswer(index) {
        if (duoEnabled()) return resolveDuoAnswer('GUARDIAN', session.activeIndex, index);
        if (!game.guardianActive || game.guardianResolved || game.guardianTimer > 0) return false;
        const respondent = activePlayer().name;
        game.guardianAttempts++;
        runner.questions++;
        const correct = index === guardianQuestion.correctIndex;
        resolveQuestionPlaytest('GUARDIAN', correct);
        guardianSigils[index].faceMaterial.color.set(correct ? 0x79fff2 : 0xff795c);
        if (correct) {
            game.guardianResolved = true;
            game.guardianActive = false;
            game.guardianFeedback = 'correct'; game.guardianTimer = 1.55;
            game.guardianCombat.phase = 'RELEASED';
            // Giant lifts hand - no combat phase
            toast('¡EL GIGANTE LEVANTA LA MANO · PASO LIBRE!', 2);
            audio.cue('correct');
            runner.correct++;
            runner.energy = Math.min(5, runner.energy + 1);
            runner.combo++;
            runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
            const points = Math.round(1100 * profiles[game.difficulty].multiplier);
            runner.score += points; recordMathAttempt(true, points);
        } else {
            recordMathAttempt(false);
            game.guardianActive = false;
            game.guardianFeedback = 'wrong';
            game.guardianTimer = 1.25;
            hit(`EL ${LEVEL.guardian} TE RECHAZA · INTENTA OTRA VEZ`);
            state.distance = Math.max(guardianStopDistance - 5.8, state.distance - 5.8);
            runner.lastDistance = state.distance;
            runner.lateralVelocity = -runner.lateral * 1.8;
        }
        advanceResponder();
        updateHud();
        return correct;
    }
    function resolveAltarAnswer(index) {
        if (duoEnabled()) return resolveDuoAnswer('ALTAR', session.activeIndex, index);
        if (!game.altarActive || game.altarResolved || game.altarTimer > 0) return false;
        const respondent = activePlayer().name;
        game.altarAttempts++;
        runner.questions++;
        const correct = index === altarQuestion.correctIndex;
        resolveQuestionPlaytest('ALTAR', correct);
        altarSigils[index].faceMaterial.color.set(correct ? 0x79fff2 : 0xff795c);
        if (correct) {
            game.altarResolved = true; game.altarActive = false;
            game.altarFeedback = 'correct'; game.altarTimer = 1.1;
            runner.correct++; runner.energy = Math.min(5, runner.energy + 1);
            runner.combo++; runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
            const points = Math.round(900 * profiles[game.difficulty].multiplier);
            runner.score += points; recordMathAttempt(true, points);
            toast(`${respondent} · ALTAR: ${altarQuestion.answer} · MECANISMO ABIERTO`, 1.8);
            audio.cue('correct');
        } else {
            recordMathAttempt(false);
            game.altarActive = false; game.altarFeedback = 'wrong'; game.altarTimer = .8;
            hit('EL ALTAR RECHAZA LA RESPUESTA · INTENTA OTRA VEZ');
            state.distance = Math.max(altarStopDistance - 2.7, state.distance - 2.7);
            runner.lastDistance = state.distance;
            runner.lateralVelocity = -runner.lateral * 1.4;
        }
        advanceResponder();
        updateHud();
        return correct;
    }
    function selectRouteAnswer(index) {
        if (duoEnabled()) return resolveDuoAnswer('ROUTE', session.activeIndex, index);
        if (!game.routeGateActive || game.routeGateTimer > 0 || runner.mathResolved) return false;
        const lane = index - 1;
        game.routeGateCommitted = true;
        game.routeGateSelectedLane = lane;
        game.routeChoice = lane;
        game.routeGateTimer = .18;
        runner.targetLateral = lane * 2.3;
        runner.mathFeedbackLane = lane;
        runner.mathFeedbackCorrect = lane === ACTIVE_MATH.questions[game.difficulty].correctLane;
        runner.mathFeedbackTimer = .34;
        resolveQuestionPlaytest('ROUTE', runner.mathFeedbackCorrect);
        toast(`RUTA ${String.fromCharCode(65 + index)} SELECCIONADA`, .8);
        audio.cue('confirm');
        return true;
    }
    const heldActions = new Set([ACTIONS.MOVE_LEFT, ACTIONS.MOVE_RIGHT, ACTIONS.JUMP, ACTIONS.SLIDE]);
    const gameplayActions = new Set([
        ACTIONS.MOVE_LEFT, ACTIONS.MOVE_RIGHT, ACTIONS.JUMP, ACTIONS.SLIDE,
        ACTIONS.ATTACK, ACTIONS.DASH, ACTIONS.POWER,
        ACTIONS.ANSWER_A, ACTIONS.ANSWER_B, ACTIONS.ANSWER_C
    ]);
    function answerContextActive() { return game.guardianActive || game.altarActive || game.routeGateActive || game.masteryActive !== null; }
    function actionForCode(code) {
        if (code === 'KeyM') return ACTIONS.TOGGLE_AUDIO;
        if (code === 'Enter') return ACTIONS.CONFIRM;
        if (code === 'Escape') return ACTIONS.PAUSE;
        if (['MENU', 'SESSION', 'DIFFICULTY', 'PAUSED', 'RESULT', 'LEVEL_INTRO'].includes(game.phase)) {
            if (code === 'ArrowUp' || code === 'KeyW') return ACTIONS.NAV_PREVIOUS;
            if (code === 'ArrowDown' || code === 'KeyS') return ACTIONS.NAV_NEXT;
            if (code === 'ArrowLeft' || code === 'KeyA') return ACTIONS.NAV_PREVIOUS;
            if (code === 'ArrowRight' || code === 'KeyD') return ACTIONS.NAV_NEXT;
        }
        if (game.phase === 'PLAYING' && answerContextActive()) {
            if (code === 'KeyA') return ACTIONS.ANSWER_A;
            if (code === 'KeyB') return ACTIONS.ANSWER_B;
            if (code === 'KeyC') return ACTIONS.ANSWER_C;
        }
        return ({
            ArrowLeft: ACTIONS.MOVE_LEFT, KeyA: ACTIONS.MOVE_LEFT,
            ArrowRight: ACTIONS.MOVE_RIGHT, KeyD: ACTIONS.MOVE_RIGHT,
            ArrowUp: ACTIONS.JUMP, KeyW: ACTIONS.JUMP,
            ArrowDown: ACTIONS.SLIDE, KeyS: ACTIONS.SLIDE,
            KeyJ: ACTIONS.ATTACK, KeyK: ACTIONS.DASH, KeyL: ACTIONS.POWER
        })[code] || null;
    }
    function duoAnswerForCode(code) {
        if (!duoEnabled() || game.phase !== 'PLAYING' || !answerContextActive()) return null;
        const p1 = { KeyA: 0, KeyB: 1, KeyC: 2 };
        const p2 = { KeyU: 0, KeyI: 1, KeyO: 2 };
        if (code in p1) return { playerIndex: 0, answerIndex: p1[code] };
        if (code in p2) return { playerIndex: 1, answerIndex: p2[code] };
        return null;
    }
    function dispatchPlayerAnswer(playerIndex, answerIndex) {
        if (game.masteryActive !== null) return resolveDuoAnswer(`MASTERY_${game.masteryActive}`, playerIndex, answerIndex);
        if (game.guardianActive) return resolveDuoAnswer('GUARDIAN', playerIndex, answerIndex);
        if (game.altarActive) return resolveDuoAnswer('ALTAR', playerIndex, answerIndex);
        if (game.routeGateActive) return resolveDuoAnswer('ROUTE', playerIndex, answerIndex);
        return false;
    }
    function recordInputAction(action, source) {
        if (!playtest.enabled || game.phase !== 'PLAYING' || !gameplayActions.has(action)) return;
        playtest.lastGameplayActionAt = runner.gameplayTime;
        if (playtest.firstGameplayActionAt === null) {
            playtest.firstGameplayActionAt = runner.gameplayTime;
            recordPlaytest('FIRST_ACTION', { action, source, responseSeconds: Number(runner.gameplayTime.toFixed(2)) });
        } else recordPlaytest('ACTION', { action, source });
    }
    function dispatchAction(action, source = 'api') {
        if (!action) return false;
        audio.ensure(); recordInputAction(action, source);
        if (action === ACTIONS.TOGGLE_AUDIO) { audio.setMuted(!audio.muted); return true; }
        if (action === ACTIONS.CONFIRM) { confirm(); return true; }
        if (action === ACTIONS.PAUSE) { if (game.phase === 'PAUSED') resume(); else pause(); return true; }
        if (action === ACTIONS.NAV_PREVIOUS) { navigateMenu(-1); return true; }
        if (action === ACTIONS.NAV_NEXT) { navigateMenu(1); return true; }
        if (game.phase !== 'PLAYING') return false;
        if ([ACTIONS.ANSWER_A, ACTIONS.ANSWER_B, ACTIONS.ANSWER_C].includes(action)) {
            const index = action === ACTIONS.ANSWER_A ? 0 : action === ACTIONS.ANSWER_B ? 1 : 2;
            if (game.masteryActive !== null) return resolveMasteryAnswer(index);
            if (game.guardianActive) return resolveGuardianAnswer(index);
            if (game.altarActive) return resolveAltarAnswer(index);
            if (game.routeGateActive) return selectRouteAnswer(index);
            return false;
        }
        if (game.exploration.active && (action === ACTIONS.JUMP || action === ACTIONS.SLIDE)) return true;
        if (action === ACTIONS.JUMP) requestJump();
        else if (action === ACTIONS.SLIDE) duoEnabled() ? requestPlayerSlide(0) : requestSlide();
        else if (action === ACTIONS.DASH) requestDash();
        else if (action === ACTIONS.ATTACK) requestAttack();
        else if (action === ACTIONS.POWER) requestPower();
        return true;
    }
    function pressCode(code, source) {
        const action = actionForCode(code);
        game.keys.add(code);
        if (heldActions.has(action)) game.actions.add(action);
        game.actionByCode.set(code, action);
        return dispatchAction(action, source);
    }
    function releaseCode(code) {
        const action = game.actionByCode.get(code);
        game.keys.delete(code); game.actionByCode.delete(code);
        if (action && ![...game.actionByCode.values()].includes(action)) game.actions.delete(action);
    }
    function setAbstractAction(action, pressed = true, source = 'external') {
        const normalized = String(action || '').toUpperCase();
        if (!Object.values(ACTIONS).includes(normalized)) return false;
        if (heldActions.has(normalized)) {
            if (pressed) game.actions.add(normalized); else game.actions.delete(normalized);
        }
        return pressed ? dispatchAction(normalized, source) : true;
    }
    function setPlayerAction(playerIndex, action, pressed = true, source = 'external-player') {
        const normalized = String(action || '').toUpperCase();
        const answerIndex = normalized === ACTIONS.ANSWER_A ? 0 : normalized === ACTIONS.ANSWER_B ? 1 : normalized === ACTIONS.ANSWER_C ? 2 : -1;
        if (!pressed) return true;
        const normalizedPlayer = Number(playerIndex);
        if (![0, 1].includes(normalizedPlayer)) return false;
        recordInputAction(normalized, source);
        if (normalized === ACTIONS.SLIDE) return requestPlayerSlide(normalizedPlayer);
        if (answerIndex < 0) return false;
        return dispatchPlayerAnswer(normalizedPlayer, answerIndex);
    }
    function onKeyDown(event) {
        if (event.target instanceof HTMLInputElement) return;
        const code = event.code;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) event.preventDefault();
        if (event.repeat) return;
        const duoAnswer = duoAnswerForCode(code);
        if (duoAnswer) {
            event.preventDefault();
            dispatchPlayerAnswer(duoAnswer.playerIndex, duoAnswer.answerIndex);
            return;
        }
        if (duoEnabled() && game.phase === 'PLAYING' && code === 'KeyN') {
            event.preventDefault();
            requestPlayerSlide(1);
            return;
        }
        pressCode(code, 'keyboard');
    }
    function onKeyUp(event) { releaseCode(event.code); }
    ui.sessionModes.forEach(button => button.addEventListener('click', () => {
        setSessionMode(button.dataset.sessionMode); audio.ensure(); audio.cue('confirm');
    }));
    ui.audioToggle?.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); audio.toggleMuted(); });
    ui.sessionForm.addEventListener('submit', event => { event.preventDefault(); audio.ensure(); applySessionSetup(); });
    function releaseTouch(button, code) {
        releaseCode(code); button.classList.remove('is-pressed');
    }
    ui.touchButtons.forEach(button => {
        const code = button.dataset.touchCode;
        button.addEventListener('pointerdown', event => {
            if (!touchEnabled) return;
            event.preventDefault(); button.setPointerCapture?.(event.pointerId);
            button.classList.add('is-pressed'); pressCode(code, 'touch');
        });
        button.addEventListener('pointerup', () => releaseTouch(button, code));
        button.addEventListener('pointercancel', () => releaseTouch(button, code));
        button.addEventListener('lostpointercapture', () => releaseTouch(button, code));
    });
    ui.touchPause?.addEventListener('pointerdown', event => { event.preventDefault(); dispatchAction(ACTIONS.PAUSE, 'touch'); });
    document.querySelector('#menu-screen')?.addEventListener('pointerdown', () => { if (touchEnabled && game.phase === 'MENU') confirm(); });
    ui.difficultyChoices.forEach((choice, index) => choice.addEventListener('pointerdown', event => {
        if (!touchEnabled || game.phase !== 'DIFFICULTY') return;
        event.preventDefault(); game.selection = index; select(ui.difficultyChoices, index); confirm();
    }));
    document.querySelector('#controls-screen')?.addEventListener('pointerdown', () => { if (touchEnabled && game.phase === 'CONTROLS') confirm(); });
    ui.intro?.addEventListener('pointerdown', () => { if (touchEnabled && game.phase === 'INTRO') confirm(); });
    ui.levelIntroScreen?.addEventListener('pointerdown', () => { if (touchEnabled && game.phase === 'LEVEL_INTRO') confirm(); });
    document.querySelector('#help-screen')?.addEventListener('pointerdown', () => { if (touchEnabled && game.phase === 'HELP') confirm(); });
    ui.pauseChoices.forEach((choice, index) => choice.addEventListener('pointerdown', event => {
        if (!touchEnabled || game.phase !== 'PAUSED') return;
        event.preventDefault(); game.menuSelection = index; select(ui.pauseChoices, index); confirm();
    }));
    ui.resultChoices.forEach((choice, index) => choice.addEventListener('pointerdown', event => {
        if (!touchEnabled || game.phase !== 'RESULT') return;
        event.preventDefault(); game.menuSelection = index; select(ui.resultChoices, index); confirm();
    }));
    addEventListener('keydown', onKeyDown, { passive: false }); addEventListener('keyup', onKeyUp);

    // Menu option handlers (main menu navigation)
    ui.menuOptions.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.menuAction;
            audio.ensure(); audio.cue('confirm');
            if (action === 'play') setPhase('SESSION');
            else if (action === 'leaderboard') { setPhase('LEADERBOARD'); renderLeaderboard(); }
            else if (action === 'history') { setPhase('HISTORY'); renderHistory(); }
            else if (action === 'settings') { setPhase('SETTINGS'); loadSettingsUI(); }
            else if (action === 'controls') setPhase('CONTROLS');
        });
        button.addEventListener('pointerdown', () => {
            if (touchEnabled) button.classList.add('selected');
        });
        button.addEventListener('pointerup', () => button.classList.remove('selected'));
    });

    // Leaderboard tab handlers
    ui.leaderboardTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            ui.leaderboardTabs.forEach(t => t.classList.remove('selected'));
            tab.classList.add('selected');
            tab.setAttribute('aria-selected', 'true');
            ui.leaderboardTabs.forEach((t, i) => { if (i !== index) t.setAttribute('aria-selected', 'false'); });
            currentLeaderboardFilter = tab.dataset.filter;
            renderLeaderboard();
            audio.ensure(); audio.cue('confirm');
        });
    });
    let currentLeaderboardFilter = 'all';

    // Settings handlers
    function loadSettingsUI() {
        const saved = JSON.parse(localStorage.getItem('mathquest-settings-v1') || '{}');
        ui.settingsAudioEnabled.checked = saved.audioEnabled !== false;
        ui.settingsMusicEnabled.checked = saved.musicEnabled !== false;
        ui.settingsSfxEnabled.checked = saved.sfxEnabled !== false;
        ui.settingsGraphicsQuality.value = saved.graphicsQuality || 'medium';
        ui.settingsShadows.checked = saved.shadows !== false;
        ui.settingsParticles.checked = saved.particles !== false;
        ui.settingsVibration.checked = saved.vibration !== false;
        ui.settingsSensitivity.value = saved.sensitivity || 'medium';
    }
    function saveSettingsUI() {
        const settings = {
            audioEnabled: ui.settingsAudioEnabled.checked,
            musicEnabled: ui.settingsMusicEnabled.checked,
            sfxEnabled: ui.settingsSfxEnabled.checked,
            graphicsQuality: ui.settingsGraphicsQuality.value,
            shadows: ui.settingsShadows.checked,
            particles: ui.settingsParticles.checked,
            vibration: ui.settingsVibration.checked,
            sensitivity: ui.settingsSensitivity.value
        };
        localStorage.setItem('mathquest-settings-v1', JSON.stringify(settings));
        // Apply audio settings
        if (audio.context) audio.setMuted(!settings.audioEnabled);
    }
    [ui.settingsAudioEnabled, ui.settingsMusicEnabled, ui.settingsSfxEnabled, ui.settingsGraphicsQuality, ui.settingsShadows, ui.settingsParticles, ui.settingsVibration, ui.settingsSensitivity].forEach(el => {
        if (el) el.addEventListener('change', () => { saveSettingsUI(); audio.ensure(); audio.cue('confirm'); });
    });
    ui.settingsTestGamepad?.addEventListener('click', () => {
        pollGamepads();
        const connected = gamepadState.connected.map((c, i) => c ? `P${i+1}: ✓` : `P${i+1}: ✗`).join(' | ');
        toast(`Mandos: ${connected}`, 2);
        audio.cue('confirm');
    });
    ui.settingsCalibrateGamepad?.addEventListener('click', () => {
        // Find first connected gamepad to calibrate
        let calibrated = false;
        for (let player = 0; player < 2; player++) {
            if (gamepadState.connected[player]) {
                if (startCalibration(player)) {
                    calibrated = true;
                    break;
                }
            }
        }
        if (!calibrated) {
            toast('No hay mandos conectados para calibrar', 2);
        }
        audio.cue('confirm');
    });

    // Gamepad support for UCOM USB controllers
    const gamepadState = {
        controllers: [null, null], // Up to 2 controllers
        prevButtons: [[], []],
        prevAxes: [[], []],
        connected: [false, false],
        indices: [-1, -1], // Gamepad API indices
        // Calibration data per player
        calibration: [null, null] // Stores { answerA, answerB, answerC, attack, start, deviceId }
    };
    
    // Default UCOM button mapping (fallback if no calibration)
    // Button 4 = A (Answer A), Button 1 = B (Answer B), Button 2 = C (Answer C), Button 3 = Action/Attack
    // Standard gamepad mapping may differ, so we map by observed UCOM layout
    const DEFAULT_UCOM_MAPPING = {
        answerA: 3,   // Button 4 (Triangle/Y)
        answerB: 0,   // Button 1 (Cross/A)
        answerC: 1,   // Button 2 (Circle/B)
        attack: 2,    // Button 3 (Square/X)
        start: 9      // START
    };
    
    // Load calibration from localStorage
    function loadGamepadCalibration(deviceId) {
        try {
            const data = localStorage.getItem(`mathquest-gamepad-calibration-${deviceId}`);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }
    
    function saveGamepadCalibration(deviceId, calibration) {
        try {
            localStorage.setItem(`mathquest-gamepad-calibration-${deviceId}`, JSON.stringify(calibration));
        } catch {}
    }
    
    // Get calibrated mapping for a gamepad, or use default
    function getGamepadMapping(gamepad) {
        if (!gamepad) return DEFAULT_UCOM_MAPPING;
        const deviceId = gamepad.id || 'unknown';
        const calibration = loadGamepadCalibration(deviceId);
        if (calibration && calibration.mapping) {
            console.log(`[Gamepad] Using calibrated mapping for ${deviceId}`);
            return calibration.mapping;
        }
        console.log(`[Gamepad] Using default mapping for ${deviceId}`);
        return DEFAULT_UCOM_MAPPING;
    }
    
    // Calibration state
    const calibrationState = {
        active: false,
        player: 0,
        step: 0,
        steps: ['answerA', 'answerB', 'answerC', 'attack', 'start'],
        stepLabels: ['Botón 4 (Respuesta A)', 'Botón 1 (Respuesta B)', 'Botón 2 (Respuesta C)', 'Botón 3 (Golpear/Acción)', 'START'],
        pressedButton: null,
        gamepad: null
    };
    
    function startCalibration(player) {
        const gp = gamepadState.controllers[player];
        if (!gp) return false;
        
        calibrationState.active = true;
        calibrationState.player = player;
        calibrationState.step = 0;
        calibrationState.pressedButton = null;
        calibrationState.gamepad = gp;
        
        // Show calibration UI
        showCalibrationUI();
        return true;
    }
    
    function cancelCalibration() {
        calibrationState.active = false;
        calibrationState.player = 0;
        calibrationState.step = 0;
        calibrationState.pressedButton = null;
        calibrationState.gamepad = null;
        hideCalibrationUI();
    }
    
    function completeCalibration() {
        if (!calibrationState.gamepad) return;
        
        const deviceId = calibrationState.gamepad.id || 'unknown';
        const mapping = {
            answerA: calibrationState.calibration.answerA,
            answerB: calibrationState.calibration.answerB,
            answerC: calibrationState.calibration.answerC,
            attack: calibrationState.calibration.attack,
            start: calibrationState.calibration.start
        };
        
        saveGamepadCalibration(deviceId, {
            deviceId,
            mapping,
            calibratedAt: Date.now()
        });
        
        // Update gamepad state
        gamepadState.calibration[calibrationState.player] = { ...mapping, deviceId };
        
        console.log(`[Gamepad] Calibration saved for ${deviceId}`, mapping);
        cancelCalibration();
    }
    
    function pollGamepads() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let p1Index = -1, p2Index = -1;
        
        // Find connected gamepads (prefer UCOM-like controllers)
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (!gp || !gp.connected) continue;
            if (p1Index === -1) p1Index = i;
            else if (p2Index === -1) p2Index = i;
        }
        
        // Update controller assignments
        const newIndices = [p1Index, p2Index];
        for (let player = 0; player < 2; player++) {
            const newIdx = newIndices[player];
            const oldIdx = gamepadState.indices[player];
            
            if (newIdx !== oldIdx) {
                gamepadState.indices[player] = newIdx;
                gamepadState.controllers[player] = newIdx >= 0 ? gamepads[newIdx] : null;
                gamepadState.connected[player] = newIdx >= 0;
                gamepadState.prevButtons[player] = [];
                gamepadState.prevAxes[player] = [];
                if (newIdx >= 0) {
                    console.log(`[Gamepad] Player ${player + 1} connected: ${gamepads[newIdx].id} (index ${newIdx})`);
                } else if (oldIdx >= 0) {
                    console.log(`[Gamepad] Player ${player + 1} disconnected`);
                }
            } else if (newIdx >= 0) {
                gamepadState.controllers[player] = gamepads[newIdx];
            }
        }
    }
    
    function processGamepadInput(delta) {
        pollGamepads();
        
        // Handle calibration input first
        if (calibrationState.active) {
            processCalibrationInput(delta);
            return;
        }
        
        for (let player = 0; player < 2; player++) {
            const gp = gamepadState.controllers[player];
            if (!gp) continue;
            
            const mapping = getGamepadMapping(gp);
            const prevButtons = gamepadState.prevButtons[player];
            const prevAxes = gamepadState.prevAxes[player];
            
            // Ensure arrays are initialized
            while (prevButtons.length < gp.buttons.length) prevButtons.push(false);
            while (prevAxes.length < gp.axes.length) prevAxes.push(0);
            
            // Button presses (rising edge detection)
            for (let i = 0; i < gp.buttons.length; i++) {
                const pressed = gp.buttons[i].pressed;
                const wasPressed = prevButtons[i] || false;
                
                if (pressed && !wasPressed) {
                    // Button just pressed
                    handleGamepadButton(player, i, mapping, true);
                } else if (!pressed && wasPressed) {
                    // Button released
                    handleGamepadButton(player, i, mapping, false);
                }
                prevButtons[i] = pressed;
            }
            
            // Analog stick (axes 0=left/right, 1=up/down for left stick)
            const deadzone = 0.3;
            const stickX = gp.axes[0] || 0;
            const stickY = gp.axes[1] || 0;
            const hatX = gp.axes[4] || 0;
            const hatY = gp.axes[5] || 0;
            const axisX = Math.abs(stickX) > deadzone ? stickX : hatX;
            const axisY = Math.abs(stickY) > deadzone ? stickY : hatY;
            
            // Menu navigation with D-pad/analog stick (for all menu phases)
            const menuPhases = ['MENU', 'SESSION', 'DIFFICULTY', 'CONTROLS', 'LEADERBOARD', 'HISTORY', 'SETTINGS', 'PAUSED', 'RESULT', 'HELP'];
            if (menuPhases.includes(game.phase)) {
                // Horizontal navigation (left/right) - for changing options in some menus
                if (axisX < -deadzone && Math.abs(prevAxes[0] || 0) <= deadzone) {
                    navigateMenu(-1);
                } else if (axisX > deadzone && Math.abs(prevAxes[0] || 0) <= deadzone) {
                    navigateMenu(1);
                }
                
                // Vertical navigation (up/down) - for menu navigation
                if (axisY < -deadzone && Math.abs(prevAxes[1] || 0) <= deadzone) {
                    navigateMenu(-1);
                } else if (axisY > deadzone && Math.abs(prevAxes[1] || 0) <= deadzone) {
                    navigateMenu(1);
                }
            }
            
            // Horizontal movement (left/right) - only in PLAYING phase
            if (game.phase === 'PLAYING') {
                setGamepadHeldAction(player, ACTIONS.MOVE_LEFT, axisX < -deadzone);
                setGamepadHeldAction(player, ACTIONS.MOVE_RIGHT, axisX > deadzone);
                
                // Vertical movement (up/down) - Jump/Slide
                if (Math.abs(axisY) > deadzone) {
                    if (axisY < -deadzone) {
                        // Up = Jump
                        if (Math.abs(prevAxes[1] || 0) <= deadzone) {
                            dispatchAction(ACTIONS.JUMP, `gamepad-p${player+1}`);
                        }
                    } else if (axisY > deadzone) {
                        // Down = Slide
                        if (Math.abs(prevAxes[1] || 0) <= deadzone) {
                            if (duoEnabled()) {
                                requestPlayerSlide(player);
                            } else {
                                dispatchAction(ACTIONS.SLIDE, `gamepad-p${player+1}`);
                            }
                        }
                    }
                }
            }
            
            prevAxes[0] = axisX;
            prevAxes[1] = axisY;
        }
    }
    
    function handleGamepadButton(player, buttonIndex, mapping, pressed) {
        if (pressed) {
            // Button pressed
            if (buttonIndex === mapping.answerA) {
                // Answer A / Button 4 - also acts as confirm in menus
                if (game.phase === 'PLAYING' && answerContextActive()) {
                    if (duoEnabled()) dispatchPlayerAnswer(player, 0);
                    else dispatchAction(ACTIONS.ANSWER_A, `gamepad-p${player + 1}`);
                } else if (['MENU', 'SESSION', 'DIFFICULTY', 'CONTROLS', 'LEADERBOARD', 'HISTORY', 'SETTINGS', 'PAUSED', 'RESULT'].includes(game.phase)) {
                    confirm();
                }
            } else if (buttonIndex === mapping.answerB) {
                // Answer B
                if (game.phase === 'PLAYING' && answerContextActive()) {
                    if (duoEnabled()) dispatchPlayerAnswer(player, 1);
                    else dispatchAction(ACTIONS.ANSWER_B, `gamepad-p${player + 1}`);
                }
            } else if (buttonIndex === mapping.answerC) {
                // Answer C
                if (game.phase === 'PLAYING' && answerContextActive()) {
                    if (duoEnabled()) dispatchPlayerAnswer(player, 2);
                    else dispatchAction(ACTIONS.ANSWER_C, `gamepad-p${player + 1}`);
                }
            } else if (buttonIndex === mapping.attack) {
                // Attack/Action (Button 3)
                if (game.phase === 'PLAYING') {
                    dispatchAction(ACTIONS.ATTACK, `gamepad-p${player+1}`);
                }
            } else if (buttonIndex === mapping.start) {
                // START button - confirms in all menu phases
                if (game.phase === 'MENU' || game.phase === 'SESSION' || game.phase === 'DIFFICULTY' || game.phase === 'CONTROLS' || game.phase === 'LEADERBOARD' || game.phase === 'HISTORY' || game.phase === 'SETTINGS' || game.phase === 'PAUSED' || game.phase === 'RESULT') {
                    confirm();
                }
            }
        }
    }
    
    // Calibration input processing
    function processCalibrationInput(delta) {
        if (!calibrationState.active || !calibrationState.gamepad) return;
        
        const gp = calibrationState.gamepad;
        
        // Check for button presses
        for (let i = 0; i < gp.buttons.length; i++) {
            if (gp.buttons[i].pressed && !calibrationState.pressedButton) {
                calibrationState.pressedButton = i;
                const currentStep = calibrationState.steps[calibrationState.step];
                
                if (!calibrationState.calibration) calibrationState.calibration = {};
                calibrationState.calibration[currentStep] = i;
                
                console.log(`[Calibration] ${calibrationState.stepLabels[calibrationState.step]} = button index ${i}`);
                
                calibrationState.step++;
                
                if (calibrationState.step >= calibrationState.steps.length) {
                    completeCalibration();
                } else {
                    updateCalibrationUI();
                }
                
                break;
            }
        }
        
        // Check for cancel (START button held for 2 seconds)
        if (gp.buttons[9] && gp.buttons[9].pressed) {
            calibrationState.cancelHoldTime = (calibrationState.cancelHoldTime || 0) + delta;
            if (calibrationState.cancelHoldTime >= 2) {
                cancelCalibration();
            }
        } else {
            calibrationState.cancelHoldTime = 0;
        }
    }
    
    // Calibration UI functions
    let calibrationUI = null;
    
    function showCalibrationUI() {
        const calibrationUI = document.getElementById('calibration-ui');
        if (!calibrationUI) return;
        
        calibrationUI.style.display = 'flex';
        calibrationUI.innerHTML = `
            <h2 style="margin-bottom: 20px;">CALIBRAR MANDO UCOM</h2>
            <div id="calibration-step" style="font-size: 28px; margin-bottom: 20px;">Presiona: Botón 4 (Respuesta A)</div>
            <div id="calibration-progress" style="font-size: 18px; color: #888;">Paso 1 de 5</div>
            <div style="margin-top: 30px; font-size: 14px; color: #666;">
                Mantén START 2 segundos para cancelar
            </div>
        `;
    }
    
    function updateCalibrationUI() {
        const stepEl = document.getElementById('calibration-step');
        const progressEl = document.getElementById('calibration-progress');
        if (stepEl) stepEl.textContent = `Presiona: ${calibrationState.stepLabels[calibrationState.step]}`;
        if (progressEl) progressEl.textContent = `Paso ${calibrationState.step + 1} de ${calibrationState.steps.length}`;
    }
    
    function hideCalibrationUI() {
        const calibrationUI = document.getElementById('calibration-ui');
        if (calibrationUI) {
            calibrationUI.style.display = 'none';
            calibrationUI.innerHTML = '';
        }
    }
    
    function setGamepadHeldAction(player, action, pressed) {
        const code = `gamepad-p${player + 1}-${action}`;
        const alreadyPressed = game.actionByCode.get(code) === action;
        if (pressed && !alreadyPressed) {
            game.actionByCode.set(code, action);
            game.actions.add(action);
            recordInputAction(action, `gamepad-p${player + 1}`);
        } else if (!pressed && alreadyPressed) {
            game.actionByCode.delete(code);
            if (![...game.actionByCode.values()].includes(action)) game.actions.delete(action);
        }
    }
    
    // Start gamepad polling
    setInterval(pollGamepads, 100); // Poll for connections every 100ms
    addEventListener('gamepadconnected', (e) => {
        console.log('[Gamepad] Connected:', e.gamepad.id, 'at index', e.gamepad.index);
        pollGamepads();
    });
    addEventListener('gamepaddisconnected', (e) => {
        console.log('[Gamepad] Disconnected:', e.gamepad.id);
        pollGamepads();
    });

    function cameraPose(distance, side, back, up, lookDistance, lookSide, lookUp, damping, delta) {
        const base = sampleAtDistance(distance); const target = sampleAtDistance(lookDistance);
        const desired = base.point.clone().addScaledVector(base.lateral, side).addScaledVector(base.tangent, -back).addScaledVector(UP, up);
        const look = target.point.clone().addScaledVector(target.lateral, lookSide).addScaledVector(UP, lookUp);
        camera.position.lerp(desired, 1 - Math.exp(-damping * delta)); cameraLook.lerp(look, 1 - Math.exp(-damping * delta));
        camera.lookAt(cameraLook);
    }
    function updateAttractCamera(delta) {
        const drift = Math.sin(state.elapsed * .24);
        cameraPose(16.0, 12.5 + drift * .85, 6.4, 7.4 + drift * .22,
            38.0, 0, 2.8, 2.2, delta);
        camera.fov = THREE.MathUtils.damp(camera.fov, 55, 4, delta); camera.updateProjectionMatrix();
        portalLight.intensity = 13 + Math.sin(state.elapsed * 1.7) * 1.8;
        portalData.particles.material.opacity = .76 + Math.sin(state.elapsed * 1.35) * .08;
        portalSpill.material.opacity = .15 + Math.sin(state.elapsed * 1.5) * .035;
    }
    function updateIntroCamera(delta) {
        const introTime = game.phase === 'COUNTDOWN' ? 9 : game.phaseTimer;
        const start = sampleAtDistance(8); const ground = sampleAtDistance(1.2); const portal = sampleAtDistance(portalDistance);
        const wide = start.point.clone().addScaledVector(start.lateral, 15).addScaledVector(start.tangent, -7).addScaledVector(UP, 10);
        const landmark = sampleAtDistance(42).point.clone().addScaledVector(start.lateral, 10).addScaledVector(UP, 7.2);
        const chase = ground.point.clone().addScaledVector(ground.tangent, -6.2).addScaledVector(UP, 3.35);
        const wideLook = sampleAtDistance(34).point.clone().addScaledVector(UP, 2.5);
        const portalLook = portal.point.clone().addScaledVector(UP, 4.9);
        const chaseLook = ground.point.clone().addScaledVector(ground.tangent, 10).addScaledVector(UP, 1.65);
        let desired; let look;
        if (introTime < .82) {
            const p = THREE.MathUtils.smoothstep(introTime, 0, .82); desired = wide.clone().lerp(landmark, p); look = wideLook.clone().lerp(portalLook, p);
        } else {
            const p = THREE.MathUtils.smoothstep(introTime, .82, 2.45); desired = landmark.clone().lerp(chase, p); look = portalLook.clone().lerp(chaseLook, p);
        }
        camera.position.lerp(desired, 1 - Math.exp(-3.4 * delta)); cameraLook.lerp(look, 1 - Math.exp(-3.8 * delta)); camera.lookAt(cameraLook);
        camera.fov = THREE.MathUtils.damp(camera.fov, BASE_FOV, 4, delta); camera.updateProjectionMatrix();
        const sample = sampleAtDistance(1.2);
        motionController.setState('IDLE');
        const p1Intro = sample.point.clone().addScaledVector(sample.lateral, duoEnabled() ? -.72 : 0);
        const p2Intro = sample.point.clone().addScaledVector(sample.lateral, .72);
        motionController.update(delta, { ground: p1Intro, sample, speed: 0, portalApproach: 0 });
        contactShadow.position.copy(p1Intro).addScaledVector(UP, .04);
        contactCore.position.copy(p1Intro).addScaledVector(UP, .047);
        if (duoEnabled()) {
            partnerController.setVisible(true); partnerController.setState('IDLE');
            partnerController.update(delta, { ground: p2Intro, sample, speed: 0, portalApproach: 0 });
            partnerShadow.position.copy(p2Intro).addScaledVector(UP, .04);
            partnerCore.position.copy(p2Intro).addScaledVector(UP, .047);
        }
        cameraTargetAnchor.copy(sample.point).addScaledVector(UP, 1.48);
        cameraBoomAnchor.copy(sample.point).addScaledVector(UP, 3.38);
    }
    function spawnDust(position, sample) {
        const item = dust.find(candidate => candidate.life <= 0) || dust[0];
        item.life = .62; item.sprite.visible = true;
        item.sprite.position.copy(position).addScaledVector(sample.tangent, -.28).addScaledVector(sample.lateral, item.side).addScaledVector(UP, .1);
    }
    function updateEffects(delta, ground, sample) {
        for (const item of dust) {
            item.life = Math.max(0, item.life - delta); item.sprite.visible = item.life > 0;
            item.sprite.material.opacity = item.life * .14; item.sprite.position.y += delta * .35;
            const size = 1.05 + (1 - item.life) * .7; item.sprite.scale.set(size * 1.45, size * .5, 1);
        }
        dashStreaks.forEach((sprite, index) => {
            sprite.visible = runner.dashTimer > 0; sprite.material.opacity = runner.dashTimer > 0 ? runner.dashTimer * 1.25 : 0;
            sprite.position.copy(ground).addScaledVector(sample.tangent, -.35 - index * .48)
                .addScaledVector(sample.lateral, (index % 2 ? 1 : -1) * (.28 + index * .035)).addScaledVector(UP, .45 + index * .09);
            sprite.scale.set(1.6 + index * .22, .07, 1);
        });
        afterImages.forEach((image, index) => {
            image.visible = runner.dashTimer > 0;
            image.material.opacity = runner.dashTimer > 0 ? (.19 - index * .045) * Math.min(1, runner.dashTimer * 5) : 0;
            image.position.copy(ground).addScaledVector(sample.tangent, -.38 - index * .5)
                .addScaledVector(sample.lateral, -runner.lateralVelocity * .018).addScaledVector(UP, .04 + runner.jumpY);
            image.scale.copy(explorer.scale); image.material.rotation = explorer.material.rotation;
        });
        backpackGlow.visible = proceduralExplorer.isVisible() || explorer.visible;
        if (backpackGlow.visible) {
            const glowTarget = ground.clone().addScaledVector(sample.tangent, -.12)
                .addScaledVector(sample.lateral, -.28 - runner.lateralVelocity * .018).addScaledVector(UP, 1.72 + runner.jumpY);
            backpackGlow.position.lerp(glowTarget, 1 - Math.exp(-9 * delta));
            backpackGlow.material.opacity = .13 + Math.sin(state.elapsed * 8) * .035 + (runner.dashTimer > 0 ? .23 : 0);
        }
        if (runner.attackTimer > 0) {
            const progress = 1 - runner.attackTimer / .42;
            attackPulse.visible = progress > .12; attackPulse.position.copy(ground).addScaledVector(sample.tangent, .65 + progress * 1.7).addScaledVector(UP, 1.12);
            attackPulse.rotation.set(0, Math.atan2(sample.tangent.x, sample.tangent.z), 0);
            attackPulse.scale.setScalar(.38 + progress * 2.3); attackPulse.material.opacity = Math.max(0, 1 - progress * 1.05);
        } else attackPulse.visible = false;
        attackImpact.visible = runner.attackImpactTimer > 0 && runner.attackTimer < .31;
        if (attackImpact.visible) {
            const impactProgress = 1 - runner.attackImpactTimer / .24;
            attackImpact.position.copy(ground).addScaledVector(sample.tangent, 2.15).addScaledVector(UP, 1.14);
            attackImpact.scale.setScalar(.25 + impactProgress * 1.55); attackImpact.material.opacity = (1 - impactProgress) * .72;
        }
        shield.visible = runner.shieldTimer > 0 || game.phase === 'PORTAL';
        if (shield.visible) {
            shield.position.copy(ground).addScaledVector(UP, 1.25); shield.rotation.y += delta * .75; shield.rotation.x += delta * .28;
            shield.material.opacity = game.phase === 'PORTAL' ? .42 : .16 + Math.sin(state.elapsed * 7) * .06;
        }
        powerRing.visible = runner.powerActivationTimer > 0;
        if (powerRing.visible) {
            const p = 1 - runner.powerActivationTimer / .55;
            powerRing.position.copy(ground).addScaledVector(UP, .08); powerRing.scale.setScalar(.45 + p * 2.35);
            powerRing.material.opacity = (1 - p) * .72; powerRing.rotation.z += delta * 1.8;
        }
        mathWave.visible = runner.mathFeedbackTimer > 0;
        if (mathWave.visible) {
            const laneSign = mathSigns.find(item => item.lane === runner.mathFeedbackLane) || mathSigns[1];
            const p = 1 - runner.mathFeedbackTimer / .65;
            mathWave.position.copy(laneSign.sign.position).addScaledVector(UP, 1.9);
            mathWave.scale.setScalar(.5 + p * 3.4); mathWave.material.opacity = (1 - p) * .72;
            mathWave.material.color.set(runner.mathFeedbackCorrect ? 0x66fff3 : 0xff9b5d);
        }
        const portalApproach = THREE.MathUtils.clamp((state.distance - portalApproachStart) / Math.max(1, portalDistance - portalApproachStart), 0, 1);
        portalLight.intensity = 11 + portalApproach * 10;
        portalData.particles.material.opacity = .68 + portalApproach * .25;
        portalData.particles.material.size = .42 + portalApproach * .08;
        portalSpill.material.opacity = .1 + portalApproach * .22; portalSpill.scale.setScalar(1 + portalApproach * .26);
    }
    function hit(message) {
        if (runner.hitTimer > 0 || runner.shieldTimer > 0) return;
        runner.hitTimer = .78; runner.state = 'HIT'; runner.lives = Math.max(0, runner.lives - 1);
        runner.combo = 1; runner.score = Math.max(0, runner.score - 120); toast(message); audio.cue('wrong'); updateHud();
    }
    function success(kind) {
        runner.score += Math.round(225 * profiles[game.difficulty].multiplier);
        runner.combo++; runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
        toast(kind === 'jump' ? 'SALTO PERFECTO' : kind === 'slide' ? 'DESLIZAMIENTO PERFECTO' : 'LÍNEA LIMPIA');
        audio.cue('correct'); updateHud();
    }
    function updateStalker(delta) {
        if (!STALKER_ENABLED) {
            stalkerRoot.visible = false;
            stalkerLight.visible = false;
            return;
        }
        const combat = game.stalker;
        const profile = profiles[game.difficulty];
        const breathe = Math.sin(state.elapsed * 4.6);
        stalkerCore.rotation.y += delta * 2.4;
        stalkerCore.rotation.z += delta * 1.1;
        stalkerRoot.position.copy(stalkerBasePosition);
        stalkerRoot.rotation.z = THREE.MathUtils.damp(stalkerRoot.rotation.z, 0, 8, delta);
        stalkerBody.rotation.set(0, 0, 0);
        stalkerHead.rotation.set(0, 0, 0);
        stalkerMandibles.forEach((jaw, index) => {
            const side = index ? 1 : -1;
            jaw.rotation.y = THREE.MathUtils.damp(jaw.rotation.y, side * (.15 + Math.abs(breathe) * .1), 10, delta);
        });
        stalkerLegs.forEach((leg, index) => {
            const stride = Math.sin(state.elapsed * 7.5 + index * Math.PI * .72);
            leg.rotation.z = THREE.MathUtils.damp(leg.rotation.z, stride * .13 * (index % 2 ? 1 : -1), 10, delta);
            leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, stride * .08, 10, delta);
        });
        if (combat.active) {
            combat.timer = Math.max(0, combat.timer - delta);
            stalkerRunes.forEach((rune, index) => {
                rune.visible = index < combat.health;
                if (rune.visible) rune.scale.setScalar(1 + Math.sin(state.elapsed * 10 + index) * .16);
            });
            if (combat.phase === 'TELEGRAPH') {
                const windup = 1 - combat.timer / profile.stalkerTelegraph;
                stalkerLight.color.set(0xff9a4f); stalkerLight.intensity = 3.2 + windup * 4.2;
                stalkerBody.rotation.x = -.18 * windup; stalkerHead.rotation.x = .24 * windup;
                stalkerRoot.position.addScaledVector(stalkerSample.tangent, windup * .32);
                stalkerLegs.forEach((leg, index) => { leg.rotation.z += (index % 2 ? 1 : -1) * windup * .18; });
                if (combat.timer <= 0) {
                    combat.phase = 'CHARGE'; combat.timer = .38; combat.contactResolved = false;
                    toast('¡EMBESTIDA! · DASH, PODER O APÁRTATE', .65); audio.cue('wrong');
                }
            } else if (combat.phase === 'CHARGE') {
                const charge = 1 - combat.timer / .38;
                stalkerLight.color.set(0xff5b3d); stalkerLight.intensity = 8;
                stalkerRoot.position.addScaledVector(stalkerSample.tangent, -Math.sin(charge * Math.PI) * 2.05);
                stalkerBody.rotation.x = .24; stalkerHead.rotation.x = -.32;
                stalkerLegs.forEach((leg, index) => { leg.rotation.x += Math.sin(charge * Math.PI * 4 + index) * .24; });
                if (!combat.contactResolved && combat.timer <= .18) {
                    combat.contactResolved = true; combat.charges++;
                    if (runner.dashTimer > 0 || runner.shieldTimer > 0 || Math.abs(runner.lateral) > 1.65) {
                        combat.dodges++;
                        toast(runner.shieldTimer > 0 ? 'ESCUDO Σ BLOQUEA LA EMBESTIDA' : 'ESQUIVA PERFECTA · CONTRAATACA', .9);
                        audio.cue('dash');
                    } else {
                        combat.damageTaken++; hit(`${stalkerNames[LEVEL_INDEX]} TE EMBISTE · USA DASH O PODER`);
                    }
                }
                if (combat.timer <= 0) {
                    combat.phase = 'RECOVERY'; combat.timer = profile.stalkerRecovery; combat.recoveryHit = false;
                    toast('NÚCLEO EXPUESTO · ATACA AHORA', Math.min(1.25, profile.stalkerRecovery));
                }
            } else if (combat.phase === 'RECOVERY') {
                stalkerLight.color.set(guardianPalette.accent); stalkerLight.intensity = 5.2;
                stalkerBody.rotation.z = Math.sin(state.elapsed * 13) * .055;
                stalkerHead.rotation.x = .35;
                stalkerRoot.position.addScaledVector(stalkerSample.tangent, .38);
                if (combat.timer <= 0) {
                    combat.phase = 'TELEGRAPH'; combat.timer = profile.stalkerTelegraph; combat.contactResolved = false;
                }
            } else if (combat.phase === 'STAGGER') {
                const recoil = Math.sin((1 - combat.timer / .46) * Math.PI);
                stalkerLight.color.set(0xffd36a); stalkerLight.intensity = 7.4;
                stalkerRoot.position.addScaledVector(stalkerSample.tangent, recoil * .75);
                stalkerRoot.rotation.z = recoil * .16;
                stalkerShell.rotation.y += delta * 4.5;
                if (combat.timer <= 0) {
                    combat.phase = 'TELEGRAPH'; combat.timer = profile.stalkerTelegraph; combat.contactResolved = false;
                }
            }
        } else if (combat.resolved) {
            combat.timer = Math.max(0, combat.timer - delta);
            const fall = THREE.MathUtils.smoothstep(1.15 - combat.timer, .04, .9);
            stalkerRoot.position.copy(stalkerBasePosition).addScaledVector(stalkerSample.lateral, fall * 3.35).addScaledVector(UP, -fall * .72);
            stalkerRoot.rotation.z = fall * 1.3;
            stalkerLight.color.set(guardianPalette.accent); stalkerLight.intensity = Math.max(0, 3 * (1 - fall));
            stalkerName.material.opacity = 1 - fall;
        } else {
            stalkerLight.color.set(guardianPalette.accent); stalkerLight.intensity = 2.4;
            stalkerBody.rotation.y = breathe * .025;
            stalkerHead.rotation.y = Math.sin(state.elapsed * 1.7) * .12;
        }
    }
    function updateGuardian(delta) {
        const profile = profiles[game.difficulty];
        if (game.guardianTimer > 0) game.guardianTimer = Math.max(0, game.guardianTimer - delta);
        if (!game.stalker.resolved) {
            guardianRoot.visible = false;
            guardianLight.visible = false;
            guardianSigils.forEach(({ group }) => { group.visible = false; });
            return;
        }
        const guardianReveal = THREE.MathUtils.smoothstep(1.15 - game.stalker.timer, .38, .96);
        guardianRoot.visible = guardianReveal > .01;
        guardianRoot.scale.setScalar(.86 + guardianReveal * .14);
        guardianLight.visible = guardianReveal > .01;
        if (!game.guardianCombat.active && !game.guardianResolved) {
            guardianSigils.forEach(({ group }) => { group.visible = guardianReveal > .58; });
        }
        const breathe = Math.sin(state.elapsed * 2.2);
        guardianRune.rotation.z += delta * .5;
        guardianEye.scale.x = 1 + Math.sin(state.elapsed * 5.2) * .08;
        guardianThemeParts.forEach(({ object, type, phase = 0 }) => {
            if (type === 'water-wheel') object.rotation.z -= delta * (game.guardianCombat.active ? 1.25 : .28);
            else if (type === 'water-spill') object.scale.y = 1 + Math.sin(state.elapsed * 4.2 + phase) * .09;
            else if (type === 'eclipse-halo') {
                object.rotation.z += delta * (.18 + phase * .08);
                object.rotation.y += delta * (phase % 2 ? -.14 : .14);
            } else if (type === 'eclipse-wing') object.rotation.y = Math.sin(state.elapsed * 1.7 + phase) * .12;
            else if (type === 'forge-core') {
                const pulse = 1 + Math.sin(state.elapsed * 6.4) * .12;
                object.scale.setScalar(pulse);
                object.rotation.y += delta * 1.35;
            }
        });
        const combat = game.guardianCombat;
        if (!combat.active && combat.timer > 0) {
            combat.timer = Math.max(0, combat.timer - delta);
            if (combat.timer <= 0 && combat.phase === 'BLOCK_STAGGER') combat.phase = 'BLOCKING';
        }
        if (combat.active) {
            combat.timer = Math.max(0, combat.timer - delta);
            guardianSigils.forEach(({ group }) => { group.visible = false; });
            guardianBarrier.scale.x = 1;
            guardianRoot.position.copy(guardianBasePosition);
            guardianHead.rotation.y = THREE.MathUtils.damp(guardianHead.rotation.y, Math.sin(state.elapsed * 2.4) * .1, 6, delta);
            guardianCoreRunes.forEach((rune, index) => {
                const alive = index < combat.health;
                rune.visible = alive;
                if (alive) {
                    const pulse = 1 + Math.sin(state.elapsed * 9 + index) * .18;
                    rune.scale.setScalar(pulse);
                    rune.rotation.y += delta * 2.2;
                }
            });

            if (combat.phase === 'TELEGRAPH') {
                const windup = 1 - combat.timer / profile.guardianTelegraph;
                guardianLight.color.set(0xff9a4f); guardianLight.intensity = 4.5 + windup * 3.5;
                guardianBody.rotation.x = THREE.MathUtils.damp(guardianBody.rotation.x, -.13, 8, delta);
                guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, .46, 10, delta);
                guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, -.48, 8, delta);
                if (REBUILD_ENABLED && LEVEL_INDEX === 0) {
                    guardianBody.rotation.x = THREE.MathUtils.damp(guardianBody.rotation.x, -.28, 10, delta);
                    guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, .82, 11, delta);
                    guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, -.82, 11, delta);
                } else if (REBUILD_ENABLED && LEVEL_INDEX === 1) {
                    guardianBody.rotation.z = THREE.MathUtils.damp(guardianBody.rotation.z, .2 * windup, 10, delta);
                    guardianHead.rotation.y = THREE.MathUtils.damp(guardianHead.rotation.y, -.48, 9, delta);
                    guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, 1.1, 12, delta);
                    guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, .38, 12, delta);
                } else if (REBUILD_ENABLED && LEVEL_INDEX === 2) {
                    guardianBody.rotation.x = THREE.MathUtils.damp(guardianBody.rotation.x, .18, 10, delta);
                    guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, .95, 12, delta);
                    guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, -.95, 12, delta);
                }
                if (combat.timer <= 0) {
                    combat.phase = 'STRIKE'; combat.timer = .3; combat.contactResolved = false;
                    const warning = REBUILD_ENABLED
                        ? ['¡GOLPE DE CASCADA! · DASH O PODER', '¡BARRIDO DE ECLIPSE! · DASH O PODER', '¡MARTILLO DOBLE! · DASH O PODER'][LEVEL_INDEX]
                        : '¡IMPACTO! · USA DASH O PODER PARA DEFENDERTE';
                    toast(warning, .55); audio.cue('wrong');
                }
            } else if (combat.phase === 'STRIKE') {
                const strike = 1 - combat.timer / .3;
                guardianLight.color.set(0xff5b3d); guardianLight.intensity = 8.5;
                guardianRoot.position.copy(guardianBasePosition).addScaledVector(guardianSample.tangent, -Math.sin(strike * Math.PI) * 1.2);
                guardianBody.rotation.x = -.2;
                guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, -2.35, 18, delta);
                if (REBUILD_ENABLED && LEVEL_INDEX === 0) {
                    guardianBody.rotation.x = -.35;
                    guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, 2.1, 18, delta);
                } else if (REBUILD_ENABLED && LEVEL_INDEX === 1) {
                    guardianRoot.position.copy(guardianBasePosition).addScaledVector(guardianSample.lateral, Math.sin(strike * Math.PI) * 1.55);
                    guardianBody.rotation.z = -.34;
                    guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, -1.45, 18, delta);
                    guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, -1.15, 18, delta);
                } else if (REBUILD_ENABLED && LEVEL_INDEX === 2) {
                    guardianRoot.position.copy(guardianBasePosition).addScaledVector(UP, -Math.sin(strike * Math.PI) * .42);
                    guardianBody.rotation.x = -.3;
                    guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, -2.5, 20, delta);
                    guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, 2.5, 20, delta);
                }
                if (!combat.contactResolved && combat.timer <= .15) {
                    combat.contactResolved = true; combat.strikes++;
                    if (runner.dashTimer > 0 || runner.shieldTimer > 0) {
                        combat.dodges++; toast(runner.shieldTimer > 0 ? 'ESCUDO Σ ABSORBE EL GOLPE' : 'ESQUIVA PERFECTA · PREPÁRATE', .9);
                        audio.cue('dash');
                    } else {
                        combat.damageTaken++; hit(`EL ${LEVEL.guardian} TE GOLPEA · USA DASH O PODER`);
                    }
                }
                if (combat.timer <= 0) {
                    combat.phase = 'RECOVERY'; combat.timer = profile.guardianRecovery; combat.recoveryHit = false;
                    toast('NÚCLEO EXPUESTO · ATACA AHORA', Math.min(1.35, profile.guardianRecovery));
                }
            } else if (combat.phase === 'RECOVERY') {
                guardianLight.color.set(0x63eee7); guardianLight.intensity = 6.4;
                guardianBody.rotation.x = THREE.MathUtils.damp(guardianBody.rotation.x, .13, 8, delta);
                guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, -.3, 9, delta);
                guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, .22, 9, delta);
                if (combat.timer <= 0) {
                    combat.phase = 'TELEGRAPH'; combat.timer = profile.guardianTelegraph; combat.contactResolved = false;
                }
            } else if (combat.phase === 'STAGGER') {
                const recoil = Math.sin((1 - combat.timer / .42) * Math.PI);
                guardianLight.color.set(0xffd36a); guardianLight.intensity = 7.5;
                guardianRoot.position.copy(guardianBasePosition).addScaledVector(guardianSample.tangent, recoil * .55);
                guardianBody.rotation.z = recoil * .1; guardianHead.rotation.x = recoil * .16;
                guardianRightArm.rotation.z = -.48 - recoil * .55;
                if (combat.timer <= 0) {
                    combat.phase = 'TELEGRAPH'; combat.timer = profile.guardianTelegraph; combat.contactResolved = false;
                }
            }
        } else if (game.guardianResolved) {
            const release = THREE.MathUtils.smoothstep(1.55 - game.guardianTimer, .08, 1.25);
            guardianLight.color.set(0x63eee7);
            guardianBody.rotation.z = THREE.MathUtils.damp(guardianBody.rotation.z, -.08, 5, delta);
            guardianHead.rotation.y = THREE.MathUtils.damp(guardianHead.rotation.y, -.34, 5, delta);
            guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, -2.25, 7, delta);
            guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, -.42, 5, delta);
            guardianBarrier.scale.x = Math.max(.04, 1 - release);
            guardianRoot.position.copy(guardianBasePosition).addScaledVector(guardianSample.lateral, release * 5.25);
            guardianLight.intensity = 3.6 + release * 4.2;
            guardianSigils.forEach(({ group }) => { group.visible = release < .72; });
        } else if (game.guardianFeedback === 'wrong') {
            const progress = 1 - game.guardianTimer / 1.25;
            const anticipation = THREE.MathUtils.smoothstep(progress, 0, .22);
            const strike = Math.sin(THREE.MathUtils.clamp((progress - .18) / .62, 0, 1) * Math.PI);
            guardianRoot.position.copy(guardianBasePosition).addScaledVector(guardianSample.tangent, -strike * 1.05);
            guardianBody.rotation.x = -.1 * strike;
            guardianBody.rotation.z = .08 * strike;
            guardianHead.rotation.x = -.16 * strike;
            guardianRightArm.rotation.z = THREE.MathUtils.lerp(-1.42 + anticipation * .34, .62, strike);
            guardianLeftArm.rotation.z = -.18 - strike * .28;
            guardianLight.color.set(0xff6b45); guardianLight.intensity = 5.2;
            if (game.guardianTimer <= 0) {
                game.guardianFeedback = null;
                guardianRoot.position.copy(guardianBasePosition);
                guardianBody.rotation.set(0, 0, 0); guardianHead.rotation.set(0, 0, 0);
                guardianSigils.forEach(({ faceMaterial }) => faceMaterial.color.set(0xffffff));
            }
        } else {
            guardianLight.color.set(0x63eee7); guardianLight.intensity = 3.6;
            guardianRoot.position.copy(guardianBasePosition);
            const blockerRecoil = combat.phase === 'BLOCK_STAGGER' ? Math.sin((1 - combat.timer / .34) * Math.PI) : 0;
            guardianRoot.position.addScaledVector(guardianSample.tangent, blockerRecoil * .38);
            guardianBody.rotation.x = THREE.MathUtils.damp(guardianBody.rotation.x, Math.abs(breathe) * .018 + blockerRecoil * .08, 4, delta);
            guardianBody.rotation.z = THREE.MathUtils.damp(guardianBody.rotation.z, breathe * .018 + blockerRecoil * .045, 4, delta);
            guardianHead.rotation.y = THREE.MathUtils.damp(guardianHead.rotation.y, Math.sin(state.elapsed * 1.1) * .12, 4, delta);
            guardianLeftArm.rotation.z = THREE.MathUtils.damp(guardianLeftArm.rotation.z, -.18 + breathe * .045, 5, delta);
            // The right forearm forms the visible physical bar across the route.
            guardianRightArm.rotation.z = THREE.MathUtils.damp(guardianRightArm.rotation.z, -1.42 - breathe * .055, 6, delta);
        }
    }
    function updateRouteGate(delta) {
        if (game.routeGateTimer > 0) game.routeGateTimer = Math.max(0, game.routeGateTimer - delta);
        if (game.routeGateFeedback === 'wrong' && game.routeGateTimer <= 0) {
            game.routeGateFeedback = null;
            game.routeGateActive = true;
            mathSigns.forEach(({ faceMaterial }) => faceMaterial.color.set(0xffffff));
        }
        if (game.routeGateActive && game.routeGateCommitted && game.routeGateTimer <= 0) {
            const target = game.routeGateSelectedLane * 2.3;
            if (Math.abs(runner.lateral - target) < .14) {
                runner.targetLateral = null;
                game.routeGateActive = false;
            }
        }
        if (!runner.mathResolved && !game.routeGateCommitted && !game.routeGateFeedback &&
            state.distance >= mathGateStopDistance - .18) game.routeGateActive = true;
    }
    function updateAltar(delta) {
        if (!ALTAR_ENABLED) {
            altarRoot.visible = false;
            altarLight.visible = false;
            altarSigils.forEach(({ group }) => { group.visible = false; });
            return;
        }
        if (game.altarTimer > 0) game.altarTimer = Math.max(0, game.altarTimer - delta);
        altarCore.rotation.x += delta * .55; altarCore.rotation.y += delta * .9;
        const pulse = .92 + Math.sin(state.elapsed * 5.5) * .08;
        if (game.altarResolved) {
            const release = THREE.MathUtils.smoothstep(1.1 - game.altarTimer, .06, .92);
            altarBarrier.scale.x = Math.max(.03, 1 - release);
            altarCore.scale.setScalar(1 + release * .55);
            altarLight.intensity = 2.4 + release * 3.2;
            altarSigils.forEach(({ group }) => { group.visible = release < .78; });
        } else if (game.altarFeedback === 'wrong') {
            altarLight.color.set(0xff6848); altarLight.intensity = 4.8;
            altarBarrier.rotation.z = Math.sin(state.elapsed * 34) * .035;
            if (game.altarTimer <= 0) {
                game.altarFeedback = null; game.altarActive = true;
                altarBarrier.rotation.z = 0;
                altarLight.color.set(guardianPalette.accent);
                altarSigils.forEach(({ faceMaterial }) => faceMaterial.color.set(0xffffff));
            }
        } else {
            altarLight.color.set(guardianPalette.accent);
            altarLight.intensity = 2.4 + pulse * .7;
            altarCore.scale.setScalar(pulse);
        }
        if (!game.altarResolved && !game.altarFeedback && state.distance >= altarStopDistance - .2) game.altarActive = true;
    }
    function updateMasteryMechanisms(delta) {
        const enabled = game.difficulty === 2;
        for (const mechanism of game.mastery) {
            mechanism.root.visible = enabled;
            if (!enabled) continue;
            if (!mechanism.resolved && state.distance >= mechanism.stopDistance - .15 && state.distance < mechanism.distance + 1.5) {
                mechanism.active = true; game.masteryActive = mechanism.index;
            }
            mechanism.open = THREE.MathUtils.damp(mechanism.open, mechanism.resolved ? 1 : 0, 5.5, delta);
            mechanism.gate.rotation.z = -mechanism.open * Math.PI * .48;
            mechanism.plate.position.y = .06 - (mechanism.active ? .045 : 0);
            mechanism.plateRune.material.emissiveIntensity = .8 + (mechanism.active ? Math.sin(state.elapsed * 7) * .35 + .55 : 0);
        }
    }
    function resolveCourseEvents() {
        const distance = state.distance; const previous = runner.lastDistance;
        if (ENABLED_OBSTACLES.has('jump') && !runner.obstacles.jump && previous < FIRST_OBSTACLES.jump && distance >= FIRST_OBSTACLES.jump) {
            runner.obstacles.jump = true;
            if (runner.jumpY >= profiles[game.difficulty].obstacleThreshold) success('jump');
            else { recordPlaytest('OBSTACLE_FAILURE', { obstacle: 'JUMP_1' }); hit('¡SALTA SOBRE LA RUPTURA!'); }
        }
        if (ENABLED_OBSTACLES.has('slide') && !runner.obstacles.slide && previous < FIRST_OBSTACLES.slide && distance >= FIRST_OBSTACLES.slide) {
            runner.obstacles.slide = true;
            const missingPlayers = duoEnabled()
                ? duoRace.players.map((player, index) => player.slideTimer > .08 ? null : session.players[index].name).filter(Boolean)
                : runner.slideTimer > .08 ? [] : [activePlayer().name];
            if (!missingPlayers.length) success('slide');
            else { recordPlaytest('OBSTACLE_FAILURE', { obstacle: 'SLIDE_1', missingPlayers }); hit(`${missingPlayers.join(' Y ')} · ¡DESLÍZATE BAJO EL ARCO!`); }
        }
        if (ENABLED_OBSTACLES.has('dash') && !runner.obstacles.dash && previous < FIRST_OBSTACLES.dash && distance >= FIRST_OBSTACLES.dash) {
            runner.obstacles.dash = true;
            if (runner.dashTimer > 0 || Math.abs(runner.lateral) < 1.18) success('dash');
            else { recordPlaytest('OBSTACLE_FAILURE', { obstacle: 'DASH_1' }); hit('¡USA DASH O BUSCA EL CENTRO!'); }
        }
        if (ENABLED_OBSTACLES.has('jump2') && !runner.obstacles.jump2 && previous < SECOND_OBSTACLES.jump && distance >= SECOND_OBSTACLES.jump) {
            runner.obstacles.jump2 = true;
            if (runner.jumpY >= profiles[game.difficulty].obstacleThreshold) success('jump');
            else { recordPlaytest('OBSTACLE_FAILURE', { obstacle: 'JUMP_2' }); hit('¡SEGUNDA RUPTURA: SALTA!'); }
        }
        if (ENABLED_OBSTACLES.has('slide2') && !runner.obstacles.slide2 && previous < SECOND_OBSTACLES.slide && distance >= SECOND_OBSTACLES.slide) {
            runner.obstacles.slide2 = true;
            const missingPlayers = duoEnabled()
                ? duoRace.players.map((player, index) => player.slideTimer > .08 ? null : session.players[index].name).filter(Boolean)
                : runner.slideTimer > .08 ? [] : [activePlayer().name];
            if (!missingPlayers.length) success('slide');
            else { recordPlaytest('OBSTACLE_FAILURE', { obstacle: 'SLIDE_2', missingPlayers }); hit(`${missingPlayers.join(' Y ')} · ¡EL ARCO BAJO TE ALCANZÓ!`); }
        }
        if (ENABLED_OBSTACLES.has('dash2') && !runner.obstacles.dash2 && previous < SECOND_OBSTACLES.dash && distance >= SECOND_OBSTACLES.dash) {
            runner.obstacles.dash2 = true;
            if (runner.dashTimer > 0 || Math.abs(runner.lateral) < 1.18) success('dash');
            else { recordPlaytest('OBSTACLE_FAILURE', { obstacle: 'DASH_2' }); hit('¡ROMPE LA LÍNEA DEL GUARDIÁN!'); }
        }
        if (!runner.mathResolved && previous < mathGateResolveDistance && distance >= mathGateResolveDistance) {
            const respondent = activePlayer().name;
            const lane = runner.lateral < -.82 ? -1 : runner.lateral > .82 ? 1 : 0;
            const problem = ACTIVE_MATH.questions[game.difficulty];
            game.routeChoice = lane;
            game.routeGateAttempts++;
            runner.questions++;
            if (lane === problem.correctLane) {
                runner.mathResolved = true;
                game.routeGateFeedback = 'correct';
                game.routeGateTimer = .72;
                runner.correct++; runner.energy = Math.min(5, runner.energy + 1); runner.combo++;
                runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
                const points = Math.round(750 * profiles[game.difficulty].multiplier);
                runner.score += points; recordMathAttempt(true, points);
                mathSigns.find(item => item.lane === lane).faceMaterial.color.set(0x7ffff4);
                toast(`${respondent} · ${problem.prompt.replace('?', '').trim()} ${problem.answer} · +ENERGÍA Σ`, 1.8); audio.cue('correct');
                runner.mathFeedbackTimer = .65; runner.mathFeedbackLane = lane; runner.mathFeedbackCorrect = true;
            } else {
                recordMathAttempt(false);
                runner.combo = 1; runner.hitTimer = .65; runner.score = Math.max(0, runner.score - 150);
                mathSigns.find(item => item.lane === lane).faceMaterial.color.set(0xff875f);
                toast('RUTA SELLADA · REGRESA Y PRUEBA OTRA RESPUESTA', 1.8); audio.cue('wrong');
                runner.mathFeedbackTimer = .65; runner.mathFeedbackLane = lane; runner.mathFeedbackCorrect = false;
                game.routeGateFeedback = 'wrong'; game.routeGateTimer = .55;
                game.routeGateCommitted = false; game.routeGateSelectedLane = null;
                state.distance = mathGateStopDistance;
                runner.lateralVelocity = -Math.sign(runner.lateral || 1) * 1.2;
            }
            advanceResponder(); runner.targetLateral = null; updateHud();
        }
        if (EXPLORATION_ENABLED) mazeGates.forEach((gate, index) => {
            if (game.maze.gates[index] || previous >= gate.distance || distance < gate.distance) return;
            const target = gate.openLane * 2.35;
            if (Math.abs(runner.lateral - target) <= profiles[game.difficulty].mazeTolerance) {
                game.maze.gates[index] = true;
                runner.score += Math.round(140 * profiles[game.difficulty].multiplier);
                toast(`LABERINTO · CÁMARA ${index + 1}/3 SUPERADA`, .9);
                audio.cue('correct'); updateHud();
            } else {
                game.maze.retries++;
                recordPlaytest('NAVIGATION_CONFUSION', { reason: 'BLOCKED_PASSAGE', gate: index + 1 });
                hit(`MURO DEL LABERINTO · BUSCA EL PASO ${gate.openLane < 0 ? 'IZQUIERDO' : gate.openLane > 0 ? 'DERECHO' : 'CENTRAL'}`);
                state.distance = gate.distance - 3.15;
                runner.lastDistance = state.distance;
                runner.lateralVelocity = THREE.MathUtils.clamp((target - runner.lateral) * 1.6, -4.5, 4.5);
            }
        });
        runner.lastDistance = state.distance;
    }
    function updateTutorial() {
        let message = '';
        if (!runner.tutorial.move && state.distance < 9) message = 'MOVER · ← → O CONTROL LATERAL';
        else if (ENABLED_OBSTACLES.has('jump') && !runner.tutorial.jump && state.distance > FIRST_OBSTACLES.jump - 4.7 && state.distance < FIRST_OBSTACLES.jump) message = 'SALTAR · ↑ O BOTÓN SALTO';
        else if (ENABLED_OBSTACLES.has('slide') && !runner.tutorial.slide && state.distance > FIRST_OBSTACLES.slide - 4.7 && state.distance < FIRST_OBSTACLES.slide) message = 'DESLIZAR · ↓ O BOTÓN DESLIZAR';
        else if (ENABLED_OBSTACLES.has('dash') && !runner.tutorial.dash && state.distance > FIRST_OBSTACLES.dash - 4.6 && state.distance < FIRST_OBSTACLES.dash) message = 'DASH · K O BOTÓN DASH';
        else if (game.exploration.active && !game.exploration.loop.completed) {
            const phaseLabel = {
                CHOOSE: 'ELIGE UNA RAMA', OUTBOUND: 'AVANZA AL EXTREMO',
                CROSS_FAR: 'CRUZA AL OTRO LADO', RETURN: 'REGRESA', REJOIN: 'VUELVE AL NÚCLEO'
            }[game.exploration.loop.phase] || 'CIERRA EL CIRCUITO';
            message = `LABERINTO · ${phaseLabel} · AVANZA/REGRESA Y EXPLORA LOS LADOS`;
        } else if (game.exploration.active) message = `${EXPLORATION_CONFIG.zone} · CIRCUITO ✓ · RUNAS ${game.exploration.runes.filter(Boolean).length}/3`;
        else if (EXPLORATION_ENABLED && state.distance > 58 && state.distance < 79 && !game.maze.gates.every(Boolean)) message = 'LABERINTO · MUÉVETE HACIA EL PASO ILUMINADO';
        if (message !== game.tutorialMessage) {
            game.tutorialMessage = message;
            ui.tutorial.textContent = message; ui.tutorial.classList.toggle('active', Boolean(message));
        }
        const guardianQuestionVisible = game.guardianActive && !game.guardianResolved;
        const altarQuestionVisible = game.altarActive && !game.altarResolved;
        const masteryQuestionVisible = game.masteryActive !== null && !game.mastery[game.masteryActive].resolved;
        const routeQuestionVisible = (state.distance > mathGateStopDistance - 3.85 && state.distance < mathGateResolveDistance + 1.1 && !runner.mathResolved) ||
            game.routeGateActive || game.routeGateFeedback === 'wrong';
        const questionVisible = routeQuestionVisible || altarQuestionVisible || guardianQuestionVisible || masteryQuestionVisible;
        if (questionVisible !== game.questionVisible) {
            game.questionVisible = questionVisible; ui.question.classList.toggle('active', questionVisible);
        }
        const duoQuestionVisible = questionVisible && duoEnabled();
        ui.question.classList.toggle('active', questionVisible && !duoEnabled());
        ui.duoMath?.classList.toggle('active', duoQuestionVisible);
        if (!questionVisible && duoRace.context) duoRace.context = null;
        const responder = activePlayer().name;
        if (masteryQuestionVisible) {
            const context = `MASTERY_${game.masteryActive}`;
            const problem = duoProblem(context, false);
            beginQuestionPlaytest(context);
            if (duoEnabled()) beginDuoChallenge(context);
            ui.question.querySelector('span').textContent = `${responder} · PLACA MAESTRA ${game.masteryActive + 1} · A ${problem.choices[0]} · B ${problem.choices[1]} · C ${problem.choices[2]}`;
            renderMathPrompt(mathQuestionValue, problem.prompt);
        } else if (guardianQuestionVisible) {
            beginQuestionPlaytest('GUARDIAN');
            if (duoEnabled()) beginDuoChallenge('GUARDIAN');
            ui.question.querySelector('span').textContent = `${responder} · ${LEVEL.guardian} · A ${guardianQuestion.choices[0]} · B ${guardianQuestion.choices[1]} · C ${guardianQuestion.choices[2]}`;
            renderMathPrompt(mathQuestionValue, guardianQuestion.prompt);
        } else if (altarQuestionVisible) {
            beginQuestionPlaytest('ALTAR');
            if (duoEnabled()) beginDuoChallenge('ALTAR');
            ui.question.querySelector('span').textContent = `${responder} · ALTAR · A ${altarQuestion.choices[0]} · B ${altarQuestion.choices[1]} · C ${altarQuestion.choices[2]}`;
            renderMathPrompt(mathQuestionValue, altarQuestion.prompt);
        } else if (routeQuestionVisible) {
            beginQuestionPlaytest('ROUTE');
            if (duoEnabled()) beginDuoChallenge('ROUTE');
            const selected = game.routeGateSelectedLane === null ? '' : ` · ELEGIDA ${String.fromCharCode(66 + game.routeGateSelectedLane)}`;
            ui.question.querySelector('span').textContent = `${responder} · A IZQ · B CENTRO · C DER${selected}`;
            renderMathPrompt(mathQuestionValue, ACTIVE_MATH.questions[game.difficulty].prompt);
        }
        if (duoQuestionVisible) {
            ui.duoCards.forEach((card, index) => {
                const racePlayer = duoRace.players[index];
                if (!racePlayer?.problem) return;
                const labels = index === 0 ? ['A', 'B', 'C'] : ['U', 'I', 'O'];
                card.querySelector('span').textContent = `${session.players[index].name} · ${labels.join(' / ')}`;
                card.querySelector('b').textContent = racePlayer.problem.prompt;
                const elapsed = racePlayer.status === 'ANSWERING' ? Math.max(0, runner.gameplayTime - racePlayer.startedAt) : racePlayer.responseMs / 1000;
                card.querySelector('small').textContent = racePlayer.status === 'WAITING'
                    ? `PASÓ EN ${elapsed.toFixed(1)}s · ESPERANDO`
                    : `${labels.map((label, choiceIndex) => `${label} ${racePlayer.problem.choices[choiceIndex]}`).join(' · ')} · ${elapsed.toFixed(1)}s`;
                card.classList.toggle('waiting', racePlayer.status === 'WAITING');
                card.classList.toggle('wrong', racePlayer.wrongFlash > 0);
                racePlayer.wrongFlash = Math.max(0, racePlayer.wrongFlash - 1 / 60);
            });
        }
    }
    function syncCameraToRunner() {
        const sample = sampleAtDistance(state.distance);
        const ground = sample.point.clone().addScaledVector(sample.lateral, runner.lateral);
        cameraTargetAnchor.copy(ground).addScaledVector(UP, 1.45);
        cameraBoomAnchor.copy(ground).addScaledVector(UP, 3.35);
        camera.position.copy(cameraBoomAnchor).addScaledVector(sample.tangent, -6.2);
        cameraLook.copy(cameraTargetAnchor).addScaledVector(sample.tangent, 10.2).addScaledVector(UP, .2);
        camera.lookAt(cameraLook); camera.fov = BASE_FOV; camera.updateProjectionMatrix();
        game.cameraArm = camera.position.distanceTo(cameraTargetAnchor);
    }
    function resolveMotionState() {
        if (runner.hitTimer > 0) return 'HIT';
        if (runner.powerActivationTimer > 0) return 'POWER';
        if (ENHANCED_MOTION_ENABLED && runner.shieldTimer > 0) return 'SHIELD';
        if (runner.attackTimer > 0) return 'ATTACK';
        if (runner.dashTimer > 0) return 'DASH';
        if (runner.slideAnticipation > 0) return 'SLIDE_ENTER';
        if (runner.slideTimer > .16) return 'SLIDE_LOOP';
        if (runner.slideTimer > 0) return 'SLIDE_EXIT';
        if (runner.jumpAnticipation > 0) return 'JUMP_ANTICIPATION';
        if (runner.jumpY > 0) return runner.verticalVelocity > .15 ? 'JUMP_ASCEND' : 'JUMP_FALL';
        if (runner.landingTimer > 0) return 'LAND';
        if (game.routeGateActive || game.routeGateFeedback === 'wrong' || game.altarActive || game.altarFeedback === 'wrong' || game.guardianActive) return ENHANCED_MOTION_ENABLED ? 'INTERACT' : 'IDLE';
        if (game.exploration.active && Math.hypot(runner.forwardVelocity, runner.lateralVelocity) < .22) return 'IDLE';
        if (runner.lateralVelocity < -.35) return 'RUN_LEFT';
        if (runner.lateralVelocity > .35) return 'RUN_RIGHT';
        return 'RUN';
    }
    function playerSlideState(playerIndex) {
        const player = duoRace.players[playerIndex];
        if (!duoEnabled() || !player) return null;
        if (player.slideAnticipation > 0) return 'SLIDE_ENTER';
        if (player.slideTimer > .16) return 'SLIDE_LOOP';
        if (player.slideTimer > 0) return 'SLIDE_EXIT';
        return null;
    }
    function updateExplorationLoop() {
        if (!game.exploration.active || game.exploration.loop.completed) return;
        const loop = game.exploration.loop;
        const distance = state.distance;
        const lateral = runner.lateral;
        const side = Math.sign(lateral || 1);
        if (loop.phase === 'CHOOSE' && Math.abs(distance - EXPLORATION_LOOP.near) <= .72 && Math.abs(lateral) >= 3.45) {
            loop.branch = side;
            loop.phase = 'OUTBOUND';
            loop.checkpoints[0] = true;
            toast(`BIFURCACIÓN · RAMA ${side < 0 ? 'IZQUIERDA' : 'DERECHA'} MEMORIZADA`, 1.35);
            audio.cue('confirm');
        }
        if (loop.phase === 'OUTBOUND') {
            if (distance > EXPLORATION_LOOP.near + .3 && distance < EXPLORATION_LOOP.far - .28 &&
                (Math.sign(lateral || loop.branch) !== loop.branch || Math.abs(lateral) < EXPLORATION_LOOP.corridorInnerEdge)) {
                runner.lateral = loop.branch * EXPLORATION_LOOP.corridorInnerEdge;
                runner.lateralVelocity = Math.max(0, runner.lateralVelocity * loop.branch) * loop.branch;
            }
            if (distance >= EXPLORATION_LOOP.far - .22 && Math.sign(lateral) === loop.branch && Math.abs(lateral) >= 3.45) {
                loop.phase = 'CROSS_FAR'; loop.checkpoints[1] = true;
                toast('EXTREMO ALCANZADO · CRUZA AL CORREDOR OPUESTO', 1.35); audio.cue('correct');
            }
        } else if (loop.phase === 'CROSS_FAR') {
            if (distance < EXPLORATION_LOOP.far - .48) {
                state.distance = EXPLORATION_LOOP.far - .48; runner.forwardVelocity = Math.max(0, runner.forwardVelocity);
            }
            if (Math.sign(lateral) === -loop.branch && Math.abs(lateral) >= 3.45) {
                loop.phase = 'RETURN'; loop.checkpoints[2] = true;
                toast('ARCO COMPLETADO · REGRESA POR LA OTRA RAMA', 1.35); audio.cue('correct');
            }
        } else if (loop.phase === 'RETURN') {
            const returnSide = -loop.branch;
            if (distance < EXPLORATION_LOOP.far - .28 && distance > EXPLORATION_LOOP.near + .28 &&
                (Math.sign(lateral || returnSide) !== returnSide || Math.abs(lateral) < EXPLORATION_LOOP.corridorInnerEdge)) {
                runner.lateral = returnSide * EXPLORATION_LOOP.corridorInnerEdge;
                runner.lateralVelocity = Math.max(0, runner.lateralVelocity * returnSide) * returnSide;
            }
            if (distance <= EXPLORATION_LOOP.near + .22 && Math.sign(lateral) === returnSide && Math.abs(lateral) >= 3.45) {
                loop.phase = 'REJOIN'; loop.checkpoints[3] = true;
                toast('CIRCUITO CERRADO · VUELVE AL NÚCLEO', 1.25); audio.cue('confirm');
            }
        } else if (loop.phase === 'REJOIN') {
            if (distance > EXPLORATION_LOOP.near + .55) {
                state.distance = EXPLORATION_LOOP.near + .55; runner.forwardVelocity = Math.min(0, runner.forwardVelocity);
            }
            if (Math.abs(lateral) <= .7) {
                loop.phase = 'COMPLETE'; loop.completed = true;
                runner.score += Math.round(320 * profiles[game.difficulty].multiplier);
                toast(EXPLORATION_CONFIG.loopComplete, 1.7);
                audio.cue('power'); updateHud();
            }
        }
        if (!loop.completed && state.distance >= EXPLORATION_LOOP.forwardSeal) {
            loop.blockedAttempts++;
            recordPlaytest('NAVIGATION_CONFUSION', { reason: 'INCOMPLETE_LOOP_SHORTCUT', phase: loop.phase });
            state.distance = EXPLORATION_LOOP.forwardSeal - .42;
            runner.forwardVelocity = -1.35;
            toast('RUTA INCOMPLETA · CIERRA EL CIRCUITO LATERAL', 1.3);
            audio.cue('wrong');
        }
    }
    function updateRunner(delta) {
        const profile = profiles[game.difficulty]; runner.gameplayTime += delta;
        if (playtest.enabled) {
            if (playtest.firstGameplayActionAt === null && !playtest.initialHesitationRecorded && runner.gameplayTime >= 4) {
                playtest.initialHesitationRecorded = true;
                recordPlaytest('HESITATION', { reason: 'NO_INITIAL_ACTION', responseSeconds: 4 });
            }
            if (playtest.questionShownAt !== null && !playtest.questionHesitationRecorded &&
                runner.gameplayTime - playtest.questionShownAt >= profile.hesitationSeconds) {
                playtest.questionHesitationRecorded = true;
                recordPlaytest('HESITATION', { reason: 'MATH_RESPONSE_DELAY', context: playtest.questionContext,
                    responseSeconds: profile.hesitationSeconds });
            }
            if (game.exploration.active) {
                const zone = playtestZone();
                if (playtest.navigationPhase !== zone) {
                    playtest.navigationPhase = zone; playtest.navigationPhaseStartedAt = runner.gameplayTime;
                }
                const lastAction = Math.max(playtest.lastGameplayActionAt ?? 0, playtest.navigationPhaseStartedAt);
                if (!playtest.navigationHesitationZones.has(zone) && runner.gameplayTime - lastAction >= profile.hesitationSeconds) {
                    playtest.navigationHesitationZones.add(zone);
                    recordPlaytest('HESITATION', { reason: 'NAVIGATION_IDLE', phase: game.exploration.loop.phase,
                        responseSeconds: profile.hesitationSeconds });
                }
            }
        }
        const jumpAnticipationBefore = runner.jumpAnticipation;
        const slideAnticipationBefore = runner.slideAnticipation;
        runner.jumpAnticipation = Math.max(0, runner.jumpAnticipation - delta);
        runner.slideAnticipation = Math.max(0, runner.slideAnticipation - delta);
        if (jumpAnticipationBefore > 0 && runner.jumpAnticipation === 0) {
            runner.verticalVelocity = 9.0; runner.jumpY = .01; audio.cue('jump');
        }
        if (slideAnticipationBefore > 0 && runner.slideAnticipation === 0) {
            runner.slideTimer = .78; audio.cue('slide');
        }
        runner.slideTimer = Math.max(0, runner.slideTimer - delta); runner.dashTimer = Math.max(0, runner.dashTimer - delta);
        if (duoEnabled()) {
            duoRace.players.forEach(player => {
                const anticipationBefore = player.slideAnticipation;
                player.slideAnticipation = Math.max(0, player.slideAnticipation - delta);
                if (anticipationBefore > 0 && player.slideAnticipation === 0) {
                    player.slideTimer = .9;
                    audio.cue('slide');
                }
                player.slideTimer = Math.max(0, player.slideTimer - delta);
            });
        }
        runner.dashFlashTimer = Math.max(0, runner.dashFlashTimer - delta);
        runner.dashCooldown = Math.max(0, runner.dashCooldown - delta); runner.hitTimer = Math.max(0, runner.hitTimer - delta);
        runner.attackTimer = Math.max(0, runner.attackTimer - delta); runner.attackImpactTimer = Math.max(0, runner.attackImpactTimer - delta);
        runner.shieldTimer = Math.max(0, runner.shieldTimer - delta); runner.powerActivationTimer = Math.max(0, runner.powerActivationTimer - delta);
        runner.mathFeedbackTimer = Math.max(0, runner.mathFeedbackTimer - delta);
        runner.landingTimer = Math.max(0, runner.landingTimer - delta);
        
        // Progressive penalty for the explorer who is still answering. Apply
        // directly from frame delta so low FPS cannot discard elapsed time.
        if (duoEnabled() && duoRace.penaltyActive && duoRace.context) {
            duoRace.penaltyTimer += delta;
            const answeringPlayerIndex = duoRace.players.findIndex(player => player.status === 'ANSWERING');
            if (answeringPlayerIndex >= 0) {
                const player = session.players[answeringPlayerIndex];
                player.score = Math.max(0, player.score - duoRace.penaltyRate * delta);
                updateHud();
            } else {
                duoRace.penaltyActive = false;
            }
        }
        
        const choosingAnswer = game.routeGateActive || game.altarActive || game.guardianActive;
        const steerInput = !choosingAnswer
            ? (game.actions.has(ACTIONS.MOVE_RIGHT) ? 1 : 0) - (game.actions.has(ACTIONS.MOVE_LEFT) ? 1 : 0)
            : 0;
        if (steerInput && Math.abs(runner.lateral) > .65) runner.tutorial.move = true;
        const targetVelocity = steerInput * profile.steer;
        const acceleration = (steerInput && Math.sign(targetVelocity) !== Math.sign(runner.lateralVelocity)) ? profile.acceleration * 1.35 : profile.acceleration;
        const change = THREE.MathUtils.clamp(targetVelocity - runner.lateralVelocity, -acceleration * delta, acceleration * delta);
        runner.lateralVelocity += change;
        if (!steerInput) runner.lateralVelocity = THREE.MathUtils.damp(runner.lateralVelocity, 0, 9.5, delta);
        if (runner.targetLateral !== null) {
            const difference = runner.targetLateral - runner.lateral;
            runner.lateralVelocity = THREE.MathUtils.damp(runner.lateralVelocity, THREE.MathUtils.clamp(difference * 3.2, -profile.steer, profile.steer), 8, delta);
            if (Math.abs(difference) < .12) runner.targetLateral = null;
        }
        const lateralLimit = game.exploration.active ? 5.35 : 3.25;
        runner.lateral = THREE.MathUtils.clamp(runner.lateral + runner.lateralVelocity * delta, -lateralLimit, lateralLimit);
        if (Math.abs(runner.lateral) >= lateralLimit - .01) runner.lateralVelocity *= .35;
        runner.bodyLean = THREE.MathUtils.damp(runner.bodyLean, THREE.MathUtils.clamp(-runner.lateralVelocity * .014, -.09, .09), 9, delta);

        let landed = false;
        if (runner.jumpY > 0 || runner.verticalVelocity > 0) {
            runner.verticalVelocity -= 27 * delta; runner.jumpY += runner.verticalVelocity * delta;
            if (runner.jumpY <= 0) { runner.jumpY = 0; runner.verticalVelocity = 0; runner.landingTimer = .22; landed = true; audio.cue('land'); }
        }
        updateStalker(delta);
        updateGuardian(delta);
        updateRouteGate(delta);
        updateAltar(delta);
        updateMasteryMechanisms(delta);
        if (game.exploration.enabled && !game.exploration.completed && runner.mathResolved &&
            state.distance >= EXPLORATION_START - .08 && state.distance <= EXPLORATION_END + .65) {
            game.exploration.active = true;
            if (!game.exploration.entered) {
                game.exploration.entered = true;
                runner.forwardVelocity = 0;
                toast(`${EXPLORATION_CONFIG.zone} · ${EXPLORATION_CONFIG.objective}`, 2.1);
                audio.cue('confirm');
            }
        }
        if (STALKER_ENABLED && !game.stalker.resolved && !game.stalker.active && state.distance >= stalkerStopDistance - .18) {
            Object.assign(game.stalker, {
                active: true, phase: 'TELEGRAPH', timer: profiles[game.difficulty].stalkerTelegraph,
                maxHealth: 1 + game.difficulty, health: 1 + game.difficulty,
                charges: 0, hits: 0, dodges: 0, damageTaken: 0,
                contactResolved: false, recoveryHit: false
            });
            stalkerRunes.forEach((rune, index) => { rune.visible = index < game.stalker.health; rune.scale.setScalar(1); });
            toast(`${stalkerNames[LEVEL_INDEX]} · ESQUIVA LA CARGA Y ATACA CON J`, 2.0);
            audio.cue('confirm');
        }
        if (game.stalker.resolved && !game.guardianResolved && !game.guardianFeedback && state.distance >= guardianStopDistance - .25 && game.guardianCombat.phase === 'LOCKED') {
            Object.assign(game.guardianCombat, {
                active: false, phase: 'BLOCKING', timer: 0, health: 3, maxHealth: 3,
                strikes: 0, hits: 0, dodges: 0, damageTaken: 0,
                contactResolved: false, recoveryHit: false
            });
            guardianCoreRunes.forEach((rune, index) => { rune.visible = index < 3; rune.scale.setScalar(1); });
            toast(`${LEVEL.guardian} BLOQUEA EL PASO · GOLPEA 3 VECES`, 2.0);
            audio.cue('confirm');
        }
        if (game.stalker.resolved && !game.guardianResolved && !game.guardianFeedback &&
            state.distance >= guardianStopDistance - .25 && game.guardianCombat.phase === 'QUESTION') {
            game.guardianActive = true;
        }
        const stalkerHolding = STALKER_ENABLED && (game.stalker.active || (game.stalker.resolved && game.stalker.timer > .18));
        const guardianHolding = game.guardianCombat.active ||
            (!game.guardianResolved && state.distance >= guardianStopDistance) ||
            (game.guardianResolved && game.guardianTimer > .18);
        const routeGateHolding = !runner.mathResolved && (game.routeGateActive || game.routeGateFeedback === 'wrong');
        const altarHolding = ALTAR_ENABLED && !game.altarResolved && (game.altarActive || game.altarFeedback === 'wrong');
        const masteryHolding = game.masteryActive !== null && !game.mastery[game.masteryActive].resolved;
        let speed = profile.speed + (state.distance > portalApproachStart ? .48 : 0) + (runner.dashTimer > 0 ? 4.65 : 0) - (runner.hitTimer > 0 ? 1.25 : 0);
        if (state.distance > mathGateStopDistance - 3.85 && state.distance < mathGateResolveDistance) speed *= game.difficulty === 0 ? .84 : game.difficulty === 2 ? 1.08 : .94;
        if (stalkerHolding || guardianHolding || routeGateHolding || altarHolding || masteryHolding) speed = 0;
        if (game.exploration.active) {
            const forwardInput = (game.actions.has(ACTIONS.JUMP) ? 1 : 0) -
                (game.actions.has(ACTIONS.SLIDE) ? 1 : 0);
            const targetForwardVelocity = forwardInput * (profile.speed + 1.05);
            runner.forwardVelocity = THREE.MathUtils.damp(runner.forwardVelocity, targetForwardVelocity, forwardInput ? 9 : 12, delta);
            if (stalkerHolding || guardianHolding || routeGateHolding || altarHolding) runner.forwardVelocity = 0;
            state.distance = THREE.MathUtils.clamp(state.distance + runner.forwardVelocity * delta, EXPLORATION_START, EXPLORATION_END);
            speed = Math.hypot(runner.forwardVelocity, runner.lateralVelocity);
        } else {
            runner.forwardVelocity = THREE.MathUtils.damp(runner.forwardVelocity, 0, 12, delta);
            state.distance = Math.min(routeLength - .7, state.distance + ((stalkerHolding || guardianHolding || routeGateHolding || altarHolding) ? 0 : Math.max(.8, speed)) * delta);
        }
        if (!runner.mathResolved && !game.routeGateCommitted && state.distance > mathGateStopDistance) state.distance = mathGateStopDistance;
        if (masteryHolding) state.distance = Math.min(state.distance, game.mastery[game.masteryActive].stopDistance);
        if (ALTAR_ENABLED && !game.altarResolved && !game.altarFeedback && state.distance > altarStopDistance) state.distance = altarStopDistance;
        if (STALKER_ENABLED && !game.stalker.resolved && state.distance > stalkerStopDistance) state.distance = stalkerStopDistance;
        if (!game.guardianResolved && state.distance > guardianStopDistance) state.distance = guardianStopDistance;
        if (game.exploration.active) {
            updateExplorationLoop();
            explorationRunes.forEach(({ root, distance, lateral }, index) => {
                if (game.exploration.runes[index]) return;
                if (Math.abs(state.distance - distance) <= .72 && Math.abs(runner.lateral - lateral) <= .9) {
                    game.exploration.runes[index] = true;
                    root.visible = false;
                    const collected = game.exploration.runes.filter(Boolean).length;
                    runner.score += Math.round(180 * profiles[game.difficulty].multiplier);
                    toast(`${EXPLORATION_CONFIG.rune} ${collected}/3 RECUPERADA`, 1.15);
                    audio.cue('correct'); updateHud();
                }
            });
            if (state.distance >= EXPLORATION_END - .04 && runner.forwardVelocity > 0) {
                const ready = game.exploration.loop.completed && game.exploration.runes.every(Boolean) && game.maze.gates.every(Boolean);
                if (ready) {
                    game.exploration.active = false;
                    game.exploration.completed = true;
                    runner.forwardVelocity = 0;
                    runner.score += Math.round(420 * profiles[game.difficulty].multiplier);
                    state.distance = EXPLORATION_END + .08;
                    toast(EXPLORATION_CONFIG.exitComplete, 1.8);
                    audio.cue('power'); updateHud();
                } else {
                    game.exploration.blockedExits++;
                    recordPlaytest('NAVIGATION_CONFUSION', {
                        reason: 'SEALED_EXIT', runes: game.exploration.runes.filter(Boolean).length,
                        passages: game.maze.gates.filter(Boolean).length
                    });
                    state.distance = EXPLORATION_END - .5;
                    runner.forwardVelocity = -1.3;
                    toast(`SALIDA SELLADA · RUNAS ${game.exploration.runes.filter(Boolean).length}/3`, 1.2);
                    audio.cue('wrong');
                }
            }
        }
        resolveCourseEvents(); updateTutorial();

        if (PREMIUM_V2_LEVEL_ONE) {
            // Retire completed onboarding geometry once it is safely behind the
            // player. Its tall dash frame previously sat between the boom and
            // the hydraulic station during the math/bridge sequence.
            const keepFirstObstacles = state.distance < FIRST_OBSTACLES.dash + 4.2;
            jumpHazard.visible = keepFirstObstacles;
            slideHazard.visible = keepFirstObstacles && ENABLED_OBSTACLES.has('slide');
            dashGate.visible = keepFirstObstacles;
        }

        const sample = sampleAtDistance(state.distance);
        const ground = sample.point.clone().addScaledVector(sample.lateral, runner.lateral);
        const formationWidth = duoEnabled() ? .72 : 0;
        if (duoRace.rejoin) {
            const travelled = Math.max(0, state.distance - duoRace.rejoin.anchorDistance);
            const remaining = Math.max(0, duoRace.rejoin.leadOffset - travelled);
            duoRace.players[duoRace.rejoin.leaderIndex].visualLead = remaining;
            if (remaining <= .02) {
                duoRace.players.forEach(player => Object.assign(player, { status: 'READY', visualLead: 0 }));
                duoRace.rejoin = null;
            }
        }
        const p1Lead = duoEnabled() ? duoRace.players[0].visualLead : 0;
        const p2Lead = duoEnabled() ? duoRace.players[1].visualLead : 0;
        const p1Waiting = p1Lead > .02;
        const p2Waiting = p2Lead > .02;
        const playerOneSample = p1Lead > .02 ? sampleAtDistance(Math.min(routeLength - .08, state.distance + p1Lead)) : sample;
        const playerTwoSample = p2Lead > .02 ? sampleAtDistance(Math.min(routeLength - .08, state.distance + p2Lead)) : sample;
        const playerOneFormation = p1Waiting ? -2.05 : -formationWidth;
        const playerTwoFormation = p2Waiting ? 2.05 : formationWidth;
        const playerOneGround = playerOneSample.point.clone().addScaledVector(playerOneSample.lateral, runner.lateral + playerOneFormation);
        const playerTwoGround = playerTwoSample.point.clone().addScaledVector(playerTwoSample.lateral, runner.lateral + playerTwoFormation);
        const portalApproach = THREE.MathUtils.clamp((state.distance - portalApproachStart) / Math.max(1, portalDistance - portalApproachStart), 0, 1);
        if (game.exploration.active && speed > .18) {
            desiredExplorationFacing.copy(sample.tangent).multiplyScalar(runner.forwardVelocity)
                .addScaledVector(sample.lateral, runner.lateralVelocity);
            if (desiredExplorationFacing.lengthSq() > .01) {
                desiredExplorationFacing.normalize();
                explorationFacing.lerp(desiredExplorationFacing, 1 - Math.exp(-9 * delta)).normalize();
            }
        } else explorationFacing.lerp(sample.tangent, 1 - Math.exp(-7 * delta)).normalize();
        const facingTangent = game.exploration.active ? explorationFacing : sample.tangent;
        runner.state = resolveMotionState();
        const playerOneState = p1Waiting ? 'IDLE' : playerSlideState(0) || runner.state;
        const playerTwoState = p2Waiting ? 'IDLE' : playerSlideState(1) || runner.state;
        motionController.setState(playerOneState);
        motionController.update(delta, { ground: playerOneGround, sample: playerOneSample, facingTangent: p1Waiting ? playerOneSample.tangent : facingTangent, speed: p1Waiting ? 0 : speed, portalApproach, jumpY: runner.jumpY });
        partnerController.setVisible(duoEnabled());
        if (duoEnabled()) {
            partnerController.setState(playerTwoState);
            partnerController.update(delta, { ground: playerTwoGround, sample: playerTwoSample, facingTangent: p2Waiting ? playerTwoSample.tangent : facingTangent, speed: p2Waiting ? 0 : speed, portalApproach, jumpY: runner.jumpY });
        }
        contactShadow.position.copy(playerOneGround).addScaledVector(UP, .045); contactShadow.scale.setScalar(1 - Math.min(.38, runner.jumpY * .14));
        partnerShadow.visible = duoEnabled(); partnerShadow.position.copy(playerTwoGround).addScaledVector(UP, .045);
        partnerShadow.scale.copy(contactShadow.scale); partnerShadow.material.opacity = contactShadow.material.opacity;
        if (playerOneState.startsWith('SLIDE')) contactShadow.scale.set(1.38, .72, 1);
        if (playerTwoState.startsWith('SLIDE')) partnerShadow.scale.set(1.38, .72, 1);
        contactShadow.material.opacity = .58 - Math.min(.34, runner.jumpY * .13) + (runner.state === 'LAND' ? .12 : 0);
        contactCore.position.copy(playerOneGround).addScaledVector(UP, .051);
        partnerCore.visible = duoEnabled(); partnerCore.position.copy(playerTwoGround).addScaledVector(UP, .051);
        const coreAirScale = 1 - Math.min(.62, runner.jumpY * .2);
        contactCore.scale.setScalar(coreAirScale);
        partnerCore.scale.copy(contactCore.scale);
        if (playerOneState.startsWith('SLIDE')) contactCore.scale.set(1.28, .58, 1);
        if (playerTwoState.startsWith('SLIDE')) partnerCore.scale.set(1.28, .58, 1);
        contactCore.material.opacity = .46 - Math.min(.39, runner.jumpY * .18) + (runner.state === 'LAND' ? .16 : 0);
        partnerCore.material.opacity = contactCore.material.opacity;
        playerFillLight.position.copy(ground).addScaledVector(sample.tangent, -.25).addScaledVector(UP, 1.45 + runner.jumpY * .4);
        playerFillLight.intensity = .62 + portalApproach * .55 + (runner.powerActivationTimer > 0 ? .75 : 0);
        playerRimLight.position.copy(ground).addScaledVector(sample.lateral, -1.1)
            .addScaledVector(sample.tangent, -.8).addScaledVector(UP, 2.25);
        playerRimLight.intensity = ENHANCED_MOTION_ENABLED
            ? .34 + portalApproach * .28 + (runner.attackTimer > 0 ? .35 : 0)
            : 0;
        runner.stepTimer -= delta;
        if (landed) {
            cameraLandingKick = .18;
            spawnDust(ground, sample); spawnDust(ground.clone().addScaledVector(sample.lateral, .35), sample);
        }
        if (runner.slideTimer > 0 && runner.stepTimer <= 0) {
            runner.stepTimer = .12;
            spawnDust(ground.clone().addScaledVector(sample.lateral, -.3), sample);
            spawnDust(ground.clone().addScaledVector(sample.lateral, .3), sample);
        }
        if (runner.jumpY === 0 && runner.slideTimer <= 0 && runner.stepTimer <= 0) {
            runner.stepTimer = THREE.MathUtils.clamp(.39 - speed * .025, .21, .34); spawnDust(ground, sample); audio.cue('foot');
        }
        updateEffects(delta, ground, sample);
        atmosphere.rotation.y += delta * (.003 + speed * .0007);
        atmosphere.material.opacity = .2 + Math.min(.16, speed * .016);
        const closestRoutePulse = routePulseDistances.reduce((closest, distance) =>
            Math.min(closest, Math.abs(distance - state.distance)), Infinity);
        const routePulseProximity = Math.max(0, 1 - closestRoutePulse / 10);
        routePulseMaterial.opacity = .1 + routePulseProximity * .3 * (.72 + Math.sin(state.elapsed * 8) * .28);
        const mathPulse = runner.mathFeedbackTimer > 0 ? Math.sin((1 - runner.mathFeedbackTimer / .65) * Math.PI) : 0;
        mathSigns.forEach(({ lane, sign, valve }) => {
            const selected = runner.mathFeedbackTimer > 0 && lane === runner.mathFeedbackLane;
            const scale = 1 + (selected ? mathPulse * .065 : 0);
            sign.scale.set(scale, scale, scale);
            if (valve) {
                const correctTurn = runner.mathResolved && lane === game.routeChoice ? Math.PI * .72 : 0;
                const wrongShake = game.routeGateFeedback === 'wrong' && lane === runner.mathFeedbackLane
                    ? Math.sin(state.elapsed * 35) * .18 : 0;
                valve.rotation.z = THREE.MathUtils.damp(valve.rotation.z, correctTurn + wrongShake, 10, delta);
            }
        });
        [-1, 0, 1].forEach((lane, index) => {
            const selected = runner.mathFeedbackTimer > 0 && lane === runner.mathFeedbackLane;
            mathTrailScale.set(1 + (selected ? mathPulse * 4.2 : 0), 1, 1);
            mathTrailMatrix.copy(mathTrailBases[index]).scale(mathTrailScale);
            mathTrailMesh.setMatrixAt(index, mathTrailMatrix);
            mathTrailMesh.setColorAt(index, selected
                ? (runner.mathFeedbackCorrect ? mathTrailCorrectColor : mathTrailWrongColor)
                : mathTrailIdleColor);
        });
        mathTrailMesh.instanceMatrix.needsUpdate = true;
        mathTrailMesh.instanceColor.needsUpdate = true;
        mathTrailMaterial.opacity = THREE.MathUtils.damp(mathTrailMaterial.opacity,
            runner.mathFeedbackTimer > 0 ? .7 : .22, runner.mathFeedbackTimer > 0 ? 18 : 4, delta);
        obstacleRunes.forEach(({ distance, rune, material }) => {
            const ahead = distance - state.distance;
            const proximity = ahead >= -1.1 && ahead <= 9 ? Math.max(0, 1 - Math.abs(ahead - 2.4) / 6.6) : 0;
            const pulse = .72 + Math.sin(state.elapsed * 7.5 + distance) * .28;
            material.opacity = .05 + proximity * .58 * pulse;
            const runeScale = 1 + proximity * (.35 + pulse * .22);
            rune.scale.set(runeScale, runeScale, runeScale);
            rune.rotation.z = state.elapsed * (ahead > 0 ? .2 : .08);
        });
        explorationRunes.forEach(({ root, core, halo, haloMaterial, baseY }, index) => {
            if (!root.visible) return;
            const pulse = .82 + Math.sin(state.elapsed * 4.8 + index * 1.7) * .18;
            core.rotation.y += delta * (1.15 + index * .18);
            halo.rotation.z -= delta * (.72 + index * .11);
            root.position.y = baseY + Math.sin(state.elapsed * 3.2 + index) * .08;
            haloMaterial.opacity = .42 + pulse * .32;
            root.scale.setScalar(.94 + pulse * .09);
        });
        explorationLoopMarkers.forEach(({ root, ring, material, role, index }) => {
            const loop = game.exploration.loop;
            const branchRole = loop.branch < 0 ? 'LEFT' : 'RIGHT';
            const oppositeRole = loop.branch < 0 ? 'RIGHT' : 'LEFT';
            const active = (loop.phase === 'CHOOSE' && role.endsWith('ENTRY')) ||
                (loop.phase === 'OUTBOUND' && role === `${branchRole}_TURN`) ||
                (loop.phase === 'CROSS_FAR' && role === `${oppositeRole}_TURN`) ||
                (loop.phase === 'RETURN' && role === `${oppositeRole}_ENTRY`) ||
                (loop.phase === 'REJOIN' && role === 'REJOIN');
            ring.rotation.z += delta * (active ? 1.8 : .45);
            material.opacity = active ? .82 + Math.sin(state.elapsed * 7 + index) * .14 : .22;
            root.scale.setScalar(active ? 1.08 + Math.sin(state.elapsed * 6) * .08 : .82);
        });
        MATERIALS.CYAN_EMISSIVE.emissiveIntensity = 1.25 + Math.min(.35, speed * .025) + portalApproach * .32;

        const approach = portalApproach;
        cameraLandingKick = THREE.MathUtils.damp(cameraLandingKick, 0, 10, delta);
        const sliding = ['SLIDE_ENTER', 'SLIDE_LOOP', 'SLIDE_EXIT'].includes(runner.state);
        const actionBoom = runner.state === 'DASH' ? -.38 : runner.state === 'ATTACK' ? -.13 : 0;
        const anticipationDrop = runner.state === 'JUMP_ANTICIPATION' ? .16 : 0;
        const attackLead = runner.state === 'ATTACK' ? .28 : 0;
        const stride = runner.jumpY === 0 && !sliding ? Math.sin(runner.gameplayTime * (8.2 + speed * .6)) * .026 : 0;
        const targetHeight = 1.48 + runner.jumpY * .62 - (sliding ? .42 : 0) - anticipationDrop;
        // The natural trail crests immediately before the crawl arch. Lift the
        // boom locally so the terrain cannot read as a boulder sealing the gap.
        const slideReadabilityLift = Math.max(0, 1 - Math.abs(state.distance - FIRST_OBSTACLES.slide) / 5.6) * 1.22;
        const desiredTargetAnchor = ground.clone().addScaledVector(sample.tangent, .28 + speed * .025 + attackLead)
            .addScaledVector(sample.lateral, runner.lateralVelocity * .045).addScaledVector(UP, targetHeight + stride);
        const desiredBoomAnchor = ground.clone()
            .addScaledVector(sample.lateral, -runner.lateralVelocity * .032)
            .addScaledVector(sample.tangent, actionBoom)
            .addScaledVector(UP, 3.38 + slideReadabilityLift + runner.jumpY * .12 - (sliding ? .12 : 0) - cameraLandingKick + stride * .45);
        cameraTargetAnchor.lerp(desiredTargetAnchor, 1 - Math.exp(-(runner.jumpY > 0 ? 5.2 : 9.5) * delta));
        cameraBoomAnchor.lerp(desiredBoomAnchor, 1 - Math.exp(-7.2 * delta));
        const encounterPullback = ENHANCED_MOTION_ENABLED && game.guardianActive ? 1.45 :
            ENHANCED_MOTION_ENABLED && (game.routeGateActive || game.altarActive) ? .55 : 0;
        const desiredCamera = cameraBoomAnchor.clone()
            .addScaledVector(sample.tangent, -7.05 - approach * 2.15 - encounterPullback);
        const portalFocus = portalSample.point.clone().addScaledVector(UP, 4.2);
        const desiredLook = cameraTargetAnchor.clone().addScaledVector(sample.tangent, 10.2).addScaledVector(UP, .18).lerp(portalFocus, approach * .14);
        const resolvedCamera = resolveCameraObstruction(cameraTargetAnchor, desiredCamera, delta);
        if (camera.position.distanceTo(resolvedCamera) > 14) {
            camera.position.copy(resolvedCamera); game.cameraTeleports++;
        } else camera.position.lerp(resolvedCamera, 1 - Math.exp(-5.4 * delta));
        cameraLook.lerp(desiredLook, 1 - Math.exp(-6.2 * delta)); camera.lookAt(cameraLook);
        const targetRoll = THREE.MathUtils.clamp(-runner.lateralVelocity * .0045, -.032, .032) +
            (runner.state === 'ATTACK' ? -.018 : runner.state === 'HIT' ? .026 : 0);
        cameraRoll = THREE.MathUtils.damp(cameraRoll, targetRoll, runner.state === 'HIT' ? 14 : 6.5, delta);
        camera.rotateZ(cameraRoll);
        updateOccluderFade(delta, cameraTargetAnchor);
        const targetFov = runner.dashTimer > 0 ? 65 : approach > .05 ? 64 :
            ENHANCED_MOTION_ENABLED && game.guardianActive ? 61 :
                state.distance > 43.5 && state.distance < 54.2 ? 61 : BASE_FOV;
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, runner.dashTimer > 0 ? 13 : 6, delta); camera.updateProjectionMatrix();
        if (approach > .25) {
            game.portalRiseTimer -= delta;
            if (game.portalRiseTimer <= 0) { audio.tone(170 + approach * 170, .22, 'sine', .014, 90); game.portalRiseTimer = 1.05 - approach * .32; }
        }
        if (PREMIUM_WATERFALL_V2_REQUESTED && runner.mathResolved &&
            state.distance >= PREMIUM_WATERFALL_V2_EXIT_DISTANCE && !game.premiumSectionComplete) {
            game.premiumSectionComplete = true;
            runner.score += Math.round(500 * profiles[game.difficulty].multiplier);
            toast('SECCIÓN DEL SANTUARIO COMPLETADA', 1.4);
            recordGameCompletion();
            setPhase('RESULT');
            return;
        }
        if (state.distance >= portalDistance - .38) {
            runner.state = 'DISABLED'; game.phase = 'PORTAL'; game.phaseTimer = 0; ui.tutorial.classList.remove('active'); ui.question.classList.remove('active');
            ui.toast.classList.remove('active'); game.toastTimer = 0;
            ui.flash.classList.remove('active'); void ui.flash.offsetWidth; ui.flash.classList.add('active'); audio.cue('portal');
        }
    }
    function updatePortal(delta) {
        runner.gameplayTime += delta; state.distance = Math.min(routeLength - .08, state.distance + (3.2 + game.phaseTimer * 1.65) * delta);
        const sample = sampleAtDistance(state.distance);
        const centerPull = THREE.MathUtils.smoothstep(game.phaseTimer, 0, .8);
        const ground = sample.point.clone().addScaledVector(sample.lateral, runner.lateral * (1 - centerPull));
        const leapProgress = THREE.MathUtils.smoothstep(game.phaseTimer, .24, 1.34);
        const leapY = Math.sin(leapProgress * Math.PI * .82) * 2.35 + leapProgress * .52;
        runner.state = game.phaseTimer < .24 ? 'JUMP_ANTICIPATION' :
            ENHANCED_MOTION_ENABLED ? 'PORTAL' : game.phaseTimer < 1.18 ? 'JUMP_ASCEND' : 'POWER';
        motionController.setState(runner.state);
        const p1Portal = ground.clone().addScaledVector(sample.lateral, duoEnabled() ? -.58 : 0);
        const p2Portal = ground.clone().addScaledVector(sample.lateral, .58).addScaledVector(sample.tangent, -.35);
        motionController.update(delta, { ground: p1Portal, sample, speed: 5.2, portalApproach: 1, jumpY: leapY });
        if (duoEnabled()) {
            partnerController.setState(runner.state);
            partnerController.update(delta, { ground: p2Portal, sample, speed: 5.05, portalApproach: 1, jumpY: Math.max(0, leapY - .08) });
            partnerController.setVisible(game.phaseTimer < 1.96);
        }
        const dissolve = THREE.MathUtils.smoothstep(game.phaseTimer, 1.05, 1.92);
        motionController.setVisible(game.phaseTimer < 1.96);
        explorer.material.opacity = 1 - dissolve;
        explorer.scale.x *= 1 + dissolve * .18; explorer.scale.y *= 1 + dissolve * .42;
        proceduralExplorer.setOpacity(1 - dissolve);
        proceduralExplorer.setPortalTint(Math.min(1, .12 + dissolve * .76));
        contactShadow.visible = game.phaseTimer < 1.34; contactShadow.position.copy(p1Portal).addScaledVector(UP, .045);
        partnerShadow.visible = duoEnabled() && game.phaseTimer < 1.34; partnerShadow.position.copy(p2Portal).addScaledVector(UP, .045);
        contactShadow.scale.setScalar(Math.max(.3, 1 - leapY * .2));
        contactShadow.material.opacity = .58 * Math.max(0, 1 - leapProgress * .72);
        contactCore.visible = game.phaseTimer < 1.18; contactCore.position.copy(p1Portal).addScaledVector(UP, .051);
        partnerCore.visible = duoEnabled() && game.phaseTimer < 1.18; partnerCore.position.copy(p2Portal).addScaledVector(UP, .051);
        contactCore.material.opacity = .46 * Math.max(0, 1 - leapProgress);
        explorer.material.color.lerp(portalTint, 1 - Math.exp(-5 * delta));
        portalVeil.visible = true;
        portalVeil.material.opacity = Math.sin(Math.min(1, game.phaseTimer / 1.5) * Math.PI) * .62;
        portalVeil.scale.set(4.5 + game.phaseTimer * 2.2, 7.4 + game.phaseTimer * 2.8, 1);
        playerFillLight.position.copy(ground).addScaledVector(UP, 1.5 + leapY * .55); playerFillLight.intensity = 1.0 + dissolve * 1.7;
        portalLight.intensity = 14 + dissolve * 10;
        renderer.toneMappingExposure = 1.08 + dissolve * .18;
        updateEffects(delta, ground, sample);
        // Hold the boom on the approach side while the actor crosses the
        // portal. Following the actor through the aperture put the camera
        // inside the environment mesh at the end of the transition.
        const desired = portalSample.point.clone()
            .addScaledVector(portalSample.lateral, -1.45 * Math.sin(leapProgress * Math.PI))
            .addScaledVector(portalSample.tangent, -10.2).addScaledVector(UP, 4.15 + leapY * .18);
        const portalCenter = portalSample.point.clone().addScaledVector(UP, 4.65);
        camera.position.lerp(desired, 1 - Math.exp(-4.8 * delta)); cameraLook.lerp(portalCenter, 1 - Math.exp(-6.2 * delta));
        camera.lookAt(cameraLook); updateOccluderFade(delta, ground.clone().addScaledVector(UP, 1.25));
        camera.fov = THREE.MathUtils.damp(camera.fov, 62, 6, delta); camera.updateProjectionMatrix();
        if (game.phaseTimer >= 2.18) {
            recordGameCompletion();
            setPhase('RESULT');
        }
    }
    function updateResult() {
        const progress = THREE.MathUtils.smoothstep(game.phaseTimer, .18, 1.28);
        game.resultCount = Math.round(game.resultTarget * progress);
        ui.resultScore.textContent = game.resultCount.toString().padStart(4, '0');
        ui.resultRank.classList.toggle('active', game.phaseTimer > .72);
    }
    function update(delta) {
        state.elapsed += delta; game.phaseTimer += delta;
        
        // Poll gamepads every frame
        processGamepadInput(delta);
        
        ui.touchControls?.classList.toggle('answer-mode', game.phase === 'PLAYING' &&
            (game.routeGateActive || game.altarActive || game.guardianActive));
        updateLivingWorld(delta);
        portalData.coreMaterial.uniforms.uTime.value = state.elapsed;
        portalData.orbitA.rotation.z += delta * .19; portalData.orbitB.rotation.z -= delta * .27; portalData.particles.rotation.z += delta * .012;
        if (game.toastTimer > 0) { game.toastTimer -= delta; if (game.toastTimer <= 0) ui.toast.classList.remove('active'); }
        if (game.phase === 'MENU' || game.phase === 'DIFFICULTY' || game.phase === 'CONTROLS' || game.phase === 'RESULT' || game.phase === 'PAUSED' || game.phase === 'HELP' || game.phase === 'LEVEL_INTRO') {
            updateAttractCamera(delta);
            if (game.phase === 'RESULT') updateResult();
            if (game.phase === 'CONTROLS' && game.phaseTimer > 3.0) setPhase('INTRO');
            return;
        }
        if (game.phase === 'INTRO') {
            updateIntroCamera(delta);
            ui.intro.classList.toggle('pre-title', game.phaseTimer < .72);
            ui.intro.classList.toggle('title-only', game.phaseTimer >= .72 && game.phaseTimer < 1.58);
            if (game.phaseTimer > 2.65) setPhase('COUNTDOWN'); return;
        }
        if (game.phase === 'COUNTDOWN') {
            updateIntroCamera(delta);
            const count = Math.max(0, 3 - Math.floor(game.phaseTimer));
            const label = count > 0 ? String(count) : '¡CORRE!'; ui.countdown.textContent = label;
            ui.countdown.classList.toggle('go', count === 0);
            if (count !== game.lastCountdown) {
                ui.countdown.classList.remove('pulse'); void ui.countdown.offsetWidth; ui.countdown.classList.add('pulse');
                audio.cue(count > 0 ? 'count' : 'go'); game.lastCountdown = count;
                camera.position.addScaledVector(UP, count > 0 ? .035 : .075);
            }
            if (game.phaseTimer > 3.28) setPhase('PLAYING'); return;
        }
        if (game.phase === 'PLAYING') updateRunner(delta);
        else if (game.phase === 'PORTAL') updatePortal(delta);
    }
    function snapshot() {
        const visualState = motionController.state;
        const contractLevel = ACTIVE_CAMPAIGN_ADAPTER.contract.levels[LEVEL_INDEX];
        const activeSection = contractLevel.sections.find(section =>
            state.distance >= section.startDistance && state.distance < section.endDistance) || contractLevel.sections.at(-1);
        const screenSample = sampleAtDistance(state.distance);
        const screenLeft = screenSample.point.clone().addScaledVector(screenSample.lateral, -1).addScaledVector(UP, 1).project(camera).x;
        const screenRight = screenSample.point.clone().addScaledVector(screenSample.lateral, 1).addScaledVector(UP, 1).project(camera).x;
        const playerVisualRoot = motionController.root || explorer;
        const playerScreen = playerVisualRoot.getWorldPosition(new THREE.Vector3()).addScaledVector(UP, 1.25).project(camera);
        const movementState = visualState.startsWith('JUMP') || visualState === 'LAND' ? 'JUMP' :
            visualState.startsWith('SLIDE') ? 'SLIDE' :
                visualState === 'RUN_LEFT' || visualState === 'RUN_RIGHT' ? 'STEER' : visualState;
        const projectedHeight = object => {
            object.updateWorldMatrix(true, false);
            const geometryHeight = object.geometry.parameters.height || 1;
            const top = new THREE.Vector3(0, geometryHeight * .5, 0).applyMatrix4(object.matrixWorld).project(camera);
            const bottom = new THREE.Vector3(0, -geometryHeight * .5, 0).applyMatrix4(object.matrixWorld).project(camera);
            return Number((Math.abs(top.y - bottom.y) * innerHeight * .5).toFixed(1));
        };
        const projectedGlyphHeight = ({ face, faceMaterial }) => {
            const planeHeight = projectedHeight(face);
            const glyphHeight = faceMaterial.map?.userData?.mathLabel?.glyphHeight || 0;
            const resolution = faceMaterial.map?.userData?.mathLabel?.resolution || 512;
            return Number((planeHeight * glyphHeight / resolution).toFixed(1));
        };
        return {
            level: LEVEL.number, levelName: LEVEL.name, totalLevels: LEVELS.length,
            contentSource: ACTIVE_CAMPAIGN_ADAPTER.contentId,
            candidate: OFFICIAL_PREMIUM_CAMPAIGN ? 'mathquest-official-premium-campaign-v1' :
                PREMIUM_WATERFALL_V2_REQUESTED ? 'mathquest-premium-waterfall-v2' :
                PREMIUM_WATERFALL_REQUESTED ? 'mathquest-premium-waterfall-v1' :
                PREMIUM_CHARACTER_REQUESTED ? 'mathquest-premium-character-v1' :
                WATERFALL_PRODUCTION_ENABLED ? 'mathquest-waterfall-production-v1' :
                MATHEO_WORLD_ENABLED ? 'mathquest-matheo-structural-world-v1' :
                V3_MOTION_ENABLED ? 'mathquest-character-motion-integration-v3' : null,
            rebuildEnabled: REBUILD_ENABLED,
            activeSection: activeSection?.id || null,
            productionMechanism: productionWorld.snapshot(),
            mathSet: MATH_SET,
            problem: { ...ACTIVE_MATH.questions[game.difficulty] },
            altarProblem: { ...altarQuestion }, altarDistance, altarStopDistance,
            stalkerDistance, stalkerStopDistance, stalkerName: stalkerNames[LEVEL_INDEX],
            guardianProblem: { ...guardianQuestion }, guardianDistance, guardianStopDistance,
            guardianBehavior: ACTIVE_CAMPAIGN_ADAPTER.contract.levels[LEVEL_INDEX].guardianBehavior.behaviorId,
            mathGateStopDistance, mathGateResolveDistance,
            obstacleDistances: { first: { ...FIRST_OBSTACLES }, second: { ...SECOND_OBSTACLES } },
            maze: {
                enabled: EXPLORATION_ENABLED,
                distances: [...MAZE_DISTANCES], lanes: [...MAZE_LANES],
                gates: [...game.maze.gates], retries: game.maze.retries
            },
            runtimeFeatures: {
                exploration: EXPLORATION_ENABLED, altar: ALTAR_ENABLED, stalker: STALKER_ENABLED,
                obstacles: [...ENABLED_OBSTACLES], topologyId: LEVEL_RUNTIME?.topologyId || null
            },
            exploration: {
                enabled: game.exploration.enabled, active: game.exploration.active,
                completed: game.exploration.completed, entered: game.exploration.entered,
                runes: [...game.exploration.runes], blockedExits: game.exploration.blockedExits,
                start: EXPLORATION_START, end: EXPLORATION_END,
                runePositions: EXPLORATION_RUNES.map(position => ({ ...position })),
                forwardVelocity: runner.forwardVelocity,
                loop: {
                    branch: game.exploration.loop.branch, phase: game.exploration.loop.phase,
                    completed: game.exploration.loop.completed,
                    blockedAttempts: game.exploration.loop.blockedAttempts,
                    checkpoints: [...game.exploration.loop.checkpoints],
                    near: EXPLORATION_LOOP.near, far: EXPLORATION_LOOP.far,
                    forwardSeal: EXPLORATION_LOOP.forwardSeal, outerLane: EXPLORATION_LOOP.outerLane
                }
            },
            routeAlignment: {
                bridgeTurns: BRIDGE_ANCHORS.map(([distance]) => Number(routeTurnDegrees(distance).toFixed(2))),
                maxBridgeTurn: Number(Math.max(...BRIDGE_ANCHORS.map(([distance]) => routeTurnDegrees(distance))).toFixed(2)),
                altarTurn: Number(routeTurnDegrees(altarDistance, 3).toFixed(2)),
                stalkerTurn: Number(routeTurnDegrees(stalkerDistance, 3).toFixed(2)),
                guardianTurn: Number(routeTurnDegrees(guardianDistance, 3).toFixed(2))
            },
            phase: game.phase, phaseTimer: game.phaseTimer, difficulty: profiles[game.difficulty].name,
            premiumSectionComplete: game.premiumSectionComplete,
            difficultyProfile: { ...profiles[game.difficulty] },
            movementState, visualState, distance: state.distance, lateral: runner.lateral, targetLateral: runner.targetLateral, jumpY: runner.jumpY,
            slide: runner.slideTimer > 0, dash: runner.dashTimer > 0, lives: runner.lives,
            score: Math.round(runner.score), combo: runner.combo, maxCombo: runner.maxCombo,
            energy: runner.energy, mathResolved: runner.mathResolved, routeChoice: game.routeChoice,
            routeGateActive: game.routeGateActive, routeGateCommitted: game.routeGateCommitted,
            routeGateSelectedLane: game.routeGateSelectedLane, routeGateFeedback: game.routeGateFeedback,
            routeGateTimer: game.routeGateTimer, routeGateAttempts: game.routeGateAttempts,
            mastery: game.mastery.map(({ index, distance, stopDistance, resolved, active, attempts, open }) => ({ index, distance, stopDistance, resolved, active, attempts, open })),
            masteryActive: game.masteryActive,
            altarActive: game.altarActive, altarResolved: game.altarResolved,
            altarFeedback: game.altarFeedback, altarAttempts: game.altarAttempts,
            stalker: { ...game.stalker },
            guardianActive: game.guardianActive, guardianResolved: game.guardianResolved,
            guardianFeedback: game.guardianFeedback, guardianAttempts: game.guardianAttempts,
            guardianCombat: { ...game.guardianCombat },
            campaignMode: CAMPAIGN_MODE, campaignScore: Math.round(runner.score),
            session: {
                mode: session.mode, activeIndex: session.activeIndex, activePlayer: activePlayer().name,
                players: participatingPlayers().map(player => ({ ...player })),
                teamScore: participatingPlayers().reduce((sum, player) => sum + player.score, 0),
                duoRace: duoEnabled() ? {
                    context: duoRace.context, order: [...duoRace.order],
                    rejoin: duoRace.rejoin ? { ...duoRace.rejoin } : null,
                    penaltyActive: duoRace.penaltyActive,
                    penaltyElapsed: duoRace.penaltyTimer,
                    penaltyRate: duoRace.penaltyRate,
                    players: duoRace.players.map(player => ({ ...player, problem: player.problem ? { ...player.problem } : null }))
                } : null
            },
            audio: { ready: game.audioReady, muted: audio.muted, activeVoices: audio.activeVoices, maxVoices: audio.maxVoices },
            input: {
                actions: { ...ACTIONS }, held: [...game.actions],
                gamepads: gamepadState.connected.map((connected, index) => ({
                    connected, index: gamepadState.indices[index],
                    id: gamepadState.controllers[index]?.id || null,
                    pressed: gamepadState.prevButtons[index].map((pressed, button) => pressed ? button : -1).filter(button => button >= 0)
                }))
            },
            mathLabels: {
                ...mathLabelRenderer.snapshot(),
                routeProjectedHeights: mathSigns.map(({ face }) => projectedHeight(face)),
                routeProjectedGlyphHeights: mathSigns.map(projectedGlyphHeight),
                promptFractionCount: mathQuestionValue.querySelectorAll('.math-fraction').length
            },
            playtest: playtest.enabled ? playtestReport() : { enabled: false, schema: 'mathquest-playtest-v1' },
            tutorial: { ...runner.tutorial }, gameplayTime: runner.gameplayTime,
            motion: {
                ...motionController.snapshot(),
                mathToolAttached: Boolean(motionController.root?.getObjectByName('MATH_COMPASS_TOOL')),
                partner: duoEnabled() ? partnerController.snapshot() : null
            },
            visualPose: { ...visualPose }, rigPipelineVerification,
            productionReadiness: { ...productionReadiness },
            motionQualityProfile: ENHANCED_MOTION_ENABLED ? 'articulated-procedural-v3' : 'compatibility-v2',
            camera: {
                obstruction: game.cameraObstruction, faded: [...game.fadedOccluders],
                arm: game.cameraArm, teleports: game.cameraTeleports,
                lateralBasisScreenDirection: Math.sign(screenRight - screenLeft),
                playerNdc: { x: Number(playerScreen.x.toFixed(3)), y: Number(playerScreen.y.toFixed(3)), z: Number(playerScreen.z.toFixed(3)) },
                playerVisible: Math.abs(playerScreen.x) <= .94 && Math.abs(playerScreen.y) <= .94 && playerScreen.z >= -1 && playerScreen.z <= 1
            }
        };
    }
    function dispose() {
        removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); audio.dispose();
        motionController.dispose(); partnerController.dispose();
        scene.remove(partnerShadow, partnerCore);
        mathLabelRenderer.dispose();
        labelTextures.forEach(texture => texture.dispose());
    }
    function triggerAction(action) {
        if (game.phase !== 'PLAYING') setPhase('PLAYING');
        if (action === 'JUMP') requestJump();
        else if (action === 'SLIDE') requestSlide();
        else if (action === 'DASH') { runner.dashCooldown = 0; requestDash(); }
        else if (action === 'ATTACK') requestAttack();
        else if (action === 'POWER') { runner.energy = Math.max(1, runner.energy); requestPower(); }
        else if (action === 'HIT') { runner.shieldTimer = 0; hit('IMPACTO DE PRUEBA'); }
        return motionController.snapshot();
    }
    function startArcade(options = {}) {
        const requestedDifficulty = THREE.MathUtils.clamp(Number.parseInt(options.difficulty ?? game.difficulty, 10) || 0, 0, profiles.length - 1);
        session.mode = 'solo';
        session.activeIndex = 0;
        session.players[0].name = safePlayerName(options.name, 'EXPLORADOR 1');
        session.players[0].score = 0;
        session.players[0].answers = 0;
        session.players[0].correct = 0;
        session.players[0].responseMs = 0;
        session.players[0].challengeWins = 0;
        game.difficulty = requestedDifficulty;
        game.selection = requestedDifficulty;
        game.levelStarted = false;
        updateMathPresentation();
        setPhase('INTRO');
        setPhase('COUNTDOWN');
        return snapshot();
    }
    function setPlayerScore(playerIndex, score) {
        const player = session.players[Number(playerIndex)];
        if (!player) return false;
        player.score = Math.max(0, Number(score) || 0);
        updateHud();
        return true;
    }
    setPhase(CAMPAIGN_MODE && LEVEL_INDEX > 0 ? 'INTRO' : 'MENU'); updateHud();
    return {
        update, snapshot, dispose, setPhase, syncCameraToRunner, triggerAction, startArcade, setPlayerScore,
        setAbstractAction, setPlayerAction, playtestReport, selectRouteAnswer, resolveAltarAnswer, resolveGuardianAnswer,
        motionController, partnerController, runner, game
    };
}

const integratedGame = INTEGRATED ? createIntegratedGame() : null;

function updateCameraForShot(name) {
    const shot = shots[name];
    if (!shot) return false;
    const base = sampleAtDistance(shot.distance);
    const target = sampleAtDistance(shot.lookDistance);
    camera.position.copy(base.point)
        .addScaledVector(base.lateral, shot.side)
        .addScaledVector(base.tangent, -shot.back)
        .addScaledVector(UP, shot.up);
    cameraLook.copy(target.point).addScaledVector(target.lateral, shot.lookSide).addScaledVector(UP, shot.lookUp);
    camera.lookAt(cameraLook);
    camera.fov = name === 'overview' ? 62 : name === 'portal' ? 52 : 55;
    camera.updateProjectionMatrix();
    return true;
}

function updateMovement(delta) {
    if (integratedGame) {
        integratedGame.update(delta);
        return;
    }
    state.elapsed += delta;
    if (!state.paused && !state.finished) {
        state.distance = Math.min(routeLength - 1.7, state.distance + 7.9 * delta);
        state.finished = state.distance >= routeLength - 1.72;
    }
    const sample = sampleAtDistance(state.distance);
    const ground = sample.point;
    explorer.position.copy(ground).addScaledVector(UP, .04);
    contactShadow.position.copy(ground).addScaledVector(UP, .04);
    explorerTexture.offset.x = (Math.floor(state.elapsed * 10) % 4) * .25;

    if (!updateCameraForShot(state.shot)) {
        const desiredCamera = ground.clone().addScaledVector(sample.tangent, -6.2).addScaledVector(UP, 3.35);
        const desiredLook = ground.clone().addScaledVector(sample.tangent, 10.2).addScaledVector(UP, 1.65);
        camera.position.lerp(desiredCamera, 1 - Math.exp(-5.4 * delta));
        cameraLook.lerp(desiredLook, 1 - Math.exp(-6.2 * delta));
        camera.lookAt(cameraLook);
        camera.fov = THREE.MathUtils.damp(camera.fov, BASE_FOV, 8, delta);
        camera.updateProjectionMatrix();
    }
    portalData.coreMaterial.uniforms.uTime.value = state.elapsed;
    portalData.orbitA.rotation.z += delta * .19;
    portalData.orbitB.rotation.z -= delta * .27;
    portalData.particles.rotation.z += delta * .012;
}

function setShot(name) {
    state.shot = name || null;
    state.paused = Boolean(name);
    if (name === 'arch') state.distance = 4.2;
    if (name === 'column') state.distance = 20;
    if (name === 'bridge') state.distance = 40;
    if (name === 'portal') state.distance = portalDistance - 7;
}

function setBackplate(enabled) {
    state.backplate = Boolean(enabled);
    valleyPlate.visible = state.backplate;
}

function setEnergy(enabled) {
    state.energy = Boolean(enabled);
    portalData.coreMaterial.uniforms.uEnabled.value = enabled ? 1 : 0;
    portalData.particles.material.opacity = enabled ? .68 : 0;
    portalLight.intensity = enabled ? 11 : 0;
}

function restart() {
    state.distance = .8;
    state.elapsed = 0;
    state.finished = false;
    state.paused = false;
    state.shot = null;
}

const initial = sampleAtDistance(state.distance);
camera.position.copy(initial.point).addScaledVector(initial.tangent, -6.2).addScaledVector(UP, 3.35);
cameraLook.copy(initial.point).addScaledVector(initial.tangent, 10.2).addScaledVector(UP, 1.65);
camera.lookAt(cameraLook);

const frameSamples = [];
const renderSamples = [];
let ready = false;
let animationFrame = 0;
let lastTime = performance.now();

function snapshot() {
    const renderInfo = renderer.info.render;
    const average = frameSamples.length ? frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length : 0;
    const sorted = [...frameSamples].sort((a, b) => a - b);
    const renderAverage = renderSamples.length ? renderSamples.reduce((sum, value) => sum + value, 0) / renderSamples.length : 0;
    const result = {
        distance: state.distance,
        routeLength,
        elapsed: state.elapsed,
        finished: state.finished,
        shot: state.shot,
        backplate: state.backplate,
        energy: state.energy,
        materials: Object.keys(MATERIALS).slice(0, 4),
        components: { columns: 4, arch: 1, bridgeModules: 3, portal: 1 },
        performance: {
            fps: average ? 1000 / average : 0,
            frameTimeMs: average,
            frameP95Ms: sorted.length ? sorted[Math.floor(sorted.length * .95)] : 0,
            frameP99Ms: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .99))] : 0,
            renderTimeMs: renderAverage,
            drawCalls: renderInfo.calls,
            triangles: renderInfo.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            jsHeapUsedMb: performance.memory?.usedJSHeapSize
                ? performance.memory.usedJSHeapSize / 1024 / 1024
                : null
        }
    };
    if (integratedGame) result.game = integratedGame.snapshot();
    return result;
}

window.__mathquestArtKit = {
    ready: false, version: THREE.REVISION, snapshot, setShot, setBackplate, setEnergy, restart
};
if (integratedGame) {
    window.__mathquestGame = {
        ready: false,
        version: THREE.REVISION,
        snapshot: () => ({ ...integratedGame.snapshot(), performance: snapshot().performance }),
        setAction: (action, pressed = true) => integratedGame.setAbstractAction(action, pressed, 'external'),
        setPlayerAction: (playerIndex, action, pressed = true) => integratedGame.setPlayerAction(playerIndex, action, pressed, 'external-player'),
        startArcade: options => integratedGame.startArcade(options),
        playtestReport: () => integratedGame.playtestReport()
    };
    if (query.get('qa') === '1') {
        window.__mathquestGame.testing = {
            setPhase: phase => integratedGame.setPhase(phase),
            setDistance: distance => {
                state.distance = THREE.MathUtils.clamp(distance, 0, routeLength - .7);
                integratedGame.runner.lastDistance = state.distance;
                integratedGame.syncCameraToRunner();
            },
            setLateral: lateral => {
                const limit = integratedGame.game.exploration.active ? 5.3 : 3.2;
                integratedGame.runner.lateral = THREE.MathUtils.clamp(lateral, -limit, limit);
                integratedGame.runner.lateralVelocity = 0;
            },
            setEnergy: energy => { integratedGame.runner.energy = THREE.MathUtils.clamp(energy, 0, 5); },
            setPlayerScore: (playerIndex, score) => integratedGame.setPlayerScore(playerIndex, score),
            resolveRouteForView: () => {
                integratedGame.runner.mathResolved = true;
                integratedGame.game.routeChoice = integratedGame.snapshot().problem.correctLane;
                integratedGame.game.routeGateActive = false;
                integratedGame.game.routeGateCommitted = false;
            },
            setAction: (action, pressed = true) => integratedGame.setAbstractAction(action, pressed, 'qa'),
            step: (delta = 1 / 60) => integratedGame.update(THREE.MathUtils.clamp(Number(delta), 1 / 240, .05)),
            triggerAction: action => integratedGame.triggerAction(String(action).toUpperCase()),
            inspectView: () => {
                const ray = new THREE.Raycaster();
                const inspect = (x, y = 0) => {
                    ray.setFromCamera(new THREE.Vector2(x, y), camera);
                    return ray.intersectObjects(scene.children, true).slice(0, 8).map(hit => ({
                        name: hit.object.name || hit.object.parent?.name || 'UNNAMED',
                        parent: hit.object.parent?.name || null,
                        parentChain: (() => {
                            const names = []; let current = hit.object;
                            while (current && names.length < 6) {
                                if (current.name) names.push(current.name);
                                current = current.parent;
                            }
                            return names;
                        })(),
                        type: hit.object.type,
                        geometry: hit.object.geometry?.type || null,
                        material: Array.isArray(hit.object.material)
                            ? hit.object.material.map(material => material?.name || material?.type)
                            : hit.object.material?.name || hit.object.material?.type || null,
                        uuid: hit.object.uuid,
                        distance: Number(hit.distance.toFixed(3)),
                        visible: hit.object.visible
                    }));
                };
                return {
                    left: inspect(-.62), center: inspect(0), right: inspect(.62),
                    lowerLeft: inspect(-.42, -.58), lowerCenter: inspect(0, -.58), lowerRight: inspect(.42, -.58)
                };
            },
            answerRoute: (index, playerIndex) => playerIndex === undefined ? integratedGame.selectRouteAnswer(Number(index)) : integratedGame.setPlayerAction(Number(playerIndex), ['ANSWER_A', 'ANSWER_B', 'ANSWER_C'][Number(index)], true, 'qa-player'),
            answerAltar: (index, playerIndex) => playerIndex === undefined ? integratedGame.resolveAltarAnswer(Number(index)) : integratedGame.setPlayerAction(Number(playerIndex), ['ANSWER_A', 'ANSWER_B', 'ANSWER_C'][Number(index)], true, 'qa-player'),
            answerGuardian: (index, playerIndex) => playerIndex === undefined ? integratedGame.resolveGuardianAnswer(Number(index)) : integratedGame.setPlayerAction(Number(playerIndex), ['ANSWER_A', 'ANSWER_B', 'ANSWER_C'][Number(index)], true, 'qa-player'),
            setGuardianCombat: (phase, timer = .12) => {
                Object.assign(integratedGame.game.guardianCombat, {
                    phase: String(phase).toUpperCase(), timer: Number(timer),
                    contactResolved: false, recoveryHit: false
                });
                integratedGame.runner.attackTimer = 0;
                integratedGame.runner.attackImpactTimer = 0;
                integratedGame.runner.hitTimer = 0;
            },
            setStalkerCombat: (phase, timer = .12) => {
                const normalized = String(phase).toUpperCase();
                Object.assign(integratedGame.game.stalker, {
                    active: normalized !== 'DEFEATED', resolved: normalized === 'DEFEATED',
                    phase: normalized, timer: Number(timer),
                    contactResolved: false, recoveryHit: false
                });
                integratedGame.runner.attackTimer = 0;
                integratedGame.runner.attackImpactTimer = 0;
                integratedGame.runner.hitTimer = 0;
            },
            resolveStalker: () => {
                Object.assign(integratedGame.game.stalker, {
                    active: false, resolved: true, phase: 'DEFEATED', timer: 0,
                    health: 0, contactResolved: true, recoveryHit: true
                });
            },
            prepareGuardian: () => {
                integratedGame.runner.mathResolved = true;
                integratedGame.game.altarActive = false;
                integratedGame.game.altarResolved = true;
                integratedGame.game.exploration.active = false;
                integratedGame.game.exploration.completed = true;
                integratedGame.game.masteryActive = null;
                integratedGame.game.mastery.forEach(mechanism => {
                    mechanism.active = false;
                    mechanism.resolved = true;
                    mechanism.open = 1;
                });
                Object.assign(integratedGame.game.stalker, {
                    active: false, resolved: true, phase: 'DEFEATED', timer: 0,
                    health: 0, contactResolved: true, recoveryHit: true
                });
            },
            loadCharacter: (url, options) => integratedGame.motionController.load(url, options)
        };
    }
}

function render(now) {
    const delta = Math.min(.05, Math.max(1 / 240, (now - lastTime) / 1000));
    lastTime = now;
    updateMovement(delta);
    productionWorld.update(delta, integratedGame?.runner, integratedGame?.game);
    sky.material.uniforms.uTime.value = state.elapsed;
    const start = performance.now();
    renderer.render(scene, camera);
    const renderTime = performance.now() - start;
    if (ready && delta < .08) {
        frameSamples.push(delta * 1000);
        renderSamples.push(renderTime);
        if (frameSamples.length > 360) frameSamples.shift();
        if (renderSamples.length > 360) renderSamples.shift();
    }
    if (!ready && productionReadiness.world && productionReadiness.character) {
        ready = true;
        window.__mathquestArtKit.ready = true;
        if (window.__mathquestGame) window.__mathquestGame.ready = true;
        fallback.style.display = 'none';
    }
    animationFrame = requestAnimationFrame(render);
}

function onResize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, EMBEDDED_SPLIT_PLAYER ? .64 : INTEGRATED ? .82 : .9));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);
addEventListener('pagehide', () => {
    cancelAnimationFrame(animationFrame);
    integratedGame?.dispose();
    removeEventListener('resize', onResize);
    const geometries = new Set();
    const materials = new Set();
    scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    stoneTexture.dispose(); softTexture.dispose(); valleyTexture?.dispose(); explorerTexture.dispose();
    renderer.dispose();
}, { once: true });

animationFrame = requestAnimationFrame(render);
