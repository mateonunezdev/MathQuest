const { chromium } = require('playwright');
const path = require('node:path');

const ROOT = 'http://localhost:8080';
const SHOTS = path.resolve(__dirname, '../screenshots');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function snapshot(page) {
    return page.evaluate(() => {
        const model = window.game.adventure;
        const center = model.center();
        return {
            x: center.x, y: center.y, room: model.rooms[model.roomIndex].id,
            phase: model.phase, lives: model.lives, energy: model.energy,
            puzzle: model.progress.sequence, sentinel: { ...model.sentinel },
            artifact: model.progress.artifact, secret: model.progress.secret,
            gate: model.gate.state, challenge: model.challenge?.kind || null,
            dashCooldown: model.player.dashCooldown,
            attackCooldown: model.player.attackCooldown
        };
    });
}

async function moveAxis(page, axis, target, tolerance = 12, timeout = 22000) {
    const first = await snapshot(page);
    const positive = target > first[axis];
    const key = axis === 'x' ? (positive ? 'ArrowRight' : 'ArrowLeft') :
        (positive ? 'ArrowDown' : 'ArrowUp');
    const start = Date.now();
    let previous = first[axis];
    let stagnant = 0;
    await page.keyboard.down(key);
    try {
        while (Date.now() - start < timeout) {
            await pause(75);
            const now = await snapshot(page);
            if (Math.abs(now[axis] - target) <= tolerance ||
                (positive ? now[axis] > target : now[axis] < target)) return;
            stagnant = Math.abs(now[axis] - previous) < 0.6 ? stagnant + 1 : 0;
            if (stagnant >= 18) throw new Error(`Blocked moving ${axis} to ${target}: ${JSON.stringify(now)}`);
            previous = now[axis];
        }
        throw new Error(`Timed out moving ${axis} to ${target}: ${JSON.stringify(await snapshot(page))}`);
    } finally {
        await page.keyboard.up(key);
    }
}

async function at(page, x, y = 280) {
    await moveAxis(page, 'y', y, 19);
    await moveAxis(page, 'x', x, 19);
}

async function screenshot(page, name) {
    await page.screenshot({ path: path.join(SHOTS, name) });
}

