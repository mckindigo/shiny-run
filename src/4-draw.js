/* ===================================================================== drawing helpers */
const OUT = '#14101a';
function T(s, x, y, size, col, align, opt) {
  opt = opt || {}; if (!opt.raw) s = sayText(s);   // raw = the credit line, never rewritten
  ctx.font = `${opt.w || 700} ${size}px ${F}`; ctx.textAlign = align || 'left'; ctx.textBaseline = opt.base || 'middle';
  if (opt.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = opt.sw || Math.max(3, size * 0.16); ctx.strokeStyle = opt.stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function fit(s, size, maxW, w) { s = sayText(s); ctx.font = `${w || 700} ${size}px ${F}`; if (ctx.measureText(s).width <= maxW) return s; while (s.length > 1 && ctx.measureText(s + '\u2026').width > maxW) s = s.slice(0, -1); return s + '\u2026'; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
function fs(fill, lw, stroke) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke || OUT; ctx.stroke(); } }
function star(c, x, y, r, rot, col, k) { c.save(); c.translate(x, y); c.rotate(rot || 0); c.beginPath(); const n = 4; for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, q = i % 2 ? r * (k || 0.3) : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fillStyle = col; c.fill(); c.restore(); }
const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
const VX = DATA.view.x0, VW = DATA.view.w;   // playfield: screen x = VX + world x, screen y = world y - camY

/* ===================================================================== trinkets (same size for every type: cosmetic only) */
function drawTrinket(c, type, col, r, bl) {
  c.save(); c.lineJoin = 'round';
  const dark = mix(col, '#000000', 0.55), light = mix(col, '#ffffff', 0.45), lw = Math.max(1.6, r * 0.13);
  if (type === 'cap') {
    c.beginPath(); const n = 18;
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, q = i % 2 ? r * 0.86 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    c.closePath(); c.fillStyle = mix(col, '#c9ccd2', 0.25); c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.66, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = dark; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.34, 0, 7); c.fillStyle = light; c.fill();
  } else if (type === 'coin') {
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fillStyle = mix('#e8b64a', col, 0.35); c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.72, 0, 7); c.fillStyle = mix(col, '#f4d27a', 0.35); c.fill(); c.lineWidth = lw * 0.6; c.strokeStyle = mix('#8a5a10', col, 0.3); c.stroke();
    star(c, 0, 0, r * 0.5, Math.PI / 4, mix('#fff6d0', col, 0.2), 0.38);
  } else if (type === 'ring') {
    c.beginPath(); c.arc(0, r * 0.12, r * 0.92, 0, 7); c.arc(0, r * 0.12, r * 0.5, 0, 7, true);
    c.fillStyle = mix('#f1c75a', col, 0.4); c.fill('evenodd'); c.lineWidth = lw; c.strokeStyle = OUT;
    c.beginPath(); c.arc(0, r * 0.12, r * 0.92, 0, 7); c.stroke(); c.beginPath(); c.arc(0, r * 0.12, r * 0.5, 0, 7); c.lineWidth = lw * 0.8; c.stroke();
    c.beginPath(); c.moveTo(0, -r * 1.02); c.lineTo(r * 0.42, -r * 0.62); c.lineTo(0, -r * 0.22); c.lineTo(-r * 0.42, -r * 0.62); c.closePath();
    c.fillStyle = col; c.fill(); c.lineWidth = lw * 0.8; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(-r * 0.16, -r * 0.78); c.lineTo(0, -r * 0.9); c.lineTo(r * 0.1, -r * 0.7); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fill();
  } else {   // gem
    const pts = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    c.beginPath(); pts.forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); pts.forEach(p => c.lineTo(p[0] * 0.5, p[1] * 0.5)); c.closePath(); c.fillStyle = light; c.fill();
    c.strokeStyle = dark; c.lineWidth = lw * 0.45; c.beginPath(); pts.forEach(p => { c.moveTo(p[0] * 0.5, p[1] * 0.5); c.lineTo(p[0], p[1]); }); c.stroke();
    c.beginPath(); c.moveTo(-r * 0.42, -r * 0.1); c.lineTo(-r * 0.12, -r * 0.42); c.lineTo(-r * 0.02, -r * 0.3); c.lineTo(-r * 0.3, 0); c.closePath(); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill();
  }
  if (type !== 'ring') { c.beginPath(); c.arc(-r * 0.32, -r * 0.36, r * 0.18, 0, 7); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill(); }
  if (bl >= 1) { c.beginPath(); c.arc(0, 0, r + lw * 1.4, 0, 7); c.lineWidth = lw * 1.1; c.strokeStyle = '#ffd94a'; c.stroke(); }
  c.restore();
}
const SPR = new Map();
function sprite(type, col, bl) {
  const k = type + col + (bl ? 1 : 0); let s = SPR.get(k);
  if (!s) { const r = DATA.race.r, S = Math.ceil((r + 6) * 2) * 2; s = document.createElement('canvas'); s.width = s.height = S; const c = s.getContext('2d'); c.translate(S / 2, S / 2); c.scale(2, 2); drawTrinket(c, type, col, r, bl); SPR.set(k, s); }
  return s;
}
function drawBlingFx(x, y, r, bl, t, seed) {   // animated sparkle on winners' trinkets (cosmetic only)
  if (bl < 2) return;
  const n = bl >= 3 ? 4 : 2;
  if (bl >= 3) { circ(x, y, r + 7 + Math.sin(t * 5 + seed) * 2); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,217,74,0.55)'; ctx.stroke(); }
  for (let i = 0; i < n; i++) { const a = t * 2.4 + seed + i * Math.PI * 2 / n, q = r + 8; star(ctx, x + Math.cos(a) * q, y + Math.sin(a) * q, 4 + 2 * Math.abs(Math.sin(t * 6 + i + seed)), a, '#fff6c0', 0.3); }
}

