/* =====================================================================
   TRACKS - 3 themes, built from shared sections (zigzag slopes, peg + bumper fields, spinners, funnels, drops, finish).
   World units = pixels. Track is DATA.view.trackW (1400) wide, y grows downward; the camera scrolls with the leaders.
   Parts: seg {x1,y1,x2,y2,t} | peg {x,y,r,bump} | spin {x,y,len,w,speed}. Physics bodies are made in makeWorld().
   ===================================================================== */
const TRACKS = {
  rooftop: { id: 'rooftop', name: 'ROOFTOP GUTTER RUN',
    seq: [['zig', 3], ['pegs', 6], ['zig', 3], ['spinners', 1], ['funnel', 200], ['drop', 620], ['bumpers', 1], ['zig', 3], ['spinners', 2], ['pegs', 5], ['funnel', 220], ['zig', 2]],
    pal: { sky1: '#141a33', sky2: '#3a2c55', far: '#22264a', near: '#151834', win: '#f4d27a', seg: '#7d8794', segTop: '#c9d1da', segEdge: '#2b3038', peg: '#9a5a44', pegRim: '#3a2018',
      bump: '#e0b030', bumpRim: '#5a3d08', spin: '#b7c0ca', spinEdge: '#2b3038', wall: '#2c2f45', wallEdge: '#4a4f70', finish: '#ffffff', accent: '#f4d27a' } },
  sewer: { id: 'sewer', name: 'NEON CITY SEWER',
    seq: [['pegs', 5], ['spinners', 1], ['zig', 3], ['drop', 680], ['spinners', 2], ['zig', 3], ['bumpers', 1], ['zig', 2], ['funnel', 220], ['pegs', 5], ['zig', 2], ['spinners', 1], ['zig', 1]],
    pal: { sky1: '#071417', sky2: '#0d2a2a', far: '#0f2326', near: '#163236', win: '#39ffb0', seg: '#1d3b40', segTop: '#39e6ff', segEdge: '#06181b', peg: '#ff3fa4', pegRim: '#4a0b2e',
      bump: '#39ffb0', bumpRim: '#06402c', spin: '#ff3fa4', spinEdge: '#3a0624', wall: '#0b1c1f', wallEdge: '#1f5560', finish: '#39ffb0', accent: '#39e6ff' } },
  junkyard: { id: 'junkyard', name: 'JUNKYARD',
    seq: [['zig', 3], ['funnel', 210], ['spinners', 1], ['drop', 560], ['pegs', 6], ['zig', 3], ['bumpers', 1], ['funnel', 220], ['spinners', 2], ['zig', 2], ['pegs', 4], ['zig', 2], ['bumpers', 1], ['zig', 1]],
    pal: { sky1: '#f0a35c', sky2: '#6d3f5c', far: '#7a4d4f', near: '#4a2e33', win: '#ffd27a', seg: '#8a5a32', segTop: '#c88a50', segEdge: '#33200f', peg: '#2a2a2e', pegRim: '#0e0e10',
      bump: '#d9483b', bumpRim: '#4a120c', spin: '#a7a29a', spinEdge: '#2e2b27', wall: '#3a2722', wallEdge: '#6b4a3a', finish: '#ffffff', accent: '#ffd27a' } }
};
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function buildTrack(id, seed) {
  const W = DATA.view.trackW, def = TRACKS[id], rnd = mulberry(seed || 1);
  const T = { id, def, W, parts: [], deco: [], drops: [], sections: [], top: -300 };
  const seg = (x1, y1, x2, y2, t) => T.parts.push({ k: 'seg', x1, y1, x2, y2, t: t || 24 });
  const peg = (x, y, r, bump) => T.parts.push({ k: 'peg', x, y, r, bump: !!bump });
  const spin = (x, y, len, speed) => T.parts.push({ k: 'spin', x, y, len, w: 22, speed });
  const kickers = y => { seg(0, y, 150, y + 70, 20); seg(W, y, W - 150, y + 70, 20); };   // push wall-huggers back into play
  let y = 260, dir = rnd() < 0.5 ? 1 : -1;
  const B = {
    zig(n) {
      const gap = 190, drop = 340, step = drop + 105;
      for (let i = 0; i < n; i++) {
        if (dir > 0) seg(-10, y, W - gap, y + drop); else seg(W + 10, y, gap, y + drop);
        y += step; dir = -dir;
      }
      y += 40;
    },
    pegs(rows) {
      kickers(y); y += 120;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? 60 : 0;
        for (let x = 70 + off; x <= W - 60; x += 120) { const b = rnd() < 0.12; peg(x + (rnd() - 0.5) * 10, y, b ? 22 : 14, b); }
        y += 100;
      }
      y += 60;
    },
    bumpers() {
      kickers(y); y += 140;
      const rows = [[260, 700, 1140], [480, 920], [260, 700, 1140]];
      for (const row of rows) { for (const x of row) peg(x + (rnd() - 0.5) * 40, y, 36, true); y += 170; }
      for (let x = 120; x < W; x += 230) peg(x, y - 60, 12);
      y += 40;
    },
    spinners(n) {
      for (let k = 0; k < n; k++) {
        kickers(y); y += 150;
        const xs = k % 2 ? [480, 920] : [250, 700, 1150];
        xs.forEach((x, i) => { spin(x, y, 290, (i % 2 ? -1 : 1) * (1.5 + rnd() * 0.6) * (k % 2 ? -1 : 1)); peg(x, y - 175, 12); });
        y += 230;
      }
    },
    funnel(open) {
      const h = 380; seg(-10, y, W / 2 - open / 2, y + h); seg(W + 10, y, W / 2 + open / 2, y + h);
      T.deco.push({ k: 'funnel', y, h }); y += h + 140;
    },
    drop(h) {
      T.deco.push({ k: 'drop', y, h }); T.drops.push(y);
      y += h;
      const open = 320, fh = 260; seg(-10, y, W / 2 - open / 2, y + fh); seg(W + 10, y, W / 2 + open / 2, y + fh);
      peg(W / 2, y + fh + 90, 26, true);
      y += fh + 200;
    }
  };
  for (const [k, a] of def.seq) { const y0 = y; B[k](a); T.sections.push({ k, y0, y1: y }); }
  T.finishY = y + 60; T.bottom = T.finishY + 260; T.len = T.finishY;
  seg(-10, T.bottom, W + 10, T.bottom, 60);   // basin floor (racers are removed when they cross the finish line anyway)
  // background decoration anchors (pure visuals)
  for (let yy = -400; yy < T.bottom + 1200; yy += 220 + rnd() * 260) T.deco.push({ k: 'bg', y: yy, x: rnd() * W, s: 0.6 + rnd() * 0.8, v: Math.floor(rnd() * 4) });
  return T;
}

