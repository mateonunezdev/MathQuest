const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
const BRAVE_PATH = process.env.BRAVE_EXECUTABLE_PATH ||
    (fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined);
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function hold(page, key, ms) {
    await page.keyboard.down(key);
    await sleep(ms);
    await page.keyboard.up(key);
}

function assert(cond, msg) {
    if (!cond) throw new Error('ASSERTION FAILED: ' + msg);
}

async function sampleRuntime(page, scene) {
    const stats = await page.evaluate(() => new Promise(resolve => {
        const frames = [];
        const renderDurations = [];
        const game = window.game;
        const originalRender = game.render;
        game.render = function (...args) {
            const started = performance.now();
            originalRender.apply(this, args);
            renderDurations.push(performance.now() - started);
        };
        let previous = 0;
        const sample = now => {
            if (previous) frames.push(now - previous);
            previous = now;
            if (frames.length < 120) requestAnimationFrame(sample);
            else {
                game.render = originalRender;
                const ordered = [...frames].sort((a, b) => a - b);
                const mean = frames.reduce((sum, ms) => sum + ms, 0) / frames.length;
                renderDurations.sort((a, b) => a - b);
                resolve({ fps: Math.round(1000 / mean), meanMs: +mean.toFixed(1),
                    p95Ms: +ordered[Math.floor(ordered.length * 0.95)].toFixed(1),
                    renderP95Ms: +renderDurations[Math.floor(renderDurations.length * 0.95)].toFixed(1) });
            }
        };
        requestAnimationFrame(sample);
    }));
    console.log(`Runtime ${scene} (120 frames, headless Brave):`, JSON.stringify(stats));
}

async function clickCanvasRect(page, rectName) {
    const point = await page.evaluate((name) => {
        const canvas = document.querySelector('#game');
        const rect = canvas.getBoundingClientRect();
        const hitbox = window.game?.hud?.[name];
        if (!hitbox) throw new Error(`Missing HUD hitbox: ${name}`);
        return {
            x: rect.left + (hitbox.x + hitbox.w / 2) * rect.width / canvas.width,
            y: rect.top + (hitbox.y + hitbox.h / 2) * rect.height / canvas.height
        };
    }, rectName);
    await page.mouse.click(point.x, point.y);
}

async function solveCurrentLevel(page) {
    await page.evaluate(() => {
        const door = window.game.door;
        window.game.player.x = door.x - 36;
        window.game.player.y = door.y + 50;
    });
    await sleep(250);
    await page.keyboard.press('ArrowUp');
    await sleep(350);
    assert((await page.evaluate(() => window.game.state)) === 'challenge', 'challenge should open');
    const correct = await page.evaluate(() => window.game.mathChallenge.challengeData.correct);
    await hold(page, correct, 80);
    await page.waitForFunction(() => window.game.door.state === 'open');
    assert((await page.evaluate(() => window.game.door.state)) === 'open', 'door should open');
}

async function solveEncounter(page, name) {
    await page.evaluate(targetName => {
        const target = window.game.encounters[targetName];
        window.game.player.x = target.x + (targetName === 'boss' ? 80 : -18);
        window.game.player.y = target.y - 20;
    }, name);
    await sleep(100);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.game.state === 'challenge');
    const correct = await page.evaluate(() => window.game.mathChallenge.challengeData.correct);
    await hold(page, correct, 80);
    await page.waitForFunction(() => window.game.state === 'playing');
}

async function activateCurrentGoal(page) {
    await page.evaluate(() => {
        window.game.player.x = window.game.goal.x;
        window.game.player.y = window.game.goal.y;
    });
    await sleep(250);
}

