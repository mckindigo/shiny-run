/* ===================================================================== settings UI + keys */
function $(id) { return document.getElementById(id); }
let settingsOpen = false;
function toggleSettings(v) { settingsOpen = v == null ? !settingsOpen : v; $('settings').classList.toggle('hidden', !settingsOpen); if (settingsOpen) syncSettingsUI(); }
function setPaused(v) { G.paused = v == null ? !G.paused : !!v; $('pauseBtn').textContent = G.paused ? '\u25B6' : 'II'; }
function updateStatusUI() {
  const el = $('sStatus'); if (!el) return;
  const col = { live: '#3dff7a', connecting: '#ffd23f', error: '#ff6070', off: '#bfae86' }[Kick.status];
  el.innerHTML = `<span style="color:${col}">\u25CF ${Kick.status.toUpperCase()}</span>&nbsp; <span class="hint">${String(Kick.detail).replace(/</g, '&lt;')}</span>`;
}
function syncSettingsUI() {
  $('sChannel').value = settings.channel; $('sRoom').value = settings.rooms[settings.channel] || ''; $('sTest').value = settings.testMode; $('sBots').value = settings.bots; $('sLobby').value = settings.lobby;
  themeOptions(); $('vReset').textContent = Object.keys(board).length + ' chatters on the board'; $('vBling').textContent = Object.keys(bling).length + ' chatters with bling (wins)'; updateStatusUI();
}
function themeOptions() { $('sTheme').innerHTML = Object.values(THEMES).map(th => `<option value="${th.id}">${(THEME.say && th.plainLabel) || th.label}</option>`).join(''); $('sTheme').value = THEME.id; }
function readChannel() { const ch = $('sChannel').value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?kick\.com\//, '').replace(/[^a-z0-9_\-]/g, ''); if (ch && ch !== settings.channel) { settings.channel = ch; $('sRoom').value = settings.rooms[ch] || ''; } }
$('sChannel').addEventListener('change', () => { readChannel(); saveSettings(); });
$('sRoom').addEventListener('change', () => { const v = $('sRoom').value.trim().replace(/\D/g, ''); if (v) settings.rooms[settings.channel] = v; else delete settings.rooms[settings.channel]; saveSettings(); });
$('bConnect').onclick = () => { readChannel(); const v = $('sRoom').value.trim().replace(/\D/g, ''); if (v) settings.rooms[settings.channel] = v; settings.autoConnect = true; saveSettings(); Kick.connect(); };
$('bDisconnect').onclick = () => { settings.autoConnect = false; saveSettings(); Kick.disconnect(); };
$('bLookup').onclick = async () => { readChannel(); delete settings.rooms[settings.channel]; $('sRoom').value = ''; const id = await Kick.lookup(); if (id) Kick.connect(); };
function dropQuery(k) { try { if (qs.has(k)) { qs.delete(k); const s = qs.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } } catch (e) {} }
function setTestMode(on) {
  settings.testMode = on ? 'on' : 'off'; saveSettings(); dropQuery('test');
  if (on) { if (G.phase === 'lobby') BOT.plan(); } else BOT.purge();
  syncSettingsUI();
}
$('sTest').onchange = () => setTestMode($('sTest').value === 'on');
$('sBots').onchange = () => { settings.bots = clamp(Math.round(+$('sBots').value || 60), 1, 300); saveSettings(); dropQuery('bots'); if (G.phase === 'lobby' && settings.testMode === 'on') BOT.plan(); syncSettingsUI(); };
$('sLobby').onchange = () => { settings.lobby = clamp(Math.round(+$('sLobby').value || DATA.phase.lobby), 20, 90); saveSettings(); syncSettingsUI(); };
$('sTheme').onchange = () => { setTheme($('sTheme').value, true); themeOptions(); dropQuery('theme'); };
$('bReset').onclick = () => { if (confirm('Reset the Shiny Run leaderboard (all points and wins)?')) { resetBoard(); syncSettingsUI(); } };
$('bResetBling').onclick = () => { if (confirm('Reset everyone\'s bling (win shine)?')) { resetBling(); syncSettingsUI(); } };
$('bPause').onclick = () => setPaused();
$('pauseBtn').onclick = () => setPaused();
$('bClose').onclick = () => toggleSettings(false);
function sendFake() { const u = $('fUser').value.trim() || 'tester', m = $('fMsg').value.trim(); if (!m) return; onChat(u, m, 'manual'); $('fMsg').value = ''; }
$('bSend').onclick = sendFake; $('fMsg').addEventListener('keydown', e => { if (e.key === 'Enter') sendFake(); });
window.addEventListener('keydown', e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 's') toggleSettings();
  else if (k === 'escape' && settingsOpen) toggleSettings(false);
  else if (k === 'p') setPaused();
  else if (k === 'n' && !G.paused) skipPhase();
});

/* ===================================================================== scale + loop */
function resize() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); $('stage').style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`; }
window.addEventListener('resize', resize); resize();
syncSettingsUI();
if (document.fonts) document.fonts.load('700 40px Oswald');
if (settings.autoConnect) Kick.connect(); else Kick.set('off', 'auto-connect off - press Connect');
let last = performance.now(), manual = false;
const PERF = { frames: 0, upd: 0, ren: 0, worst: 0, ints: [], reset() { this.frames = 0; this.upd = 0; this.ren = 0; this.worst = 0; this.ints = []; this.t0 = performance.now(); },
  stats() { const a = this.ints.slice().sort((x, y) => x - y), el = (performance.now() - this.t0) / 1000; return { fps: this.frames / el, upd: this.upd / this.frames, ren: this.ren / this.frames, worst: this.worst, p50: a[a.length >> 1], p95: a[Math.floor(a.length * 0.95)], p99: a[Math.floor(a.length * 0.99)], long: a.filter(x => x > 25).length, frames: this.frames }; } };
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); if (PERF.t0) PERF.ints.push(now - last); last = now;   // clamped: a hidden tab never jumps
  const a = performance.now();
  if (!manual) update(dt);
  const b = performance.now();
  render(G.anim);
  const c = performance.now();
  PERF.frames++; PERF.upd += b - a; PERF.ren += c - b; PERF.worst = Math.max(PERF.worst, c - a);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
/* console / test hooks */
window.SR = {
  G, DATA, settings, Kick, BOT, PERF, onChat, setPhase, skipPhase, setTheme, setTestMode, setPaused, topBoard, resetBoard, resetBling, toggleSettings, startSnatch, startVote, blingLevel,
  get board() { return board; }, get bling() { return bling; }, get theme() { return THEME.id; },
  step(sec, dt) { dt = dt || 1 / 60; const n = Math.round(sec / dt); for (let i = 0; i < n; i++) update(dt); },
  manual(v) { manual = v; last = performance.now(); }, render(t) { render(t != null ? t : G.anim); }
};