/* ===================================================================== the giant crow (code-drawn, top-down dive pose). x,y = center, s = wingspan */
function drawGiantCrow(x, y, s, t, o) {
  o = o || {}; const k = s / 400, f = Math.sin(t * (o.flapSpeed || 9));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const body = '#15121c', wing = '#1d1a28', sheen = '#4a4466', rim = '#e9dfc8';
  // tail fan (top)
  ctx.beginPath(); ctx.moveTo(-26, -60); ctx.lineTo(-50, -150); ctx.lineTo(-18, -138); ctx.lineTo(0, -160); ctx.lineTo(18, -138); ctx.lineTo(50, -150); ctx.lineTo(26, -60); ctx.closePath(); fs(wing, 6, rim);
  // wings
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1 - 0.0 * f); ctx.rotate(f * 0.12);
    ctx.beginPath(); ctx.moveTo(18, -40); ctx.quadraticCurveTo(110, -110 - f * 30, 200, -70 - f * 40);
    ctx.lineTo(178, -46 - f * 30); ctx.lineTo(205, -30 - f * 30); ctx.lineTo(176, -12 - f * 22); ctx.lineTo(196, 6 - f * 18); ctx.lineTo(160, 12 - f * 12); ctx.lineTo(170, 34 - f * 8);
    ctx.quadraticCurveTo(90, 40, 22, 20); ctx.closePath(); fs(wing, 6, rim);
    ctx.strokeStyle = sheen; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, -20); ctx.quadraticCurveTo(110, -60 - f * 20, 170, -50 - f * 30); ctx.moveTo(40, 0); ctx.quadraticCurveTo(110, -10, 150, 0 - f * 10); ctx.stroke();
    ctx.restore();
  }
  // body + head (head toward the bottom: diving at the camera)
  ell(0, -10, 40, 70); fs(body, 6, rim);
  circ(0, 62, 36); fs(body, 6, rim);
  // beak pointing down
  ctx.beginPath(); ctx.moveTo(-15, 82); ctx.lineTo(0, 132); ctx.lineTo(15, 82); ctx.closePath(); fs('#3a3640', 5, rim);
  // fierce eyes
  for (const sd of [-1, 1]) { circ(sd * 17, 56, 9); fs('#ffd23f', 3, OUT); circ(sd * 17, 57, 4); fs(OUT); ctx.strokeStyle = rim; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sd * 6, 44); ctx.lineTo(sd * 30, 50); ctx.stroke(); }
  // talons (open, or holding a trinket)
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 7;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 26, 40); ctx.lineTo(sd * 44, 92); ctx.lineTo(sd * (o.hold ? 30 : 58), 112); ctx.moveTo(sd * 44, 92); ctx.lineTo(sd * 44, 118); ctx.stroke(); }
  ctx.restore();
  if (o.hold) { ctx.save(); ctx.translate(x, y + 112 * k); ctx.scale(2.2 * k, 2.2 * k); drawTrinket(ctx, o.hold.type, o.hold.color, DATA.race.r, o.hold.bling); ctx.restore(); }
}

/* ===================================================================== track backdrops (pre-rendered parallax tile per track) */
const BACK = {};
function backTile(id) {   // one opaque, vertically seamless tile per track: sky + scenery + lane shading baked in (cheap to scroll)
  if (BACK[id]) return BACK[id];
  const P2 = TRACKS[id].pal, Wd = VW, H = 1200, c = document.createElement('canvas'); c.width = Wd; c.height = H; const g = c.getContext('2d'), rn = mulberry(hashStr(id));
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, P2.sky1); sky.addColorStop(0.5, P2.sky2); sky.addColorStop(1, P2.sky1);
  g.fillStyle = sky; g.fillRect(0, 0, Wd, H);
  if (id === 'rooftop') {
    for (let x = -20; x < Wd; x += 90 + rn() * 120) {
      const w = 70 + rn() * 110, col = mix(P2.far, P2.near, rn());
      g.fillStyle = col; g.fillRect(x, 0, w, H);
      for (let yy = 10; yy < H; yy += 50) for (let wx = x + 10; wx < x + w - 16; wx += 22) if (rn() < 0.32) { g.fillStyle = rn() < 0.7 ? rgba(P2.win, 0.55) : rgba(P2.win, 0.2); g.fillRect(wx, yy, 10, 16); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + w - 6, 0, 6, H);
    }
  } else if (id === 'sewer') {
    g.fillStyle = P2.far; g.fillRect(0, 0, Wd, H);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (let yy = 0; yy < H; yy += 40) { g.beginPath(); g.moveTo(0, yy); g.lineTo(Wd, yy); g.stroke(); for (let x = (yy / 40 % 2) * 40; x < Wd; x += 80) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy + 40); g.stroke(); } }
    for (let x = 60; x < Wd; x += 220 + rn() * 160) {
      const w = 30 + rn() * 30, nc = rn() < 0.5 ? '#ff3fa4' : '#39e6ff';
      g.fillStyle = '#0a1a1d'; g.fillRect(x, 0, w, H); g.fillStyle = rgba(nc, 0.18); g.fillRect(x - 6, 0, w + 12, H); g.fillStyle = rgba(nc, 0.8); g.fillRect(x + w / 2 - 2, 0, 4, H);
      for (let yy = 0; yy < H; yy += 150) { g.fillStyle = '#123034'; g.fillRect(x - 6, yy, w + 12, 14); }
    }
  } else {
    g.globalAlpha = 0.55;
    for (let i = 0; i < 38; i++) {
      const x = rn() * Wd, yy = rn() * H, kind = rn(), rot = rn() - 0.5, w2 = 120 + rn() * 40;
      for (const oy of [0, -H, H]) {
        if (kind < 0.45) { g.fillStyle = mix(P2.near, ['#8a4a3a', '#4a6a7a', '#7a7a4a', '#6a4a7a'][i % 4], 0.3); g.fillRect(x, yy + oy, w2, 70); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 10, yy + oy + 12, 50, 20); }
        else if (kind < 0.8) { g.beginPath(); g.arc(x, yy + oy, 34, 0, 7); g.arc(x, yy + oy, 14, 0, 7, true); g.fillStyle = '#2c2226'; g.fill('evenodd'); }
        else { g.save(); g.translate(x, yy + oy); g.rotate(rot); g.fillStyle = P2.near; g.fillRect(-60, -6, 120, 12); g.restore(); }
      }
    }
    g.globalAlpha = 1;
  }
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(VX, 0, DATA.view.trackW, H);   // darken the lane a little so pieces pop
  return (BACK[id] = c);
}
function drawBackdrop(R) {
  if (TRANSPARENT) return;
  const tile = backTile(R.T.id), H = tile.height, oy = -(((R.camY * 0.35) % H) + H) % H;
  ctx.drawImage(tile, 0, oy); if (oy + H < 1080) ctx.drawImage(tile, 0, oy + H);
  if (R.T.id === 'rooftop') { circ(1240, 150, 60); fs('#f6efd2'); circ(1262, 136, 52); fs(R.T.def.pal.sky1); }
}

