const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  p.on('console', m => { if (m.text().startsWith('CLK')) console.log(m.text()); });
  await p.goto('file:///tmp/claude-0/d.html#'+process.argv[2]); await p.waitForTimeout(3500);
  for (let i=0;i<6;i++){ await p.mouse.click(300+i*100,500); await p.waitForTimeout(300);} await b.close(); })();
