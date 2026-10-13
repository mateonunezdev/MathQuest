import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';

export const MOTION_STATES = Object.freeze([
    'IDLE', 'RUN', 'RUN_LEFT', 'RUN_RIGHT',
    'JUMP_ANTICIPATION', 'JUMP_ASCEND', 'JUMP_FALL', 'LAND',
    'SLIDE_ENTER', 'SLIDE_LOOP', 'SLIDE_EXIT',
    'DASH', 'ATTACK', 'POWER', 'HIT', 'INTERACT', 'SHIELD', 'PORTAL'
]);

const DEFAULT_ALIASES = {
    IDLE: ['idle', 'breathing'],
    RUN: ['run', 'running', 'jog'],
    RUN_LEFT: ['run_left', 'strafe_left', 'left'],
    RUN_RIGHT: ['run_right', 'strafe_right', 'right'],
    JUMP_ANTICIPATION: ['jump_start', 'jump_anticipation', 'crouch'],
    JUMP_ASCEND: ['jump_up', 'jump_ascend', 'jump'],
    JUMP_FALL: ['jump_fall', 'fall', 'air'],
    LAND: ['land', 'landing'],
    SLIDE_ENTER: ['slide_start', 'slide_enter'],
    SLIDE_LOOP: ['slide', 'slide_loop'],
    SLIDE_EXIT: ['slide_end', 'slide_exit'],
    DASH: ['dash', 'sprint'],
    ATTACK: ['attack', 'attack_01', 'melee'],
    POWER: ['power', 'cast', 'ability'],
    HIT: ['hit', 'damage', 'stagger'],
    INTERACT: ['interact', 'inspect', 'activate'],
    SHIELD: ['shield', 'block', 'guard'],
    PORTAL: ['portal', 'victory_jump', 'leap']
};

const LOOPING = new Set(['IDLE', 'RUN', 'RUN_LEFT', 'RUN_RIGHT', 'SLIDE_LOOP', 'INTERACT', 'SHIELD']);

function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function findClip(clips, state, aliases) {
    const candidates = [state, ...(aliases[state] || [])].map(normalize);
    return clips.find(clip => candidates.some(candidate => normalize(clip.name) === candidate)) ||
        clips.find(clip => candidates.some(candidate => normalize(clip.name).includes(candidate)));
}

export class CharacterController {
    constructor({ scene, fallback = null, aliases = {}, stateConfig = {}, transitionDuration = .12 } = {}) {
        this.scene = scene;
        this.fallback = fallback;
        this.aliases = { ...DEFAULT_ALIASES, ...aliases };
        this.stateConfig = stateConfig;
        this.transitionDuration = transitionDuration;
        this.state = 'IDLE';
        this.previousState = 'IDLE';
        this.stateTime = 0;
        this.transitionTime = transitionDuration;
        this.visualRoot = new THREE.Group();
        this.visualRoot.name = 'CHARACTER_VISUAL';
        this.visualRoot.visible = false;
        this.scene?.add(this.visualRoot);
        this.root = null;
        this.mixer = null;
        this.actions = new Map();
        this.sourceClips = new Map();
        this.activeAction = null;
        this.effectiveTimeScale = 1;
        this.mode = 'fallback';
        this.loadError = null;
        this.lastContextSpeed = 0;
        this.onStateChange = null;
    }

    async load(url, { scale = 1, position = [0, 0, 0], rotationY = 0 } = {}) {
        this.disposeRig();
        try {
            const gltf = await new GLTFLoader().loadAsync(url);
            this.root = gltf.scene;
            this.root.scale.setScalar(scale);
            this.root.position.set(...position);
            this.root.rotation.y = rotationY;
            this.root.traverse(object => {
                if (!object.isMesh) return;
                object.castShadow = false;
                object.receiveShadow = false;
                object.frustumCulled = true;
            });
            this.mixer = new THREE.AnimationMixer(this.root);
            for (const state of MOTION_STATES) {
                const clip = findClip(gltf.animations, state, this.aliases);
                if (clip) {
                    this.actions.set(state, this.mixer.clipAction(clip));
                    this.sourceClips.set(state, clip);
                }
            }
            if (!this.actions.size) throw new Error('The character file contains no recognized motion clips.');
            this.visualRoot.add(this.root);
            this.visualRoot.visible = true;
            this.fallback?.setVisible?.(false);
            this.mode = 'rigged';
            this.loadError = null;
            this.crossFadeTo(this.state, 0);
            return { ok: true, mode: this.mode, clips: [...this.actions.keys()] };
        } catch (error) {
            this.loadError = error;
            this.mode = 'fallback';
            this.disposeRig();
            this.fallback?.setVisible?.(true);
            return { ok: false, mode: this.mode, error: error.message };
        }
    }

