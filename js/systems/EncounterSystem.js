const near = (player, target, range = 82) => player && target &&
    Math.hypot(player.x + player.width / 2 - target.x,
        player.y + player.height / 2 - target.y) < range;

export class EncounterSystem {
    constructor() {
        this.reset();
    }

    reset() {
        this.shield = 0;
        this.pulse = 0;
        this.station = null;
        this.sentinel = null;
        this.boss = null;
    }

    load(level) {
        this.station = level.powerUp ? { ...level.powerUp, used: false, cooldown: 0 } : null;
        this.sentinel = level.sentinel ? { ...level.sentinel, alive: true } : null;
        this.boss = level.boss ? { ...level.boss, health: 3, phase: 1, state: 'guarding', clock: 0, telegraph: 0, slow: 0 } : null;
    }

    update(dt, player, bossInterval = 6, bossActive = false) {
        if (this.station?.cooldown > 0) this.station.cooldown = Math.max(0, this.station.cooldown - dt);
        const boss = this.boss;
        if (!boss || boss.health === 0 || !bossActive) return { hit: false };
        boss.slow = Math.max(0, boss.slow - dt);
        if (boss.state === 'telegraph') {
            boss.telegraph = Math.max(0, boss.telegraph - dt);
            if (boss.telegraph === 0) {
                boss.state = 'recovering';
                boss.clock = 0;
                return { hit: Boolean(near(player, boss, 170)) };
            }
        } else if (boss.state === 'recovering') {
            boss.clock += dt;
            if (boss.clock >= 1.2) {
                boss.state = 'guarding';
                boss.clock = 0;
            }
        } else if (near(player, boss, 210)) {
            boss.clock += dt;
            const interval = bossInterval * (1 - (boss.phase - 1) * 0.15) * (boss.slow > 0 ? 1.6 : 1);
            if (boss.clock >= interval) {
                boss.state = 'telegraph';
                boss.telegraph = 1.4;
                boss.clock = 0;
            }
        }
        return { hit: false };
    }

    actionNear(player) {
        if (this.station && !this.station.used && this.station.cooldown === 0 && near(player, this.station)) {
            return { kind: 'powerup', ref: this.station.type };
        }
        if (this.sentinel?.alive && near(player, this.sentinel)) return { kind: 'attack', ref: 'attack' };
        if (this.boss && this.boss.health > 0 && near(player, this.boss, 130)) {
            return { kind: 'boss', ref: `boss-${this.boss.phase}` };
        }
        return null;
    }

    resolve(action, correct) {
        if (!action) return { damage: 0, score: 0, heal: 0 };
        if (action.kind === 'powerup' && this.station && !this.station.used && action.ref === this.station.type) {
            if (!correct) {
                this.station.cooldown = 4;
                return { damage: 0, score: 0, heal: 0 };
            }
            this.station.used = true;
            if (action.ref === 'shield') this.shield = 1;
            if (action.ref === 'pulse') this.pulse = 1;
            return { damage: 0, score: 40, heal: action.ref === 'heal' ? 1 : 0 };
        }
        if (action.kind === 'attack' && this.sentinel?.alive) {
            if (!correct) return { damage: 1, score: 0, heal: 0 };
            this.sentinel.alive = false;
            return { damage: 0, score: 75, heal: 0 };
        }
        if (action.kind === 'boss' && this.boss?.health > 0 && action.ref === `boss-${this.boss.phase}`) {
            if (!correct) return { damage: 1, score: 0, heal: 0 };
            const phase = this.boss.phase;
            this.boss.health--;
            this.boss.phase = Math.min(3, phase + 1);
            this.boss.state = this.boss.health ? 'guarding' : 'defeated';
            this.boss.clock = 0;
            this.boss.telegraph = 0;
            if (this.pulse) {
                this.boss.slow = 8;
                this.pulse = 0;
            }
            return { damage: 0, score: 100 + phase * 25, heal: 0 };
        }
        return { damage: 0, score: 0, heal: 0 };
    }

    absorbHit() {
        if (this.shield <= 0) return false;
        this.shield--;
        return true;
    }

    canActivateGoal() {
        return !this.sentinel?.alive && (!this.boss || this.boss.health === 0);
    }
}
