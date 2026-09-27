const { chromium } = require('playwright');
const fs = require('node:fs');
const BRAVE = process.env.BRAVE_EXECUTABLE_PATH ||
    (fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(`ASSERTION FAILED: ${message}`); };

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: BRAVE });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        assert(await page.locator('#start-btn').isVisible(), 'premium start prompt missing');
        await page.keyboard.press('Enter');
        assert(await page.locator('.difficulty-card').count() === 3, 'three difficulties required');
        await page.keyboard.press('c');
        await page.waitForFunction(() => game.adventure?.phase === 'intro');
        assert(await page.evaluate(() => game.input.context) === 'CINEMATIC', 'intro context missing');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => game.state === 'playing');

        await page.evaluate(() => {
            const model = game.adventure;
            model.player.x = model.room('corridor').x + 145;
            model.player.y = 258;
        });
        await page.waitForFunction(() => game.adventure.escape.active);
        assert(await page.evaluate(() => game.input.context) === 'ESCAPE', 'escape context missing');

        await page.evaluate(() => {
            const model = game.adventure;
            const plate = model.puzzle.plates.find(item => item.correct);
            model.player.x = plate.x - 18; model.player.y = plate.y - 22; model.roomIndex = 2;
        });
        await page.waitForFunction(() => game.adventure.progress.sequence);
        const route = await page.evaluate(() => ({ energy: game.adventure.energy,
            combo: game.adventure.combo, attempts: game.adventure.mathAttempts }));
        assert(route.energy === 2 && route.combo === 2 && route.attempts === 1,
            'physical math route rewards are incorrect');

        await page.evaluate(() => {
            const model = game.adventure;
            model.progress.sentinel = true; model.sentinel.health = 0;
            model.sentinel.state = 'DEFEATED'; model.acquireArtifact();
            model.player.x = model.gate.x - 116; model.player.y = model.gate.y - 22;
            model.roomIndex = 6; model.player.invulnerable = 0;
        });
        await page.keyboard.press('e');
        await page.waitForFunction(() => game.adventure.gate.state === 'open');
        await page.evaluate(() => {
            const model = game.adventure;
            model.player.x = model.portal.x - 65; model.player.y = model.portal.y - 22;
            model.roomIndex = 7;
        });
        await sleep(80); await page.keyboard.press('e');
        await page.waitForFunction(() => game.state === 'victory');
        const result = await page.evaluate(() => game.hud.finalStats);
        assert(Number.isFinite(result.accuracy) && result.maxCombo >= 2, 'fair result stats missing');
        assert(errors.length === 0, `page errors: ${errors.join(' | ')}`);
        console.log('PASS: start, difficulty, cinematic, input contexts, escape, physical math, Hero Gate and result');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
