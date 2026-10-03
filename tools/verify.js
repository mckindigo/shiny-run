// Headless verification (puppeteer-core + Chrome, same approach as Crow Race's tools/verify.js):
// full lobby -> race -> results loop in Test mode with 150 bots + real-time fps, !play counting via a stubbed Kick socket,
// snatch + Crow's Nest rescue both ways, chaos vote (pass + fail), leaderboard + bling persistence + reset, Test mode fully off,
// both themes (neutral: no "Croww" text but the credit), ?transparent=1, zero console errors.
// Test screenshots -> shots/test/ (gitignored). The reference shots are copied to shots/ (committed).
const puppeteer = require('puppeteer-core'), http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'shots', 'test'); fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(root, u === '/' ? 'index.html' : u), (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': 'text/html' }); r.end(d); } }); }).listen(0);
let URL0 = '';
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
const CREDIT = 'made by Croww \u00b7 kick.com/croww';
const errors = [];
// fake Kick/Pusher socket: answers the handshake, records subscriptions, lets the test push chat messages (with identity.color)
const STUB = () => {
  window.__subs = []; window.__socks = [];
  window.WebSocket = class { constructor(url) { this.url = url; this.readyState = 0; window.__socks.push(this); setTimeout(() => { this.readyState = 1; this.onmessage && this.onmessage({ data: JSON.stringify({ event: 'pusher:connection_established', data: '{}' }) }); }, 10); }
    send(s) { const m = JSON.parse(s); if (m.event === 'pusher:subscribe') { window.__subs.push(m.data.channel); setTimeout(() => this.onmessage({ data: JSON.stringify({ event: 'pusher_internal:subscription_succeeded', channel: m.data.channel }) }), 10); } }
    close() { this.readyState = 3; } };
  window.__kickPush = (user, content, color, badges) => { for (const s of window.__socks) if (s.readyState === 1) s.onmessage({ data: JSON.stringify({ event: 'App\\Events\\ChatMessageEvent', data: JSON.stringify({ content, sender: { username: user, identity: { color: color || null, badges: badges || [] } } }) }) }); };
  let a = 4242; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__texts = []; const P = CanvasRenderingContext2D.prototype; for (const k of ['fillText', 'strokeText']) { const f = P[k]; P[k] = function (s, ...r) { window.__texts.push(String(s)); return f.call(this, s, ...r); }; }
};
async function open(browser, q, clear, keepRealtime) {
  const page = await browser.newPage(); await page.evaluateOnNewDocument(STUB);
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(URL0 + (q || '')); if (clear) { await page.evaluate(() => localStorage.clear()); await page.goto(URL0 + (q || '')); }
  await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 300));
  if (!keepRealtime) await page.evaluate(() => SR.manual(true));
  return page;
}
const shot = async (page, name, keep) => {
  const d = await page.evaluate(() => { SR.render(); return document.getElementById('c').toDataURL('image/png'); });
  const f = path.join(out, name + '.png'); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
  if (keep) fs.copyFileSync(f, path.join(root, 'shots', name + '.png'));
  return f;
};
// step with rendering (needed for the instant-replay capture and the bling/sparkle animation)
const stepR = (p, sec) => p.evaluate(sec => { for (let i = 0; i < Math.round(sec * 30); i++) { SR.step(1 / 30, 1 / 60); SR.render(); } }, sec);

