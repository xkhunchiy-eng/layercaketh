const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto('file:///home/claude/cakeparty/dist/index.html#' + id); await p.waitForTimeout(3500);
  for (let y=350;y<700;y+=60) for(let x=100;x<1100;x+=90){ await p.mouse.click(x,y); }
  await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/claude-0/c_' + id + '.png', clip:{x:0,y:180,width:500,height:120} });
  await b.close();
})();
