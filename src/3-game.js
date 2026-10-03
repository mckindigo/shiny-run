/* =====================================================================
   GAME - title -> lobby (!play) -> race (physics, giant crow, Crow's Nest rescue, chaos vote) -> results -> lobby ...
   ===================================================================== */
const DEFAULT_COLORS = ['#e8b64a', '#e86f5c', '#5fb8e8', '#7bd17b', '#c18ae8', '#f08a24', '#2bc4b3', '#e86fa0', '#9aa6ff', '#d6d65a'];
function racerColor(key, col) { return col || DEFAULT_COLORS[hashStr(key) % DEFAULT_COLORS.length]; }

/* ---------- stream-long leaderboard + bling (saved on this PC) */
const BKEY = 'shinyrun.board.v1', LKEY = 'shinyrun.bling.v1';
const loadJ = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
let board = loadJ(BKEY), bling = loadJ(LKEY);
function saveBoard() { try { localStorage.setItem(BKEY, JSON.stringify(board)); } catch (e) {} }
function saveBling() { try { localStorage.setItem(LKEY, JSON.stringify(bling)); } catch (e) {} }
function topBoard(n) { return Object.entries(board).filter(([, s]) => s.pts > 0).map(([k, s]) => Object.assign({ k }, s)).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.t - b.t).slice(0, n || DATA.boardSize); }
function resetBoard() { board = {}; saveBoard(); }
function resetBling() { bling = {}; saveBling(); }
function blingLevel(key) { const w = (bling[key] && bling[key].wins) || 0; return w >= 4 ? 3 : w >= 2 ? 2 : w >= 1 ? 1 : 0; }

/* ---------- the show */
const G = { phase: 'title', t: DATA.phase.title, raceNo: 0, lobby: null, R: null, result: null, paused: false, anim: 0, lastVoteEnd: -1e9, lastTrack: null };
function newLobby() {
  const ids = Object.keys(TRACKS).filter(k => k !== G.lastTrack);
  const trackId = pick(ids); G.lastTrack = trackId;
  return { players: new Map(), feed: [], mood: pick(Object.keys(DATA.moods)), trackId, full: 0, waited: 0 };
}
function setPhase(ph) {
  G.phase = ph;
  if (ph === 'lobby') { G.raceNo++; G.lobby = newLobby(); G.R = null; G.result = null; G.t = settings.lobby; BOT.plan(); }
  else if (ph === 'race') { G.R = newRace(G.lobby); G.t = 0; }
  else if (ph === 'results') { finishRace(); G.t = DATA.phase.results; }
}
function update(dt) {
  if (G.paused) return;
  G.anim += dt; BOT.tick(dt);
  if (G.phase === 'race') {
    stepRace(G.R, dt);
    if (G.R.done && G.R.t - G.R.doneT > 2.5) setPhase('results');
    return;
  }
  G.t -= dt;
  if (G.t > 0) return;
  if (G.phase === 'title' || G.phase === 'results') setPhase('lobby');
  else if (G.phase === 'lobby') { if (G.lobby.players.size) setPhase('race'); else { G.t = Math.min(15, settings.lobby); G.lobby.waited++; } }
}
function skipPhase() {
  if (G.phase === 'race') { callRace(G.R); setPhase('results'); }
  else if (G.phase === 'lobby' && !G.lobby.players.size) G.t = settings.lobby;
  else G.t = 0.0001;
}

