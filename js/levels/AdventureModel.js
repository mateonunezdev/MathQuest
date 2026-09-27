import { Player } from '../entities/Player.js';
import { EscapeMode } from './EscapeMode.js';

const ROOM_SPECS = [
    ['entrance', 'UMBRAL DEL TEMPLO', 940],
    ['corridor', 'CORREDOR DE LOS ANTIGUOS', 620],
    ['sequence', 'CÁMARA DE SECUENCIAS', 1100],
    ['pulse', 'PASILLO DE PULSOS', 1020],
    ['sentinel', 'PATIO DEL CENTINELA', 1080],
    ['artifact', 'SANTUARIO DEL ARTEFACTO', 900],
    ['gate', 'PUERTA HEROICA', 990],
    ['portal', 'SANTUARIO DEL PORTAL', 920]
];

const SEQUENCES = {
    explorador: { terms: [2, 4, 8], values: [12, 16, 18], correct: 16, hint: 'CADA NÚMERO SE DUPLICA' },
    aventurero: { terms: [3, 6, 12], values: [18, 24, 30], correct: 24, hint: 'OBSERVA EL CRECIMIENTO' },
    maestro: { terms: [3, 7, 15], values: [29, 31, 33], correct: 31, hint: 'UNA REGLA, DOS PASOS' }
};

