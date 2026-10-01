import * as THREE from 'three';
import { mergeGeometries } from '../production-art/vendor/BufferGeometryUtils.js';

const canvas = document.querySelector('#scene');
const fallback = document.querySelector('#fallback');
const query = new URLSearchParams(location.search);
const INTEGRATED = document.body.dataset.mode === 'integrated' || query.get('integrated') === '1';
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, INTEGRATED ? .82 : .9));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06141b);
scene.fog = new THREE.FogExp2(0x102c35, .0128);
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
const softTexture = makeSoftTexture();
const MATERIALS = {
    STONE_PRIMARY: new THREE.MeshStandardMaterial({
        name: 'STONE_PRIMARY', color: 0xa5aeaa, map: stoneTexture,
        roughness: .91, metalness: .02, envMapIntensity: .25
    }),
    STONE_DAMAGED: new THREE.MeshStandardMaterial({
        name: 'STONE_DAMAGED', color: 0x697a79, map: stoneTexture,
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
    GROUND: new THREE.MeshStandardMaterial({
        color: 0x263a3e, map: stoneTexture, roughness: 1, metalness: 0
    })
};

const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 7),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(-1.4, .15, -22),
    new THREE.Vector3(1.4, 1.0, -37),
    new THREE.Vector3(4.8, 2.05, -51),
    new THREE.Vector3(10.5, 2.5, -65)
], false, 'catmullrom', .32);
const routeLength = route.getLength();

function sampleAtDistance(distance) {
    const progress = THREE.MathUtils.clamp(distance / routeLength, 0, 1);
    const point = route.getPointAt(progress);
    const tangent = route.getTangentAt(progress).normalize();
    const lateral = new THREE.Vector3().crossVectors(UP, tangent).normalize();
    return { progress, point, tangent, lateral };
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
    const core = mesh(new THREE.CircleGeometry(3.72, 64), coreMaterial, [0, 6.45, 1.48]);
    group.add(core);
    const orbitA = new THREE.Group();
    orbitA.position.set(0, 6.45, 1.65);
    orbitA.scale.y = .72;
    addRingSegments(orbitA, { inner: 2.64, outer: 2.76, depth: .1, count: 12, gap: .035, material: MATERIALS.GOLD_AGED });
    const orbitB = new THREE.Group();
    orbitB.position.set(0, 6.45, 1.69);
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
    return { group, coreMaterial, orbitA, orbitB, particles };
}

scene.add(new THREE.HemisphereLight(0xa8e8ed, 0x091217, 2.35));
scene.add(new THREE.AmbientLight(0x315a65, .72));
const sun = new THREE.DirectionalLight(0xffd39a, 4.25);
sun.position.set(-28, 38, 17);
scene.add(sun);
const cyanFill = new THREE.DirectionalLight(0x55c9cc, .62);
cyanFill.position.set(24, 14, -35);
scene.add(cyanFill);

const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0x06131d) }, uHorizon: { value: new THREE.Color(0x315e67) } },
    vertexShader: `varying float vY; void main(){vY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying float vY; uniform vec3 uTop; uniform vec3 uHorizon; void main(){float h=smoothstep(-.2,.62,vY);gl_FragColor=vec4(mix(uHorizon,uTop,h),1.0);}`
}));
scene.add(sky);

const ground = mesh(new THREE.PlaneGeometry(230, 230, 1, 1), MATERIALS.GROUND, [0, -1.05, -28], [-Math.PI / 2, 0, 0]);
scene.add(ground);

for (let distance = 0; distance < routeLength - 2; distance += 2.05) {
    const sample = sampleAtDistance(distance + 1.0);
    const slab = stoneBlock(ROUTE_WIDTH, .62, 1.92,
        [sample.point.x, sample.point.y - .36, sample.point.z],
        distance > 32 && distance < 57 ? MATERIALS.STONE_PRIMARY : MATERIALS.STONE_DAMAGED, .1);
    slab.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
    scene.add(slab);
    if (Math.round(distance / 2.05) % 4 === 1) {
        const rune = stoneBlock(1.9, .04, .09, [sample.point.x, sample.point.y - .02, sample.point.z], MATERIALS.GOLD_AGED, .01);
        rune.rotation.y = slab.rotation.y + (Math.round(distance) % 2 ? .62 : -.62);
        scene.add(rune);
    }
}

const arch = createArch();
placeAlong(arch, 9.0, 0, -.12);
scene.add(arch);
registerCameraOccluders(arch, 'ARCH');

for (const [distance, offset, variant] of [[20.5, 6.8, 0], [27.2, 7.15, 1]]) {
    for (const side of [-1, 1]) {
        const column = createColumn(variant);
        placeAlong(column, distance + side * .3, side * offset, -.68);
        column.rotation.y += side * .06;
        scene.add(column);
        registerCameraOccluders(column, `COLUMN_${distance}_${side}`);
    }
}

for (const [distance, type] of [[35.2, 'start'], [43.1, 'middle'], [51.0, 'end']]) {
    const bridge = createBridgeModule(type);
    placeAlong(bridge, distance, 0, -.48);
    scene.add(bridge);
    registerCameraOccluders(bridge, `BRIDGE_${type}`);
}

const portalDistance = routeLength - 4.1;
const portalData = createPortal(query.get('energy') !== '0');
placeAlong(portalData.group, portalDistance, 0, -.72);
scene.add(portalData.group);
registerCameraOccluders(portalData.group, 'PORTAL_FRAME');
const portalSample = sampleAtDistance(portalDistance);
const portalLight = new THREE.PointLight(0x4ae3df, query.get('energy') === '0' ? 0 : 11, 25, 1.8);
portalLight.position.copy(portalSample.point).addScaledVector(UP, 6.2);
scene.add(portalLight);