/* ===================================================================== track pieces */
function drawTrack(R) {
  const p = R.T.def.pal, cy = R.camY;
  ctx.save(); ctx.translate(VX, -cy); drawWorld(R, cy - 120, cy + 1200); ctx.restore();
  // side walls (screen space)
  ctx.fillStyle = p.wall; ctx.fillRect(0, 0, VX, 1080); ctx.fillRect(VX + R.T.W, 0, VW - VX - R.T.W, 1080);
  ctx.fillStyle = p.wallEdge; ctx.fillRect(VX - 5, 0, 5, 1080); ctx.fillRect(VX + R.T.W, 0, 5, 1080);
}
function drawWorld(R, top, bot) {   // track pieces in world coordinates, culled to [top, bot]
  const p = R.T.def.pal, id = R.T.id;
  // section decorations
  for (const d of R.T.deco) {
    if (d.k === 'drop' && d.y < bot && d.y + d.h > top) {
      for (let yy = d.y + 40; yy < d.y + d.h - 20; yy += 90) for (const x of [24, R.T.W - 24]) { ctx.beginPath(); ctx.moveTo(x - 14, yy); ctx.lineTo(x, yy + 16); ctx.lineTo(x + 14, yy); ctx.lineWidth = 6; ctx.strokeStyle = rgba(p.accent, 0.7); ctx.stroke(); }
      T('DROP!', R.T.W / 2, d.y + 70, 54, rgba(p.accent, 0.5), 'center');
    }
  }
  // start gate + finish line
  if (top < 0) { ctx.setLineDash([18, 14]); ctx.lineWidth = 4; ctx.strokeStyle = rgba(p.accent, 0.6); ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(R.T.W, -60); ctx.stroke(); ctx.setLineDash([]); T('START', R.T.W / 2, -95, 40, rgba(p.accent, 0.7), 'center'); }
  const fy = R.T.finishY;
  if (fy > top && fy < bot) {
    const sq = 25; for (let x = 0; x < R.T.W; x += sq) for (let r = 0; r < 2; r++) { ctx.fillStyle = ((x / sq + r) % 2) ? '#111' : '#f5f5f5'; ctx.fillRect(x, fy - sq + r * sq, sq, sq); }
    T('FINISH', R.T.W / 2, fy + 80, 64, p.finish, 'center', { stroke: OUT, sw: 9 });
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, fy + 25, R.T.W, R.T.bottom - fy);
  }
  // static pieces
  for (const q of R.T.parts) {
    if (q.k === 'seg') {
      if (Math.max(q.y1, q.y2) < top || Math.min(q.y1, q.y2) > bot) continue;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(q.x1, q.y1); ctx.lineTo(q.x2, q.y2);
      ctx.lineWidth = q.t + 6; ctx.strokeStyle = p.segEdge; ctx.stroke(); ctx.lineWidth = q.t; ctx.strokeStyle = p.seg; ctx.stroke();
      const a = Math.atan2(q.y2 - q.y1, q.x2 - q.x1), nx = Math.sin(a) * (q.t / 2 - 4), ny = -Math.cos(a) * (q.t / 2 - 4);
      ctx.beginPath(); ctx.moveTo(q.x1 + nx, q.y1 + ny); ctx.lineTo(q.x2 + nx, q.y2 + ny); ctx.lineWidth = id === 'sewer' ? 4 : 5; ctx.strokeStyle = p.segTop; ctx.stroke();
      if (id !== 'sewer') {   // rivets / bolts
        const len = Math.hypot(q.x2 - q.x1, q.y2 - q.y1), n = Math.floor(len / 90); ctx.fillStyle = p.segEdge;
        for (let i = 1; i < n; i++) { const k = i / n; circ(q.x1 + (q.x2 - q.x1) * k - nx * 0.6, q.y1 + (q.y2 - q.y1) * k - ny * 0.6, 3); ctx.fill(); }
      }
    } else if (q.k === 'peg') {
      if (q.y < top || q.y > bot) continue;
      const hit = q.bump && q.hit && G.anim - q.hit < 0.18;
      if (q.bump) {
        circ(q.x, q.y, q.r + (hit ? 4 : 0)); fs(hit ? '#ffffff' : p.bump, 5, p.bumpRim);
        circ(q.x, q.y, q.r * 0.55); fs(mix(p.bump, '#ffffff', 0.4)); circ(q.x, q.y, q.r * 0.55); ctx.lineWidth = 3; ctx.strokeStyle = p.bumpRim; ctx.stroke();
      } else if (id === 'junkyard') { circ(q.x, q.y, q.r + 2); fs(p.peg, 3, p.pegRim); circ(q.x, q.y, q.r * 0.45); fs('#6a6a70'); }
      else { circ(q.x, q.y, q.r); fs(p.peg, 4, p.pegRim); circ(q.x - q.r * 0.3, q.y - q.r * 0.3, q.r * 0.3); fs('rgba(255,255,255,0.35)'); }
    } else if (q.k === 'spin') {
      if (q.y < top - 200 || q.y > bot + 200) continue;
      const b = q.body; ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle);
      rr(-q.len / 2, -q.w / 2, q.len, q.w, q.w / 2); fs(p.spin, 5, p.spinEdge);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = -q.len / 2 + 30; x < q.len / 2 - 20; x += 40) ctx.fillRect(x, -q.w / 2 + 4, 6, q.w - 8);
      circ(0, 0, 16); fs(p.spinEdge, 3, p.spin); ctx.restore();
    }
  }
}

