import * as THREE from 'three';
import { mergeGeometries } from '../production-art/vendor/BufferGeometryUtils.js';

const canvas = document.querySelector('#scene');
const fallback = document.querySelector('#fallback');
const query = new URLSearchParams(location.search);
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
    fallback.textContent = 'WEBGL ART SHOWCASE UNAVAILABLE';
    throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, .9));
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

for (const [distance, offset, variant] of [[20.5, 6.8, 0], [27.2, 7.15, 1]]) {
    for (const side of [-1, 1]) {
        const column = createColumn(variant);
        placeAlong(column, distance + side * .3, side * offset, -.68);
        column.rotation.y += side * .06;
        scene.add(column);
    }
}

for (const [distance, type] of [[35.2, 'start'], [43.1, 'middle'], [51.0, 'end']]) {
    const bridge = createBridgeModule(type);
    placeAlong(bridge, distance, 0, -.48);
    scene.add(bridge);
}

const portalDistance = routeLength - 4.1;
const portalData = createPortal(query.get('energy') !== '0');
placeAlong(portalData.group, portalDistance, 0, -.72);
scene.add(portalData.group);
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
valleyPlate.visible = query.get('backplate') === '1';
valleyPlate.renderOrder = -10;
scene.add(valleyPlate);

const explorerTexture = new THREE.TextureLoader().load('../../assets/fair/player/run-up.png');
explorerTexture.colorSpace = THREE.SRGBColorSpace;
explorerTexture.wrapS = THREE.RepeatWrapping;
explorerTexture.repeat.set(.25, 1);
const explorer = new THREE.Sprite(new THREE.SpriteMaterial({
    map: explorerTexture, transparent: true, alphaTest: .07, depthWrite: false, fog: true
}));
explorer.center.set(.5, .03);
explorer.scale.set(3.55, 3.55, 1);
scene.add(explorer);
const contactShadow = mesh(new THREE.CircleGeometry(.8, 24), new THREE.MeshBasicMaterial({
    color: 0x010406, transparent: true, opacity: .52, depthWrite: false
}), [0, 0, 0], [-Math.PI / 2, 0, 0]);
scene.add(contactShadow);

const state = {
    distance: 0.8,
    elapsed: 0,
    finished: false,
    paused: query.get('static') === '1' || query.has('shot'),
    shot: query.get('shot') || null,
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
    return {
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
}

window.__mathquestArtKit = {
    ready: false, version: THREE.REVISION, snapshot, setShot, setBackplate, setEnergy, restart
};

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
        fallback.style.display = 'none';
    }
    animationFrame = requestAnimationFrame(render);
}

function onResize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, .9));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);
addEventListener('pagehide', () => {
    cancelAnimationFrame(animationFrame);
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
