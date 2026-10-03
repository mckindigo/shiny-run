/* =====================================================================
   THEMES - the look (chrome colors, wording, mascot/sign art). Game logic never reads this.
   - 'croww' (default): Croww palette (cream #FEF9E5, maroon #4A1A1A, olive #606248, tan #967846), neon CROWW sign, hooded mascot.
   - 'neutral': Art's palette (chat-clash brand/neutral/palette.json) + the Pip mascot. No Croww name anywhere except the credit.
   Every canvas string goes through sayText(); the neutral `say` list is a catch-all so a stray "croww" (e.g. a chatter's
   name) never reaches the screen. The credit line is drawn raw (never rewritten).
   Selection: ?theme=<id> (also saved), else localStorage 'shinyrun.theme', else 'croww'. Settings > Theme switches live.
   ===================================================================== */
const THEMES = {
  croww: {
    id: 'croww', label: 'Croww (default)', plainLabel: 'Original (default)', docTitle: 'Shiny Run - Croww',
    subtitle: "CROWW'S CHAT MARBLE RACE", mascot: 'mascot', sign: 'sign',
    pal: { bar: '#FEF9E5', ink: '#4A1A1A', muted: '#606248', gold: '#967846', hi: '#E8B64A', good: '#5c8f3a', bad: '#c0392b',
      bgA: '#4A1A1A', bgB: '#2a0e0e', panel: '#3a1414', panelLine: '#967846', card: '#FEF9E5', cardInk: '#4A1A1A', cardLine: '#d8c9a0',
      text: '#FEF9E5', textDim: '#d4c49c', olive: '#606248', tan: '#967846' }
  },
  neutral: {
    id: 'neutral', label: 'Neutral (no branding)', docTitle: 'Shiny Run', subtitle: 'CHAT MARBLE RACE', mascot: 'neutral.mascot', sign: null,
    pal: { bar: '#F4F6F9', ink: '#1E293B', muted: '#5B6B80', gold: '#B45309', hi: '#F59E0B', good: '#16A34A', bad: '#DC2626',
      bgA: '#1E293B', bgB: '#0F172A', panel: '#172033', panelLine: '#475569', card: '#FFFFFF', cardInk: '#1E293B', cardLine: '#D5DCE5',
      text: '#F4F6F9', textDim: '#CBD5E1', olive: '#0D9488', tan: '#2DD4BF' },
    say: [[/\bCROWW'S\b/g, "THE STREAMER'S"], [/\bCroww's\b/g, "the streamer's"], [/croww/gi, m => m === 'CROWW' ? 'STREAMER' : 'streamer']]
  }
};
const THEME_KEY = 'shinyrun.theme';
let THEME = THEMES.croww, P = THEME.pal;
const CREDIT = 'made by Croww \u00b7 kick.com/croww';
function sayText(s) { if (!THEME.say || typeof s !== 'string' || !/croww/i.test(s)) return s; for (const [re, rep] of THEME.say) s = s.replace(re, rep); return s; }
function setTheme(id, save) {
  THEME = THEMES[id] || THEMES.croww; P = THEME.pal;
  if (save) try { localStorage.setItem(THEME_KEY, THEME.id); } catch (e) {}
  document.title = THEME.docTitle;
  const r = document.documentElement.style;   // settings box + pause button colors
  r.setProperty('--panel', P.bgA); r.setProperty('--accent', P.hi); r.setProperty('--line', P.muted); r.setProperty('--btn', P.bgB); r.setProperty('--ink2', P.text);
  if (typeof onThemeChange === 'function') onThemeChange();
}
(function () {
  let id = String(qs.get('theme') || '').trim().toLowerCase(), save = !!THEMES[id];
  if (!THEMES[id]) { try { id = localStorage.getItem(THEME_KEY); } catch (e) { id = null; } }
  setTheme(THEMES[id] ? id : 'croww', save);
})();