/* ===================================================================== racers + tags */
function drawRacers(R, t) {
  const r0 = DATA.race.r, cy = R.camY, S = sprite('cap', '#ffffff', 0).width / 2;
  for (const r of R.racers) {
    if (r.state !== 'run') continue;
    const sx = VX + r.x, sy = r.y - cy; if (sy < -40 || sy > 1120) continue;
    if (r.hl > 0) { circ(sx, sy, r0 + 7); ctx.lineWidth = 4; ctx.strokeStyle = rgba(r.color, Math.min(1, r.hl)); ctx.stroke(); }
    const s = sprite(r.type, r.color, r.bling);
    ctx.setTransform(1, 0, 0, 1, sx, sy); ctx.rotate(r.a); ctx.drawImage(s, -S / 2, -S / 2, S, S); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (r.bling >= 2) drawBlingFx(sx, sy, r0, r.bling, t, hashStr(r.key) % 7);
  }
  // name tags: top 5 leaders + anyone whose owner just chatted (max 6 of those)
  const tags = [], placed = [];
  R.order.filter(r => r.state === 'run').slice(0, 5).forEach((r, i) => tags.push({ r, rank: R.finished.length + i + 1 }));
  R.racers.filter(r => r.hl > 0 && r.state === 'run' && !tags.some(q => q.r === r)).sort((a, b) => b.hl - a.hl).slice(0, 6).forEach(r => tags.push({ r, rank: 0 }));
  for (const tg of tags) {
    const r = tg.r, sx = VX + r.x, sy = r.y - cy; if (sy < -30 || sy > 1110) continue;
    const name = fit(r.u, 22, 220, 600), w = ctx.measureText(name).width + (tg.rank ? 46 : 20), h = 32;
    let x = clamp(sx - w / 2, VX + 4, VX + R.T.W - w - 4), y = sy - r0 - 14 - h;
    for (let k = 0; k < 5; k++) { const hit = placed.find(q => x < q.x + q.w && x + w > q.x && y < q.y + q.h && y + h > q.y); if (!hit) break; y = hit.y - h - 3; }
    placed.push({ x, y, w, h });
    ctx.globalAlpha = tg.rank ? 1 : Math.min(1, r.hl * 2);
    rr(x, y, w, h, 9); fs('rgba(20,16,26,0.86)', 3, r.color);
    if (tg.rank) { circ(x + 17, y + h / 2, 12); fs(tg.rank === 1 ? '#ffd94a' : '#ffffff'); T(String(tg.rank), x + 17, y + h / 2 + 1, 17, OUT, 'center'); }
    T(name, x + (tg.rank ? 36 : 10), y + h / 2 + 1, 22, '#ffffff', 'left', { w: 600 });
    ctx.globalAlpha = 1;
  }
}

/* ===================================================================== race overlays: crow, CAW!, snatched card, replay, banners, effects */
function drawCrowLayer(R, t) {
  const C = R.crow, cy = R.camY, mood = R.mood;
  if (C.state === 'warn' && C.target) {
    const k = clamp(C.t / mood.warn, 0, 1), sx = VX + C.x, sy = C.y - cy;
    ell(sx, sy, 60 + 160 * k, 30 + 80 * k); ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.4 * k})`; ctx.fill();
    circ(sx, sy, 30 - 8 * Math.sin(t * 10)); ctx.lineWidth = 5; ctx.strokeStyle = '#ff4a3a'; ctx.stroke();
    const j = (1 - k * 0.3) * 6, cs = 150 + 40 * Math.sin(Math.min(1, C.t * 3) * Math.PI / 2);
    T('CAW!', VX + R.T.W / 2 + rand(-j, j), 330 + rand(-j, j), cs, '#ff4a3a', 'center', { stroke: '#ffffff', sw: 16 });
    T('the giant crow is about to strike!', VX + R.T.W / 2, 440, 34, '#ffffff', 'center', { stroke: OUT, sw: 7, w: 600 });
  }
  if (/swoop|carry|drop|leave/.test(C.state)) {
    const hold = (C.state === 'carry' || C.state === 'drop') && C.target ? C.target : null;
    if (C.state === 'swoop') { const k = C.t / mood.swoop; ell(VX + C.target.x, C.target.y - cy, 220 * (0.6 + k * 0.4), 110 * (0.6 + k * 0.4)); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); }
    drawGiantCrow(VX + C.x, C.y - cy, 440, t, { hold, rot: C.state === 'leave' || C.state === 'carry' ? Math.PI : 0, flapSpeed: 10 });
  }
}
function drawEffects(R, t) {
  const ef = R.effect; if (!ef || ef.k !== 'wind') return;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) { const y = (i * 97 + 30) % 1080, x = ((t * 1400 * ef.dir + i * 331) % 1700 + 1700) % 1700 - 120; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ef.dir * 140, y); ctx.stroke(); }
  T(ef.dir < 0 ? '\u2190 WIND \u2190' : '\u2192 WIND \u2192', VX + R.T.W / 2, 990, 80, '#ffffff', 'center', { stroke: OUT, sw: 10 });
}
// instant replay picture-in-picture: re-draws the recorded snapshots (see recordReplay in 3-game.js) in slow motion
function drawReplay(R, t) {
  const rp = R.replay; if (!rp) return;
  const speed = 0.7, el = (R.t - rp.t0) * speed, dur = rp.d;
  if (el > dur + 0.5) { R.replay = null; return; }
  const ft = rp.frames[0].t + Math.min(el, dur); let f = rp.frames[0]; for (const q of rp.frames) { if (q.t <= ft) f = q; else break; }
  const W = 448, H = 252, x = VX + 20, y = 1080 - H - 60, sc = 0.8, S = sprite('cap', '#ffffff', 0).width / 2;
  rr(x - 8, y - 46, W + 16, H + 54, 14); fs(P.panel, 4, P.hi);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, W, H); ctx.clip();
  ctx.fillStyle = R.T.def.pal.sky1; ctx.fillRect(x, y, W, H);
  const cx = clamp(f.cx, W / 2 / sc, R.T.W - W / 2 / sc);
  ctx.translate(x + W / 2, y + H / 2); ctx.scale(sc, sc); ctx.translate(-cx, -f.cy);
  drawWorld(R, f.cy - 200, f.cy + 200);
  const C = f.crow;
  if (C.state === 'warn') { ell(f.cx, f.cy, 60 + 160 * C.k, 30 + 80 * C.k); ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.4 * C.k})`; ctx.fill(); circ(f.cx, f.cy, 26); ctx.lineWidth = 5; ctx.strokeStyle = '#ff4a3a'; ctx.stroke(); }
  for (const [rx, ry, ra, r] of f.rs) { if (C.hold === r) continue; ctx.save(); ctx.translate(rx, ry); ctx.rotate(ra); const im = sprite(r.type, r.color, r.bling); ctx.drawImage(im, -S / 2, -S / 2, S, S); ctx.restore(); }
  if (C.state !== 'warn') drawGiantCrow(C.x, C.y, 440, t, { hold: C.hold, rot: C.state === 'carry' ? Math.PI : 0 });
  ctx.restore();
  T('INSTANT REPLAY', x + 6, y - 22, 26, P.hi, 'left'); T(fit(f.tg.u, 20, 200, 600) + ' \u00b7 slow-mo', x + W, y - 22, 20, P.textDim, 'right', { w: 600 });
}
function drawCard(R, t) {   // the SNATCHED card is drawn once into its own canvas, then just scaled/faded (cheap per frame)
  const c = R.card; if (!c) return;
  if (!c.img) {
    const im = document.createElement('canvas'); im.width = 960; im.height = 280; const g = im.getContext('2d'), main = ctx;
    g.translate(480, 140); ctx = g;
    try {
      rr(-460, -120, 920, 240, 26); fs('#c0392b', 8, '#ffffff');
      T('SNATCHED!', 0, -52, 84, '#ffffff', 'center', { stroke: OUT, sw: 10 });
      T(fit(c.name, 60, 700), 50, 50, 60, '#ffd94a', 'center', { stroke: OUT, sw: 9 });
      g.save(); g.translate(-370, 50); g.scale(2.6, 2.6); drawTrinket(g, c.r.type, c.r.color, DATA.race.r, c.r.bling); g.restore();
    } finally { ctx = main; }
    c.img = im;
  }
  const el = R.t - c.t0, k = ease(el / 0.25), out = el > DATA.snatch.card - 0.3 ? 1 - (el - (DATA.snatch.card - 0.3)) / 0.3 : 1, sc = 0.55 + 0.25 * k;
  ctx.save(); ctx.globalAlpha = clamp(out, 0, 1); ctx.translate(VX + 700, 250); ctx.rotate(-0.03); ctx.scale(sc, sc); ctx.drawImage(c.img, -480, -140); ctx.restore();
}
function drawBanners(R) {
  let y = 54;
  for (const b of R.banners) {
    const el = R.t - b.t0; if (el > 3.2 || b.title === 'CAW!' || /^SNATCHED/.test(b.title)) continue;
    const a = clamp(Math.min(el / 0.2, (3.2 - el) / 0.4), 0, 1), col = { good: P.good, bad: '#c0392b', warn: '#e07b1a', info: P.panel }[b.kind];
    ctx.globalAlpha = a; ctx.font = `700 40px ${F}`; const tt = fit(b.title, 40, 900), w = Math.max(ctx.measureText(tt).width, 300) + 80;
    rr(VX + 700 - w / 2, y - 34, w, 96, 16); fs(col, 4, '#ffffff');
    T(tt, VX + 700, y + 4, 40, '#ffffff', 'center', { stroke: OUT, sw: 6 }); T(b.sub, VX + 700, y + 44, 22, '#ffffff', 'center', { w: 500 });
    ctx.globalAlpha = 1; y += 108;
  }
}

