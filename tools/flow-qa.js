const { chromium } = require('playwright');

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
        await page.click('#start-btn');
        await sleep(1600);

        // 1. start -> playing
        const st0 = await page.evaluate(() => window.game.state);
        assert(st0 === 'playing', '1. expected playing, got ' + st0);
        console.log('1. start -> playing: PASS');

        // 2. teleport LEFT of gate, outside interaction trigger
        await page.evaluate(() => { window.game.player.x = 540; window.game.player.y = 230; });
        await sleep(300);
        const xBefore = await page.evaluate(() => window.game.player.x);

        // 2b. attempt horizontal movement through CLOSED gate
        await hold(page, 'ArrowRight', 1200);
        await sleep(200);
        const xAfter = await page.evaluate(() => window.game.player.x);
        const doorStateClosed = await page.evaluate(() => window.game.door.state);
        const doorBlockingClosed = await page.evaluate(() => window.game.door.isBlocking());
        assert(xAfter < 660, '2. player crossed closed gate (x=' + xAfter + ', before=' + xBefore + ')');
        assert(doorStateClosed === 'locked', '2. expected locked, got ' + doorStateClosed);
        assert(doorBlockingClosed === true, '2. expected isBlocking()===true, got ' + doorBlockingClosed);
        console.log('2. closed gate physically blocks crossing: PASS (x=' + xBefore + ' -> ' + xAfter + ')');

        // 3. teleport into interaction range
        await page.evaluate(() => { window.game.player.x = 624; window.game.player.y = 230; });
        await sleep(300);

        // 3b. press ArrowUp -> challenge opens
        await page.keyboard.press('ArrowUp');
        await sleep(400);
        const stChallenge = await page.evaluate(() => window.game.state);
        assert(stChallenge === 'challenge', '3. expected challenge, got ' + stChallenge);
        console.log('3. challenge opens: PASS');

        // 4. press A -> wrong answer
        await hold(page, 'a', 80);
        await sleep(1300);
        const wrong = await page.evaluate(() => ({
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(wrong.lives === 2, '4. expected lives=2, got ' + wrong.lives);
        assert(wrong.score === 0, '4. expected score=0, got ' + wrong.score);
        assert(wrong.doorState === 'locked', '4. expected door locked, got ' + wrong.doorState);
        assert(wrong.blocking === true, '4. expected blocking=true, got ' + wrong.blocking);
        console.log('4. wrong answer: lives=2 score=0 door=locked blocking=true: PASS');

        // 5. retry -> challenge opens again
        await page.keyboard.press('ArrowUp');
        await sleep(400);
        const stRetry = await page.evaluate(() => window.game.state);
        assert(stRetry === 'challenge', '5. expected challenge, got ' + stRetry);
        console.log('5. retry challenge opens: PASS');

        // 6. press B -> correct answer
        await hold(page, 'b', 80);
        await sleep(2600);
        const correct = await page.evaluate(() => ({
            score: window.game.score,
            doorState: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(correct.score === 100, '6. expected score=100, got ' + correct.score);
        assert(correct.doorState === 'open', '6. expected door open, got ' + correct.doorState);
        assert(correct.blocking === false, '6. expected blocking=false, got ' + correct.blocking);
        console.log('6. correct answer: score=100 door=open blocking=false: PASS');

        // 7. move horizontally through open gate -> assert crossed boundary
        await page.evaluate(() => { window.game.player.x = 632; window.game.player.y = 230; });
        await sleep(200);
        await hold(page, 'ArrowRight', 1500);
        await sleep(200);
        const xCross = await page.evaluate(() => window.game.player.x);
        assert(xCross > 720, '7. player did not cross door (x=' + xCross + ')');
        console.log('7. player crossed open gate: PASS (x=' + xCross + ')');

        // 8. move to goal -> activate + victory
        await hold(page, 'ArrowRight', 700);
        await sleep(100);
        await hold(page, 'ArrowDown', 1200);
        await sleep(100);
        await hold(page, 'ArrowRight', 500);
        await sleep(700);
        const vic = await page.evaluate(() => ({
            activated: window.game.goal.activated,
            state: window.game.state
        }));
        assert(vic.activated === true, '8. goal not activated');
        assert(vic.state === 'victory', '8. expected victory, got ' + vic.state);
        console.log('8. goal activated + victory: PASS');

        // 9. JUGAR DE NUEVO (restart via canvas click) -> start
        await clickCanvasRect(page, 'victoryButtonRect');
        await sleep(700);
        const stStart = await page.evaluate(() => window.game.state);
        assert(stStart === 'start', '9. expected start, got ' + stStart);
        console.log('9. JUGAR DE NUEVO -> start: PASS');

        // 10. click start -> CLEAN RESET before answering anything
        await page.click('#start-btn');
        await sleep(1600);
        const clean = await page.evaluate(() => ({
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(clean.lives === 3, '10. expected lives=3, got ' + clean.lives);
        assert(clean.score === 0, '10. expected score=0, got ' + clean.score);
        assert(clean.doorState === 'locked', '10. expected door locked, got ' + clean.doorState);
        assert(clean.blocking === true, '10. expected blocking=true, got ' + clean.blocking);
        console.log('10. clean reset: lives=3 score=0 door=locked: PASS');

        // 11. three wrong answers -> game over; retries are blocked
        await page.evaluate(() => { window.game.player.x = 624; window.game.player.y = 230; });
        for (let attempt = 0; attempt < 3; attempt++) {
            await page.keyboard.press('ArrowUp');
            await sleep(350);
            assert(
                (await page.evaluate(() => window.game.state)) === 'challenge',
                `11. expected challenge on attempt ${attempt + 1}`
            );
            await hold(page, 'a', 80);
            await sleep(1100);
        }
        const gameOver = await page.evaluate(() => ({
            state: window.game.state,
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state
        }));
        assert(gameOver.state === 'game_over', '11. expected game_over, got ' + gameOver.state);
        assert(gameOver.lives === 0, '11. expected lives=0, got ' + gameOver.lives);
        assert(gameOver.score === 0, '11. expected score=0, got ' + gameOver.score);
        assert(gameOver.doorState === 'locked', '11. expected door locked, got ' + gameOver.doorState);
        await page.keyboard.press('ArrowUp');
        await sleep(200);
        assert((await page.evaluate(() => window.game.state)) === 'game_over', '11. retry escaped game over');
        console.log('11. zero lives -> game over and retries blocked: PASS');

        // 12. keyboard restart from game over -> clean game
        await page.keyboard.press('Enter');
        await sleep(700);
        assert((await page.evaluate(() => window.game.state)) === 'start', '12. game-over restart -> start');
        await page.click('#start-btn');
        await sleep(1600);
        const afterGameOver = await page.evaluate(() => ({
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(afterGameOver.lives === 3, '12. expected lives=3, got ' + afterGameOver.lives);
        assert(afterGameOver.score === 0, '12. expected score=0, got ' + afterGameOver.score);
        assert(afterGameOver.doorState === 'locked', '12. expected door locked, got ' + afterGameOver.doorState);
        assert(afterGameOver.blocking === true, '12. expected blocking=true');
        console.log('12. game-over keyboard restart is clean: PASS');

        // 13. finite player coordinates
        const fin = await page.evaluate(() => ({
            px: isFinite(window.game.player.x),
            py: isFinite(window.game.player.y)
        }));
        assert(fin.px && fin.py, '13. player coords not finite');
        console.log('13. finite player coordinates: PASS');

        // 14. zero console/page errors
        assert(errors.length === 0, '14. console errors: ' + JSON.stringify(errors));
        console.log('14. zero console/page errors: PASS');

        console.log('\n=== ALL FLOW ASSERTIONS PASSED ===');
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error('FLOW QA FAILED:', e.message);
    process.exit(1);
});
