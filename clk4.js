const { chromium } = require('playwright'); const { PNG } = require('pngjs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  p.on('console', m => { if (m.text().startsWith('CLK')) console.log(m.text()); });
  await p.goto('file:///tmp/claude-0/d.html#shoot'); await p.waitForTimeout(3500);
  for (let i=0;i<8;i++){ const buf=await p.screenshot(); const png=PNG.sync.read(buf); let sx=0,sy=0,n=0;
    for(let y=300;y<700;y++)for(let x=0;x<1200;x++){const k=(y*1200+x)*4,r=png.data[k],g=png.data[k+1],bb=png.data[k+2]; if(r>200&&g<110&&bb<130&&bb>60){sx+=x;sy+=y;n++;}}
    if(n>30){ console.log('target px',(sx/n)|0,(sy/n)|0,n); await p.mouse.click(sx/n,sy/n);} await p.waitForTimeout(150);} await b.close(); })();