/* ---------- race */
function newRace(lobby) {
  const T = buildTrack(lobby.trackId, 1 + Math.floor(Math.random() * 1e9)), W = makeWorld(T);
  const mood = DATA.moods[lobby.mood];
  const R = { T, engine: W.engine, spinners: W.spinners, mood, moodId: lobby.mood, t: -3, acc: 0, racers: [], byKey: new Map(), finished: [], order: [],
    camY: -260, shake: 0, leadFrac: 0, firstFinishT: null, done: false, doneT: 0, events: [], banners: [], card: null, replay: null,
    crow: { state: 'idle', idx: 0, t: 0, plan: mood.at.map(a => rand(a[0], a[1])), target: null, x: 0, y: 0, cool: 0 },
    nest: null, vote: null, voteAt: (G.anim - G.lastVoteEnd > DATA.vote.cooldown && Math.random() < DATA.vote.chance) ? rand(DATA.vote.at[0], DATA.vote.at[1]) : null,
    effect: null, spawnQ: [], spawnT: 0, total: 0, snatched: [] };
  const list = shuffle([...lobby.players.values()]);
  for (const p of list) {
    const r = { key: p.key, u: p.u, type: p.type, color: p.color, bot: p.bot, bling: blingLevel(p.key), body: null, state: 'wait', place: 0, time: 0, y: -200, x: 700, a: 0,
      best: -1e9, stuckT: 0, hl: 0, nudges: 0 };
    R.racers.push(r); R.byKey.set(p.key, r); R.spawnQ.push(r);
  }
  R.total = R.racers.length;
  R.order = R.racers.slice();
  return R;
}
function spawnBatch(R) {
  const n = Math.min(DATA.race.spawnBatch, R.spawnQ.length), W = R.T.W, slot = (W - 120) / n;
  const slots = shuffle([...Array(n).keys()]);
  for (let i = 0; i < n; i++) {
    const r = R.spawnQ.shift(), x = 60 + slot * (slots[i] + 0.5) + rand(-slot * 0.3, slot * 0.3), y = -170 + rand(-30, 30);
    r.body = makeRacerBody(x, y); r.body.racer = r; M.Body.setVelocity(r.body, { x: rand(-1.5, 1.5), y: rand(0, 2) });
    M.Composite.add(R.engine.world, r.body); r.state = 'run'; r.x = x; r.y = y; r.best = y; r.stuckT = 0;
  }
}
function running(R) { return R.racers.filter(r => r.state === 'run'); }
function removeBody(R, r) { if (r.body) { M.Composite.remove(R.engine.world, r.body); r.body = null; } }
const PHYS_DT = 1 / 60;
function physStep(R) {
  const dt = PHYS_DT, max = DATA.race.maxSpeed;
  for (const b of R.spinners) M.Body.setAngle(b, b.angle + b.spin.speed * dt, true);
  // chaos effects
  const ef = R.effect;
  if (ef) {
    ef.t -= dt;
    for (const r of R.racers) if (r.state === 'run' && r.body) {
      const b = r.body;
      if (ef.k === 'wind') { if (b.isSleeping) M.Sleeping.set(b, false); b.force.x += ef.dir * b.mass * 0.00062; }
      else if (ef.k === 'quake' && ef.tick <= 0) { if (b.isSleeping) M.Sleeping.set(b, false); M.Body.setVelocity(b, { x: b.velocity.x + rand(-4.5, 4.5), y: b.velocity.y - rand(2, 6) }); }
    }
    if (ef.k === 'quake') { if (ef.tick <= 0) ef.tick = 0.14; ef.tick -= dt; R.shake = Math.max(R.shake, 14); }
    if (ef.t <= 0) R.effect = null;
  }
  M.Engine.update(R.engine, 1000 / 60);
  for (const r of R.racers) {
    if (r.state !== 'run' || !r.body) continue;
    const b = r.body, v = b.velocity, sp = Math.hypot(v.x, v.y);
    if (sp > max) M.Body.setVelocity(b, { x: v.x * max / sp, y: v.y * max / sp });
    let x = b.position.x, y = b.position.y;
    if (x < -40 || x > R.T.W + 40) { x = clamp(x, 30, R.T.W - 30); M.Body.setPosition(b, { x, y }); }
    r.x = x; r.y = y; r.a = b.angle;
    if (y > R.T.finishY) {   // crossed the finish line
      r.state = 'fin'; r.place = R.finished.length + 1; r.time = R.t; R.finished.push(r); removeBody(R, r);
      if (r.place === 1) { R.firstFinishT = R.t; banner(R, 'WINNER: ' + r.u, 'first across the line', 'good'); }
      continue;
    }
    // anti-stuck: a racer that hasn't made progress gets a nudge (and is woken up)
    if (y > r.best + 8 || sp > 1.2) { if (y > r.best) r.best = y; r.stuckT = 0; }
    else if ((r.stuckT += dt) > DATA.race.stuckTime) { r.stuckT = 0; r.best = y; r.nudges++; M.Sleeping.set(b, false); M.Body.setVelocity(b, { x: rand(-3.5, 3.5), y: -rand(1.5, 3.5) }); }
  }
}
function banner(R, title, sub, kind) { R.banners.push({ title, sub, kind: kind || 'info', t0: R.t }); if (R.banners.length > 3) R.banners.shift(); R.events.push(title); }
function stepRace(R, dt) {
  R.t += dt; R.shake = Math.max(0, R.shake - dt * 30);
  if (R.t < 0) return;   // 3-2-1 countdown
  if (R.spawnQ.length && (R.spawnT -= dt) <= 0) { spawnBatch(R); R.spawnT = DATA.race.spawnEvery; }
  R.acc += dt; let n = 0;
  while (R.acc >= PHYS_DT - 1e-9 && n < 4) { physStep(R); R.acc -= PHYS_DT; n++; }
  if (n === 4) R.acc = 0;
  for (const r of R.racers) if (r.hl > 0) r.hl -= dt;
  // standings: finished by place, then running by progress, then nest, then out
  const rank = r => r.state === 'fin' ? 1e7 - r.place : r.state === 'run' ? r.y : r.state === 'nest' ? -1e6 : r.state === 'wait' ? -2e6 : -3e6;
  R.order = R.racers.slice().sort((a, b) => rank(b) - rank(a));
  const lead = R.order[0];
  R.leadFrac = R.finished.length ? 1 : lead && lead.state === 'run' ? clamp(lead.y / R.T.finishY, 0, 1) : 0;
  // camera follows the leaders (3rd running racer, so one runaway marble doesn't drag it)
  const run = R.order.filter(r => r.state === 'run');
  const focus = run.length ? run[Math.min(2, run.length - 1)].y : R.finished.length ? R.T.finishY : -100;
  const target = clamp(focus - 1080 * 0.42, R.T.top, R.T.bottom + 120 - 1080);
  R.camY += clamp((target - R.camY) * (1 - Math.exp(-dt * 3)), -1400 * dt, 1400 * dt);
  stepCrow(R, dt); recordReplay(R); stepVote(R, dt);
  if (R.card && R.t - R.card.t0 > DATA.snatch.card) R.card = null;
  // end of race
  if (!R.done) {
    const left = R.racers.some(r => r.state === 'run' || r.state === 'wait' || r.state === 'nest');
    if (!left || (R.firstFinishT != null && R.t - R.firstFinishT > DATA.race.afterFirst && !R.nest) || R.t > DATA.race.cap) { R.done = true; R.doneT = R.t; if (left) banner(R, 'TIME!', 'race over', 'info'); }
  }
}
function callRace(R) { if (!R.done) { R.done = true; R.doneT = R.t; R.called = true; } }

