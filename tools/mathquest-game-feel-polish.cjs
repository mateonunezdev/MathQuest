const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = 'http://127.0.0.1:8080/spikes/mathquest-integrated-v1/';
const OUTPUT = path.resolve(__dirname, '../screenshots');
const BRAVE = fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(`ASSERTION FAILED: ${message}`); };

async function snapshot(page) { return page.evaluate(() => window.__mathquestGame.snapshot()); }
async function waitReady(page) {
    await page.waitForFunction(() => window.__mathquestGame?.ready === true, null, { timeout: 30000 });
    await sleep(450);
}
async function waitPhase(page, phase, timeout = 15000) {
    await page.waitForFunction(target => window.__mathquestGame.snapshot().phase === target, phase, { timeout });
}
async function waitDistance(page, distance, timeout = 20000) {
    await page.waitForFunction(target => window.__mathquestGame.snapshot().distance >= target, distance, { timeout });
}
async function tap(page, key, duration = 80) {
    await page.keyboard.down(key); await sleep(duration); await page.keyboard.up(key);
}
function instrument(page, errors, failed) {
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
}
async function finishVideo(context, page, video, filename) {
    await page.close(); await context.close();
    fs.copyFileSync(await video.path(), path.join(OUTPUT, filename));
}
async function metadata(page, filename) {
    return page.evaluate(async source => {
        const video = document.createElement('video'); video.src = source;
        await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = reject; });
        return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    }, `/screenshots/${filename}`);
}

