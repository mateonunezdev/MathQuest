import * as THREE from 'three';

const clamp01 = value => THREE.MathUtils.clamp(value, 0, 1);
const phase = (time, start, end) => THREE.MathUtils.smoothstep(time, start, end);

function roundedPart(geometry, material, position, scale = [1, 1, 1]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.scale.set(...scale);
    object.castShadow = false;
    object.receiveShadow = false;
    return object;
}

function makeLimb(geometry, material, length, radius) {
    const pivot = new THREE.Group();
    const part = roundedPart(geometry, material, [0, -length * .5, 0], [radius, length, radius]);
    pivot.add(part);
    return { pivot, part };
}

/**
 * A lightweight, fully three-dimensional compatibility actor used until the
 * lawful rigged Math Explorer GLB is authored. It implements the same semantic
 * state surface as the future AnimationMixer actor without owning gameplay.
 */
export class ProceduralExplorer {
    constructor({ scene, metrics, enhancedMotion = false }) {
        this.scene = scene;
        this.metrics = metrics;
        this.enhancedMotion = enhancedMotion;
        this.opacity = 1;
        this.pose = {};
        this.target = {};

        this.materials = {
            suit: new THREE.MeshStandardMaterial({ color: 0x163c50, roughness: .72, metalness: .12 }),
            suitLight: new THREE.MeshStandardMaterial({ color: 0x2d7180, roughness: .66, metalness: .08 }),
            gold: new THREE.MeshStandardMaterial({ color: 0xc78b36, roughness: .42, metalness: .72 }),
            hair: new THREE.MeshStandardMaterial({ color: 0x3b2017, roughness: .9, metalness: 0 }),
            dark: new THREE.MeshStandardMaterial({ color: 0x07151e, roughness: .84, metalness: .08 }),
            cyan: new THREE.MeshStandardMaterial({
                color: 0x62eee7, emissive: 0x0b8587, emissiveIntensity: 1.45,
                roughness: .28, metalness: .22
            }),
            visor: new THREE.MeshStandardMaterial({
                color: 0x94fff5, emissive: 0x176d73, emissiveIntensity: .82,
                roughness: .18, metalness: .35
            })
        };
        this.baseColors = new Map(Object.values(this.materials).map(material => [material, material.color.clone()]));
        this.geometries = {
            sphere: new THREE.SphereGeometry(.5, 14, 10),
            capsule: new THREE.CapsuleGeometry(.5, 1, 4, 8),
            box: new THREE.BoxGeometry(1, 1, 1),
            cylinder: new THREE.CylinderGeometry(.5, .5, 1, 8),
            ring: new THREE.TorusGeometry(.5, .09, 6, 16)
        };

        this.root = new THREE.Group();
        this.root.name = 'PROCEDURAL_EXPLORER_VISUAL';
        this.root.visible = false;
        this.motion = new THREE.Group();
        this.root.add(this.motion);
        this.buildActor();
        scene.add(this.root);
    }