/* ---------- the giant crow */
function crowCandidates(R) {
  const run = R.order.filter(r => r.state === 'run' && r.body && r.y > R.camY + 220 && r.y < R.camY + 980);
  return R.mood.gemsOnly ? run.filter(r => r.type === 'gem') : run;
}
function chooseTarget(R) {
  const c = crowCandidates(R); if (!c.length) return null;
  return Math.random() < DATA.snatch.frontBias ? pick(c.slice(0, DATA.snatch.front)) : pick(c);
}
function rescueNeed(R) { return Math.max(DATA.rescue.min, Math.ceil(DATA.rescue.frac * R.total)); }
function startSnatch(R, forced) {
  const C = R.crow, tg = chooseTarget(R);
  if (!tg && !forced && (C.tries = (C.tries || 0) + 1) < 10) { C.cool = 0.8; return false; }   // nothing in view yet: look again shortly
  C.tries = 0;
  if (!tg) { if (R.mood.gemsOnly) banner(R, 'NO GEMS IN SIGHT', 'the greedy crow flies off', 'info'); C.idx++; C.cool = 3; return false; }
  C.state = 'warn'; C.t = 0; C.target = tg; C.forced = !!forced;
  banner(R, 'CAW!', 'the giant crow is circling\u2026', 'warn');
  return true;
}
function stepCrow(R, dt) {
  const C = R.crow, mood = R.mood; C.t += dt; C.cool -= dt;
  if (C.state === 'idle') {
    if (C.idx < mood.snatches && !R.nest && C.cool <= 0 && R.leadFrac >= C.plan[C.idx] && !R.done && !(R.vote && R.vote.state === 'open' && R.vote.t > DATA.vote.window - 1)) startSnatch(R);
    return;
  }
  const tg = C.target;
  if (C.state === 'warn') {
    if (!tg || tg.state !== 'run') { const n = chooseTarget(R); if (n) C.target = n; else { C.state = 'idle'; C.idx++; C.cool = 3; return; } }
    C.x = C.target.x; C.y = C.target.y;
    if (C.t >= mood.warn) { C.state = 'swoop'; C.t = 0; C.sx = C.target.x + 700; C.sy = R.camY - 300; }
  } else if (C.state === 'swoop') {
    if (tg.state !== 'run') { const n = chooseTarget(R); if (n) C.target = n; else { C.state = 'idle'; C.idx++; C.cool = 3; return; } }
    const k = ease(C.t / mood.swoop); C.x = lerp(C.sx, C.target.x, k); C.y = lerp(C.sy, C.target.y, k);
    if (C.t >= mood.swoop) {   // GRAB
      const r = C.target; removeBody(R, r); r.state = 'nest'; r.snatchY = r.y;
      R.snatched.push(r.u); C.state = 'carry'; C.t = 0; C.gx = r.x; C.gy = r.y;
      R.card = { name: r.u, r, t0: R.t }; R.replayReq = R.t;
      banner(R, 'SNATCHED: ' + r.u, 'spam !caw to get it back', 'bad');
    }
  } else if (C.state === 'carry') {
    const k = C.t / 1.4, e = k * k * (3 - 2 * k); C.x = lerp(C.gx, Math.max(C.gx + 300, 1250), e); C.y = lerp(C.gy, R.camY - 280, e);
    if (C.t >= 1.4) { C.state = 'nest'; C.t = 0; R.nest = { r: tg, t: DATA.rescue.window, need: rescueNeed(R), cawers: new Set(), state: 'open' }; }
  } else if (C.state === 'nest') {
    const N = R.nest; N.t -= dt;
    if (N.cawers.size >= N.need) {
      N.state = 'rescued'; C.state = 'drop'; C.t = 0;
      const run = R.order.filter(r => r.state === 'run');
      const mid = run.length ? run[Math.floor(run.length / 2)].y : Math.min(N.r.snatchY, R.T.finishY - 400);
      C.dx = rand(200, R.T.W - 200); C.dy = clamp(Math.max(mid, N.r.snatchY - 200), R.camY + 150, R.camY + 600);
      banner(R, 'RESCUED!', N.r.u + ' is dropped back in', 'good');
    } else if (N.t <= 0) {
      N.state = 'out'; N.r.state = 'out'; banner(R, 'OUT: ' + N.r.u, 'not enough !caw', 'bad');
      R.nest = null; C.state = 'idle'; C.idx++; C.cool = 4; C.target = null;
    }
  } else if (C.state === 'drop') {
    const k = ease(C.t / 1.0); C.x = lerp(C.dx + 700, C.dx, k); C.y = lerp(R.camY - 250, C.dy, k);
    if (C.t >= 1.0) {
      const r = R.nest.r; r.state = 'run'; r.body = makeRacerBody(C.dx, C.dy + 40); r.body.racer = r; M.Body.setVelocity(r.body, { x: 0, y: 3 });
      M.Composite.add(R.engine.world, r.body); r.x = C.dx; r.y = C.dy + 40; r.best = r.y; r.stuckT = 0; r.hl = 3; r.rescued = true;
      R.nest = null; C.state = 'leave'; C.t = 0; C.lx = C.x; C.ly = C.y;
    }
  } else if (C.state === 'leave') {
    const k = ease(C.t / 0.9); C.x = lerp(C.lx, C.lx - 800, k); C.y = lerp(C.ly, R.camY - 300, k);
    if (C.t >= 0.9) { C.state = 'idle'; C.idx++; C.cool = 4; C.target = null; }
  }
}