    setState(nextState, options = {}) {
        if (!MOTION_STATES.includes(nextState)) throw new Error(`Unknown motion state: ${nextState}`);
        if (nextState === this.state && !options.restart) return false;
        this.previousState = this.state;
        this.state = nextState;
        this.stateTime = 0;
        this.transitionTime = 0;
        if (this.mode === 'rigged') this.crossFadeTo(nextState, options.duration ?? this.transitionDuration, options.restart);
        this.onStateChange?.({ state: nextState, previousState: this.previousState });
        return true;
    }

    crossFadeTo(state, duration = this.transitionDuration, restart = false) {
        const next = this.actions.get(state) || this.actions.get('RUN') || this.actions.get('IDLE');
        if (!next) return false;
        if (next === this.activeAction && !restart) return true;
        const previous = this.activeAction;
        next.enabled = true;
        next.setEffectiveTimeScale(this.stateConfig[state]?.timeScale || 1);
        next.setEffectiveWeight(1);
        next.setLoop(LOOPING.has(state) ? THREE.LoopRepeat : THREE.LoopOnce, LOOPING.has(state) ? Infinity : 1);
        next.clampWhenFinished = !LOOPING.has(state);
        if (restart || next !== previous) next.reset();
        next.play();
        if (previous && previous !== next) previous.crossFadeTo(next, Math.max(0, duration), true);
        this.activeAction = next;
        return true;
    }

    playLoop(state, duration) {
        this.setState(state, { duration });
    }

    playOneShot(state, duration) {
        this.setState(state, { duration, restart: true });
    }

    setTimeScale(value) {
        if (this.mixer) this.mixer.timeScale = value;
    }

    update(delta, context = {}) {
        this.lastContextSpeed = context.speed || 0;
        this.stateTime += delta;
        this.transitionTime = Math.min(this.transitionDuration, this.transitionTime + delta);
        if (this.activeAction && ['RUN', 'RUN_LEFT', 'RUN_RIGHT'].includes(this.state)) {
            const config = this.stateConfig[this.state] || {};
            const speedRatio = config.referenceSpeed && context.speed > 0
                ? THREE.MathUtils.clamp(context.speed / config.referenceSpeed, .55, 1.65)
                : 1;
            this.effectiveTimeScale = (config.timeScale || 1) * speedRatio;
            this.activeAction.setEffectiveTimeScale(this.effectiveTimeScale);
        }
        this.mixer?.update(delta);
        if (this.mode === 'rigged' && context.ground && context.sample) {
            const facing = context.facingTangent || context.sample.tangent;
            this.visualRoot.position.copy(context.ground).addScaledVector(THREE.Object3D.DEFAULT_UP, context.jumpY || 0);
            this.visualRoot.rotation.y = Math.atan2(facing.x, facing.z);
        } else this.fallback?.applyPose?.({
            state: this.state,
            previousState: this.previousState,
            stateTime: this.stateTime,
            activeClipTime: this.activeAction ? Number(this.activeAction.time.toFixed(4)) : null,
            effectiveTimeScale: Number(this.effectiveTimeScale.toFixed(4)),
            gameplaySpeed: Number(this.lastContextSpeed.toFixed(4)),
            visualRootPosition: {
                x: Number(this.visualRoot.position.x.toFixed(4)),
                y: Number(this.visualRoot.position.y.toFixed(4)),
                z: Number(this.visualRoot.position.z.toFixed(4))
            },
            blend: this.transitionDuration > 0 ? THREE.MathUtils.smoothstep(this.transitionTime, 0, this.transitionDuration) : 1,
            delta,
            ...context
        });
    }