    buildActor() {
        const { sphere, capsule, box, cylinder, ring } = this.geometries;
        const { suit, suitLight, gold, hair, dark, cyan, visor } = this.materials;

        this.pelvis = new THREE.Group();
        this.pelvis.position.y = 1.12;
        this.motion.add(this.pelvis);
        this.pelvis.add(roundedPart(box, suit, [0, 0, 0], [.58, .34, .38]));
        this.pelvis.add(roundedPart(box, gold, [0, .02, .205], [.48, .09, .035]));

        this.torso = new THREE.Group();
        this.torso.position.y = .24;
        this.pelvis.add(this.torso);
        this.torso.add(roundedPart(capsule, suitLight, [0, .47, 0], [.63, .68, .48]));
        this.torso.add(roundedPart(box, gold, [0, .52, .42], [.68, .12, .07]));
        this.torso.add(roundedPart(ring, cyan, [0, .5, .47], [.36, .36, .22]));

        this.head = new THREE.Group();
        this.head.position.set(0, 1.18, 0);
        this.torso.add(this.head);
        this.head.add(roundedPart(sphere, dark, [0, 0, 0], [.48, .54, .46]));
        this.head.add(roundedPart(box, visor, [0, .02, .42], [.55, .22, .075]));
        this.head.add(roundedPart(box, gold, [0, -.27, .1], [.5, .07, .39]));
        const hairShapes = [
            roundedPart(sphere, hair, [0, .3, -.1], [.48, .28, .42]),
            roundedPart(sphere, hair, [-.27, .22, -.24], [.25, .32, .24]),
            roundedPart(sphere, hair, [.27, .22, -.24], [.25, .32, .24]),
            roundedPart(sphere, hair, [0, .05, -.43], [.34, .42, .16])
        ];
        hairShapes.forEach(shape => { shape.visible = this.enhancedMotion; this.head.add(shape); });

        this.scarfRoot = new THREE.Group();
        this.scarfRoot.position.set(0, .98, -.36);
        this.torso.add(this.scarfRoot);
        this.scarfTailA = roundedPart(box, gold, [0, -.2, -.12], [.38, .42, .055]);
        this.scarfTailB = roundedPart(box, cyan, [.08, -.48, -.18], [.18, .38, .04]);
        this.scarfRoot.add(this.scarfTailA, this.scarfTailB);
        this.scarfRoot.visible = this.enhancedMotion;

        this.backpack = new THREE.Group();
        this.backpack.position.set(0, .62, -.42);
        this.torso.add(this.backpack);
        this.backpack.add(roundedPart(box, dark, [0, 0, 0], [.54, .62, .26]));
        this.backpack.add(roundedPart(cylinder, cyan, [0, .08, -.19], [.19, .42, .19]));
        this.backpack.children[1].rotation.z = Math.PI / 2;

        const leftArm = makeLimb(capsule, suitLight, .62, .17);
        const rightArm = makeLimb(capsule, suitLight, .62, .17);
        this.leftArm = leftArm.pivot; this.rightArm = rightArm.pivot;
        this.leftArm.position.set(-.52, .84, 0); this.rightArm.position.set(.52, .84, 0);
        this.torso.add(this.leftArm, this.rightArm);
        const leftShoulder = roundedPart(sphere, gold, [-.58, .82, 0], [.23, .18, .27]);
        const rightShoulder = roundedPart(sphere, gold, [.58, .82, 0], [.23, .18, .27]);
        leftShoulder.visible = rightShoulder.visible = this.enhancedMotion;
        this.torso.add(leftShoulder, rightShoulder);
        this.leftArm.add(roundedPart(sphere, gold, [0, -.63, 0], [.2, .18, .2]));
        this.rightArm.add(roundedPart(sphere, gold, [0, -.63, 0], [.2, .18, .2]));
        this.leftElbow = new THREE.Group(); this.rightElbow = new THREE.Group();
        this.leftElbow.position.y = -.42; this.rightElbow.position.y = -.42;
        this.leftArm.add(this.leftElbow); this.rightArm.add(this.rightElbow);

        this.weaponPivot = new THREE.Group();
        this.weaponPivot.position.set(0, -.68, .02);
        this.rightArm.add(this.weaponPivot);
        const staff = roundedPart(cylinder, gold, [0, -.34, .02], [.075, .72, .075]);
        staff.rotation.z = -.08;
        this.weaponPivot.add(staff, roundedPart(sphere, cyan, [0, -.73, .02], [.16, .16, .16]));

        const leftLeg = makeLimb(capsule, suit, .78, .2);
        const rightLeg = makeLimb(capsule, suit, .78, .2);
        this.leftLeg = leftLeg.pivot; this.rightLeg = rightLeg.pivot;
        this.leftLeg.position.set(-.25, -.12, 0); this.rightLeg.position.set(.25, -.12, 0);
        this.pelvis.add(this.leftLeg, this.rightLeg);
        this.leftFoot = roundedPart(box, dark, [0, -.79, .13], [.32, .16, .58]);
        this.rightFoot = roundedPart(box, dark, [0, -.79, .13], [.32, .16, .58]);
        this.leftLeg.add(this.leftFoot); this.rightLeg.add(this.rightFoot);
        this.leftKnee = new THREE.Group(); this.rightKnee = new THREE.Group();
        this.leftKnee.position.y = -.48; this.rightKnee.position.y = -.48;
        this.leftLeg.add(this.leftKnee); this.rightLeg.add(this.rightKnee);

        if (this.enhancedMotion) {
            this.leftArm.children[0].scale.set(.18, .34, .18); this.rightArm.children[0].scale.set(.18, .34, .18);
            this.leftArm.children[0].position.y = -.2; this.rightArm.children[0].position.y = -.2;
            this.leftElbow.position.y = -.34; this.rightElbow.position.y = -.34;
            this.leftElbow.add(roundedPart(capsule, suitLight, [0, -.18, 0], [.17, .3, .17]));
            this.rightElbow.add(roundedPart(capsule, suitLight, [0, -.18, 0], [.17, .3, .17]));
            const leftHand = this.leftArm.children[1]; const rightHand = this.rightArm.children[1];
            leftHand.position.y = -.38; rightHand.position.y = -.38;
            this.leftElbow.add(leftHand); this.rightElbow.add(rightHand);
            this.weaponPivot.position.y = -.42;
            this.leftLeg.children[0].scale.set(.23, .48, .23); this.rightLeg.children[0].scale.set(.23, .48, .23);
            this.leftLeg.children[0].position.y = -.27; this.rightLeg.children[0].position.y = -.27;
            this.leftKnee.add(roundedPart(capsule, suit, [0, -.25, 0], [.21, .43, .21]));
            this.rightKnee.add(roundedPart(capsule, suit, [0, -.25, 0], [.21, .43, .21]));
            this.leftFoot.position.set(0, -.52, .16); this.rightFoot.position.set(0, -.52, .16);
            this.leftKnee.add(this.leftFoot); this.rightKnee.add(this.rightFoot);
        }
    }

