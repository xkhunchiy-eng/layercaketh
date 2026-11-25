import os
d = os.path.dirname(os.path.abspath(__file__))
r = lambda p: open(os.path.join(d, p), encoding='utf-8').read()
t = r('src/template.html')
for k, p in [('CSS', 'src/style.css'), ('CORE', 'src/core.js'), ('MINI', 'src/minigames.js'), ('SHARED', 'src/shared.js'), ('GAME', 'src/game.js'), ('AUDIO', 'src/audio.js'), ('NET', 'src/net.js'), ('RENDER', 'src/render.js'), ('GL3D', 'src/gl3d.js'), ('MODELLOAD', 'src/modelload.js'), ('ICONS', 'src/icons.js'), ('CAKE3D', 'src/cake3d.js'), ('ITEMS3D', 'src/items3d.js'), ('INVVIEW', 'src/invview.js'), ('UI', 'src/ui.js')]:
    t = t.replace('{{%s}}' % k, r(p).replace('</script>', '<\\/script>'))
import base64
ff = ''
for fam, fn in (('TAGBA', 'assets/pixel.ttf'), ('TAGBAMini', 'assets/pixelmini.ttf')):
    fp = os.path.join(d, fn)
    if os.path.exists(fp):
        ff += '@font-face{font-family:"%s";src:url(data:font/ttf;base64,%s) format("truetype");font-weight:100 900;font-style:normal}\n' % (fam, base64.b64encode(open(fp, 'rb').read()).decode())
t = t.replace('/*FONTFACE*/', ff)
pa, pj = os.path.join(d, 'assets/pattern_atlas.png'), os.path.join(d, 'assets/pattern.json')
if os.path.exists(pa) and os.path.exists(pj): t = t.replace('{{PATSPR}}', '{{PATSPR}}window.PATSPR={img:"data:image/png;base64,%s",s:%s};' % (base64.b64encode(open(pa, 'rb').read()).decode(), open(pj).read()))
pa2 = [os.path.join(d, 'assets/portrait%d.png' % i) for i in range(4)]
if all(os.path.exists(x) for x in pa2): t = t.replace('{{PATSPR}}', 'window.PORTART=[%s];' % ','.join('"data:image/png;base64,%s"' % base64.b64encode(open(x, 'rb').read()).decode() for x in pa2) + '{{PATSPR}}')
t = t.replace('{{PATSPR}}', '')
gp = os.path.join(d, 'assets/char.glb')   # ถ้ามีไฟล์ตัวละครที่ปั้นเอง จะฝังลงในเกมให้อัตโนมัติ
t = t.replace('{{CHARGLB}}', ('window.CHAR_GLB="%s";' % base64.b64encode(open(gp, 'rb').read()).decode()) if os.path.exists(gp) else '')
t = t.replace('{{CAKEWS}}', ('window.CAKE_WS=%s;' % repr(os.environ['CAKE_WS'])) if os.environ.get('CAKE_WS') else '')
os.makedirs(os.path.join(d, 'dist'), exist_ok=True)
VER = '1.0.0'
rel = t.replace('{{VER}}', VER).replace('</style>', '.devbtn{display:none!important}</style>', 1)   # รุ่นปล่อยจริง: ซ่อนปุ่มทดสอบ/เล่นคนเดียว
dbg = t.replace('{{VER}}', VER + ' DEBUG')                                                         # รุ่นแก้บั๊ก: มีปุ่มทดสอบครบ
open(os.path.join(d, 'dist/index.html'), 'w', encoding='utf-8').write(rel)
open(os.path.join(d, 'dist/debug.html'), 'w', encoding='utf-8').write(dbg)
print('built', len(rel), 'bytes (release) +', len(dbg), 'debug')
