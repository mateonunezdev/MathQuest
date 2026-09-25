const { chromium } = require('playwright');
const fs = require('fs');
const BRAVE_PATH = process.env.BRAVE_EXECUTABLE_PATH ||
    (fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined);

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function hold(page, key, ms) {
    await page.keyboard.down(key);
    await sleep(ms);
    await page.keyboard.up(key);
}

function assert(condition, message) {
    if (!condition) throw new Error('ASSERTION FAILED: ' + message);
}

async function clickCanvasRect(page, rectName) {
    const point = await page.evaluate((name) => {
        const canvas = document.querySelector('#game');
        const canvasRect = canvas.getBoundingClientRect();
        const hitbox = window.game?.hud?.[name];
        if (!hitbox) throw new Error(`Missing HUD hitbox: ${name}`);
        return {
            x: canvasRect.left + (hitbox.x + hitbox.w / 2) * canvasRect.width / canvas.width,
            y: canvasRect.top + (hitbox.y + hitbox.h / 2) * canvasRect.height / canvas.height
        };
    }, rectName);
    await page.mouse.click(point.x, point.y);
}

async function openChallenge(page) {
    await page.evaluate(() => {
        const door = window.game.door;
        window.game.player.x = door.x - 36;
        window.game.player.y = door.y + 50;
    });
    await sleep(250);
    await page.keyboard.press('ArrowUp');
    await sleep(350);
    assert((await page.evaluate(() => window.game.state)) === 'challenge', 'challenge did not open');
}

async function answer(page, choice) {
    const letter = await page.evaluate(kind => {
        const correct = window.game.mathChallenge.challengeData.correct;
        return kind === 'correct' ? correct : ['A', 'B', 'C'].find(key => key !== correct);
    }, choice);
    await hold(page, letter, 80);
    await page.waitForFunction(() => window.game.state === 'playing' || window.game.state === 'game_over');
    await sleep(120);
}

async function solveEncounter(page, targetName) {
    await page.evaluate(name => {
        const target = window.game.encounters[name];
        window.game.player.x = target.x - 18;
        window.game.player.y = target.y - 20;
    }, targetName);
    await sleep(80);
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.game.state === 'challenge');
    await answer(page, 'correct');
}

