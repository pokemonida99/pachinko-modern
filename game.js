// P 寶可夢 雷光RUSH — modern-style digital pachinko (デジパチ) with H3 video 演出
'use strict';
(() => {
const W = 720;
const BR = 7;           // ball radius
const PR = 4.2;         // peg radius
const G = 1500;         // gravity px/s^2
const FIRE_INTERVAL = 0.6; // s (100 balls/min)
// POW_NOISE spreads each shot's speed so the START entry rate is flat (~7%) instead of jumping with tiny power changes
let POW_MIN = 80, POW_RANGE = 700, POW_NOISE = 40, ROAD_GAP = 21, ROAD_END = 64, HESO_W = 12, FUNNEL = 70;
const POWER_L = 0.25, POWER_R = 0.6;   // 左打／右打 are fixed powers
const SAVE_KEY = 'pk_modern_v2', START_BALLS = 2000, LEND = 500;
const P_NORMAL = 1 / 99, P_RUSH = 1 / 12, ST_SPINS = 20;

// every clip that exists in assets/clips (add new names here when a clip is added)
const CLIPS = ['01_idle','02_group','03_cutin','04_sp_reach','05_sp_win','06_sp_lose','07_spsp_reach','08_spsp_win','09_spsp_lose','10_zenkaiten','11_jackpot','12_rush_in','13_rush_loop','14_premium','15_idle_bulbasaur','16_idle_pikachu','17_idle_charizard_day','18_idle_squirtle','19_idle_eevee','20_idle_snorlax','21_reach_bulbasaur','22_reach_charmander','23_reach_squirtle','24_reach_pikachu','25_reach_eevee','26_reach_snorlax','27_reach_meowth','28_reach_gengar','29_reach_mewtwo','30_win_bulbasaur','31_win_charmander','32_win_squirtle','33_win_pikachu','34_win_eevee','35_cap_snorlax','36_cap_meowth','37_cap_gengar','38_cap_mewtwo','39_lose_partner','40_lose_wild','41_sp_meowth_reach','42_sp_meowth_win','43_sp_meowth_lose','44_sp_dragonite_reach','45_sp_dragonite_win','46_sp_dragonite_lose','47_spsp_birds_reach','48_spsp_birds_win','49_spsp_birds_lose','50_rush_blastoise_reach','51_rush_blastoise_win','52_rush_blastoise_lose','53_rush_gyarados_reach','54_rush_gyarados_win','55_rush_gyarados_lose','56_chain_ride','57_chain_mega','58_chain_hooh','59_rush_end','60_cutin_blue','61_cutin_green','62_cutin_gold','63_group_caterpie','64_group_magikarp','65_premium_shiny','66_upgrade_evolve','67_round_end','68_round_dance','69_round_fly','70_lose_partner_b','71_lose_wild_b','72_rush_last','73_idle_charmander','74_idle_meowth','75_idle_gengar','76_round_splash'];
const HAVE = new Set(CLIPS);
const has = n => HAVE.has(n);
const firstHave = (...ns) => ns.find(has) || null;
const anyHave = ns => { const ok = ns.filter(has); return ok.length ? ok[rnd() * ok.length | 0] : null; };
// clip names by role; missing ones are skipped
const IDLE = ['01_idle', '15_idle_bulbasaur', '16_idle_pikachu', '17_idle_charizard_day', '18_idle_squirtle', '19_idle_eevee', '20_idle_snorlax', '73_idle_charmander', '74_idle_meowth', '75_idle_gengar'];
const SYM_NAME = [null, 'bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee', 'snorlax', 'meowth', 'gengar', 'mewtwo'];
// every number keeps its own Pokémon from reach to result. New clips (1xx/2xx/3xx…, no music) win over the older ones.
const REACH_CLIP = n => firstHave(`${320 + n}_reach_${SYM_NAME[n]}`, `${20 + n}_reach_${SYM_NAME[n]}`);
const WIN_CLIP = n => firstHave(`2${n}0_${n <= 5 ? 'win' : 'cap'}_${SYM_NAME[n]}`, n <= 5 ? `${29 + n}_win_${SYM_NAME[n]}` : `${29 + n}_cap_${SYM_NAME[n]}`);
const LOSE_CLIP = n => firstHave(`1${n}4_lose_${SYM_NAME[n]}`) || anyHave(n <= 5 ? ['39_lose_partner', '70_lose_partner_b'] : ['40_lose_wild', '71_lose_wild_b']);
// the number's own 強／超強聽牌: [opening, win (null = go straight to the number's win clip), battle lost]
const NUM_LINE = (n, sp) => { const a = `1${n}${sp ? 1 : 2}_${sp ? 'sp' : 'spsp'}_${SYM_NAME[n]}`, c = `1${n}3_blose_${SYM_NAME[n]}`; return has(a) && has(c) ? [a, null, c] : null; };
const ROUND_LIST = () => { const l = ['401_round_dance', '402_round_fly', '403_round_splash', '404_round_parade', '405_round_beach', '406_round_carnival'].filter(has); return l.length ? l : ['68_round_dance', '69_round_fly', '76_round_splash', '11_jackpot'].filter(has); };
const RUSH_LIST = () => { const l = ['411_rush_sunset', '412_rush_storm', '413_rush_ocean'].filter(has); return l.length ? l : ['13_rush_loop']; };
const NEWER = { '02_group': '502_group_pidgey', '03_cutin': '503_cutin_red', '60_cutin_blue': '560_cutin_blue', '61_cutin_green': '561_cutin_green', '62_cutin_gold': '562_cutin_gold',
  '63_group_caterpie': '563_group_caterpie', '64_group_magikarp': '564_group_magikarp', '10_zenkaiten': '510_zenkaiten', '12_rush_in': '512_rush_in', '14_premium': '514_premium_mew',
  '65_premium_shiny': '565_premium_shiny', '56_chain_ride': '556_chain_ride', '57_chain_mega': '557_chain_mega', '58_chain_hooh': '558_chain_hooh', '59_rush_end': '559_rush_end',
  '66_upgrade_evolve': '566_upgrade_evolve', '67_round_end': '567_round_end', '72_rush_last': '572_rush_last' };
const V = n => (NEWER[n] && has(NEWER[n])) ? NEWER[n] : n;   // no-music remake when it exists
const RUSH_LINES = [['50_rush_blastoise_reach', '51_rush_blastoise_win', '52_rush_blastoise_lose'], ['53_rush_gyarados_reach', '54_rush_gyarados_win', '55_rush_gyarados_lose']];
const PARTNER = n => n <= 5;
const CUT_CLIP = { blue: '60_cutin_blue', green: '61_cutin_green', red: '03_cutin', gold: '62_cutin_gold' };
const GROUP_CLIP = { cater: '63_group_caterpie', pidgey: '02_group', magi: '64_group_magikarp' };
// SP／SPSP 線：[開始, 勝, 敗]; weights make the lines differ in 信賴度 (weak → strong)
const SP_LINES = {
  meowth: ['41_sp_meowth_reach', '42_sp_meowth_win', '43_sp_meowth_lose'],
  gengar: ['04_sp_reach', '05_sp_win', '06_sp_lose'],
  sky: ['44_sp_dragonite_reach', '45_sp_dragonite_win', '46_sp_dragonite_lose'],
  mewtwo: ['07_spsp_reach', '08_spsp_win', '09_spsp_lose'],
  birds: ['47_spsp_birds_reach', '48_spsp_birds_win', '49_spsp_birds_lose'],
};
const LINE_W = { sp: { hit: { meowth: 15, gengar: 35, sky: 50 }, miss: { meowth: 50, gengar: 35, sky: 15 } }, spsp: { hit: { mewtwo: 45, birds: 55 }, miss: { mewtwo: 60, birds: 40 } } };
const UI = ['board_bg','btn_push','logo','hold_white','hold_blue','hold_green','hold_red','hold_gold','hold_rainbow'];
const HOLD_GLOW = {white:'#ffffff',blue:'#3a8bff',green:'#2fe06a',red:'#ff3048',gold:'#ffc61a',rainbow:'#ff6bff'};

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const cv = $('board'), ctx = cv.getContext('2d');
const elBalls = $('balls'), elMode = $('mode'), elModeTxt = $('modeTxt');
const elFire = $('fire'), elPush = $('push');

// ---------- assets ----------
const IMG = {};
let loadCount = 0;
const totalLoad = UI.length + 9;
function onLoaded() { loadCount++; $('loadTxt').textContent = loadCount >= totalLoad ? '準備完成' : `載入中… ${loadCount}/${totalLoad}`; }
for (const n of UI) { const i = new Image(); i.onload = onLoaded; i.onerror = onLoaded; i.src = `assets/ui/${n}.webp`; IMG[n] = i; }
// LCD text cards are drawn in code (the old image cards were Japanese): transparent, glow + dark outline so they read on any clip.
const CARD_STYLE = {
  txt_reach: ['聽牌！', ['#ffffff', '#ffb0b8', '#ff2a3c'], '#ff2a3c'],
  txt_chance: ['機會！', ['#ffffff', '#9fd4ff', '#2a7bff'], '#2a7bff'],
  txt_gekiatsu: ['激熱！', ['#fff7b0', '#ff8a00', '#ff1a2c'], '#ff3a00'],
  txt_next: ['繼續！', ['#ffffff', '#9ffcff', '#00c8ff'], '#00c8ff'],
  txt_ooatari: ['大獎！', 'rainbow', '#ffd23f'],
  txt_zenkaiten: ['全回轉', 'rainbow', '#ff6bff'],
  txt_rush: ['雷光RUSH 突入', ['#fffbe0', '#ffd23f', '#ff5a1a'], '#ffb000'],
};
function buildCards() {
  for (const k in CARD_STYLE) {
    const [text, fill, glow] = CARD_STYLE[k];
    const c = document.createElement('canvas'); c.width = 1400; c.height = 420;
    const g = c.getContext('2d');
    let fs = 270; const font = () => `900 ${fs}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
    g.font = font(); while (g.measureText(text).width > 1280) { fs -= 8; g.font = font(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const cx = 700, cy = 215;
    g.shadowColor = glow; g.shadowBlur = 60; g.strokeStyle = glow; g.lineWidth = fs * 0.2; g.strokeText(text, cx, cy);
    g.shadowBlur = 0; g.strokeStyle = '#140818'; g.lineWidth = fs * 0.12; g.strokeText(text, cx, cy);
    g.strokeStyle = '#ffffff'; g.lineWidth = fs * 0.045; g.strokeText(text, cx, cy);
    let gr;
    if (fill === 'rainbow') { gr = g.createLinearGradient(100, 0, 1300, 0); ['#ff3a4c', '#ffb000', '#ffe14a', '#4cff7a', '#3ab0ff', '#b46bff', '#ff6bd6'].forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col)); }
    else { gr = g.createLinearGradient(0, cy - fs / 2, 0, cy + fs / 2); fill.forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col)); }
    g.fillStyle = gr; g.fillText(text, cx, cy);
    IMG[k] = c;
  }
}
buildCards();
if (document.fonts) document.fonts.load('900 100px "Noto Sans TC"', '聽牌機會激熱繼續大獎全回轉雷光突入！').then(buildCards).catch(() => {});
const SYM = [];
for (let k = 1; k <= 9; k++) { const i = new Image(); i.onload = onLoaded; i.onerror = onLoaded; i.src = `assets/sym/s${k}.webp`; SYM[k] = i; }
// Videos load on demand into a small pool of <video> elements. All pool elements are unlocked for sound in the
// start tap, then reused by swapping src, so 60+ clips never download at once.
const POOL = [];
for (let i = 0; i < 6; i++) {
  const v = document.createElement('video');
  v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  $('vids').appendChild(v); POOL.push({ v, name: null, used: 0 });
}
const VID = new Proxy({}, { get: (_, n) => typeof n === 'string' && has(n) ? vidEl(n) : undefined, has: (_, n) => has(n) });
function inUse(n) { return n && (n === st.bg || n === st.fg || n === st.hold || n === st.next); }
function vidEl(n) {
  let s = POOL.find(p => p.name === n);
  if (!s) {
    s = POOL.filter(p => !inUse(p.name)).sort((a, b) => a.used - b.used)[0] || POOL[0];
    s.v.pause(); s.name = n; s.v.src = `assets/clips/${n}.mp4`; s.v.load();
    s.v.volume = S.mute ? 0 : S.volVid / 100; s.v.muted = S.mute;
  }
  s.used = performance.now();
  return s.v;
}
function prefetch(n) { if (n && has(n) && !POOL.some(p => p.name === n)) vidEl(n); }

// ---------- persistent state ----------
const save = (() => { try { if (location.search.includes('reset')) localStorage.removeItem(SAVE_KEY); return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } })();
const STATS0 = { spins: 0, spinsNormal: 0, spinsRush: 0, hits: 0, firstHits: 0, rushHits: 0, rush: 0, rushEnds: 0, chainSum: 0, maxChain: 0, fired: 0, firedNormal: 0, got: 0, invest: START_BALLS, bestBalls: START_BALLS, hamari: 0, maxHamari: 0, bestSingle: 0, bestRush: 0, symHit: {}, eff: {}, playSec: 0 };
const S = {
  balls: save?.balls ?? START_BALLS,
  stats: Object.assign({}, STATS0, save?.stats),
  hist: save?.hist ?? [],
  slump: save?.slump ?? [0], slumpBase: save?.slumpBase ?? 0, slumpHits: save?.slumpHits ?? [],
  ach: save?.ach ?? {},
  volVid: save?.volVid ?? 80, volSfx: save?.volSfx ?? 60, mute: save?.mute ?? false, skip: save?.skip ?? '1', autoSide: save?.autoSide ?? true,
};
let dirty = true;
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ balls: S.balls, stats: S.stats, hist: S.hist.slice(0, 40), slump: S.slump, slumpBase: S.slumpBase, slumpHits: S.slumpHits.slice(-200), ach: S.ach, volVid: S.volVid, volSfx: S.volSfx, mute: S.mute, skip: S.skip, autoSide: S.autoSide })); } catch (e) {} }
setInterval(() => { if (dirty) { persist(); dirty = false; } }, 2000);

// ---------- runtime state ----------
const st = {
  started: false, paused: false, firing: false, power: 0.3,
  balls: [], fireT: 0, time: 0,
  holds: [], current: null, busy: false, inJackpot: false,
  rush: false, stLeft: 0, chain: 0,
  denchu: { open: false, t: 0, pending: 0 }, attacker: { open: false, count: 0 },
  round: null, payoutRound: 0,
  reels: [mkReel(), mkReel(), mkReel()], reelMode: 'mini', reelMix: 1, reelMarks: null,
  overlays: [], particles: [], flash: 0, flashCol: '#fff', shake: 0, ledMode: 'normal',
  fg: null, bg: null, hold: null, next: null, pushWait: null, rushSum: null, fullT: -9, skipAt: 0, rushTotal: 0, step: null, banner: null, gijiCount: 0,
  waiters: [], force: null, rightHint: 0,
};
function mkReel() { const num = 1 + (Math.random() * 9 | 0); return { spin: false, pos: num - 1, speed: 0, num, bounce: 0, q: false, sync: false, glide: null }; }

// ---------- game clock & waits ----------
function wait(ms) { return new Promise(r => st.waiters.push({ t: st.time + ms / 1000, r })); }
function tickWaiters() { for (let i = st.waiters.length - 1; i >= 0; i--) { if (st.time >= st.waiters[i].t) { const w = st.waiters[i]; st.waiters.splice(i, 1); w.r(); } } }
const rnd = Math.random;
function pick(table) { let s = 0; for (const k in table) s += table[k]; let x = rnd() * s; for (const k in table) { x -= table[k]; if (x < 0) return k; } return Object.keys(table)[0]; }

// ---------- audio (WebAudio SFX) ----------
let AC = null, sfxGain = null;
function initAudio() {
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); sfxGain = AC.createGain(); sfxGain.connect(AC.destination); applyVolume(); } catch (e) { AC = null; }
}
function applyVolume() {
  if (sfxGain) sfxGain.gain.value = S.mute ? 0 : S.volSfx / 100 * 0.6;
  for (const p of POOL) { p.v.volume = S.mute ? 0 : S.volVid / 100; p.v.muted = S.mute; }
  $('btnSound').textContent = S.mute ? '🔇' : '🔊';
}
function tone(f, dur, type = 'square', vol = 0.2, f2 = null, delay = 0) {
  if (!AC || S.mute || simMode) return;
  const t0 = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(sfxGain); o.start(t0); o.stop(t0 + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol = 0.2, hp = 800, delay = 0) {
  if (!AC || S.mute || simMode) return;
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const t0 = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t0); s.stop(t0 + dur + 0.02);
}
let lastPeg = 0;
const SFX = {
  launch() { tone(180, 0.05, 'triangle', 0.08, 90); },
  peg() { const n = performance.now(); if (n - lastPeg < 45) return; lastPeg = n; tone(2400 + rnd() * 900, 0.03, 'sine', 0.025); },
  heso() { tone(1318, 0.08, 'square', 0.12); tone(1760, 0.14, 'square', 0.12, null, 0.07); },
  denchu() { tone(988, 0.07, 'square', 0.1); tone(1480, 0.1, 'square', 0.1, null, 0.06); },
  pay() { tone(2093, 0.05, 'square', 0.06); },
  stop() { tone(220, 0.06, 'square', 0.14, 110); noise(0.05, 0.08, 2000); },
  tick() { tone(1500, 0.035, 'square', 0.07); },
  spin() { tone(660, 0.05, 'triangle', 0.06, 990); },
  reach() { tone(330, 0.5, 'sawtooth', 0.12, 990); tone(660, 0.6, 'square', 0.08, 1320, 0.15); },
  step(l) { const f = [523, 659, 784, 988, 1319][l - 1] || 523; tone(f, 0.18, 'square', 0.14); tone(f * 1.5, 0.22, 'triangle', 0.1, null, 0.05); },
  next() { tone(110, 0.4, 'sawtooth', 0.2, 55); noise(0.25, 0.15, 400); tone(880, 0.2, 'square', 0.1, 1760, 0.1); },
  flash() { noise(0.6, 0.3, 300); tone(80, 0.6, 'sine', 0.3, 40); },
  tension() { for (let i = 0; i < 14; i++) noise(0.05, 0.05 + i * 0.012, 600, i * (0.09 - i * 0.003)); },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => { tone(f, 0.22, 'square', 0.14, null, i * 0.11); tone(f / 2, 0.22, 'triangle', 0.12, null, i * 0.11); }); },
  push() { tone(140, 0.3, 'sawtooth', 0.25, 60); noise(0.3, 0.2, 200); },
  open() { tone(784, 0.1, 'square', 0.1); tone(1175, 0.15, 'square', 0.1, null, 0.08); },
  card() { tone(880, 0.12, 'square', 0.1, 1320); },
};

// ---------- layout ----------
let H = 1100, scale = 1, dpr = 1, geo = null;
function resize() {
  // the gold frame hugs the board: measure the free cabinet area, then size frame = canvas + frame padding
  const cab = $('cabinet'), fr = $('frame'), cs = getComputedStyle(cab), pad = parseFloat(getComputedStyle(fr).paddingLeft) || 0;
  const r = cab.getBoundingClientRect();
  const sw = Math.max(200, r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - pad * 2), sh = Math.max(200, r.height - pad * 2);
  const nh = Math.round(Math.min(1300, Math.max(1000, W * sh / sw)));
  scale = Math.min(sw / W, sh / nh);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = Math.floor(W * scale) + 'px'; cv.style.height = Math.floor(nh * scale) + 'px';
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(nh * scale * dpr);
  fr.style.width = Math.floor(W * scale) + pad * 2 + 'px'; fr.style.height = Math.floor(nh * scale) + pad * 2 + 'px';
  if (nh !== H || !geo) { H = nh; buildGeo(); }
}
window.addEventListener('resize', resize);

function buildGeo() {
  const g = { pegs: [], segs: [] };
  g.L = 18; g.R = W - 18; g.cx = W / 2; g.cy = 352; g.rad = W / 2 - 18;
  g.lcd = { x0: 104, x1: 616, y0: 180 }; g.lcd.y1 = g.lcd.y0 + (g.lcd.x1 - g.lcd.x0) * 9 / 16;
  const ly1 = g.lcd.y1;
  g.hesoY = ly1 + 150; g.hesoX = W / 2;
  g.attY = H - 232; g.denY = Math.round((ly1 + g.attY) / 2) + 10; g.gateY = ly1 + 34;
  g.laneX = 636;
  g.out = H - 18;
  g.pockets = [{ x: 150, y: H - 186 }, { x: 470, y: H - 160 }];
  // roof over LCD
  g.segs.push([g.lcd.x0 - 10, g.lcd.y0 - 4, W / 2, g.lcd.y0 - 56], [W / 2, g.lcd.y0 - 56, g.lcd.x1 + 10, g.lcd.y0 - 4]);
  // right-lane inner wall and attacker floor
  g.segs.push([g.laneX - 4, ly1 - 6, g.laneX - 4, g.attY - 44]);
  g.floor = [g.R, g.attY - 26, 546, g.attY + 36];
  g.segs.push(g.floor);
  // under-LCD guide (ステージ) channels balls a bit toward the centre
  g.segs.push([g.lcd.x0 + 6, ly1 + 26, g.lcd.x0 + 70, ly1 + 52], [g.lcd.x1 - 6, ly1 + 26, g.lcd.x1 - 70, ly1 + 52]);
  // 道釘: a peg road from the left lane down toward the START pocket (balls roll along it)
  const road = [];
  const rx0 = 46, ry0 = ly1 + 22, rx1 = g.hesoX - ROAD_END, ry1 = g.hesoY - 52;
  const rl = Math.hypot(rx1 - rx0, ry1 - ry0), rn = Math.floor(rl / ROAD_GAP);
  for (let i = 0; i <= rn; i++) road.push({ x: rx0 + (rx1 - rx0) * i / rn, y: ry0 + (ry1 - ry0) * i / rn, hit: 0 });
  g.segs.push([g.L, ly1 - 30, rx0 - 2, ry0 - 2]);           // wall deflector into the road
  g.segs.push([g.L, g.hesoY + 40, g.L + 40, g.hesoY + 64]);   // lower wall deflector
  g.pegs.push(...road);
  if (FUNNEL) g.segs.push([g.hesoX - FUNNEL, g.hesoY - 64, g.hesoX - HESO_W - 8, g.hesoY - 30], [g.hesoX + FUNNEL, g.hesoY - 64, g.hesoX + HESO_W + 8, g.hesoY - 30]);
  // peg field
  const top = ly1 + 74, bot = H - 140;   // the band below the pegs is the 8-bit stage
  let row = 0;
  for (let y = top; y < bot; y += 44, row++) {
    for (let x = 44 + (row % 2 ? 24 : 0); x < g.laneX - 14; x += 48) {
      if (Math.abs(x - g.hesoX) < 44 && Math.abs(y - g.hesoY) < 40) continue;
      if (g.pockets.some(p => Math.abs(x - p.x) < 28 && Math.abs(y - p.y) < 30)) continue;
      if (x > 520 && y > g.attY - 70) continue;
      if (y > H - 130 && Math.abs(x - W / 2) < 60) continue;
      if (road.some(r => Math.abs(r.x - x) < 22 && Math.abs(r.y - y) < 22)) continue;
      if (y < ry1 + 10 && x < rx1 + 10 && y < ry0 + (x - rx0) * (ry1 - ry0) / (rx1 - rx0) + 20) continue;
      g.pegs.push({ x, y, hit: 0 });
    }
  }
  // left lane pegs
  for (let y = g.lcd.y0 + 70; y < ly1; y += 52) g.pegs.push({ x: (Math.round(y / 52) % 2) ? 44 : 66, y, hit: 0 });
  // 命釘 + heso rims
  g.pegs.push({ x: g.hesoX - HESO_W - 9, y: g.hesoY - 24, hit: 0 }, { x: g.hesoX + HESO_W + 9, y: g.hesoY - 24, hit: 0 });
  g.pegs.push({ x: g.hesoX - HESO_W - 9, y: g.hesoY + 6, hit: 0 }, { x: g.hesoX + HESO_W + 9, y: g.hesoY + 6, hit: 0 });
  // right lane pegs
  for (let y = ly1 + 70, i = 0; y < g.attY - 70; y += 54, i++) { if (Math.abs(y - g.denY) < 40) continue; g.pegs.push({ x: i % 2 ? 660 : 684, y, hit: 0 }); }
  // pocket rims
  for (const p of g.pockets) g.pegs.push({ x: p.x - 18, y: p.y + 2, hit: 0 }, { x: p.x + 18, y: p.y + 2, hit: 0 });
  // a peg that leaves a gap smaller than a ball next to a guide rail traps balls: drop those pegs
  const segD = (p, sg) => { const [x1, y1, x2, y2] = sg, ex = x2 - x1, ey = y2 - y1; const t = Math.max(0, Math.min(1, ((p.x - x1) * ex + (p.y - y1) * ey) / (ex * ex + ey * ey))); return Math.hypot(p.x - x1 - ex * t, p.y - y1 - ey * t); };
  g.pegs = g.pegs.filter(p => g.segs.every(sg => { const d = segD(p, sg); return d < PR + 3 || d > PR + BR * 2 + 2; }) && !(p.x - PR - g.L > 2 && p.x - PR - g.L < BR * 2 + 2));
  geo = g;
  st.balls = st.balls.filter(b => b.y < H);
}

// ---------- balls & physics ----------
function launch() {
  if (S.balls <= 0) { setFiring(false); banner('持有鋼珠不足 — 按「借珠」', 2200); $('lend').classList.add('hot'); return; }
  S.balls--; if (!simMode) { S.stats.fired++; if (!st.rush && !st.inJackpot) S.stats.firedNormal++; } dirty = true;
  const a1 = Math.PI * 1.30, v0 = POW_MIN + POW_RANGE * st.power + (rnd() - 0.5) * POW_NOISE;
  st.balls.push({ x: geo.L + 9, y: H - 40, vx: 0, vy: 0, rail: 0, a1, v0, life: 0, onFloor: false });
  SFX.launch();
}
function railPos(b) {
  const straight = (H - 40) - geo.cy, R = geo.rad - 9;
  if (b.rail < straight) return { x: geo.L + 9, y: H - 40 - b.rail };
  const a = Math.PI + (b.rail - straight) / R;
  return { x: geo.cx + R * Math.cos(a), y: geo.cy + R * Math.sin(a), a };
}
function collideCircle(b, cx, cy, r, rest = 0.45) {
  const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy, m = r + BR;
  if (d2 >= m * m || d2 === 0) return false;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
  b.x = cx + nx * m; b.y = cy + ny * m;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + rest) * vn * nx; b.vy -= (1 + rest) * vn * ny; b.vx *= 0.985; b.vy *= 0.985; }
  return true;
}
function collideSeg(b, s, rest = 0.3) {
  const [x1, y1, x2, y2] = s, ex = x2 - x1, ey = y2 - y1, l2 = ex * ex + ey * ey;
  let t = ((b.x - x1) * ex + (b.y - y1) * ey) / l2; t = Math.max(0, Math.min(1, t));
  const px = x1 + ex * t, py = y1 + ey * t, dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
  if (d2 >= BR * BR) return false;
  const d = Math.sqrt(d2) || 0.001, nx = dx / d, ny = dy / d;
  b.x = px + nx * BR; b.y = py + ny * BR;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + rest) * vn * nx; b.vy -= (1 + rest) * vn * ny; }
  return true;
}
function stepBall(b, dt) {
  if (b.rail !== null) {
    b.rail += 2600 * dt;
    const p = railPos(b);
    b.x = p.x; b.y = p.y;
    if (p.a !== undefined && p.a >= b.a1) {
      const sp = b.v0;
      b.vx = -Math.sin(p.a) * sp; b.vy = Math.cos(p.a) * sp; b.rail = null;
    }
    return true;
  }
  b.life += dt;
  b.vy += G * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  const g = geo;
  // arc boundary
  if (b.y < g.cy) {
    const dx = b.x - g.cx, dy = b.y - g.cy, d = Math.hypot(dx, dy), m = g.rad - BR;
    if (d > m) { const nx = dx / d, ny = dy / d; b.x = g.cx + nx * m; b.y = g.cy + ny * m; const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny; } }
  }
  if (b.x < g.L + BR) { b.x = g.L + BR; if (b.vx < 0) b.vx *= -0.4; }
  if (b.x > g.R - BR) { b.x = g.R - BR; if (b.vx > 0) b.vx *= -0.4; }
  // LCD box
  const l = g.lcd;
  if (b.x > l.x0 - BR && b.x < l.x1 + BR && b.y > l.y0 - BR && b.y < l.y1 + BR) {
    const cx = Math.max(l.x0, Math.min(l.x1, b.x)), cy = Math.max(l.y0, Math.min(l.y1, b.y));
    let dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
    if (d < BR) {
      if (d === 0) { // inside: push to nearest side
        const opts = [[b.x - l.x0, -1, 0], [l.x1 - b.x, 1, 0], [b.y - l.y0, 0, -1], [l.y1 - b.y, 0, 1]].sort((a, c) => a[0] - c[0]);
        dx = opts[0][1]; dy = opts[0][2]; d = 1;
        b.x = dx ? (dx < 0 ? l.x0 - BR : l.x1 + BR) : b.x; b.y = dy ? (dy < 0 ? l.y0 - BR : l.y1 + BR) : b.y;
      } else { b.x = cx + dx / d * BR; b.y = cy + dy / d * BR; }
      const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 1.35 * vn * nx; b.vy -= 1.35 * vn * ny; }
    }
  }
  for (const s of g.segs) collideSeg(b, s);
  b.onFloor = false;
  if (Math.abs(b.y - (g.attY + 5)) < 60 && b.x > 546) {
    const [x1, y1, x2, y2] = g.floor, t = (b.x - x1) / (x2 - x1), fy = y1 + (y2 - y1) * t;
    if (b.y > fy - BR - 2 && b.y < fy + 4) b.onFloor = true;
  }
  for (const p of g.pegs) {
    if (Math.abs(p.x - b.x) > 14 || Math.abs(p.y - b.y) > 14) continue;
    if (collideCircle(b, p.x, p.y, PR)) { p.hit = 0.25; if (Math.hypot(b.vx, b.vy) > 120) SFX.peg(); }
  }
  const sp = Math.hypot(b.vx, b.vy); if (sp > 1600) { b.vx *= 1600 / sp; b.vy *= 1600 / sp; }
  // safety: a ball that sits still for over a second gets a small knock so it never stays stuck
  b.still = sp < 25 ? (b.still || 0) + dt : 0;
  if (b.still > 1) { b.vx += (rnd() < 0.5 ? -1 : 1) * (60 + rnd() * 60); b.vy -= 60; b.still = 0; }
  return checkTargets(b);
}
let simMode = false;
function checkTargets(b) {
  const g = geo;
  // heso
  if (Math.abs(b.x - g.hesoX) < HESO_W && b.y > g.hesoY - 10 && b.y < g.hesoY + 8 && b.vy > 0) { onHeso(); return false; }
  // gate (through)
  if (b.x > g.laneX && !b.gate && b.y > g.gateY - 4 && b.y < g.gateY + 6) { b.gate = true; onGate(); }
  // denchu
  if (st.denchu.open && b.x > g.laneX + 6 && Math.abs(b.y - g.denY) < 8) { onDenchu(); return false; }
  // attacker
  if (st.attacker.open && b.onFloor && b.x > 584 && b.x < 690) { onAttacker(); return false; }
  for (const p of g.pockets) if (Math.abs(b.x - p.x) < 11 && Math.abs(b.y - p.y) < 6 && b.vy > 0) { pay(5); return false; }
  if (b.y > g.out || b.life > 30) return false;
  return true;
}
function pay(n) { S.balls += n; dirty = true; if (!simMode) { S.stats.got += n; SFX.pay(); } }

// ---------- entries & 抽選 ----------
const simStats = { heso: 0, denchu: 0, att: 0, gate: 0 };
function onHeso() { simStats.heso++; pay(3); if (!simMode) SFX.heso(); addHold('heso'); }
function onDenchu() { simStats.denchu++; pay(1); if (!simMode) SFX.denchu(); addHold('denchu'); }
function onAttacker() { simStats.att++; pay(15); st.payoutRound += 15; st.attacker.count++; }
function onGate() {
  simStats.gate++;
  if (st.denchu.open || st.denchu.pending) return;
  if (st.rush && st.stLeft > 0) { st.denchu.pending = 1; wait(250).then(() => { st.denchu.pending = 0; openDenchu(1.8); }); }
  else if (rnd() < 1 / 30) { openDenchu(0.35); }
}
function openDenchu(sec) { st.denchu.open = true; st.denchu.t = sec; if (!simMode) SFX.open(); }

function addHold(src) {
  if (simMode) return;
  if (st.holds.length >= 4) { st.fullT = st.time; return; }
  st.holds.push(makeHold(src));
}
function makeHold(src, rush = st.rush && st.stLeft > 0) {   // holds taken after the last ST spin draw at normal odds
  let hit = rnd() < (rush ? P_RUSH : P_NORMAL);
  const f = st.force; if (f) { hit = f.hit; }
  const h = { hit, rush, src, rounds: 0, rushAfter: false, reach: 'none', color: 'white', group: false, step: 0, giji: 0, cutin: false, premium: false, revive: false, line: 0, nums: [1, 2, 3] };
  if (hit) {
    h.rounds = rush ? (rnd() < 0.7 ? 10 : 3) : (rnd() < 0.5 ? 10 : 3);
    if (f?.num) h.rounds = f.num % 2 ? 10 : 3;   // debug: a forced number decides 10R/3R like a real draw
    h.rushAfter = rush || h.rounds === 10;
  }
  if (!rush) {
    h.reach = hit ? pick({ normal: 10, sp: 35, spsp: 50, zen: 5 }) : (rnd() < 0.18 ? pick({ normal: 80, sp: 17, spsp: 3 }) : 'none');
    const none = h.reach === 'none';
    h.color = hit ? pick({ white: 30, blue: 20, green: 20, red: 18, gold: 10, rainbow: 2 }) : none ? pick({ white: 85, blue: 11, green: 3.5, red: 0.5 }) : pick({ white: 90, blue: 7, green: 2.5, red: 0.5 });
    h.group = rnd() < (hit ? 0.25 : none ? 0.015 : 0.05);
    h.step = +(hit ? pick({ 0: 20, 1: 10, 2: 10, 3: 20, 4: 20, 5: 20 }) : none ? pick({ 0: 70, 1: 22, 2: 7, 3: 1 }) : pick({ 0: 50, 1: 25, 2: 15, 3: 7, 4: 2.5, 5: 0.5 }));
    h.giji = +(hit ? pick({ 0: 25, 1: 45, 2: 30 }) : none ? pick({ 0: 95, 1: 5 }) : pick({ 0: 80, 1: 17, 2: 3 }));
    h.cutin = (h.reach === 'sp' || h.reach === 'spsp') && rnd() < (hit ? 0.4 : 0.08);
    if (h.cutin) h.cutCol = pick(hit ? { blue: 15, green: 20, red: 35, gold: 30 } : { blue: 45, green: 35, red: 18, gold: 2 });
    if (h.group) h.groupKind = pick(hit ? { cater: 20, pidgey: 35, magi: 45 } : { cater: 50, pidgey: 35, magi: 15 });
    h.upgrade = hit && h.rounds === 3 && rnd() < 0.2;   // 昇格: a 3R that turns into RUSH at the end
    h.premium = hit && rnd() < 0.03;
    h.revive = hit && (h.reach === 'sp' || h.reach === 'spsp') && rnd() < 0.1;
    if (LINE_W[h.reach]) { const w = Object.assign({}, LINE_W[h.reach][hit ? 'hit' : 'miss']); for (const k in w) if (!SP_LINES[k].every(has)) delete w[k]; h.spLine = Object.keys(w).length ? pick(w) : (h.reach === 'sp' ? 'gengar' : 'mewtwo'); }
  } else {
    h.reach = hit ? pick({ instant: 30, normal: 30, sp: 40 }) : (rnd() < 0.12 ? pick({ normal: 80, sp: 20 }) : 'none');
    h.color = hit ? pick({ white: 40, blue: 20, red: 25, gold: 15 }) : pick({ white: 95, blue: 5 });
    h.line = rnd() * RUSH_LINES.length | 0;
  }
  if (f) { if (f.reach) h.reach = f.reach; for (const k of ['premium', 'group', 'cutin', 'step', 'giji', 'color', 'revive', 'spLine']) if (f[k] !== undefined) h[k] = f[k];
    if ((h.reach === 'sp' || h.reach === 'spsp') && !rush && !SP_LINES[h.spLine]) h.spLine = h.reach === 'sp' ? 'gengar' : 'mewtwo'; if (!f.keep) st.force = null; }
  // final numbers: odd = 10R (RUSH), even = 3R
  const r9 = () => 1 + (rnd() * 9 | 0);
  if (hit) {
    const odd = [1, 3, 5, 7, 9], even = [2, 4, 6, 8];
    const n = f?.num ?? (h.rounds === 10 ? odd[rnd() * 5 | 0] : even[rnd() * 4 | 0]);
    h.nums = [n, n, n];
  } else if (h.reach !== 'none') {
    // a missed 聽牌 stops one short (n-1) or slides one past (n+1); now and then somewhere else
    const n = f?.num ?? r9(), x = rnd();
    let c = x < 0.45 ? ((n + 7) % 9) + 1 : x < 0.9 ? (n % 9) + 1 : r9(); if (c === n) c = (n % 9) + 1;
    h.nums = [n, c, n];
  } else {
    const a = r9(); let b = r9(); if (b === a) b = (a % 9) + 1; h.nums = [a, r9(), b];
  }
  return h;
}
// 實測信賴度: count each effect (一般時 only) and how many of those were hits
function tally(key, hit) { const e = S.stats.eff[key] || (S.stats.eff[key] = [0, 0]); e[0]++; if (hit) e[1]++; }

// ---------- video helpers ----------
function resumeBg() { if (st.bg && !st.fg && !st.paused && has(st.bg)) VID[st.bg].play().catch(() => {}); }
function nextIdle(cur = st.bg) {
  const ok = IDLE.filter(has), pool = ok.filter(n => n !== cur);
  return pool.length ? pool[rnd() * pool.length | 0] : ok[0];
}
// play a list of background clips one after another (jackpot rounds, RUSH) so nothing loops on screen
function playList(list, start = 0) { st.bgList = list; st.bgIdx = start % list.length; setBg(list[st.bgIdx]); }
function setBg(name) {
  st.hold = null;
  if (name === 'idle') name = nextIdle();
  if (!(st.bgList && st.bgList.includes(name))) st.bgList = null;
  if (st.bg === name) { resumeBg(); return; }
  const old = st.bg; st.bg = name; st.next = null;
  if (old && old !== st.fg && has(old)) VID[old].pause();
  if (!name || !has(name)) return;
  const idle = IDLE.includes(name), list = st.bgList;
  const v = VID[name]; v.loop = list ? list.length < 2 : !idle || IDLE.filter(has).length < 2;
  try { v.currentTime = 0; } catch (e) {}
  if (!st.fg && !st.paused) v.play().catch(() => {});
  if (list && !v.loop) { st.next = list[(st.bgIdx + 1) % list.length]; prefetch(st.next); }
  else if (idle && !v.loop) { st.next = nextIdle(name); prefetch(st.next); }
}
// idle clips rotate: when one ends, the next random lead takes over
for (const q of POOL) q.v.addEventListener('ended', () => {
  if (q.name !== st.bg || st.fg) return;
  if (st.bgList) { st.bgIdx = (st.bgIdx + 1) % st.bgList.length; setBg(st.bgList[st.bgIdx]); }
  else if (IDLE.includes(q.name)) setBg(st.next || 'idle');
});
function playClip(name, opts = {}) {
  if (!name || !has(name)) return Promise.resolve(false);
  return new Promise(resolve => {
    const v = VID[name];
    if (st.bg && st.bg !== name && has(st.bg)) VID[st.bg].pause();
    v.loop = false; try { v.currentTime = 0; } catch (e) {}
    st.fg = name; st.hold = null;
    let done = false;
    const fin = () => {
      if (done) return; done = true;
      v.removeEventListener('ended', fin);
      v.pause();
      if (st.fg === name) st.fg = null;
      if (opts.hold) st.hold = name;
      st.skipFn = null;
      if (!opts.keepBgPaused) resumeBg();
      resolve(true);
    };
    v.addEventListener('ended', fin);
    st.skipFn = S.skip === '1' ? fin : null; st.skipAt = st.time + 3;
    v.play().catch(() => { wait(1500).then(fin); });
    const dur = opts.max ? opts.max / 1000 : (isFinite(v.duration) && v.duration > 0 ? v.duration : 13) + 3;
    wait(dur * 1000).then(fin);
    if (opts.next) prefetch(opts.next);
  });
}

// ---------- LCD overlays ----------
function card(img, ms = 1400, opts = {}) { st.overlays.push({ img, t0: st.time, dur: ms / 1000, y: opts.y ?? 0.5, s: opts.s ?? 0.82 }); SFX.card(); }
function banner(text, ms = 1800, col = '#fff') { st.banner = { text, t0: st.time, dur: ms / 1000, col }; }
function doFlash(col = '#fff', strength = 1) { st.flash = strength; st.flashCol = col; st.shake = 0.45; SFX.flash(); }
function burst(n, x, y, cols) { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, s = 150 + rnd() * 520; st.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, life: 1 + rnd() * 0.8, col: cols[i % cols.length], r: 2 + rnd() * 4 }); } }

// ---------- reels ----------
// Reels are one continuous position: number N sits in the centre when pos ≡ N-1 (mod 9) and the numbers come
// down in order (…N → N+1…). A stop never jumps: the reel eases into the target, slowing to a crawl at the end.
function startReels() { for (const r of st.reels) { r.spin = true; r.speed = 16 + rnd() * 2; r.q = false; r.sync = false; r.glide = null; } SFX.spin(); }
// quick stop: one ease-out. crawl (聽牌): brake hard for tA s down to a crawl speed v1, then slow linearly to 0 over tB s,
// so the last numbers creep past one by one instead of the reel sitting still.
function glideReel(i, n, dur = 0.45, minD = 2, crawl = 0) {
  const r = st.reels[i]; r.q = false; r.sync = false;
  if (!r.spin) { r.spin = true; r.speed = 0; }
  const from = r.pos, v0 = Math.max(r.speed, 0.5), first = Math.ceil(from) + (((n - 1 - Math.ceil(from)) % 9) + 9) % 9;
  const g = { from, n, t0: st.time, tick: Math.floor(from) };
  if (crawl) {
    const tA = Math.min(1, dur * 0.25); let tB = dur - tA;
    const want = v0 * tA / 2 + crawl * (tA + tB) / 2;           // distance if v1 were exactly the crawl speed
    let to = first; while (to - from < Math.max(want - 4.5, (v0 + crawl * 0.6) / 2 * tA + 1)) to += 9;   // nearest landing spot to that
    const d = to - from;
    let v1 = Math.min(crawl * 1.45, Math.max(crawl * 0.6, (d - v0 * tA / 2) / ((tA + tB) / 2)));
    tB = Math.max(1, 2 * (d - (v0 + v1) / 2 * tA) / v1);        // the rest is absorbed by the crawl time
    Object.assign(g, { d, v0, v1, tA, tB, dur: tA + tB });
  } else {
    let to = first; while (to - from < minD) to += 9;
    const d = to - from;
    Object.assign(g, { d, dur, p: Math.max(1.6, v0 * dur / d) });
  }
  r.glide = g;
  return wait(g.dur * 1000 + 30);
}
function stopReel(i, n) { glideReel(i, n); }
function slowReel(i, sp) { st.reels[i].speed = sp; }
function reelsQ() { for (const r of st.reels) { r.spin = false; r.q = true; r.sync = false; r.bounce = 1; } SFX.stop(); }

// ---------- spin sequence (変動) ----------
async function runSpin(h) {
  st.busy = true; st.current = h;
  const s = S.stats;
  s.spins++; dirty = true;
  const residual = st.rush && st.stLeft <= 0;          // 殘保留 after the last ST spin
  if (st.rush) { s.spinsRush++; if (!residual) st.stLeft--; }
  else { s.spinsNormal++; s.hamari++; s.maxHamari = Math.max(s.maxHamari, s.hamari); }
  pushSlump();
  if (!h.rush) {
    if (h.color !== 'white') tally('hold_' + h.color, h.hit);
    if (h.group) { tally('group', h.hit); tally('group_' + h.groupKind, h.hit); }
    if (h.step >= 3) tally('step' + h.step, h.hit);
    if (h.giji) tally('giji' + (h.giji + 1), h.hit);
    if (h.premium) tally('premium', h.hit);
    if (h.reach !== 'none') tally('reach_' + h.reach, h.hit);
    if (h.cutin) { tally('cutin_' + h.reach, h.hit); tally('cut_' + h.cutCol, h.hit); }
    if (h.spLine) tally('line_' + h.spLine, h.hit);
    if (h.color === 'rainbow') unlock('rainbow');
    if (h.color === 'gold') unlock('gold');
  }
  const last = st.rush && !residual && st.stLeft === 0;
  const fx = h.reach !== 'none' || h.step || h.giji;
  st.reelMode = 'mini';        // idle and plain spins keep the reels small so the idle clips stay visible
  startReels();
  if (last) { banner('最後一轉！', 1600, '#ff4a5a'); await playClip(V('72_rush_last'), { max: 3000 }); }
  else if (residual) banner('殘保留', 1000, '#ffd23f');
  const fast = st.holds.length >= 3;
  if (h.premium) { await playClip(anyHave([V('14_premium'), V('65_premium_shiny')])); doFlash('#ff9cff', 0.8); unlock('premium'); }
  if (h.group) await playClip(firstHave(V(GROUP_CLIP[h.groupKind]), V('02_group')));
  if (h.step > 0) { st.reelMode = 'big'; await stepUp(h.step); }
  for (let g = 0; g < h.giji; g++) {
    st.reelMode = 'big';
    await wait(1100);
    const a = 1 + (rnd() * 9 | 0);
    stopReel(0, a); await wait(220); stopReel(2, (a % 9) + 1); await wait(200);
    stopReel(1, a); st.reels[1].q = 'next';
    card(IMG.txt_next, 900, { s: 0.6 }); SFX.next();
    await wait(900);
    st.gijiCount = g + 2; banner(`×${g + 2}`, 1200, '#5ff');
    startReels();
  }
  const base = st.rush ? 900 : fx ? 1800 : fast ? 1000 : 2400;
  if (h.reach === 'zen') { st.reelMode = 'big'; await zenkaiten(h); return finishSpin(h); }
  if (h.reach === 'instant') { await wait(base); doFlash('#ffd23f', 0.6); reelsQ(); await wait(300); return finishSpin(h); }
  await wait(base);
  stopReel(0, h.nums[0]); await wait(st.rush ? 250 : 550);
  await glideReel(2, h.nums[2]);
  if (h.reach !== 'none') {
    const n = h.nums[0];
    await wait(250);
    card(IMG.txt_reach, 1300); SFX.reach(); st.ledMode = 'reach';
    // the Pokémon of the reach number shows up (聽牌登場)
    if (REACH_CLIP(n)) { st.reelMode = 'mini'; await playClip(REACH_CLIP(n), { keepBgPaused: true, hold: true, max: 3800 }); }
    else await wait(1300);
    if (h.reach === 'normal') {
      st.reelMode = 'big';
      // the middle reel slows to a crawl and creeps into: the hit, one short, or one past
      await glideReel(1, h.hit ? n : h.nums[1], st.rush ? 3.5 : 5.5, 0, st.rush ? 3.2 : 2.4);
      if (h.hit) st.landed = true;
      else {
        const lc = !st.rush && LOSE_CLIP(n);
        if (lc) { await wait(450); st.reelMode = 'mini'; await playClip(lc, { keepBgPaused: true, hold: true }); }
        await wait(300); st.hold = null; resumeBg();
      }
    } else {
      const sp = h.reach === 'sp';
      const own = NUM_LINE(n, sp);
      const lines = RUSH_LINES.filter(x => x.every(has));
      const rl = !own && st.rush && sp && lines.length ? lines[h.line % lines.length] : null;
      const L = own || rl || SP_LINES[h.spLine] || (sp ? SP_LINES.gengar : SP_LINES.mewtwo);
      if (h.cutin) { st.reelMode = 'mini'; await playClip(firstHave(V(CUT_CLIP[h.cutCol]), V('03_cutin')), { keepBgPaused: true, hold: true }); if (h.cutCol === 'red' || h.cutCol === 'gold') { card(IMG.txt_gekiatsu, 1500); await wait(1500); } }
      card(sp ? IMG.txt_chance : IMG.txt_gekiatsu, 1300); await wait(1100);
      st.reelMode = 'mini'; slowReel(1, 9);
      const win = h.hit && !h.revive;
      await playClip(L[0], { keepBgPaused: true, hold: true, next: win ? (rl ? L[1] : WIN_CLIP(n)) : L[2], max: st.rush ? 7000 : 0 });
      await pushChance(st.rush ? 2000 : 2500);
      if (win) {
        // SP／SPSP success goes straight to the number's own win clip in jackpot(); RUSH lines show Charizard winning first
        if (rl) await playClip(L[1], { keepBgPaused: true, hold: true });
      } else {
        await playClip(L[2], { keepBgPaused: true, hold: true });
        if (h.revive) {                         // 復活: the lose clip plays, then the Pokémon gets back up
          await wait(700); doFlash('#ffd23f'); banner('復活！', 1600, '#ffd23f'); SFX.fanfare();
          if (L[1]) await playClip(L[1], { keepBgPaused: true, hold: true }); unlock('revive');
        }
      }
      st.reelMode = 'big';
      await glideReel(1, h.hit ? n : h.nums[1], 2.6, 0, 2.6);
      if (h.hit) st.landed = true;
      if (!h.hit) { await wait(600); st.hold = null; resumeBg(); if (h.reach === 'spsp') bump('spspLose'); }
    }
  } else {
    await wait(st.rush ? 100 : 250);
    await glideReel(1, h.nums[1]);
  }
  await wait(250);
  return finishSpin(h);
}
async function finishSpin(h) {
  st.ledMode = st.rush ? 'rush' : 'normal';
  st.gijiCount = 0;
  if (h.hit) await jackpot(h);
  else {
    st.reelMarks = null;
    await wait(st.rush ? 250 : 500);
    // RUSH ends only after the 殘保留 drawn during RUSH are used up
    if (st.rush && st.stLeft <= 0 && !st.holds.some(x => x.rush)) await endRush();
  }
  if (st.hold) { st.hold = null; resumeBg(); }
  st.current = null; st.busy = false; st.reelMode = 'mini';
  checkAch();
}
async function stepUp(level) {
  for (let l = 1; l <= level; l++) { st.step = { l, t0: st.time }; SFX.step(l); await wait(520); }
  await wait(380); st.step = null;
}
async function pushChance(ms = 2500) {
  elPush.classList.add('live');
  st.pushArmed = true; st.pushT0 = st.time;
  const pressed = await new Promise(res => { st.pushWait = () => res(true); wait(ms).then(() => { if (st.pushArmed) { st.pushWait = null; res(false); } }); });
  elPush.classList.remove('live'); st.pushArmed = false; st.pushWait = null;
  st.shake = 0.3; await wait(250);
  SFX.push(); doFlash('#fff', 0.7);
  if (pressed && st.current?.hit) unlock('push');
}
function pressPush() {
  if (st.pushWait) { st.pushWait(); return; }
  if (st.fg && st.skipFn && st.time >= st.skipAt) { st.skipFn(); return; }
  // free push: a small light show on the LCD
  burst(16, W / 2, geo.lcd.y1 - 20, ['#ffd23f', '#fff', '#4aa8ff']); SFX.card();
}
async function zenkaiten(h) {
  await wait(1200);
  doFlash('#fff');
  card(IMG.txt_zenkaiten, 1600);
  for (const r of st.reels) { r.sync = true; r.speed = 7; }
  st.reelMode = 'mini';
  await playClip(V('10_zenkaiten'), { keepBgPaused: true, hold: true, next: WIN_CLIP(h.nums[0]) });
  st.reelMode = 'big';
  reelsQ();
  await wait(400);
  unlock('zen');
}

// ---------- 大獎 ----------
async function jackpot(h) {
  st.inJackpot = true; st.busy = true;
  const wasRush = st.rush, n = h.nums[0], s = S.stats;
  autoSide(true);
  // ？？？ → flash → reveal
  st.reelMode = 'big';
  prefetch(WIN_CLIP(n));
  if (st.landed) { await wait(350); }
  else { for (const r of st.reels) r.q = true; SFX.tension(); await wait(1400); }
  st.landed = false;
  doFlash('#fff'); st.shake = 0.7;
  for (let i = 0; i < 3; i++) { const r = st.reels[i]; r.q = false; r.glide = null; r.spin = false; r.num = h.nums[i]; r.pos = h.nums[i] - 1; r.bounce = 1.4; }
  await wait(120);
  card(IMG.txt_ooatari, 2200, { s: 0.95 }); SFX.fanfare(); st.ledMode = 'jackpot';
  burst(90, W / 2, geo.lcd.y0 + 150, ['#ffd23f', '#ff6bff', '#5ff', '#fff', '#ff4a5a']);
  await wait(1800);
  const ham = s.hamari;
  s.hits++; if (wasRush) s.rushHits++; else s.firstHits++;
  s.hamari = 0; s.symHit[n] = (s.symHit[n] || 0) + 1;
  st.chain = wasRush ? st.chain + 1 : 1; s.maxChain = Math.max(s.maxChain, st.chain);
  S.slumpHits.push(s.spins);
  if (!wasRush && ham >= 300) unlock('hamari300');
  if (!wasRush && ham <= 10) unlock('quick');
  // tell 3R and RUSH apart with fixed text, in ball counts
  banner(h.rounds === 10 ? (wasRush ? `${st.chain} 連！10 回合（約 1,500 顆）` : '10 回合＋RUSH 突入確定！') : (wasRush ? `${st.chain} 連！3 回合（約 450 顆）` : '3 回合（約 450 顆）'), 2200, h.rounds === 10 ? '#ffd23f' : '#9ad0ff');
  // the clip: a chain milestone in RUSH, otherwise the number's own Pokémon wins or gets caught
  let clip = null;
  if (wasRush) clip = st.chain === 2 ? '56_chain_ride' : st.chain === 5 ? '57_chain_mega' : st.chain >= 10 && st.chain % 5 === 0 ? '58_chain_hooh' : null;
  clip = clip && has(V(clip)) ? V(clip) : firstHave(WIN_CLIP(n), '11_jackpot');
  st.reelMode = 'mini';
  await playClip(clip, { next: ROUND_LIST()[s.hits % ROUND_LIST().length] });
  // rounds
  playList(ROUND_LIST(), s.hits);   // each jackpot starts the round clips at a different one
  const startBalls = S.balls;
  st.payoutRound = 0;
  for (let r = 1; r <= h.rounds; r++) {
    st.round = { r, of: h.rounds };
    st.attacker.open = true; st.attacker.count = 0; SFX.open();
    const t0 = st.time;
    if (location.search.includes('fast')) { pay(150); st.payoutRound += 150; st.attacker.count = 10; }   // test switch: finish rounds at once
    while (st.attacker.count < 10 && st.time - t0 < 25) await wait(100);
    st.attacker.open = false;
    await wait(r < h.rounds ? 1200 : 600);
  }
  st.round = null;
  void startBalls;
  if (h.upgrade && !wasRush) {
    st.reelMode = 'mini'; doFlash('#ffffff');
    await playClip(V('66_upgrade_evolve'));
    h.rushAfter = true; banner('昇格！RUSH 突入', 2200, '#ffd23f'); SFX.fanfare(); unlock('upgrade');
  }
  st.rushTotal = (wasRush || h.rushAfter ? (st.rushTotal || 0) : 0) + st.payoutRound;
  st.result = { got: st.payoutRound, rounds: h.rounds, chain: st.chain, total: st.rushTotal, rush: h.rushAfter, t0: st.time };
  SFX.fanfare();
  await wait(3200);
  st.result = null;
  s.bestSingle = Math.max(s.bestSingle, st.payoutRound);
  S.hist.unshift({ t: new Date().toLocaleString('zh-TW', { hour12: false }), r: h.rounds, rush: h.rushAfter, chain: st.chain, got: st.payoutRound, ham: wasRush ? null : ham, sym: n, line: h.reach });
  if (S.hist.length > 40) S.hist.length = 40;
  dirty = true;
  if (h.rushAfter) {
    if (!wasRush) {
      s.rush++;
      setBg(null);
      st.reelMode = 'mini';
      card(IMG.txt_rush, 2400, { s: 0.95 });
      await playClip(V('12_rush_in'));
      st.rush = true;
      unlock('rush');
    } else banner('RUSH 繼續！', 1800, '#ffd23f');
    st.stLeft = ST_SPINS;
    st.ledMode = 'rush';
    if (!st.bgList || !RUSH_LIST().includes(st.bg)) playList(RUSH_LIST(), rnd() * 3 | 0);
  } else {
    st.rush = false; st.chain = 0; st.rushTotal = 0; st.ledMode = 'normal';
    setBg(null);
    await playClip(V('67_round_end'));
    setBg('idle');
    banner('回到一般模式', 1800);
    autoSide(false);
  }
  st.inJackpot = false;
  st.reelMode = 'mini';
  unlock('first');
  checkAch();
}
async function endRush() {
  const s = S.stats, total = st.rushTotal || 0, chain = st.chain;
  s.rushEnds++; s.chainSum += chain; s.bestRush = Math.max(s.bestRush, total);
  const best = total >= s.bestRush && s.rushEnds > 1;
  st.rush = false; st.ledMode = 'normal';
  setBg(null);
  await playClip(V('59_rush_end'), { keepBgPaused: true, hold: true });
  st.rushSum = { chain, total, best, t0: st.time };
  SFX.fanfare();
  await wait(4000);
  st.rushSum = null; st.hold = null;
  st.chain = 0; st.rushTotal = 0;
  setBg('idle');
  autoSide(false);
  checkAch();
}

// ---------- slump graph & achievements ----------
function pushSlump() {
  S.slump.push(S.balls - S.stats.invest);
  if (S.slump.length > 3000) { S.slump.shift(); S.slumpBase++; }
}
function bump(k) { S.stats[k] = (S.stats[k] || 0) + 1; }
const ACH = [
  ['first', '首次大獎', '第一次大獎'],
  ['rush', 'RUSH 突入', '第一次進入雷光 RUSH'],
  ['chain5', '五連莊', 'RUSH 連續 5 次大獎', () => st.chain >= 5],
  ['chain10', '十連莊', 'RUSH 連續 10 次大獎', () => st.chain >= 10],
  ['chain20', '二十連莊', 'RUSH 連續 20 次大獎', () => st.chain >= 20],
  ['rush10k', '萬發', '一次 RUSH 拿到 10,000 顆以上', () => (st.rushTotal || 0) >= 10000],
  ['balls10k', '鋼珠山', '持有鋼珠達到 10,000 顆', () => S.balls >= 10000],
  ['plus10k', '人生勝利組', '收支 +10,000 顆', () => S.balls - S.stats.invest >= 10000],
  ['quick', '秒中', '10 轉以內中大獎'],
  ['hamari300', '低潮脫出', '300 轉以上沒中之後中大獎'],
  ['deep', '深淵', '連續 500 轉沒中大獎', () => S.stats.hamari >= 500],
  ['push', '親手揭曉', '自己按揭曉鈕，結果是大獎'],
  ['revive', '復活', '看到寶可夢再站起來'],
  ['upgrade', '進化昇格', '3 回合最後進化成 RUSH'],
  ['zen', '全回轉', '看到夢幻全回轉'],
  ['premium', '夢幻泡泡', '看到稀有演出'],
  ['gold', '金保留', '看到金色保留'],
  ['rainbow', '虹保留', '看到彩虹保留'],
  ['allsym', '圖柄全收集', '9 隻圖柄寶可夢各中過一次', () => [1, 2, 3, 4, 5, 6, 7, 8, 9].every(k => S.stats.symHit[k])],
  ['mewtwo10', '超夢又跑了', '超強聽牌超夢失敗 10 次', () => (S.stats.spspLose || 0) >= 10],
  ['hits100', '常客', '累計 100 次大獎', () => S.stats.hits >= 100],
  ['spins10k', '萬轉', '累計轉 10,000 次', () => S.stats.spins >= 10000],
];
function unlock(id) {
  if (S.ach[id]) return;
  const a = ACH.find(x => x[0] === id); if (!a) return;
  S.ach[id] = Date.now(); dirty = true;
  toast(`🏆 成就達成：${a[1]}`);
}
function checkAch() { for (const a of ACH) if (a[3] && !S.ach[a[0]] && a[3]()) unlock(a[0]); }
function toast(t) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = t;
  $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3800);
}

// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(location.search.includes('test') ? 0.5 : 0.1, (now - last) / 1000); last = now;
  if (st.started && !st.paused) update(dt);
  render();
  requestAnimationFrame(loop);
}
function update(dt) {
  st.time += dt;
  tickWaiters();
  // firing
  if (st.firing) { st.fireT -= dt; if (st.fireT <= 0) { st.fireT += FIRE_INTERVAL; launch(); } }
  // physics
  const sub = Math.max(4, Math.ceil(dt / 0.004)), h = dt / sub;
  for (let s = 0; s < sub; s++) st.balls = st.balls.filter(b => stepBall(b, h));
  for (const p of geo.pegs) if (p.hit > 0) p.hit -= dt;
  // denchu timer
  if (st.denchu.open) { st.denchu.t -= dt; if (st.denchu.t <= 0) st.denchu.open = false; }
  // start next spin
  if (!st.busy && !st.inJackpot && st.holds.length) { const h0 = st.holds.shift(); runSpin(h0); }
  // reels
  for (const r of st.reels) {
    const g = r.glide;
    if (g) {
      const t = st.time - g.t0, k = Math.min(1, t / g.dur);
      if (g.tA !== undefined) {
        if (t < g.tA) { r.pos = g.from + g.v0 * t + (g.v1 - g.v0) * t * t / (2 * g.tA); r.speed = g.v0 + (g.v1 - g.v0) * t / g.tA; }
        else { const u = Math.min(g.tB, t - g.tA), xA = (g.v0 + g.v1) / 2 * g.tA; r.pos = g.from + Math.min(g.d, xA + g.v1 * u - g.v1 * u * u / (2 * g.tB)); r.speed = g.v1 * (1 - u / g.tB); }
      } else {
        r.pos = g.from + g.d * (1 - Math.pow(1 - k, g.p));
        r.speed = g.d * g.p * Math.pow(1 - k, g.p - 1) / g.dur;
      }
      if (Math.floor(r.pos) !== g.tick) { g.tick = Math.floor(r.pos); if (r.speed < 7) SFX.tick(); }   // tick as each number crawls past
      if (k >= 1) { r.glide = null; r.spin = false; r.num = g.n; r.pos = g.n - 1; r.speed = 0; r.bounce = 0.5; SFX.stop(); }
    } else if (r.spin) r.pos = (r.pos + r.speed * dt) % 9;
    if (r.bounce > 0) r.bounce = Math.max(0, r.bounce - dt * 4);
  }
  if (st.reels.some(r => r.sync)) { const p = st.reels[0].pos; for (const r of st.reels) if (r.sync) r.pos = p; }
  st.reelMix += ((st.reelMode === 'mini' ? 0 : 1) - st.reelMix) * Math.min(1, dt * 8);
  // effects
  st.flash = Math.max(0, st.flash - dt * 2.2); st.shake = Math.max(0, st.shake - dt);
  st.overlays = st.overlays.filter(o => st.time - o.t0 < o.dur);
  for (const p of st.particles) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  st.particles = st.particles.filter(p => p.life > 0);
  if (st.banner && st.time - st.banner.t0 > st.banner.dur) st.banner = null;
  // right-hit hint
  const needRight = st.rush || st.inJackpot;
  const isRight = st.power > 0.4;
  st.rightHint = needRight && !isRight ? 1 : (!needRight && isRight ? -1 : 0);
  updateHud();
  if (S.balls > S.stats.bestBalls) S.stats.bestBalls = S.balls;
}
let hudCache = '';
function updateHud() {
  const s = S.stats, right = st.power > 0.4;
  const k = `${S.balls}|${st.rush}|${st.stLeft}|${st.inJackpot}|${st.rightHint}|${right}|${s.hits}|${s.spins}|${s.hamari}|${st.chain}`;
  if (k === hudCache) return; hudCache = k;
  elBalls.textContent = S.balls.toLocaleString();
  const diff = S.balls - s.invest; $('diff').textContent = signed(diff); $('diff').className = diff >= 0 ? 'pos' : 'neg';
  elMode.classList.toggle('rush', st.rush || st.inJackpot);
  $('frame').classList.toggle('rush', st.rush || st.inJackpot);
  elModeTxt.textContent = st.inJackpot ? '大獎' : st.rush ? (st.stLeft > 0 ? `RUSH 剩${st.stLeft}` : '殘保留') : '一般';
  $('cHits').textContent = s.hits; $('cRush').textContent = s.rush; $('cSpins').textContent = s.spins; $('cNow').textContent = st.rush ? st.chain + '連' : s.hamari;
  $('cNowL').textContent = st.rush ? 'RUSH' : '現在';
  $('sideL').classList.toggle('want', st.rightHint === -1); $('sideR').classList.toggle('want', st.rightHint === 1);
}

// ---------- rendering ----------
function render() {
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!geo) return;
  let sx = 0, sy = 0;
  if (st.shake > 0) { sx = (rnd() - 0.5) * 14 * st.shake; sy = (rnd() - 0.5) * 14 * st.shake; }
  ctx.save(); ctx.translate(sx, sy);
  drawBoard();
  draw8bit();
  drawLCD();
  drawBalls();
  ctx.restore();
  // particles
  for (const p of st.particles) { ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (st.flash > 0) { ctx.globalAlpha = Math.min(1, st.flash); ctx.fillStyle = st.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (st.rightHint === 1 && (st.time * 2 | 0) % 2 === 0) drawHint('請右打 ▶▶', '#ff4a5a');
  if (st.rightHint === -1 && (st.time * 2 | 0) % 2 === 0) drawHint('◀◀ 請左打', '#4aa8ff');
}
function drawHint(t, col) {
  ctx.font = '900 40px "PingFang TC","Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = geo.hesoY + 70;
  ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.strokeText(t, W / 2, y); ctx.fillStyle = col; ctx.fillText(t, W / 2, y);
}
function ledColor(i) {
  const t = st.time;
  switch (st.ledMode) {
    case 'jackpot': return `hsl(${(i * 25 + t * 400) % 360} 100% 60%)`;
    case 'rush': return (i + (t * 8 | 0)) % 3 ? '#ff2a3c' : '#ffd23f';
    case 'reach': return (i + (t * 12 | 0)) % 2 ? '#ff4a5a' : '#ffffff';
    default: return `hsl(${210 + Math.sin(t * 1.5 + i * 0.3) * 30} 90% ${50 + Math.sin(t * 3 + i) * 12}%)`;
  }
}
function drawBoard() {
  const g = geo;
  // background
  ctx.save();
  ctx.beginPath(); ctx.moveTo(g.L, H - 8); ctx.lineTo(g.L, g.cy); ctx.arc(g.cx, g.cy, g.rad, Math.PI, 0); ctx.lineTo(g.R, H - 8); ctx.closePath();
  ctx.clip();
  const bg = IMG.board_bg;
  if (bg.complete && bg.naturalWidth) { const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight); ctx.drawImage(bg, (W - bg.naturalWidth * s) / 2, (H - bg.naturalHeight * s) / 2, bg.naturalWidth * s, bg.naturalHeight * s); }
  else { ctx.fillStyle = '#120e2a'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(8,6,20,0.38)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // outer rail + LEDs
  ctx.lineWidth = 6; ctx.strokeStyle = '#c9cbe0';
  ctx.beginPath(); ctx.moveTo(g.L, H - 8); ctx.lineTo(g.L, g.cy); ctx.arc(g.cx, g.cy, g.rad, Math.PI, 0); ctx.lineTo(g.R, H - 8); ctx.stroke();
  const n = 44;
  for (let i = 0; i <= n; i++) { const a = Math.PI + Math.PI * i / n; ctx.fillStyle = ledColor(i); ctx.beginPath(); ctx.arc(g.cx + (g.rad + 9) * Math.cos(a), g.cy + (g.rad + 9) * Math.sin(a), 3.2, 0, 6.283); ctx.fill(); }
  for (let y = g.cy + 20, i = 0; y < H - 20; y += 34, i++) { ctx.fillStyle = ledColor(i + 50); ctx.fillRect(g.L - 12, y, 5, 14); ctx.fillRect(g.R + 7, y, 5, 14); }
  // segments (guides)
  ctx.strokeStyle = '#e8c86a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const s of g.segs) { ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
  // pegs
  for (const p of g.pegs) {
    ctx.fillStyle = p.hit > 0 ? '#fff6c0' : '#d9d3b8';
    ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffffff99'; ctx.beginPath(); ctx.arc(p.x - 1.3, p.y - 1.3, 1.4, 0, 6.283); ctx.fill();
  }
  // heso
  const hx = g.hesoX, hy = g.hesoY;
  ctx.fillStyle = '#1b1530'; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
  roundRect(hx - 20, hy - 6, 40, 26, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.fillRect(hx - 13, hy - 6, 26, 10);
  ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd23f'; ctx.fillText('啟動口', hx, hy + 13);
  // gate
  ctx.strokeStyle = '#7ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((g.laneX + g.R) / 2, g.gateY + 6, 18, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.font = '700 10px sans-serif'; ctx.fillStyle = '#7ff'; ctx.fillText('通過口', (g.laneX + g.R) / 2, g.gateY + 16);
  // denchu
  const dx = (g.laneX + g.R) / 2 + 2, dy = g.denY, op = st.denchu.open;
  ctx.fillStyle = op ? '#ff2a3c' : '#5a1c26';
  ctx.save(); ctx.translate(dx - 14, dy); ctx.rotate(op ? -0.9 : 0); ctx.fillRect(-2, -14, 5, 18); ctx.restore();
  ctx.save(); ctx.translate(dx + 14, dy); ctx.rotate(op ? 0.9 : 0); ctx.fillRect(-3, -14, 5, 18); ctx.restore();
  ctx.fillStyle = '#1b1530'; roundRect(dx - 16, dy + 2, 32, 16, 4); ctx.fill();
  ctx.font = '700 9px sans-serif'; ctx.fillStyle = op ? '#fff' : '#c88'; ctx.fillText('電動', dx, dy + 10);
  // attacker
  const f = g.floor, ao = st.attacker.open;
  ctx.save(); ctx.strokeStyle = ao ? '#ffd23f' : '#8a7a40'; ctx.lineWidth = 10; ctx.lineCap = 'butt';
  const t1 = (584 - f[0]) / (f[2] - f[0]), t2 = (690 - f[0]) / (f[2] - f[0]);
  const ax1 = f[0] + (f[2] - f[0]) * t2, ay1 = f[1] + (f[3] - f[1]) * t2, ax2 = f[0] + (f[2] - f[0]) * t1, ay2 = f[1] + (f[3] - f[1]) * t1;
  if (ao) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(st.time * 20); }
  ctx.beginPath(); ctx.moveTo(ax1, ay1 + 6); ctx.lineTo(ax2, ay2 + 6); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  ctx.font = '800 12px sans-serif'; ctx.fillStyle = ao ? '#ffd23f' : '#a99'; ctx.fillText(ao ? `開放 ${st.attacker.count}/10` : '大獎口', (ax1 + ax2) / 2 - 6, (ay1 + ay2) / 2 + 26);
  // pockets
  for (const p of g.pockets) { ctx.fillStyle = '#1b1530'; ctx.strokeStyle = '#9c5cff'; ctx.lineWidth = 2; roundRect(p.x - 14, p.y - 4, 28, 16, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#000'; ctx.fillRect(p.x - 10, p.y - 4, 20, 6); }
  // out hole
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 40, 12, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#c9cbe0'; ctx.lineWidth = 2; ctx.stroke();
  // launch rail glow
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.L + 9, H - 40); ctx.lineTo(g.L + 9, g.cy); ctx.stroke();
}
// ---------- 8-bit strip in the lower board ----------
// tiny pixel sprites ('.' = clear) drawn with 3px pixels just above the OUT hole
const PX = { K: '#111', Y: '#ffd23f', R: '#ff3a4c', W: '#ffffff', B: '#7a4a12', O: '#ff8a2a', T: '#2a9a9a', C: '#ffe3a8', G: '#3fbf4f', g: '#2a8a3a' };
const SPR = {
  pika: [[
    '..K.....K...',
    '..YK...KY...',
    '..YY...YY...',
    '..YYYYYYY...',
    '.YYKYYYKYY..',
    '.YRYYYYYRYBY',
    '.YYYYKYYYYYB',
    '..YYYYYYY.Y.',
    '..YYYYYYY...',
    '..Y.Y..Y.Y..'], [
    '..K.....K...',
    '..YK...KY...',
    '..YY...YY...',
    '..YYYYYYY...',
    '.YYKYYYKYY..',
    '.YRYYYYYRYBY',
    '.YYYYKYYYYYB',
    '..YYYYYYY.Y.',
    '..YYYYYYY...',
    '...YY..YY...']],
  ball: [[
    '..KKK..',
    '.KRRRK.',
    'KRRRRRK',
    'KKKWKKK',
    'KWWWWWK',
    '.KWWWK.',
    '..KKK..']],
  zard: [[
    '......TT......',
    '.....TTTT.....',
    '..OO.TTTTT....',
    '.OKOO.TTTTT...',
    'OOOOOO.TTT....',
    '.OOCCOOO......',
    '...OCCOOOO..YY',
    '....OOOOOOOYRY',
    '.....O..O...Y.'], [
    '..............',
    '..OO..........',
    '.OKOO.........',
    'OOOOOOTTTT....',
    '.OOCCOTTTTTT..',
    '...OCCOTTTTTYY',
    '....OOOOOOOYRY',
    '.....O..O...Y.',
    '..............']],
  bang: [['KYK', 'KYK', 'KYK', '...', 'KYK']],
};
function pix(spr, frame, x, y, flip = false, P = 5) {
  const rows = SPR[spr][frame % SPR[spr].length], w = rows[0].length;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < w; c++) {
    const ch = rows[r][flip ? w - 1 - c : c]; if (ch === '.') continue;
    ctx.fillStyle = PX[ch]; ctx.fillRect(Math.round(x + c * P), Math.round(y + r * P), P, P);
  }
}
function draw8bit() {
  const P = 5, x0 = 44, x1 = W - 44, gy = H - 34, t = st.time;
  ctx.save();
  // the stage: a dark pixel sky with twinkling stars over the board background
  const top = H - 128, sky = ctx.createLinearGradient(0, top, 0, gy);
  sky.addColorStop(0, 'rgba(6,8,30,0)'); sky.addColorStop(0.35, 'rgba(6,8,30,0.55)'); sky.addColorStop(1, 'rgba(10,14,40,0.8)');
  ctx.fillStyle = sky; ctx.fillRect(x0, top, x1 - x0, gy - top);
  for (let i = 0; i < 14; i++) { if (((t * 2 + i * 0.37) | 0) % 3 === 0) continue; ctx.fillStyle = i % 3 ? '#cfd8ff' : PX.Y; ctx.fillRect(x0 + ((i * 53) % (x1 - x0)), top + 30 + ((i * 29) % 40), 3, 3); }
  ctx.globalAlpha = 0.95;
  // pixel grass
  for (let x = x0; x < x1; x += P) { ctx.fillStyle = (x / P) % 2 ? PX.G : PX.g; ctx.fillRect(x, gy - (((x * 7) % 3 === 0) ? P : 0), P, P * 2); }
  const span = x1 - x0 + 140;
  if (st.inJackpot) {                       // pixel fireworks
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.8 + i * 0.27) % 1, cx = x0 + 30 + ((i * 131 + Math.floor(t * 0.8 + i * 0.27) * 97) % (x1 - x0 - 60)), cy = gy - 60;
      const cols = [PX.Y, PX.R, PX.W, PX.T];
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, d = ph * 40; ctx.globalAlpha = 0.9 * (1 - ph); ctx.fillStyle = cols[(i + k) % 4]; ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.7), 4, 4); }
    }
    ctx.globalAlpha = 0.9;
    pix('pika', (t * 6 | 0), x0 + (x1 - x0) / 2 - 30, gy - 50 - Math.abs(Math.sin(t * 6)) * 14);
  } else if (st.rush) {                     // Charizard flying across, Pikachu cheering
    const zx = x1 - ((t * 110) % (span + 100)) + 60;
    pix('zard', (t * 5 | 0), zx, gy - 82 - Math.sin(t * 3) * 6);
    pix('pika', (t * 8 | 0), x0 + 10, gy - 50 - Math.abs(Math.sin(t * 5)) * 8, true);
  } else {                                  // Pikachu chasing a rolling Poké Ball
    const reach = st.ledMode === 'reach';
    st.p8off = (st.p8off || 0) + (reach ? t - (st.p8prev ?? t) : 0); st.p8prev = t;   // the chase pauses during 聽牌 without jumping
    const tt = t - st.p8off, bx = x1 - ((tt * 70) % (span + 80)) + 40;
    pix('ball', 0, bx, gy - 35 - Math.abs(Math.sin(tt * 5)) * 12);
    pix('pika', reach ? 0 : (t * 8 | 0), bx + 70, gy - 50);
    if (reach && (t * 4 | 0) % 2) pix('bang', 0, bx + 92, gy - 82);
  }
  ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawBalls() {
  for (const b of st.balls) {
    const gr = ctx.createRadialGradient(b.x - 2.5, b.y - 2.5, 1, b.x, b.y, BR);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#cfd3e0'); gr.addColorStop(1, '#6d7286');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, 6.283); ctx.fill();
  }
}
function drawLCD() {
  const l = geo.lcd, w = l.x1 - l.x0, h = l.y1 - l.y0;
  // bezel
  ctx.save();
  ctx.shadowColor = ledColor(0); ctx.shadowBlur = 24;
  ctx.fillStyle = '#2a2140'; roundRect(l.x0 - 14, l.y0 - 14, w + 28, h + 50, 22); ctx.fill();
  ctx.restore();
  const bz = ctx.createLinearGradient(0, l.y0 - 14, 0, l.y1 + 36);
  bz.addColorStop(0, '#fff2b0'); bz.addColorStop(0.3, '#c9962a'); bz.addColorStop(0.6, '#fbe08a'); bz.addColorStop(1, '#7a5512');
  ctx.strokeStyle = bz; ctx.lineWidth = 5; roundRect(l.x0 - 12, l.y0 - 12, w + 24, h + 46, 20); ctx.stroke();
  // screen
  ctx.save(); roundRect(l.x0, l.y0, w, h, 10); ctx.clip();
  const vname = st.fg || st.hold || st.bg, v = vname && VID[vname];
  if (v && v.readyState >= 2) ctx.drawImage(v, l.x0, l.y0, w, h);
  else { const gg = ctx.createLinearGradient(0, l.y0, 0, l.y1); gg.addColorStop(0, '#13204a'); gg.addColorStop(1, '#05060f'); ctx.fillStyle = gg; ctx.fillRect(l.x0, l.y0, w, h); }
  drawReels(l, w, h);
  if (st.step) drawStep(l, w, h);
  if (st.round) drawRound(l, w, h);
  if (st.result) drawResult(l, w, h);
  if (st.rushSum) drawRushSum(l, w, h);
  if (st.pushArmed) {
    const s = 120 + Math.sin(st.time * 18) * 10, b = IMG.btn_push;
    ctx.globalCompositeOperation = 'screen'; if (b.complete) ctx.drawImage(b, l.x0 + w / 2 - s / 2, l.y0 + h / 2 - s / 2, s, s); ctx.globalCompositeOperation = 'source-over';
  }
  for (const o of st.overlays) {
    const k = (st.time - o.t0) / o.dur, img = o.img; if (!img || !(img.width || img.complete)) continue;
    const pop = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : k < 0.2 ? 1.1 - (k - 0.12) / 0.08 * 0.1 : 1;
    const ow = w * o.s * pop, oh = ow * (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
    ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    ctx.drawImage(img, l.x0 + (w - ow) / 2, l.y0 + h * o.y - oh / 2, ow, oh);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  if (st.banner) {
    const k = (st.time - st.banner.t0) / st.banner.dur;
    ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.fillStyle = '#000a'; ctx.fillRect(l.x0, l.y0 + h * 0.4, w, 64);
    ctx.font = '900 38px "PingFang TC","Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = st.banner.col; ctx.fillText(st.banner.text, l.x0 + w / 2, l.y0 + h * 0.4 + 33); ctx.globalAlpha = 1;
  }
  ctx.restore();
  // holds under the LCD
  const hy = l.y1 + 17;
  ctx.font = '700 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#c9c3ef';
  ctx.fillText('保留', l.x0 + 4, hy);
  for (let i = 0; i < 4; i++) {
    const x = l.x0 + 56 + i * 34, hd = st.holds[i];
    if (hd) drawHold(hd.color, x, hy, 13); else { ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, hy, 9, 0, 6.283); ctx.stroke(); }
  }
  if (st.current) drawHold(st.current.color, l.x0 + w / 2, hy, 16 + Math.sin(st.time * 8) * 1.5);
  if (st.holds.length >= 4 && st.time - st.fullT < 1.5) { ctx.textAlign = 'left'; ctx.font = '900 13px "PingFang TC",sans-serif'; ctx.fillStyle = (st.time * 6 | 0) % 2 ? '#ffd23f' : '#fff'; ctx.fillText('保留滿', l.x0 + 56 + 4 * 34 - 8, hy); }
  // status at right
  ctx.textAlign = 'right'; ctx.fillStyle = st.rush ? '#ff6b7a' : '#9ad0ff'; ctx.font = '800 13px sans-serif';
  ctx.fillText(st.inJackpot ? `大獎中 出珠 ${st.payoutRound}` : st.rush ? `RUSH 剩 ${st.stLeft} 轉·累計 ${(st.rushTotal || 0).toLocaleString()} 顆` : `1/99`, l.x1 - 4, hy);
}
function drawHold(color, x, y, r) {
  const img = IMG['hold_' + color];
  ctx.save();
  if (color !== 'white') { const gl = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2); gl.addColorStop(0, HOLD_GLOW[color] + 'aa'); gl.addColorStop(1, HOLD_GLOW[color] + '00'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 6.283); ctx.fill(); }
  if (img && img.complete) { ctx.globalCompositeOperation = 'screen'; ctx.drawImage(img, x - r * 1.25, y - r * 1.25, r * 2.5, r * 2.5); }
  else { ctx.fillStyle = HOLD_GLOW[color]; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
  ctx.restore();
}
function drawReels(l, w, h) {
  const m = st.reelMix; // 1 big, 0 mini
  const big = { x: l.x0 + w * 0.08, y: l.y0 + h * 0.2, cw: w * 0.28, ch: h * 0.6, gap: w * 0.02 };
  const mini = { x: l.x0 + 10, y: l.y0 + 10, cw: 60, ch: 70, gap: 5 };
  const lerp = (a, b) => a * (1 - m) + b * m;
  const cw = lerp(mini.cw, big.cw), ch = lerp(mini.ch, big.ch), gap = lerp(mini.gap, big.gap), x0 = lerp(mini.x, big.x), y0 = lerp(mini.y, big.y);
  const idleDim = !st.fg && m > 0.5;
  for (let i = 0; i < 3; i++) {
    const r = st.reels[i], x = x0 + i * (cw + gap);
    ctx.save();
    roundRect(x, y0, cw, ch, Math.max(6, 14 * m)); ctx.fillStyle = idleDim ? 'rgba(6,8,24,0.55)' : 'rgba(6,8,24,0.75)'; ctx.fill();
    ctx.strokeStyle = r.spin ? '#ffffff55' : '#ffd23faa'; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    if (r.q === 'next') { const fs = Math.min(cw, ch) * 0.3; ctx.font = `900 ${fs}px "Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText('繼續', x + cw / 2, y0 + ch / 2); ctx.fillText('繼續', x + cw / 2, y0 + ch / 2); }
    else if (r.q) { drawQ(x, y0, cw, ch); }
    else if (r.spin) {
      // centre shows floor(pos)+1 sliding down; the next number (+1) enters from above, so nothing ever jumps
      const p = r.pos, base = Math.floor(p), frac = p - base, a = 0.55 + 0.45 * Math.max(0, 1 - r.speed / 8);
      for (let k = -1; k <= 1; k++) { const num = ((base - k) % 9 + 9) % 9 + 1; drawSym(num, x, y0 + (k + frac) * ch, cw, ch, a); }
    } else {
      const bo = Math.sin(r.bounce * 6) * r.bounce * 0.12 * ch;
      drawSym(r.num, x, y0 + bo, cw, ch, 1);
    }
    ctx.restore();
  }
}
function drawSym(n, x, y, cw, ch, alpha) {
  const odd = n % 2 === 1, im = SYM[n];
  ctx.globalAlpha = alpha;
  if (im && im.complete && im.naturalWidth) { const s = Math.min(cw, ch) * 0.78; ctx.drawImage(im, x + cw * 0.56 - s / 2, y + ch * 0.5 - s / 2, s, s); }
  const fs = Math.min(cw, ch) * 0.62;
  ctx.font = `900 ${fs}px "Arial Black","Impact",sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(2, fs * 0.09); ctx.strokeStyle = '#000';
  ctx.strokeText(String(n), x + cw * 0.05, y + ch * 0.95);
  ctx.fillStyle = odd ? '#ff3a4c' : '#3aa0ff'; ctx.fillText(String(n), x + cw * 0.05, y + ch * 0.95);
  ctx.globalAlpha = 1;
}
function drawQ(x, y, cw, ch) {
  const fs = Math.min(cw, ch) * 0.8;
  ctx.font = `900 ${fs}px "PingFang TC","Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wob = Math.sin(st.time * 16) * 3;
  ctx.fillStyle = `hsl(${(st.time * 300) % 360} 100% 65%)`; ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
  ctx.strokeText('？', x + cw / 2 + wob, y + ch / 2); ctx.fillText('？', x + cw / 2 + wob, y + ch / 2);
}
function drawStep(l, w, h) {
  const s = st.step, cols = ['#3a8bff', '#2fe06a', '#ff3048', '#ffc61a', '#ff6bff'];
  const k = Math.min(1, (st.time - s.t0) / 0.15);
  const bw = w * (0.4 + s.l * 0.1) * k, bh = h * 0.18 + s.l * 8;
  ctx.save(); ctx.translate(l.x0 + w / 2, l.y0 + h * 0.5);
  ctx.fillStyle = cols[s.l - 1] + 'dd'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  roundRect(-bw / 2, -bh / 2, bw, bh, 12); ctx.fill(); ctx.stroke();
  ctx.font = `900 ${30 + s.l * 6}px "Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(`階段 ${s.l}`, 0, 0);
  ctx.restore();
}
function drawResult(l, w, h) {
  const r = st.result, k = Math.min(1, (st.time - r.t0) / 0.8), shown = Math.round(r.got * k);
  ctx.fillStyle = '#000c'; ctx.fillRect(l.x0, l.y0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const cx = l.x0 + w / 2;
  ctx.font = '900 30px "PingFang TC","Noto Sans TC",sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(`大獎 ${r.rounds} 回合結束`, cx, l.y0 + h * 0.2);
  ctx.font = '900 66px "Arial Black",sans-serif'; ctx.fillStyle = `hsl(${45 + Math.sin(st.time * 6) * 8} 100% 60%)`;
  ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(`${shown.toLocaleString()} 顆`, cx, l.y0 + h * 0.47); ctx.fillText(`${shown.toLocaleString()} 顆`, cx, l.y0 + h * 0.47);
  ctx.font = '800 22px "PingFang TC",sans-serif'; ctx.fillStyle = r.rush ? '#ff6b7a' : '#9ad0ff';
  ctx.fillText(r.rush ? `${r.chain} 連　RUSH 累計 ${r.total.toLocaleString()} 顆` : '3 回合中獎·回到一般模式', cx, l.y0 + h * 0.72);
  ctx.font = '700 16px "PingFang TC",sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`持有鋼珠 ${S.balls.toLocaleString()}`, cx, l.y0 + h * 0.88);
}
function drawRushSum(l, w, h) {
  const r = st.rushSum, k = Math.min(1, (st.time - r.t0) / 1.2), shown = Math.round(r.total * k);
  ctx.fillStyle = '#000d'; ctx.fillRect(l.x0, l.y0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const cx = l.x0 + w / 2;
  ctx.font = '900 30px "PingFang TC","Noto Sans TC",sans-serif'; ctx.fillStyle = '#ff8a96';
  ctx.fillText('雷光 RUSH 結束', cx, l.y0 + h * 0.17);
  ctx.font = '900 54px "Arial Black",sans-serif'; ctx.fillStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeStyle = '#000';
  ctx.strokeText(`${r.chain} 連`, cx, l.y0 + h * 0.38); ctx.fillText(`${r.chain} 連`, cx, l.y0 + h * 0.38);
  ctx.font = '900 46px "Arial Black",sans-serif'; ctx.fillStyle = `hsl(${45 + Math.sin(st.time * 6) * 8} 100% 60%)`;
  ctx.strokeText(`${shown.toLocaleString()} 顆`, cx, l.y0 + h * 0.6); ctx.fillText(`${shown.toLocaleString()} 顆`, cx, l.y0 + h * 0.6);
  ctx.font = '800 20px "PingFang TC",sans-serif'; ctx.fillStyle = r.best ? '#ffd23f' : '#ccc';
  ctx.fillText(r.best ? '★ RUSH 最高紀錄更新！' : `RUSH 最高紀錄 ${S.stats.bestRush.toLocaleString()} 顆`, cx, l.y0 + h * 0.8);
  ctx.font = '700 16px "PingFang TC",sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`持有鋼珠 ${S.balls.toLocaleString()}`, cx, l.y0 + h * 0.92);
}
function drawRound(l, w, h) {
  ctx.fillStyle = '#0008'; ctx.fillRect(l.x0, l.y1 - 74, w, 74);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 40px "Arial Black",sans-serif'; ctx.fillStyle = '#ffd23f';
  ctx.fillText(`第 ${st.round.r} / ${st.round.of} 回合`, l.x0 + w / 2, l.y1 - 48);
  ctx.font = '800 18px "PingFang TC",sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(`獲得 ${st.payoutRound} 顆  ·  請右打 ▶`, l.x0 + w / 2, l.y1 - 16);
}

// ---------- UI ----------
function setFiring(on) { st.firing = on; elFire.classList.toggle('on', on); elFire.querySelector('b').textContent = on ? '發射中' : '發射'; elFire.querySelector('small').textContent = on ? '點擊停止' : '點擊開始'; if (on) st.fireT = 0; }
function setSide(right) { st.power = right ? POWER_R : POWER_L; $('sideL').classList.toggle('on', !right); $('sideR').classList.toggle('on', right); hudCache = ''; }
function autoSide(right) { if (S.autoSide) setSide(right); }
elFire.addEventListener('click', () => setFiring(!st.firing));
$('sideL').addEventListener('click', () => setSide(false));
$('sideR').addEventListener('click', () => setSide(true));
$('lend').addEventListener('click', () => { S.balls += LEND; S.stats.invest += LEND; dirty = true; $('lend').classList.remove('hot'); toast(`借珠 ${LEND} 顆`); renderStats(); });
elPush.addEventListener('click', pressPush);
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale, l = geo.lcd;
  if (x > l.x0 && x < l.x1 && y > l.y0 && y < l.y1) pressPush();
});
document.addEventListener('keydown', e => {
  if (!st.started || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); setFiring(!st.firing); }
  else if (e.code === 'ArrowLeft') setSide(false);
  else if (e.code === 'ArrowRight') setSide(true);
  else if (e.code === 'Enter' || e.code === 'KeyZ') pressPush();
  else if (e.code === 'KeyB') $('lend').click();
  else if (e.code === 'KeyP') togglePause();
});
function togglePause(force) {
  const p = force ?? !st.paused; if (!st.started) return;
  st.paused = p; $('pauseOv').classList.toggle('hide', !p);
  $('btnPause').textContent = p ? '▶' : '⏸';
  const v = (st.fg && VID[st.fg]) || (st.bg && VID[st.bg]);
  if (p) { for (const q of POOL) q.v.pause(); if (AC) AC.suspend(); }
  else { if (v) v.play().catch(() => {}); if (AC) AC.resume(); last = performance.now(); }
}
$('btnPause').addEventListener('click', () => togglePause());
$('btnResume').addEventListener('click', () => togglePause(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && st.started && !st.paused && !location.search.includes('test')) togglePause(true); });
$('btnSound').addEventListener('click', () => { S.mute = !S.mute; applyVolume(); dirty = true; });
// narrow screens: the two side panels slide in as sheets
const openSheet = id => { for (const x of ['left', 'right']) $(x).classList.toggle('open', x === id); $('scrim').classList.toggle('on', !!id); if (id) renderStats(); };
$('btnStats').addEventListener('click', () => openSheet('left'));
$('btnMenu').addEventListener('click', () => openSheet('right'));
for (const b of document.querySelectorAll('.sheetClose')) b.addEventListener('click', () => openSheet(null));
$('scrim').addEventListener('click', () => openSheet(null));
$('volVid').value = S.volVid; $('volSfx').value = S.volSfx; $('optSkip').checked = S.skip === '1'; $('optAuto').checked = S.autoSide;
$('volVid').addEventListener('input', e => { S.volVid = +e.target.value; applyVolume(); dirty = true; });
$('volSfx').addEventListener('input', e => { S.volSfx = +e.target.value; applyVolume(); dirty = true; });
$('optSkip').addEventListener('change', e => { S.skip = e.target.checked ? '1' : '0'; dirty = true; });
$('optAuto').addEventListener('change', e => { S.autoSide = e.target.checked; dirty = true; });
$('btnReset').addEventListener('click', () => { if (!confirm('清除所有存檔、統計和成就，從頭開始？')) return; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.href = location.pathname; });

// theoretical 信賴度 from the draw tables (一般時), computed once at load
const THEORY = (() => {
  const t = {}, add = (k, hit) => { const e = t[k] || (t[k] = [0, 0]); e[0]++; if (hit) e[1]++; };
  const keep = st.force; st.force = null;
  for (let i = 0; i < 200000; i++) {
    const h = makeHold('sim', false);
    if (h.color !== 'white') add('hold_' + h.color, h.hit);
    if (h.group) { add('group', h.hit); add('group_' + h.groupKind, h.hit); }
    if (h.step >= 3) add('step' + h.step, h.hit);
    if (h.giji) add('giji' + (h.giji + 1), h.hit);
    if (h.reach !== 'none') add('reach_' + h.reach, h.hit);
    if (h.cutin) { add('cutin_' + h.reach, h.hit); add('cut_' + h.cutCol, h.hit); }
    if (h.spLine) add('line_' + h.spLine, h.hit);
  }
  st.force = keep;
  return t;
})();
const TRUST_ROWS = [
  ['reach_normal', '普通聽牌'], ['reach_sp', '強聽牌（全部）'], ['line_meowth', '　喵喵搶球'], ['line_gengar', '　耿鬼'], ['line_sky', '　噴火龍空中戰'], ['reach_spsp', '超強聽牌（全部）'], ['line_mewtwo', '　超夢'], ['line_birds', '　三神鳥'], ['cutin_sp', '強聽牌＋切入'], ['cutin_spsp', '超強聽牌＋切入'],
  ['cut_blue', '藍切入（傑尼龜）'], ['cut_green', '綠切入（妙蛙種子）'], ['cut_red', '紅切入（噴火龍）'], ['cut_gold', '金切入（皮卡丘）'],
  ['group', '群體預告（全部）'], ['group_cater', '　綠毛蟲'], ['group_pidgey', '　波波'], ['group_magi', '　鯉魚王'], ['giji2', '假連續 ×2'], ['giji3', '假連續 ×3'], ['step3', '階段預告 3'], ['step4', '階段預告 4'], ['step5', '階段預告 5'],
  ['hold_blue', '藍保留'], ['hold_green', '綠保留'], ['hold_red', '紅保留'], ['hold_gold', '金保留'], ['hold_rainbow', '虹保留'],
];
const pct = (a, b) => b ? (a / b * 100) : null;
const fmtP = v => v == null ? '—' : v >= 99.95 ? '必中' : v < 1 ? v.toFixed(1) + '%' : Math.round(v) + '%';
const num = n => (n ?? 0).toLocaleString();
const rateP = v => v == null ? '—' : Math.round(v) + '%';
const signed = n => (n > 0 ? '+' : '') + n.toLocaleString();
function renderStats() {
  const s = S.stats, diff = S.balls - s.invest;
  $('tHits').textContent = s.hits; $('tFirst').textContent = s.firstHits; $('tSpins').textContent = num(s.spins); $('tChain').textContent = s.maxChain;
  const prob = s.firstHits ? `1/${(s.spinsNormal / s.firstHits).toFixed(1)}` : '—';
  const rate = s.firedNormal >= 250 ? (s.spinsNormal / s.firedNormal * 250).toFixed(1) + ' 轉' : '—';
  const rows = [
    ['投資（開局＋借珠）', num(s.invest)], ['持有鋼珠', num(S.balls)], ['收支', `<b class="${diff >= 0 ? 'pos' : 'neg'}">${signed(diff)}</b>`],
    ['發射', num(s.fired)], ['獲得', num(s.got)], ['目前未中轉數', `${s.hamari} 轉`], ['最長未中轉數', `${s.maxHamari} 轉`],
    ['首次大獎機率（實測）', `${prob}<small> / 理論 1/99</small>`], ['回轉率（每 250 顆）', rate],
    ['RUSH 突入率', s.firstHits ? `${rateP(pct(s.rush, s.firstHits))}<small> / 理論 60%</small>` : '—'],
    ['RUSH 續航率', s.rushEnds + s.rushHits ? `${rateP(pct(s.rushHits, s.rushHits + s.rushEnds))}<small> / 理論 82%</small>` : '—'],
    ['平均連莊', s.rushEnds ? (s.chainSum / s.rushEnds).toFixed(1) + ' 連' : '—'],
    ['單次最高出珠', num(s.bestSingle)], ['RUSH 最高出珠', num(s.bestRush)], ['遊玩時間', fmtTime(s.playSec)],
  ];
  $('stats').innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
  $('hist').innerHTML = S.hist.length ? S.hist.map(x => `<tr><td>${x.chain > 1 ? x.chain + ' 連' : x.ham != null ? x.ham + ' 轉' : ''}</td><td>${x.sym ? `<img src="assets/sym/s${x.sym}.webp" alt="">${x.sym}` : ''}</td><td>${x.r} 回合${x.rush ? '<i>RUSH</i>' : ''}</td><td>+${num(x.got)}</td></tr>`).join('') : '<tr><td colspan="4" class="dim">還沒有大獎</td></tr>';
  $('trust').innerHTML = '<tr><th>演出</th><th>理論</th><th>你的</th></tr>' + TRUST_ROWS.map(([k, label]) => {
    const t = THEORY[k], m = s.eff[k];
    return `<tr><td>${label}</td><td>${t ? fmtP(pct(t[1], t[0])) : '—'}</td><td>${m ? `${rateP(pct(m[1], m[0]))}<small> (${m[1]}/${m[0]})</small>` : '—'}</td></tr>`;
  }).join('') + '<tr><td>全回轉（夢幻）</td><td>必中</td><td>—</td></tr><tr><td>夢幻泡泡（稀有）</td><td>必中</td><td>—</td></tr>';
  $('achN').textContent = `${Object.keys(S.ach).length} / ${ACH.length}`;
  $('ach').innerHTML = ACH.map(([id, name, desc]) => `<li class="${S.ach[id] ? 'got' : ''}"><span>${S.ach[id] ? '🏆' : '🔒'}</span><b>${name}</b><small>${desc}</small></li>`).join('');
  drawSlump();
}
function fmtTime(sec) { sec = sec | 0; const h = sec / 3600 | 0, m = (sec % 3600) / 60 | 0; return h ? `${h} 小時 ${m} 分` : `${m} 分`; }
function drawSlump() {
  const c = $('slump'), r = c.getBoundingClientRect(); if (!r.width) return;
  const d = Math.min(2, devicePixelRatio || 1); c.width = r.width * d; c.height = r.height * d;
  const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  const w = r.width, h = r.height, pts = S.slump.length ? S.slump : [0];
  let lo = Math.min(0, ...pts), hi = Math.max(0, ...pts); const pad = Math.max(200, (hi - lo) * 0.1); lo -= pad; hi += pad;
  const X = i => 6 + (w - 12) * (pts.length < 2 ? 0 : i / (pts.length - 1)), Y = v => h - 14 - (h - 24) * (v - lo) / (hi - lo);
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#ffffff1a'; g.lineWidth = 1; g.font = '10px system-ui'; g.fillStyle = '#9a93c4'; g.textBaseline = 'middle';
  const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 2))) * (((hi - lo) / Math.pow(10, Math.floor(Math.log10((hi - lo) / 2)))) > 10 ? 5 : 2);
  for (let v = Math.ceil(lo / step) * step; v < hi; v += step) { g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(w, Y(v)); g.stroke(); g.fillText(signed(v), 4, Y(v) - 6); }
  g.strokeStyle = '#ffffff55'; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke();
  for (const sp of S.slumpHits) { const i = sp - 1 - S.slumpBase; if (i < 0 || i >= pts.length) continue; g.fillStyle = '#ffd23f33'; g.fillRect(X(i) - 1, 4, 2, h - 18); }
  const last = pts[pts.length - 1];
  g.strokeStyle = last >= 0 ? '#ffd23f' : '#4aa8ff'; g.lineWidth = 2; g.lineJoin = 'round';
  g.beginPath(); pts.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
  g.fillStyle = '#9a93c4'; g.textAlign = 'right'; g.fillText(`${num(S.slumpBase + pts.length - 1)} 轉`, w - 4, h - 6); g.textAlign = 'left';
}
setInterval(() => { if (st.started && !st.paused) { S.stats.playSec += 1; } if (st.started && (innerWidth >= 1180 || $('left').classList.contains('open') || $('right').classList.contains('open'))) renderStats(); }, 1000);
window.addEventListener('resize', () => drawSlump());
$('btnStart').addEventListener('click', () => {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  // unlock every pool <video> for sound playback inside this user gesture
  for (const q of POOL) { const v = q.v; if (!q.name) v.src = 'assets/clips/01_idle.mp4'; v.muted = false; const p = v.play(); if (p) p.then(() => { if (!inUse(q.name)) v.pause(); }).catch(() => {}); }
  applyVolume();
  $('startOv').classList.add('hide');
  st.started = true; last = performance.now();
  setSide(false);
  setBg(null); setTimeout(() => setBg('idle'), 60);
  setFiring(true);
  renderStats();
});

// ---------- debug / test API ----------
window.__pk = {
  st, S, geo: () => geo,
  force(reach, hit = true, extra = {}) { st.force = Object.assign({ reach, hit }, extra); return st.force; },
  hold(reach, hit = true, extra = {}) { st.force = Object.assign({ reach, hit }, extra); addHold('debug'); return st.holds.length; },
  give(n) { S.balls += n; },
  clips: () => [...HAVE], theory: () => THEORY,
  pow(a, b, n) { POW_MIN = a; POW_RANGE = b; if (n !== undefined) POW_NOISE = n; },
  road(gap, end, hw) { ROAD_GAP = gap; ROAD_END = end; if (hw) HESO_W = hw; if (arguments.length > 3) FUNNEL = arguments[3]; buildGeo(); },
  trace(power = 0.3, sec = 8) { // path of one ball, sampled every 0.1 s
    simMode = true; const p0 = st.power; st.power = power; const keep = st.balls; st.balls = []; launch(); S.balls++;
    const b = st.balls[0], out = []; let t = 0, alive = true;
    while (t < sec && alive) { for (let i = 0; i < 12 && alive; i++) { alive = stepBall(b, 1 / 120); t += 1 / 120; } out.push([Math.round(b.x), Math.round(b.y)]); }
    st.balls = keep; st.power = p0; simMode = false; return out;
  },
  stuck(sec = 300, power = POWER_L) { // physics only: where balls sit still for over a second
    simMode = true; const saveB = st.balls, saveBalls = S.balls; st.balls = [];
    const p0 = st.power; st.power = power; let t = 0, ft = 0; const dt = 1 / 120, spots = {};
    while (t < sec) {
      t += dt; ft -= dt; if (ft <= 0) { ft += FIRE_INTERVAL; launch(); }
      st.balls = st.balls.filter(b => stepBall(b, dt));
      for (const b of st.balls) { if (b.rail !== null) continue; b.st2 = Math.hypot(b.vx, b.vy) < 25 ? (b.st2 || 0) + dt : 0; if (b.st2 > 0.9 && !b.rep) { b.rep = 1; const k = `${Math.round(b.x / 10) * 10},${Math.round(b.y / 10) * 10}`; spots[k] = (spots[k] || 0) + 1; } }
    }
    st.balls = saveB; S.balls = saveBalls; st.power = p0; simMode = false; return spots;
  },
  sim(sec = 60, power = 0.3) { // synchronous physics only, returns entry counts
    simMode = true; const saveB = st.balls, saveBalls = S.balls; st.balls = []; for (const k in simStats) simStats[k] = 0;
    const p0 = st.power; st.power = power; let fired = 0, t = 0, ft = 0; const dt = 1 / 120;
    while (t < sec) { t += dt; ft -= dt; if (ft <= 0) { ft += FIRE_INTERVAL; launch(); fired++; } st.balls = st.balls.filter(b => stepBall(b, dt)); if (st.denchu.open) { st.denchu.t -= dt; if (st.denchu.t <= 0) st.denchu.open = false; } }
    const res = Object.assign({ fired }, simStats);
    st.balls = saveB; S.balls = saveBalls; st.power = p0; simMode = false; return res;
  },
};

resize();
requestAnimationFrame(loop);
// test mode: keep the game clock running when the page is hidden (rAF stops there)
if (location.search.includes('test')) setInterval(() => { const now = performance.now(); if (now - last > 120) { const dt = Math.min(0.5, (now - last) / 1000); last = now; if (st.started && !st.paused) update(dt); } }, 40);
})();