/* ===================================================================== shared chrome */
function drawBG() {
  if (TRANSPARENT) return;
  const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, P.bgA); g.addColorStop(1, P.bgB); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = P.text; for (let y = 130; y < 1080; y += 60) for (let x = (y / 60 % 2) * 30; x < 1920; x += 60) { circ(x, y, 3); ctx.fill(); } ctx.restore();
}
function chatPill(x, y, small) {
  const live = Kick.status === 'live', test = settings.testMode === 'on';
  const txt = live && test ? 'KICK CHAT LIVE + TEST BOTS' : live ? 'KICK CHAT LIVE' : test ? 'TEST MODE (BOTS)' : Kick.status === 'connecting' ? 'CONNECTING TO CHAT' : 'CHAT OFFLINE';
  const col = live ? '#3dff7a' : test ? '#ffd23f' : '#ff6070', fz = small ? 18 : 22;
  ctx.font = `700 ${fz}px ${F}`; const w = ctx.measureText(txt).width + 50;
  rr(x - w, y - fz, w, fz * 2, fz); fs(OUT); circ(x - w + 20, y, 7); fs(col); T(txt, x - 16, y + 1, fz, '#ffffff', 'right');
}
function credit(x, y, col, size) { T(CREDIT, x, y, size || 22, col || P.muted, 'center', { w: 500, raw: true }); }   // shown in EVERY theme, never rewritten
function header(center, sub) {
  ctx.fillStyle = P.bar; ctx.fillRect(0, 0, 1920, 100); ctx.fillStyle = P.hi; ctx.fillRect(0, 100, 1920, 6);
  T('SHINY RUN', 40, 52, 64, P.ink, 'left'); ctx.font = `700 64px ${F}`; const lx = 40 + ctx.measureText('SHINY RUN').width + 22;
  const st = sayText(THEME.subtitle).split(' '), half = Math.ceil(st.length / 2);
  T(st.slice(0, half).join(' '), lx, 38, 20, P.muted, 'left', { w: 500 }); T(st.slice(half).join(' '), lx, 64, 20, P.muted, 'left', { w: 500 });
  if (center) T(center, 1100, sub ? 40 : 52, sub ? 44 : 50, P.ink, 'center');
  if (sub) T(sub, 1100, 80, 22, P.muted, 'center', { w: 500 });
  chatPill(1890, 52);
}
function brandSign(x, y, w) {   // croww: the neon CROWW sign; neutral: a code-drawn SHINY RUN neon sign (no branding)
  if (THEME.sign && artReady(THEME.sign)) { const im = ART[THEME.sign], h = w * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); return; }
  const s = w / 7.2;
  T('SHINY RUN', x, y, s, 'rgba(0,0,0,0)', 'center', { stroke: rgba(P.tan, 0.25), sw: s * 0.3 });
  T('SHINY RUN', x, y, s, 'rgba(0,0,0,0)', 'center', { stroke: P.tan, sw: s * 0.09 });
  T('SHINY RUN', x, y, s, 'rgba(0,0,0,0)', 'center', { stroke: '#e9fffb', sw: s * 0.03 });
}
function mascot(x, y, s) { const k = THEME.mascot; if (artReady(k)) ctx.drawImage(ART[k], x, y, s, s); }
function drawBoard(x, y, w, h, title, rowsN) {
  rr(x, y, w, h, 22); fs(P.bgB, 4, P.hi);
  T(title || 'LEADERBOARD', x + w / 2, y + 40, 38, P.hi, 'center');
  T('this stream \u00b7 10 / 6 / 4 + 1 for finishing', x + w / 2, y + 76, 22, P.textDim, 'center', { w: 500 });
  const rows = topBoard(rowsN || DATA.boardSize);
  T('PTS', x + w - 110, y + 108, 17, P.textDim, 'right', { w: 500 }); T('WINS', x + w - 24, y + 108, 17, P.textDim, 'right', { w: 500 });
  if (!rows.length) { T('No points yet.', x + w / 2, y + 170, 30, P.text, 'center'); T('Finish a race to get on the board!', x + w / 2, y + 208, 22, P.textDim, 'center', { w: 500 }); }
  const rh = Math.min(44, (h - 140) / Math.max(1, rows.length));
  rows.forEach((r, i) => {
    const yy = y + 140 + i * rh;
    if (i % 2 === 0) { rr(x + 12, yy - rh / 2 + 2, w - 24, rh - 4, 10); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); }
    T((i + 1) + '.', x + 46, yy, 24, i < 3 ? P.hi : P.textDim, 'right');
    const bl = blingLevel(r.k); let nx = x + 56;
    if (bl) { star(ctx, nx + 10, yy, 10, 0, '#ffd94a', 0.35); nx += 24; }
    T(fit(r.u || r.k, 24, w - 230, 600), nx, yy, 24, P.text, 'left', { w: 600 });
    T(String(r.pts), x + w - 110, yy, 26, P.hi, 'right'); T(String(r.wins || 0), x + w - 24, yy, 22, r.wins ? P.text : P.textDim, 'right');
  });
}
function trinketAt(x, y, r, type, col, bl, t, seed) { ctx.save(); ctx.translate(x, y); ctx.scale(r / DATA.race.r, r / DATA.race.r); drawTrinket(ctx, type, col, DATA.race.r, bl); ctx.restore(); if (bl >= 2 && t != null) drawBlingFx(x, y, r, bl, t, seed || 0); }

