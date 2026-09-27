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
        await page.waitForFunction(() => window.game.adventure?.phase === 'intro');
        assert((await page.evaluate(() => window.game.adventure.rooms.length)) === 8,
            'Level 1 cinematic must reveal a multi-room temple');
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

        // The adventure gate remains solid, including under dash.
        await page.evaluate(() => {
            const model = window.game.adventure;
            model.player.x = model.gate.x - 133;
            model.player.y = model.gate.y - 22;
            model.roomIndex = 6;
        });
        await page.keyboard.down('ArrowRight');
        await page.keyboard.press('k');
        await sleep(500);
        await page.keyboard.up('ArrowRight');
        const closed = await page.evaluate(() => ({
            x: window.game.adventure.center().x,
            wall: window.game.adventure.gate.x - 65,
            state: window.game.adventure.gate.state
        }));
        assert(closed.x <= closed.wall, 'dash crossed the closed Level 1 gate');
        assert(closed.state === 'locked', 'gate state is invalid');
        console.log('2. closed door blocks progression: PASS');

        // The first mathematics question is a physical floor choice, not a modal.
        await page.evaluate(() => {
            const model = window.game.adventure;
            const plate = model.puzzle.plates.find(item => !item.correct);
            model.player.x = plate.x - 18;
            model.player.y = plate.y - 22;
            model.roomIndex = 2;
        });
        await sleep(120);
        assert((await page.evaluate(() => window.game.adventure.lives)) === 3,
            'wrong floor plate must not cost a life');
        await page.evaluate(() => {
            const model = window.game.adventure;
            const plate = model.puzzle.plates.find(item => item.correct);
            model.player.x = plate.x - 18;
            model.player.y = plate.y - 22;
        });
        await page.waitForFunction(() => window.game.adventure.progress.sequence);
        // Deterministic campaign fixture: combat/artifact are exercised by the
        // dedicated real-keyboard playthrough, while this suite checks handoff.
        await page.evaluate(() => {
            const model = window.game.adventure;
            model.sentinel.health = 0;
            model.sentinel.state = 'DEFEATED';
            model.progress.sentinel = true;
            model.score += 110;
            model.acquireArtifact();
            model.player.x = model.gate.x - 116;
            model.player.y = model.gate.y - 22;
            model.roomIndex = 6;
            model.player.invulnerable = 0;
        });
        await page.keyboard.press('e');
        await page.waitForFunction(() => window.game.adventure.gate.state === 'open');
        const level1Solved = await page.evaluate(() => ({
            score: window.game.score,
            state: window.game.adventure.gate.state,
            energy: window.game.adventure.energy
        }));
        assert(level1Solved.score === 255 && level1Solved.energy >= 2,
            'Level 1 progression rewards were not awarded');
        assert(level1Solved.state === 'open', 'Level 1 Hero Gate did not open');
        console.log('3. Level 1 environmental puzzle and Hero Gate: PASS');

        await page.evaluate(() => {
            const model = window.game.adventure;
            model.player.x = model.portal.x - 65;
            model.player.y = model.portal.y - 22;
            model.roomIndex = 7;
        });
        await page.keyboard.press('e');
        await page.waitForFunction(() => window.game.adventure.phase === 'complete');
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
        assert(level2.lives === 3 && level2.score === 255, 'campaign state reset at level 2');
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
        assert(level3.lives === 3 && level3.score === 578, 'campaign state reset at level 3');
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
        assert(victory.lives === 3 && victory.score === 1464, 'final campaign state is invalid');
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
            gateState: window.game.adventure?.gate.state,
            challengeActive: window.game.adventure?.challenge
        }));
        assert(restarted.state === 'playing' && restarted.level === 1, 'campaign restart did not return to level 1');
        assert(restarted.difficulty === 'aventurero', 'campaign restart lost selected difficulty');
        assert(restarted.lives === 3 && restarted.score === 0, 'campaign restart is not clean');
        assert(restarted.gateState === 'locked' && restarted.challengeActive === null,
            'restart left adventure state dirty');
        console.log('7. campaign restart is clean: PASS');

        // Adventure deaths restore the latest checkpoint without replaying intro.
        await page.evaluate(() => {
            const model = window.game.adventure;
            model.progress.sequence = true;
            model.energy = 2;
            model.setCheckpoint('sequence', model.room('pulse').x + 82, 275);
            model.lives = 1;
            model.player.invulnerable = 0;
            model.hurt(1, 0);
        });
        const recovered = await page.evaluate(() => ({
            state: window.game.state,
            lives: window.game.adventure.lives,
            checkpoint: window.game.adventure.checkpoint.id,
            sequence: window.game.adventure.progress.sequence,
            energy: window.game.adventure.energy
        }));
        assert(recovered.state === 'playing' && recovered.lives === 3 &&
            recovered.checkpoint === 'sequence' && recovered.sequence && recovered.energy === 2,
            'checkpoint recovery did not preserve Level 1 progress');
        await page.evaluate(() => window.game.restartGame());
        await page.keyboard.press('Enter');
        await sleep(200);
        await page.keyboard.press('a');
        await sleep(200);
        assert((await page.evaluate(() => ({ state: window.game.state, difficulty: window.game.difficulty }))).difficulty === 'explorador', 'direct A did not confirm explorador');
        assert((await page.evaluate(() => window.game.state)) === 'level_intro', 'explorador did not reach level intro');
        console.log('8. checkpoint recovery and direct difficulty keys: PASS');

        assert(errors.length === 0, 'console/page errors: ' + JSON.stringify(errors));
        console.log('9. zero console/page errors: PASS');
        console.log('\n=== ADVENTURE CAMPAIGN FLOW PASSED ===');
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error('FLOW QA FAILED:', error.message);
    process.exit(1);
});