/* ---------- physics world (Matter.js) */
const M = Matter;
const CAT = { track: 0x0001, racer: 0x0002 };
function makeWorld(T) {
  const engine = M.Engine.create({ enableSleeping: true, positionIterations: 5, velocityIterations: 3 });
  engine.gravity.y = 1; engine.gravity.scale = 0.0008;
  const opt = { isStatic: true, friction: 0.02, restitution: 0.25, collisionFilter: { category: CAT.track } };
  const statics = [], spinners = [];
  const H = T.bottom + 400;
  statics.push(M.Bodies.rectangle(-60, H / 2 - 400, 120, H + 800, opt), M.Bodies.rectangle(T.W + 60, H / 2 - 400, 120, H + 800, opt));
  for (const p of T.parts) {
    let b;
    if (p.k === 'seg') {
      const dx = p.x2 - p.x1, dy = p.y2 - p.y1, len = Math.hypot(dx, dy);
      b = M.Bodies.rectangle((p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2, len, p.t, Object.assign({}, opt, { angle: Math.atan2(dy, dx), chamfer: { radius: Math.min(10, p.t / 2 - 1) } }));
    } else if (p.k === 'peg') {
      b = M.Bodies.circle(p.x, p.y, p.r, Object.assign({}, opt, { restitution: p.bump ? 1.05 : 0.4 }));
    } else if (p.k === 'spin') {
      b = M.Bodies.rectangle(p.x, p.y, p.len, p.w, Object.assign({}, opt, { chamfer: { radius: 10 }, restitution: 0.3 }));
      b.spin = p; spinners.push(b);
    }
    b.part = p; p.body = b; statics.push(b);
  }
  M.Composite.add(engine.world, statics);
  M.Events.on(engine, 'collisionStart', ev => { for (const pr of ev.pairs) { const a = pr.bodyA.part, b = pr.bodyB.part; if (a && a.bump) a.hit = G.anim; if (b && b.bump) b.hit = G.anim; } });   // bumper flash
  return { engine, spinners };
}
function makeRacerBody(x, y) {
  const r = DATA.race.r;
  const b = M.Bodies.circle(x, y, r, { friction: 0.008, frictionStatic: 0.05, frictionAir: 0.0025, restitution: 0.38, density: 0.002, slop: 0.04,
    collisionFilter: { category: CAT.racer, mask: CAT.track | CAT.racer }, sleepThreshold: 50 });
  return b;
}