/* ===================================================================== title */
function drawTitle(t) {
  drawBG();
  brandSign(960, 170, THEME.sign ? 560 : 700);
  T('SHINY RUN', 960, 400, 200, P.hi, 'center', { stroke: OUT, sw: 18 });
  T(THEME.subtitle, 960, 530, 40, P.text, 'center', { w: 500 });
  DATA.types.forEach((ty, i) => { const x = ((t * 300 + i * 480) % 2200) - 140; trinketAt(x, 680 + Math.abs(Math.sin(t * 4 + i)) * -40, 46, ty, DEFAULT_COLORS[i * 2], 0); });
  mascot(1560, 690, 330);
  T('lobby opening\u2026', 960, 860, 34, P.textDim, 'center', { w: 500 });
  credit(960, 1040, P.textDim, 24);
}

/* ===================================================================== lobby */
function moodIcon(x, y, s, id, t) { drawGiantCrow(x, y, s, t * (id === 'lazy' ? 0.4 : id === 'furious' ? 1.6 : 1), { flapSpeed: id === 'furious' ? 14 : 6 }); if (id === 'greedy') trinketAt(x, y + s * 0.3, s * 0.07, 'gem', '#39e6ff', 0); }
function drawLobby(t) {
  drawBG();
  const L = G.lobby, mood = DATA.moods[L.mood], n = L.players.size;
  header('RACE #' + G.raceNo + ' \u00b7 LOBBY', n ? n + (n === 1 ? ' racer' : ' racers') + ' in' : 'waiting for racers');
  // left: how to join
  rr(40, 130, 620, 330, 24); fs(P.card, 5, P.hi);
  T('TYPE  !play  TO JOIN', 350, 182, 54, P.cardInk, 'center');
  T('pick a trinket:  !play cap \u00b7 coin \u00b7 ring \u00b7 gem', 350, 236, 26, P.muted, 'center', { w: 600 });
  DATA.types.forEach((ty, i) => { const x = 125 + i * 150; trinketAt(x, 320, 34, ty, DEFAULT_COLORS[(i * 3) % DEFAULT_COLORS.length], 0); T(DATA.typeNames[ty], x, 380, 20, P.cardInk, 'center'); });
  T('all trinkets race the same \u00b7 your Kick name color tints yours', 350, 428, 21, P.muted, 'center', { w: 500 });
  // crow mood
  rr(40, 480, 620, 230, 24); fs(P.bgB, 4, P.panelLine);
  moodIcon(150, 590, 190, L.mood, t);
  T("TONIGHT'S CROW", 270, 528, 24, P.textDim, 'left'); T(mood.name, 270, 580, 64, mood.name === 'FURIOUS' ? '#ff6a4a' : P.hi, 'left', { stroke: OUT, sw: 7 });
  T(mood.line, 270, 636, 24, P.text, 'left', { w: 500 });
  T('if it snatches you: chat spams !caw to save you', 270, 676, 20, P.textDim, 'left', { w: 500 });
  // track + countdown
  rr(40, 730, 620, 120, 24); fs(P.bgB, 4, P.panelLine);
  T('NEXT TRACK', 70, 765, 22, P.textDim, 'left'); T(TRACKS[L.trackId].name, 70, 812, 46, P.text, 'left');
  const secs = Math.ceil(Math.max(0, G.t));
  circ(560, 790, 52); fs(P.hi, 5, OUT); T(String(secs), 560, 793, 56, OUT, 'center');
  // middle: racers
  T('RACERS', 700, 152, 40, P.hi, 'left'); T(String(n), 1290, 152, 40, P.text, 'right');
  const list = [...L.players.values()].reverse(), cols = 3, rows = 16, cw = 200, max = cols * rows;
  if (!n) { T('No racers yet', 995, 400, 40, P.textDim, 'center'); T('be the first: type !play', 995, 450, 28, P.textDim, 'center', { w: 500 }); }
  list.slice(0, n > max ? max - 1 : max).forEach((p, i) => {
    const cx = 700 + Math.floor(i / rows) * (cw + 10), cy = 200 + (i % rows) * 44;
    rr(cx, cy - 19, cw, 38, 10); ctx.fillStyle = i < 3 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'; ctx.fill();
    trinketAt(cx + 20, cy, 13, p.type, p.color, blingLevel(p.key));
    T(fit(p.u, 20, cw - 46, 600), cx + 40, cy + 1, 20, P.text, 'left', { w: 600 });
  });
  if (n > max) T('+ ' + (n - max + 1) + ' more', 700 + 2 * (cw + 10) + cw / 2, 200 + (rows - 1) * 44, 22, P.hi, 'center');
  // right: sign, leaderboard, mascot
  brandSign(1600, 168, THEME.sign ? 330 : 420);
  drawBoard(1330, 235, 550, 560, 'LEADERBOARD', 9);
  mascot(1600, 790, 220);
  T(L.full ? 'lobby full (' + DATA.race.maxRacers + ')' : '', 1460, 830, 22, P.textDim, 'center');
  // footer
  ctx.fillStyle = P.bar; ctx.fillRect(0, 1000, 1920, 80);
  T(n ? 'RACE STARTS IN ' + secs : (L.waited ? 'still waiting for racers \u2014 ' : 'race starts when someone joins \u2014 ') + 'type !play', 700, 1040, 32, P.ink, 'left');
  credit(350, 1040, P.muted, 24);
}