    setVisible(visible) { this.root.visible = visible; }
    isVisible() { return this.root.visible; }

    resetAppearance() {
        this.opacity = 1;
        for (const [material, color] of this.baseColors) {
            material.color.copy(color);
            material.opacity = 1;
            material.transparent = false;
        }
    }

    setOpacity(opacity) {
        this.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
        for (const material of Object.values(this.materials)) {
            material.transparent = this.opacity < .999;
            material.opacity = this.opacity;
            material.depthWrite = this.opacity > .55;
        }
    }

    setPortalTint(amount) {
        const cyan = new THREE.Color(0x9bfff7);
        for (const [material, color] of this.baseColors) material.color.copy(color).lerp(cyan, amount * .34);
    }

    neutralTarget() {
        return {
            rootY: -.1, rootX: 0, rootZ: 0, rootRoll: 0, rootPitch: 0,
            pelvisPitch: 0, pelvisYaw: 0, torsoPitch: 0, torsoYaw: 0, torsoRoll: 0,
            headPitch: 0, leftArm: 0, rightArm: 0, leftArmZ: 0, rightArmZ: 0,
            leftElbow: 0, rightElbow: 0, leftLeg: 0, rightLeg: 0,
            leftKnee: 0, rightKnee: 0, leftLegZ: 0, rightLegZ: 0, weapon: 0,
            scarfPitch: 0, scarfYaw: 0, scarfRoll: 0,
            width: 1.35, height: 2.7, rotation: 0
        };
    }

