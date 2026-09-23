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
import { DIFFICULTIES } from './levels/ChallengeBank.js';

const GameState = {
    START: 'start',
    DIFFICULTY: 'difficulty',
    LEVEL_INTRO: 'level_intro',
    PLAYING: 'playing',
    CHALLENGE: 'challenge',
    VICTORY: 'victory',
    GAME_OVER: 'game_over',
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
        this.input.onMenuInput = key => this.handleMenuInput(key);
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
        this.difficulty = DIFFICULTIES.aventurero.id;
        this.difficultyOrder = Object.keys(DIFFICULTIES);
        this.selectedDifficultyIndex = this.difficultyOrder.indexOf(this.difficulty);
        this.activeDoor = null;
        this.completedLevel = null;
        this.levelIntroTimer = null;
        this.levelTransitionTimer = null;
        this.introLevelNumber = null;

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
            
            if (this.state === GameState.VICTORY && this.hud.checkVictoryClick(canvasX, canvasY)) {
                this.restartGame();
            } else if (this.state === GameState.GAME_OVER && this.hud.checkGameOverClick(canvasX, canvasY)) {
                this.restartGame();
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
        document.querySelector('#start-screen')?.remove();
        this.startScreen = document.createElement('div');
        this.startScreen.id = 'start-screen';
        this.startScreen.innerHTML = `
            <section class="entry-panel attract-panel" data-entry-panel="attract">
                <div class="entry-stars" aria-hidden="true"></div>
                <div class="brand-lockup">
                    <svg class="brand-crown" viewBox="0 0 120 72" aria-hidden="true">
                        <path d="M11 55 4 17l29 18L59 5l27 30 30-18-9 38z" />
                        <path d="M14 61h92" />
                        <circle cx="4" cy="14" r="4"/><circle cx="59" cy="5" r="4"/><circle cx="116" cy="14" r="4"/>
                    </svg>
                    <p class="edition-kicker">FAIR EDITION</p>
                    <h1 class="title-main">MATH<span>QUEST</span></h1>
                    <p class="title-sub">RESUELVE <i>•</i> AVANZA <i>•</i> CONQUISTA</p>
                </div>
                <div class="portal-stage" aria-hidden="true">
                    <div class="portal-glow"></div>
                    <div class="portal-ring portal-ring-outer"></div>
                    <div class="portal-ring portal-ring-mid"></div>
                    <div class="portal-ring portal-ring-inner"></div>
                    <div class="portal-glyphs"><span>π</span><span>Σ</span><span>∞</span><span>√</span><span>÷</span><span>×</span></div>
                    <div class="portal-core"><span>+</span></div>
                    <div class="portal-particles">${Array.from({ length: 12 }, (_, i) => `<i style="--particle:${i}"></i>`).join('')}</div>
                </div>
                <div class="entry-actions">
                    <button id="start-btn" class="start-prompt"><span>PULSA START</span><small>ENTER / ESPACIO</small></button>
                    <div class="arcade-controls">
                        <span><kbd>WASD</kbd> / <kbd>FLECHAS</kbd> MOVERSE</span>
                        <span><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> RESPONDER</span>
                    </div>
                </div>
                <button id="mute-btn" class="sound-toggle" title="Silenciar audio"><span id="mute-icon">◖</span> SONIDO</button>
            </section>
            <section class="entry-panel difficulty-panel hidden" data-entry-panel="difficulty">
                <div class="difficulty-header">
                    <p class="edition-kicker">ELIGE TU RETO</p>
                    <h2>DIFICULTAD</h2>
                    <p>Tu elección ajusta todos los desafíos de la campaña.</p>
                </div>
                <div class="difficulty-cards" role="listbox" aria-label="Dificultad">
                    <button class="difficulty-card" data-difficulty="explorador" role="option">
                        <span class="choice-key">A</span><span class="difficulty-emblem">◇</span>
                        <strong>EXPLORADOR</strong><small>Primeros pasos</small>
                        <p>Operaciones claras para avanzar con confianza.</p>
                    </button>
                    <button class="difficulty-card" data-difficulty="aventurero" role="option">
                        <span class="choice-key">B</span><span class="difficulty-emblem">◈</span>
                        <strong>AVENTURERO</strong><small>Reto equilibrado</small>
                        <p>Decisiones ágiles para una expedición completa.</p>
                    </button>
                    <button class="difficulty-card" data-difficulty="maestro" role="option">
                        <span class="choice-key">C</span><span class="difficulty-emblem">✦</span>
                        <strong>MAESTRO</strong><small>Máximo desafío</small>
                        <p>Cálculo exigente para auténticos conquistadores.</p>
                    </button>
                </div>
                <div class="difficulty-footer">
                    <span><kbd>←</kbd><kbd>→</kbd> ELEGIR</span>
                    <button id="difficulty-confirm" class="confirm-choice">CONFIRMAR <small>ENTER</small></button>
                    <span><kbd>A</kbd><kbd>B</kbd><kbd>C</kbd> ACCESO DIRECTO</span>
                </div>
            </section>
        `;
        document.querySelector('.game-shell').appendChild(this.startScreen);

        this.startScreen.querySelector('#start-btn').addEventListener('click', () => this.showDifficultySelection());
        document.querySelector('#mute-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const muted = this.audio.toggleMute();
            document.querySelector('#mute-icon').textContent = muted ? '×' : '◖';
        });
        this.startScreen.querySelectorAll('.difficulty-card').forEach((card, index) => {
            card.addEventListener('click', () => this.setDifficultySelection(index));
            card.addEventListener('dblclick', () => this.confirmDifficulty(card.dataset.difficulty));
        });
        this.startScreen.querySelector('#difficulty-confirm').addEventListener('click', () => this.confirmDifficulty());
    }

    startGame() {
        this.showDifficultySelection();
    }

    showDifficultySelection() {
        if (this.state !== GameState.START) return;
        this.audio.init();
        this.audio.play('uiClick');
        this.input.clear();
        this.state = GameState.DIFFICULTY;
        this.startScreen.querySelector('[data-entry-panel="attract"]').classList.add('hidden');
        this.startScreen.querySelector('[data-entry-panel="difficulty"]').classList.remove('hidden');
        this.selectedDifficultyIndex = Math.max(0, this.difficultyOrder.indexOf(this.difficulty));
        this.setDifficultySelection(this.selectedDifficultyIndex, false);
    }

    setDifficultySelection(index, playSound = true) {
        if (this.state !== GameState.DIFFICULTY) return;
        const count = this.difficultyOrder.length;
        this.selectedDifficultyIndex = (index + count) % count;
        const selectedId = this.difficultyOrder[this.selectedDifficultyIndex];
        this.startScreen.querySelectorAll('.difficulty-card').forEach(card => {
            const selected = card.dataset.difficulty === selectedId;
            card.classList.toggle('is-selected', selected);
            card.setAttribute('aria-selected', String(selected));
        });
        if (playSound) this.audio.play('uiMove');
    }

    confirmDifficulty(difficultyId = this.difficultyOrder[this.selectedDifficultyIndex]) {
        if (this.state !== GameState.DIFFICULTY || !DIFFICULTIES[difficultyId]) return;
        this.difficulty = difficultyId;
        this.selectedDifficultyIndex = this.difficultyOrder.indexOf(difficultyId);
        this.audio.play('uiClick');
        this.input.clear();
        this.resetCampaignState();
        this.transitionAlpha = 0;
        const departingScreen = this.startScreen;
        departingScreen?.classList.add('is-exiting');
        window.setTimeout(() => {
            departingScreen?.remove();
            if (this.startScreen === departingScreen) this.startScreen = null;
        }, 180);
        this.showLevelIntro(1);
    }

    handleMenuInput(key) {
        if (this.state === GameState.START && (key === 'enter' || key === ' ')) {
            this.showDifficultySelection();
            return;
        }

        if (this.state === GameState.DIFFICULTY) {
            if (key === 'arrowleft') this.setDifficultySelection(this.selectedDifficultyIndex - 1);
            else if (key === 'arrowright' || key === 'd') this.setDifficultySelection(this.selectedDifficultyIndex + 1);
            else if (['a', 'b', 'c'].includes(key)) this.confirmDifficulty(this.difficultyOrder['abc'.indexOf(key)]);
            else if (key === 'enter' || key === ' ') this.confirmDifficulty();
            return;
        }

        if (this.state === GameState.LEVEL_INTRO && (key === 'enter' || key === ' ')) {
            this.finishLevelIntro();
            return;
        }

        if ((this.state === GameState.VICTORY || this.state === GameState.GAME_OVER) &&
            (key === 'enter' || key === ' ')) {
            this.restartGame();
        }
    }

    showLevelIntro(levelNumber) {
        window.clearTimeout(this.levelIntroTimer);
        document.querySelector('#level-intro')?.remove();
        this.introLevelNumber = levelNumber;
        this.state = GameState.LEVEL_INTRO;
        this.input.clear();

        const data = LevelData.getLevel(levelNumber);
        const intro = document.createElement('div');
        intro.id = 'level-intro';
        intro.innerHTML = `
            <div class="level-intro-content">
                <div class="level-intro-mark" aria-hidden="true"><span>${levelNumber}</span></div>
                <p>NIVEL ${levelNumber} / ${LevelData.getLevelCount()}</p>
                <h2>${data.name}</h2>
                <div class="level-intro-line"></div>
                <small>ENTER PARA CONTINUAR</small>
            </div>
        `;
        document.querySelector('.game-shell').appendChild(intro);
        requestAnimationFrame(() => intro.classList.add('is-visible'));
        this.levelIntroTimer = window.setTimeout(() => this.finishLevelIntro(), 1350);
    }

    finishLevelIntro() {
        if (this.state !== GameState.LEVEL_INTRO) return;
        window.clearTimeout(this.levelIntroTimer);
        const levelNumber = this.introLevelNumber;
        document.querySelector('#level-intro')?.remove();
        this.loadLevel(levelNumber);
        this.introLevelNumber = null;
        this.state = GameState.PLAYING;
        this.input.clear();
    }

    loadLevel(levelNum) {
        this.levelNumber = levelNum;
        this.level = LevelData.getLevel(levelNum);
        this.activeDoor = null;
        this.entities = [];
        this.particles = [];

        const playerStart = this.level.playerStart;
        this.player = new Player(playerStart.x, playerStart.y);
        this.entities.push(this.player);

        this.doors = this.level.doors.map(doorData => {
            const door = new MathDoor(doorData.x, doorData.y, doorData.challengeRef);
            door.levelDoorId = doorData.id;
            this.entities.push(door);
            return door;
        });
        this.door = this.doors[0];

        this.goal = new Goal(this.level.goal.x, this.level.goal.y);
        this.entities.push(this.goal);

        this.decorations = LevelData.generateDecorations(this.level);
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        this.hud.reset(this.score, this.lives, this.maxLives, this.levelNumber);
    }

    handleChallengeResult(correct) {
        if (correct) {
            this.score += 100;
            this.camera.shake = 0.3;
            this.camera.shakeIntensity = 8;
            this.spawnParticles(this.activeDoor.x + 30, this.activeDoor.y + 30, '#37c4ff', 20);
            this.activeDoor.unlock();
            this.audio.play('doorUnlock');
        } else {
            this.lives = Math.max(0, this.lives - 1);
            this.camera.shake = 0.2;
            this.camera.shakeIntensity = 5;
            this.spawnParticles(this.player.x, this.player.y, '#ff4444', 10);
            this.audio.play('incorrect');
        }
        this.hud.update(this.score, this.lives, this.maxLives);
        if (!correct && this.lives === 0) {
            this.triggerGameOver();
        }
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
            const collisionInfo = this.collision.resolve(this.player, this.level, this.doors, dt);

            // Hit pause on wall collision for game feel
            if (collisionInfo.hitWall && (this.player.vx !== 0 || this.player.vy !== 0)) {
                this.hitPauseTimer = 0.05; // 50ms hit pause
                this.camera.shake = 0.15;
                this.camera.shakeIntensity = 4;
                this.audio.play('doorHit');
            }
            
            // Door collision feedback - only freeze world on LOCKED door.
            // During UNLOCKING the door must keep opening (hitPause would stall it).
            if (collisionInfo.hitDoor && collisionInfo.door?.state !== 'unlocking') {
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
        } else if (this.state === GameState.VICTORY || this.state === GameState.GAME_OVER) {
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
        const renderWorld = this.level && (
            this.state === GameState.PLAYING ||
            this.state === GameState.CHALLENGE ||
            this.state === GameState.VICTORY ||
            this.state === GameState.GAME_OVER
        );

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
            if (this.completedLevel) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 30px "JetBrains Mono", monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`NIVEL ${this.completedLevel} COMPLETADO`, this.canvas.width / 2, 245);
                this.ctx.fillStyle = '#37c4ff';
                this.ctx.font = '16px "JetBrains Mono", monospace';
                this.ctx.fillText('SIGUIENTE DESTINO...', this.canvas.width / 2, 285);
            }
        }
    }

    restartGame() {
        window.clearTimeout(this.levelIntroTimer);
        window.clearTimeout(this.levelTransitionTimer);
        document.querySelector('#level-intro')?.remove();
        document.querySelector('#start-screen')?.remove();
        this.state = GameState.START;
        this.level = null;
        this.entities = [];
        this.particles = [];
        this.resetCampaignState();
        this.transitionAlpha = 0;
        this.transitionDirection = 0;
        this.introLevelNumber = null;
        this.input.clear();
        this.hud.reset(this.score, this.lives, this.maxLives, this.levelNumber);
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

    triggerChallenge(challengeRef, door) {
        this.activeDoor = door;
        this.state = GameState.CHALLENGE;
        this.audio.play('doorCharge');
        this.mathChallenge.open(this.levelNumber, this.difficulty, challengeRef, (correct) => {
            this.handleChallengeResult(correct);
            if (this.state !== GameState.GAME_OVER) {
                this.state = GameState.PLAYING;
            }
        });
    }

    triggerGameOver() {
        this.state = GameState.GAME_OVER;
        this.hud.showGameOver(this.score);
    }

    triggerVictory() {
        if (this.levelNumber < LevelData.getLevelCount()) {
            this.triggerLevelTransition();
            return;
        }
        this.state = GameState.VICTORY;
        this.spawnParticles(this.goal.x, this.goal.y, '#37c4ff', 40);
        this.spawnParticles(this.goal.x, this.goal.y, '#ffd700', 20);
        this.audio.play('victory');
        this.hud.showVictory(this.score, this.lives, () => this.restartGame());
    }

    triggerLevelTransition() {
        this.completedLevel = this.levelNumber;
        this.state = GameState.TRANSITION;
        this.transitionAlpha = 0.92;
        this.transitionDirection = 0;
        window.clearTimeout(this.levelTransitionTimer);
        this.levelTransitionTimer = window.setTimeout(() => {
            if (this.state !== GameState.TRANSITION) return;
            const nextLevel = this.completedLevel + 1;
            this.completedLevel = null;
            this.transitionAlpha = 0;
            this.showLevelIntro(nextLevel);
        }, 560);
    }

    resetCampaignState() {
        this.levelNumber = 1;
        this.score = 0;
        this.lives = this.maxLives;
        this.activeDoor = null;
        this.completedLevel = null;
        this.mathChallenge.reset();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
