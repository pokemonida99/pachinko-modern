// P 寶可夢 雷光RUSH — modern-style digital pachinko (デジパチ) with H3 video 演出
'use strict';
(() => {
const W = 720;
const BR = 7;           // ball radius
const PR = 4.2;         // peg radius
const G = 1500;         // gravity px/s^2
const FIRE_INTERVAL = 0.6; // s (100 balls/min)
let POW_MIN = 80, POW_RANGE = 700, ROAD_GAP = 21, ROAD_END = 64, HESO_W = 16, FUNNEL = 70;
const SAVE_KEY = 'pk_modern_v1';
const P_NORMAL = 1 / 99, P_RUSH = 1 / 12, ST_SPINS = 20;

const CLIPS = ['01_idle','02_group','03_cutin','04_sp_reach','05_sp_win','06_sp_lose','07_spsp_reach','08_spsp_win','09_spsp_lose','10_zenkaiten','11_jackpot','12_rush_in','13_rush_loop','14_premium'];
const UI = ['board_bg','btn_push','logo','txt_chance','txt_gekiatsu','txt_next','txt_ooatari','txt_rush','txt_reach','txt_zenkaiten','hold_white','hold_blue','hold_green','hold_red','hold_gold','hold_rainbow'];
const HOLD_GLOW = {white:'#ffffff',blue:'#3a8bff',green:'#2fe06a',red:'#ff3048',gold:'#ffc61a',rainbow:'#ff6bff'};

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const cv = $('board'), ctx = cv.getContext('2d');
const elBalls = $('balls'), elMode = $('mode'), elModeTxt = $('modeTxt');
const elPower = $('power'), elFire = $('fire'), elPush = $('push');

// ---------- assets ----------
const IMG = {}, VID = {};
let loadCount = 0;
const totalLoad = UI.length + 9;
function onLoaded() { loadCount++; $('loadTxt').textContent = loadCount >= totalLoad ? '準備完成' : `載入中… ${loadCount}/${totalLoad}`; }
for (const n of UI) { const i = new Image(); i.onload = onLoaded; i.onerror = onLoaded; i.src = `assets/ui/${n}.webp`; IMG[n] = i; }
const SYM = [];
for (let k = 1; k <= 9; k++) { const i = new Image(); i.onload = onLoaded; i.onerror = onLoaded; i.src = `assets/sym/s${k}.webp`; SYM[k] = i; }
for (const n of CLIPS) {
  const v = document.createElement('video');
  v.src = `assets/clips/${n}.mp4`; v.preload = 'auto'; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  $('vids').appendChild(v); VID[n] = v;
}

// ---------- persistent state ----------
const save = (() => { try { if (location.search.includes('reset')) localStorage.removeItem(SAVE_KEY); return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } })();
const S = {
  balls: save?.balls ?? 1000,
  stats: save?.stats ?? { spins: 0, hits: 0, rush: 0, maxChain: 0, fired: 0, bestBalls: 1000 },
  hist: save?.hist ?? [],
  volVid: save?.volVid ?? 80, volSfx: save?.volSfx ?? 60, mute: save?.mute ?? false, skip: save?.skip ?? '0',
};
let dirty = true;
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ balls: S.balls, stats: S.stats, hist: S.hist.slice(0, 40), volVid: S.volVid, volSfx: S.volSfx, mute: S.mute, skip: S.skip })); } catch (e) {} }
setInterval(() => { if (dirty) { persist(); dirty = false; } }, 2000);

// ---------- runtime state ----------
const st = {
  started: false, paused: false, firing: false, power: 0.3,
  balls: [], fireT: 0, time: 0,
  holds: [], current: null, busy: false, inJackpot: false,
  rush: false, stLeft: 0, chain: 0,
  denchu: { open: false, t: 0, pending: 0 }, attacker: { open: false, count: 0 },
  round: null, payoutRound: 0,
  reels: [mkReel(), mkReel(), mkReel()], reelMode: 'big', reelMix: 1, reelMarks: null,
  overlays: [], particles: [], flash: 0, flashCol: '#fff', shake: 0, ledMode: 'normal',
  fg: null, bg: null, pushWait: null, step: null, banner: null, gijiCount: 0,
  waiters: [], force: null, rightHint: 0,
};
function mkReel() { return { spin: false, pos: Math.random() * 9, speed: 0, num: 1 + (Math.random() * 9 | 0), bounce: 0, q: false, sync: false }; }

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
  for (const n in VID) VID[n].volume = S.mute ? 0 : S.volVid / 100;
  for (const n in VID) VID[n].muted = S.mute;
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
  const r = $('stage').getBoundingClientRect();
  const sw = Math.max(200, r.width - 8), sh = Math.max(200, r.height - 8);
  const nh = Math.round(Math.min(1300, Math.max(1000, W * sh / sw)));
  scale = Math.min(sw / W, sh / nh);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = Math.floor(W * scale) + 'px'; cv.style.height = Math.floor(nh * scale) + 'px';
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(nh * scale * dpr);
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
  const top = ly1 + 74, bot = H - 96;
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
  geo = g;
  st.balls = st.balls.filter(b => b.y < H);
}