/* ---------- instant replay: while the crow attacks, snapshot the area around the target (positions only, no pixels) */
function recordReplay(R) {
  const C = R.crow, on = C.state === 'warn' || C.state === 'swoop' || (C.state === 'carry' && C.t < 0.6);
  R.rec = R.rec || [];
  if (R.replayReq != null && (C.state !== 'carry' || C.t >= 0.6)) { R.replay = R.rec.length > 3 ? { frames: R.rec, t0: R.t, d: R.rec[R.rec.length - 1].t - R.rec[0].t } : null; R.rec = []; R.replayReq = null; }
  if (!on || !C.target || R.t - (R.recT || -1) < 0.05) return;
  R.recT = R.t;
  const tg = C.target, cx = tg.x, cy = tg.y, rs = [];
  for (const r of R.racers) if ((r.state === 'run' || r === tg) && Math.abs(r.x - cx) < 360 && Math.abs(r.y - cy) < 220) rs.push([r.x, r.y, r.a, r]);
  R.rec.push({ t: R.t, cx, cy, rs, crow: { state: C.state, x: C.x, y: C.y, k: C.state === 'warn' ? C.t / R.mood.warn : 1, hold: C.state === 'carry' ? tg : null }, tg });
  while (R.rec.length && R.t - R.rec[0].t > DATA.snatch.replay) R.rec.shift();
}

