const { chromium } = require('playwright');
const fs = require('node:fs');
const BRAVE = process.env.BRAVE_EXECUTABLE_PATH ||
    (fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(`ASSERTION FAILED: ${message}`); };

async function sample(page, label, count = 150) {
    const stats = await page.evaluate(frames => new Promise(resolve => {
        const times = []; const renders = []; let last = 0;
        const originalRender = game.render;
        game.render = function (...args) {
            const began = performance.now();
            originalRender.apply(this, args);
            renders.push(performance.now() - began);
        };
        const tick = now => {
            if (last) times.push(now - last); last = now;
            if (times.length < frames) requestAnimationFrame(tick);
            else {
                game.render = originalRender;
                const sorted = [...times].sort((a, b) => a - b);
                const sortedRenders = [...renders].sort((a, b) => a - b);
                const mean = times.reduce((sum, value) => sum + value, 0) / times.length;
                resolve({ fps: Math.round(1000 / mean), p95: +sorted[Math.floor(frames * .95)].toFixed(1),
                    worst: +sorted.at(-1).toFixed(1),
                    renderP95: +(sortedRenders[Math.floor(sortedRenders.length * .95)] || 0).toFixed(1) });
            }
        }; requestAnimationFrame(tick);
    }), count);
    console.log(`Runtime ${label}: ${JSON.stringify(stats)}`);
    return stats;
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: BRAVE });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        const missing = await page.evaluate(() => [...game.artAssets.loadedImages]
            .filter(([, image]) => !image?.naturalWidth).map(([source]) => source));
        assert(missing.length === 0, `missing art: ${missing.join(', ')}`);
        const start = await sample(page, 'start', 90);
        await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
        await page.waitForFunction(() => game.adventure?.phase === 'intro');
        const intro = await sample(page, 'intro', 90);
        await page.keyboard.press('Enter');
        await page.evaluate(() => {
            const model = game.adventure; model.skipIntro();
            model.player.x = model.room('pulse').x + 200; model.player.y = 258;
            model.roomIndex = 3; model.progress.sequence = true; model.escape.start(model.center().x);
        });
        const run = await sample(page, 'escape hazards');
        await page.evaluate(() => {
            const model = game.adventure; const court = model.room('sentinel');
            model.player.x = court.x + 420; model.player.y = 258; model.roomIndex = 4;
            model.sentinel.started = true; model.sentinel.state = 'CHASE';
        });
        const combat = await sample(page, 'combat');
        const samples = [start, intro, run, combat];
        assert(samples.slice(1).every(item => item.fps >= 25), 'live scene cadence fell below headless 30 Hz');
        assert(samples.every(item => item.renderP95 <= 16.7), 'render cost exceeded a 60 FPS frame budget');
        const audio = await page.evaluate(() => ['escapeStart', 'adventureDash', 'adventureAttack',
            'adventureHurt', 'correct', 'incorrect', 'powerActivate', 'portalActivate', 'victory']
            .every(name => typeof game.audio.sounds[name] === 'function'));
        assert(audio, 'required offline cues missing');
        assert(errors.length === 0, `page errors: ${errors.join(' | ')}`);
        const averageFps = Math.round(samples.reduce((sum, item) => sum + item.fps, 0) / samples.length);
        console.log(`PASS: assets, audio, console and performance ${JSON.stringify({ averageFps,
            p95Ms: Math.max(...samples.map(item => item.p95)), worstMs: Math.max(...samples.map(item => item.worst)),
            renderP95Ms: Math.max(...samples.map(item => item.renderP95)) })}`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
