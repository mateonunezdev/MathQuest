const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = 'http://127.0.0.1:8080/spikes/mathquest-integrated-v1/';
const OUTPUT = path.resolve(__dirname, '../screenshots');
const TEMP_VIDEO = fs.mkdtempSync(path.join(os.tmpdir(), 'mathquest-integrated-v1-'));
const BRAVE = fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(`ASSERTION FAILED: ${message}`); };

async function snapshot(page) {
    return page.evaluate(() => window.__mathquestGame.snapshot());
}
async function waitReady(page) {
    await page.waitForFunction(() => window.__mathquestGame?.ready === true, null, { timeout: 30000 });
    await sleep(500);
}
async function waitPhase(page, phase, timeout = 15000) {
    await page.waitForFunction(target => window.__mathquestGame.snapshot().phase === target, phase, { timeout });
}
async function waitDistance(page, distance, timeout = 20000) {
    await page.waitForFunction(target => window.__mathquestGame.snapshot().distance >= target, distance, { timeout });
}
async function shot(page, filename) {
    await page.screenshot({ path: path.join(OUTPUT, filename) });
}
async function tap(page, key, duration = 80) {
    await page.keyboard.down(key); await sleep(duration); await page.keyboard.up(key);
}
async function centerRunner(page) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const current = await snapshot(page);
        if (Math.abs(current.lateral) < .25) return;
        await tap(page, current.lateral > 0 ? 'ArrowLeft' : 'ArrowRight', 45);
        await sleep(55);
    }
    const current = await snapshot(page);
    assert(Math.abs(current.lateral) < .82, `runner could not recenter for correct math route (${current.lateral.toFixed(2)})`);
}
function instrument(page, errors, failed) {
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
}