// ---------- balls & physics ----------
function launch() {
  if (S.balls <= 0) { setFiring(false); banner('持ち玉不足 — 選單可補充', 2200); return; }
  S.balls--; S.stats.fired++; dirty = true;
  const a1 = Math.PI * 1.30, v0 = POW_MIN + POW_RANGE * st.power + (rnd() - 0.5) * 14;
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
function pay(n) { S.balls += n; dirty = true; if (!simMode) SFX.pay(); }

// ---------- entries & 抽選 ----------
const simStats = { heso: 0, denchu: 0, att: 0, gate: 0 };
function onHeso() {
  simStats.heso++; pay(3); if (!simMode) SFX.heso();
  addHold('heso');
}
function onDenchu() { simStats.denchu++; pay(1); if (!simMode) SFX.denchu(); addHold('denchu'); }
function onAttacker() { simStats.att++; S.balls += 15; dirty = true; st.payoutRound += 15; st.attacker.count++; if (!simMode) SFX.pay(); }
function onGate() {
  simStats.gate++;
  if (st.denchu.open || st.denchu.pending) return;
  if (st.rush) { st.denchu.pending = 1; wait(250).then(() => { st.denchu.pending = 0; openDenchu(1.8); }); }
  else if (rnd() < 1 / 30) { openDenchu(0.35); }
}
function openDenchu(sec) { st.denchu.open = true; st.denchu.t = sec; if (!simMode) SFX.open(); }

function addHold(src) {
  if (simMode) return;
  if (st.holds.length >= 4) return;
  const h = makeHold(src);
  st.holds.push(h);
}
function makeHold(src) {
  const rush = st.rush;
  let hit = rnd() < (rush ? P_RUSH : P_NORMAL);
  const f = st.force; if (f) { hit = f.hit; }
  const h = { hit, rush, src, rounds: 0, rushAfter: false, reach: 'none', color: 'white', group: false, step: 0, giji: 0, cutin: false, premium: false, nums: [1, 2, 3], born: st.time };
  if (hit) {
    if (rush) { h.rounds = rnd() < 0.7 ? 10 : 3; h.rushAfter = true; }
    else if (rnd() < 0.5) { h.rounds = 10; h.rushAfter = true; } else { h.rounds = 3; h.rushAfter = false; }
  }
  if (!rush) {
    h.reach = hit ? pick({ normal: 10, sp: 35, spsp: 50, zen: 5 }) : (rnd() < 0.10 ? pick({ normal: 70, sp: 25, spsp: 5 }) : 'none');
    h.color = hit ? pick({ white: 30, blue: 20, green: 20, red: 18, gold: 10, rainbow: 2 }) : pick({ white: 90, blue: 7, green: 2.5, red: 0.5 });
    h.group = rnd() < (hit ? 0.25 : h.reach !== 'none' ? 0.05 : 0.005);
    h.step = +(hit ? pick({ 0: 20, 1: 10, 2: 10, 3: 20, 4: 20, 5: 20 }) : h.reach !== 'none' ? pick({ 0: 50, 1: 25, 2: 15, 3: 7, 4: 2.5, 5: 0.5 }) : pick({ 0: 85, 1: 12, 2: 3 }));
    h.giji = +(hit ? pick({ 0: 25, 1: 45, 2: 30 }) : h.reach !== 'none' ? pick({ 0: 80, 1: 17, 2: 3 }) : pick({ 0: 97, 1: 3 }));
    h.cutin = (h.reach === 'sp' || h.reach === 'spsp') && rnd() < (hit ? 0.4 : 0.08);
    h.premium = hit && rnd() < 0.03;
  } else {
    h.reach = hit ? pick({ instant: 30, normal: 30, sp: 40 }) : (rnd() < 0.12 ? pick({ normal: 80, sp: 20 }) : 'none');
    h.color = hit ? pick({ white: 40, blue: 20, red: 25, gold: 15 }) : pick({ white: 95, blue: 5 });
  }
  if (f) { if (f.reach) h.reach = f.reach; for (const k of ['premium', 'group', 'cutin', 'step', 'giji', 'color']) if (f[k] !== undefined) h[k] = f[k]; if (!f.keep) st.force = null; }
  // final numbers
  const r9 = () => 1 + (rnd() * 9 | 0);
  if (hit) {
    const odd = [1, 3, 5, 7, 9], even = [2, 4, 6, 8];
    const n = h.rushAfter ? odd[rnd() * 5 | 0] : even[rnd() * 4 | 0];
    h.nums = [n, n, n];
  } else if (h.reach !== 'none') {
    const n = r9(); let c = rnd() < 0.7 ? ((n % 9) + 1) : r9(); if (c === n) c = (n % 9) + 1;
    h.nums = [n, c, n];
  } else {
    const a = r9(); let b = r9(); if (b === a) b = (a % 9) + 1; h.nums = [a, r9(), b];
  }
  return h;
}

// ---------- video helpers ----------
function setBg(name) {
  st.hold = null;
  if (st.bg === name) return;
  if (st.bg && VID[st.bg] && st.bg !== st.fg) VID[st.bg].pause();
  st.bg = name;
  if (!name) return;
  const v = VID[name]; v.loop = true;
  if (!st.fg) { v.play().catch(() => {}); }
}
function playClip(name, opts = {}) {
  return new Promise(resolve => {
    const v = VID[name];
    if (st.bg && VID[st.bg]) VID[st.bg].pause();
    v.loop = false; v.currentTime = 0;
    st.fg = name; st.hold = null;
    let done = false;
    const fin = () => {
      if (done) return; done = true;
      v.removeEventListener('ended', fin);
      v.pause();
      if (st.fg === name) st.fg = null;
      if (opts.hold) st.hold = name;
      st.skipFn = null;
      if (!opts.keepBgPaused && st.bg && !st.fg && !st.paused) VID[st.bg].play().catch(() => {});
      resolve();
    };
    v.addEventListener('ended', fin);
    st.skipFn = S.skip === '1' ? fin : null;
    v.play().catch(() => { wait(1500).then(fin); });
    const dur = (isFinite(v.duration) && v.duration > 0 ? v.duration : 13) + 3;
    wait(dur * 1000).then(fin);
  });
}

// ---------- LCD overlays ----------
function card(img, ms = 1400, opts = {}) { st.overlays.push({ img, t0: st.time, dur: ms / 1000, y: opts.y ?? 0.5, s: opts.s ?? 0.82 }); SFX.card(); }
function banner(text, ms = 1800, col = '#fff') { st.banner = { text, t0: st.time, dur: ms / 1000, col }; }
function doFlash(col = '#fff', strength = 1) { st.flash = strength; st.flashCol = col; st.shake = 0.45; SFX.flash(); }
function burst(n, x, y, cols) { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, s = 150 + rnd() * 520; st.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, life: 1 + rnd() * 0.8, col: cols[i % cols.length], r: 2 + rnd() * 4 }); } }

