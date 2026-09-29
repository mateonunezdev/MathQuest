const { chromium } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = 'http://127.0.0.1:8080/spikes/mathquest-art-kit-v1/';
const OUTPUT = path.resolve(__dirname, '../screenshots');
const TEMP_VIDEO = fs.mkdtempSync(path.join(os.tmpdir(), 'mathquest-art-kit-v1-'));
const BRAVE = fs.existsSync('/usr/bin/brave-browser') ? '/usr/bin/brave-browser' : undefined;
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(`ASSERTION FAILED: ${message}`); };

async function waitReady(page) {
    await page.waitForFunction(() => window.__mathquestArtKit?.ready === true, null, { timeout: 30000 });
    await sleep(550);
}

async function snapshot(page) {
    return page.evaluate(() => window.__mathquestArtKit.snapshot());
}

async function captureShot(page, shot, filename) {
    await page.evaluate(name => window.__mathquestArtKit.setShot(name), shot);
    await sleep(420);
    await page.screenshot({ path: path.join(OUTPUT, filename) });
}

(async () => {
    fs.mkdirSync(OUTPUT, { recursive: true });
    const browser = await chromium.launch({
        headless: false,
        executablePath: BRAVE,
        args: [
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
        ]
    });

    const errors = [];
    const failed = [];
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));

    // Mandatory first evaluation: bespoke kit with the old background plate disabled.
    await page.goto(`${ROOT}?shot=overview&static=1`, { waitUntil: 'domcontentloaded' });
    await waitReady(page);
    const overview = await snapshot(page);
    assert(overview.backplate === false, 'no-backplate proof accidentally enabled the old plate');
    assert(overview.components.columns === 4, 'column kit was not initialized');
    assert(overview.components.arch === 1, 'arch kit was not initialized');
    assert(overview.components.bridgeModules === 3, 'bridge kit variants were not initialized');
    assert(overview.components.portal === 1, 'portal kit was not initialized');
    assert(overview.materials.join('|') === 'STONE_PRIMARY|STONE_DAMAGED|GOLD_AGED|CYAN_EMISSIVE',
        'material family names do not match the locked art kit');
    await page.screenshot({ path: path.join(OUTPUT, 'art-kit-no-backplate.png') });

    await captureShot(page, 'column', 'art-kit-column.png');
    await captureShot(page, 'arch', 'art-kit-arch.png');
    await captureShot(page, 'bridge', 'art-kit-bridge.png');
    await captureShot(page, 'portal', 'art-kit-portal.png');

    // Frame-only check: architecture must remain legible with every energy effect disabled.
    await page.evaluate(() => window.__mathquestArtKit.setEnergy(false));
    await sleep(320);
    const frameOnly = await snapshot(page);
    assert(frameOnly.energy === false, 'portal frame-only mode did not disable energy');
    await page.evaluate(() => {
        window.__mathquestArtKit.setEnergy(true);
        window.__mathquestArtKit.setShot('overview');
        window.__mathquestArtKit.setBackplate(true);
    });
    await sleep(520);
    const comparison = await snapshot(page);
    assert(comparison.backplate === true, 'background comparison did not enable the approved plate');
    await page.evaluate(() => window.__mathquestArtKit.setBackplate(false));
    await sleep(320);
    await page.screenshot({ path: path.join(OUTPUT, 'art-kit-full.png') });

    // Visible, non-recording performance run.
    await page.evaluate(() => {
        window.__mathquestArtKit.setBackplate(false);
        window.__mathquestArtKit.restart();
    });
    await sleep(4200);
    const performance = await snapshot(page);
    assert(performance.performance.fps >= 50, `visible FPS ${performance.performance.fps.toFixed(1)} is below 50`);
    assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
    assert(failed.length === 0, `failed requests: ${failed.join(' | ')}`);
    await page.close();
    await context.close();

    // Separate clean recording so the final file contains one uninterrupted 8–12 second traversal.
    const videoContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        recordVideo: { dir: TEMP_VIDEO, size: { width: 1280, height: 800 } }
    });
    const videoPage = await videoContext.newPage();
    const video = videoPage.video();
    const videoErrors = [];
    videoPage.on('console', message => { if (message.type() === 'error') videoErrors.push(message.text()); });
    videoPage.on('pageerror', error => videoErrors.push(error.message));
    await videoPage.goto(ROOT, { waitUntil: 'domcontentloaded' });
    await waitReady(videoPage);
    await videoPage.waitForFunction(() => window.__mathquestArtKit.snapshot().finished === true, null, { timeout: 14000 });
    await sleep(260);
    const end = await snapshot(videoPage);
    assert(end.elapsed >= 8 && end.elapsed <= 12, `showcase duration ${end.elapsed.toFixed(2)}s is outside 8–12s`);
    assert(videoErrors.length === 0, `video console errors: ${videoErrors.join(' | ')}`);
    await videoPage.close();
    await videoContext.close();
    const recordedPath = await video.path();
    fs.copyFileSync(recordedPath, path.join(OUTPUT, 'mathquest-art-kit-v1.webm'));

    const results = { overview, frameOnly, performance, end, errors, failed, videoErrors };
    fs.writeFileSync(path.join(OUTPUT, 'mathquest-art-kit-v1-metrics.json'), `${JSON.stringify(results, null, 2)}\n`);
    await browser.close();

    console.log('PASS: bespoke MathQuest art kit showcase, no-backplate proof, frame-only portal, performance, and capture');
    console.log(JSON.stringify({ performance: performance.performance, duration: end.elapsed, routeLength: end.routeLength }));
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