    snapshot() {
        const footContacts = {};
        if (this.root) {
            this.visualRoot.updateWorldMatrix(true, true);
            for (const boneName of ['foot.l', 'toes.l', 'foot.r', 'toes.r', 'foot_l', 'ball_l', 'foot_r', 'ball_r']) {
                const bone = this.root.getObjectByName(boneName);
                if (!bone) continue;
                const position = bone.getWorldPosition(new THREE.Vector3());
                footContacts[boneName] = {
                    x: Number(position.x.toFixed(3)),
                    y: Number(position.y.toFixed(3)),
                    z: Number(position.z.toFixed(3)),
                    groundOffset: Number((position.y - this.visualRoot.position.y).toFixed(3))
                };
            }
        }
        return {
            mode: this.mode,
            state: this.state,
            previousState: this.previousState,
            stateTime: this.stateTime,
            activeClipTime: this.activeAction ? Number(this.activeAction.time.toFixed(4)) : null,
            effectiveTimeScale: Number(this.effectiveTimeScale.toFixed(4)),
            gameplaySpeed: Number(this.lastContextSpeed.toFixed(4)),
            visualRootPosition: {
                x: Number(this.visualRoot.position.x.toFixed(4)),
                y: Number(this.visualRoot.position.y.toFixed(4)),
                z: Number(this.visualRoot.position.z.toFixed(4))
            },
            transitionBlend: this.transitionDuration > 0 ? Math.min(1, this.transitionTime / this.transitionDuration) : 1,
            clips: [...this.actions.keys()],
            sourceClips: Object.fromEntries([...this.sourceClips].map(([state, clip]) => [state, {
                name: clip.name, duration: clip.duration,
                timeScale: this.stateConfig[state]?.timeScale || 1,
                referenceSpeed: this.stateConfig[state]?.referenceSpeed || null,
                fidelity: this.stateConfig[state]?.fidelity || 'authored'
            }])),
            footContacts,
            missingClips: MOTION_STATES.filter(state => !this.actions.has(state)),
            loadError: this.loadError?.message || null
        };
    }

    setVisible(visible) {
        this.visualRoot.visible = visible && this.mode === 'rigged';
        this.fallback?.setVisible?.(visible && this.mode === 'fallback');
    }

    disposeRig() {
        if (this.root) {
            this.visualRoot.remove(this.root);
            this.root.traverse(object => {
                object.geometry?.dispose?.();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.filter(Boolean).forEach(material => material.dispose?.());
            });
        }
        this.mixer?.stopAllAction();
        this.actions.clear();
        this.sourceClips.clear();
        this.activeAction = null;
        this.mixer = null;
        this.root = null;
        this.visualRoot.visible = false;
    }

    dispose() {
        this.disposeRig();
        this.scene?.remove(this.visualRoot);
        this.fallback?.dispose?.();
    }
}

// Runs the exact Three.js skinning/mixer path used by a future legal hero asset
// without shipping a placeholder character into the approved visual identity.
export function verifySyntheticRigPipeline() {
    const geometry = new THREE.BoxGeometry(.25, .8, .2, 1, 2, 1);
    const position = geometry.attributes.position;
    const skinIndices = [];
    const skinWeights = [];
    for (let index = 0; index < position.count; index++) {
        const upper = position.getY(index) > 0;
        skinIndices.push(upper ? 1 : 0, 0, 0, 0);
        skinWeights.push(1, 0, 0, 0);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    const hip = new THREE.Bone();
    const chest = new THREE.Bone();
    chest.position.y = .4;
    hip.add(chest);
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    mesh.add(hip);
    mesh.bind(new THREE.Skeleton([hip, chest]));
    const clip = new THREE.AnimationClip('run', .5, [
        new THREE.NumberKeyframeTrack(`${chest.uuid}.rotation[z]`, [0, .25, .5], [0, .18, 0])
    ]);
    const mixer = new THREE.AnimationMixer(mesh);
    const action = mixer.clipAction(clip);
    action.play();
    mixer.update(.16);
    const result = {
        ok: Boolean(mesh.isSkinnedMesh && mesh.skeleton && mixer.time > 0 && action.isRunning()),
        skinnedMesh: mesh.isSkinnedMesh,
        bones: mesh.skeleton.bones.length,
        mixerTime: mixer.time,
        clips: [clip.name]
    };
    action.stop();
    geometry.dispose();
    mesh.material.dispose();
    return result;
}