/* ---------- chaos vote (rare: at most once per race, global cooldown, min votes scaled to chat size) */
function voteNeed(R) { return Math.max(DATA.vote.min, Math.ceil(DATA.vote.frac * R.total)); }
function startVote(R) { if (R.vote && R.vote.state === 'open') return; R.vote = { state: 'open', t: DATA.vote.window, voters: new Map(), need: voteNeed(R) }; R.voteAt = null; banner(R, 'CHAOS VOTE!', 'type !wind or !quake', 'warn'); }
function voteCounts(V) { const c = { wind: 0, quake: 0 }; for (const o of V.voters.values()) c[o]++; return c; }
function stepVote(R, dt) {
  if (!R.vote) {
    if (R.voteAt != null && R.leadFrac >= R.voteAt && !R.done && G.anim - G.lastVoteEnd > DATA.vote.cooldown && (R.crow.state === 'idle' || R.crow.state === 'nest')) startVote(R);
    return;
  }
  const V = R.vote; if (V.state !== 'open') { V.show = (V.show || 4) - dt; return; }
  V.t -= dt; if (V.t > 0) return;
  G.lastVoteEnd = G.anim;
  const c = voteCounts(V), total = c.wind + c.quake;
  if (total < V.need) { V.state = 'fail'; banner(R, 'NOT ENOUGH VOTES', total + '/' + V.need + ' - no chaos this time', 'info'); return; }
  V.result = c.wind === c.quake ? pick(['wind', 'quake']) : c.wind > c.quake ? 'wind' : 'quake';
  V.state = 'applied';
  if (V.result === 'wind') { const dir = Math.random() < 0.5 ? -1 : 1; R.effect = { k: 'wind', t: DATA.vote.windTime, dir, t0: R.t }; banner(R, 'WIND GUST!', 'chat picked !wind - blowing ' + (dir < 0 ? 'LEFT' : 'RIGHT'), 'warn'); }
  else { R.effect = { k: 'quake', t: DATA.vote.quakeTime, tick: 0, t0: R.t }; banner(R, 'QUAKE!', 'chat picked !quake - hold on', 'warn'); }
}