async function continueIntoLevel(page, expectedLevel) {
    if ((await page.evaluate(() => window.game.state)) === 'transition') {
        await sleep(650);
    }
    if ((await page.evaluate(() => window.game.state)) === 'level_intro') {
        await page.keyboard.press('Enter');
        await sleep(350);
    }
    assert((await page.evaluate(() => window.game.levelNumber)) === expectedLevel,
        `campaign should advance to level ${expectedLevel}`);
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: BRAVE_PATH });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
    page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await sleep(800);
        const missingArt = await page.evaluate(() => [...window.game.artAssets.loadedImages]
            .filter(([, image]) => !image?.naturalWidth).map(([source]) => source));
        assert(missingArt.length === 0, 'professional art failed to load: ' + missingArt.join(', '));
        await page.waitForSelector('#start-btn', { state: 'visible', timeout: 10000 });

        await page.click('#start-btn');
        await sleep(250);
        assert((await page.evaluate(() => window.game.state)) === 'difficulty', 'start -> difficulty');

        await page.click('#difficulty-confirm');
        await sleep(220);
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'difficulty -> level intro');
        await page.keyboard.press('Enter');
        await sleep(350);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'level intro -> playing');
        const audioReady = await page.evaluate(() => {
            const audio = window.game.audio;
            const required = ['correct', 'incorrect', 'attackCharge', 'attackLaunch', 'bossHit',
                'bossPhase', 'bossDefeat', 'bossEntrance', 'powerActivate', 'doorUnlock',
                'portalUnlock', 'portalActivate', 'victory'];
            return audio.initialized && required.every(name => typeof audio.sounds[name] === 'function');
        });
        assert(audioReady, 'offline audio cues should be ready after fair entry');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase3-01-level1-start.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-01-level1-overview.png') });
        console.log('Screenshot: phase3-01-level1-start.png');

        // Normal gameplay (move right a bit)
        await hold(page, 'ArrowRight', 500);
        await page.evaluate(() => { window.game.player.x = 330; window.game.player.y = 270; });
        await sleep(180);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-01-level1-overview.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-01-level1.png') });
        await sampleRuntime(page, 'level 1');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase3-02-level1-exploration.png') });
        await page.evaluate(() => { window.game.player.x = 440; window.game.player.y = 300; });
        await sleep(120);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-02-player.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-02-player-gameplay.png') });
        await page.keyboard.down('ArrowRight');
        await sleep(140);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-02-player-moving.png') });
        await page.keyboard.up('ArrowRight');
        console.log('Screenshot: phase3-02-level1-exploration.png');

        // 4. Math explorer closeup (near door approach)
        await page.evaluate(() => { window.game.player.x = 540; window.game.player.y = 230; });
        await sleep(200);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase3-03-level1-door.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-03-gate.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-03-gate-locked.png') });
        console.log('Screenshot: phase3-03-level1-door.png');

        // 6. Challenge open (teleport into range, press ArrowUp)
        await page.evaluate(() => { window.game.player.x = 624; window.game.player.y = 230; });
        await sleep(200);
        await page.keyboard.press('ArrowUp');
        await sleep(400);
        assert((await page.evaluate(() => window.game.state)) === 'challenge', 'challenge should open');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-08-challenge.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-10-challenge-ui.png') });

        // 7. Incorrect answer (A)
        await hold(page, 'a', 80);
        await sleep(1300);
        const wrong = await page.evaluate(() => ({
            lives: window.game.lives, score: window.game.score, doorState: window.game.door.state
        }));
        assert(wrong.lives === 2, 'wrong -> lives=2, got ' + wrong.lives);
        assert(wrong.score === 0, 'wrong -> score=0, got ' + wrong.score);
        assert(wrong.doorState === 'locked', 'wrong -> door locked, got ' + wrong.doorState);

        // 8. Correct answer (B) - challenge again
        await page.keyboard.press('ArrowUp');
        await sleep(400);
        await hold(page, 'b', 80);
        await sleep(2600);
        const correct = await page.evaluate(() => ({
            score: window.game.score,
            doorState: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(correct.score === 125, 'correct -> score=125, got ' + correct.score);
        assert(correct.doorState === 'open', 'correct -> door open, got ' + correct.doorState);
        assert(correct.blocking === false, 'correct -> door stops blocking');
        await page.evaluate(() => { window.game.player.x = 540; window.game.player.y = 230; });
        await sleep(180);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-04-gate-open.png') });

        // 10. Door OPEN (player moved through)
        await page.evaluate(() => { window.game.player.x = 632; window.game.player.y = 230; });
        await sleep(200);
        await hold(page, 'ArrowRight', 1500);
        await sleep(200);
        const crossed = await page.evaluate(() => window.game.player.x);
        assert(crossed > 720, 'player should cross open gate, x=' + crossed);

        // Goal zone, captured before activation.
        await page.evaluate(() => { window.game.player.x = 785; window.game.player.y = 430; });
        await sleep(250);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase3-04-level1-goal.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-04-portal.png') });
        console.log('Screenshot: phase3-04-level1-goal.png');
        await activateCurrentGoal(page);

        // Complete levels 2 and 3 without adding extra visual captures.
        await continueIntoLevel(page, 2);
        const level2Start = await page.evaluate(() => ({ x: window.game.player.x, y: window.game.player.y }));
        assert(level2Start.x >= 180 && level2Start.y <= 400,
            `level 2 explorer should enter inside the observatory: ${JSON.stringify(level2Start)}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'level2-review.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-06-level2.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-04-level2.png') });
        await sampleRuntime(page, 'level 2');
        await solveCurrentLevel(page);
        await activateCurrentGoal(page);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'sentinel should block level 2 goal');
        await solveEncounter(page, 'sentinel');
        await activateCurrentGoal(page);
        await continueIntoLevel(page, 3);
        const arenaOverlap = await page.evaluate(() => {
            const game = window.game;
            const boss = game.encounters.boss;
            const portal = game.goal;
            const bossWidth = game.artAssets.get('boss', 'phase-1').width;
            const portalWidth = game.artAssets.get('portal', 'base').width;
            return Math.max(0, Math.min(boss.x + bossWidth / 2,
                portal.x + portal.width / 2 + portalWidth / 2) -
                Math.max(boss.x - bossWidth / 2,
                    portal.x + portal.width / 2 - portalWidth / 2));
        });
        assert(arenaOverlap <= 20, `boss and portal artwork overlap by ${arenaOverlap}px`);
        await solveCurrentLevel(page);
        await activateCurrentGoal(page);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'boss should block final goal');
        await page.evaluate(() => {
            const boss = window.game.encounters.boss;
            window.game.player.x = boss.x - 18;
            window.game.player.y = boss.y - 20;
        });
        await sleep(200);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-boss.png') });
        await page.evaluate(() => { window.game.player.x = 360; window.game.player.y = 380; });
        await sleep(120);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-06-boss-phase1.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-07-boss-phase1.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-05-boss-phase1.png') });
        await page.evaluate(() => {
            window.game.player.x = window.game.encounters.boss.x - 18;
            window.game.player.y = window.game.encounters.boss.y - 20;
        });
        await page.evaluate(() => { window.game.encounters.boss.clock = 6; });
        await page.waitForFunction(() => window.game.encounters.boss.state === 'telegraph');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-boss-telegraph.png') });
        await page.evaluate(() => {
            window.game.encounters.boss.state = 'guarding';
            window.game.encounters.boss.clock = 0;
        });
        for (let phase = 1; phase <= 3; phase++) {
            if (phase === 3) {
                await page.waitForFunction(() => !window.game.attackFx);
                await page.evaluate(() => { window.game.player.x = 360; window.game.player.y = 380; });
                await sleep(120);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-07-boss-phase3.png') });
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-08-boss-phase3.png') });
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-06-boss-phase3.png') });
                await sampleRuntime(page, 'boss phase 3');
            }
            const beforeHealth = await page.evaluate(() => window.game.encounters.boss.health);
            await solveEncounter(page, 'boss');
            const afterHealth = await page.evaluate(() => window.game.encounters.boss.health);
            assert(afterHealth === beforeHealth - 1, `boss phase ${phase} must lose one seal`);
            if (phase === 1) {
                await page.waitForFunction(() => window.game.attackFx?.life < 0.60 &&
                    window.game.attackFx.life > 0.42);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-07-math-attack.png') });
                await page.waitForFunction(() => window.game.phaseFx?.phase === 2);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-08-boss-hit.png') });
            } else if (phase === 2) {
                await page.waitForFunction(() => window.game.phaseFx?.phase === 3);
            }
            await page.waitForFunction(() => !window.game.attackFx);
        }
        const defeatPending = await page.evaluate(() => ({
            active: Boolean(window.game.bossDefeatFx), locked: window.game.goal.locked
        }));
        assert(defeatPending.active && defeatPending.locked,
            `boss defeat must finish before portal unlocks: ${JSON.stringify(defeatPending)}`);
        await page.waitForFunction(() => window.game.bossDefeatFx?.life < 0.55);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-09-boss-defeat.png') });
        await page.waitForFunction(() => !window.game.bossDefeatFx);
        await activateCurrentGoal(page);
        await sleep(500);

        // 12. Campaign victory
        const vic = await page.evaluate(() => ({
            activated: window.game.goal.activated,
            state: window.game.state,
            level: window.game.levelNumber,
            score: window.game.score
        }));
        assert(vic.activated === true, 'final goal should be activated');
        assert(vic.state === 'victory' && vic.level === 3, 'campaign should end in level 3 victory');
        assert(vic.score === 1032, 'campaign score should be 1032, got ' + vic.score);
        const finalStats = await page.evaluate(() => window.game.hud.finalStats);
        assert(finalStats?.accuracy === 88 && finalStats?.seconds > 0 &&
            finalStats?.difficulty === 'AVENTURERO',
            `victory should show campaign difficulty, measured 7/8 accuracy and time: ${JSON.stringify(finalStats)}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-10-final-victory.png') });

        // Clean reset check (canvas restart click then start again)
        await clickCanvasRect(page, 'victoryButtonRect');
        await sleep(700);
        assert((await page.evaluate(() => window.game.state)) === 'start', 'restart -> start');
        await page.click('#start-btn');
        await sleep(200);
        await page.click('#difficulty-confirm');
        await sleep(200);
        await page.keyboard.press('Enter');
        await sleep(350);
        const clean = await page.evaluate(() => ({
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(clean.lives === 3, 'clean reset -> lives=3, got ' + clean.lives);
        assert(clean.score === 0, 'clean reset -> score=0, got ' + clean.score);
        assert(clean.doorState === 'locked', 'clean reset -> door locked, got ' + clean.doorState);
        assert(clean.blocking === true, 'clean reset -> door blocking');
        assert((await page.evaluate(() => window.game.hud.finalStats)) === null,
            'replay should clear the previous result statistics');
        console.log('Clean reset: lives=3 score=0 door=locked: PASS');

        await solveEncounter(page, 'station');
        await page.evaluate(() => { window.game.player.x = 420; window.game.player.y = 285; });
        await sleep(380);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'premium-05-powerup.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'finalart-05-powerup.png') });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'polish-03-powerup.png') });

        for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await sleep(100);
            const layout = await page.evaluate(() => {
                const canvas = document.querySelector('#game').getBoundingClientRect();
                return { overflow: document.documentElement.scrollWidth - window.innerWidth,
                    canvasLeft: canvas.left, canvasRight: canvas.right };
            });
            assert(layout.overflow <= 1 && layout.canvasLeft >= -1 && layout.canvasRight <= width + 1,
                `viewport ${width} has horizontal overflow or clipped canvas: ${JSON.stringify(layout)}`);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `premium-${width}.png`) });
        }
        console.log('Responsive canvas containment (390/768/1440): PASS');

        // Console errors
        assert(errors.length === 0, 'console/page errors: ' + JSON.stringify(errors));
        fs.writeFileSync(path.join(SCREENSHOT_DIR, 'errors.txt'), errors.join('\n') || '(none)');
        console.log('Zero console/page errors: PASS');

        console.log('\n=== ALL BROWSER QA CHECKS PASSED ===');
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error('BROWSER QA FAILED:', e.message);
    process.exit(1);
});
