const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
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
    await hold(page, 'b', 80);
    await sleep(2600);
    assert((await page.evaluate(() => window.game.door.state)) === 'open', 'door should open');
}

async function activateCurrentGoal(page) {
    await page.evaluate(() => {
        window.game.player.x = window.game.goal.x;
        window.game.player.y = window.game.goal.y;
    });
    await sleep(250);
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
    page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await sleep(800);
        await page.waitForSelector('#start-btn', { state: 'visible', timeout: 10000 });

        // 1. Start screen
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-start-screen.png') });
        console.log('Screenshot: 01-start-screen.png');

        await page.click('#start-btn');
        await sleep(1600);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'start -> playing');

        // 2. Start zone
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-start-zone.png') });
        console.log('Screenshot: 02-start-zone.png');

        // 3. Normal gameplay (move right a bit)
        await hold(page, 'ArrowRight', 500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-gameplay-normal.png') });
        console.log('Screenshot: 03-gameplay-normal.png');

        // 4. Math explorer closeup (near door approach)
        await page.evaluate(() => { window.game.player.x = 540; window.game.player.y = 230; });
        await sleep(200);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-math-explorer.png') });
        console.log('Screenshot: 04-math-explorer.png');

        // 5. Door LOCKED (before challenge)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-door-locked.png') });
        console.log('Screenshot: 05-door-locked.png');

        // 6. Challenge open (teleport into range, press ArrowUp)
        await page.evaluate(() => { window.game.player.x = 624; window.game.player.y = 230; });
        await sleep(200);
        await page.keyboard.press('ArrowUp');
        await sleep(400);
        assert((await page.evaluate(() => window.game.state)) === 'challenge', 'challenge should open');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-challenge.png') });
        console.log('Screenshot: 06-challenge.png');

        // 7. Incorrect answer (A)
        await hold(page, 'a', 80);
        await sleep(1300);
        const wrong = await page.evaluate(() => ({
            lives: window.game.lives, score: window.game.score, doorState: window.game.door.state
        }));
        assert(wrong.lives === 2, 'wrong -> lives=2, got ' + wrong.lives);
        assert(wrong.score === 0, 'wrong -> score=0, got ' + wrong.score);
        assert(wrong.doorState === 'locked', 'wrong -> door locked, got ' + wrong.doorState);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-incorrect.png') });
        console.log('Screenshot: 07-incorrect.png');

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
        assert(correct.score === 100, 'correct -> score=100, got ' + correct.score);
        assert(correct.doorState === 'open', 'correct -> door open, got ' + correct.doorState);
        assert(correct.blocking === false, 'correct -> door stops blocking');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-correct.png') });
        console.log('Screenshot: 08-correct.png');

        // 9. Unlocking / open transition already captured; capture post-open state
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-unlocking.png') });
        console.log('Screenshot: 09-unlocking.png');

        // 10. Door OPEN (player moved through)
        await page.evaluate(() => { window.game.player.x = 632; window.game.player.y = 230; });
        await sleep(200);
        await hold(page, 'ArrowRight', 1500);
        await sleep(200);
        const crossed = await page.evaluate(() => window.game.player.x);
        assert(crossed > 720, 'player should cross open gate, x=' + crossed);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-door-open.png') });
        console.log('Screenshot: 10-door-open.png');

        // 11. Goal zone
        await hold(page, 'ArrowRight', 700);
        await hold(page, 'ArrowDown', 1200);
        await hold(page, 'ArrowRight', 500);
        await sleep(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-goal-zone.png') });
        console.log('Screenshot: 11-goal-zone.png');

        // Complete levels 2 and 3 without adding extra visual captures.
        await sleep(1400);
        assert((await page.evaluate(() => window.game.levelNumber)) === 2, 'level 1 should advance to level 2');
        await solveCurrentLevel(page);
        await activateCurrentGoal(page);
        await sleep(1400);
        assert((await page.evaluate(() => window.game.levelNumber)) === 3, 'level 2 should advance to level 3');
        await solveCurrentLevel(page);
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
        assert(vic.score === 300, 'campaign score should be 300, got ' + vic.score);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-victory.png') });
        console.log('Screenshot: 12-victory.png');

        // Clean reset check (canvas restart click then start again)
        await clickCanvasRect(page, 'victoryButtonRect');
        await sleep(700);
        assert((await page.evaluate(() => window.game.state)) === 'start', 'restart -> start');
        await page.click('#start-btn');
        await sleep(1600);
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
        console.log('Clean reset: lives=3 score=0 door=locked: PASS');

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
