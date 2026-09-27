const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const SETTINGS = {
    explorador: { speed: 72, pressureGap: 430, multiplier: 1, decisionWindow: 5.8 },
    aventurero: { speed: 90, pressureGap: 365, multiplier: 1.25, decisionWindow: 4.7 },
    maestro: { speed: 108, pressureGap: 310, multiplier: 1.55, decisionWindow: 3.8 }
};

/** Reusable forward-pressure controller. Gameplay remains in the owning level model. */
export class EscapeMode {
    constructor(difficulty, startX, finishX) {
        this.config = SETTINGS[difficulty] || SETTINGS.aventurero;
        this.startX = startX;
        this.finishX = finishX;
        this.pressureX = startX - this.config.pressureGap;
        this.progress = 0;
        this.distance = 0;
        this.active = false;
        this.paused = false;
        this.finished = false;
        this.elapsed = 0;
        this.catchCooldown = 0;
    }

    start(playerX) {
        this.active = true;
        this.pressureX = Math.min(this.pressureX, playerX - this.config.pressureGap);
    }

    update(dt, playerX, paused = false) {
        if (!this.active || this.finished) return { caught: false };
        this.paused = paused;
        this.catchCooldown = Math.max(0, this.catchCooldown - dt);
        if (!paused) {
            this.elapsed += dt;
            this.pressureX += this.config.speed * dt;
        }
        this.distance = Math.max(this.distance, playerX - this.startX);
        this.progress = clamp(this.distance / (this.finishX - this.startX), 0, 1);
        this.finished = this.progress >= 1;
        const caught = !paused && this.catchCooldown === 0 && playerX < this.pressureX + 55;
        if (caught) {
            this.catchCooldown = 1.2;
            this.pressureX = playerX - this.config.pressureGap * 0.72;
        }
        return { caught };
    }

    grantBreathingRoom(amount = 90) {
        this.pressureX -= amount;
    }
}