(async () => {
    fs.mkdirSync(OUTPUT, { recursive: true });
    const browser = await chromium.launch({
        headless: false, executablePath: BRAVE,
        args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']
    });
    const errors = []; const failed = [];

    const fullTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'mathquest-polish-full-'));
    const fullContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: fullTemp, size: { width: 1280, height: 800 } }
    });
    const fullPage = await fullContext.newPage(); const fullVideo = fullPage.video();
    instrument(fullPage, errors, failed); const fullStarted = Date.now();
    await fullPage.goto(ROOT, { waitUntil: 'domcontentloaded' }); await waitReady(fullPage);
    await sleep(1050); assert((await snapshot(fullPage)).phase === 'MENU', 'full run did not begin at menu');
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'DIFFICULTY');
    await fullPage.keyboard.press('ArrowDown'); await sleep(260); await fullPage.keyboard.press('ArrowUp'); await sleep(620);
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'CONTROLS'); await sleep(1450);
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'INTRO');
    await waitPhase(fullPage, 'PLAYING', 12000);

    await tap(fullPage, 'ArrowRight', 620); await sleep(180); await tap(fullPage, 'ArrowLeft', 650);
    await waitDistance(fullPage, 13.6); await fullPage.keyboard.press('ArrowUp'); await sleep(260);
    assert((await snapshot(fullPage)).movementState === 'JUMP', 'jump did not reach its airborne state');
    await waitDistance(fullPage, 24.35); await fullPage.keyboard.press('ArrowDown'); await sleep(220);
    assert((await snapshot(fullPage)).movementState === 'SLIDE', 'slide did not reach its low state');
    await waitDistance(fullPage, 29.7); await fullPage.keyboard.press('j'); await sleep(180);
    await fullPage.keyboard.press('l'); await sleep(540);
    assert((await fullPage.locator('#toast').textContent()).includes('INSUFICIENTE'), 'insufficient Sigma feedback was not shown');
    await waitDistance(fullPage, 35.75); await fullPage.keyboard.press('k'); await sleep(130);
    assert((await snapshot(fullPage)).movementState === 'DASH', 'dash did not activate');
    await waitDistance(fullPage, 45.6); await fullPage.keyboard.press('b');
    await fullPage.waitForFunction(() => window.__mathquestGame.snapshot().mathResolved, null, { timeout: 8000 });
    let completed = await snapshot(fullPage);
    assert(completed.routeChoice === 0 && completed.energy === 1, '18 ÷ 3 did not resolve through the center 6 gate');
    await fullPage.keyboard.press('l'); await sleep(420);
    assert((await snapshot(fullPage)).energy === 0, 'Sigma Shield did not consume its earned energy');
    await waitPhase(fullPage, 'PORTAL', 12000); await waitPhase(fullPage, 'RESULT', 6000); await sleep(1450);
    completed = await snapshot(fullPage);
    assert(await fullPage.locator('#result-rank').evaluate(node => node.classList.contains('active')), 'result rank did not reveal');
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'COUNTDOWN');
    assert((await snapshot(fullPage)).phase !== 'INTRO', 'retry incorrectly replayed the intro');
    await waitPhase(fullPage, 'PLAYING', 7000); await tap(fullPage, 'ArrowRight', 520); await tap(fullPage, 'ArrowLeft', 480);
    const fullElapsed = Date.now() - fullStarted; if (fullElapsed < 48000) await sleep(48000 - fullElapsed);
    await finishVideo(fullContext, fullPage, fullVideo, 'mathquest-polish-v1.webm');

    const movementTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'mathquest-polish-movement-'));
    const movementContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: movementTemp, size: { width: 1280, height: 800 } }
    });
    const warmPage = await movementContext.newPage();
    await warmPage.goto(`${ROOT}?qa=1`, { waitUntil: 'domcontentloaded' }); await waitReady(warmPage); await warmPage.close();
    const movementPage = await movementContext.newPage(); const movementVideo = movementPage.video();
    instrument(movementPage, errors, failed); const movementStarted = Date.now();
    await movementPage.goto(`${ROOT}?qa=1`, { waitUntil: 'domcontentloaded' }); await waitReady(movementPage);
    await movementPage.evaluate(() => { window.__mathquestGame.testing.setPhase('PLAYING'); window.__mathquestGame.testing.setDistance(6.5); });
    await sleep(900); await tap(movementPage, 'ArrowRight', 680); await sleep(180); await tap(movementPage, 'ArrowLeft', 720);
    await movementPage.evaluate(() => window.__mathquestGame.testing.setDistance(12.7)); await sleep(250);
    await movementPage.keyboard.press('ArrowUp'); await sleep(1150);
    await movementPage.evaluate(() => window.__mathquestGame.testing.setDistance(23.7)); await sleep(280);
    await movementPage.keyboard.press('ArrowDown'); await sleep(1050);
    await movementPage.evaluate(() => window.__mathquestGame.testing.setDistance(34.1)); await sleep(260);
    await movementPage.keyboard.press('k'); await sleep(900); await movementPage.keyboard.press('j'); await sleep(850);
    await movementPage.keyboard.press('l'); await sleep(800);
    await movementPage.evaluate(() => window.__mathquestGame.testing.setEnergy(1)); await movementPage.keyboard.press('l'); await sleep(1400);
    await tap(movementPage, 'ArrowRight', 560); await tap(movementPage, 'ArrowLeft', 560);
    const movementElapsed = Date.now() - movementStarted; if (movementElapsed < 18000) await sleep(18000 - movementElapsed);
    const movementState = await snapshot(movementPage);
    assert(movementState.tutorial.jump && movementState.tutorial.slide && movementState.tutorial.dash,
        'movement clip did not exercise jump, slide, and dash');
    await finishVideo(movementContext, movementPage, movementVideo, 'mathquest-movement-polish.webm');

    // The only formal performance measurement is taken last, in a visible non-recording window.
    const performanceContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const performancePage = await performanceContext.newPage(); instrument(performancePage, errors, failed);
    await performancePage.goto(`${ROOT}?qa=1`, { waitUntil: 'domcontentloaded' }); await waitReady(performancePage);
    await performancePage.evaluate(() => { window.__mathquestGame.testing.setPhase('PLAYING'); window.__mathquestGame.testing.setDistance(8); });
    await sleep(6500); const performance = (await snapshot(performancePage)).performance;
    assert(performance.fps >= 50, `visible FPS ${performance.fps.toFixed(1)} is below 50`);

    const fullMetadata = await metadata(performancePage, 'mathquest-polish-v1.webm');
    const movementMetadata = await metadata(performancePage, 'mathquest-movement-polish.webm');
    assert(fullMetadata.duration >= 45 && fullMetadata.duration <= 65, `full video is ${fullMetadata.duration.toFixed(2)}s`);
    assert(movementMetadata.duration >= 15 && movementMetadata.duration <= 25, `movement video is ${movementMetadata.duration.toFixed(2)}s`);
    assert(fullMetadata.width === 1280 && fullMetadata.height === 800, 'full video dimensions are incorrect');
    assert(movementMetadata.width === 1280 && movementMetadata.height === 800, 'movement video dimensions are incorrect');
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    assert(failed.length === 0, `failed requests: ${failed.join(' | ')}`);

    const report = { completed, movementState, performance, videos: { full: fullMetadata, movement: movementMetadata }, errors, failed };
    fs.writeFileSync(path.join(OUTPUT, 'mathquest-game-feel-polish-metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
    await performancePage.close(); await performanceContext.close(); await browser.close();
    console.log('PASS: game-feel polish flow, movement, fast retry, videos, and visible performance');
    console.log(JSON.stringify({ performance, fullMetadata, movementMetadata }));
})().catch(error => { console.error(error); process.exitCode = 1; });
