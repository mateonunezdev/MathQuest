import { InputSystem } from './systems/InputSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { Renderer } from './systems/Renderer.js';
import { MathChallengeSystem } from './systems/MathChallengeSystem.js';
import { HUD } from './systems/HUD.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { Player } from './entities/Player.js';
import { MathDoor } from './entities/MathDoor.js';
import { Goal } from './entities/Goal.js';
import { Particle } from './entities/Particle.js';
import { LevelData } from './levels/LevelData.js';

const GameState = {
    START: 'start',
    PLAYING: 'playing',
    CHALLENGE: 'challenge',
    VICTORY: 'victory',
    TRANSITION: 'transition'
};

class Game {
    constructor() {
        this.canvas = document.querySelector('#game');
        this.ctx = this.canvas.getContext('2d');
        this.state = GameState.START;
        this.previousState = null;
        this.transitionAlpha = 0;
        this.transitionDirection = 1;
        this.transitionSpeed = 0.02;

        this.entities = [];
        this.particles = [];
        this.camera = { x: 0, y: 0, shake: 0, shakeIntensity: 0 };
        this.input = new InputSystem();
        this.collision = new CollisionSystem();
        this.renderer = new Renderer(this.ctx, this.camera);
        this.mathChallenge = new MathChallengeSystem();
        this.hud = new HUD();
        this.audio = new AudioSystem();
        this.level = null;

        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.levelNumber = 1;

        // Game feel
        this.hitPauseTimer = 0;
        this.hitPauseDuration = 0;
        this.lastFootstepTime = 0;

        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedTimeStep = 1 / 60;
        this.maxSubSteps = 5;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initStartScreen();
        
        // Initialize audio on first user interaction
        this.audioInitialized = false;
        const initAudio = () => {
            if (!this.audioInitialized) {
                this.audio.init();
                this.audioInitialized = true;
            }
        };
        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });

        // Canvas click handler for mute button and victory restart
        this.canvas.addEventListener('pointerdown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const canvasY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            // Mute button click
            if (this.hud.checkMuteClick(canvasX, canvasY)) {
                const muted = this.audio.toggleMute();
                const startMuteIcon = document.querySelector('#mute-icon');
                if (startMuteIcon) {
                    startMuteIcon.textContent = this.audio.muted ? '🔇' : '🔊';
                }
                return;
            }
            
            // Victory restart
            if (this.state === GameState.VICTORY) {
                if (this.hud.checkVictoryClick(canvasX, canvasY)) {
                    this.restartGame();
                }
            }
        });
        
        // Keyboard for restart
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (this.state === GameState.VICTORY) {
                    this.restartGame();
                }
            }
        });

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resize() {
        const maxWidth = Math.min(1100, window.innerWidth * 0.94);
        const maxHeight = window.innerHeight * 0.75;
        const aspectRatio = 16 / 9;

        let width = maxWidth;
        let height = width / aspectRatio;

        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.canvas.width = 960;
        this.canvas.height = 540;
    }

    initStartScreen() {
        this.startScreen = document.createElement('div');
        this.startScreen.id = 'start-screen';
        this.startScreen.innerHTML = `
            <div class="start-content">
                <div class="title-container">
                    <h1 class="title-main">MATHQUEST</h1>
                    <p class="title-sub">ESCAPE MATEMÁTICO</p>
                </div>
                <div class="controls-hint">
                    <span class="key"><kbd>WASD</kbd> / <kbd>Flechas</kbd></span> Movimiento
                    <span class="key"><kbd>A</kbd> / <kbd>B</kbd> / <kbd>C</kbd></span> Responder
                </div>
                <button id="start-btn" class="btn-primary">INICIAR MISIÓN</button>
                <button id="mute-btn" class="btn-secondary" title="Silenciar audio">
                    <span id="mute-icon">🔊</span>
                </button>
            </div>
        `;
        document.querySelector('.game-shell').appendChild(this.startScreen);

        document.querySelector('#start-btn').addEventListener('click', () => this.startGame());
        document.querySelector('#mute-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const muted = this.audio.toggleMute();
            document.querySelector('#mute-icon').textContent = muted ? '🔇' : '🔊';
        });
        this.input.onStartPressed = () => this.startGame();
    }

    startGame() {
        if (this.state !== GameState.START) return;
        this.state = GameState.TRANSITION;
        this.transitionDirection = 1;
        this.transitionAlpha = 0;

        setTimeout(() => {
            this.startScreen.classList.add('hidden');
            setTimeout(() => {
                this.startScreen.remove();
                this.loadLevel(1);
                this.state = GameState.PLAYING;
                this.transitionDirection = -1;
                this.audio.play('uiClick');
            }, 300);
        }, 400);
    }

    loadLevel(levelNum) {
        this.levelNumber = levelNum;
        this.level = LevelData.getLevel(levelNum);
        this.entities = [];
        this.particles = [];

        const playerStart = this.level.playerStart;
        this.player = new Player(playerStart.x, playerStart.y);
        this.entities.push(this.player);

        this.door = new MathDoor(this.level.door.x, this.level.door.y, this.level.door.challengeId);
        this.entities.push(this.door);

        this.goal = new Goal(this.level.goal.x, this.level.goal.y);
        this.entities.push(this.goal);

        this.decorations = LevelData.generateDecorations(this.level);
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        this.score = 0;
        this.lives = this.maxLives;
        this.hud.reset(this.score, this.lives, this.maxLives, this.levelNumber);
    }

    handleChallengeResult(correct) {
        if (correct) {
            this.score += 100;
            this.camera.shake = 0.3;
            this.camera.shakeIntensity = 8;
            this.spawnParticles(this.door.x + 30, this.door.y + 30, '#37c4ff', 20);
            this.door.unlock();
            this.audio.play('doorUnlock');
        } else {
            this.lives = Math.max(0, this.lives - 1);
            this.camera.shake = 0.2;
            this.camera.shakeIntensity = 5;
            this.spawnParticles(this.player.x, this.player.y, '#ff4444', 10);
            this.audio.play('incorrect');
        }
        this.hud.update(this.score, this.lives, this.maxLives);
    }

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                0.5 + Math.random() * 0.8
            ));
        }
    }