(async () => {
    fs.mkdirSync(OUTPUT, { recursive: true });
    const browser = await chromium.launch({
        headless: false, executablePath: BRAVE,
        args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']
    });
    const errors = [];
    const failed = [];

    // One unedited, continuous keyboard-driven acceptance run.
    const videoContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: TEMP_VIDEO, size: { width: 1280, height: 800 } }
    });
    const page = await videoContext.newPage();
    const video = page.video();
    instrument(page, errors, failed);
    const recordingStarted = Date.now();
    await page.goto(ROOT, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await sleep(1700);
    let current = await snapshot(page);
    assert(current.phase === 'MENU', 'game did not boot to the MathQuest main menu');
    await shot(page, 'integrated-01-menu.png');

    await page.keyboard.press('Enter');
    await waitPhase(page, 'DIFFICULTY');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await sleep(650);
    await shot(page, 'integrated-02-difficulty.png');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'CONTROLS');
    await sleep(1650);
    await page.keyboard.press('Enter');
    await waitPhase(page, 'INTRO');
    await sleep(950);
    await shot(page, 'integrated-03-intro.png');
    await waitPhase(page, 'PLAYING', 10000);

    // Smooth steering tutorial with a deliberate reversal.
    await tap(page, 'ArrowRight', 520);
    await tap(page, 'ArrowLeft', 560);
    await waitDistance(page, 6.8);
    await shot(page, 'integrated-04-run.png');

    await waitDistance(page, 13.75);
    await page.keyboard.press('ArrowUp');
    await sleep(260);
    current = await snapshot(page);
    assert(current.movementState === 'JUMP' && current.jumpY > .45, 'jump did not produce a readable airborne state');
    await shot(page, 'integrated-05-jump.png');

    await waitDistance(page, 24.45);
    await page.keyboard.press('ArrowDown');
    await sleep(210);
    current = await snapshot(page);
    assert(current.movementState === 'SLIDE' && current.slide, 'slide did not enter the compressed movement state');
    await shot(page, 'integrated-06-slide.png');

    await waitDistance(page, 30.5);
    await page.keyboard.press('Escape');
    await waitPhase(page, 'PAUSED');
    const pausedDistance = (await snapshot(page)).distance;
    await sleep(650);
    assert(Math.abs((await snapshot(page)).distance - pausedDistance) < .001, 'pause did not stop auto-run');
    await page.keyboard.press('Escape');
    await waitPhase(page, 'PLAYING');
    await page.keyboard.press('j');
    await page.keyboard.press('l');
    await sleep(160);
    assert((await page.locator('#toast').textContent()).includes('INSUFICIENTE'), 'zero-energy power feedback was not shown');

    await waitDistance(page, 35.7);
    await page.keyboard.press('k');
    await sleep(120);
    assert((await snapshot(page)).movementState === 'DASH', 'dash did not activate');

    await waitDistance(page, 45.8);
    await centerRunner(page);
    await waitDistance(page, 47.2);
    await shot(page, 'integrated-07-math-route.png');
    await page.waitForFunction(() => window.__mathquestGame.snapshot().mathResolved === true, null, { timeout: 8000 });
    current = await snapshot(page);
    assert(current.routeChoice === 0 && current.energy === 1, 'center math route did not resolve as 18 ÷ 3 = 6');
    await page.keyboard.press('l');
    await sleep(120);
    assert((await snapshot(page)).energy === 0, 'Sigma Shield did not consume earned Math Energy');

    await waitPhase(page, 'PORTAL', 12000);
    await sleep(360);
    await shot(page, 'integrated-08-portal.png');
    await waitPhase(page, 'RESULT', 5000);
    await sleep(650);
    current = await snapshot(page);
    assert(current.mathResolved && current.score > 1250, 'result state did not preserve run progression');
    await shot(page, 'integrated-09-result.png');

    // Exercise retry, then return to the main menu through the real pause menu.
    await page.keyboard.press('Enter');
    await waitPhase(page, 'INTRO');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'PLAYING', 8000);
    await page.keyboard.press('Enter');
    await waitPhase(page, 'PAUSED');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitPhase(page, 'MENU');
    const elapsedRecording = Date.now() - recordingStarted;
    if (elapsedRecording < 47000) await sleep(47000 - elapsedRecording);

    assert(errors.length === 0, `console errors during acceptance run: ${errors.join(' | ')}`);
    assert(failed.length === 0, `failed requests during acceptance run: ${failed.join(' | ')}`);
    await page.close();
    await videoContext.close();
    const recordedPath = await video.path();
    const videoOutput = path.join(OUTPUT, 'mathquest-integrated-v1.webm');
    fs.copyFileSync(recordedPath, videoOutput);

    // Visible, non-recording gameplay performance sample.
    const performanceContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const performancePage = await performanceContext.newPage();
    instrument(performancePage, errors, failed);
    await performancePage.goto(ROOT, { waitUntil: 'domcontentloaded' });
    await waitReady(performancePage);
    await performancePage.keyboard.press('Enter');
    await performancePage.keyboard.press('Enter');
    await performancePage.keyboard.press('Enter');
    await performancePage.keyboard.press('Enter');
    await waitPhase(performancePage, 'PLAYING', 8000);
    await sleep(4200);
    const performance = await snapshot(performancePage);
    assert(performance.performance.fps >= 50, `visible FPS ${performance.performance.fps.toFixed(1)} is below 50`);

    // Compact responsive check with no horizontal overflow.
    await performancePage.goto(ROOT, { waitUntil: 'domcontentloaded' });
    await waitReady(performancePage);
    await performancePage.setViewportSize({ width: 390, height: 844 });
    await sleep(450);
    const mobile = await performancePage.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert(mobile.scrollWidth <= mobile.width, 'mobile menu has horizontal overflow');
    await performancePage.close();
    await performanceContext.close();

    // Targeted wrong-route check: feedback and slowdown, never instant death.
    const wrongContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const wrongPage = await wrongContext.newPage();
    instrument(wrongPage, errors, failed);
    await wrongPage.goto(`${ROOT}?qa=1`, { waitUntil: 'domcontentloaded' });
    await waitReady(wrongPage);
    await wrongPage.evaluate(() => {
        window.__mathquestGame.testing.setPhase('PLAYING');
        window.__mathquestGame.testing.setDistance(53.75);
        window.__mathquestGame.testing.setLateral(-2.2);
    });
    await wrongPage.waitForFunction(() => window.__mathquestGame.snapshot().mathResolved === true, null, { timeout: 3000 });
    const wrong = await snapshot(wrongPage);
    assert(wrong.routeChoice === -1 && wrong.lives === 3 && wrong.movementState === 'HIT', 'wrong math route feedback is not non-lethal');
    await wrongPage.close();
    await wrongContext.close();

    // Verify the actual saved WebM duration and dimensions, not only in-game time.
    const metadataPage = await browser.newPage();
    await metadataPage.goto('http://127.0.0.1:8080/');
    const videoMetadata = await metadataPage.evaluate(async () => {
        const element = document.createElement('video');
        element.src = '/screenshots/mathquest-integrated-v1.webm';
        await new Promise((resolve, reject) => { element.onloadedmetadata = resolve; element.onerror = reject; });
        return { duration: element.duration, width: element.videoWidth, height: element.videoHeight };
    });
    assert(videoMetadata.duration >= 45 && videoMetadata.duration <= 75,
        `acceptance video duration ${videoMetadata.duration.toFixed(2)}s is outside 45–75s`);
    assert(videoMetadata.width === 1280 && videoMetadata.height === 800, 'acceptance video dimensions are incorrect');
    await metadataPage.close();

    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    assert(failed.length === 0, `failed requests: ${failed.join(' | ')}`);
    const results = { acceptance: current, performance, wrongRoute: wrong, videoMetadata, errors, failed };
    fs.writeFileSync(path.join(OUTPUT, 'mathquest-integrated-v1-metrics.json'), `${JSON.stringify(results, null, 2)}\n`);
    await browser.close();
    console.log('PASS: integrated MathQuest V1 complete flow, controls, math routes, pause, retry/menu, responsive layout, performance, and capture');
    console.log(JSON.stringify({ performance: performance.performance, videoMetadata, score: current.score }));
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