for (let index = 0; index < 36; index++) {
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

const valleyTexture = new THREE.TextureLoader().load('../thirdperson-camera/temple-valley-v1.png');
valleyTexture.colorSpace = THREE.SRGBColorSpace;
const valleyPlate = new THREE.Mesh(new THREE.PlaneGeometry(182, 112), new THREE.MeshBasicMaterial({
    map: valleyTexture, transparent: true, opacity: .62, depthWrite: false, fog: true
}));
valleyPlate.position.set(6, 16, -118);
valleyPlate.visible = INTEGRATED || query.get('backplate') === '1';
valleyPlate.renderOrder = -10;
scene.add(valleyPlate);

const explorerTexture = new THREE.TextureLoader().load('../../assets/fair/player/run-up.png');
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
        score: document.querySelector('#hud-score'),
        energy: document.querySelector('#hud-energy'),
        tutorial: document.querySelector('#tutorial-prompt'),
        question: document.querySelector('#math-question'),
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
        intro: document.querySelector('#intro-screen'),
        energyPanel: document.querySelector('.energy')
    };
    const screenIds = {
        MENU: 'menu-screen', DIFFICULTY: 'difficulty-screen', CONTROLS: 'controls-screen',
        INTRO: 'intro-screen', COUNTDOWN: 'countdown-screen', PAUSED: 'pause-screen', RESULT: 'result-screen'
    };
    const profiles = [
        { name: 'EXPLORADOR', speed: 2.55, steer: 6.2, acceleration: 22, obstacleThreshold: .4, multiplier: 1 },
        { name: 'AVENTURERO', speed: 2.92, steer: 6.8, acceleration: 25, obstacleThreshold: .55, multiplier: 1.25 },
        { name: 'MAESTRO', speed: 3.28, steer: 7.4, acceleration: 28, obstacleThreshold: .68, multiplier: 1.6 }
    ];
    const game = {
        phase: 'MENU', phaseTimer: 0, difficulty: 1, selection: 1, menuSelection: 0,
        pausedFrom: 'PLAYING', keys: new Set(), lastCountdown: 4, toastTimer: 0,
        routeChoice: null, audioReady: false, tutorialMessage: null, questionVisible: null,
        resultCount: 0, resultTarget: 0, portalRiseTimer: 0,
        cameraArm: 6.45, cameraObstruction: null, fadedOccluders: [], cameraTeleports: 0
    };
    const runner = {
        state: 'DISABLED', lateral: 0, lateralVelocity: 0, targetLateral: null,
        jumpY: 0, verticalVelocity: 0, jumpAnticipation: 0, slideAnticipation: 0,
        slideTimer: 0, dashTimer: 0, dashCooldown: 0, dashFlashTimer: 0,
        hitTimer: 0, landingTimer: 0, attackTimer: 0, attackImpactTimer: 0,
        shieldTimer: 0, powerActivationTimer: 0, stepTimer: 0, bodyLean: 0,
        mathFeedbackTimer: 0, mathFeedbackLane: 0, mathFeedbackCorrect: true,
        gameplayTime: 0, lives: 3, score: 1250, combo: 1, maxCombo: 1, energy: 0,
        questions: 0, correct: 0, mathResolved: false, lastDistance: 1.2,
        obstacles: { jump: false, slide: false, dash: false },
        tutorial: { move: false, jump: false, slide: false, dash: false }
    };

    const audio = {
        context: null,
        ensure() {
            if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
            if (this.context.state === 'suspended') this.context.resume();
            game.audioReady = true;
        },
        tone(frequency, duration = .1, type = 'sine', volume = .035, glide = 0) {
            if (!this.context || this.context.state !== 'running') return;
            const now = this.context.currentTime;
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);
            if (glide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + glide), now + duration);
            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume, now + .012);
            gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
            oscillator.connect(gain).connect(this.context.destination);
            oscillator.start(now); oscillator.stop(now + duration + .02);
        },
        cue(name) {
            const cues = {
                start: [330, .18, 'triangle', .045, 260], confirm: [520, .11, 'sine', .04, 180],
                count: [420, .08, 'square', .025, 0], go: [620, .2, 'triangle', .05, 360],
                foot: [105, .055, 'triangle', .018, -18], jump: [260, .14, 'triangle', .035, 220],
                land: [90, .12, 'sine', .04, -25], slide: [150, .2, 'sawtooth', .018, -70],
                dash: [190, .28, 'sawtooth', .035, 780], attack: [360, .16, 'square', .025, 340],
                power: [220, .35, 'sine', .038, 440], correct: [520, .26, 'triangle', .045, 360],
                wrong: [180, .25, 'sawtooth', .025, -80], portal: [180, .8, 'sine', .045, 720],
                result: [440, .45, 'triangle', .04, 440]
            };
            if (cues[name]) this.tone(...cues[name]);
        },
        dispose() { this.context?.close(); }
    };

    const course = new THREE.Group();
    course.name = 'INTEGRATED_COURSE';
    scene.add(course);
    const labelTextures = [];
    function placeCourse(object, distance, lateral = 0, vertical = 0) {
        const sample = sampleAtDistance(distance);
        object.position.copy(sample.point).addScaledVector(sample.lateral, lateral).addScaledVector(UP, vertical);
        object.rotation.y = Math.atan2(sample.tangent.x, sample.tangent.z);
        course.add(object);
        return object;
    }
    function labelTexture(value) {
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
    for (const [x, y, w, angle] of [[-2.9, .28, 2.3, -.1], [-.7, .4, 2.0, .13], [1.25, .3, 1.8, -.16], [3.0, .45, 1.5, .12]]) {
        const block = stoneBlock(w, .72 + y, 1.0, [x, y, 0], MATERIALS.STONE_DAMAGED, .12);
        block.rotation.z = angle; jumpHazard.add(block);
    }
    const crack = stoneBlock(7.2, .05, .22, [0, .03, .1], MATERIALS.CYAN_EMISSIVE, .01);
    jumpHazard.add(crack); placeCourse(jumpHazard, 15.2, 0, -.1);

    const slideHazard = new THREE.Group();
    for (const side of [-1, 1]) {
        slideHazard.add(
            stoneBlock(1.0, 2.82, .82, [side * 3.18, 1.25, 0], MATERIALS.STONE_DAMAGED, .12),
            stoneBlock(.1, 1.92, .07, [side * 2.72, 1.34, -.45], MATERIALS.CYAN_EMISSIVE, .015),
            stoneBlock(1.3, .22, 1.02, [side * 3.18, 2.68, 0], MATERIALS.GOLD_AGED, .04)
        );
    }
    const slideCanopy = new THREE.Group();
    const beam = stoneBlock(6.35, .46, .62, [0, 2.31, 0], MATERIALS.STONE_PRIMARY, .1);
    beam.rotation.z = -.018;
    slideCanopy.add(
        beam,
        stoneBlock(5.85, .075, .68, [0, 2.06, -.015], MATERIALS.CYAN_EMISSIVE, .018),
        stoneBlock(1.2, .13, .74, [-2.35, 2.58, 0], MATERIALS.GOLD_AGED, .025),
        stoneBlock(1.2, .13, .74, [2.35, 2.58, 0], MATERIALS.GOLD_AGED, .025)
    );
    slideHazard.add(slideCanopy);
    placeCourse(slideHazard, 26.2, 0, -.18);

    const dashGate = new THREE.Group();
    for (const side of [-1, 1]) {
        const pylon = stoneBlock(2.3, 4.2, 2.2, [side * 3.25, 1.65, 0], MATERIALS.STONE_DAMAGED, .15);
        pylon.rotation.z = side * -.06;
        dashGate.add(pylon, stoneBlock(.12, 3.2, .08, [side * 2.35, 1.65, 1.14], MATERIALS.CYAN_EMISSIVE, .015));
    }
    placeCourse(dashGate, 37.6, 0, -.45);

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
    for (const [lane, answer] of [[-1, '5'], [0, '6'], [1, '8']]) {
        const sign = new THREE.Group();
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
        const medallion = mesh(new THREE.CylinderGeometry(.56, .56, .18, 12), gateStone,
            [0, medallionY, -.15], [Math.PI / 2, 0, 0]);
        const runeRing = mesh(new THREE.TorusGeometry(.59, .055, 6, 18), MATERIALS.GOLD_AGED,
            [0, medallionY, -.27]);
        const faceMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture(answer), transparent: true, alphaTest: .04,
            side: THREE.DoubleSide, toneMapped: false, depthWrite: false
        });
        const face = mesh(new THREE.PlaneGeometry(1.08, 1.08), faceMaterial,
            [0, medallionY, -.31], [0, Math.PI, 0]);
        face.renderOrder = 4;
        face.userData.cameraFadeHard = true;
        sign.add(medallion, runeRing, face,
            stoneBlock(2.08, .075, .72, [0, .03, 0], MATERIALS.CYAN_EMISSIVE, .015));
        if (isCenter) {
            const crown = mesh(new THREE.OctahedronGeometry(.24, 0), MATERIALS.CYAN_EMISSIVE, [0, 4.78, 0]);
            crown.scale.set(.72, 1.25, .42); sign.add(crown);
        }
        placeCourse(sign, 52.0, lane * 2.62, isCenter ? .18 : .02);
        mathSigns.push({ lane, sign, faceMaterial });
    }

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

    course.updateMatrixWorld(true);
    const fadeGroups = [];
    const fadeMeshes = [];
    function registerFadeGroup(root, name) {
        const meshes = [];
        root.traverse(object => {
            if (!object.isMesh) return;
            if (Object.values(MATERIALS).includes(object.material)) object.material = object.material.clone();
            object.material.transparent = true; object.material.opacity = 1;
            object.userData.cameraFadeGroup = name;
            meshes.push(object); fadeMeshes.push(object);
        });
        fadeGroups.push({
            name, meshes, opacity: 1,
            box: new THREE.Box3().setFromObject(root).expandByScalar(.28)
        });
    }
    registerFadeGroup(slideCanopy, 'SLIDE_CANOPY');
    registerFadeGroup(dashGate, 'DASH_GATE');
    mathSigns.forEach(({ sign, lane }) => registerFadeGroup(sign, `MATH_GATE_${lane}`));
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
        for (const item of cameraOccluderBoxes) {
            if (item.box.containsPoint(focus)) continue;
            const hit = cameraRay.intersectBox(item.box, cameraHit);
            if (!hit) continue;
            const distance = focus.distanceTo(hit);
            if (distance > .55 && distance < obstructionDistance) {
                obstructionDistance = distance; obstruction = item.name;
            }
        }
        const targetArm = obstruction ? Math.max(.82, obstructionDistance - .28) : desiredDistance;
        game.cameraArm = THREE.MathUtils.damp(game.cameraArm, targetArm, obstruction ? 18 : 4.2, delta);
        game.cameraArm = Math.min(game.cameraArm, desiredDistance);
        game.cameraObstruction = obstruction;
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
            const nearCamera = group.box.distanceToPoint(camera.position) < 4.1;
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
    function updateHud() {
        ui.lives.textContent = Array.from({ length: 3 }, (_, index) => index < runner.lives ? '♥' : '♡').join(' ');
        ui.combo.innerHTML = `COMBO <b>x${runner.combo}</b>`;
        ui.score.textContent = Math.round(runner.score).toString().padStart(4, '0');
        ui.energy.textContent = `${'●'.repeat(runner.energy)}${'○'.repeat(5 - runner.energy)}`;
    }
    function toast(message, duration = 1.25) {
        ui.toast.textContent = message; ui.toast.classList.add('active'); game.toastTimer = duration;
    }
    function confirmSweep() {
        ui.flash.classList.remove('active', 'confirm'); void ui.flash.offsetWidth;
        ui.flash.classList.add('confirm');
        setTimeout(() => ui.flash.classList.remove('confirm'), 520);
    }
    function resetRunner() {
        Object.assign(runner, {
            state: 'DISABLED', lateral: 0, lateralVelocity: 0, targetLateral: null,
            jumpY: 0, verticalVelocity: 0, jumpAnticipation: 0, slideAnticipation: 0,
            slideTimer: 0, dashTimer: 0, dashCooldown: 0, dashFlashTimer: 0,
            hitTimer: 0, landingTimer: 0, attackTimer: 0, attackImpactTimer: 0,
            shieldTimer: 0, powerActivationTimer: 0, stepTimer: 0, bodyLean: 0,
            mathFeedbackTimer: 0, mathFeedbackLane: 0, mathFeedbackCorrect: true,
            gameplayTime: 0, lives: 3, score: 1250, combo: 1, maxCombo: 1, energy: 0,
            questions: 0, correct: 0, mathResolved: false, lastDistance: 1.2,
            obstacles: { jump: false, slide: false, dash: false },
            tutorial: { move: false, jump: false, slide: false, dash: false }
        });
        state.distance = 1.2; state.finished = false; state.shot = null;
        game.routeChoice = null; game.portalRiseTimer = 0; game.cameraArm = 6.45;
        game.cameraObstruction = null; game.fadedOccluders = [];
        explorer.scale.set(3.55, 3.55, 1); explorer.material.rotation = 0;
        explorer.material.color.set(0xffffff); backpackGlow.visible = false;
        afterImages.forEach(image => { image.visible = false; image.material.opacity = 0; });
        mathWave.visible = false; powerRing.visible = false; attackImpact.visible = false;
        mathSigns.forEach(({ faceMaterial }) => faceMaterial.color.set(0xffffff));
        updateHud();
    }
    function setPhase(phase) {
        game.phase = phase; game.phaseTimer = 0; game.lastCountdown = 4;
        game.tutorialMessage = null; game.questionVisible = null;
        showScreen(phase);
        ui.hud.classList.toggle('active', ['PLAYING', 'PORTAL'].includes(phase));
        ui.question.classList.remove('active'); ui.tutorial.classList.remove('active');
        ui.intro.classList.remove('pre-title', 'title-only');
        if (phase === 'MENU') {
            explorer.visible = false; contactShadow.visible = false; runner.state = 'DISABLED'; state.distance = portalDistance - 7;
        } else if (phase === 'DIFFICULTY') {
            game.selection = game.difficulty; select(ui.difficultyChoices, game.selection);
        } else if (phase === 'INTRO') {
            resetRunner(); explorer.visible = true; contactShadow.visible = true; runner.state = 'DISABLED';
            ui.intro.classList.add('pre-title');
        } else if (phase === 'COUNTDOWN') {
            explorer.visible = true; contactShadow.visible = true; runner.state = 'DISABLED'; ui.countdown.textContent = '3';
            ui.countdown.classList.remove('go');
        } else if (phase === 'PLAYING') {
            runner.state = 'RUN'; explorer.visible = true; contactShadow.visible = true; state.paused = false;
        } else if (phase === 'RESULT') {
            explorer.visible = false; contactShadow.visible = false; runner.state = 'DISABLED'; game.menuSelection = 0;
            select(ui.resultChoices, 0);
            const seconds = Math.floor(runner.gameplayTime);
            ui.resultTime.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            ui.resultAccuracy.textContent = `${runner.questions ? Math.round(runner.correct / runner.questions * 100) : 0}%`;
            ui.resultCombo.textContent = `x${runner.maxCombo}`; ui.resultLives.textContent = runner.lives;
            game.resultTarget = Math.round(runner.score); game.resultCount = 0; ui.resultScore.textContent = '0000';
            const accuracy = runner.questions ? runner.correct / runner.questions : 0;
            const rank = accuracy >= 1 && runner.lives >= 2 ? 'ORO' : accuracy >= .5 ? 'PLATA' : 'BRONCE';
            ui.resultRank.querySelector('b').textContent = rank; ui.resultRank.classList.remove('active'); audio.cue('result');
        }
    }

    function navigateMenu(direction) {
        if (game.phase === 'DIFFICULTY') {
            game.selection = (game.selection + direction + profiles.length) % profiles.length;
            select(ui.difficultyChoices, game.selection); audio.cue('confirm'); return;
        }
        const items = game.phase === 'PAUSED' ? ui.pauseChoices : ui.resultChoices;
        game.menuSelection = (game.menuSelection + direction + items.length) % items.length;
        select(items, game.menuSelection); audio.cue('confirm');
    }
    function confirm() {
        audio.ensure();
        if (game.phase === 'MENU') { confirmSweep(); audio.cue('start'); setPhase('DIFFICULTY'); }
        else if (game.phase === 'DIFFICULTY') { confirmSweep(); game.difficulty = game.selection; audio.cue('confirm'); setPhase('CONTROLS'); }
        else if (game.phase === 'CONTROLS') { audio.cue('confirm'); setPhase('INTRO'); }
        else if (game.phase === 'INTRO') { audio.cue('confirm'); setPhase('COUNTDOWN'); }
        else if (game.phase === 'PLAYING') pause();
        else if (game.phase === 'PAUSED') {
            if (game.menuSelection === 0) resume();
            else if (game.menuSelection === 1) setPhase('INTRO');
            else setPhase('MENU');
        } else if (game.phase === 'RESULT') {
            if (game.menuSelection === 0) { confirmSweep(); resetRunner(); setPhase('COUNTDOWN'); } else setPhase('MENU');
        }
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
    function requestDash() {
        if (runner.dashCooldown > 0 || runner.hitTimer > 0) return;
        runner.dashTimer = .46; runner.dashFlashTimer = .13; runner.dashCooldown = 2.5; runner.state = 'DASH'; runner.tutorial.dash = true;
        runner.score += Math.round(100 * profiles[game.difficulty].multiplier); audio.cue('dash'); updateHud();
    }
    function requestAttack() {
        if (runner.hitTimer > 0 || runner.attackTimer > 0) return;
        runner.attackTimer = .42; runner.attackImpactTimer = .24; attackPulse.visible = true; attackPulse.scale.setScalar(.25); audio.cue('attack');
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
    function onKeyDown(event) {
        const code = event.code;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) event.preventDefault();
        game.keys.add(code);
        if (event.repeat) return;
        audio.ensure();
        if (code === 'Enter') { confirm(); return; }
        if (code === 'Escape') { if (game.phase === 'PAUSED') resume(); else pause(); return; }
        if (['DIFFICULTY', 'PAUSED', 'RESULT'].includes(game.phase)) {
            if (code === 'ArrowUp' || code === 'KeyW') navigateMenu(-1);
            if (code === 'ArrowDown' || code === 'KeyS') navigateMenu(1);
            return;
        }
        if (game.phase !== 'PLAYING') return;
        if (code === 'ArrowUp' || code === 'KeyW') requestJump();
        if (code === 'ArrowDown' || code === 'KeyS') requestSlide();
        if (code === 'KeyK') requestDash();
        if (code === 'KeyJ') requestAttack();
        if (code === 'KeyL') requestPower();
        if (state.distance > 44 && state.distance < 54) {
            if (code === 'KeyA') runner.targetLateral = -2.3;
            if (code === 'KeyB') runner.targetLateral = 0;
            if (code === 'KeyC') runner.targetLateral = 2.3;
        }
    }
    function onKeyUp(event) { game.keys.delete(event.code); }
    addEventListener('keydown', onKeyDown, { passive: false }); addEventListener('keyup', onKeyUp);

    function cameraPose(distance, side, back, up, lookDistance, lookSide, lookUp, damping, delta) {
        const base = sampleAtDistance(distance); const target = sampleAtDistance(lookDistance);
        const desired = base.point.clone().addScaledVector(base.lateral, side).addScaledVector(base.tangent, -back).addScaledVector(UP, up);
        const look = target.point.clone().addScaledVector(target.lateral, lookSide).addScaledVector(UP, lookUp);
        camera.position.lerp(desired, 1 - Math.exp(-damping * delta)); cameraLook.lerp(look, 1 - Math.exp(-damping * delta));
        camera.lookAt(cameraLook);
    }
    function updateAttractCamera(delta) {
        const drift = Math.sin(state.elapsed * .24);
        cameraPose(portalDistance - 8.8, 7.0 + drift * .75, 2.0, 5.5 + drift * .18,
            portalDistance, 0, 5.7, 2.2, delta);
        camera.fov = THREE.MathUtils.damp(camera.fov, 52, 4, delta); camera.updateProjectionMatrix();
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
        const sample = sampleAtDistance(1.2); explorer.position.copy(sample.point).addScaledVector(UP, .04); contactShadow.position.copy(sample.point).addScaledVector(UP, .04);
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
            image.scale.set(3.55, 3.55, 1); image.material.rotation = explorer.material.rotation;
        });
        backpackGlow.visible = explorer.visible;
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
        const portalApproach = THREE.MathUtils.clamp((state.distance - 55) / Math.max(1, portalDistance - 55), 0, 1);
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
    function resolveCourseEvents() {
        const distance = state.distance; const previous = runner.lastDistance;
        if (!runner.obstacles.jump && previous < 15.2 && distance >= 15.2) {
            runner.obstacles.jump = true;
            if (runner.jumpY >= profiles[game.difficulty].obstacleThreshold) success('jump'); else hit('¡SALTA SOBRE LA RUPTURA!');
        }
        if (!runner.obstacles.slide && previous < 26.2 && distance >= 26.2) {
            runner.obstacles.slide = true;
            if (runner.slideTimer > .08) success('slide'); else hit('¡DESLÍZATE BAJO EL ARCO!');
        }
        if (!runner.obstacles.dash && previous < 37.6 && distance >= 37.6) {
            runner.obstacles.dash = true;
            if (runner.dashTimer > 0 || Math.abs(runner.lateral) < 1.18) success('dash'); else hit('¡USA DASH O BUSCA EL CENTRO!');
        }
        if (!runner.mathResolved && previous < 54.2 && distance >= 54.2) {
            runner.mathResolved = true; runner.questions = 1;
            const lane = runner.lateral < -.82 ? -1 : runner.lateral > .82 ? 1 : 0;
            game.routeChoice = lane;
            if (lane === 0) {
                runner.correct = 1; runner.energy = Math.min(5, runner.energy + 1); runner.combo++;
                runner.maxCombo = Math.max(runner.maxCombo, runner.combo);
                runner.score += Math.round(750 * profiles[game.difficulty].multiplier);
                mathSigns[1].faceMaterial.color.set(0x7ffff4); toast('RUTA CORRECTA · +ENERGÍA Σ', 1.8); audio.cue('correct');
                runner.mathFeedbackTimer = .65; runner.mathFeedbackLane = lane; runner.mathFeedbackCorrect = true;
            } else {
                runner.combo = 1; runner.hitTimer = .65; runner.score = Math.max(0, runner.score - 150);
                mathSigns[lane < 0 ? 0 : 2].faceMaterial.color.set(0xff875f); toast('18 ÷ 3 = 6 · RECUPERA EL RITMO', 1.8); audio.cue('wrong');
                runner.mathFeedbackTimer = .65; runner.mathFeedbackLane = lane; runner.mathFeedbackCorrect = false;
            }
            runner.targetLateral = null; updateHud();
        }
        runner.lastDistance = distance;
    }
    function updateTutorial() {
        let message = '';
        if (!runner.tutorial.move && state.distance < 9) message = '← →  MOVER';
        else if (!runner.tutorial.jump && state.distance > 10.5 && state.distance < 15.2) message = '↑  SALTAR';
        else if (!runner.tutorial.slide && state.distance > 21.5 && state.distance < 26.2) message = '↓  DESLIZAR';
        else if (!runner.tutorial.dash && state.distance > 33 && state.distance < 37.6) message = 'K  DASH';
        if (message !== game.tutorialMessage) {
            game.tutorialMessage = message;
            ui.tutorial.textContent = message; ui.tutorial.classList.toggle('active', Boolean(message));
        }
        const questionVisible = state.distance > 43.5 && state.distance < 55.3 && !runner.mathResolved;
        if (questionVisible !== game.questionVisible) {
            game.questionVisible = questionVisible; ui.question.classList.toggle('active', questionVisible);
        }
    }
    function syncCameraToRunner() {
        const sample = sampleAtDistance(state.distance);
        const ground = sample.point.clone().addScaledVector(sample.lateral, runner.lateral);
        camera.position.copy(ground).addScaledVector(sample.tangent, -6.2).addScaledVector(UP, 3.35);
        cameraLook.copy(ground).addScaledVector(sample.tangent, 10.2).addScaledVector(UP, 1.65);
        camera.lookAt(cameraLook); camera.fov = BASE_FOV; camera.updateProjectionMatrix();
        game.cameraArm = camera.position.distanceTo(ground.clone().addScaledVector(UP, 1.42));
    }
    function updateRunner(delta) {
        const profile = profiles[game.difficulty]; runner.gameplayTime += delta;
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
        runner.dashFlashTimer = Math.max(0, runner.dashFlashTimer - delta);
        runner.dashCooldown = Math.max(0, runner.dashCooldown - delta); runner.hitTimer = Math.max(0, runner.hitTimer - delta);
        runner.attackTimer = Math.max(0, runner.attackTimer - delta); runner.attackImpactTimer = Math.max(0, runner.attackImpactTimer - delta);
        runner.shieldTimer = Math.max(0, runner.shieldTimer - delta); runner.powerActivationTimer = Math.max(0, runner.powerActivationTimer - delta);
        runner.mathFeedbackTimer = Math.max(0, runner.mathFeedbackTimer - delta);
        runner.landingTimer = Math.max(0, runner.landingTimer - delta);
        const steerInput = (game.keys.has('ArrowRight') || game.keys.has('KeyD') ? 1 : 0) -
            (game.keys.has('ArrowLeft') || game.keys.has('KeyA') ? 1 : 0);
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
        runner.lateral = THREE.MathUtils.clamp(runner.lateral + runner.lateralVelocity * delta, -3.25, 3.25);
        if (Math.abs(runner.lateral) >= 3.24) runner.lateralVelocity *= .35;
        runner.bodyLean = THREE.MathUtils.damp(runner.bodyLean, THREE.MathUtils.clamp(-runner.lateralVelocity * .014, -.09, .09), 9, delta);

        let landed = false;
        if (runner.jumpY > 0 || runner.verticalVelocity > 0) {
            runner.verticalVelocity -= 27 * delta; runner.jumpY += runner.verticalVelocity * delta;
            if (runner.jumpY <= 0) { runner.jumpY = 0; runner.verticalVelocity = 0; runner.landingTimer = .22; landed = true; audio.cue('land'); }
        }
        let speed = profile.speed + (state.distance > 55 ? .48 : 0) + (runner.dashTimer > 0 ? 4.65 : 0) - (runner.hitTimer > 0 ? 1.25 : 0);
        if (state.distance > 43.5 && state.distance < 54.2) speed *= game.difficulty === 0 ? .84 : game.difficulty === 2 ? 1.08 : .94;
        state.distance = Math.min(routeLength - .7, state.distance + Math.max(.8, speed) * delta);
        resolveCourseEvents(); updateTutorial();

        if (runner.hitTimer > 0) runner.state = 'HIT';
        else if (runner.dashTimer > 0) runner.state = 'DASH';
        else if (runner.slideTimer > 0 || runner.slideAnticipation > 0) runner.state = 'SLIDE';
        else if (runner.jumpY > 0 || runner.jumpAnticipation > 0) runner.state = 'JUMP';
        else if (Math.abs(runner.lateralVelocity) > .35) runner.state = 'STEER';
        else runner.state = 'RUN';

        const sample = sampleAtDistance(state.distance);
        const ground = sample.point.clone().addScaledVector(sample.lateral, runner.lateral);
        const runCycle = runner.gameplayTime * (7.8 + speed * .52);
        const bob = runner.jumpY === 0 && runner.slideTimer <= 0 ? Math.sin(runCycle) * .085 : 0;
        const torso = runner.jumpY === 0 && runner.slideTimer <= 0 ? Math.sin(runCycle * .5) * .012 : 0;
        const slideT = runner.slideTimer > 0 ? 1 - runner.slideTimer / .78 : 0;
        const slideProgress = runner.slideTimer > 0 ? Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp(slideT, 0, 1)), .62) : 0;
        const jumpPrep = runner.jumpAnticipation > 0 ? Math.sin((1 - runner.jumpAnticipation / .12) * Math.PI / 2) : 0;
        const slidePrep = runner.slideAnticipation > 0 ? Math.sin((1 - runner.slideAnticipation / .1) * Math.PI / 2) : 0;
        const landing = runner.landingTimer > 0 ? Math.sin(runner.landingTimer / .22 * Math.PI) * .16 : 0;
        const jumpPitch = runner.jumpY > 0 ? THREE.MathUtils.clamp(-runner.verticalVelocity * .008, -.06, .065) : 0;
        const attackRecoil = runner.attackTimer > 0 ? Math.sin((1 - runner.attackTimer / .42) * Math.PI) * -.07 : 0;
        explorer.position.copy(ground).addScaledVector(sample.lateral, torso).addScaledVector(UP,
            .04 + runner.jumpY + bob - slideProgress * .58 - jumpPrep * .2 - slidePrep * .18 - landing);
        explorer.scale.set(3.55 + slideProgress * .52 + landing * .65,
            3.55 - slideProgress * .98 - jumpPrep * .38 - slidePrep * .28 + landing * 1.35, 1);
        explorer.material.rotation = runner.bodyLean - slideProgress * .105 + jumpPitch + attackRecoil;
        explorerTexture.offset.x = (Math.floor(runner.gameplayTime * (8 + speed * .85)) % 4) * .25;
        contactShadow.position.copy(ground).addScaledVector(UP, .045); contactShadow.scale.setScalar(1 - Math.min(.38, runner.jumpY * .14));
        contactShadow.material.opacity = .58 - Math.min(.34, runner.jumpY * .13);
        const portalApproach = THREE.MathUtils.clamp((state.distance - 55) / Math.max(1, portalDistance - 55), 0, 1);
        explorer.material.color.copy(playerWarmTint).lerp(playerCyanTint, portalApproach * .32);
        playerFillLight.position.copy(ground).addScaledVector(sample.tangent, -.25).addScaledVector(UP, 1.45 + runner.jumpY * .4);
        playerFillLight.intensity = .62 + portalApproach * .55;
        runner.stepTimer -= delta;
        if (landed) { spawnDust(ground, sample); spawnDust(ground.clone().addScaledVector(sample.lateral, .35), sample); }
        if (runner.jumpY === 0 && runner.slideTimer <= 0 && runner.stepTimer <= 0) {
            runner.stepTimer = THREE.MathUtils.clamp(.39 - speed * .025, .21, .34); spawnDust(ground, sample); audio.cue('foot');
        }
        updateEffects(delta, ground, sample);

        const gait = runner.jumpY === 0 ? Math.sin(runCycle) * .027 : 0;
        const approach = portalApproach;
        const desiredCamera = ground.clone().addScaledVector(sample.tangent, -7.05 - approach * 2.15)
            .addScaledVector(sample.lateral, -runner.lateralVelocity * .018)
            .addScaledVector(UP, 3.35 + gait + runner.jumpY * .17 - slideProgress * .11 - landing * .4);
        const portalFocus = portalSample.point.clone().addScaledVector(UP, 4.2);
        const desiredLook = ground.clone().addScaledVector(sample.tangent, 10.2).addScaledVector(UP, 1.65 + runner.jumpY * .14).lerp(portalFocus, approach * .14);
        const cameraFocus = ground.clone().addScaledVector(UP, 1.42 + runner.jumpY - slideProgress * .44);
        const resolvedCamera = resolveCameraObstruction(cameraFocus, desiredCamera, delta);
        if (camera.position.distanceTo(resolvedCamera) > 14) {
            camera.position.copy(resolvedCamera); game.cameraTeleports++;
        } else camera.position.lerp(resolvedCamera, 1 - Math.exp(-5.4 * delta));
        cameraLook.lerp(desiredLook, 1 - Math.exp(-6.2 * delta)); camera.lookAt(cameraLook);
        updateOccluderFade(delta, cameraFocus);
        const targetFov = runner.dashTimer > 0 ? 65 : approach > .05 ? 64 : state.distance > 43.5 && state.distance < 54.2 ? 61 : BASE_FOV;
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, runner.dashTimer > 0 ? 13 : 6, delta); camera.updateProjectionMatrix();
        if (approach > .25) {
            game.portalRiseTimer -= delta;
            if (game.portalRiseTimer <= 0) { audio.tone(170 + approach * 170, .22, 'sine', .014, 90); game.portalRiseTimer = 1.05 - approach * .32; }
        }
        if (state.distance >= portalDistance - .38) {
            runner.state = 'DISABLED'; game.phase = 'PORTAL'; game.phaseTimer = 0; ui.tutorial.classList.remove('active'); ui.question.classList.remove('active');
            ui.flash.classList.remove('active'); void ui.flash.offsetWidth; ui.flash.classList.add('active'); audio.cue('portal');
        }
    }
    function updatePortal(delta) {
        runner.gameplayTime += delta; state.distance = Math.min(routeLength - .2, state.distance + 4.2 * delta);
        const sample = sampleAtDistance(state.distance); const ground = sample.point.clone().addScaledVector(sample.lateral, runner.lateral * (1 - game.phaseTimer * .6));
        explorer.visible = game.phaseTimer < 1.05; explorer.position.copy(ground).addScaledVector(UP, .15 + game.phaseTimer * .5);
        explorer.scale.setScalar(3.55 * Math.max(.2, 1 - game.phaseTimer * .58)); contactShadow.visible = game.phaseTimer < .7;
        explorer.material.color.lerp(portalTint, 1 - Math.exp(-3 * delta));
        playerFillLight.position.copy(ground).addScaledVector(UP, 1.5); playerFillLight.intensity = 1.2;
        updateEffects(delta, ground, sample);
        const desired = ground.clone().addScaledVector(sample.tangent, -7.3 - game.phaseTimer * 1.8).addScaledVector(UP, 3.8 - game.phaseTimer * .18);
        const portalCenter = portalSample.point.clone().addScaledVector(UP, 4.65);
        camera.position.lerp(desired, 1 - Math.exp(-4 * delta)); cameraLook.lerp(portalCenter, 1 - Math.exp(-5 * delta));
        camera.lookAt(cameraLook); updateOccluderFade(delta, ground.clone().addScaledVector(UP, 1.25));
        camera.fov = THREE.MathUtils.damp(camera.fov, 64, 5, delta); camera.updateProjectionMatrix();
        if (game.phaseTimer >= 1.45) setPhase('RESULT');
    }
    function updateResult() {
        const progress = THREE.MathUtils.smoothstep(game.phaseTimer, .18, 1.28);
        game.resultCount = Math.round(game.resultTarget * progress);
        ui.resultScore.textContent = game.resultCount.toString().padStart(4, '0');
        ui.resultRank.classList.toggle('active', game.phaseTimer > .72);
    }
    function update(delta) {
        state.elapsed += delta; game.phaseTimer += delta;
        portalData.coreMaterial.uniforms.uTime.value = state.elapsed;
        portalData.orbitA.rotation.z += delta * .19; portalData.orbitB.rotation.z -= delta * .27; portalData.particles.rotation.z += delta * .012;
        if (game.toastTimer > 0) { game.toastTimer -= delta; if (game.toastTimer <= 0) ui.toast.classList.remove('active'); }
        if (game.phase === 'MENU' || game.phase === 'DIFFICULTY' || game.phase === 'CONTROLS' || game.phase === 'RESULT' || game.phase === 'PAUSED') {
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
        return {
            phase: game.phase, phaseTimer: game.phaseTimer, difficulty: profiles[game.difficulty].name,
            movementState: runner.state, distance: state.distance, lateral: runner.lateral, jumpY: runner.jumpY,
            slide: runner.slideTimer > 0, dash: runner.dashTimer > 0, lives: runner.lives,
            score: Math.round(runner.score), combo: runner.combo, maxCombo: runner.maxCombo,
            energy: runner.energy, mathResolved: runner.mathResolved, routeChoice: game.routeChoice,
            tutorial: { ...runner.tutorial }, gameplayTime: runner.gameplayTime,
            camera: {
                obstruction: game.cameraObstruction, faded: [...game.fadedOccluders],
                arm: game.cameraArm, teleports: game.cameraTeleports
            }
        };
    }
    function dispose() {
        removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); audio.dispose();
        labelTextures.forEach(texture => texture.dispose());
    }
    setPhase('MENU'); updateHud();
    return { update, snapshot, dispose, setPhase, syncCameraToRunner, runner, game };
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
            renderTimeMs: renderAverage,
            drawCalls: renderInfo.calls,
            triangles: renderInfo.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures
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
        snapshot: () => ({ ...integratedGame.snapshot(), performance: snapshot().performance })
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
                integratedGame.runner.lateral = THREE.MathUtils.clamp(lateral, -3.2, 3.2);
                integratedGame.runner.lateralVelocity = 0;
            },
            setEnergy: energy => { integratedGame.runner.energy = THREE.MathUtils.clamp(energy, 0, 5); }
        };
    }
}

function render(now) {
    const delta = Math.min(.05, Math.max(1 / 240, (now - lastTime) / 1000));
    lastTime = now;
    updateMovement(delta);
    const start = performance.now();
    renderer.render(scene, camera);
    const renderTime = performance.now() - start;
    if (ready && delta < .08) {
        frameSamples.push(delta * 1000);
        renderSamples.push(renderTime);
        if (frameSamples.length > 360) frameSamples.shift();
        if (renderSamples.length > 360) renderSamples.shift();
    }
    if (!ready) {
        ready = true;
        window.__mathquestArtKit.ready = true;
        if (window.__mathquestGame) window.__mathquestGame.ready = true;
        fallback.style.display = 'none';
    }
    animationFrame = requestAnimationFrame(render);
}

function onResize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, INTEGRATED ? .82 : .9));
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
    stoneTexture.dispose(); softTexture.dispose(); valleyTexture.dispose(); explorerTexture.dispose();
    renderer.dispose();
}, { once: true });

animationFrame = requestAnimationFrame(render);