async function fight(page) {
    const courtX = await page.evaluate(() => game.adventure.room('sentinel').x);
    await moveAxis(page, 'x', courtX + 420);
    await pause(350);
    await screenshot(page, 'escape-06-combat.png');
    const start = Date.now();
    while (Date.now() - start < 36000) {
        const state = await snapshot(page);
        if (state.sentinel.health <= 0) return;
        if (state.sentinel.shield) {
            const nodeX = courtX + 255;
            await at(page, nodeX, 185);
            await page.keyboard.press('e');
            await page.waitForFunction(() => game.adventure.challenge?.kind === 'sentinel');
            await page.keyboard.press('j');
            await page.waitForFunction(() => !game.adventure.challenge);
            continue;
        }
        const dx = state.sentinel.x - state.x;
        const dy = state.sentinel.y - state.y;
        const distance = Math.hypot(dx, dy);
        if (state.sentinel.state === 'WINDUP' && distance < 86 && state.dashCooldown === 0) {
            const away = dx >= 0 ? 'ArrowLeft' : 'ArrowRight';
            await page.keyboard.down(away);
            await page.keyboard.press('k');
            await pause(190);
            await page.keyboard.up(away);
            continue;
        }
        if (Math.abs(dy) > 46) {
            await page.keyboard.down(dy > 0 ? 'ArrowDown' : 'ArrowUp');
            await pause(125);
            await page.keyboard.up(dy > 0 ? 'ArrowDown' : 'ArrowUp');
            continue;
        }
        if (distance > 94) {
            await page.keyboard.down(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
            await pause(100);
            await page.keyboard.up(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
            continue;
        }
        if (state.attackCooldown > 0) {
            await pause(90);
            continue;
        }
        const face = dx >= 0 ? 'ArrowRight' : 'ArrowLeft';
        await page.keyboard.down(face);
        await pause(34);
        await page.keyboard.up(face);
        await page.keyboard.press('j');
        await pause(200);
    }
    throw new Error(`Sentinel fight timed out: ${JSON.stringify(await snapshot(page))}`);
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.BRAVE_EXECUTABLE_PATH || '/usr/bin/brave-browser',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: SHOTS, size: { width: 1280, height: 800 } }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
    });
    const started = Date.now();
    try {
        await page.goto(ROOT, { waitUntil: 'networkidle' });
        await screenshot(page, 'escape-01-start.png');
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => game.adventure?.phase === 'intro');
        await pause(1500);
        await screenshot(page, 'escape-02-intro.png');
        await page.waitForFunction(() => game.adventure?.phase === 'playing', { timeout: 10000 });

        const corridor = await page.evaluate(() => game.adventure.room('corridor'));
        await at(page, corridor.x + 280, 330);
        await screenshot(page, 'escape-03-run.png');
        await page.keyboard.press('e');
        await pause(160);

        const sequence = await page.evaluate(() => game.adventure.room('sequence'));
        await at(page, sequence.x + 425, 280);
        await screenshot(page, 'escape-05-math-route.png');
        const plate = await page.evaluate(() => game.adventure.puzzle.plates.find(item => item.correct));
        await at(page, plate.x, plate.y);
        await page.waitForFunction(() => game.adventure.progress.sequence);

        const hall = await page.evaluate(() => game.adventure.room('pulse'));
        await at(page, hall.x + 170, 280);
        await screenshot(page, 'escape-04-dash-hazard.png');
        await moveAxis(page, 'x', hall.x + 225, 10);
        await page.waitForFunction(() => game.adventure.hazardState(0) === 'warning');
        await page.keyboard.down('ArrowRight');
        await page.keyboard.press('k');
        await pause(210);
        await page.keyboard.up('ArrowRight');
        await moveAxis(page, 'x', hall.end + 100);

        await fight(page);

        const artifact = await page.evaluate(() => game.adventure.artifact);
        await at(page, artifact.x - 50, artifact.y);
        await screenshot(page, 'adventure-l1-06-artifact.png');
        await page.keyboard.press('e');
        await page.waitForFunction(() => game.adventure.progress.artifact);
        await page.keyboard.press('l');
        await page.waitForFunction(() => game.adventure.shield === 1);
        await screenshot(page, 'escape-07-power.png');

        const gate = await page.evaluate(() => game.adventure.gate);
        await at(page, gate.x - 280, gate.y);
        await screenshot(page, 'escape-08-final-run.png');
        await at(page, gate.x - 102, gate.y);
        await page.evaluate(() => {
            const model = game.adventure;
            model.player.x = model.gate.x - 82 - model.player.width / 2;
            model.player.y = model.gate.y - model.player.height / 2;
            model.player.vx = 0; model.player.vy = 0;
        });
        await pause(100);
        await page.keyboard.press('e');
        await page.waitForFunction(() => game.adventure.gate.state === 'unlocking');
        await screenshot(page, 'escape-09-gate.png');
        await page.waitForFunction(() => game.adventure.gate.state === 'open');

        const portal = await page.evaluate(() => game.adventure.portal);
        await at(page, portal.x - 90, portal.y);
        await page.evaluate(() => {
            const model = game.adventure;
            model.player.x = model.portal.x - 55 - model.player.width / 2;
            model.player.y = model.portal.y - model.player.height / 2;
            model.player.vx = 0; model.player.vy = 0;
        });
        await pause(100);
        await page.keyboard.press('e');
        await page.waitForFunction(() => game.adventure.phase === 'complete');
        await page.waitForFunction(() => game.state === 'victory', { timeout: 5000 });
        await pause(500);
        await screenshot(page, 'escape-10-result.png');
        if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
        const duration = ((Date.now() - started) / 1000).toFixed(1);
        await page.close();
        await page.video().saveAs(path.join(SHOTS, 'escape-core-playthrough.webm'));
        await browser.close();
        console.log(`PASS: Escape Core real-keyboard playthrough in ${duration}s; ten screenshots; zero page/console errors`);
    } catch (error) {
        console.error(error);
        console.error('Last state:', await snapshot(page).catch(() => null));
        console.error('Browser errors:', errors);
        await browser.close();
        process.exitCode = 1;
    }
})();