// ---------- reels ----------
function startReels() { for (const r of st.reels) { r.spin = true; r.speed = 16 + rnd() * 2; r.q = false; r.sync = false; } SFX.spin(); }
function stopReel(i, n) { const r = st.reels[i]; r.spin = false; r.num = n; r.bounce = 1; r.q = false; SFX.stop(); }
function slowReel(i, sp) { st.reels[i].speed = sp; }
function reelsQ() { for (const r of st.reels) { r.spin = false; r.q = true; r.sync = false; r.bounce = 1; } SFX.stop(); }

// ---------- spin sequence (変動) ----------
async function runSpin(h) {
  st.busy = true; st.current = h;
  S.stats.spins++; dirty = true;
  if (st.rush) st.stLeft = Math.max(0, st.stLeft - 1);
  st.reelMode = 'big';
  startReels();
  const fast = st.holds.length >= 3;
  if (h.premium) { st.reelMode = 'mini'; await playClip('14_premium'); st.reelMode = 'big'; doFlash('#ff9cff', 0.8); }
  if (h.group) { st.reelMode = 'mini'; await playClip('02_group'); st.reelMode = 'big'; }
  if (h.step > 0) await stepUp(h.step);
  for (let g = 0; g < h.giji; g++) {
    await wait(1100);
    const a = 1 + (rnd() * 9 | 0);
    stopReel(0, a); await wait(220); stopReel(2, (a % 9) + 1); await wait(200);
    stopReel(1, a); st.reels[1].q = 'next';
    card(IMG.txt_next, 900, { s: 0.6 }); SFX.next();
    await wait(900);
    st.gijiCount = g + 2; banner(`×${g + 2}`, 1200, '#5ff');
    startReels();
  }
  const base = st.rush ? 900 : h.reach !== 'none' || h.step || h.giji ? 1800 : fast ? 1300 : 3200;
  if (h.reach === 'zen') { await zenkaiten(h); return finishSpin(h); }
  if (h.reach === 'instant') { await wait(base); doFlash('#ffd23f', 0.6); reelsQ(); await wait(300); return finishSpin(h); }
  await wait(base);
  stopReel(0, h.nums[0]); await wait(st.rush ? 250 : 550);
  stopReel(2, h.nums[2]);
  if (h.reach !== 'none') {
    await wait(250);
    card(IMG.txt_reach, 1300); SFX.reach(); st.ledMode = 'reach';
    await wait(1300);
    if (h.reach === 'normal') {
      slowReel(1, 5); await wait(1400); slowReel(1, 2.2); await wait(1600);
      if (h.hit) reelsQ(); else stopReel(1, h.nums[1]);
    } else {
      if (h.cutin) { st.reelMode = 'mini'; await playClip('03_cutin', { keepBgPaused: true, hold: true }); card(IMG.txt_gekiatsu, 1500); await wait(1500); }
      const sp = h.reach === 'sp';
      card(sp ? IMG.txt_chance : IMG.txt_gekiatsu, 1300); await wait(1100);
      st.reelMode = 'mini'; slowReel(1, 9);
      await playClip(sp ? '04_sp_reach' : '07_spsp_reach', { keepBgPaused: true, hold: true });
      await pushChance();
      await playClip(h.hit ? (sp ? '05_sp_win' : '08_spsp_win') : (sp ? '06_sp_lose' : '09_spsp_lose'), { keepBgPaused: true, hold: true });
      st.reelMode = 'big';
      if (h.hit) reelsQ(); else stopReel(1, h.nums[1]);
      if (!h.hit) { await wait(600); st.hold = null; if (st.bg) VID[st.bg].play().catch(() => {}); }
    }
  } else {
    await wait(st.rush ? 200 : 450);
    stopReel(1, h.nums[1]);
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
    if (st.rush && st.stLeft <= 0) await endRush();
  }
  if (st.hold) { st.hold = null; if (st.bg && !st.fg && !st.paused) VID[st.bg].play().catch(() => {}); }
  st.current = null; st.busy = false; st.reelMode = 'big';
}
async function stepUp(level) {
  for (let l = 1; l <= level; l++) { st.step = { l, t0: st.time }; SFX.step(l); await wait(520); }
  await wait(380); st.step = null;
}
async function pushChance() {
  elPush.classList.add('live');
  st.pushArmed = true;
  await new Promise(res => { st.pushWait = res; wait(4500).then(() => { if (st.pushWait === res) { st.pushWait = null; res(); } }); });
  elPush.classList.remove('live'); st.pushArmed = false;
  SFX.push(); doFlash('#fff', 0.7);
}
function pressPush() {
  if (st.pushWait) { const r = st.pushWait; st.pushWait = null; r(); return; }
  if (st.fg && st.skipFn) { st.skipFn(); return; }
  // free push: a small light show on the LCD
  burst(16, W / 2, geo.lcd.y1 - 20, ['#ffd23f', '#fff', '#4aa8ff']); SFX.card();
}
async function zenkaiten(h) {
  await wait(1200);
  doFlash('#fff');
  card(IMG.txt_zenkaiten, 1600);
  for (const r of st.reels) { r.sync = true; r.speed = 7; }
  st.reelMode = 'mini';
  await playClip('10_zenkaiten', { keepBgPaused: true, hold: true });
  st.reelMode = 'big';
  reelsQ();
  await wait(400);
}