(async () => {
  await new Promise(r => srv.listening ? r() : srv.once('listening', r)); URL0 = 'http://localhost:' + srv.address().port + '/';
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  let s, p;

  // ---------- 1. full loop in Test mode with 150 bots (croww theme) + screenshots + fps
  p = await open(browser, '?test=1&bots=150&theme=croww', true);
  s = await p.evaluate(() => ({ ph: SR.G.phase, sub: window.__subs.slice(), st: SR.Kick.status, bots: SR.settings.bots }));
  ok(s.ph === 'title', 'starts on the title screen');
  ok(s.sub[0] === 'chatrooms.962037.v2' && s.st === 'live', 'auto-connects to Croww chatroom 962037 by default (' + s.sub[0] + ', ' + s.st + ')');
  await p.evaluate(() => window.__texts = []); await shot(p, 'title');
  ok(await p.evaluate(c => window.__texts.includes(c), CREDIT), 'title shows the credit line');
  await p.evaluate(() => SR.step(5.1)); ok(await p.evaluate(() => SR.G.phase) === 'lobby', 'title -> lobby on its own');
  await p.evaluate(() => { SR.G.lobby.mood = 'furious'; SR.step(SR.settings.lobby - 6); window.__texts = []; });
  s = await p.evaluate(() => ({ n: SR.G.lobby.players.size, types: [...SR.G.lobby.players.values()].reduce((a, q) => (a[q.type] = (a[q.type] || 0) + 1, a), {}), t: SR.G.t }));
  ok(s.n === 150, '150 test bots joined the lobby with !play (' + JSON.stringify(s.types) + ')');
  console.log('  shot ' + await shot(p, 'lobby', true));
  ok(await p.evaluate(c => window.__texts.includes(c), CREDIT), 'lobby shows the credit line');
  ok(await p.evaluate(() => window.__texts.some(t => /FURIOUS/.test(t))), 'lobby announces the crow mood');
  await p.evaluate(() => SR.step(6.1)); ok(await p.evaluate(() => SR.G.phase) === 'race', 'lobby countdown -> race');
  s = await p.evaluate(() => ({ total: SR.G.R.total, track: SR.G.R.T.def.name, sameStats: new Set(SR.G.R.racers.map(r => r.type)).size }));
  ok(s.total === 150, 'race has 150 racers on ' + s.track);
  // staggered drops
  s = await p.evaluate(() => { SR.step(3.05); const a = SR.G.R.racers.filter(r => r.state === 'run').length; SR.step(1); const b = SR.G.R.racers.filter(r => r.state === 'run').length; SR.step(4); return [a, b, SR.G.R.racers.filter(r => r.state === 'run').length]; });
  ok(s[0] < 40 && s[1] > s[0] && s[2] === 150, 'drops are staggered (' + s.join(' -> ') + ' racers on track)');
  // real-time fps with 150 racers (the actual rAF loop: physics + render)
  await p.evaluate(() => SR.step(1.5)); await stepR(p, 0.5);
  console.log('  shot ' + await shot(p, 'race', true));
  // baseline: an empty canvas rAF loop in this same headless Chrome (software raster, no vsync GPU), for comparison
  const bp = await browser.newPage(); await bp.setViewport({ width: 1920, height: 1080 }); await bp.setContent('<canvas id=c width=1920 height=1080></canvas>');
  const base = await bp.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(), c = document.getElementById('c').getContext('2d'); (function f(now) { c.fillStyle = n % 2 ? '#111' : '#222'; c.fillRect(0, 0, 1920, 1080); n++; if (now - t0 < 5000) requestAnimationFrame(f); else res(n / ((now - t0) / 1000)); })(t0); }));
  await bp.close(); await p.bringToFront();
  await p.evaluate(() => { SR.manual(false); SR.PERF.reset(); });
  await new Promise(r => setTimeout(r, 10000));
  const perf = await p.evaluate(() => { const st = SR.PERF.stats(); SR.manual(true); st.running = SR.G.R.racers.filter(r => r.state === 'run').length; st.t = SR.G.R.t; return st; });
  console.log(`  real-time (10s of race, ${perf.running} racers on track at the end): ${perf.fps.toFixed(1)} fps (empty-page baseline in this headless Chrome: ${base.toFixed(1)} fps), median frame ${perf.p50.toFixed(1)} ms, ${perf.long} frames over 25 ms; work per frame: update ${perf.upd.toFixed(2)} ms + render ${perf.ren.toFixed(2)} ms`);
  ok(perf.fps > 55 && perf.p50 < 17.5 && perf.upd + perf.ren < 8, 'steady frame rate with 150 racers (' + perf.fps.toFixed(1) + ' fps, ' + (perf.upd + perf.ren).toFixed(1) + ' ms of work per 16.7 ms frame)');
  globalThis.PERF_RESULT = { fps: perf.fps, base, work: perf.upd + perf.ren };
  // tags: only top 5 (+ chat highlights)
  // the crow: wait for the first snatch (furious = 2), render while it happens so the instant replay is captured
  s = await p.evaluate(() => { for (let i = 0; i < 60 * 40; i++) { SR.step(1 / 60); if (/warn/.test(SR.G.R.crow.state)) return SR.G.R.crow.state; } return SR.G.R.crow.state; });
  ok(s === 'warn', 'the crow warns (shadow + CAW!) before a snatch');
  await p.evaluate(() => window.__texts = []); await stepR(p, 0.6);
  ok(await p.evaluate(() => window.__texts.includes('CAW!')), 'CAW! is on screen during the warning');
  await shot(p, 'caw');
  s = await p.evaluate(() => { for (let i = 0; i < 300 && !SR.G.R.card; i++) { SR.step(1 / 30, 1 / 60); SR.render(); } return { card: !!SR.G.R.card, name: SR.G.R.card && SR.G.R.card.name, st: SR.G.R.card && SR.G.R.card.r.state }; });
  ok(s.card && s.st === 'nest', 'SNATCHED card shows and the racer goes to the Crow\'s Nest (' + s.name + ')');
  await stepR(p, 0.75);
  s = await p.evaluate(() => ({ rp: !!SR.G.R.replay, frames: SR.G.R.replay ? SR.G.R.replay.frames.length : 0, card: !!SR.G.R.card, nest: !!SR.G.R.nest }));
  ok(s.rp && s.frames > 20, 'instant replay picture-in-picture plays (' + s.frames + ' frames captured)');
  console.log('  shot ' + await shot(p, 'snatch', true));
  // finish the race (bots !caw on their own)
  const ev = await p.evaluate(() => { while (SR.G.phase === 'race') SR.step(0.25); return SR.G.R.events; });
  console.log('  events this race: ' + ev.join(' | '));
  s = await p.evaluate(() => ({ ph: SR.G.phase, res: SR.G.result, top: SR.topBoard(3) }));
  ok(s.ph === 'results' && s.res.podium.length === 3, 'race -> results with a podium: ' + s.res.podium.map(q => q.u + ' +' + q.pts).join(', ') + ' (' + s.res.finishers + '/' + s.res.total + ' finished, winner ' + s.res.time.toFixed(1) + 's)');
  ok(s.res.podium[0].pts === 11 && s.res.podium[1].pts === 7 && s.res.podium[2].pts === 5, 'points 10/6/4 + 1 for finishing');
  ok(s.res.blingUp && s.res.blingUp.level === 1, 'the winner earned bling level ' + (s.res.blingUp && s.res.blingUp.level));
  await stepR(p, 1);
  console.log('  shot ' + await shot(p, 'results', true));
  const winner = s.res.podium[0].key;
  s = await p.evaluate(() => { SR.step(SR.DATA.phase.results + 0.1); return SR.G.phase; });
  ok(s === 'lobby', 'results -> next lobby automatically');
  // several more races: durations + the loop keeps going
  const races = await p.evaluate(() => { const out = []; for (let k = 0; k < 3; k++) { SR.step(SR.settings.lobby + 0.1); const R = SR.G.R; while (SR.G.phase === 'race') SR.step(0.5); out.push({ track: R.T.id, mood: R.moodId, winner: R.finished[0] ? +R.finished[0].time.toFixed(1) : null, end: +R.doneT.toFixed(1), fin: R.finished.length, events: R.events.filter(e => /SNATCHED|RESCUED|OUT|VOTE|WIND|QUAKE|NOT ENOUGH|NO GEMS/.test(e)).map(e => e.split(':')[0]) }); SR.step(SR.DATA.phase.results + 0.1); } return out; });
  for (const r of races) console.log('  race: ' + JSON.stringify(r));
  ok(races.every(r => r.end >= 45 && r.end <= 100 && r.winner), 'races last ' + races.map(r => r.end + 's').join(', ') + ' (winners at ' + races.map(r => r.winner + 's').join(', ') + ')');
  // bling persists + shows up in a later race
  const before = await p.evaluate(() => JSON.stringify({ b: SR.topBoard(10), l: SR.bling }));
  await p.reload(); await p.evaluate(() => SR.manual(true));
  s = await p.evaluate(() => JSON.stringify({ b: SR.topBoard(10), l: SR.bling }));
  ok(s === before, 'leaderboard + bling survive a reload (localStorage)');
  s = await p.evaluate(w => { SR.step(5.1); window.__kickPush(w, '!play gem'); SR.step(SR.settings.lobby + 0.1); const r = SR.G.R.byKey.get(w); return r && r.bling; }, winner);
  ok(s >= 1, 'winner\'s trinket carries bling (level ' + s + ') in the next race');
  // pause
  s = await p.evaluate(() => { SR.setPaused(true); const t = SR.G.R.t; SR.step(3); const t2 = SR.G.R.t; SR.render(); SR.setPaused(false); return [t, t2]; });
  ok(s[0] === s[1], 'pause freezes the game');
  await p.keyboard.press('p'); ok(await p.evaluate(() => SR.G.paused), 'P key pauses'); await p.keyboard.press('p');
  await p.keyboard.press('n'); ok(await p.evaluate(() => SR.G.phase) === 'results', 'N key skips (race called -> results)');
  await p.keyboard.press('s'); ok(await p.evaluate(() => !document.getElementById('settings').classList.contains('hidden')), 'S key opens Settings'); await p.keyboard.press('s');
  // Test mode off: bots gone everywhere
  s = await p.evaluate(() => { SR.setTestMode(false); while (SR.G.phase !== 'lobby') SR.step(0.5); SR.step(SR.settings.lobby - 1); return { players: SR.G.lobby.players.size, board: Object.keys(SR.board).filter(k => SR.board[k].bot).length, bling: Object.keys(SR.bling).filter(k => SR.bling[k].bot).length }; });
  ok(s.players === 0 && s.board === 0 && s.bling === 0, 'Test mode off: no bot racers in a full lobby, bot board + bling rows removed (' + JSON.stringify(s) + ')');
  await p.close();

  // ---------- 2. stubbed Kick socket: !play counting
  p = await open(browser, '?test=0', true);
  s = await p.evaluate(() => {
    window.__kickPush('early', '!play'); const early = SR.G.lobby ? SR.G.lobby.players.size : 0;   // title screen: not open yet
    SR.step(5.1);
    window.__kickPush('alice', '!play', '#FF0000'); window.__kickPush('bob', '!play coin'); window.__kickPush('bob', '!play gem');   // bob switches trinket
    window.__kickPush('carl', '!PLAY ring', '#00FF88'); window.__kickPush('dana', 'hello chat'); window.__kickPush('eve', 'play'); window.__kickPush('alice', '!play');
    window.__kickPush('subfan', '!play', null, [{ type: 'subscriber', text: 'Subscriber' }]);   // subscriber badge: counted exactly like anyone else
    window.__kickPush('frank', '!play banana');
    const L = SR.G.lobby, g = k => L.players.get(k);
    return { early, n: L.players.size, alice: g('alice').color, bob: g('bob').type, carl: [g('carl').type, g('carl').color], subfan: !!g('subfan'), frank: g('frank') && SR.DATA.types.includes(g('frank').type), msgs: SR.Kick.msgs, status: SR.Kick.status };
  });
  ok(s.status === 'live' && s.msgs === 10, 'stub socket delivered ' + s.msgs + ' chat messages through the real Kick reader');
  ok(s.early === 0, '!play before the lobby opens is ignored');
  ok(s.n === 5 && s.bob === 'gem' && s.carl[0] === 'ring' && s.subfan && s.frank, '!play counted ' + s.n + ' racers (one per chatter, !play gem switches, case-insensitive, bad type -> random, non-commands ignored)');
  ok(s.alice === '#FF0000' && s.carl[1] === '#00FF88', 'Kick name color (identity.color) tints the trinket');
  s = await p.evaluate(() => { SR.step(SR.settings.lobby + 0.1); window.__kickPush('late', '!play'); return { ph: SR.G.phase, n: SR.G.R.total, late: SR.G.R.byKey.has('late') }; });
  ok(s.ph === 'race' && s.n === 5 && !s.late, '!play during a race is ignored');
  await p.close();

  // ---------- 3. snatch + rescue both ways, chaos vote (stubbed chat, no bots)
  p = await open(browser, '?test=0&connect=1', true);
  s = await p.evaluate(() => {
    SR.step(5.1); for (let i = 0; i < 40; i++) window.__kickPush('racer' + i, '!play'); SR.G.lobby.mood = 'lazy'; SR.step(SR.settings.lobby + 0.1);
    const R = SR.G.R; R.crow.plan = [2]; R.voteAt = null; SR.step(3 + 9);   // never auto-snatch; drops done
    const out = {};
    SR.startSnatch(R); out.need = Math.max(3, Math.ceil(0.15 * R.total));
    while (R.crow.state !== 'nest') SR.step(1 / 60);
    const victim = R.nest.r; out.victim = victim.u;
    for (let i = 0; i < 3; i++) window.__kickPush('spammer', '!caw');   // one chatter spamming counts once
    out.spam = R.nest.cawers.size;
    for (let i = 0; i < out.need - 1; i++) window.__kickPush('helper' + i, '!caw !caw');
    SR.step(0.05); out.rescued = R.nest && R.nest.state; while (R.crow.state !== 'idle') SR.step(1 / 60);
    out.back = victim.state; out.onTrack = !!victim.body;
    // second snatch: not enough !caw -> out
    R.crow.plan = [2, 2]; R.mood = Object.assign({}, R.mood, { snatches: 2 }); R.crow.cool = 0;
    SR.startSnatch(R); while (R.crow.state !== 'nest') SR.step(1 / 60);
    const v2 = R.nest.r; out.victim2 = v2.u; window.__kickPush('helper0', '!caw'); window.__kickPush('helper1', '!caw');
    SR.step(10.5); out.v2 = v2.state; out.v2cawers = 2;
    // chaos vote that passes (wind)
    SR.startVote(R); out.voteNeed = R.vote.need;
    for (let i = 0; i < 4; i++) window.__kickPush('w' + i, '!wind'); window.__kickPush('q0', '!quake'); window.__kickPush('w0', '!wind');
    const vx0 = R.racers.filter(r => r.state === 'run').reduce((a, r) => a + r.x, 0) / R.racers.filter(r => r.state === 'run').length;
    SR.step(10.05); out.vote = R.vote.state + ':' + R.vote.result; out.effect = R.effect && R.effect.k; const dir = R.effect && R.effect.dir;
    const vx = []; SR.step(1.5); for (const r of R.racers) if (r.state === 'run') vx.push(r.body.velocity.x);
    out.push = (vx.reduce((a, b) => a + b, 0) / vx.length) * dir;
    out.voteAgain = (() => { R.vote = null; R.voteAt = 0; SR.step(0.1); return !!R.vote; })();   // cooldown blocks a second vote right away
    return out;
  });
  ok(s.spam === 1, 'one chatter spamming !caw counts once');
  ok(s.rescued === 'rescued' && s.back === 'run' && s.onTrack, 'rescue works: ' + s.need + ' different chatters typed !caw -> ' + s.victim + ' dropped back on the track');
  ok(s.v2 === 'out', 'rescue fails with too few !caw (2/' + s.need + ' in 10s) -> ' + s.victim2 + ' is out');
  ok(s.vote === 'applied:wind' && s.effect === 'wind', 'chaos vote: !wind won (min ' + s.voteNeed + ' votes) and the wind effect applied');
  ok(s.push > 0.3, 'wind pushes racers sideways (avg velocity along the wind ' + s.push.toFixed(2) + ')');
  ok(!s.voteAgain, 'vote cooldown blocks another vote right away');
  s = await p.evaluate(() => {
    const R = SR.G.R; SR.G.lastVoteEnd = -1e9; SR.startVote(R); window.__kickPush('q1', '!quake'); SR.step(10.05); const fail = R.vote.state + ':' + !!R.effect;
    SR.G.lastVoteEnd = -1e9; SR.startVote(R); for (let i = 0; i < 5; i++) window.__kickPush('qq' + i, '!quake'); SR.step(10.05); const q = R.vote.state + ':' + R.vote.result; SR.step(0.3); return { fail, q, shake: R.shake > 0 };
  });
  ok(s.fail === 'fail:false', 'chaos vote below the minimum does nothing (' + s.fail + ')');
  ok(s.q === 'applied:quake' && s.shake, 'chaos vote: !quake shakes the track');
  // reset buttons
  s = await p.evaluate(() => { while (SR.G.phase === 'race') SR.step(0.5); const n0 = SR.topBoard().length, b0 = Object.keys(SR.bling).length; document.getElementById('bReset').click(); document.getElementById('bResetBling').click(); return { n0, b0, n1: SR.topBoard().length, b1: Object.keys(SR.bling).length, ls: localStorage.getItem('shinyrun.board.v1') }; });
  ok(s.n0 > 0 && s.b0 > 0 && s.n1 === 0 && s.b1 === 0 && s.ls === '{}', 'Reset leaderboard / Reset bling buttons clear them');
  await p.close();

  // ---------- 4. neutral theme: no "Croww" text anywhere on the canvas except the credit
  p = await open(browser, '?theme=neutral&test=1&bots=150', true);
  await p.evaluate(() => { window.__texts = []; SR.render(); });
  await shot(p, 'title-neutral');
  await p.evaluate(() => { localStorage.setItem('shinyrun.board.v1', JSON.stringify({ crowwfan99: { u: 'CrowwFan99', pts: 5, wins: 1, races: 1, t: 1 } })); SR.step(5.1); window.__kickPush('CrowwFan99', '!play'); SR.step(30); });
  await shot(p, 'lobby-neutral');
  await p.evaluate(() => { SR.step(SR.G.t + 0.1); SR.step(3 + 14); const r = SR.G.R.byKey.get('crowwfan99'); if (r) r.hl = 2; });
  await shot(p, 'race-neutral', true);
  await p.evaluate(() => { const R = SR.G.R; const v = R.byKey.get('crowwfan99'); if (v && v.state === 'run') { R.crow.state = 'idle'; R.crow.cool = 0; R.crow.idx = 0; } });
  await p.evaluate(() => { const R = SR.G.R; SR.startSnatch(R); for (let i = 0; i < 200 && !R.nest; i++) { SR.step(1 / 30, 1 / 60); SR.render(); } SR.startVote(R); SR.step(1); SR.render(); });
  await shot(p, 'snatch-neutral');
  await p.evaluate(() => { while (SR.G.phase !== 'results') { SR.step(0.5); } SR.render(); });
  await shot(p, 'results-neutral');
  await p.evaluate(() => { SR.G.paused = true; SR.render(); SR.G.paused = false; SR.toggleSettings(true); SR.toggleSettings(false); });
  s = await p.evaluate(c => { const all = [...new Set(window.__texts)]; return { bad: all.filter(t => /croww/i.test(t) && t !== c), credit: all.includes(c), title: document.title, theme: SR.theme, opt: document.getElementById('sTheme').textContent }; }, CREDIT);
  ok(s.theme === 'neutral' && s.credit, '?theme=neutral works and the credit still shows');
  ok(s.bad.length === 0, 'neutral theme: no "Croww" text on screen except the credit' + (s.bad.length ? ' -> ' + JSON.stringify(s.bad) : ''));
  ok(!/croww/i.test(s.title) && !/croww/i.test(s.opt), 'neutral page title + theme dropdown have no Croww (' + s.title + ')');
  await p.goto(URL0); await p.evaluate(() => SR.manual(true));
  ok(await p.evaluate(() => SR.theme) === 'neutral', 'theme choice saved in localStorage');
  await p.select('#sTheme', 'croww'); ok(await p.evaluate(() => SR.theme === 'croww' && localStorage.getItem('shinyrun.theme') === 'croww'), 'Settings dropdown switches back to croww live');
  await p.close();

  // ---------- 5. background: opaque by default, ?transparent=1 clears it
  for (const [q, want] of [['?test=1', 255], ['?test=1&transparent=1', 0]]) {
    p = await open(browser, q, true);
    const a = await p.evaluate(() => { SR.step(5.1); SR.step(SR.settings.lobby + 4); SR.render(); return SR.G.phase + ':' + document.getElementById('c').getContext('2d').getImageData(300, 900, 1, 1).data[3]; });
    ok(a === 'race:' + want, (want ? 'opaque background by default' : '?transparent=1 leaves the background see-through') + ' (' + a + ')');
    await p.close();
  }

  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
