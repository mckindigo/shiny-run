'use strict';
/* =====================================================================
   SHINY RUN - all tunable numbers live here
   ===================================================================== */
const DATA = {
  W: 1920, H: 1080,
  view: { w: 1480, trackW: 1400, x0: 40 },        // playfield on screen (left), track world is 1400 wide, drawn at x0
  phase: { title: 5, lobby: 40, results: 14 },
  race: { cap: 100, afterFirst: 34, spawnEvery: 0.22, spawnBatch: 9, maxRacers: 260, r: 13, maxSpeed: 17, stuckTime: 2.6 },
  types: ['cap', 'coin', 'ring', 'gem'],          // purely cosmetic: identical physics for every type
  typeNames: { cap: 'BOTTLE CAP', coin: 'COIN', ring: 'RING', gem: 'GEM' },
  points: [10, 6, 4], finishPoint: 1,
  // the giant crow. warn = seconds of shadow + CAW! before the swoop; swoop = dive length; at = leader progress (0..1) when it strikes
  moods: {
    lazy:    { name: 'LAZY',    line: 'One snatch. Takes its sweet time.', snatches: 1, warn: 2.6, swoop: 1.25, at: [[0.30, 0.55]] },
    greedy:  { name: 'GREEDY',  line: 'Only goes for GEMS.',               snatches: 1, warn: 2.0, swoop: 0.85, at: [[0.28, 0.55]], gemsOnly: true },
    furious: { name: 'FURIOUS', line: 'TWO snatches. Hide your shinies.',  snatches: 2, warn: 2.0, swoop: 0.7,  at: [[0.22, 0.40], [0.52, 0.72]] }
  },
  snatch: { frontBias: 0.72, front: 5, card: 2.8, replay: 1.9 },
  rescue: { window: 10, frac: 0.15, min: 3 },     // !caw from max(3, 15% of racers) different chatters within 10s
  vote: { chance: 0.55, window: 10, cooldown: 75, frac: 0.08, min: 3, at: [0.32, 0.62], windTime: 3.2, quakeTime: 1.6 },
  bots: { first: ['pixel', 'night', 'crumb', 'fern', 'bop', 'moth', 'kettle', 'zig', 'raven', 'soup', 'glim', 'tater', 'quill', 'moss', 'nova', 'dusk', 'pebble', 'jinx', 'echo', 'fizz', 'loot', 'gizmo', 'ash', 'rook'],
    last: ['pie', 'owl', 'zag', 'fan', 'cat', 'kid', 'lord', 'bean', 'tron', 'byte', 'wing', 'fox', 'paw', 'drip', 'gold', 'nut'],
    lines: ['lets gooo', 'CAW CAW', 'my coin is cooked', 'go go go', 'W race', 'rigged lol', 'shiny!!', 'GG', 'come on little cap', 'that bumper hates me', 'zoom'],
    colors: ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F1C', '#F15BB5', '#00BBF9', '#9EF01A', null, null] },
  kick: { pusherKey: '32cbd69e4b950bf97679', cluster: 'us2', version: '8.4.0-rc2', knownRooms: { croww: '962037' }, pingEvery: 60 },
  boardSize: 10
};

/* ===================================================================== utils */
const cv = document.getElementById('c'); let ctx = cv.getContext('2d');   // let: offscreen pre-renders swap it briefly
const F = '"Oswald","Trebuchet MS","Segoe UI","DejaVu Sans",Verdana,sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const ART = {}; for (const k in (typeof ART_SRC !== 'undefined' ? ART_SRC : {})) { const im = new Image(); im.src = ART_SRC[k]; ART[k] = im; }
function artReady(k) { const im = ART[k]; return !!(im && im.complete && im.naturalWidth); }

/* ===================================================================== settings (saved on this PC) */
const SKEY = 'shinyrun.settings.v1';
const settings = Object.assign({ channel: 'croww', rooms: {}, testMode: 'off', bots: 60, lobby: DATA.phase.lobby, autoConnect: true },
  (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })());
