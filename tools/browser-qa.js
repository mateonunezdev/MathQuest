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
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
    page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await sleep(800);
        await page.waitForSelector('#start-btn', { state: 'visible', timeout: 10000 });

        // Responsive attract-screen evidence, then restore the gameplay viewport.
        await page.setViewportSize({ width: 390, height: 740 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-start-mobile.png') });
        await page.setViewportSize({ width: 768, height: 700 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-start-tablet.png') });
        await page.setViewportSize({ width: 1100, height: 700 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-start-screen.png') });
        console.log('Screenshots: responsive attract screen');

        await page.click('#start-btn');
        await sleep(250);
        assert((await page.evaluate(() => window.game.state)) === 'difficulty', 'start -> difficulty');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-difficulty.png') });
        console.log('Screenshot: 04-difficulty.png');

        await page.click('#difficulty-confirm');
        await sleep(220);
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'difficulty -> level intro');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-level-intro.png') });
        console.log('Screenshot: 05-level-intro.png');
        await page.keyboard.press('Enter');
        await sleep(350);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'level intro -> playing');

        // Normal gameplay (move right a bit)
        await hold(page, 'ArrowRight', 500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-gameplay-normal.png') });
        console.log('Screenshot: 06-gameplay-normal.png');

        // 4. Math explorer closeup (near door approach)
        await page.evaluate(() => { window.game.player.x = 540; window.game.player.y = 230; });
        await sleep(200);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-math-explorer.png') });
        console.log('Screenshot: 07-math-explorer.png');

        // 5. Door LOCKED (before challenge)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-door-locked.png') });
        console.log('Screenshot: 08-door-locked.png');

        // 6. Challenge open (teleport into range, press ArrowUp)
        await page.evaluate(() => { window.game.player.x = 624; window.game.player.y = 230; });
        await sleep(200);
        await page.keyboard.press('ArrowUp');
        await sleep(400);
        assert((await page.evaluate(() => window.game.state)) === 'challenge', 'challenge should open');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-challenge.png') });
        console.log('Screenshot: 09-challenge.png');

        // 7. Incorrect answer (A)
        await hold(page, 'a', 80);
        await sleep(1300);
        const wrong = await page.evaluate(() => ({
            lives: window.game.lives, score: window.game.score, doorState: window.game.door.state
        }));
        assert(wrong.lives === 2, 'wrong -> lives=2, got ' + wrong.lives);
        assert(wrong.score === 0, 'wrong -> score=0, got ' + wrong.score);
        assert(wrong.doorState === 'locked', 'wrong -> door locked, got ' + wrong.doorState);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-incorrect.png') });
        console.log('Screenshot: 10-incorrect.png');

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
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-correct.png') });
        console.log('Screenshot: 11-correct.png');

        // 10. Door OPEN (player moved through)
        await page.evaluate(() => { window.game.player.x = 632; window.game.player.y = 230; });
        await sleep(200);
        await hold(page, 'ArrowRight', 1500);
        await sleep(200);
        const crossed = await page.evaluate(() => window.game.player.x);
        assert(crossed > 720, 'player should cross open gate, x=' + crossed);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-door-open.png') });
        console.log('Screenshot: 12-door-open.png');

        // 11. Goal zone
        await hold(page, 'ArrowRight', 700);
        await hold(page, 'ArrowDown', 1200);
        await hold(page, 'ArrowRight', 500);
        await sleep(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-goal-zone.png') });
        console.log('Screenshot: 13-goal-zone.png');

        // Complete levels 2 and 3 without adding extra visual captures.
        await continueIntoLevel(page, 2);
        await solveCurrentLevel(page);
        await activateCurrentGoal(page);
        await continueIntoLevel(page, 3);
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
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-victory.png') });
        console.log('Screenshot: 14-victory.png');

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