const HAZARDS = {
    explorador: { cycle: 2.8, telegraph: 1.05, active: 0.3 },
    aventurero: { cycle: 2.45, telegraph: 0.8, active: 0.36 },
    maestro: { cycle: 2.2, telegraph: 0.62, active: 0.45 }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class AdventureModel {
    constructor(difficulty = 'aventurero', maxLives = 3) {
        this.difficulty = SEQUENCES[difficulty] ? difficulty : 'aventurero';
        this.rooms = [];
        let cursor = 0;
        for (const [id, name, width] of ROOM_SPECS) {
            this.rooms.push({ id, name, x: cursor, width, end: cursor + width });
            cursor += width;
        }
        this.width = cursor;
        this.height = 540;
        this.player = new Player(90, 255);
        this.player.disabled = true;
        this.phase = 'intro';
        this.introTime = 0;
        this.portalTime = 0;
        this.clock = 0;
        this.hazardClock = 0;
        this.roomIndex = 0;
        this.maxLives = maxLives;
        this.lives = maxLives;
        this.score = 0;
        this.energy = 0;
        this.maxEnergy = 5;
        this.shield = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.mathAttempts = 0;
        this.mathCorrect = 0;
        this.damageTaken = 0;
        this.perfectDodges = 0;
        this.scoreProgressX = this.player.x;
        this.powerCooldown = 0;
        this.progress = { sequence: false, sentinel: false, artifact: false, secret: false, lore: false };
        this.tutorial = { move: false, interact: false, dash: false, attack: false, power: false };
        this.message = '';
        this.messageTime = 0;
        this.focus = null;
        this.events = [];
        this.attackHit = false;
        this.trail = [];
        this.puzzle = this.createPuzzle();
        const court = this.room('sentinel');
        this.sentinel = {
            x: court.x + 760, y: 285, homeX: court.x + 760,
            health: 5, maxHealth: 5, state: 'IDLE', timer: 0,
            shield: false, started: false, facingX: -1, facingY: 0
        };
        const sanctum = this.room('artifact');
        this.artifact = { x: sanctum.x + 565, y: 265, lift: 0, timer: 0 };
        this.secret = { x: sanctum.x + 175, y: 402 };
        this.lore = { x: this.room('corridor').x + 280, y: 330 };
        const gateRoom = this.room('gate');
        this.gate = { x: gateRoom.end, y: 275, state: 'locked', timer: 0 };
        this.portal = { x: this.room('portal').x + 535, y: 288 };
        this.escape = new EscapeMode(this.difficulty, this.room('corridor').x,
            this.portal.x - 120);
        this.fallingColumns = [
            { x: this.room('corridor').x + 420, y: 200, radius: 54, offset: 0.15 },
            { x: this.room('pulse').x + 760, y: 370, radius: 58, offset: 1.35 }
        ];
        this.closingGate = { x: this.room('pulse').end - 85, gapY: 285, cycle: 3.1 };
        this.challenge = null;
        this.checkpoint = null;
        this.setCheckpoint('entrance', 120, 275);
    }

    room(id) { return this.rooms.find(room => room.id === id); }

    createPuzzle() {
        const sequence = SEQUENCES[this.difficulty];
        const chamber = this.room('sequence');
        return {
            terms: sequence.terms,
            hint: sequence.hint,
            plates: sequence.values.map((value, index) => ({
                id: index, value, correct: value === sequence.correct,
                x: chamber.x + 745, y: 175 + index * 105
            })),
            cooldown: 0,
            lastPlate: null,
            pulse: 0
        };
    }

    center() {
        return { x: this.player.x + this.player.width / 2,
            y: this.player.y + this.player.height / 2 };
    }

    roomFor(x) {
        return Math.max(0, this.rooms.findIndex(room => x >= room.x && x < room.end));
    }

    emit(kind, data = {}) { this.events.push({ kind, ...data }); }

    say(message, duration = 2) {
        this.message = message;
        this.messageTime = duration;
    }

    focusOn(x, y, duration = 1.2) {
        this.focus = { x, y, time: duration };
        this.emit('focus', { x, y, duration });
    }

    skipIntro() {
        if (this.phase !== 'intro') return;
        this.introTime = 7.2;
        this.phase = 'playing';
        this.player.disabled = false;
        this.say('ESCAPA DEL TEMPLO  ·  3  2  1  ¡CORRE!', 3.3);
        this.emit('introEnd');
    }

    step(dt, actions = {}) {
        const safeDt = clamp(dt, 0, 0.05);
        this.events = [];
        this.clock += safeDt;
        if (this.phase === 'intro') {
            this.introTime += safeDt;
            if (this.introTime >= 7.2) this.skipIntro();
            return this.events;
        }
        if (this.phase === 'portal') {
            this.portalTime += safeDt;
            const here = this.center();
            const approach = Math.min(1, safeDt * 2.2);
            this.player.x += (this.portal.x - here.x) * approach;
            this.player.y += (this.portal.y - here.y) * approach;
            if (this.portalTime >= 1.3) {
                this.phase = 'complete';
                this.emit('levelComplete');
            }
            return this.events;
        }
        if (this.phase !== 'playing') return this.events;

        this.messageTime = Math.max(0, this.messageTime - safeDt);
        if (!this.messageTime) this.message = '';
        if (this.focus) {
            this.focus.time -= safeDt;
            if (this.focus.time <= 0) this.focus = null;
        }
        this.powerCooldown = Math.max(0, this.powerCooldown - safeDt);
        this.puzzle.cooldown = Math.max(0, this.puzzle.cooldown - safeDt);
        this.puzzle.pulse = Math.max(0, this.puzzle.pulse - safeDt);
        this.hazardClock += safeDt;
        this.trail = this.trail.filter(item => (item.life -= safeDt) > 0);

        if (this.challenge) {
            if (actions.answer) this.answer(actions.answer);
            return this.events;
        }
        if (this.artifact.timer > 0) {
            this.artifact.timer = Math.max(0, this.artifact.timer - safeDt);
            this.artifact.lift = 1 - this.artifact.timer / 1.05;
            if (this.artifact.timer === 0) this.acquireArtifact();
            return this.events;
        }
        if (this.gate.state === 'unlocking') {
            this.gate.timer = Math.max(0, this.gate.timer - safeDt);
            if (this.gate.timer === 0) {
                this.gate.state = 'open';
                this.emit('gateOpen');
            }
        }

        const movement = actions.move || { x: 0, y: 0 };
        const wasAttack = this.player.attackActive;
        if (actions.dash && this.player.startDash(movement.x || this.player.facingX,
            movement.y || this.player.facingY)) {
            this.tutorial.dash = true;
            this.emit('dash');
        }
        if (actions.attack && this.player.startAttack()) {
            this.attackHit = false;
            this.tutorial.attack = true;
            this.emit('attack');
        }
        if (actions.power) this.usePower();
        if (actions.interact) this.interact();
        this.player.update(safeDt, { getMovementVector: () => movement });
        this.movePlayer(safeDt);
        if (!this.escape.active && this.center().x >= this.room('corridor').x + 120) {
            this.escape.start(this.center().x);
            this.say('EL TEMPLO DESPIERTA · ¡CORRE!', 2.3);
            this.emit('escapeStart');
        }
        const combatPause = this.roomIndex === 4 && !this.progress.sentinel;
        const pressure = this.escape.update(safeDt, this.center().x, combatPause || !!this.challenge);
        if (pressure.caught) {
            this.breakCombo();
            this.hurt(-1, 0);
            this.emit('pressureHit');
        }
        if (this.escape.active && !combatPause) {
            const gained = Math.floor((this.center().x - this.scoreProgressX) / 90);
            if (gained > 0) {
                this.score += gained * Math.round(2 * this.escape.config.multiplier);
                this.scoreProgressX += gained * 90;
            }
        }
        if (Math.hypot(this.player.vx, this.player.vy) > 40) this.tutorial.move = true;
        if (this.player.state === 'DASH') {
            this.trail.push({ x: this.center().x, y: this.center().y + 24, life: 0.23 });
            if (this.trail.length > 12) this.trail.shift();
        }
        this.enterRoom();
        this.updatePuzzle();
        this.updateHazards();
        this.updateSentinel(safeDt);
        if (this.player.attackActive && (!wasAttack || !this.attackHit)) this.resolveAttack();
        return this.events;
    }

    movePlayer(dt) {
        const distance = Math.hypot(this.player.vx, this.player.vy) * dt;
        const steps = Math.max(1, Math.ceil(distance / 8));
        const dx = this.player.vx * dt / steps;
        const dy = this.player.vy * dt / steps;
        for (let index = 0; index < steps; index++) {
            if (this.canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
            else this.player.vx = 0;
            if (this.canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
            else this.player.vy = 0;
        }
    }

    canOccupy(x, y) {
        const cx = x + this.player.width / 2;
        const cy = y + this.player.height / 2;
        if (x < 32 || x + this.player.width > this.width - 32 || y < 105 || y > 445) return false;
        const currentX = this.center().x;
        const gateWall = this.gate.x - 65;
        if (this.gate.state !== 'open' &&
            ((currentX < gateWall && cx >= gateWall) ||
                (currentX >= gateWall && cx < gateWall))) return false;
        const secretWall = this.secret.x + 90;
        if (!this.progress.secret && cy >= 335 && cy <= 455 &&
            ((currentX < secretWall && cx >= secretWall) ||
                (currentX >= secretWall && cx < secretWall))) return false;
        for (let index = 1; index < this.rooms.length; index++) {
            const boundary = this.rooms[index].x;
            const crosses = (currentX < boundary && cx >= boundary) ||
                (currentX >= boundary && cx < boundary);
            if (!crosses) continue;
            if (cy < 184 || cy > 405) return false;
            if (boundary === this.room('pulse').x && !this.progress.sequence) return false;
            if (boundary === this.room('artifact').x && !this.progress.sentinel) return false;
            if (boundary === this.room('portal').x && this.gate.state !== 'open') return false;
            if (boundary === this.room('sentinel').x && this.sentinel.started &&
                !this.progress.sentinel && currentX >= boundary) return false;
        }
        const corridor = this.room('corridor');
        if (cx > corridor.x && cx < corridor.end) {
            for (const anchor of [corridor.x + 180, corridor.x + 445]) {
                const pillarY = anchor === corridor.x + 180 ? 164 : 422;
                if (Math.hypot(cx - anchor, cy - pillarY) < 48) return false;
            }
        }
        return true;
    }

    enterRoom() {
        const next = this.roomFor(this.center().x);
        if (next === this.roomIndex) return;
        this.roomIndex = next;
        const room = this.rooms[next];
        this.emit('roomEnter', { room: room.id });
        this.say(room.name, 2);
        if (room.id === 'pulse' && this.checkpoint.id !== 'pulse')
            this.setCheckpoint('pulse', room.x + 82, 275);
        if (room.id === 'sentinel' && this.checkpoint.id !== 'sentinel')
            this.setCheckpoint('sentinel', room.x + 82, 275);
        if (room.id === 'portal') this.focusOn(this.portal.x, this.portal.y, 1.15);
    }

    updatePuzzle() {
        if (this.progress.sequence || this.roomIndex !== 2) return;
        const here = this.center();
        const plate = this.puzzle.plates.find(item => dist(here, item) < 47);
        if (!plate) {
            this.puzzle.lastPlate = null;
            return;
        }
        if (this.puzzle.cooldown > 0 || this.puzzle.lastPlate === plate.id) return;
        this.puzzle.lastPlate = plate.id;
        this.puzzle.pulse = 0.65;
        if (!plate.correct) {
            this.mathAttempts++;
            this.breakCombo();
            this.escape.pressureX += 75;
            this.puzzle.cooldown = 0.65;
            this.say('RUTA INCORRECTA · LA PRESIÓN AUMENTA', 1.5);
            this.emit('puzzleError', { x: plate.x, y: plate.y });
            return;
        }
        this.progress.sequence = true;
        this.mathAttempts++;
        this.mathCorrect++;
        this.raiseCombo();
        this.escape.grantBreathingRoom(125);
        this.energy = clamp(this.energy + 2, 0, this.maxEnergy);
        this.score += 80 * this.combo;
        this.setCheckpoint('sequence', this.room('pulse').x + 82, 275);
        this.say('SECUENCIA COMPLETA · EL PASO SE ABRE', 2.2);
        this.focusOn(this.room('pulse').x, 275, 1.2);
        this.emit('puzzleSuccess', { x: plate.x, y: plate.y });
    }

    hazardState(index) {
        const config = HAZARDS[this.difficulty];
        const phase = (this.hazardClock + index * config.cycle / 3) % config.cycle;
        return phase < config.telegraph ? 'warning' :
            phase < config.telegraph + config.active ? 'active' : 'cooldown';
    }

    updateHazards() {
        if (this.roomIndex < 1 || this.roomIndex > 3) return;
        const hall = this.room('pulse');
        const center = this.center();
        if (this.roomIndex === 3) for (let index = 0; index < 3; index++) {
            const x = hall.x + 270 + index * 245;
            if (this.hazardState(index) === 'active' && Math.abs(center.x - x) < 28 &&
                center.y > 130 && center.y < 445) {
                this.hurt(center.x < x ? -1 : 1, 0);
            }
        }
        for (const column of this.fallingColumns) {
            const phase = (this.hazardClock + column.offset) % 3.4;
            const active = phase > 1.15 && phase < 1.55;
            if (active && dist(center, column) < column.radius) this.hurt(-1, 0);
        }
        if (this.roomIndex === 3) {
            const phase = this.hazardClock % this.closingGate.cycle;
            const halfGap = phase > 1.45 && phase < 2.25 ? 48 : 118;
            if (Math.abs(center.x - this.closingGate.x) < 25 &&
                Math.abs(center.y - this.closingGate.gapY) > halfGap) this.hurt(-1, 0);
        }
    }

    updateSentinel(dt) {
        const enemy = this.sentinel;
        if (this.progress.sentinel) return;
        if (this.roomIndex !== 4 || this.challenge) return;
        const here = this.center();
        const deltaX = here.x - enemy.x;
        const deltaY = here.y - enemy.y;
        const range = Math.hypot(deltaX, deltaY);
        if (!enemy.started && range < 600) {
            enemy.started = true;
            enemy.state = 'NOTICE';
            enemy.timer = 0.42;
            this.emit('enemyNotice');
            this.say('CENTINELA · ESQUIVA SU GOLPE Y CONTRAATACA', 2.3);
        }
        if (!enemy.started) return;
        enemy.timer = Math.max(0, enemy.timer - dt);
        if (enemy.state === 'NOTICE' && enemy.timer === 0) enemy.state = 'CHASE';
        else if (enemy.state === 'CHASE') {
            if (range < 114) {
                enemy.state = 'WINDUP';
                enemy.timer = this.difficulty === 'maestro' ? 0.55 : 0.74;
                this.emit('enemyWindup');
            } else {
                const speed = this.difficulty === 'explorador' ? 94 : 117;
                const court = this.room('sentinel');
                enemy.x = clamp(enemy.x + deltaX / range * speed * dt, court.x + 88, court.end - 85);
                enemy.y = clamp(enemy.y + deltaY / range * speed * dt, 150, 425);
                enemy.facingX = deltaX / range;
                enemy.facingY = deltaY / range;
            }
        } else if (enemy.state === 'WINDUP' && enemy.timer === 0) {
            enemy.state = 'ATTACK';
            enemy.timer = 0.13;
            if (range < 108) this.hurt(deltaX / (range || 1), deltaY / (range || 1));
            this.emit('enemyAttack');
        } else if (enemy.state === 'ATTACK' && enemy.timer === 0) {
            enemy.state = 'RECOVER';
            enemy.timer = 0.75;
        } else if (enemy.state === 'RECOVER' && enemy.timer === 0) {
            enemy.state = 'CHASE';
        } else if (enemy.state === 'HURT' && enemy.timer === 0) {
            enemy.state = 'CHASE';
        }
    }

    resolveAttack() {
        if (this.attackHit || this.roomIndex !== 4 || this.progress.sentinel) return;
        const enemy = this.sentinel;
        if (!enemy.started || enemy.state === 'DEFEATED') return;
        const here = this.center();
        const dx = enemy.x - here.x;
        const dy = enemy.y - here.y;
        const range = Math.hypot(dx, dy);
        const facing = (dx * this.player.facingX + dy * this.player.facingY) / (range || 1);
        if (range > 102 || facing < 0.25) return;
        this.attackHit = true;
        if (enemy.shield) {
            this.say('ESCUDO MATEMÁTICO · ACTIVA EL NODO', 1.7);
            this.emit('shieldContact', { x: enemy.x, y: enemy.y });
            return;
        }
        enemy.health--;
        enemy.state = enemy.health ? 'HURT' : 'DEFEATED';
        enemy.timer = 0.24;
        this.emit('enemyHit', { x: enemy.x, y: enemy.y, health: enemy.health });
        if (enemy.health === 2) {
            enemy.shield = true;
            this.say('SU ESCUDO RESPONDE A LAS MATEMÁTICAS', 2);
            this.focusOn(this.room('sentinel').x + 255, 185, 1.3);
            this.emit('shieldUp');
        }
        if (enemy.health <= 0) {
            this.progress.sentinel = true;
            this.raiseCombo();
            this.score += 110 * this.combo;
            this.energy = clamp(this.energy + 1, 0, this.maxEnergy);
            this.escape.grantBreathingRoom(150);
            this.say('CENTINELA DERROTADO · ¡SIGUE CORRIENDO!', 2.4);
            this.focusOn(this.artifact.x, this.artifact.y, 1.5);
            this.emit('enemyDefeated');
        }
    }

    near(target, radius = 94) { return dist(this.center(), target) < radius; }

    interact() {
        if (this.player.disabled || this.player.dashTimer > 0) return;
        const candidates = [];
        if (this.roomIndex === 1 && !this.progress.lore && this.near(this.lore, 78))
            candidates.push({ priority: 1, kind: 'lore' });
        if (this.roomIndex === 4 && this.sentinel.shield && this.near({ x: this.room('sentinel').x + 255, y: 185 }, 98))
            candidates.push({ priority: 4, kind: 'node' });
        if (this.roomIndex === 5 && !this.progress.artifact && this.near(this.artifact, 108))
            candidates.push({ priority: 4, kind: 'artifact' });
        if (this.roomIndex === 5 && !this.progress.secret && this.near(this.secret, 80))
            candidates.push({ priority: 3, kind: 'secret' });
        if (this.roomIndex === 6 && this.near(this.gate, 120))
            candidates.push({ priority: 5, kind: 'gate' });
        if (this.roomIndex === 7 && this.near(this.portal, 110))
            candidates.push({ priority: 5, kind: 'portal' });
        candidates.sort((a, b) => b.priority - a.priority);
        const target = candidates[0]?.kind;
        if (!target) return;
        if (target === 'gate' && this.gate.state !== 'locked') return;
        if (target === 'gate' &&
            (!this.progress.sequence || !this.progress.sentinel || !this.progress.artifact)) {
            this.say('NECESITAS SECUENCIA · CENTINELA · ARTEFACTO', 2.5);
            this.emit('gateDenied');
            return;
        }
        if (target === 'portal' && this.gate.state !== 'open') return;
        if (!this.player.startInteract(target === 'artifact' ? 1.05 : 0.25)) return;
        this.tutorial.interact = true;
        if (target === 'lore') {
            this.progress.lore = true;
            this.say('INSCRIPCIÓN: EL TEMPLO RESPONDE A QUIEN OBSERVA', 3);
            this.emit('lore');
        } else if (target === 'node') {
            this.challenge = {
                kind: 'sentinel', question: 'Σ · 3 + 5 × 2 = ?',
                options: { A: '13', B: '16', C: '10' }, correct: 'A'
            };
            this.player.disabled = true;
            this.emit('challengeOpen');
        } else if (target === 'secret') {
            this.challenge = {
                kind: 'secret', question: 'EL GRABADO SUSURRA: √81 = ?',
                options: { A: '7', B: '9', C: '11' }, correct: 'B'
            };
            this.player.disabled = true;
            this.emit('challengeOpen');
        } else if (target === 'artifact') {
            this.artifact.timer = 1.05;
            this.player.disabled = true;
            this.focusOn(this.artifact.x, this.artifact.y, 1.1);
            this.emit('artifactStart');
        } else if (target === 'gate') {
            this.gate.state = 'unlocking';
            this.gate.timer = 1.25;
            this.focusOn(this.gate.x, this.gate.y, 1.3);
            this.say('EL SELLO MATEMÁTICO DESPIERTA', 2);
            this.emit('gateStart');
        } else if (target === 'portal' && this.gate.state === 'open') {
            this.phase = 'portal';
            this.portalTime = 0;
            this.player.disabled = true;
            this.emit('portalStart');
        }
    }

    answer(choice) {
        if (!this.challenge || !['A', 'B', 'C'].includes(choice)) return;
        const kind = this.challenge.kind;
        const correct = choice === this.challenge.correct;
        this.mathAttempts++;
        if (correct) this.mathCorrect++;
        this.challenge = null;
        this.player.disabled = false;
        if (correct && kind === 'sentinel') {
            this.raiseCombo();
            this.sentinel.shield = false;
            this.energy = clamp(this.energy + 1, 0, this.maxEnergy);
            this.score += 70;
            this.say('ESCUDO ROTO · CONTRAATACA', 1.8);
            this.emit('combatMathSuccess');
        } else if (correct && kind === 'secret') {
            this.raiseCombo();
            this.progress.secret = true;
            this.score += 55;
            this.energy = clamp(this.energy + 1, 0, this.maxEnergy);
            this.lives = Math.min(this.maxLives, this.lives + 1);
            this.say('PASADIZO REVELADO · ENERGÍA Σ +1', 2.2);
            this.emit('secretFound');
        } else {
            this.breakCombo();
            this.say('EL SELLO RECHAZA LA RESPUESTA · INTENTA OTRA VEZ', 1.7);
            this.emit('mathError');
        }
    }

    acquireArtifact() {
        this.progress.artifact = true;
        this.player.disabled = false;
        this.energy = Math.max(1, this.energy);
        this.score += 65;
        this.setCheckpoint('artifact', this.room('artifact').x + 675, 275);
        this.say('ARTEFACTO DESBLOQUEADO · ESCUDO Σ · PULSA L', 3.5);
        this.emit('artifactAcquired');
    }

    usePower() {
        if (!this.progress.artifact) {
            this.say('ESCUDO Σ REQUIERE EL ARTEFACTO', 1.2);
            return;
        }
        if (this.energy < 1 || this.shield || this.powerCooldown > 0 || this.player.disabled) return;
        this.energy--;
        this.shield = 1;
        this.powerCooldown = 3;
        this.tutorial.power = true;
        this.emit('shieldActivate');
    }

    hurt(dx, dy) {
        if (this.shield && this.player.invulnerable === 0) {
            this.shield = 0;
            this.player.invulnerable = 0.35;
            this.emit('shieldAbsorb');
            return true;
        }
        if (!this.player.receiveHit(dx, dy)) return false;
        this.lives--;
        this.damageTaken++;
        this.breakCombo();
        this.emit('playerHurt');
        if (this.lives <= 0) this.restoreCheckpoint();
        return true;
    }

    raiseCombo() {
        this.combo = Math.min(6, this.combo + 1);
        this.maxCombo = Math.max(this.maxCombo, this.combo);
    }

    breakCombo() { this.combo = 1; }

    results() {
        return {
            seconds: Math.max(1, Math.round(this.escape.elapsed)),
            attempts: this.mathAttempts,
            correct: this.mathCorrect,
            accuracy: this.mathAttempts ? Math.round(this.mathCorrect / this.mathAttempts * 100) : 0,
            maxCombo: this.maxCombo,
            damageTaken: this.damageTaken,
            lives: this.lives,
            score: this.score
        };
    }

    setCheckpoint(id, x, y) {
        this.checkpoint = {
            id, x, y, progress: { ...this.progress }, energy: this.energy,
            score: this.score, shield: this.shield
        };
        this.emit('checkpoint', { id });
    }

    restoreCheckpoint() {
        const saved = this.checkpoint;
        this.progress = { ...saved.progress };
        this.energy = saved.energy;
        this.score = saved.score;
        this.shield = saved.shield;
        this.lives = this.maxLives;
        this.player.x = saved.x - this.player.width / 2;
        this.player.y = saved.y - this.player.height / 2;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.hurtTimer = 0;
        this.player.invulnerable = 1.3;
        this.player.disabled = false;
        this.roomIndex = this.roomFor(saved.x);
        this.sentinel.health = saved.progress.sentinel ? 0 : 5;
        this.sentinel.state = saved.progress.sentinel ? 'DEFEATED' : 'IDLE';
        this.sentinel.shield = false;
        this.sentinel.started = false;
        this.sentinel.x = this.sentinel.homeX;
        this.sentinel.y = 285;
        this.challenge = null;
        this.say('REANUDANDO DESDE EL ÚLTIMO PUNTO DE CONTROL', 2.2);
        this.emit('respawn', { checkpoint: saved.id });
    }

    prompt() {
        if (this.challenge) return 'J / K / L  ·  ELIGE LA RESPUESTA';
        if (this.phase !== 'playing') return '';
        if (this.roomIndex === 1 && !this.progress.lore && this.near(this.lore, 78))
            return 'E / ESPACIO · LEER INSCRIPCIÓN';
        if (this.roomIndex === 4 && this.sentinel.shield &&
            this.near({ x: this.room('sentinel').x + 255, y: 185 }, 98))
            return 'E / ESPACIO · ACTIVAR NODO Σ';
        if (this.roomIndex === 5 && !this.progress.artifact && this.near(this.artifact, 108))
            return 'E / ESPACIO · TOMAR ARTEFACTO';
        if (this.roomIndex === 5 && !this.progress.secret && this.near(this.secret, 80))
            return 'E / ESPACIO · EXAMINAR GRABADO';
        if (this.roomIndex === 6 && this.near(this.gate, 120))
            return this.gate.state === 'locked' ? 'E / ESPACIO · ACTIVAR SELLO' : '';
        if (this.roomIndex === 7 && this.near(this.portal, 110))
            return 'E / ESPACIO · ENTRAR AL PORTAL';
        if (!this.tutorial.move) return 'MOVER · WASD / FLECHAS';
        if (this.roomIndex === 3 && !this.tutorial.dash) return 'ESQUIVAR · K (BOTÓN B)';
        if (this.roomIndex === 4 && !this.tutorial.attack) return 'ATACAR · J (BOTÓN A)';
        if (this.progress.artifact && !this.tutorial.power) return 'ACTIVAR ESCUDO Σ · L (BOTÓN C)';
        return '';
    }
}
