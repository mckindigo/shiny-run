// Quick tuning harness: runs N races per track with B bots (no rendering) and prints race timings + stuck/nudge counts.
const puppeteer = require('puppeteer-core'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots', 'test'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { fs.readFile(path.join(root, 'index.html'), (e, d) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(d); }); }).listen(0);
const B = +(process.argv[2] || 150), N = +(process.argv[3] || 1), shots = process.argv[4] === 'shots';
(async () => {
  await new Promise(r => srv.once('listening', r));
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:' + srv.address().port + '/?test=1&connect=0&bots=' + B);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => document.fonts.ready); await page.evaluate(() => SR.manual(true));
  const snap = async n => { const d = await page.evaluate(() => { SR.render(); return document.getElementById('c').toDataURL('image/png'); }); fs.writeFileSync(path.join(out, n + '.png'), Buffer.from(d.split(',')[1], 'base64')); };
  for (const tr of ['rooftop', 'sewer', 'junkyard']) for (let i = 0; i < N; i++) {
    const r = await page.evaluate(async (tr, shots) => {
      SR.setPhase('lobby'); SR.G.lobby.trackId = tr; SR.step(SR.settings.lobby * 0.75); const players = SR.G.lobby.players.size; SR.G.t = 0.01; SR.step(0.02);
      const R = SR.G.R, t0 = performance.now(); let k = 0; const marks = {};
      while (SR.G.phase === 'race' && R.t < 130) { SR.step(0.5); k++; for (const f of [0.25, 0.5, 0.75]) if (!marks[f] && R.leadFrac >= f) marks[f] = R.t.toFixed(1); }
      const ms = performance.now() - t0; const secs = R.T.sections.map(s => s.k + ':' + Math.round(s.y0)).join(' ');
      return { secs, tr, players, first: R.finished[0] && R.finished[0].time.toFixed(1), fin: R.finished.length, total: R.total, end: R.doneT.toFixed(1), msPerSimSec: (ms / R.t).toFixed(1), marks, nudges: R.racers.reduce((a, r) => a + r.nudges, 0), events: R.events.join(' | '), stuck: R.racers.filter(r => r.state === 'run').map(r => Math.round(r.x) + ',' + Math.round(r.y)).slice(0, 8) };
    }, tr, shots);
    console.log(JSON.stringify(r));
    if (shots) { await page.evaluate(() => { const R = SR.G.R; const run = R.racers.filter(r => r.state === 'run'); if (run.length) R.camY = run[Math.floor(run.length / 2)].y - 500; SR.G.phase = 'race'; }); await snap('stuck-' + tr); await page.evaluate(() => { SR.G.phase = 'results'; }); }
  }
  if (shots) {
    for (const tr of ['rooftop', 'sewer', 'junkyard']) {
      await page.evaluate(tr => { SR.setPhase('lobby'); SR.G.lobby.trackId = tr; SR.step(SR.settings.lobby * 0.75); SR.G.t = 0.01; SR.step(0.02); SR.step(12); }, tr);
      await snap('tune-' + tr + '-12'); await page.evaluate(() => SR.step(15)); await snap('tune-' + tr + '-27');
    }
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