/* ---------- results + points */
function finishRace() {
  const R = G.R, now = Date.now();
  const ranked = R.order.slice();   // finished first (by place), then by progress
  const podium = R.called ? ranked.filter(r => r.state === 'fin' || r.state === 'run').slice(0, 3) : R.finished.slice(0, 3);
  const earned = new Map();
  podium.forEach((r, i) => earned.set(r.key, DATA.points[i]));
  for (const r of R.finished) earned.set(r.key, (earned.get(r.key) || 0) + DATA.finishPoint);
  for (const r of R.racers) {
    const s = board[r.key] || (board[r.key] = { u: r.u, pts: 0, wins: 0, races: 0, t: now });
    s.u = r.u; s.races++; if (r.bot) s.bot = true;
    const e = earned.get(r.key) || 0; if (e) { s.pts += e; s.t = now; }
  }
  let blingUp = null;
  if (podium[0]) {
    const w = podium[0], s = board[w.key]; s.wins++;
    const b = bling[w.key] || (bling[w.key] = { wins: 0 }); const before = blingLevel(w.key); b.wins++; if (w.bot) b.bot = true;
    const after = blingLevel(w.key); blingUp = { u: w.u, level: after, up: after > before, wins: b.wins };
  }
  saveBoard(); saveBling();
  G.result = { podium: podium.map((r, i) => ({ u: r.u, key: r.key, type: r.type, color: r.color, bling: blingLevel(r.key), time: r.time, pts: earned.get(r.key) || 0, fin: r.state === 'fin', place: i + 1 })),
    finishers: R.finished.length, total: R.total, out: R.racers.filter(r => r.state === 'out').map(r => r.u), dnf: R.racers.filter(r => r.state === 'run' || r.state === 'wait').length,
    blingUp, track: R.T.def.name, mood: R.mood.name, called: !!R.called, time: R.finished[0] ? R.finished[0].time : R.t };
}

/* ---------- chat */
function onChat(user, text, src, color) {
  if (!user || text == null) return false;
  if (src === 'bot' && settings.testMode !== 'on') return false;
  const raw = String(text).trim(), key = String(user).toLowerCase(), R = G.R;
  if (G.phase === 'race' && R) { const r = R.byKey.get(key); if (r && r.state !== 'out') r.hl = 2.5; }
  const m = /^!(\w+)(?:\s+(\S+))?/i.exec(raw); if (!m) return false;
  const cmd = m[1].toLowerCase(), arg = (m[2] || '').toLowerCase();
  if (cmd === 'play') {
    if (G.phase !== 'lobby') return false;
    const L = G.lobby, ty = { cap: 'cap', bottlecap: 'cap', bottle: 'cap', caps: 'cap', coin: 'coin', ring: 'ring', gem: 'gem' }[arg];
    const prev = L.players.get(key);
    if (prev) { if (ty && ty !== prev.type) { prev.type = ty; L.feed.unshift({ u: prev.u, type: ty, sw: true }); } if (color) prev.color = color; return true; }
    if (L.players.size >= DATA.race.maxRacers) { L.full++; return false; }
    const p = { key, u: String(user), type: ty || pick(DATA.types), color: racerColor(key, color), bot: src === 'bot' };
    L.players.set(key, p); L.feed.unshift({ u: p.u, type: p.type }); if (L.feed.length > 10) L.feed.length = 10;
    return true;
  }
  if (G.phase !== 'race' || !R) return false;
  if (cmd === 'caw' && R.nest && R.nest.state === 'open') { R.nest.cawers.add(key); return true; }
  if ((cmd === 'wind' || cmd === 'quake') && R.vote && R.vote.state === 'open') { R.vote.voters.set(key, cmd); return true; }
  return false;
}