    applyPose(context) {
        const { state, stateTime: time, delta, ground, sample, facingTangent = sample.tangent, speed = 0, jumpY = 0, portalApproach = 0 } = context;
        const target = this.neutralTarget();
        const cadence = 8.4 + speed * .72;
        const gait = Math.sin(time * cadence);
        const gait2 = Math.sin(time * cadence + Math.PI);

        if (state === 'IDLE') {
            target.rootY += Math.sin(time * 2.4) * .018;
            target.torsoPitch = Math.sin(time * 2.4) * .018;
            target.leftArm = .08; target.rightArm = -.08;
        } else if (state === 'RUN' || state === 'RUN_LEFT' || state === 'RUN_RIGHT') {
            const steer = state === 'RUN_LEFT' ? 1 : state === 'RUN_RIGHT' ? -1 : 0;
            target.rootY += Math.abs(gait) * .055;
            target.rootPitch = -.08;
            target.rootRoll = steer * .15;
            target.pelvisYaw = gait * .055 + steer * .08;
            target.torsoYaw = -gait * .075 - steer * .1;
            target.leftArm = gait2 * .7 - .12; target.rightArm = gait * .7 - .12;
            target.leftLeg = gait * .68; target.rightLeg = gait2 * .68;
            target.leftElbow = .58 + Math.max(0, gait) * .5;
            target.rightElbow = .58 + Math.max(0, gait2) * .5;
            target.leftKnee = .18 + Math.max(0, -gait) * .58;
            target.rightKnee = .18 + Math.max(0, -gait2) * .58;
            target.scarfPitch = -.42 - Math.abs(gait) * .16;
            target.scarfYaw = -steer * .28 + gait * .06;
            target.headPitch = .06;
            target.rotation = target.rootRoll;
        } else if (state === 'JUMP_ANTICIPATION') {
            const p = phase(time, 0, .11);
            target.rootY -= .52 * p; target.rootPitch = .2 * p;
            target.pelvisPitch = -.18 * p; target.torsoPitch = .34 * p;
            target.leftLeg = -.48 * p; target.rightLeg = -.48 * p;
            target.leftKnee = .8 * p; target.rightKnee = .8 * p;
            target.leftArm = -.52 * p; target.rightArm = -.52 * p;
            target.width = 1.55; target.height = 2.16;
        } else if (state === 'JUMP_ASCEND') {
            target.rootPitch = -.16; target.torsoPitch = -.12;
            target.leftArm = -1.05; target.rightArm = -1.05;
            target.leftArmZ = -.28; target.rightArmZ = .28;
            target.leftLeg = .62; target.rightLeg = .28;
            target.leftKnee = .35; target.rightKnee = .78; target.scarfPitch = -.92;
            target.height = 3.12;
        } else if (state === 'JUMP_FALL') {
            target.rootPitch = .1; target.torsoPitch = .16;
            target.leftArm = .42; target.rightArm = .42;
            target.leftArmZ = -.35; target.rightArmZ = .35;
            target.leftLeg = -.18; target.rightLeg = -.36;
            target.leftKnee = .72; target.rightKnee = .48; target.scarfPitch = -.72;
            target.height = 2.55;
        } else if (state === 'LAND') {
            const impact = Math.sin(clamp01(time / .22) * Math.PI);
            target.rootY -= impact * .36; target.rootPitch = impact * .12;
            target.torsoPitch = impact * .38;
            target.leftLeg = target.rightLeg = -impact * .5;
            target.leftKnee = target.rightKnee = impact * 1.02;
            target.leftArm = target.rightArm = impact * .46;
            target.width = 1.35 + impact * .3; target.height = 2.7 - impact * .5;
        } else if (state.startsWith('SLIDE')) {
            const enter = state === 'SLIDE_ENTER' ? phase(time, 0, .1) : 1;
            const exit = state === 'SLIDE_EXIT' ? 1 - phase(time, 0, .16) : 1;
            const amount = enter * exit;
            const brace = state === 'SLIDE_LOOP' ? .5 + Math.sin(time * 10) * .08 : .5;
            // A low, asymmetric knee slide: hips travel down/forward while one
            // leg leads and the opposite hand braces.  This keeps the action
            // readable as body motion instead of a uniformly squashed actor.
            target.rootY -= .72 * amount; target.rootZ = .38 * amount;
            target.rootPitch = .24 * amount; target.rootRoll = -.12 * amount;
            target.torsoPitch = (.92 + brace * .12) * amount;
            target.torsoYaw = -.24 * amount; target.headPitch = -.22 * amount;
            target.pelvisPitch = -.38 * amount; target.pelvisYaw = .18 * amount;
            target.leftLeg = 1.28 * amount; target.rightLeg = -.22 * amount;
            target.leftKnee = .42 * amount; target.rightKnee = 1.18 * amount;
            target.leftLegZ = -.28 * amount; target.rightLegZ = .12 * amount;
            target.leftArm = -.92 * amount; target.rightArm = .28 * amount;
            target.leftArmZ = -.22 * amount; target.rightArmZ = .42 * amount;
            target.width = THREE.MathUtils.lerp(1.35, 2.28, amount);
            target.height = THREE.MathUtils.lerp(2.7, 1.08, amount);
            target.rotation = -.24 * amount;
        } else if (state === 'DASH') {
            const burst = Math.sin(clamp01(time / .46) * Math.PI);
            target.rootY -= .1 * burst; target.rootZ = .24 * burst;
            target.rootPitch = -.34; target.torsoPitch = -.28;
            target.leftArm = 1.0; target.rightArm = .86;
            target.leftLeg = -.46; target.rightLeg = .62;
            target.leftElbow = .92; target.rightElbow = .72;
            target.leftKnee = .85; target.rightKnee = .24;
            target.scarfPitch = -1.08; target.scarfRoll = .12;
            target.height = 2.4; target.width = 1.92;
            target.rotation = -.2;
        } else if (state === 'ATTACK') {
            const p = clamp01(time / .42);
            const windup = phase(p, 0, .27);
            const strike = phase(p, .27, .52);
            const recover = phase(p, .65, 1);
            target.rootZ = strike * .25 - recover * .2;
            target.pelvisYaw = -.22 * windup + .62 * strike - .5 * recover;
            target.torsoYaw = -.58 * windup + 1.22 * strike - .92 * recover;
            // Keep a readable braced silhouette through the yaw crossover at impact.
            // Without this roll the torso briefly faced neutral during the fastest
            // part of the swing, making some captured frames resemble RUN.
            target.torsoRoll = -.2 * Math.max(windup, strike * .86) * (1 - recover);
            target.rightArm = -1.28 * windup + 1.68 * strike - .3 * recover;
            target.rightArmZ = -.82 * windup + 1.05 * strike - .42 * recover;
            target.rightElbow = .78 * windup - .48 * strike + .22 * recover;
            target.leftArm = .42 * strike; target.leftArmZ = -.34;
            target.weapon = -1.05 * windup + 2.15 * strike - .55 * recover;
            target.width = 1.4 + strike * .62; target.rotation = target.torsoRoll;
        } else if (state === 'POWER') {
            const surge = Math.sin(clamp01(time / .55) * Math.PI);
            target.rootY += surge * .16; target.torsoPitch = -.18 * surge;
            target.leftArm = -1.28 * surge; target.rightArm = -1.28 * surge;
            target.leftArmZ = -.82 * surge; target.rightArmZ = .82 * surge;
            target.headPitch = -.2 * surge; target.width = 1.35 + surge * .52;
            target.height = 2.7 + surge * .22;
        } else if (state === 'INTERACT') {
            const breathe = Math.sin(time * 3.2);
            target.rootY += breathe * .015; target.rootPitch = .035;
            target.torsoYaw = Math.sin(time * 1.6) * .035;
            target.leftArm = -.34; target.leftArmZ = -.42; target.leftElbow = .82;
            target.rightArm = -.62; target.rightArmZ = .24; target.rightElbow = .96;
            target.headPitch = -.08; target.scarfPitch = -.12;
        } else if (state === 'SHIELD') {
            const brace = .88 + Math.sin(time * 8) * .05;
            target.rootY -= .12; target.rootPitch = .12; target.rootRoll = -.08;
            target.torsoPitch = .18; target.torsoYaw = -.2;
            target.leftArm = -.72; target.leftArmZ = -.78; target.leftElbow = 1.12;
            target.rightArm = -.52; target.rightArmZ = .58; target.rightElbow = 1.0;
            target.leftLeg = -.18; target.rightLeg = .22; target.leftKnee = .58; target.rightKnee = .46;
            target.width = 1.68 * brace; target.height = 2.48;
        } else if (state === 'PORTAL') {
            const reach = phase(time, 0, .5);
            target.rootPitch = -.22; target.torsoPitch = -.18;
            target.leftArm = -1.42 * reach; target.rightArm = -1.28 * reach;
            target.leftArmZ = -.2; target.rightArmZ = .2;
            target.leftElbow = .18; target.rightElbow = .18;
            target.leftLeg = .58; target.rightLeg = -.12; target.rightKnee = .7;
            target.scarfPitch = -1.12; target.height = 3.05;
        } else if (state === 'HIT') {
            const stagger = Math.exp(-time * 3.6);
            target.rootX = Math.sin(time * 28) * .1 * stagger;
            target.rootRoll = -.28 * stagger; target.rootPitch = .18 * stagger;
            target.torsoYaw = .42 * stagger; target.leftArm = .7 * stagger;
            target.rightArm = -.62 * stagger; target.height = 2.48;
            target.rotation = target.rootRoll;
        }

        const response = ['HIT', 'ATTACK', 'DASH', 'JUMP_ANTICIPATION', 'LAND'].includes(state) ? 19 : 12;
        for (const [key, value] of Object.entries(target)) {
            const current = Number.isFinite(this.pose[key]) ? this.pose[key] : value;
            this.pose[key] = THREE.MathUtils.damp(current, value, response, delta);
        }

        this.root.position.copy(ground).addScaledVector(sample.tangent, this.pose.rootZ)
            .addScaledVector(sample.lateral, this.pose.rootX).addScaledVector(THREE.Object3D.DEFAULT_UP, jumpY);
        this.root.rotation.y = Math.atan2(facingTangent.x, facingTangent.z);
        this.motion.position.y = this.pose.rootY;
        this.motion.rotation.set(this.pose.rootPitch, 0, this.pose.rootRoll);
        this.pelvis.rotation.set(this.pose.pelvisPitch, this.pose.pelvisYaw, 0);
        this.torso.rotation.set(this.pose.torsoPitch, this.pose.torsoYaw, this.pose.torsoRoll);
        this.head.rotation.x = this.pose.headPitch;
        this.leftArm.rotation.set(this.pose.leftArm, 0, this.pose.leftArmZ);
        this.rightArm.rotation.set(this.pose.rightArm, 0, this.pose.rightArmZ);
        this.leftElbow.rotation.x = this.pose.leftElbow;
        this.rightElbow.rotation.x = this.pose.rightElbow;
        this.leftLeg.rotation.set(this.pose.leftLeg, 0, this.pose.leftLegZ);
        this.rightLeg.rotation.set(this.pose.rightLeg, 0, this.pose.rightLegZ);
        this.leftKnee.rotation.x = this.pose.leftKnee;
        this.rightKnee.rotation.x = this.pose.rightKnee;
        this.scarfRoot.rotation.set(this.pose.scarfPitch, this.pose.scarfYaw, this.pose.scarfRoll);
        this.weaponPivot.rotation.z = this.pose.weapon;

        this.materials.cyan.emissiveIntensity = 1.35 + portalApproach * .8 + (state === 'POWER' ? .75 : 0);
        this.setPortalTint(portalApproach);
        if (state === 'HIT') this.materials.suit.color.lerp(new THREE.Color(0xff735f), .48 * Math.abs(Math.sin(time * 25)));

        Object.assign(this.metrics, {
            x: this.pose.width, y: this.pose.height, offsetY: this.pose.rootY,
            offsetSide: this.pose.rootX, offsetForward: this.pose.rootZ, rotation: this.pose.rotation,
            rootPitch: this.pose.rootPitch, torsoYaw: this.pose.torsoYaw,
            leftElbow: this.pose.leftElbow, rightElbow: this.pose.rightElbow,
            leftKnee: this.pose.leftKnee, rightKnee: this.pose.rightKnee,
            scarfPitch: this.pose.scarfPitch
        });
    }

    dispose() {
        this.scene.remove(this.root);
        Object.values(this.geometries).forEach(geometry => geometry.dispose());
        Object.values(this.materials).forEach(material => material.dispose());
    }
}
