const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[console.error] ' + msg.text());
  });
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message));
  
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  await sleep(1000);
  
  // Wait for start screen to be visible
  await page.waitForSelector('#start-btn', { state: 'visible', timeout: 10000 });
  
  // 1. Start screen
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-start-screen.png'), fullPage: true });
  console.log('Screenshot: 01-start-screen.png');
  
  // Click start
  await page.click('#start-btn');
  await sleep(1000);
  
  // 2. Start zone / gameplay entry
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-start-zone.png'), fullPage: true });
  console.log('Screenshot: 02-start-zone.png');
  
  // 3. Normal gameplay - move right a bit
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(40);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-gameplay-normal.png'), fullPage: true });
  console.log('Screenshot: 03-gameplay-normal.png');
  
  // 4. Math Explorer closeup
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-math-explorer.png'), fullPage: true });
  console.log('Screenshot: 04-math-explorer.png');
  
  // Move to door
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(40);
  }
  await sleep(300);
  
  // 5. Door LOCKED
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-door-locked.png'), fullPage: true });
  console.log('Screenshot: 05-door-locked.png');
  
  // Try to interact with door (Up)
  await page.keyboard.press('ArrowUp');
  await sleep(600);
  
  // 6. Challenge open
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-challenge.png'), fullPage: true });
  console.log('Screenshot: 06-challenge.png');
  
  // 7. Incorrect answer (A)
  await page.keyboard.press('a');
  await sleep(1200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-incorrect.png'), fullPage: true });
  console.log('Screenshot: 07-incorrect.png');
  
  // Wait for challenge to close and return to playing
  await sleep(500);
  
  // Go back to door
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(40);
  }
  await page.keyboard.press('ArrowUp');
  await sleep(600);
  
  // 8. Challenge again - correct answer (B)
  await page.keyboard.press('b');
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-correct.png'), fullPage: true });
  console.log('Screenshot: 08-correct.png');
  
  // 9. UNLOCKING
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-unlocking.png'), fullPage: true });
  console.log('Screenshot: 09-unlocking.png');
  
  // 10. Door OPEN
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-door-open.png'), fullPage: true });
  console.log('Screenshot: 10-door-open.png');
  
  // Move through door to goal
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(40);
  }
  await sleep(500);
  
  // 11. Goal zone
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-goal-zone.png'), fullPage: true });
  console.log('Screenshot: 11-goal-zone.png');
  
  // 12. Victory
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-victory.png'), fullPage: true });
  console.log('Screenshot: 12-victory.png');
  
  // Play again
  await page.keyboard.press('Enter');
  await sleep(1000);
  await page.click('#start-btn');
  await sleep(1000);
  
  // Second playthrough quick check
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(30);
  }
  await page.keyboard.press('ArrowUp');
  await sleep(600);
  await page.keyboard.press('b');
  await sleep(2000);
  
  // Check second run
  const secondRunOk = await page.evaluate(() => window.game?.lives === 3 && window.game?.score === 100);
  if(!secondRunOk){console.error('FAIL: second run: lives=3 score=100'); process.exit(1);}
  console.log('Second run: PASS');
  
  console.log('\n=== SCREENSHOTS CAPTURED ===');
  fs.readdirSync(SCREENSHOT_DIR).forEach(f => console.log('  ' + f));
  
  console.log('\n=== CONSOLE ERRORS ===');
  if(errors.length === 0){
    console.log('  (none)');
  } else {
    errors.forEach(e => console.log('  ERROR:', e));
    process.exit(1);
  }
  
  // Write error log
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'errors.txt'), errors.join('\n') || '(none)');
  
  console.log('\n=== ALL BROWSER QA CHECKS PASSED ===');
  await browser.close();
})();