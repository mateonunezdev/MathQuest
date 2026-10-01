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

    // Continuous production-integration run: menus, restrained intro/countdown,
    // every approved movement action, math gate, portal, result, and fast retry.
    const fullTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'mathquest-production-full-'));
    const fullContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: fullTemp, size: { width: 1280, height: 800 } }
    });
    const fullPage = await fullContext.newPage(); const fullVideo = fullPage.video();
    instrument(fullPage, errors, failed); const fullStarted = Date.now();
    await fullPage.goto(ROOT, { waitUntil: 'domcontentloaded' }); await waitReady(fullPage);
    await sleep(900); assert((await snapshot(fullPage)).phase === 'MENU', 'full run did not begin at menu');
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'DIFFICULTY'); await sleep(550);
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'CONTROLS'); await sleep(1200);
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'INTRO');
    await waitPhase(fullPage, 'PLAYING', 12000);

    await tap(fullPage, 'ArrowRight', 620); await sleep(120); await tap(fullPage, 'ArrowLeft', 640);
    await waitDistance(fullPage, 13.6); await fullPage.keyboard.press('ArrowUp'); await sleep(250);
    assert((await snapshot(fullPage)).movementState === 'JUMP', 'jump did not reach its airborne state');
    await waitDistance(fullPage, 24.35); await fullPage.keyboard.press('ArrowDown'); await sleep(210);
    assert((await snapshot(fullPage)).movementState === 'SLIDE', 'slide did not reach its low state');
    await waitDistance(fullPage, 29.7); await fullPage.keyboard.press('j'); await sleep(180);
    await fullPage.keyboard.press('l'); await sleep(420);
    assert((await fullPage.locator('#toast').textContent()).includes('INSUFICIENTE'), 'insufficient Sigma feedback was not shown');
    await waitDistance(fullPage, 35.75); await fullPage.keyboard.press('k'); await sleep(130);
    assert((await snapshot(fullPage)).movementState === 'DASH', 'dash did not activate');
    await waitDistance(fullPage, 45.6); await fullPage.keyboard.press('b');
    await fullPage.waitForFunction(() => window.__mathquestGame.snapshot().mathResolved, null, { timeout: 8000 });
    let completed = await snapshot(fullPage);
    assert(completed.routeChoice === 0 && completed.energy === 1, '18 ÷ 3 did not resolve through the architectural 6 gate');
    await fullPage.keyboard.press('l'); await sleep(350);
    assert((await snapshot(fullPage)).energy === 0, 'Sigma Shield did not consume its earned energy');
    await waitPhase(fullPage, 'PORTAL', 12000); await waitPhase(fullPage, 'RESULT', 6000); await sleep(1250);
    completed = await snapshot(fullPage);
    assert(await fullPage.locator('#result-rank').evaluate(node => node.classList.contains('active')), 'result rank did not reveal');
    await fullPage.keyboard.press('Enter'); await waitPhase(fullPage, 'COUNTDOWN');
    await waitPhase(fullPage, 'PLAYING', 7000); await tap(fullPage, 'ArrowRight', 460); await tap(fullPage, 'ArrowLeft', 430);
    const fullElapsed = Date.now() - fullStarted;
    if (fullElapsed < 48000) await sleep(48000 - fullElapsed);
    await finishVideo(fullContext, fullPage, fullVideo, 'mathquest-production-integration-v1.webm');

    // One continuous visibility run. It starts at the authored arch, passes close
    // columns, jumps, slides, crosses the math architecture, and approaches the portal.
    const visibilityTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'mathquest-production-visibility-'));
    const visibilityContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: visibilityTemp, size: { width: 1280, height: 800 } }
    });
    const visibilityPage = await visibilityContext.newPage(); const visibilityVideo = visibilityPage.video();
    instrument(visibilityPage, errors, failed); const visibilityStarted = Date.now();
    await visibilityPage.goto(`${ROOT}?qa=1`, { waitUntil: 'domcontentloaded' }); await waitReady(visibilityPage);
    await visibilityPage.evaluate(() => {
        window.__mathquestGame.testing.setPhase('PLAYING');
        window.__mathquestGame.testing.setLateral(-2.35);
        window.__mathquestGame.testing.setDistance(9.7);
    });
    await sleep(420);
    const startVisibility = await snapshot(visibilityPage);
    assert(startVisibility.camera.teleports === 0, 'QA transition reproduced the old giant-geometry camera traversal');
    await tap(visibilityPage, 'ArrowRight', 900); await tap(visibilityPage, 'ArrowLeft', 240);
    await waitDistance(visibilityPage, 13.55); await visibilityPage.keyboard.press('ArrowUp'); await sleep(260);
    const jumpVisibility = await snapshot(visibilityPage);
    assert(jumpVisibility.movementState === 'JUMP' && jumpVisibility.jumpY > .4, 'visibility run did not show a readable jump');
    await waitDistance(visibilityPage, 24.3); await visibilityPage.keyboard.press('ArrowDown'); await sleep(200);
    const slideVisibility = await snapshot(visibilityPage);
    assert(slideVisibility.movementState === 'SLIDE' && slideVisibility.slide, 'visibility run did not show a readable slide');
    await waitDistance(visibilityPage, 35.7); await visibilityPage.keyboard.press('k');
    await waitDistance(visibilityPage, 45.55); await visibilityPage.keyboard.press('b');
    await visibilityPage.waitForFunction(() => window.__mathquestGame.snapshot().mathResolved, null, { timeout: 8000 });
    await waitDistance(visibilityPage, 56.0, 12000);
    const approachVisibility = await snapshot(visibilityPage);
    await waitPhase(visibilityPage, 'PORTAL', 8000); await sleep(120);
    const finalVisibility = await snapshot(visibilityPage);
    assert(finalVisibility.camera.teleports === 0, 'camera crossed world geometry during the visibility run');
    const visibilityElapsed = Date.now() - visibilityStarted;
    if (visibilityElapsed < 17500) await sleep(17500 - visibilityElapsed);
    await finishVideo(visibilityContext, visibilityPage, visibilityVideo, 'mathquest-camera-visibility.webm');

    // Formal visible performance sample, taken last without video recording.
    const performanceContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const performancePage = await performanceContext.newPage(); instrument(performancePage, errors, failed);
    await performancePage.goto(`${ROOT}?qa=1`, { waitUntil: 'domcontentloaded' }); await waitReady(performancePage);
    await performancePage.evaluate(() => {
        window.__mathquestGame.testing.setPhase('PLAYING');
        window.__mathquestGame.testing.setDistance(8);
    });
    await sleep(7000);
    const performance = (await snapshot(performancePage)).performance;
    assert(performance.fps >= 50, `visible FPS ${performance.fps.toFixed(1)} is below 50`);

    const fullMetadata = await metadata(performancePage, 'mathquest-production-integration-v1.webm');
    const visibilityMetadata = await metadata(performancePage, 'mathquest-camera-visibility.webm');
    assert(fullMetadata.duration >= 45 && fullMetadata.duration <= 60, `full video is ${fullMetadata.duration.toFixed(2)}s`);
    assert(visibilityMetadata.duration >= 15 && visibilityMetadata.duration <= 25, `visibility video is ${visibilityMetadata.duration.toFixed(2)}s`);
    assert(fullMetadata.width === 1280 && fullMetadata.height === 800, 'full video dimensions are incorrect');
    assert(visibilityMetadata.width === 1280 && visibilityMetadata.height === 800, 'visibility video dimensions are incorrect');
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    assert(failed.length === 0, `failed requests: ${failed.join(' | ')}`);

    const report = {
        completed, performance,
        visibility: { start: startVisibility, jump: jumpVisibility, slide: slideVisibility, approach: approachVisibility, final: finalVisibility },
        videos: { full: fullMetadata, visibility: visibilityMetadata }, errors, failed
    };
    fs.writeFileSync(path.join(OUTPUT, 'mathquest-production-integration-v1-metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
    await performancePage.close(); await performanceContext.close(); await browser.close();
    console.log('PASS: production integration flow, continuous camera visibility, exact teleport regression, and visible performance');
    console.log(JSON.stringify({ performance, fullMetadata, visibilityMetadata }));
})().catch(error => { console.error(error); process.exitCode = 1; });