/* ===================================================================== race */
function drawRace(t) {
  const R = G.R;
  ctx.save();
  if (R.shake > 0) ctx.translate(rand(-R.shake, R.shake), rand(-R.shake, R.shake) * 0.6);
  ctx.beginPath(); ctx.rect(0, 0, VW, 1080); ctx.clip();
  drawBackdrop(R); drawTrack(R); drawRacers(R, t);
  drawCrowLayer(R, t);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, 1080); ctx.clip();
  drawEffects(R, t); drawBanners(R); drawCard(R, t); drawReplay(R, t);
  if (R.t < 0.6) { const n = Math.ceil(-R.t), s = n > 0 ? String(n) : 'GO!'; T(s, VX + 700, 520, 220, P.hi, 'center', { stroke: OUT, sw: 18 }); if (n > 0) T(TRACKS[R.T.id].name, VX + 700, 680, 50, '#ffffff', 'center', { stroke: OUT, sw: 8 }); }
  ctx.restore();
  drawPanel(R, t);
}
function drawPanel(R, t) {
  const x = VW, w = 1920 - VW, cx = x + w / 2;
  ctx.fillStyle = P.panel; ctx.fillRect(x, 0, w, 1080); ctx.fillStyle = P.hi; ctx.fillRect(x, 0, 5, 1080);
  if (THEME.sign) { brandSign(cx, 58, 300); T('SHINY RUN', cx, 132, 40, P.hi, 'center'); }
  else { brandSign(cx, 70, 380); }
  T(R.T.def.name, cx, 172, 26, P.text, 'center', { w: 600 });
  const secs = Math.max(0, Math.floor(R.t));
  T('RACE #' + G.raceNo + ' \u00b7 ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0'), cx, 204, 22, P.textDim, 'center', { w: 500 });
  // crow mood
  rr(x + 18, 228, w - 36, 66, 14); fs(P.bgB, 3, P.panelLine);
  T('CROW: ' + R.mood.name, x + 34, 250, 26, R.moodId === 'furious' ? '#ff6a4a' : P.hi, 'left');
  const left = R.mood.snatches - R.crow.idx;
  T(fit(R.mood.line, 18, w - 70, 500), x + 34, 278, 18, P.textDim, 'left', { w: 500 });
  T(left > 0 ? left + ' left' : 'done', x + w - 34, 250, 20, P.text, 'right', { w: 500 });
  // top 5
  rr(x + 18, 308, w - 36, 330, 18); fs(P.bgB, 3, P.panelLine);
  T('TOP 5', x + 36, 336, 28, P.hi, 'left');
  const run = R.racers.filter(r => r.state === 'run').length, fin = R.finished.length;
  T(fin + ' / ' + R.total + ' finished', x + w - 36, 336, 20, P.textDim, 'right', { w: 500 });
  R.order.slice(0, 5).forEach((r, i) => {
    const yy = 378 + i * 48;
    if (i % 2 === 0) { rr(x + 28, yy - 22, w - 56, 44, 10); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); }
    T(String(i + 1), x + 52, yy, 28, i === 0 ? '#ffd94a' : P.text, 'center');
    trinketAt(x + 88, yy, 15, r.type, r.color, r.bling);
    T(fit(r.u, 24, w - 210, 600), x + 112, yy, 24, r.state === 'out' ? P.textDim : P.text, 'left', { w: 600 });
    T(r.state === 'fin' ? r.time.toFixed(1) + 's' : r.state === 'nest' ? 'NEST' : r.state === 'out' ? 'OUT' : '', x + w - 40, yy, 20, r.state === 'fin' ? P.hi : P.textDim, 'right');
  });
  T(run + ' racing' + (R.snatched.length ? ' \u00b7 ' + R.snatched.length + ' snatched' : ''), cx, 620, 20, P.textDim, 'center', { w: 500 });
  // crow's nest
  const N = R.nest, ny = 652;
  rr(x + 18, ny, w - 36, 238, 18); fs(N ? '#2a1a10' : P.bgB, N ? 5 : 3, N ? '#ff8a3a' : P.panelLine);
  T("CROW'S NEST", x + 36, ny + 28, 28, N ? '#ffb070' : P.hi, 'left');
  // nest drawing
  const nx = x + 92, nyy = ny + 120;
  ell(nx, nyy + 18, 62, 26); fs('#6b4a2a', 4, '#2a1a0c');
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(nx - 60 + i * 14, nyy + 8 + (i % 2) * 6); ctx.lineTo(nx - 46 + i * 14, nyy + 30 - (i % 2) * 6); ctx.stroke(); }
  if (N) {
    trinketAt(nx, nyy + 2 + Math.sin(t * 8) * 3, 22, N.r.type, N.r.color, N.r.bling);
    T(fit(N.r.u, 26, w - 200, 600), x + 170, ny + 76, 26, '#ffffff', 'left', { w: 600 });
    T(N.state === 'rescued' ? 'RESCUED!' : 'type !caw to save it', x + 170, ny + 110, 24, N.state === 'rescued' ? '#7dff9a' : '#ffd23f', 'left');
    const c = N.cawers.size, k = clamp(c / N.need, 0, 1), bx = x + 36, bw = w - 72;
    rr(bx, ny + 160, bw, 34, 12); fs('#140c08', 3, '#ff8a3a'); if (k > 0) { rr(bx + 3, ny + 163, (bw - 6) * k, 28, 10); fs(k >= 1 ? '#5fd17a' : '#ff8a3a'); }
    T('!caw ' + Math.min(c, N.need) + ' / ' + N.need, bx + bw / 2, ny + 178, 22, '#ffffff', 'center', { stroke: OUT, sw: 5 });
    const tk = clamp(N.t / DATA.rescue.window, 0, 1); rr(bx, ny + 206, bw, 12, 6); fs('#140c08'); rr(bx, ny + 206, bw * tk, 12, 6); fs('#ffd23f');
    T(Math.ceil(Math.max(0, N.t)) + 's', bx + bw, ny + 28, 22, '#ffd23f', 'right');
  } else {
    T('empty for now', x + 170, ny + 92, 24, P.textDim, 'left', { w: 500 });
    T('if the crow snatches a racer,', x + 170, ny + 132, 20, P.textDim, 'left', { w: 500 }); T('chat types !caw to save it', x + 170, ny + 158, 20, P.textDim, 'left', { w: 500 });
    T('need ' + rescueNeed(R) + ' chatters in 10s', x + 170, ny + 196, 20, P.hi, 'left', { w: 500 });
  }
  // chaos vote / commands
  const V = R.vote, vy = 900;
  if (V && (V.state === 'open' || (V.show || 0) > 0)) {
    rr(x + 18, vy, w - 36, 128, 18); fs('#1a1430', 5, '#b07aff');
    T('CHAOS VOTE', x + 36, vy + 26, 28, '#d6b8ff', 'left');
    T(V.state === 'open' ? 'min ' + V.need + ' \u00b7 ' + Math.ceil(V.t) + 's' : V.state === 'fail' ? 'not enough votes' : V.result.toUpperCase() + ' wins!', x + w - 36, vy + 26, 22, '#ffffff', 'right');
    const c = voteCounts(V), tot = Math.max(1, c.wind + c.quake);
    [['wind', '!wind', '#5fb8e8'], ['quake', '!quake', '#e8a04a']].forEach(([k, lab, col], i) => {
      const yy = vy + 64 + i * 38, bw = w - 200;
      T(lab, x + 36, yy, 24, '#ffffff', 'left'); rr(x + 130, yy - 13, bw, 26, 8); fs('#0e0a1e'); if (c[k]) { rr(x + 130, yy - 13, bw * c[k] / tot, 26, 8); fs(col); }
      T(String(c[k]), x + w - 36, yy, 22, '#ffffff', 'right');
    });
  } else {
    T('!caw  save a snatched racer', x + 36, vy + 24, 20, P.textDim, 'left', { w: 500 });
    T('!wind / !quake  only during a chaos vote', x + 36, vy + 52, 20, P.textDim, 'left', { w: 500 });
    T('!play  join the next race in the lobby', x + 36, vy + 80, 20, P.textDim, 'left', { w: 500 });
  }
  chatPill(1900, 1058, true);
}