// ---------- 大当り ----------
async function jackpot(h) {
  st.inJackpot = true; st.busy = true;
  // ？？？ → flash → reveal
  for (const r of st.reels) r.q = true;
  st.reelMode = 'big';
  SFX.tension();
  await wait(1400);
  doFlash('#fff'); st.shake = 0.7;
  for (let i = 0; i < 3; i++) { st.reels[i].q = false; st.reels[i].num = h.nums[i]; st.reels[i].bounce = 1.4; }
  await wait(120);
  card(IMG.txt_ooatari, 2200, { s: 0.95 }); SFX.fanfare(); st.ledMode = 'jackpot';
  burst(90, W / 2, geo.lcd.y0 + 150, ['#ffd23f', '#ff6bff', '#5ff', '#fff', '#ff4a5a']);
  await wait(1800);
  S.stats.hits++; st.chain = (st.rush || h.rush) ? st.chain + 1 : 1; S.stats.maxChain = Math.max(S.stats.maxChain, st.chain);
  st.reelMode = 'mini';
  await playClip('11_jackpot');
  // rounds
  setBg('11_jackpot');
  const startBalls = S.balls;
  st.payoutRound = 0;
  for (let r = 1; r <= h.rounds; r++) {
    st.round = { r, of: h.rounds };
    st.attacker.open = true; st.attacker.count = 0; SFX.open();
    const t0 = st.time;
    while (st.attacker.count < 10 && st.time - t0 < 25) await wait(100);
    st.attacker.open = false;
    await wait(r < h.rounds ? 1200 : 600);
  }
  st.round = null;
  const got = S.balls - startBalls;
  st.rushTotal = (st.rush || h.rushAfter ? (st.rushTotal || 0) : 0) + st.payoutRound;
  st.result = { got: st.payoutRound, rounds: h.rounds, chain: st.chain, total: st.rushTotal, rush: h.rushAfter, t0: st.time };
  SFX.fanfare();
  await wait(3200);
  st.result = null;
  S.hist.unshift({ t: new Date().toLocaleString('zh-TW', { hour12: false }), r: h.rounds, rush: h.rushAfter, chain: st.chain, got: st.payoutRound });
  dirty = true;
  if (h.rushAfter) {
    if (!st.rush) {
      S.stats.rush++;
      setBg(null);
      st.reelMode = 'mini';
      card(IMG.txt_rush, 2400, { s: 0.95 });
      await playClip('12_rush_in');
      st.rush = true;
    } else banner('RUSH 繼續！', 1800, '#ffd23f');
    st.stLeft = ST_SPINS;
    st.ledMode = 'rush';
    setBg('13_rush_loop');
  } else {
    st.rush = false; st.chain = 0; st.rushTotal = 0; st.ledMode = 'normal';
    setBg('01_idle');
    banner('回到通常模式', 1800);
  }
  st.inJackpot = false;
  st.reelMode = 'big';
  void got;
}
async function endRush() {
  banner(`RUSH 結束　累計 ${(st.rushTotal || 0).toLocaleString()} 玉`, 2600, '#ff8a96');
  st.rush = false; st.chain = 0; st.rushTotal = 0; st.ledMode = 'normal';
  setBg('01_idle');
  await wait(1500);
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
  for (const r of st.reels) { if (r.spin) r.pos = (r.pos + r.speed * dt) % 9; if (r.bounce > 0) r.bounce = Math.max(0, r.bounce - dt * 4); }
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
  S.stats.bestBalls = Math.max(S.stats.bestBalls, S.balls);
}
let hudCache = '';
function updateHud() {
  const k = `${S.balls}|${st.rush}|${st.stLeft}|${st.inJackpot}|${st.firing}|${st.rightHint}|${st.power > 0.4}`;
  if (k === hudCache) return; hudCache = k;
  elBalls.textContent = S.balls.toLocaleString();
  elMode.classList.toggle('rush', st.rush || st.inJackpot);
  elModeTxt.textContent = st.inJackpot ? '大当り' : st.rush ? `RUSH 殘${st.stLeft}` : '通常';
  $('labL').classList.toggle('on', st.power <= 0.4); $('labR').classList.toggle('on', st.power > 0.4);
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
  drawLCD();
  drawBalls();
  ctx.restore();
  // particles
  for (const p of st.particles) { ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (st.flash > 0) { ctx.globalAlpha = Math.min(1, st.flash); ctx.fillStyle = st.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (st.rightHint === 1 && (st.time * 2 | 0) % 2 === 0) drawHint('請右打ち ▶▶', '#ff4a5a');
  if (st.rightHint === -1 && (st.time * 2 | 0) % 2 === 0) drawHint('◀◀ 請左打ち', '#4aa8ff');
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
  ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd23f'; ctx.fillText('START', hx, hy + 13);
  // gate
  ctx.strokeStyle = '#7ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((g.laneX + g.R) / 2, g.gateY + 6, 18, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.font = '700 10px sans-serif'; ctx.fillStyle = '#7ff'; ctx.fillText('GATE', (g.laneX + g.R) / 2, g.gateY + 16);
  // denchu
  const dx = (g.laneX + g.R) / 2 + 2, dy = g.denY, op = st.denchu.open;
  ctx.fillStyle = op ? '#ff2a3c' : '#5a1c26';
  ctx.save(); ctx.translate(dx - 14, dy); ctx.rotate(op ? -0.9 : 0); ctx.fillRect(-2, -14, 5, 18); ctx.restore();
  ctx.save(); ctx.translate(dx + 14, dy); ctx.rotate(op ? 0.9 : 0); ctx.fillRect(-3, -14, 5, 18); ctx.restore();
  ctx.fillStyle = '#1b1530'; roundRect(dx - 16, dy + 2, 32, 16, 4); ctx.fill();
  ctx.font = '700 9px sans-serif'; ctx.fillStyle = op ? '#fff' : '#c88'; ctx.fillText('電チュー', dx, dy + 10);
  // attacker
  const f = g.floor, ao = st.attacker.open;
  ctx.save(); ctx.strokeStyle = ao ? '#ffd23f' : '#8a7a40'; ctx.lineWidth = 10; ctx.lineCap = 'butt';
  const t1 = (584 - f[0]) / (f[2] - f[0]), t2 = (690 - f[0]) / (f[2] - f[0]);
  const ax1 = f[0] + (f[2] - f[0]) * t2, ay1 = f[1] + (f[3] - f[1]) * t2, ax2 = f[0] + (f[2] - f[0]) * t1, ay2 = f[1] + (f[3] - f[1]) * t1;
  if (ao) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(st.time * 20); }
  ctx.beginPath(); ctx.moveTo(ax1, ay1 + 6); ctx.lineTo(ax2, ay2 + 6); ctx.stroke(); ctx.globalAlpha = 1; ctx.restore();
  ctx.font = '800 12px sans-serif'; ctx.fillStyle = ao ? '#ffd23f' : '#a99'; ctx.fillText(ao ? `OPEN ${st.attacker.count}/10` : 'ATTACKER', (ax1 + ax2) / 2 - 6, (ay1 + ay2) / 2 + 26);
  // pockets
  for (const p of g.pockets) { ctx.fillStyle = '#1b1530'; ctx.strokeStyle = '#9c5cff'; ctx.lineWidth = 2; roundRect(p.x - 14, p.y - 4, 28, 16, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#000'; ctx.fillRect(p.x - 10, p.y - 4, 20, 6); }
  // out hole
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(W / 2, H - 14, 40, 12, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#c9cbe0'; ctx.lineWidth = 2; ctx.stroke();
  // launch rail glow
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.L + 9, H - 40); ctx.lineTo(g.L + 9, g.cy); ctx.stroke();
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
  if (st.pushArmed) {
    const s = 120 + Math.sin(st.time * 18) * 10, b = IMG.btn_push;
    ctx.globalCompositeOperation = 'screen'; if (b.complete) ctx.drawImage(b, l.x0 + w / 2 - s / 2, l.y0 + h / 2 - s / 2, s, s); ctx.globalCompositeOperation = 'source-over';
  }
  for (const o of st.overlays) {
    const k = (st.time - o.t0) / o.dur, img = o.img; if (!img || !img.complete) continue;
    const pop = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : k < 0.2 ? 1.1 - (k - 0.12) / 0.08 * 0.1 : 1;
    const ow = w * o.s * pop, oh = ow * img.naturalHeight / img.naturalWidth;
    ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1; ctx.globalCompositeOperation = 'screen';
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
  // status at right
  ctx.textAlign = 'right'; ctx.fillStyle = st.rush ? '#ff6b7a' : '#9ad0ff'; ctx.font = '800 13px sans-serif';
  ctx.fillText(st.inJackpot ? `大当り中 出玉 ${st.payoutRound}` : st.rush ? `RUSH 殘 ${st.stLeft} 回・累計 ${(st.rushTotal || 0).toLocaleString()} 玉` : `1/99`, l.x1 - 4, hy);
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
  const mini = { x: l.x0 + 8, y: l.y0 + 8, cw: 46, ch: 54, gap: 4 };
  const lerp = (a, b) => a * (1 - m) + b * m;
  const cw = lerp(mini.cw, big.cw), ch = lerp(mini.ch, big.ch), gap = lerp(mini.gap, big.gap), x0 = lerp(mini.x, big.x), y0 = lerp(mini.y, big.y);
  const idleDim = !st.fg && m > 0.5;
  for (let i = 0; i < 3; i++) {
    const r = st.reels[i], x = x0 + i * (cw + gap);
    ctx.save();
    roundRect(x, y0, cw, ch, Math.max(6, 14 * m)); ctx.fillStyle = idleDim ? 'rgba(6,8,24,0.55)' : 'rgba(6,8,24,0.75)'; ctx.fill();
    ctx.strokeStyle = r.spin ? '#ffffff55' : '#ffd23faa'; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    if (r.q === 'next') { const fs = Math.min(cw, ch) * 0.3; ctx.font = `900 ${fs}px "Arial Black",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText('NEXT', x + cw / 2, y0 + ch / 2); ctx.fillText('NEXT', x + cw / 2, y0 + ch / 2); }
    else if (r.q) { drawQ(x, y0, cw, ch); }
    else if (r.spin) {
      const p = r.pos, base = Math.floor(p), frac = p - base;
      for (let k = -1; k <= 1; k++) { const num = ((base + k) % 9 + 9) % 9 + 1; drawSym(num, x, y0 + (k + frac) * ch * 0.92, cw, ch, 0.55); }
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
  ctx.fillText(`STEP ${s.l}`, 0, 0);
  ctx.restore();
}
function drawResult(l, w, h) {
  const r = st.result, k = Math.min(1, (st.time - r.t0) / 0.8), shown = Math.round(r.got * k);
  ctx.fillStyle = '#000c'; ctx.fillRect(l.x0, l.y0, w, h);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const cx = l.x0 + w / 2;
  ctx.font = '900 30px "PingFang TC","Noto Sans TC",sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(`大当り ${r.rounds}R 終了`, cx, l.y0 + h * 0.2);
  ctx.font = '900 66px "Arial Black",sans-serif'; ctx.fillStyle = `hsl(${45 + Math.sin(st.time * 6) * 8} 100% 60%)`;
  ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.strokeText(`${shown.toLocaleString()} 玉`, cx, l.y0 + h * 0.47); ctx.fillText(`${shown.toLocaleString()} 玉`, cx, l.y0 + h * 0.47);
  ctx.font = '800 22px "PingFang TC",sans-serif'; ctx.fillStyle = r.rush ? '#ff6b7a' : '#9ad0ff';
  ctx.fillText(r.rush ? `${r.chain} 連　RUSH 累計 ${r.total.toLocaleString()} 玉` : '通常大当り（不進 RUSH）', cx, l.y0 + h * 0.72);
  ctx.font = '700 16px "PingFang TC",sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText(`持ち玉 ${S.balls.toLocaleString()}`, cx, l.y0 + h * 0.88);
}
function drawRound(l, w, h) {
  ctx.fillStyle = '#0008'; ctx.fillRect(l.x0, l.y1 - 74, w, 74);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 40px "Arial Black",sans-serif'; ctx.fillStyle = '#ffd23f';
  ctx.fillText(`ROUND ${st.round.r} / ${st.round.of}`, l.x0 + w / 2, l.y1 - 48);
  ctx.font = '800 18px "PingFang TC",sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(`獲得 ${st.payoutRound} 顆  ·  請右打ち ▶`, l.x0 + w / 2, l.y1 - 16);
}

// ---------- UI ----------
function setFiring(on) { st.firing = on; elFire.classList.toggle('on', on); elFire.innerHTML = on ? '發射中<br><small>點擊停止</small>' : '發射<br><small>點擊開始</small>'; if (on) st.fireT = 0; }
elFire.addEventListener('click', () => setFiring(!st.firing));
elPower.addEventListener('input', () => { st.power = elPower.value / 100; });
elPush.addEventListener('click', pressPush);
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale, l = geo.lcd;
  if (x > l.x0 && x < l.x1 && y > l.y0 && y < l.y1) pressPush();
});
document.addEventListener('keydown', e => {
  if (!st.started) return;
  if (e.code === 'Space') { e.preventDefault(); setFiring(!st.firing); }
  else if (e.code === 'ArrowLeft') { elPower.value = Math.max(0, +elPower.value - 5); st.power = elPower.value / 100; }
  else if (e.code === 'ArrowRight') { elPower.value = Math.min(100, +elPower.value + 5); st.power = elPower.value / 100; }
  else if (e.code === 'Enter') pressPush();
  else if (e.code === 'KeyP') togglePause();
});
function togglePause(force) {
  const p = force ?? !st.paused; if (!st.started) return;
  st.paused = p; $('pauseOv').classList.toggle('hide', !p);
  $('btnPause').textContent = p ? '▶' : '⏸';
  const v = (st.fg && VID[st.fg]) || (st.bg && VID[st.bg]);
  if (p) { for (const n in VID) VID[n].pause(); if (AC) AC.suspend(); }
  else { if (v) v.play().catch(() => {}); if (AC) AC.resume(); last = performance.now(); }
}
$('btnPause').addEventListener('click', () => togglePause());
$('btnResume').addEventListener('click', () => togglePause(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && st.started && !st.paused && !location.search.includes('test')) togglePause(true); });
$('btnSound').addEventListener('click', () => { S.mute = !S.mute; applyVolume(); dirty = true; });
const openDrawer = o => { $('drawer').classList.toggle('open', o); $('scrim').classList.toggle('on', o); if (o) renderStats(); };
$('btnMenu').addEventListener('click', () => openDrawer(true));
$('btnClose').addEventListener('click', () => openDrawer(false));
$('scrim').addEventListener('click', () => openDrawer(false));
$('volVid').value = S.volVid; $('volSfx').value = S.volSfx; $('optSkip').value = S.skip;
$('volVid').addEventListener('input', e => { S.volVid = +e.target.value; applyVolume(); dirty = true; });
$('volSfx').addEventListener('input', e => { S.volSfx = +e.target.value; applyVolume(); dirty = true; });
$('optSkip').addEventListener('change', e => { S.skip = e.target.value; dirty = true; });
$('btnRefill').addEventListener('click', () => { S.balls += 1000; dirty = true; renderStats(); });
$('btnReset').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.href = location.pathname; });
function renderStats() {
  const s = S.stats;
  $('stats').innerHTML = [['持ち玉', S.balls.toLocaleString()], ['最高持ち玉', s.bestBalls.toLocaleString()], ['發射數', s.fired.toLocaleString()], ['總回轉', s.spins], ['大当り', s.hits], ['RUSH 突入', s.rush], ['最高連荘', s.maxChain], ['目前', st.rush ? `RUSH（${st.chain} 連）` : '通常']]
    .map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
  $('hist').innerHTML = S.hist.length ? S.hist.map(x => `<div>${x.t}｜${x.r}R${x.rush ? '＋RUSH' : ''}｜${x.chain} 連｜+${x.got}</div>`).join('') : '還沒有大当り';
}
$('btnStart').addEventListener('click', () => {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  // unlock every <video> for sound playback inside this user gesture
  for (const n in VID) { const v = VID[n]; v.muted = false; const p = v.play(); if (p) p.then(() => { if (st.fg !== n && st.bg !== n) { v.pause(); v.currentTime = 0; } }).catch(() => {}); }
  applyVolume();
  $('startOv').classList.add('hide');
  st.started = true; last = performance.now();
  setBg(null); setTimeout(() => setBg('01_idle'), 60);
  setFiring(true);
});

// ---------- debug / test API ----------
window.__pk = {
  st, S, geo: () => geo,
  force(reach, hit = true, extra = {}) { st.force = Object.assign({ reach, hit }, extra); return st.force; },
  hold(reach, hit = true, extra = {}) { st.force = Object.assign({ reach, hit }, extra); addHold('debug'); return st.holds.length; },
  give(n) { S.balls += n; },
  pow(a, b) { POW_MIN = a; POW_RANGE = b; },
  road(gap, end, hw) { ROAD_GAP = gap; ROAD_END = end; if (hw) HESO_W = hw; if (arguments.length > 3) FUNNEL = arguments[3]; buildGeo(); },
  trace(power = 0.3, sec = 8) { // path of one ball, sampled every 0.1 s
    simMode = true; const p0 = st.power; st.power = power; const keep = st.balls; st.balls = []; launch(); S.balls++;
    const b = st.balls[0], out = []; let t = 0, alive = true;
    while (t < sec && alive) { for (let i = 0; i < 12 && alive; i++) { alive = stepBall(b, 1 / 120); t += 1 / 120; } out.push([Math.round(b.x), Math.round(b.y)]); }
    st.balls = keep; st.power = p0; simMode = false; return out;
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