update(dt) {
        // Handle hit pause - freeze everything except camera shake
        if (this.hitPauseTimer > 0) {
            this.hitPauseTimer -= dt;
            if (this.hitPauseTimer < 0) this.hitPauseTimer = 0;
            dt = 0; // Freeze game logic during hit pause
        }

        if (this.state === GameState.PLAYING) {
            this.player.update(dt, this.input);
            const collisionInfo = this.collision.resolve(this.player, this.level, this.door, dt);

            // Hit pause on wall collision for game feel
            if (collisionInfo.hitWall && (this.player.vx !== 0 || this.player.vy !== 0)) {
                this.hitPauseTimer = 0.05; // 50ms hit pause
                this.camera.shake = 0.15;
                this.camera.shakeIntensity = 4;
                this.audio.play('doorHit');
            }
            
            // Door collision feedback - only freeze world on LOCKED door.
            // During UNLOCKING the door must keep opening (hitPause would stall it).
            if (collisionInfo.hitDoor && this.door.state !== 'unlocking') {
                this.hitPauseTimer = 0.06;
                this.camera.shake = 0.15;
                this.camera.shakeIntensity = 5;
                this.audio.play('doorHit');
            }

            this.door.update(dt, this.player);
            this.goal.update(dt, this.player);

            // Footstep sounds
            if (this.player.walkSpeed > 0.3) {
                this.lastFootstepTime -= dt;
                if (this.lastFootstepTime <= 0) {
                    this.audio.playFootstep();
                    this.lastFootstepTime = 0.35; // Footstep interval
                }
            }

            this.updateCamera(dt);
            this.updateParticles(dt);
        } else if (this.state === GameState.CHALLENGE) {
            this.mathChallenge.update(dt);
        } else if (this.state === GameState.VICTORY) {
            this.updateParticles(dt);
        }

        if (this.state === GameState.TRANSITION) {
            this.transitionAlpha += this.transitionDirection * this.transitionSpeed;
            if (this.transitionAlpha >= 1) this.transitionAlpha = 1;
            if (this.transitionAlpha <= 0) this.transitionAlpha = 0;
        }

        // Limpiar estados temporales del input al FINAL del frame, en cualquier estado
        this.input.update();
    }

    updateCamera(dt) {
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;

        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;

        const maxX = this.level.width * 60 - this.canvas.width;
        const maxY = this.level.height * 60 - this.canvas.height;
        this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));

        if (this.camera.shake > 0) {
            this.camera.shake -= dt;
            this.camera.offsetX = (Math.random() - 0.5) * this.camera.shakeIntensity;
            this.camera.offsetY = (Math.random() - 0.5) * this.camera.shakeIntensity;
        } else {
            this.camera.offsetX = 0;
            this.camera.offsetY = 0;
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }
    }

    requestScreenShake(duration, intensity) {
        this.camera.shake = duration;
        this.camera.shakeIntensity = intensity;
    }

    render() {
        const renderWorld = this.level && (this.state === GameState.PLAYING || this.state === GameState.CHALLENGE || this.state === GameState.VICTORY);

        if (renderWorld) {
            this.ctx.save();
            this.ctx.translate(-this.camera.x + (this.camera.offsetX || 0), -this.camera.y + (this.camera.offsetY || 0));

            this.renderer.renderBackground(this.level);
            this.renderer.renderDecorations(this.decorations);
            this.renderer.renderTilemap(this.level);
            this.entities.forEach(e => e.render(this.renderer));
            this.particles.forEach(p => p.render(this.ctx));

            this.ctx.restore();
        }

        this.hud.render(this.ctx);

        if (this.state === GameState.CHALLENGE) {
            this.mathChallenge.render(this.ctx);
        }

        if (this.state === GameState.TRANSITION && this.transitionAlpha > 0) {
            this.ctx.fillStyle = `rgba(7, 17, 31, ${this.transitionAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    restartGame() {
        // Limpiar estado de victoria y volver a START una sola vez
        this.state = GameState.START;
        this.level = null;
        this.entities = [];
        this.particles = [];
        this.score = 0;
        this.lives = this.maxLives;
        this.hud.reset(this.score, this.lives, this.maxLives, this.levelNumber);
        this.hud.victoryVisible = false;

        // No duplicar start screens
        const existing = document.querySelector('#start-screen');
        if (existing) existing.remove();
        this.initStartScreen();
    }

    gameLoop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        this.accumulator += dt;
        while (this.accumulator >= this.fixedTimeStep && this.maxSubSteps-- > 0) {
            this.update(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }
        this.maxSubSteps = 5;

        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    triggerChallenge(challengeId) {
        this.state = GameState.CHALLENGE;
        this.audio.play('doorCharge');
        this.mathChallenge.open(challengeId, (correct) => {
            this.handleChallengeResult(correct);
            this.state = GameState.PLAYING;
        });
    }

    triggerVictory() {
        this.state = GameState.VICTORY;
        this.spawnParticles(this.goal.x, this.goal.y, '#37c4ff', 40);
        this.spawnParticles(this.goal.x, this.goal.y, '#ffd700', 20);
        this.audio.play('victory');
        this.hud.showVictory(this.score, this.lives, () => {
            this.startScreen = null;
            this.initStartScreen();
            this.state = GameState.START;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});