/* ===================================================================== results */
function drawResults(t) {
  drawBG();
  const res = G.result;
  header('RESULTS \u00b7 RACE #' + G.raceNo, res.track + (res.called ? ' \u00b7 race called' : ''));
  const pod = res.podium, base = 760, cols = [[1, 340, 250], [0, 640, 330], [2, 940, 190]];   // [podium index, center x, block height]
  if (!pod.length) T('No one finished this time!', 640, 450, 60, P.text, 'center');
  for (const [i, px, h] of cols) {
    const p = pod[i]; const bx = px - 135;
    rr(bx, base - h, 270, h, 14); fs(i === 0 ? P.hi : i === 1 ? '#c9ccd2' : '#c98a4a', 5, OUT);
    T(String(i + 1), px, base - h + 60, 80, OUT, 'center');
    if (!p) continue;
    const ty = base - h - 128 + Math.sin(t * 3 + i) * 5;
    if (i === 0) { for (let k = 0; k < 6; k++) { const a = t * 1.5 + k * Math.PI / 3; star(ctx, px + Math.cos(a) * 110, ty + Math.sin(a) * 70, 12, a, '#fff6c0', 0.3); } }
    trinketAt(px, ty, i === 0 ? 62 : 52, p.type, p.color, p.bling, t, i);
    T(fit(p.u, 34, 300), px, base - h - 30, 34, P.text, 'center', { stroke: OUT, sw: 6 });
    T('+' + p.pts + ' pts', px, base - h + 120, 30, OUT, 'center');
    if (p.fin) T(p.time.toFixed(1) + 's', px, base - h + 158, 22, OUT, 'center', { w: 600 });
  }
  if (pod[0]) T(fit('WINNER: ' + pod[0].u, 56, 1100), 640, 160, 56, P.hi, 'center', { stroke: OUT, sw: 8 });
  // summary
  rr(80, 790, 1120, 190, 22); fs(P.bgB, 4, P.panelLine);
  T(res.finishers + ' of ' + res.total + ' finished' + (res.dnf ? ' \u00b7 ' + res.dnf + ' did not finish' : ''), 110, 828, 30, P.text, 'left');
  T('Crow mood: ' + res.mood + (res.out.length ? ' \u00b7 knocked out by the crow: ' + res.out.slice(0, 3).join(', ') + (res.out.length > 3 ? ' +' + (res.out.length - 3) : '') : ' \u00b7 nobody lost to the crow'), 110, 872, 24, P.textDim, 'left', { w: 500 });
  if (res.blingUp) T(res.blingUp.up ? '\u2605 ' + res.blingUp.u + ' unlocked BLING LEVEL ' + res.blingUp.level + '! (cosmetic shine, ' + res.blingUp.wins + (res.blingUp.wins === 1 ? ' win)' : ' wins)') : '\u2605 ' + res.blingUp.u + ' now has ' + res.blingUp.wins + ' wins (bling level ' + res.blingUp.level + ')', 110, 920, 26, '#ffd94a', 'left');
  T('points: 10 / 6 / 4 for the podium + 1 for finishing \u00b7 wins add shine only', 110, 958, 20, P.textDim, 'left', { w: 500 });
  drawBoard(1270, 130, 610, 850);
  ctx.fillStyle = P.bar; ctx.fillRect(0, 1000, 1920, 80);
  T('NEXT LOBBY IN ' + Math.ceil(Math.max(0, G.t)), 960, 1040, 34, P.ink, 'center');
}

/* ===================================================================== frame */
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (TRANSPARENT) ctx.clearRect(0, 0, 1920, 1080);
  if (G.phase === 'title') drawTitle(t);
  else if (G.phase === 'lobby') drawLobby(t);
  else if (G.phase === 'race') drawRace(t);
  else if (G.phase === 'results') drawResults(t);
  if (G.paused) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 1920, 1080); T('PAUSED', 960, 500, 140, P.hi, 'center', { stroke: OUT, sw: 14 }); T('press P to resume', 960, 610, 34, '#fff', 'center', { w: 500 }); }
}

