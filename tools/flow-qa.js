const { chromium } = require('playwright');
async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function hold(page,key,ms){await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);}

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1100,height:700}});
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push('[console.error] '+m.text());});
  page.on('pageerror',e=>errors.push('[pageerror] '+e.message));

  try {
    await page.goto('http://localhost:8080',{waitUntil:'networkidle'});
    await sleep(800);
    await page.waitForSelector('#start-btn',{state:'visible',timeout:10000});
    await page.click('#start-btn');
    await sleep(1400);

    // 1. start → PLAYING
    const initialState = await page.evaluate(()=>window.game.state);
    if(initialState !== 'playing'){console.error('FAIL: 1. start → PLAYING, got:', initialState); process.exit(1);}
    console.log('1. start → PLAYING: PASS');

    // Teleport player just left of the door, aligned to the door gap (row 4)
    await page.evaluate(()=>{ window.game.player.x = 635; window.game.player.y = 230; });
    await sleep(400);

    // 2. closed door physically blocks crossing BEFORE opening challenge
    await page.keyboard.press('ArrowUp');
    await sleep(700);
    const afterWrong = await page.evaluate(()=>({lives:window.game.lives,score:window.game.score,doorState:window.game.door.state,isBlocking:window.game.door.isBlocking()}));
    if(afterWrong.lives !== 2 || afterWrong.score !== 0 || afterWrong.doorState !== 'locked' || afterWrong.isBlocking !== true){console.error('FAIL: 2. closed door blocks crossing, got:', afterWrong); process.exit(1);}
    console.log('2. closed door blocks crossing: PASS');

    // 3. challenge opens
    if(window.game.state !== 'challenge'){console.error('FAIL: 3. challenge opens, got:', window.game.state); process.exit(1);}
    console.log('3. challenge opens: PASS');

    // 4. wrong A: lives === 2 score === 0 door.state === locked, blocking === true
    if(afterWrong.lives !== 2 || afterWrong.score !== 0){console.error('FAIL: 4. wrong A: lives/score, got:', afterWrong); process.exit(1);}
    console.log('4. wrong A: lives=2 score=0 locked: PASS');

    // retry challenge opens
    await page.keyboard.press('ArrowUp');
    await sleep(700);
    if(window.game.state !== 'challenge'){console.error('FAIL: 5. retry challenge opens, got:', window.game.state); process.exit(1);}
    console.log('5. retry challenge opens: PASS');

    // 6. correct answer (B)
    await page.keyboard.press('b');
    await sleep(2200);
    const afterCorrect = await page.evaluate(()=>({score:window.game.score,doorState:window.game.door.state,isBlocking:window.game.door.isBlocking()}));
    if(afterCorrect.score !== 100){console.error('FAIL: 6. correct B: score=100, got:', afterCorrect.score); process.exit(1);}
    if(afterCorrect.doorState !== 'open'){console.error('FAIL: 6. correct B: door open, got:', afterCorrect.doorState); process.exit(1);}
    if(afterCorrect.isBlocking !== false){console.error('FAIL: 6. correct B: isBlocking=false, got:', afterCorrect.isBlocking); process.exit(1);}
    console.log('6. correct B: score=100 exactly once, door open, not blocking: PASS');

    // 7. door eventually: state === open, isBlocking() === false
    await sleep(1500); // let UNLOCKING -> OPEN finish
    if(window.game.door.state !== 'open'){console.error('FAIL: 7. door state open, got:', window.game.door.state); process.exit(1);}
    if(window.game.door.isBlocking() !== false){console.error('FAIL: 7. isBlocking false, got:', window.game.door.isBlocking()); process.exit(1);}
    console.log('7. door: state=open, isBlocking=false: PASS');

    // 8. player can cross after OPEN
    await hold(page,'d',3000); // cross open door
    await hold(page,'s',1800); // go down toward goal row
    await hold(page,'d',1200); // go right to goal
    await sleep(900);
    const canCross = await page.evaluate(()=>{const d=window.game.goal;return d.activated});
    if(!canCross){console.error('FAIL: 8. player can cross after OPEN'); process.exit(1);}
    console.log('8. player can cross after OPEN: PASS');

    // 9. goal activates
    if(!canCross){console.error('FAIL: 9. goal activates'); process.exit(1);}
    console.log('9. goal activates: PASS');

    // 10. game reaches VICTORY
    if(window.game.state !== 'victory'){console.error('FAIL: 10. victory, got:', window.game.state); process.exit(1);}
    console.log('10. victory: PASS');

    // 11. JUGAR DE NUEVO → START
    const box = await page.evaluate(()=>{const r=document.querySelector('#game').getBoundingClientRect();return{x:r.x,y:r.y,w:r.height};});
    await page.mouse.click(box.x+box.w*0.5, box.y+box.h*0.60);
    await sleep(1300);
    if(window.game.state !== 'start'){console.error('FAIL: 11. JUGAR DE NUEVO → START, got:', window.game.state); process.exit(1);}
    console.log('11. JUGAR DE NUEVO → START: PASS');

    // 12. second run: CLEAN RESET lives=3 score=0, door=locked
    const startBtn = await page.evaluate(()=>!!document.querySelector('#start-btn'));
    if(startBtn){
      await page.click('#start-btn');
      await sleep(1400);
      const s=await page.evaluate(()=>({lives:window.game.lives,score:window.game.score,doorState:window.game.door.state}));
      if(s.lives !== 3 || s.score !== 0 || s.doorState !== 'locked'){console.error('FAIL: 12. second run: lives=3 score=0 CLEAN RESET, got:', s); process.exit(1);}
    }
    console.log('12. second run: lives=3 score=0 CLEAN RESET: PASS');

    // 13. no NaN / Infinity
    const sanity = await page.evaluate(()=>({px:isFinite(window.game.player.x),py:isFinite(window.game.player.y),parts:window.game.particles.length}));
    if(!sanity.px || !sanity.py){console.error('FAIL: 13. no NaN / Infinity in player pos'); process.exit(1);}
    console.log('13. no NaN / Infinity: PASS');

    // 14. no console errors/page errors
    if(errors.length>0){console.error('FAIL: 14. console/page errors exist:', errors); process.exit(1);}
    console.log('14. no console/page errors: PASS');

    console.log('\n=== ALL 14 FLOW ASSERTIONS PASSED ===');
  } finally {
    await browser.close();
  }
})();