settings.rooms = Object.assign({}, DATA.kick.knownRooms, settings.rooms || {});
if (settings.testMode !== 'on') settings.testMode = 'off';
function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {} }
const qs = new URLSearchParams(location.search);
if (qs.get('channel')) settings.channel = qs.get('channel').toLowerCase();
if (qs.get('room')) settings.rooms[settings.channel] = qs.get('room');
if (qs.has('test')) settings.testMode = ['1', 'on', 'true', 'yes'].includes(qs.get('test').toLowerCase()) ? 'on' : 'off';
if (qs.get('bots')) settings.bots = +qs.get('bots');
settings.bots = clamp(Math.round(+settings.bots || 60), 1, 300);
settings.lobby = clamp(Math.round(+settings.lobby || DATA.phase.lobby), 20, 90);
if (qs.get('connect') === '0') settings.autoConnect = false;
const TRANSPARENT = ['1', 'true', 'on', 'yes'].includes(String(qs.get('transparent') || '').toLowerCase());
if (TRANSPARENT) document.documentElement.classList.add('transparent');

/* ===================================================================== Kick live chat (read-only public Pusher socket, no login) */
const Kick = {
  ws: null, status: 'off', detail: 'not connected', retry: 0, timer: null, pingT: null, gen: 0, msgs: 0,
  room() { return settings.rooms[settings.channel] || ''; },
  set(s, d) { this.status = s; this.detail = d; if (typeof updateStatusUI === 'function') updateStatusUI(); },
  async lookup() {
    const ch = settings.channel;
    this.set('connecting', 'looking up chatroom id for ' + ch + '...');
    try {
      const r = await fetch('https://kick.com/api/v2/channels/' + encodeURIComponent(ch), { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(), id = j && j.chatroom && j.chatroom.id;
      if (!id) throw new Error('no chatroom id');
      settings.rooms[ch] = String(id); saveSettings(); if (typeof syncSettingsUI === 'function') syncSettingsUI();
      return String(id);
    } catch (e) { this.set('error', 'lookup blocked (' + e.message + ') - paste the chatroom id in settings'); return ''; }
  },
  async connect() {
    this.disconnect(true);
    const gen = ++this.gen;
    let id = this.room();
    if (!id) id = await this.lookup();
    if (!id || gen !== this.gen) return;
    this.set('connecting', 'connecting to #' + settings.channel + ' (room ' + id + ')...');
    const url = `wss://ws-${DATA.kick.cluster}.pusher.com/app/${DATA.kick.pusherKey}?protocol=7&client=js&version=${DATA.kick.version}&flash=false`;
    let ws;
    try { ws = new WebSocket(url); } catch (e) { this.set('error', 'websocket failed: ' + e.message); return; }
    this.ws = ws;
    ws.onmessage = ev => {
      if (gen !== this.gen) return;
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.event === 'pusher:connection_established') ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: 'chatrooms.' + id + '.v2' } }));
      else if (m.event === 'pusher_internal:subscription_succeeded') { this.retry = 0; this.set('live', 'LIVE: reading #' + settings.channel + ' chat (room ' + id + ')'); }
      else if (m.event === 'pusher:ping') ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      else if (m.event === 'pusher:error') this.set('error', 'pusher error: ' + JSON.stringify(m.data).slice(0, 80));
      else if (m.event === 'App\\Events\\ChatMessageEvent') {
        let d = m.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
        if (d && d.sender && d.content != null) {
          this.msgs++;
          const col = d.sender.identity && d.sender.identity.color;
          onChat(d.sender.username, d.content, 'kick', /^#[0-9a-f]{3,8}$/i.test(col || '') ? col : null);
        }
      }
    };
    ws.onclose = () => {
      if (gen !== this.gen) return;
      this.ws = null; this.retry++;
      const wait = Math.min(30, 2 * this.retry);
      this.set('error', 'disconnected - retrying in ' + wait + 's');
      this.timer = setTimeout(() => { if (gen === this.gen) this.connect(); }, wait * 1000);
    };
    ws.onerror = () => {};
    this.pingT = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'pusher:ping', data: {} })); }, DATA.kick.pingEvery * 1000);
  },
  disconnect(silent) {
    this.gen++; clearTimeout(this.timer); clearInterval(this.pingT);
    if (this.ws) { try { this.ws.close(); } catch (e) {} this.ws = null; }
    if (!silent) this.set('off', 'disconnected');
  }
};