async function reachGoal(page) {
    await page.evaluate(() => {
        window.game.player.x = window.game.goal.x;
        window.game.player.y = window.game.goal.y;
    });
    await sleep(250);
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: BRAVE_PATH });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('console', message => {
        if (message.type() === 'error') errors.push('[console.error] ' + message.text());
    });
    page.on('pageerror', error => errors.push('[pageerror] ' + error.message));

    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page.waitForSelector('#start-btn', { state: 'visible', timeout: 10000 });
        assert((await page.evaluate(() => window.game.state)) === 'start', 'game did not open in attract state');
        assert((await page.locator('#start-screen').count()) === 1, 'start screen duplicated on boot');
        await page.keyboard.press('Enter');
        await sleep(250);
        assert((await page.evaluate(() => window.game.state)) === 'difficulty', 'START did not open difficulty selection');
        assert((await page.locator('.difficulty-card').count()) === 3, 'difficulty selector must show three choices');

        await page.keyboard.press('ArrowLeft');
        await sleep(100);
        assert((await page.locator('.difficulty-card.is-selected').getAttribute('data-difficulty')) === 'explorador', 'left did not select explorador');
        await page.keyboard.press('ArrowRight');
        await sleep(100);
        assert((await page.locator('.difficulty-card.is-selected').getAttribute('data-difficulty')) === 'aventurero', 'right did not select aventurero');
        await page.keyboard.press('c');
        await sleep(250);
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'direct C did not confirm maestro');
        assert((await page.locator('#level-intro').textContent()).includes('TEMPLO DE LOS NÚMEROS'), 'level 1 intro is missing');
        await page.keyboard.press('Enter');
        await sleep(350);

        const initial = await page.evaluate(() => ({
            state: window.game.state,
            level: window.game.levelNumber,
            difficulty: window.game.difficulty,
            lives: window.game.lives,
            score: window.game.score
        }));
        assert(initial.state === 'playing', 'campaign did not start');
        assert(initial.level === 1, 'campaign did not start at level 1');
        assert(initial.difficulty === 'maestro', 'direct C selection did not reach gameplay');
        assert(initial.lives === 3 && initial.score === 0, 'campaign initial state is dirty');
        console.log('1. attract -> selector -> level intro -> campaign: PASS');

        // Level 1 closed door physically blocks crossing.
        await page.evaluate(() => { window.game.player.x = 540; window.game.player.y = 230; });
        const xBefore = await page.evaluate(() => window.game.player.x);
        await hold(page, 'ArrowRight', 1200);
        const closed = await page.evaluate(() => ({
            x: window.game.player.x,
            state: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(closed.x < 660 && closed.x >= xBefore, 'player crossed the closed level 1 door');
        assert(closed.state === 'locked' && closed.blocking === true, 'closed door state is invalid');
        console.log('2. closed door blocks progression: PASS');

        // Wrong then correct on level 1.
        await openChallenge(page);
        await answer(page, 'wrong');
        const wrong = await page.evaluate(() => ({
            lives: window.game.lives,
            score: window.game.score,
            state: window.game.door.state
        }));
        assert(wrong.lives === 2 && wrong.score === 0 && wrong.state === 'locked', 'wrong answer state is invalid');
        await solveEncounter(page, 'station');
        assert((await page.evaluate(() => window.game.encounters.shield)) === 1, 'level 1 shield not granted');
        await openChallenge(page);
        await answer(page, 'correct');
        await page.waitForFunction(() => window.game.door.state === 'open');
        const level1Solved = await page.evaluate(() => ({
            score: window.game.score,
            state: window.game.door.state,
            blocking: window.game.door.isBlocking()
        }));
        assert(level1Solved.score === 210, 'level 1 rewards were not awarded');
        assert(level1Solved.state === 'open' && level1Solved.blocking === false, 'level 1 door did not open');
        console.log('3. level 1 challenge and door: PASS');

        await reachGoal(page);
        await sleep(750);
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'level 2 intro did not appear');
        assert((await page.locator('#level-intro').textContent()).includes('OBSERVATORIO DE LAS PROPORCIONES'), 'level 2 title is missing');
        await page.keyboard.press('Enter');
        await sleep(350);
        const level2 = await page.evaluate(() => ({
            state: window.game.state,
            level: window.game.levelNumber,
            difficulty: window.game.difficulty,
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state
        }));
        assert(level2.state === 'playing' && level2.level === 2, 'level 1 did not advance to level 2');
        assert(level2.difficulty === 'maestro', 'difficulty did not persist to level 2');
        assert(level2.lives === 2 && level2.score === 210, 'campaign state reset at level 2');
        assert(level2.doorState === 'locked', 'level 2 door did not start locked');
        console.log('4. level 1 -> level 2 preserves campaign state: PASS');

        await solveEncounter(page, 'station');
        assert((await page.evaluate(() => window.game.encounters.pulse)) === 1, 'level 2 pulse not granted');
        await openChallenge(page);
        await answer(page, 'correct');
        await page.waitForFunction(() => window.game.door.state === 'open');
        await reachGoal(page);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'sentinel did not block goal');
        await solveEncounter(page, 'sentinel');
        await reachGoal(page);
        await sleep(750);
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'level 3 intro did not appear');
        assert((await page.locator('#level-intro').textContent()).includes('NÚCLEO DE LA LÓGICA'), 'level 3 title is missing');
        await page.keyboard.press('Enter');
        await sleep(350);
        const level3 = await page.evaluate(() => ({
            state: window.game.state,
            level: window.game.levelNumber,
            difficulty: window.game.difficulty,
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state
        }));
        assert(level3.state === 'playing' && level3.level === 3, 'level 2 did not advance to level 3');
        assert(level3.difficulty === 'maestro', 'difficulty did not persist to level 3');
        assert(level3.lives === 2 && level3.score === 533, 'campaign state reset at level 3');
        assert(level3.doorState === 'locked', 'level 3 door did not start locked');
        console.log('5. level 2 -> level 3 preserves campaign state: PASS');

        await solveEncounter(page, 'station');
        assert((await page.evaluate(() => window.game.lives)) === 3, 'level 3 heal did not restore one life');
        await openChallenge(page);
        await answer(page, 'correct');
        await page.waitForFunction(() => window.game.door.state === 'open');
        await reachGoal(page);
        assert((await page.evaluate(() => window.game.state)) === 'playing', 'boss did not block final goal');
        for (let phase = 1; phase <= 3; phase++) {
            if (phase > 1) await page.waitForFunction(() => !window.game.attackFx);
            await solveEncounter(page, 'boss');
            assert((await page.evaluate(() => window.game.encounters.boss.health)) === 3 - phase,
                `boss phase ${phase} did not resolve`);
        }
        await page.waitForFunction(() => !window.game.bossDefeatFx);
        await reachGoal(page);
        await sleep(500);
        const victory = await page.evaluate(() => ({
            state: window.game.state,
            level: window.game.levelNumber,
            difficulty: window.game.difficulty,
            lives: window.game.lives,
            score: window.game.score
        }));
        assert(victory.state === 'victory' && victory.level === 3, 'level 3 did not trigger campaign victory');
        assert(victory.difficulty === 'maestro', 'difficulty changed before victory');
        assert(victory.lives === 3 && victory.score === 1419, 'final campaign state is invalid');
        console.log('6. level 3 -> campaign victory: PASS');

        await clickCanvasRect(page, 'victoryButtonRect');
        await sleep(700);
        assert((await page.locator('#start-screen').count()) === 1, 'restart duplicated the start screen');
        await page.keyboard.press('Enter');
        await sleep(200);
        assert((await page.evaluate(() => window.game.state)) === 'difficulty', 'restart did not return through selector');
        await page.keyboard.press('b');
        await sleep(200);
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'direct B did not confirm aventurero');
        await page.keyboard.press('Enter');
        await sleep(350);
        const restarted = await page.evaluate(() => ({
            state: window.game.state,
            level: window.game.levelNumber,
            difficulty: window.game.difficulty,
            lives: window.game.lives,
            score: window.game.score,
            doorState: window.game.door.state,
            challengeActive: window.game.mathChallenge.active
        }));
        assert(restarted.state === 'playing' && restarted.level === 1, 'campaign restart did not return to level 1');
        assert(restarted.difficulty === 'aventurero', 'campaign restart lost selected difficulty');
        assert(restarted.lives === 3 && restarted.score === 0, 'campaign restart is not clean');
        assert(restarted.doorState === 'locked' && restarted.challengeActive === false, 'restart left runtime state dirty');
        console.log('7. campaign restart is clean: PASS');

        // Three wrong answers still produce game over; keyboard restart remains available.
        for (let attempt = 0; attempt < 3; attempt++) {
            await openChallenge(page);
            await answer(page, 'wrong');
        }
        const gameOver = await page.evaluate(() => ({
            state: window.game.state,
            lives: window.game.lives,
            level: window.game.levelNumber
        }));
        assert(gameOver.state === 'game_over' && gameOver.lives === 0, 'zero lives did not trigger game over');
        assert(gameOver.level === 1, 'game over changed campaign level');
        await page.keyboard.press('Enter');
        await sleep(700);
        assert((await page.evaluate(() => window.game.state)) === 'start', 'keyboard restart failed after game over');
        assert((await page.locator('#start-screen').count()) === 1, 'game over restart duplicated start screen');
        await page.keyboard.press('Enter');
        await sleep(200);
        await page.keyboard.press('a');
        await sleep(200);
        assert((await page.evaluate(() => ({ state: window.game.state, difficulty: window.game.difficulty }))).difficulty === 'explorador', 'direct A did not confirm explorador');
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'explorador did not reach level intro');
        console.log('8. restart flow and all direct difficulty keys: PASS');

        assert(errors.length === 0, 'console/page errors: ' + JSON.stringify(errors));
        console.log('9. zero console/page errors: PASS');
        console.log('\n=== FAIR EDITION FLOW PASSED ===');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error('FLOW QA FAILED:', error.message);
    process.exit(1);
});