/* ---------- Test mode: fake chatters (only when Test mode is On) */
const BOT = {
  todo: [], cawRate: 0, chatT: 0,
  names(n) { const B = DATA.bots, out = []; for (let i = 0; i < n; i++) out.push('test_' + B.first[i % B.first.length] + B.last[Math.floor(i / B.first.length) % B.last.length] + (i >= B.first.length * B.last.length ? i : '')); return out; },
  plan() {
    this.todo = [];
    if (settings.testMode !== 'on' || G.phase !== 'lobby') return;
    const L = settings.lobby;
    this.names(settings.bots).forEach((u, i) => {
      const ty = Math.random() < 0.35 ? ' ' + pick(['cap', 'coin', 'ring', 'gem']) : '';
      this.todo.push({ u, at: rand(0.5, L * 0.7), msg: '!play' + ty, col: DATA.bots.colors[i % DATA.bots.colors.length] });
    });
  },
  tick(dt) {
    if (settings.testMode !== 'on') { this.todo = []; return; }
    if (G.phase === 'lobby') {
      const el = settings.lobby - G.t;
      this.todo = this.todo.filter(b => { if (el >= b.at) { onChat(b.u, b.msg, 'bot', b.col); return false; } return true; });
      return;
    }
    const R = G.R; if (G.phase !== 'race' || !R || R.t < 0) return;
    const bots = R.racers.filter(r => r.bot);
    if (!bots.length) return;
    if ((this.chatT -= dt) <= 0) { this.chatT = rand(0.3, 1.2); const b = pick(bots); onChat(b.u, pick(DATA.bots.lines), 'bot'); }
    if (R.nest && R.nest.state === 'open') {
      if (R.nest.botRate == null) R.nest.botRate = this.forceCaw != null ? this.forceCaw : rand(0.002, 0.03);   // per bot per second: sometimes enough, sometimes not
      for (const b of bots) if (Math.random() < R.nest.botRate * dt * 2.2) onChat(b.u, '!caw', 'bot');
    }
    if (R.vote && R.vote.state === 'open') for (const b of bots) if (!R.vote.voters.has(b.key) && Math.random() < 0.05 * dt) onChat(b.u, Math.random() < 0.5 ? '!wind' : '!quake', 'bot');
  },
  purge() {   // Test mode turned off: remove every trace of the bots
    this.todo = [];
    if (G.lobby) { for (const [k, p] of [...G.lobby.players]) if (p.bot) G.lobby.players.delete(k); G.lobby.feed = G.lobby.feed.filter(f => G.lobby.players.has(String(f.u).toLowerCase())); }
    const R = G.R;
    if (R) {
      for (const r of R.racers) if (r.bot) { removeBody(R, r); R.byKey.delete(r.key); }
      if (R.nest && R.nest.r.bot) { R.nest = null; R.crow.state = 'idle'; R.crow.idx++; }
      if (R.crow.target && R.crow.target.bot && /warn|swoop/.test(R.crow.state)) { R.crow.state = 'idle'; R.crow.target = null; }
      R.racers = R.racers.filter(r => !r.bot); R.spawnQ = R.spawnQ.filter(r => !r.bot); R.finished = R.finished.filter(r => !r.bot); R.finished.forEach((r, i) => r.place = i + 1);
      R.order = R.order.filter(r => !r.bot); R.total = R.racers.length;
      if (R.nest) for (const k of [...R.nest.cawers]) if (k.startsWith('test_')) R.nest.cawers.delete(k);
      if (R.vote) for (const k of [...R.vote.voters.keys()]) if (k.startsWith('test_')) R.vote.voters.delete(k);
      if (!R.racers.length && G.phase === 'race') { R.done = true; R.doneT = R.t - 3; }
    }
    for (const k in board) if (board[k].bot) delete board[k];
    for (const k in bling) if (bling[k].bot) delete bling[k];
    saveBoard(); saveBling();
  }
};
