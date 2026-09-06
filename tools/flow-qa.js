const { chromium } = require('playwright');
async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function hold(page,key,ms){await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);}

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1100,height:700}});
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push('[console] '+m.text());});
  page.on('pageerror',e=>errors.push('[pageerror] '+e.message));

  await page.goto('http://localhost:8080',{waitUntil:'networkidle'});
  await sleep(800);
  await page.waitForSelector('#start-btn',{state:'visible',timeout:10000});
  await page.click('#start-btn');
  await sleep(1400);
  console.log('1. state:',await page.evaluate(()=>window.game.state));

  // Teleport player just left of the door, aligned to the door gap (row 4)
  await page.evaluate(()=>{ window.game.player.x = 635; window.game.player.y = 230; });
  await sleep(400);

  // Interact (Up) -> challenge should open
  await page.keyboard.press('ArrowUp');
  await sleep(700);
  console.log('2. challenge open:',await page.evaluate(()=>window.game.state==='challenge'));

  // Wrong answer (A)
  await page.keyboard.press('a');
  await sleep(1200);
  const afterWrong = await page.evaluate(()=>({lives:window.game.lives,score:window.game.score,door:window.game.door.state}));
  console.log(`3. WRONG -> lives=${afterWrong.lives} score=${afterWrong.score} door=${afterWrong.door} (expect 2,0,locked)`);
  await sleep(500);

  // Re-interact for retry
  await page.keyboard.press('ArrowUp');
  await sleep(700);
  console.log('4. retry open:',await page.evaluate(()=>window.game.state==='challenge'));

  // Correct answer (B)
  await page.keyboard.press('b');
  await sleep(2200);
  const afterCorrect = await page.evaluate(()=>({score:window.game.score,door:window.game.door.state,blocking:window.game.door.isBlocking()}));
  console.log(`5. CORRECT -> score=${afterCorrect.score} door=${afterCorrect.door} blocking=${afterCorrect.blocking} (expect 100,open,false)`);

  // Move through door to goal (wait for door OPEN, then cross, then go down-right to goal at row 7)
  await sleep(1500);               // let UNLOCKING -> OPEN finish
  await hold(page,'d',3000);       // cross open door
  await hold(page,'s',1800);       // go down toward goal row
  await hold(page,'d',1200);       // go right to goal
  await sleep(900);
  console.log('6. goal.activated:',await page.evaluate(()=>window.game.goal.activated));
  await sleep(900);
  console.log('7. victory:',await page.evaluate(()=>window.game.state==='victory'));

  // SECOND PLAYTHROUGH: click JUGAR DE NUEVO
  const box = await page.evaluate(()=>{const r=document.querySelector('#game').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
  await page.mouse.click(box.x+box.w*0.5, box.y+box.h*0.60);
  await sleep(1300);
  console.log('8. after JUGAR DE NUEVO -> state:',await page.evaluate(()=>window.game.state));

  const startBtn = await page.evaluate(()=>!!document.querySelector('#start-btn'));
  if(startBtn){
    await page.click('#start-btn');
    await sleep(1400);
    const s=await page.evaluate(()=>({lives:window.game.lives,score:window.game.score}));
    console.log(`9. second run -> lives=${s.lives} score=${s.score} (expect 3,0)`);
  }

  console.log('\n=== ERRORS ===');
  if(errors.length===0)console.log('(none)');
  else errors.forEach(e=>console.log('ERROR:',e));

  console.log('Sanity:',await page.evaluate(()=>({px:isFinite(window.game.player.x),py:isFinite(window.game.player.y),parts:window.game.particles.length})));

  await browser.close();
  process.exit(errors.length?1:0);
})();