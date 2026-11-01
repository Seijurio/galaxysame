'use strict';

const RAMP = " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const CELL = 2.05;
const FPS = 30;
const BG = [5, 4, 4];
const TAU = Math.PI * 2;

const BALL = 1.18;
const IRIS = 0.46;
const IRIS_W = 720;
const IRIS_H = 64;
const VEIN_SIZE = 256;

const FORM_AT = 16.5;
const LOCK_AT = 17;
const ZOOM_AT = 20;
const ZOOM_TIME = 7;
const GALAXY_HOLD = 4;
const CLOUD_SIZE = 420;
const OUTRO_TIME = 8.5;
const LENS_B = 420;
const LENS_PSI = 384;
const LENS_MAX_B = 40;
const LENS_SWEEP = Math.PI * 3;
const LENS_REACH = 30;
const DISK_IN = 6;
const DISK_OUT = 16;
const MERGER_STARS = 14000;
const GALAXY_FLAT = 0.62;
const WORLD_W = 512;
const WORLD_L = 2952;
const WORLD_STEP = 2;
const WAVE_SIZE = 256;
const ENTRY_TIME = 5;
const GROUND_TIME = 112;
const CLIMB_TIME = 8;
const DISSOLVE = 1.6;

const MOODS = {
  calm: { wide: 1, squint: 0, brow: 0, pupil: 0.4, red: 0.5, droop: 0, lazy: 1, pace: 1.4, blinks: [2, 6.5] },
  alert: { wide: 1.12, squint: 0, brow: 0.08, pupil: 0.32, red: 0.4, droop: -0.05, lazy: 0.85, pace: 7, blinks: [4, 9] },
  tired: { wide: 0.7, squint: 0.1, brow: -0.02, pupil: 0.5, red: 0.95, droop: 0.2, lazy: 2.4, pace: 1, blinks: [1.2, 3.5] },
  wary: { wide: 0.78, squint: 0.8, brow: -0.06, pupil: 0.36, red: 0.5, droop: 0, lazy: 1, pace: 2.2, blinks: [3, 7] },
  dazzled: { wide: 0.92, squint: 0.25, brow: -0.02, pupil: 0.34, red: 0.7, droop: 0, lazy: 1, pace: 3, blinks: [99, 99] },
  locked: { wide: 1.14, squint: 0, brow: 0.1, pupil: 0.64, red: 0.4, droop: 0, lazy: 1, pace: 5, blinks: [99, 99] },
};
const MOOD_DECK = ['calm', 'calm', 'calm', 'alert', 'tired', 'tired', 'wary'];

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = (v, w) => Math.exp(-(v * v) / (w * w));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(0, 1, x - ix);
  const fy = smooth(0, 1, y - iy);
  return mix(
    mix(hash(ix, iy), hash(ix + 1, iy), fx),
    mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx),
    fy,
  );
}

function fbm(x, y) {
  return (noise(x, y) * 4 + noise(x * 2.1, y * 2.1) * 2 + noise(x * 4.3, y * 4.3)) / 7;
}

function lidArch(x) {
  const t = clamp((x + 1) / 2);
  return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.82)), 0.85);
}

function tone(rgb, r, g, b, k) {
  rgb[0] = mix(rgb[0], r, k);
  rgb[1] = mix(rgb[1], g, k);
  rgb[2] = mix(rgb[2], b, k);
}

function dim(rgb, k) {
  rgb[0] *= k;
  rgb[1] *= k;
  rgb[2] *= k;
}

function skinTone(rgb, l) {
  if (l < 0.5) {
    const t = l * 2;
    rgb[0] = mix(58, 196, t);
    rgb[1] = mix(24, 108, t);
    rgb[2] = mix(12, 54, t);
  } else {
    const t = (l - 0.5) * 2;
    rgb[0] = mix(196, 255, t);
    rgb[1] = mix(108, 196, t);
    rgb[2] = mix(54, 136, t);
  }
}

function irisTone(rgb, l) {
  if (l < 0.5) {
    const t = l * 2;
    rgb[0] = mix(10, 46, t);
    rgb[1] = mix(30, 122, t);
    rgb[2] = mix(92, 216, t);
  } else {
    const t = clamp((l - 0.5) * 2);
    rgb[0] = mix(46, 182, t);
    rgb[1] = mix(122, 228, t);
    rgb[2] = mix(216, 246, t);
  }
}

function bakeIris() {
  const light = new Float32Array(IRIS_W * IRIS_H);
  const teal = new Float32Array(IRIS_W * IRIS_H);
  const pupilEdge = new Float32Array(IRIS_W);
  const outerEdge = new Float32Array(IRIS_W);

  for (let u = 0; u < IRIS_W; u++) {
    const th = (u / IRIS_W) * TAU;
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    pupilEdge[u] = 1 + (noise(cos * 4 + 9, sin * 4 + 4) - 0.5) * 0.09;
    outerEdge[u] = 1 + (noise(cos * 3 + 2, sin * 3 + 7) - 0.5) * 0.05;

    const collar = 0.27 + (noise(cos * 3 + 5, sin * 3 + 1) - 0.5) * 0.16;
    for (let v = 0; v < IRIS_H; v++) {
      const t = v / (IRIS_H - 1);
      const wide = noise(cos * 26 + t * 1.4, sin * 26 - t * 1.4);
      const fine = noise(cos * 70 + t * 2, sin * 70 + t * 2);
      const crypt = noise(cos * 7 + t * 3, sin * 7 - t * 3);
      const fleck = noise(cos * 18 + 40, sin * 18 + t * 6);
      const furrow = Math.sin(t * 46 + noise(cos * 2, sin * 2) * 9) * 0.5 + 0.5;

      let l = mix(0.82, 0.4, smooth(0, 0.75, t));
      l += (wide - 0.5) * 0.75 + (fine - 0.5) * 0.4;
      l += 0.32 * gauss(t - collar, 0.06);
      if (t > collar) l -= 0.5 * smooth(0.6, 0.74, crypt) * gauss(t - 0.5, 0.28);
      l -= 0.13 * furrow * smooth(0.6, 0.85, t);
      l += 0.5 * smooth(0.78, 0.86, fleck) * (1 - t);
      l *= mix(1, 0.22, smooth(0.8, 1, t));

      light[v * IRIS_W + u] = clamp(l);
      teal[v * IRIS_W + u] = noise(cos * 4 + t * 2, sin * 4 + 20);
    }
  }
  return { light, teal, pupilEdge, outerEdge };
}

function bakeVeins() {
  const tex = new Float32Array(VEIN_SIZE * VEIN_SIZE);

  const grow = (x, y, angle, width, steps) => {
    for (; steps > 0; steps--) {
      angle += rand(-0.3, 0.3);
      x += Math.cos(angle) * 0.012;
      y += Math.sin(angle) * 0.012;
      width *= 0.994;
      const c = Math.floor(((x / 1.25) * 0.5 + 0.5) * VEIN_SIZE);
      const r = Math.floor(((y / 1.25) * 0.5 + 0.5) * VEIN_SIZE);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cc = c + dx;
          const rr = r + dy;
          if (cc >= 0 && cc < VEIN_SIZE && rr >= 0 && rr < VEIN_SIZE) {
            tex[rr * VEIN_SIZE + cc] = Math.max(tex[rr * VEIN_SIZE + cc], width);
          }
        }
      }
      if (Math.random() < 0.016 && width > 0.2) {
        grow(x, y, angle + rand(0.4, 0.9) * (Math.random() < 0.5 ? -1 : 1), width * 0.7, Math.floor(steps * 0.7));
      }
    }
  };

  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1;
    const y = rand(-0.55, 0.55);
    grow(side * 1.2, y, side > 0 ? Math.PI + rand(-0.4, 0.4) : rand(-0.4, 0.4), rand(0.45, 1), 42 + Math.floor(rand(0, 26)));
  }
  return tex;
}

function bakeSkin(x, y) {
  const ax = Math.abs(x);
  let l = 0.6 + (fbm(x * 2.4 + 7, y * 2.4 + 3) - 0.5) * 0.5;
  l += 0.16 * gauss(y + 0.5, 0.22);
  l += 0.18 * gauss(y - 0.72, 0.3);
  l += (noise(x * 22, y * 10) - 0.5) * 0.13;
  l -= 0.07 * smooth(0.68, 0.8, noise(x * 38 + 3, y * 17));

  const dist = Math.hypot(x - 1.02, y - 0.02);
  const spread = Math.atan2(y - 0.02, x - 1.02);
  const crow = Math.sin(spread * 24 + noise(x * 3, y * 3) * 5);
  l *= 1 - 0.28 * smooth(0.82, 1, crow) * smooth(0.15, 0.35, dist) * smooth(1.1, 0.5, dist) * smooth(0.95, 1.15, x);

  const fold = Math.sin((y - 0.1 * x * x) * 38 + noise(x * 3, y * 5) * 4);
  l *= 1 - 0.16 * smooth(0.78, 1, fold) * gauss(y - 0.52, 0.2) * smooth(1.3, 0.6, ax);

  l *= mix(0.5, 1, smooth(0.8, 1.6, Math.hypot(x / 1.25, y / 0.72)));
  l *= mix(0.3, 1, smooth(-1.5, -0.8, y));
  l *= mix(0.12, 1, smooth(2.1, 0.9, Math.hypot(x / 1.05, y / 0.85)));
  return clamp(l * 0.95);
}

function slopeGlyph(across, down) {
  const ratio = Math.abs(across) / (Math.abs(down) + 1e-6);
  return (ratio < 0.4 ? '|' : ratio > 3 ? '~' : across * down < 0 ? '/' : '\\').charCodeAt(0);
}

function stroke(scene, mask, x0, y0, dx, dy, curl) {
  const steps = Math.ceil(Math.hypot(dx * scene.size, (dy * scene.size) / CELL) * 1.5) + 1;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = x0 + dx * t;
    const ny = y0 + dy * t + curl * t * t;
    const col = Math.round(nx * scene.size + scene.cx);
    const row = Math.round((ny * scene.size) / CELL + scene.cy);
    if (col >= 0 && col < scene.cols && row >= 0 && row < scene.rows) {
      mask[row * scene.cols + col] = slopeGlyph((nx - px) * scene.size, ((ny - py) * scene.size) / CELL);
    }
    px = nx;
    py = ny;
  }
}

function layoutColumns(scene) {
  for (let c = 0; c < scene.cols; c++) {
    const x = (c - scene.cx) / scene.size;
    scene.X[c] = x;
    scene.arch[c] = Math.abs(x) < 1 ? lidArch(x) : 0;
    scene.slant[c] = -0.07 * x;
    scene.crease[c] = scene.slant[c] - 0.72 * Math.exp(-Math.pow((x + 0.05) / 0.95, 4));
    scene.grain[c] = noise(x * 13 + 2, 5.5);
  }
  for (let r = 0; r < scene.rows; r++) scene.Y[r] = ((r - scene.cy) * CELL) / scene.size;
}

function buildScene(cols, rows) {
  const n = cols * rows;
  const size = Math.min(cols * 0.4, rows * CELL * 0.5);
  const scene = {
    cols, rows, n, size,
    baseSize: size,
    baseCx: cols / 2,
    baseCy: rows * 0.55,
    cx: cols / 2,
    cy: rows * 0.55,
    X: new Float32Array(cols),
    Y: new Float32Array(rows),
    arch: new Float32Array(cols),
    slant: new Float32Array(cols),
    crease: new Float32Array(cols),
    grain: new Float32Array(cols),
    up: new Float32Array(cols),
    low: new Float32Array(cols),
    skin: new Float32Array(n),
    flush: new Float32Array(n),
    bruise: new Float32Array(n),
    near: new Float32Array(n),
    above: new Float32Array(n),
    jitter: new Float32Array(n),
    brow: new Uint8Array(n),
    lash: new Uint8Array(n),
    browHairs: [],
    upperLashes: [],
    lowerLashes: [],
    iris: bakeIris(),
    veins: bakeVeins(),
  };

  layoutColumns(scene);

  for (let r = 0; r < rows; r++) {
    const y = scene.Y[r];
    for (let c = 0; c < cols; c++) {
      const x = scene.X[c];
      const i = r * cols + c;
      const ring = Math.hypot(x / 1.2, y / 0.72);
      scene.skin[i] = bakeSkin(x, y);
      scene.flush[i] = gauss(ring - 1, 0.35) + 0.6 * gauss(Math.hypot(x + 1.05, y), 0.3);
      scene.bruise[i] = gauss(y - 0.52, 0.14) * smooth(1.2, 0.3, Math.abs(x));
      scene.near[i] = smooth(2.1, 1, Math.hypot(x / 1.1, y / 0.7));
      scene.above[i] = smooth(0.15, -0.25, y);
      scene.jitter[i] = (hash(c * 0.37, r * 0.71) - 0.5) * 0.07;
    }
  }

  for (let i = 0; i < 480; i++) {
    const t = hash(i, 1.3);
    const x = mix(-1.08, 1.12, t);
    const thick = mix(0.1, 0.015, smooth(0.45, 1, t)) + 0.03;
    const angle = mix(-0.15, 1.35, t) + (hash(i, 4.1) - 0.5) * 0.6;
    const len = 0.1 + hash(i, 6.2) * 0.1;
    scene.browHairs.push({
      x,
      y: -0.8 - 0.2 * (1 - Math.pow((x - 0.25) / 1.15, 2)) + (hash(i, 2.7) - 0.5) * thick * 2,
      dx: Math.sin(angle) * len,
      dy: -Math.cos(angle) * len,
    });
  }

  for (let i = 0; i < 96; i++) {
    const x = mix(-0.96, 0.98, (i + hash(i, 8.8) * 0.8) / 96);
    const clump = Math.round(x * 9) / 9;
    const len = mix(0.08, 0.17, smooth(-1, 0.5, x)) * mix(0.65, 1.2, hash(i, 9.4));
    const out = Math.sin(x * 0.85 + (hash(i, 3.3) - 0.5) * 0.3);
    scene.upperLashes.push({
      x,
      dx: out * len + (clump - x) * 0.55,
      dy: -Math.sqrt(1 - out * out) * len,
    });
  }

  for (let i = 0; i < 38; i++) {
    const x = mix(-0.7, 0.95, hash(i, 5.1));
    scene.lowerLashes.push({ x, dx: x * 0.05, dy: mix(0.04, 0.085, hash(i, 7.7)) });
  }
  return scene;
}

function createFrame(n) {
  return {
    ch: new Uint8Array(n),
    r: new Uint8Array(n),
    g: new Uint8Array(n),
    b: new Uint8Array(n),
    backR: new Uint8Array(n),
    backG: new Uint8Array(n),
    backB: new Uint8Array(n),
  };
}

function createEye() {
  return {
    t: 0,
    x: 0, y: 0, vx: 0, vy: 0,
    lookX: 0, lookY: 0,
    focusX: 0, focusY: 0,
    lid: 1, lidSpeed: 0,
    closing: 0, depth: 1, lazy: 1,
    wide: 1, squint: 0, brow: 0, red: 0.5,
    pupil: 0.4,
    fresh: 0,
    zoom: 1,
    ember: 0,
    portal: false,
    mood: MOODS.calm,
    nextLook: 1, nextFocus: 3, nextMood: 8, nextBlink: 2.5,
  };
}

function blink(eye, depth) {
  eye.lazy = eye.mood.lazy;
  eye.closing = rand(0.07, 0.11) * eye.lazy;
  eye.depth = depth;
}

function lockEye(eye) {
  eye.mood = MOODS.locked;
  eye.lookX = eye.focusX = 0;
  eye.lookY = eye.focusY = 0;
  eye.nextLook = eye.nextFocus = eye.nextMood = eye.nextBlink = Infinity;
}

function updateEye(eye, dt) {
  eye.t += dt;
  const t = eye.t;
  const mood = eye.mood;

  if (t > eye.nextMood) {
    eye.mood = MOODS[MOOD_DECK[Math.floor(Math.random() * MOOD_DECK.length)]];
    eye.nextMood = t + rand(5, 14);
  }

  if (t > eye.nextFocus) {
    const home = Math.random() < 0.4;
    eye.focusX = home ? 0 : rand(-0.9, 0.9);
    eye.focusY = home ? 0 : rand(-0.55, 0.55);
    eye.nextFocus = t + rand(1.5, 6);
  }

  if (t > eye.nextLook) {
    const x = clamp(eye.focusX + rand(-0.12, 0.12), -1, 1);
    const y = clamp(eye.focusY + mood.droop + rand(-0.1, 0.1), -0.7, 0.7);
    if (Math.hypot(x - eye.lookX, y - eye.lookY) > 0.7 && Math.random() < 0.4 && eye.closing <= 0) blink(eye, 1);
    eye.lookX = x;
    eye.lookY = y;
    eye.nextLook = t + 0.15 + Math.random() * Math.random() * 1.4;
  }

  const driftX = (noise(t * 0.5, 1.5) - 0.5) * 0.07 + (noise(t * 9, 2.5) - 0.5) * 0.012;
  const driftY = (noise(t * 0.4, 6.5) - 0.5) * 0.06 + (noise(t * 9, 7.5) - 0.5) * 0.012;

  if (t > eye.nextBlink && eye.closing <= 0) {
    blink(eye, Math.random() < 0.18 ? rand(0.55, 0.85) : 1);
    eye.nextBlink = t + rand(mood.blinks[0], mood.blinks[1]);
  }

  const wasClosing = eye.closing > 0;
  eye.closing -= dt;
  if (wasClosing && eye.closing <= 0) {
    eye.fresh = 1;
    eye.pupil = Math.min(eye.pupil + 0.06 * eye.depth, 0.58);
    if (Math.random() < 0.12) eye.nextBlink = t + 0.16;
  }

  const shutting = eye.closing > 0;
  const lidGoal = shutting ? 1 - eye.depth : 1;
  const lidStiff = (shutting ? 1400 : 170) / eye.lazy;
  const lidDamp = (shutting ? 56 : 20) / Math.sqrt(eye.lazy);
  const h = dt / 4;
  for (let i = 0; i < 4; i++) {
    eye.vx += (1100 * (eye.lookX + driftX - eye.x) - 54 * eye.vx) * h;
    eye.vy += (1100 * (eye.lookY + driftY - eye.y) - 54 * eye.vy) * h;
    eye.x += eye.vx * h;
    eye.y += eye.vy * h;
    eye.lidSpeed += (lidStiff * (lidGoal - eye.lid) - lidDamp * eye.lidSpeed) * h;
    eye.lid += eye.lidSpeed * h;
  }
  eye.lid = clamp(eye.lid, 0, 1.08);

  const ease = 1 - Math.exp(-dt * mood.pace);
  eye.wide += (mood.wide - eye.wide) * ease;
  eye.squint += (mood.squint - eye.squint) * ease;
  eye.brow += (mood.brow - eye.brow) * ease;
  eye.red += (mood.red - eye.red) * ease;

  const pupilGoal = mood.pupil + (noise(t * 0.35, 3.5) - 0.5) * 0.1 + (noise(t * 1.4, 8.5) - 0.5) * 0.03;
  eye.pupil += (pupilGoal - eye.pupil) * (1 - Math.exp(-dt * 2.5));
  eye.fresh *= Math.exp(-dt * 2.2);
}

function drawHair(scene, eye) {
  scene.lash.fill(0);
  scene.brow.fill(0);

  const lift = eye.brow - (1 - eye.lid) * 0.03 + Math.sin(eye.t * 1.15) * 0.003;
  for (const hair of scene.browHairs) {
    stroke(scene, scene.brow, hair.x + eye.x * 0.012, hair.y - lift, hair.dx, hair.dy, 0.03);
  }

  const fold = mix(-0.65, 1, clamp(eye.lid));
  const swing = clamp(eye.lidSpeed * 0.012, -0.08, 0.08);
  for (const lash of scene.upperLashes) {
    const c = clamp(Math.round(lash.x * scene.size + scene.cx), 0, scene.cols - 1);
    stroke(scene, scene.lash, lash.x, scene.up[c], lash.dx, lash.dy * fold, 0.05 * fold + swing);
  }
  for (const lash of scene.lowerLashes) {
    const c = clamp(Math.round(lash.x * scene.size + scene.cx), 0, scene.cols - 1);
    stroke(scene, scene.lash, lash.x, scene.low[c] + 0.04, lash.dx, lash.dy, 0.01);
  }
}

function skinAt(scene, c, r) {
  const col = clamp(c, 0, scene.cols - 1.001);
  const row = clamp(r, 0, scene.rows - 1.001);
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const fc = col - c0;
  const fr = row - r0;
  const i = r0 * scene.cols + c0;
  const below = r0 + 1 < scene.rows ? i + scene.cols : i;
  const nextC = c0 + 1 < scene.cols ? 1 : 0;
  return mix(
    mix(scene.skin[i], scene.skin[i + nextC], fc),
    mix(scene.skin[below], scene.skin[below + nextC], fc),
    fr,
  );
}

function sampleIris(iris, theta, t, rgb) {
  const u = Math.floor((((theta / TAU) % 1) + 1) % 1 * IRIS_W) % IRIS_W;
  const v = Math.floor(clamp(t) * (IRIS_H - 1));
  const l = iris.light[v * IRIS_W + u];
  const teal = iris.teal[v * IRIS_W + u] - 0.5;
  irisTone(rgb, l);
  rgb[0] -= teal * 22;
  rgb[1] += teal * 34;
  return l;
}

const sclera = [0, 0, 0];
const irisColor = [0, 0, 0];

function shadeEye(scene, eye, look, x, y, c, rgb) {
  const fromLid = y - scene.up[c];
  const z = Math.sqrt(Math.max(BALL * BALL - x * x - y * y, 0.01));
  const ex = x * look.cosYaw - z * look.sinYaw;
  const ez = x * look.sinYaw + z * look.cosYaw;
  const ey = y * look.cosPitch - ez * look.sinPitch;
  const theta = Math.atan2(ey, ex);
  const u = Math.floor((((theta / TAU) % 1) + 1) % 1 * IRIS_W) % IRIS_W;
  const rad = Math.hypot(ex, ey) / (IRIS * scene.iris.outerEdge[u]);
  const blend = smooth(1.05, 0.95, rad);
  let v = 0;

  if (blend < 1) {
    const shade = 0.42 + 0.58 * Math.pow(z / BALL, 1.4);
    const corner = smooth(0.55, 1, Math.abs(x)) * 0.55;
    sclera[0] = mix(250, 238, corner) * shade;
    sclera[1] = mix(242, 168, corner) * shade;
    sclera[2] = mix(230, 146, corner) * shade;

    const vc = Math.floor(((ex / 1.25) * 0.5 + 0.5) * VEIN_SIZE);
    const vr = Math.floor(((ey / 1.25) * 0.5 + 0.5) * VEIN_SIZE);
    if (vc >= 0 && vc < VEIN_SIZE && vr >= 0 && vr < VEIN_SIZE) {
      const vein = scene.veins[vr * VEIN_SIZE + vc] * (0.45 + eye.red);
      sclera[1] -= 105 * vein * shade;
      sclera[2] -= 105 * vein * shade;
    }

    dim(sclera, 1 - smooth(1.2, 1, rad) * 0.38);
    v = 0.84 * shade * (1 - smooth(1.2, 1, rad) * 0.38);

    const pink = smooth(-0.8, -0.93, x + (noise(y * 16, 4.5) - 0.5) * 0.04);
    if (pink > 0) {
      tone(sclera, 214, 108, 98, pink);
      v = mix(v, 0.46, pink);
    }
  }

  if (blend > 0) {
    const pupil = eye.pupil * scene.iris.pupilEdge[u];
    let lit;
    if (rad < pupil) {
      if (eye.portal) return -1;
      const edge = rad / pupil;
      irisColor[0] = mix(14, 6, edge);
      irisColor[1] = mix(70, 34, edge);
      irisColor[2] = mix(225, 150, edge);
      lit = 0.06;
    } else {
      lit = sampleIris(scene.iris, theta, (rad - pupil) / (1 - pupil), irisColor) * 0.95;
      if (eye.ember > 0) tone(irisColor, 255, 150, 60, eye.ember * 0.75);
    }
    v = mix(v, lit, blend);
  }

  if (blend <= 0) {
    rgb[0] = sclera[0];
    rgb[1] = sclera[1];
    rgb[2] = sclera[2];
  } else if (blend >= 1) {
    rgb[0] = irisColor[0];
    rgb[1] = irisColor[1];
    rgb[2] = irisColor[2];
  } else {
    rgb[0] = mix(sclera[0], irisColor[0], blend);
    rgb[1] = mix(sclera[1], irisColor[1], blend);
    rgb[2] = mix(sclera[2], irisColor[2], blend);
  }

  const shadow = 1 - (0.42 + 0.26 * scene.grain[c]) * Math.exp(-fromLid / 0.09);
  dim(rgb, shadow);
  v *= shadow;

  const hx = x - (look.irisX * 0.35 - 0.15);
  const hy = y - (look.irisY * 0.35 - 0.16);
  if (Math.abs(hx) < 0.42 && Math.abs(hy) < 0.42) {
    const wobble = (noise(x * 9 + eye.t * 0.4, y * 9) - 0.5) * (0.04 + eye.fresh * 0.1);
    const window = Math.max(Math.abs(hx) / 0.085, Math.abs(hy + hx * hx * 1.2 + wobble) / 0.1);
    const small = gauss(hx - 0.26, 0.03) * gauss(hy - 0.26, 0.035) * 0.55;
    const shine = clamp(smooth(1.25, 0.75, window) + small) * smooth(0.02, 0.12, fromLid);
    tone(rgb, 255, 255, 255, shine);
    v = mix(v, 1, shine);
  }

  const wet = smooth(0.04, 0.008, scene.low[c] - y);
  if (wet > 0) {
    const glint = smooth(0.62, 0.74, noise(x * 7, eye.t * 0.25));
    tone(rgb, mix(222, 255, glint), mix(142, 240, glint), mix(124, 235, glint), wet * mix(0.6, 0.9, glint));
    v = mix(v, 0.9, wet * glint);
  }
  return v;
}

function shadeSkin(scene, eye, look, x, y, c, i, rgb) {
  const { up, low, arch } = scene;
  const ax = Math.abs(x);
  const col = x * scene.baseSize + scene.baseCx;
  const row = (y * scene.baseSize) / CELL + scene.baseCy;
  const baked = clamp(Math.round(row), 0, scene.rows - 1) * scene.cols + clamp(Math.round(col), 0, scene.cols - 1);
  const near = scene.near[baked];
  let l = scene.skin[baked];
  let flush = scene.flush[baked];

  if (near > 0.01) {
    const above = scene.above[baked];
    const shut = 1 - eye.lid;
    const breath = Math.sin(eye.t * 1.15) * 0.004;
    const shiftX = near * eye.x * 0.03;
    const shiftY = near * (eye.y * 0.035 + breath)
      + near * above * (0.1 * shut - eye.brow * 0.6)
      - near * (1 - above) * (eye.squint * 0.07 + 0.02 * shut);
    l = skinAt(scene, col - shiftX * scene.baseSize, row - (shiftY * scene.baseSize) / CELL);
  }

  if (ax < 1.45 && y > -0.9 && y < 0.8) {
    const fade = smooth(1.45, 1, ax);
    const crease = scene.crease[c] + 0.13 * (1 - eye.lid) * arch[c] - (eye.wide - 1) * 0.3 * arch[c];
    l *= 1 - 0.68 * fade * gauss(y - crease, 0.05);
    l *= 1 - 0.22 * fade * gauss(y - crease + 0.09, 0.03);

    if (ax < 1 && y > crease && y < up[c]) {
      const t = clamp((y - crease) / Math.max(up[c] - crease, 0.01));
      const swell = Math.sin(Math.PI * t);
      l *= 1 + swell * (1.1 + 0.55 * gauss(x - look.irisX, 0.36));
      flush += 0.5 * swell;
    }

    if (ax < 1.04) {
      l *= 1 - 0.94 * smooth(0.075 + scene.grain[c] * 0.02, 0.02, Math.abs(y - up[c]));
      const under = y - low[c];
      if (under > 0) {
        l *= 1 - (0.24 + 0.34 * eye.squint) * fade * gauss(under - 0.23 + 0.08 * eye.squint, 0.08);
        l *= 1 - 0.12 * fade * gauss(under - 0.36, 0.05);
      }
    }
  }

  l = clamp(l);
  skinTone(rgb, l);
  rgb[0] += flush * 24 * l;
  rgb[1] -= flush * 16 * l;
  rgb[2] -= flush * 8 * l;
  rgb[0] -= scene.bruise[baked] * 16;
  rgb[2] += scene.bruise[baked] * 13;

  if (ax < 1.03 && y >= low[c] && y < low[c] + 0.04) tone(rgb, 206, 122, 100, 0.85);
  return l * 0.72;
}

function clearBack(frame, i) {
  frame.backR[i] = frame.backG[i] = frame.backB[i] = 0;
}

function put(scene, frame, i, rgb, v) {
  clearBack(frame, i);
  const idx = clamp(0.3 + 0.7 * v + scene.jitter[i]) * (RAMP.length - 1);
  frame.ch[i] = RAMP.charCodeAt(Math.round(idx));
  frame.r[i] = clamp(rgb[0], 0, 255);
  frame.g[i] = clamp(rgb[1], 0, 255);
  frame.b[i] = clamp(rgb[2], 0, 255);
}

const rgb = [0, 0, 0];

function aim(scene, zoom, x, y) {
  const center = smooth(1, 2.5, zoom);
  const screenX = mix(x * scene.baseSize + scene.baseCx, scene.cols / 2, center);
  const screenY = mix((y * scene.baseSize) / CELL + scene.baseCy, scene.rows / 2, center);
  scene.size = scene.baseSize * zoom;
  scene.cx = screenX - x * scene.size;
  scene.cy = screenY - (y * scene.size) / CELL;
  layoutColumns(scene);
}

function resetView(scene) {
  scene.size = scene.baseSize;
  scene.cx = scene.baseCx;
  scene.cy = scene.baseCy;
  layoutColumns(scene);
}

function diveDepth(scene, eye) {
  const reach = Math.hypot(scene.cols / 2, (scene.rows * CELL) / 2);
  return (1.25 * reach) / (IRIS * eye.pupil * scene.baseSize);
}

function irisSpot(eye) {
  const y = eye.y + 0.3 * (1 - clamp(eye.lid));
  return [BALL * Math.sin(eye.x * 0.4), BALL * Math.sin(y * 0.27)];
}

function drawFrame(scene, eye, frame) {
  const { cols, rows, X, Y, up, low, arch, slant, grain } = scene;
  const gazeY = eye.y + 0.3 * (1 - clamp(eye.lid));
  const yaw = eye.x * 0.4;
  const pitch = gazeY * 0.27;
  const look = {
    cosYaw: Math.cos(yaw),
    sinYaw: Math.sin(yaw),
    cosPitch: Math.cos(pitch),
    sinPitch: Math.sin(pitch),
    irisX: BALL * Math.sin(yaw),
    irisY: BALL * Math.sin(pitch),
  };

  if (eye.zoom > 1) aim(scene, eye.zoom, look.irisX, look.irisY);

  for (let c = 0; c < cols; c++) {
    const h = arch[c];
    const edge = (grain[c] - 0.5) * 0.02 * h;
    const bulge = gauss(X[c] - look.irisX, 0.42) * 0.035 * h;
    const top = slant[c] - (0.5 - 0.1 * eye.y) * eye.wide * h - bulge + edge;
    low[c] = slant[c] + (0.3 + 0.04 * eye.y - 0.05 * eye.squint - 0.04 * (1 - eye.lid)) * h - edge;
    up[c] = mix(low[c] + 0.01, top, eye.lid);
  }
  drawHair(scene, eye);

  for (let r = 0; r < rows; r++) {
    const y = Y[r];
    for (let c = 0; c < cols; c++) {
      const x = X[c];
      const i = r * cols + c;

      if (scene.lash[i]) {
        clearBack(frame, i);
        frame.ch[i] = scene.lash[i];
        frame.r[i] = 30;
        frame.g[i] = 15;
        frame.b[i] = 12;
      } else if (Math.abs(x) < 1 && y > up[c] && y < low[c]) {
        const v = shadeEye(scene, eye, look, x, y, c, rgb);
        if (v >= 0) put(scene, frame, i, rgb, v);
      } else {
        const v = shadeSkin(scene, eye, look, x, y, c, i, rgb);
        if (scene.brow[i]) {
          tone(rgb, 44, 22, 16, 0.72 + hash(i, 3.1) * 0.2);
          clearBack(frame, i);
          frame.ch[i] = scene.brow[i];
          frame.r[i] = rgb[0];
          frame.g[i] = rgb[1];
          frame.b[i] = rgb[2];
        } else {
          put(scene, frame, i, rgb, v);
        }
      }
    }
  }
}

function encodeFrame(scene, frame, prev) {
  const { cols, n } = scene;
  const out = ['\x1b[?2026h'];
  let cursor = -1;
  let color = -1;
  let backing = -1;
  for (let i = 0; i < n; i++) {
    const back = (frame.backR[i] >> 4) << 8 | (frame.backG[i] >> 4) << 4 | frame.backB[i] >> 4;
    const fine = back ? 224 : 248;
    const packed = ((frame.r[i] & fine) >> 3) << 10 | ((frame.g[i] & fine) >> 3) << 5 | (frame.b[i] & fine) >> 3;
    const key = (frame.ch[i] * 32768 + packed) * 4096 + back;
    if (key === prev[i]) continue;
    prev[i] = key;
    if (cursor !== i || i % cols === 0) {
      out.push(`\x1b[${Math.floor(i / cols) + 1};${i % cols + 1}H`);
    }
    if (back !== backing) {
      backing = back;
      const tone = back ? [(frame.backR[i] & 240) + 8, (frame.backG[i] & 240) + 8, (frame.backB[i] & 240) + 8] : BG;
      out.push(`\x1b[48;2;${tone.join(';')}m`);
    }
    if (packed !== color) {
      color = packed;
      out.push(`\x1b[38;2;${frame.r[i] & fine};${frame.g[i] & fine};${frame.b[i] & fine}m`);
    }
    out.push(String.fromCharCode(frame.ch[i]));
    cursor = i + 1;
  }
  out.push('\x1b[?2026l');
  return out.join('');
}

function sunSurface(lat, lon, f, out) {
  const large = fbm(lon * 4 + f * 0.12, lat * 5 - f * 0.08);
  const grain = noise(lon * 24 + f * 0.5, lat * 24);
  const fine = noise(lon * 80 - f, lat * 80 + f * 0.7);
  const heat = smooth(0.32, 0.68, large * 0.7 + grain * 0.3 + (fine - 0.5) * 0.25);
  out[0] = mix(205, 255, heat);
  out[1] = mix(62, 236, heat);
  out[2] = mix(8, 136, heat * heat);
  const spot = smooth(0.66, 0.74, fbm(lon * 2.5 + 7, lat * 6 + 2)) * gauss(Math.abs(lat) - 0.35, 0.25);
  tone(out, 70, 22, 8, spot * 0.9);
}

function mercurySurface(lat, lon, t, out) {
  const rock = fbm(lon * 3 + 5, lat * 4 + 2);
  const pit = smooth(0.66, 0.74, noise(lon * 8, lat * 9));
  const grey = mix(92, 196, rock) * (1 - pit * 0.45);
  out[0] = grey;
  out[1] = grey * 0.92;
  out[2] = grey * 0.84;
}

function venusSurface(lat, lon, t, out) {
  const veil = fbm(lon * 1.6 + lat * 2.4 + t * 0.04, lat * 5 + 3);
  out[0] = mix(206, 252, veil);
  out[1] = mix(150, 224, veil);
  out[2] = mix(78, 150, veil);
}

function earthSurface(lat, lon, t, out) {
  const land = fbm(lon * 1.7 + 9, lat * 2.6 + 2);
  if (land > 0.55) {
    const dry = smooth(0.2, 0.7, 1 - Math.abs(Math.abs(lat) - 0.4) * 2);
    out[0] = mix(50, 190, dry);
    out[1] = mix(116, 156, dry);
    out[2] = mix(52, 88, dry);
  } else {
    out[0] = 10;
    out[1] = mix(60, 120, land);
    out[2] = mix(170, 240, land);
  }
  tone(out, 238, 246, 255, smooth(1.12, 1.3, Math.abs(lat) + (noise(lon * 4, 3.5) - 0.5) * 0.2));
  tone(out, 250, 250, 252, smooth(0.56, 0.7, fbm(lon * 2.4 + t * 0.05, lat * 5 + 8)) * 0.9);
}

function earthNight(lat, lon, f, dark, out) {
  const land = fbm(lon * 1.7 + 9, lat * 2.6 + 2);
  if (land > 0.55 && Math.abs(lat) < 1 && hash(Math.floor(lon * 36), Math.floor(lat * 36)) > 0.8) {
    tone(out, 255, 186, 90, dark * 0.85);
  }
  const ripple = (noise(lon * 6 + f * 0.4, 4.5) - 0.5) * 0.14;
  const aurora = gauss(Math.abs(lat) - 1.12 + ripple, 0.08) * (0.6 + 0.8 * noise(lon * 16 - f * 0.9, 9.5));
  out[0] += 40 * aurora * dark;
  out[1] += 240 * aurora * dark;
  out[2] += 130 * aurora * dark;
}

function marsSurface(lat, lon, t, out) {
  const land = fbm(lon * 2.2 + 3, lat * 3 + 1);
  out[0] = mix(128, 238, land);
  out[1] = mix(52, 142, land);
  out[2] = mix(30, 86, land);
  tone(out, 244, 232, 226, smooth(1.2, 1.36, Math.abs(lat) + (noise(lon * 3, 2.5) - 0.5) * 0.18));
}

function jupiterSurface(lat, lon, t, out) {
  const y = lat + (noise(lon * 3, lat * 9) - 0.5) * 0.09;
  const band = smooth(-0.5, 0.5, Math.sin(y * 14));
  const fine = noise(lon * 1.5, y * 34);
  out[0] = mix(148, 240, band);
  out[1] = mix(90, 216, band);
  out[2] = mix(62, 176, band);
  dim(out, 0.78 + fine * 0.3);
  const around = (((lon % TAU) + TAU) % TAU) - Math.PI;
  tone(out, 204, 80, 52, gauss(lat - 0.36, 0.1) * gauss(around, 0.26));
}

function saturnSurface(lat, lon, t, out) {
  const band = Math.sin(lat * 10 + (noise(lon, lat * 6) - 0.5) * 0.5) * 0.5 + 0.5;
  out[0] = mix(190, 240, band);
  out[1] = mix(150, 214, band);
  out[2] = mix(96, 150, band);
}

function uranusSurface(lat, lon, t, out) {
  const band = Math.sin(lat * 5) * 0.5 + 0.5;
  out[0] = mix(138, 176, band);
  out[1] = mix(214, 236, band);
  out[2] = mix(222, 240, band);
}

function neptuneSurface(lat, lon, t, out) {
  const band = Math.sin(lat * 6 + noise(lon * 1.5, lat * 4)) * 0.5 + 0.5;
  out[0] = mix(22, 62, band);
  out[1] = mix(70, 132, band);
  out[2] = mix(190, 246, band);
  tone(out, 236, 246, 255, smooth(0.62, 0.74, noise(lon * 3 + t * 0.2, lat * 12)) * 0.75);
}

function moonSurface(lat, lon, t, out) {
  const sea = smooth(0.44, 0.56, fbm(lon * 1.3 + 20, lat * 2 + 4));
  const pit = smooth(0.68, 0.76, noise(lon * 9 + 3, lat * 10));
  const dust = noise(lon * 14, lat * 15) * 26;
  const grey = (mix(92, 206, sea) + dust) * (1 - pit * 0.35);
  out[0] = grey;
  out[1] = grey * 0.97;
  out[2] = grey * 0.93;
}

const STAGES = {
  disk: [16, 11],
  cluster: [26, 12],
  hole: [37, 18],
  binary: [54, 11],
  pulsar: [64, 11],
  planetary: [73, 12],
  nova: [84, 12],
  merger: [95, 16],
  bang: [111, 24],
  comet: [142, 11],
  eclipse: [307, 9],
};
const WARPS = [6, 25.5, 54, 64, 74, 84, 95];
const SUN_AT = 136;
const BELT_AT = 174.5;
const BELT_TIME = 6;
const EARTH_AT = 182;
const GROUND_AT = EARTH_AT + ENTRY_TIME;
const CLIMB_AT = GROUND_AT + GROUND_TIME;
const JOURNEY_END = 332;

const ORBITS = [
  { at: 37, span: 18, turn: -1.5 },
  { at: 150, span: 18, turn: -1.8 },
];
const SWINGS = [[25.5, 0.8], [53.5, 0.9], [63.5, -0.8], [73.5, 0.7], [83.5, -0.9], [135.5, 0.8]];

const JOURNEY = [
  { surface: neptuneSurface, at: 136, span: 10, size: 0.42, side: 1, lift: -0.14, tilt: 0.49, spin: 0.14, reach: 1.1, halo: [80, 150, 255], haloWidth: 0.05 },
  { surface: uranusSurface, at: 142, span: 10, size: 0.4, side: -1, lift: 0.12, tilt: 1.71, spin: 0.1, reach: 1.1, halo: [150, 225, 235], haloWidth: 0.05 },
  { surface: saturnSurface, at: 148, span: 20, size: 0.36, side: 1, lift: -0.1, tilt: -0.34, spin: 0.2, reach: 2.4, rings: true, open: 0.24, sling: true, ambient: 0.14 },
  {
    surface: jupiterSurface, at: 166, span: 11, size: 0.66, side: -1, lift: 0.16, tilt: 0.05, spin: 0.22, reach: 1,
    moons: [
      { orbit: 1.5, size: 0.05, speed: 1.3, phase: 0.4, tint: [236, 208, 120] },
      { orbit: 1.9, size: 0.045, speed: 0.9, phase: 2.2, tint: [226, 220, 208] },
      { orbit: 2.5, size: 0.075, speed: 0.6, phase: 4.1, tint: [176, 160, 142] },
      { orbit: 3.4, size: 0.07, speed: 0.4, phase: 5.3, tint: [120, 108, 98] },
    ],
  },
  { surface: marsSurface, at: 175, span: 9, size: 0.3, side: 1, lift: 0.14, tilt: 0.44, spin: 0.14, reach: 1 },
  { surface: venusSurface, at: 314, span: 9, size: 0.38, side: 1, lift: -0.12, tilt: 0.05, spin: 0.05, reach: 1.1, halo: [250, 210, 140], haloWidth: 0.05 },
  { surface: mercurySurface, at: 319, span: 8.5, size: 0.24, side: -1, lift: 0.1, tilt: 0.03, spin: 0.08, reach: 1 },
];
const EARTH = { surface: earthSurface, night: earthNight, tilt: 0.41, spin: 0.14, reach: 1.1, halo: [110, 180, 255], haloWidth: 0.06 };
const EARTH_LIMB = { ...EARTH, reach: 1.04, haloWidth: 0.016 };
const MOON = { surface: moonSurface, tilt: 0.1, spin: 0.05, reach: 1, ambient: 0.1 };

const flyZ = (n, from = 10) => Math.max(from * (1 - n) * (1 - n), 0.02);
const stageOf = (f, [at, span]) => (f - at) / span;

function orbitAngle(orbit, f) {
  return orbit.turn * smooth(orbit.at, orbit.at + orbit.span, f);
}

function heading(f) {
  let total = 0;
  for (const orbit of ORBITS) total += orbitAngle(orbit, f);
  for (const [at, angle] of SWINGS) total += angle * smooth(at - 2, at + 2, f);
  return total;
}

function banking(f) {
  let total = 0;
  for (const [at, angle] of SWINGS) total += angle * 0.3 * gauss(f - at, 1.7);
  return total;
}

function sling(n, hold, far, edge) {
  const s = 2 * n - 1;
  const away = s * s;
  return { s, away, z: hold + (far - hold) * away * away, x: s * (0.22 + away) * edge * 1.5 };
}

function cloudIndex(x, y) {
  let a = x - 2 * Math.floor(x / 2);
  let b = y - 2 * Math.floor(y / 2);
  if (a > 1) a = 2 - a;
  if (b > 1) b = 2 - b;
  return Math.min(CLOUD_SIZE - 1, Math.floor(b * CLOUD_SIZE)) * CLOUD_SIZE + Math.min(CLOUD_SIZE - 1, Math.floor(a * CLOUD_SIZE));
}

function roche(x, y) {
  return -0.45 / Math.hypot(x + 0.55, y) - 0.55 / Math.hypot(x - 0.45, y) - 0.5 * (x * x + y * y);
}

const L1 = (() => {
  let best = { x: 0, phi: -Infinity };
  for (let x = -0.4; x < 0.3; x += 0.002) {
    const phi = roche(x, 0);
    if (phi > best.phi) best = { x, phi };
  }
  return best;
})();

let lensing = null;

function bakeLensing() {
  if (lensing) return lensing;
  const orbit = new Float32Array(LENS_B * LENS_PSI);
  const sweep = new Float32Array(LENS_B);
  const h = LENS_SWEEP / (LENS_PSI - 1);
  const accel = (u) => 3 * u * u - u;

  for (let ib = 0; ib < LENS_B; ib++) {
    const b = ((ib + 0.5) / LENS_B) * LENS_MAX_B;
    let u = 0;
    let du = 1 / b;
    let ip = 0;
    sweep[ib] = LENS_SWEEP;
    for (; ip < LENS_PSI; ip++) {
      orbit[ib * LENS_PSI + ip] = u;
      const k1 = du;
      const l1 = accel(u);
      const k2 = du + (h / 2) * l1;
      const l2 = accel(u + (h / 2) * k1);
      const k3 = du + (h / 2) * l2;
      const l3 = accel(u + (h / 2) * k2);
      const k4 = du + h * l3;
      const l4 = accel(u + h * k3);
      u += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      du += (h / 6) * (l1 + 2 * l2 + 2 * l3 + l4);
      if (u >= 0.5) {
        sweep[ib] = -1;
        orbit.fill(1, ib * LENS_PSI + ip + 1, (ib + 1) * LENS_PSI);
        break;
      }
      if (u <= 0) {
        sweep[ib] = ip * h;
        break;
      }
    }
  }
  lensing = { orbit, sweep, h };
  return lensing;
}

let clouds = null;

function bakeClouds() {
  if (clouds) return clouds;
  const density = new Float32Array(CLOUD_SIZE * CLOUD_SIZE);
  const hue = new Float32Array(CLOUD_SIZE * CLOUD_SIZE);
  const lane = new Float32Array(CLOUD_SIZE * CLOUD_SIZE);
  const mottle = new Float32Array(CLOUD_SIZE * CLOUD_SIZE);
  const web = new Float32Array(CLOUD_SIZE * CLOUD_SIZE);
  for (let r = 0; r < CLOUD_SIZE; r++) {
    for (let c = 0; c < CLOUD_SIZE; c++) {
      const x = (c / CLOUD_SIZE) * 5;
      const y = (r / CLOUD_SIZE) * 5;
      const bendX = fbm(x + 3, y + 8);
      const bendY = fbm(x + 12, y + 1);
      const i = r * CLOUD_SIZE + c;
      density[i] = smooth(0.3, 0.62, fbm(x + bendX * 2.4, y + bendY * 2.4));
      hue[i] = fbm(x * 0.6 + bendY * 1.6 + 30, y * 0.6 + 40);
      lane[i] = smooth(0.54, 0.7, fbm(x * 1.7 + bendY * 3 + 50, y * 1.7 - bendX * 3));
      const turnA = x * 0.8 - y * 0.6;
      const turnB = x * 0.6 + y * 0.8;
      mottle[i] = fbm(turnA * 8 + 70 + bendX, turnB * 8 + 11 + bendY) * 0.6 + fbm(turnB * 15 + 3, 9 - turnA * 15) * 0.4;
      const strand = 1 - Math.abs(2 * fbm(x * 1.2 + bendX + 90, y * 1.2 + bendY + 60) - 1);
      const crossing = 1 - Math.abs(2 * fbm(x * 1.2 - bendY + 20, y * 1.2 + bendX + 80) - 1);
      web[i] = Math.pow(strand, 7) + Math.pow(crossing, 7) * 0.7 + 1.6 * Math.pow(strand * crossing, 10);
    }
  }
  clouds = { density, hue, lane, mottle, web };
  return clouds;
}

function buildSpace(cols, rows) {
  const n = cols * rows;
  const unit = Math.min(cols, rows * CELL) / 2;
  const count = Math.min(60000, n * 3);
  const space = {
    cols, rows, n, unit,
    edge: cols / (2 * unit),
    red: new Float32Array(n),
    green: new Float32Array(n),
    blue: new Float32Array(n),
    speck: new Float32Array(n),
    backR: new Float32Array(n),
    backG: new Float32Array(n),
    backB: new Float32Array(n),
    backM: new Uint8Array(n),
    mark: new Uint8Array(n),
    clouds: bakeClouds(),
    lens: bakeLensing(),
    world: bakeWorld(),
    waves: bakeWaves(),
    skyline: new Int16Array(cols),
    depth: new Float32Array(n),
    other: createFrame(n),
    merger: null,
    fill: 1.2 * Math.hypot(cols / (2 * unit), (rows * CELL) / (2 * unit)),
    swarm: [],
    stars: [],
    rocks: [],
    count,
    radius: new Float32Array(count),
    angle: new Float32Array(count),
    height: new Float32Array(count),
    orbit: new Float32Array(count),
    seed: new Float32Array(count),
    tintR: new Float32Array(count),
    tintG: new Float32Array(count),
    tintB: new Float32Array(count),
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      space.speck[i] = (hash(c * 0.61, r * 0.43) - 0.5) * 0.14;
    }
  }

  const starCount = Math.min(900, Math.round(n / 22));
  for (let i = 0; i < starCount; i++) {
    const star = { x: 0, y: 0, z: 0, wasX: 0, wasY: 0, warm: Math.random() };
    resetStar(star, rand(0.05, 1));
    space.stars.push(star);
  }

  for (let i = 0; i < 14000; i++) {
    const spread = Math.min(0.9 / Math.sqrt(Math.pow(rand(0.001, 1), -2 / 3) - 1 + 1e-3), 3);
    const rise = rand(-1, 1);
    const flat = Math.sqrt(1 - rise * rise);
    const turn = rand(0, TAU);
    const kind = Math.random();
    space.swarm.push({
      x: Math.cos(turn) * flat * spread,
      y: rise * spread,
      z: Math.sin(turn) * flat * spread,
      r: kind < 0.1 ? 255 : kind < 0.16 ? 170 : 255,
      g: kind < 0.1 ? 150 : kind < 0.16 ? 200 : 226,
      b: kind < 0.1 ? 90 : kind < 0.16 ? 255 : 170,
    });
  }

  for (let i = 0; i < 90; i++) {
    space.rocks.push({ x: rand(-2.2, 2.2), y: rand(-1.4, 1.4), z: rand(0.2, 5), size: rand(0.03, 0.11), shade: rand(0.6, 1) });
  }

  for (let i = 0; i < count; i++) {
    const bulge = i % 7 === 0;
    const dust = i % 4 === 1;
    const radius = bulge ? Math.pow(Math.random(), 2.2) * 0.26 + 0.005 : Math.pow(Math.random(), 1.4) * 1.1 + 0.05;
    const arm = (i % 2) * Math.PI;
    const scatter = (Math.random() + Math.random() - 1) * (0.16 + 0.24 * radius);
    space.radius[i] = radius;
    space.angle[i] = bulge || dust ? rand(0, TAU) : arm + Math.log(radius + 0.06) * 2.2 + scatter;
    space.height[i] = (Math.random() + Math.random() - 1) * 0.05 * (bulge ? 1.8 : 1);
    space.orbit[i] = 0.16 / (radius + 0.25);
    space.seed[i] = Math.random();
    const core = smooth(0.34, 0.08, radius);
    const pink = !bulge && Math.random() < 0.05;
    space.tintR[i] = pink ? 255 : mix(150, 255, core);
    space.tintG[i] = pink ? 110 : mix(186, 214, core);
    space.tintB[i] = pink ? 170 : mix(255, 140, core);
  }
  return space;
}

function resetStar(star, z) {
  star.x = rand(-1.7, 1.7);
  star.y = rand(-1.2, 1.2);
  star.z = z;
  star.wasX = star.x / z;
  star.wasY = star.y / z;
}

function plot(space, x, y, r, g, b, mark) {
  const col = Math.round(x * space.unit + space.cols / 2);
  const row = Math.round((y * space.unit) / CELL + space.rows / 2);
  if (col < 0 || col >= space.cols || row < 0 || row >= space.rows) return;
  const i = row * space.cols + col;
  space.red[i] += r;
  space.green[i] += g;
  space.blue[i] += b;
  if (mark) space.mark[i] = mark;
}

function starLight(f) {
  return smooth(109, 104, f) + smooth(120, 125, f);
}

function flightSpeed(f) {
  if (f < 0) return 0.015;
  let speed = mix(0.06, 0.24, smooth(134, 138, f)) + 2.2 * gauss(f - 135.5, 1.5) + gauss(f - 326, 4);
  for (const at of WARPS) speed += 1.8 * gauss(f - at, 1.3);
  return speed;
}

function turnStar(star, space, pan, twist) {
  const reach = space.edge + 0.2;
  const cos = Math.cos(twist);
  const sin = Math.sin(twist);
  const x = star.x - pan * star.z;
  const wasX = star.wasX - pan;
  star.x = x * cos - star.y * sin;
  star.y = x * sin + star.y * cos;
  star.wasX = wasX * cos - star.wasY * sin;
  star.wasY = wasX * sin + star.wasY * cos;
  if (Math.abs(star.x) > reach * star.z) {
    const jump = Math.sign(star.x) * 2 * reach;
    star.x -= jump * star.z;
    star.wasX -= jump;
  }
}

function drawStars(space, f, dt) {
  const shine = starLight(f);
  if (shine <= 0) return;
  const speed = flightSpeed(f);
  const pan = heading(f) - heading(f - dt);
  const twist = banking(f) - banking(f - dt);
  const well = holeWell(space, f);
  for (const star of space.stars) {
    if (pan || twist) turnStar(star, space, pan, twist);
    star.z -= speed * dt * 0.5;
    if (well) {
      const dx = well.x - star.x / Math.max(star.z, 0.01);
      const dy = well.y - star.y / Math.max(star.z, 0.01);
      const d2 = dx * dx + dy * dy;
      const drag = (well.pull * dt * 0.8 * star.z) / (d2 + 0.14);
      star.x += (dx + dy * 0.75) * drag;
      star.y += (dy - dx * 0.75) * drag;
      if (d2 < 0.012) {
        resetStar(star, rand(0.7, 1));
        continue;
      }
    }
    const x = star.x / Math.max(star.z, 0.01);
    const y = star.y / Math.max(star.z, 0.01);
    if (star.z < 0.04 || Math.abs(x) > 2.6 || Math.abs(y) > 2) {
      resetStar(star, rand(0.7, 1));
      continue;
    }
    const lit = (smooth(1, 0.3, star.z) * 215 + 40) * shine;
    const r = lit * mix(0.72, 1, star.warm);
    const g = lit * 0.88;
    const b = lit * mix(1, 0.7, star.warm);
    const across = (x - star.wasX) * space.unit;
    const down = ((y - star.wasY) * space.unit) / CELL;
    const steps = Math.min(Math.ceil(Math.hypot(across, down)), 18);
    if (steps > 1) {
      const glyph = slopeGlyph(across, down);
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        plot(space, mix(star.wasX, x, t), mix(star.wasY, y, t), r * t, g * t, b * t, glyph);
      }
    } else {
      plot(space, x, y, r, g, b, (lit > 190 ? '*' : lit > 110 ? '+' : '.').charCodeAt(0));
    }
    star.wasX = x;
    star.wasY = y;
  }
}

function drawGalaxy(space, view, t, f) {
  const fade = smooth(7.5, 5, f);
  if (fade <= 0) return;
  const rush = f > 2.5 ? Math.exp(Math.pow(f - 2.5, 2) * 0.17) : 1;
  plotGalaxy(space, { x: view.x, y: view.y, form: view.form, scale: view.scale * rush }, t, fade);
}

function plotGalaxy(space, view, t, fade) {
  const { scale } = view;
  const roll = -0.45 + t * 0.012;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const lit = (fade * 0.2 * space.n) / space.count;
  for (let i = 0; i < space.count; i++) {
    const seed = space.seed[i];
    const grown = clamp(view.form * 1.7 - seed * 0.7);
    if (grown <= 0) continue;
    const loose = 1 - grown;
    const angle = space.angle[i] + t * space.orbit[i] + loose * loose * (2.5 + seed * 3);
    const radius = space.radius[i] * (1 + loose * (1 + seed * 1.4));
    const gx = Math.cos(angle) * radius;
    const gy = Math.sin(angle) * radius * GALAXY_FLAT + space.height[i];
    const x = (gx * cos - gy * sin) * scale + view.x;
    const y = (gx * sin + gy * cos) * scale + view.y;
    const glow = lit * smooth(0, 0.7, grown);
    plot(space, x, y, space.tintR[i] * glow, space.tintG[i] * glow, space.tintB[i] * glow);
  }
  shineGalaxy(space, view, t, scale, cos, sin, fade * view.form * view.form);
}

function shineGalaxy(space, view, t, scale, cos, sin, strength) {
  const { cols, rows, unit, red, green, blue } = space;
  const barCos = Math.cos(0.6 + t * 0.06);
  const barSin = Math.sin(0.6 + t * 0.06);
  for (let r = 0; r < rows; r++) {
    const v = ((r - rows / 2) * CELL) / unit - view.y;
    for (let c = 0; c < cols; c++) {
      const u = (c - cols / 2) / unit - view.x;
      const px = (u * cos + v * sin) / scale;
      const py = (v * cos - u * sin) / scale / GALAXY_FLAT;
      const radius = Math.hypot(px, py);
      if (radius > 1.7) continue;

      const spin = Math.atan2(py, px) - (t * 0.16) / (radius + 0.25);
      const phase = spin - Math.log(radius + 0.06) * 2.2;
      const major = 0.5 + 0.5 * Math.cos(2 * phase);
      const minor = 0.5 + 0.5 * Math.cos(2 * phase + 1.57);
      const lane = 0.5 + 0.5 * Math.cos(2 * phase - 0.75);
      const clump = noise(Math.cos(spin) * radius * 9 + 30, Math.sin(spin) * radius * 9 + 30);

      const disc = Math.exp(-radius * 2.1);
      const dust = 1 - 0.75 * Math.pow(lane, 5) * smooth(0.1, 0.28, radius) * smooth(1.25, 0.7, radius) * strength;
      const barX = px * barCos + py * barSin;
      const barY = py * barCos - px * barSin;
      const core = 1.5 * gauss(radius, 0.15) + 0.8 * gauss(barX, 0.36) * gauss(barY, 0.1);
      const arms = disc * (0.05 + 2.4 * Math.pow(major, 3.5) + 0.45 * Math.pow(minor, 4)) * (0.6 + 0.8 * clump);
      const knot = 1.7 * smooth(0.6, 0.78, clump) * Math.pow(major, 3) * disc * smooth(0.14, 0.3, radius);

      const i = r * cols + c;
      red[i] = red[i] * dust + strength * (arms * 210 + core * 255 + knot * 255);
      green[i] = green[i] * dust + strength * (arms * 262 + core * 205 + knot * 84);
      blue[i] = blue[i] * dust + strength * (arms * 420 + core * 140 + knot * 150);
    }
  }
}

function drawNebula(space, f) {
  const n = (f - 5.5) / 10;
  if (n <= 0 || n >= 1) return;
  const fade = smooth(0, 0.2, n) * smooth(1, 0.8, n);
  const { cols, rows, unit, red, green, blue, clouds: tex } = space;
  const { density, hue, lane } = tex;
  const grow = 0.8 + n * n * 3.4;
  const far = 0.3 / Math.pow(grow, 0.7);
  const near = 0.42 / Math.pow(grow, 0.8);
  const cos = Math.cos(n * 0.4);
  const sin = Math.sin(n * 0.4);
  for (let r = 0; r < rows; r++) {
    const v = ((r - rows / 2) * CELL) / unit;
    for (let c = 0; c < cols; c++) {
      const u = (c - cols / 2) / unit;
      const x = u * cos - v * sin;
      const y = u * sin + v * cos;
      const a = cloudIndex(x * far + 0.5, y * far + 0.5);
      const b = cloudIndex(x * near + 0.42, y * near + 0.55);
      const dist = Math.hypot(u, v * 1.15) / grow + (hue[a] - 0.5) * 0.5;
      const shell = smooth(1.5, 0.65, dist) * smooth(0.06, 0.34, dist);
      const lamp = 1 + 1.6 * Math.exp(-dist / 0.42);
      const gas = density[a] * density[a];
      const lit = fade * shell * lamp * (0.25 + 1.2 * gas) * (1 - lane[b] * 0.8);
      const warm = smooth(0.3, 0.72, dist);
      const i = r * cols + c;
      red[i] += lit * mix(52, 255, warm);
      green[i] += lit * mix(196, 62, warm);
      blue[i] += lit * mix(214, 118, warm);
    }
  }
  for (let k = 0; k < 7; k++) {
    const angle = hash(k, 3.3) * TAU;
    const out = hash(k, 7.1) * 0.13 * grow;
    addGlow(space, Math.cos(angle) * out, Math.sin(angle) * out, 0.012 + 0.012 * grow, 340 * fade, 370 * fade, 420 * fade);
  }
}

function heatTone(t, out) {
  if (t < 0.5) {
    const k = t * 2;
    out[0] = 255;
    out[1] = mix(70, 205, k);
    out[2] = mix(12, 130, k);
  } else {
    const k = clamp((t - 0.5) * 2);
    out[0] = mix(255, 196, k);
    out[1] = mix(205, 222, k);
    out[2] = mix(130, 255, k);
  }
}

function bounds(space, x, y, reach) {
  const { cols, rows, unit } = space;
  return [
    Math.max(0, Math.floor((x - reach) * unit + cols / 2)),
    Math.min(cols - 1, Math.ceil((x + reach) * unit + cols / 2)),
    Math.max(0, Math.floor(((y - reach) * unit) / CELL + rows / 2)),
    Math.min(rows - 1, Math.ceil(((y + reach) * unit) / CELL + rows / 2)),
  ];
}

function holeWell(space, f) {
  const n = stageOf(f, STAGES.hole);
  if (n <= 0 || n >= 1) return null;
  const path = sling(n, 1.05, 4.8, space.edge);
  return { x: path.x, y: -0.03 - 0.12 * path.s, pull: smooth(0, 0.2, n) * smooth(1, 0.8, n) };
}

function drawInfall(space, f, cx, cy, scale, flat, twist, fade) {
  const count = Math.min(space.count, 9000);
  const cos = Math.cos(twist);
  const sin = Math.sin(twist);
  const lit = (fade * 0.2 * space.n) / count;
  for (let i = 0; i < count; i++) {
    const torn = i % 3 === 0;
    const seed = space.seed[i];
    const rate = torn ? 0.075 : 0.11;
    const start = torn ? 1.1 + (seed - 0.5) * 0.3 + f * 0.04 : seed * 97;
    const spread = torn ? (seed - 0.5) * 0.09 : 0;
    const phase = (seed * 1.7 + i * 0.000173 + f * rate) % 1;
    for (let k = 0; k < 5; k++) {
      const p = phase - k * 0.0055;
      if (p < 0) break;
      const radius = 5.5 + 118 * Math.pow(1 - p, 1.7);
      const angle = start - 3.6 * Math.log(radius / 5.5) + f * 0.2 + spread;
      const gx = Math.cos(angle) * radius;
      const gy = Math.sin(angle) * radius * flat;
      const heat = smooth(58, 8, radius);
      const light = lit * (1 - k * 0.18) * (0.2 + 2.2 * heat) * smooth(0, 0.08, p) * (torn ? 1.5 : 1);
      heatTone(0.08 + 0.74 * heat, rgb);
      if (heat < 0.2) {
        const star = 1 - heat * 5;
        rgb[0] = mix(rgb[0], 190, star);
        rgb[1] = mix(rgb[1], 206, star);
        rgb[2] = mix(rgb[2], 255, star);
      }
      plot(space, cx + (gx * cos - gy * sin) * scale, cy + (gx * sin + gy * cos) * scale, rgb[0] * light, rgb[1] * light, rgb[2] * light);
    }
  }
}

function drawBlackHole(space, f) {
  const n = stageOf(f, STAGES.hole);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, mark, backR, backG, backB, backM } = space;
  const { orbit, sweep, h } = space.lens;
  const path = sling(n, 1.05, 4.8, space.edge);
  const scale = 0.06 / path.z;
  const cx = path.x;
  const cy = -0.03 - 0.12 * path.s;
  const fade = smooth(0, 0.1, n) * smooth(1, 0.9, n);
  const circled = n * 3.4;
  const incline = 1.52 - 0.5 * (1 - path.away);
  const twist = path.s * 0.34;
  const cosTwist = Math.cos(twist);
  const sinTwist = Math.sin(twist);
  const cosI = Math.cos(incline);
  const sinI = Math.sin(incline);
  const [left, right, top, bottom] = bounds(space, cx, cy, LENS_REACH * scale);

  drawInfall(space, f, cx, cy, scale, Math.max(Math.cos(incline), 0.3), twist, fade);
  backR.set(red);
  backG.set(green);
  backB.set(blue);
  backM.set(mark);

  for (let r = top; r <= bottom; r++) {
    const rawV = -(((r - rows / 2) * CELL) / unit - cy) / scale;
    for (let c = left; c <= right; c++) {
      const rawU = ((c - cols / 2) / unit - cx) / scale;
      const du = rawU * cosTwist + rawV * sinTwist;
      const dv = rawV * cosTwist - rawU * sinTwist;
      const b = Math.hypot(du, dv);
      if (b >= LENS_REACH) continue;
      const i = r * cols + c;
      const ib = Math.min(LENS_B - 1, Math.floor((b / LENS_MAX_B) * LENS_B));
      const ex = du / (b + 1e-6);
      const ey = dv / (b + 1e-6);
      const turn = sweep[ib];
      let lr = 0;
      let lg = 0;
      let lb = 0;
      let glyph = 0;

      if (turn >= 0) {
        const away = (b - (turn - Math.PI) * 14 * smooth(LENS_REACH, 20, b)) * scale;
        const col = Math.round((cx + (rawU / (b + 1e-6)) * away) * unit + cols / 2);
        const row = Math.round(((cy - (rawV / (b + 1e-6)) * away) * unit) / CELL + rows / 2);
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          const from = row * cols + col;
          lr = backR[from];
          lg = backG[from];
          lb = backB[from];
          glyph = backM[from];
        }
      }

      const first = Math.atan2(cosI, -ey * sinI);
      for (let k = 2; k >= 0; k--) {
        const psi = first + k * Math.PI;
        const ip = Math.floor(psi / h);
        if (ip + 1 >= LENS_PSI) continue;
        const t = psi / h - ip;
        const u = mix(orbit[ib * LENS_PSI + ip], orbit[ib * LENS_PSI + ip + 1], t);
        if (u <= 0) continue;
        const radius = 1 / u;
        if (radius < DISK_IN || radius > DISK_OUT) continue;

        const across = radius * Math.sin(psi) * ex;
        const deep = radius * Math.sin(psi) * ey * cosI - radius * Math.cos(psi) * sinI;
        const phi = Math.atan2(deep, across);
        const speed = 1 / Math.sqrt(radius - 2);
        const toward = -speed * Math.cos(phi) * sinI;
        const shift = Math.sqrt(1 - 3 / radius) / (1 - toward);
        const swirl = phi - circled - f * 26 * Math.pow(radius, -1.5);
        const lane = Math.log(radius) * 3.2;
        const clump = 0.45 + 1.1 * noise(Math.cos(swirl) * 2.6 + lane, Math.sin(swirl) * 2.6 + lane);
        const glow = Math.pow(DISK_IN / radius, 2.2) * Math.sqrt(1 - Math.sqrt(DISK_IN / radius)) * smooth(DISK_OUT, 11, radius);
        const power = 15 * glow * clump * shift * shift * shift;
        glyph = 0;
        const veil = clamp(power * 0.7);
        heatTone(0.2 + 0.62 * shift * Math.pow(DISK_IN / radius, 0.5), rgb);
        lr = lr * (1 - veil) + rgb[0] * power;
        lg = lg * (1 - veil) + rgb[1] * power;
        lb = lb * (1 - veil) + rgb[2] * power;
      }

      red[i] = mix(backR[i], lr, fade);
      green[i] = mix(backG[i], lg, fade);
      blue[i] = mix(backB[i], lb, fade);
      mark[i] = glyph;
    }
  }
}

function drawYoungStar(space, f) {
  const n = stageOf(f, STAGES.disk);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue } = space;
  const pass = sling(n, 1.2, 6, space.edge);
  const size = 0.95 / pass.z;
  const cx = pass.x;
  const cy = 0.06;
  const fade = smooth(0, 0.12, n);
  const cos = Math.cos(0.5);
  const sin = Math.sin(0.5);
  const [left, right, top, bottom] = bounds(space, cx, cy, size * 1.9);

  for (let r = top; r <= bottom; r++) {
    const v = ((r - rows / 2) * CELL) / unit - cy;
    for (let c = left; c <= right; c++) {
      const u = (c - cols / 2) / unit - cx;
      const rx = (u * cos + v * sin) / size;
      const ry = (v * cos - u * sin) / size;
      const i = r * cols + c;
      const radius = Math.hypot(rx, ry / 0.42);
      const reach = Math.abs(ry);
      const jet = gauss(rx, 0.012 + reach * 0.04) * smooth(1.8, 0.2, reach) * (0.5 + 0.5 * Math.sin(reach * 30 - f * 5)) * 1.3;
      const star = Math.exp(-Math.hypot(rx, ry) / 0.035) * 6;
      red[i] += fade * (jet * 110 + star * 255);
      green[i] += fade * (jet * 170 + star * 226);
      blue[i] += fade * (jet * 255 + star * 190);
      if (radius > 1.15) continue;

      const turn = Math.atan2(ry / 0.42, rx) - (f * 0.7) / (radius + 0.2);
      const arms = 0.82 + 0.18 * Math.sin(turn * 2 + Math.log(radius + 0.05) * 5);
      const gaps = (1 - 0.95 * gauss(radius - 0.31, 0.04)) * (1 - 0.92 * gauss(radius - 0.53, 0.045)) * (1 - 0.88 * gauss(radius - 0.76, 0.045));
      const dust = 0.75 + 0.5 * noise(Math.cos(turn) * radius * 12 + 8, Math.sin(turn) * radius * 12);
      const light = 2.8 * Math.exp(-radius * 1.9) * arms * gaps * dust * smooth(1.15, 0.85, radius) * fade;
      const warm = smooth(0.8, 0.1, radius);
      red[i] += light * 255;
      green[i] += light * mix(84, 196, warm);
      blue[i] += light * mix(34, 116, warm);
    }
  }
}

function drawCluster(space, f) {
  const n = stageOf(f, STAGES.cluster);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, mark } = space;
  const camera = mix(-17, 3.4, n * n * (3 - 2 * n));
  const fade = smooth(0, 0.12, n);
  for (const star of space.swarm) {
    const dz = star.z - camera;
    if (dz < 0.08) continue;
    const col = Math.round(((star.x - 0.42) / dz) * unit + cols / 2);
    const row = Math.round((((star.y - 0.24) / dz) * unit) / CELL + rows / 2);
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    const i = row * cols + col;
    const lit = fade * Math.min(1, 0.3 + 3 / (dz * dz));
    const crowded = red[i] > 150;
    red[i] += star.r * lit * 0.45;
    green[i] += star.g * lit * 0.45;
    blue[i] += star.b * lit * 0.45;
    mark[i] = crowded ? 0 : lit > 0.7 ? 42 : lit > 0.42 ? 43 : 46;
  }
}

function startMerger() {
  const m = {
    time: 0,
    x: new Float32Array(MERGER_STARS),
    y: new Float32Array(MERGER_STARS),
    z: new Float32Array(MERGER_STARS),
    vx: new Float32Array(MERGER_STARS),
    vy: new Float32Array(MERGER_STARS),
    vz: new Float32Array(MERGER_STARS),
    r: new Float32Array(MERGER_STARS),
    g: new Float32Array(MERGER_STARS),
    b: new Float32Array(MERGER_STARS),
    heavy: [
      { x: -4.3, y: -1.1, z: 0, vx: 0.3, vy: 0.1, vz: 0 },
      { x: 4.3, y: 1.1, z: 0, vx: -0.3, vy: -0.1, vz: 0 },
    ],
  };
  for (let i = 0; i < MERGER_STARS; i++) {
    const which = i % 2;
    const home = m.heavy[which];
    const tilt = which ? -0.55 : 0.1;
    const radius = 0.22 + Math.pow(Math.random(), 0.7) * 1.55;
    const arm = ((i >> 1) % 2) * Math.PI;
    const angle = arm - Math.log(radius) * 2.6 + (Math.random() + Math.random() - 1) * 0.42;
    const pull = 1 / Math.pow(radius * radius + 0.05, 1.5);
    const speed = radius * Math.sqrt(pull);
    const lx = Math.cos(angle) * radius;
    const ly = Math.sin(angle) * radius;
    const wx = -Math.sin(angle) * speed;
    const wy = Math.cos(angle) * speed;
    m.x[i] = home.x + lx;
    m.y[i] = home.y + ly * Math.cos(tilt);
    m.z[i] = ly * Math.sin(tilt);
    m.vx[i] = home.vx + wx;
    m.vy[i] = home.vy + wy * Math.cos(tilt);
    m.vz[i] = wy * Math.sin(tilt);
    const heart = smooth(0.9, 0.3, radius);
    m.r[i] = mix(which ? 255 : 96, 255, heart);
    m.g[i] = mix(which ? 142 : 158, 228, heart);
    m.b[i] = mix(which ? 92 : 255, 176, heart);
  }
  return m;
}

function stepMerger(m, h) {
  const [a, b] = m.heavy;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const gap = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.05);
  const force = 1 / (gap * gap * gap);
  const brake = 0.34 * smooth(2.6, 0.4, gap);
  a.vx += (dx * force - a.vx * brake) * h;
  a.vy += (dy * force - a.vy * brake) * h;
  a.vz += (dz * force - a.vz * brake) * h;
  b.vx += (-dx * force - b.vx * brake) * h;
  b.vy += (-dy * force - b.vy * brake) * h;
  b.vz += (-dz * force - b.vz * brake) * h;
  for (const body of m.heavy) {
    body.x += body.vx * h;
    body.y += body.vy * h;
    body.z += body.vz * h;
  }
  const { x, y, z, vx, vy, vz } = m;
  for (let i = 0; i < MERGER_STARS; i++) {
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (const body of m.heavy) {
      const px = body.x - x[i];
      const py = body.y - y[i];
      const pz = body.z - z[i];
      const d2 = px * px + py * py + pz * pz + 0.05;
      const pull = 1 / (d2 * Math.sqrt(d2));
      ax += px * pull;
      ay += py * pull;
      az += pz * pull;
    }
    vx[i] += ax * h;
    vy[i] += ay * h;
    vz[i] += az * h;
    x[i] += vx[i] * h;
    y[i] += vy[i] * h;
    z[i] += vz[i] * h;
  }
}

function addGlow(space, x, y, width, r, g, b) {
  const { cols, rows, unit, red, green, blue } = space;
  const [left, right, top, bottom] = bounds(space, x, y, width * 5);
  for (let row = top; row <= bottom; row++) {
    const dy = ((row - rows / 2) * CELL) / unit - y;
    for (let col = left; col <= right; col++) {
      const light = Math.exp(-Math.hypot((col - cols / 2) / unit - x, dy) / width);
      const i = row * cols + col;
      red[i] += r * light;
      green[i] += g * light;
      blue[i] += b * light;
    }
  }
}

function drawMerger(space, f) {
  const n = stageOf(f, STAGES.merger);
  if (n <= 0 || n >= 1) {
    if (n <= 0) space.merger = null;
    return;
  }
  if (!space.merger) space.merger = startMerger();
  const m = space.merger;
  const target = 44 * Math.min(n / 0.82, 1);
  for (let k = 0; m.time < target && k < 12; k++) {
    stepMerger(m, 0.024);
    m.time += 0.024;
  }

  const fade = smooth(0, 0.1, n);
  const collapse = smooth(0.82, 0.985, n);
  const scale = 0.25 * (1 + n * 0.2) * (1 - collapse) * (1 - collapse);
  const tiltCos = Math.cos(0.75);
  const tiltSin = Math.sin(0.75);
  const lit = (fade * 0.055 * space.n) / MERGER_STARS;
  for (let i = 0; i < MERGER_STARS; i++) {
    plot(space, m.x[i] * scale, (m.y[i] * tiltCos - m.z[i] * tiltSin) * scale, m.r[i] * lit, m.g[i] * lit, m.b[i] * lit);
  }

  const [a, b] = m.heavy;
  const core = 0.05 * (1 - collapse);
  if (core > 0.004) {
    addGlow(space, a.x * scale, (a.y * tiltCos - a.z * tiltSin) * scale, core, 255 * fade, 226 * fade, 176 * fade);
    addGlow(space, b.x * scale, (b.y * tiltCos - b.z * tiltSin) * scale, core, 255 * fade, 226 * fade, 176 * fade);
  }
  const point = collapse * smooth(1, 0.97, n);
  if (point > 0) addGlow(space, 0, 0, 0.02 + 0.08 * (1 - collapse), 900 * point, 860 * point, 800 * point);
}

function drawBinary(space, f) {
  const n = stageOf(f, STAGES.binary);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, mark } = space;
  const pass = sling(n, 1.1, 6, space.edge);
  const size = 0.98 / pass.z;
  const cx = -pass.x;
  const cy = 0.04;
  const squash = 0.76;
  const fade = smooth(0, 0.12, n);
  const phase = f * 0.3;
  const cos = Math.cos(phase);
  const sin = Math.sin(phase);
  const [left, right, top, bottom] = bounds(space, cx, cy, size * 1.25);

  for (let r = top; r <= bottom; r++) {
    const v = ((((r - rows / 2) * CELL) / unit - cy) / size) / squash;
    for (let c = left; c <= right; c++) {
      const u = ((c - cols / 2) / unit - cx) / size;
      const x = u * cos + v * sin;
      const y = v * cos - u * sin;
      const i = r * cols + c;
      const gap = Math.hypot(x - 0.45, y);
      const phi = roche(x, y);

      if (x < L1.x && Math.hypot(x + 0.55, y) < 0.78 && phi < L1.phi) {
        const depth = Math.sqrt(clamp((L1.phi - phi) / 1.3));
        const boil = fbm(x * 7 + f * 0.1, y * 7 - f * 0.08);
        red[i] = fade * 255 * (0.35 + 0.65 * depth);
        green[i] = fade * mix(46, 150, boil) * (0.3 + 0.7 * depth);
        blue[i] = fade * mix(14, 62, boil) * (0.3 + 0.7 * depth);
        mark[i] = 0;
      } else if (gap < 0.24) {
        const angle = Math.atan2(y, x - 0.45) - f * 2 * Math.pow(gap + 0.03, -1.5) * 0.04;
        const heat = smooth(0.24, 0.03, gap);
        const swirl = 0.5 + noise(Math.cos(angle) * 2 + gap * 16, Math.sin(angle) * 2 + gap * 16);
        const spot = 1.3 * gauss(Math.atan2(Math.sin(Math.atan2(y, x - 0.45) - 3.4), Math.cos(Math.atan2(y, x - 0.45) - 3.4)), 0.5) * gauss(gap - 0.2, 0.04);
        const light = fade * (heat * swirl * 1.3 + spot);
        red[i] += light * mix(255, 170, heat);
        green[i] += light * mix(170, 205, heat);
        blue[i] += light * mix(120, 255, heat);
      }
    }
  }

  for (let i = 0; i < 1300; i++) {
    const t = (hash(i, 6.1) + f * 0.35) % 1;
    const x = mix(L1.x, 0.56, t) + (hash(i, 1.9) - 0.5) * 0.02;
    const y = -0.2 * Math.sin(Math.PI * t) + (hash(i, 3.7) - 0.5) * (0.012 + t * 0.03);
    const px = (x * cos - y * sin) * size + cx;
    const py = (x * sin + y * cos) * size * squash + cy;
    plot(space, px, py, 255 * fade, 150 * fade, 110 * fade);
  }
}

function drawPulsar(space, f) {
  const n = stageOf(f, STAGES.pulsar);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, clouds: tex } = space;
  const pass = sling(n, 1.1, 6, space.edge);
  const size = 0.82 / pass.z;
  const cx = pass.x;
  const cy = 0.04;
  const fade = smooth(0, 0.12, n);
  const lean = 0.42;
  const axisX = Math.sin(lean);
  const axisY = -Math.cos(lean);
  const spin = f * 8.8;
  const tilt = 0.62;
  const mx = axisX * Math.cos(tilt) + Math.cos(lean) * Math.sin(tilt) * Math.cos(spin);
  const my = axisY * Math.cos(tilt) + Math.sin(lean) * Math.sin(tilt) * Math.cos(spin);
  const mz = Math.sin(tilt) * Math.sin(spin);
  const flash = gauss(1 - Math.abs(mz), 0.18) * Math.abs(mz);
  const wave = (f * 0.45) % 1;
  const [left, right, top, bottom] = bounds(space, cx, cy, size * 1.3);

  for (let r = top; r <= bottom; r++) {
    const v = (((r - rows / 2) * CELL) / unit - cy) / size;
    for (let c = left; c <= right; c++) {
      const u = ((c - cols / 2) / unit - cx) / size;
      const dist = Math.hypot(u, v);
      if (dist > 1.3) continue;
      const i = r * cols + c;

      const shellX = clamp(u * 0.34 + 0.5, 0, 0.999);
      const shellY = clamp(v * 0.34 + 0.5, 0, 0.999);
      const texel = Math.floor(shellX * CLOUD_SIZE) + Math.floor(shellY * CLOUD_SIZE) * CLOUD_SIZE;
      const thread = tex.lane[texel];
      const edge = smooth(1.3, 0.95, dist);
      const filament = thread * thread * edge * smooth(0.2, 0.75, dist) * 1.05;
      const hot = smooth(0.42, 0.58, tex.hue[texel]);
      const synchrotron = Math.exp(-dist * 2.7) * 0.55 * edge;

      const along = u * axisX + v * axisY;
      const beside = u * axisY - v * axisX;
      const torus = Math.hypot(along / 0.34, beside);
      const wisp = gauss(torus - 0.17, 0.035) * 0.8 + 0.55 * gauss(torus - 0.2 - wave * 0.24, 0.022) * (1 - wave);
      const jet = gauss(beside, 0.012 + Math.abs(along) * 0.04) * smooth(0.62, 0.05, Math.abs(along)) * (along < 0 ? 0.9 : 0.4);

      let cone = 0;
      for (let s = -1; s <= 1; s += 2) {
        const flat = Math.hypot(mx, my) + 1e-3;
        const ahead = (u * mx + v * my) * s / flat;
        if (ahead <= 0) continue;
        const off = Math.abs(u * my - v * mx) / flat;
        const deep = ahead / flat;
        const width = 0.012 + deep * 0.15;
        cone += Math.exp(-Math.pow((off / width - 0.72) / 0.42, 2)) * Math.exp(-deep / 1.3) * (0.03 / width + 0.16);
      }

      const core = Math.exp(-dist / 0.012) * 9 + Math.exp(-dist / 0.1) * flash * 1.1 + Math.exp(-dist / 0.5) * flash * 0.22;
      const cool = fade * (synchrotron + wisp + jet + cone * 3.4 + core);
      const line = fade * filament;
      red[i] += cool * 150 + line * 255;
      green[i] += cool * 196 + line * mix(190, 76, hot);
      blue[i] += cool * 255 + line * mix(110, 50, hot);
    }
  }

  const loops = 14;
  for (let k = 0; k < loops; k++) {
    const around = (k / loops) * TAU + spin * 0.12;
    const px = -my;
    const py = mx;
    for (let j = 1; j < 90; j++) {
      const t = (j / 90) * Math.PI;
      const reach = 0.13 * Math.sin(t) * Math.sin(t);
      const sideway = Math.sin(t) * reach * Math.cos(around);
      const ahead = Math.cos(t) * reach;
      const x = cx + size * (mx * ahead + px * sideway);
      const y = cy + size * (my * ahead + py * sideway);
      plot(space, x, y, 34 * fade, 74 * fade, 110 * fade);
    }
  }
}

function drawPlanetary(space, f) {
  const n = stageOf(f, STAGES.planetary);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, clouds: tex } = space;
  const { density, hue, lane } = tex;
  const fade = smooth(0, 0.1, n) * smooth(1, 0.9, n);
  const s = 2 * n - 1;
  const camZ = 4.4 * s * s * s + 0.7 * s;
  const camX = 0.16;
  const camY = -0.1;
  const reach = 1.3;
  const steps = 14;
  const lean = 0.4 + n * 0.5;
  const cos = Math.cos(lean);
  const sin = Math.sin(lean);

  for (let r = 0; r < rows; r++) {
    const dy = (((r - rows / 2) * CELL) / unit) * 0.62;
    for (let c = 0; c < cols; c++) {
      const dx = ((c - cols / 2) / unit) * 0.62;
      const size = 1 + dx * dx + dy * dy;
      const toward = camX * dx + camY * dy + camZ;
      const c0 = camX * camX + camY * camY + camZ * camZ - reach * reach;
      const root = toward * toward - size * c0;
      if (root <= 0) continue;
      const wide = Math.sqrt(root);
      const near = Math.max((-toward - wide) / size, 0.02);
      const far = (-toward + wide) / size;
      if (far <= near) continue;
      const step = (far - near) / steps;
      let lr = 0;
      let lg = 0;
      let lb = 0;

      for (let k = 0; k < steps; k++) {
        const t = near + (k + 0.5) * step;
        const wx = camX + dx * t;
        const wy = camY + dy * t;
        const z = camZ + t;
        const x = wx * cos + wy * sin;
        const y = (wy * cos - wx * sin) / 0.82;
        const e = Math.sqrt(x * x + y * y + z * z);
        const outX = x / (e + 0.01);
        const outY = y / (e + 0.01);
        const outZ = z / (e + 0.01);
        const lump = 0.25 + 1.1 * density[cloudIndex(x * 0.6 + z * 0.25 + 0.5, y * 0.6 - z * 0.25 + 0.5)];
        const spoke = hue[cloudIndex(outX * 0.7 + outZ * 0.3 + 0.9, outY * 0.7 - outZ * 0.3 + 0.9)];
        const thread = lane[cloudIndex(outX * 0.5 - outZ * 0.2 + 0.4, outY * 0.5 + outZ * 0.2 + 0.4)];
        const shell = gauss(e - 0.68, 0.1) * lump * lump * (0.4 + 1.1 * thread) + 0.16 * gauss(e - 1.05, 0.06) * lump;
        const knots = smooth(0.54, 0.64, spoke) * gauss(e - 0.48, 0.09) * 1.3;
        const inside = 0.05 * smooth(0.6, 0.15, e);
        const outer = smooth(0.42, 0.8, e);
        const light = (shell + inside) * step * 2.5;
        const core = gauss(e - 0.4, 0.08) * lump * step * 1.7;
        const knot = knots * step * 2;
        lr += light * mix(44, 255, outer) + knot * 255 + core * 40;
        lg += light * mix(206, 58, outer) + knot * 150 + core * 214;
        lb += light * mix(226, 52, outer) + knot * 96 + core * 226;
      }

      const i = r * cols + c;
      red[i] += lr * fade;
      green[i] += lg * fade;
      blue[i] += lb * fade;
    }
  }

  if (camZ < -0.05) {
    const sx = (-camX / -camZ) / 0.62;
    const sy = (-camY / -camZ) / 0.62;
    const glow = fade * Math.min(1, 0.5 / -camZ + 0.3);
    addGlow(space, sx, sy, 0.012 + 0.03 / -camZ * 0.5, 620 * glow, 680 * glow, 760 * glow);
  }
}

function drawSupernova(space, f) {
  const n = stageOf(f, STAGES.nova);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, mark, clouds: tex } = space;
  const t = n * STAGES.nova[1];
  const cx = space.edge * 0.16;
  const cy = -0.05;
  const appear = smooth(0, 0.9, t);

  if (t < 3.4) {
    const collapse = smooth(2.75, 3.4, t);
    const radius = 0.33 * (1 + 0.025 * Math.sin(t * 3.4)) * (1 - 0.9 * collapse * collapse);
    const [left, right, top, bottom] = bounds(space, cx, cy, radius * 2);
    for (let r = top; r <= bottom; r++) {
      const ny = (((r - rows / 2) * CELL) / unit - cy) / radius;
      for (let c = left; c <= right; c++) {
        const nx = ((c - cols / 2) / unit - cx) / radius;
        const d = Math.hypot(nx, ny);
        const i = r * cols + c;
        if (d < 1) {
          const nz = Math.sqrt(1 - d * d);
          const cell = fbm(Math.atan2(nx, nz) * 4 + t * 0.2, Math.asin(ny) * 5 - t * 0.15);
          const limb = 0.35 + 0.65 * Math.pow(nz, 0.7);
          red[i] = 255 * limb * appear;
          green[i] = mix(38, 140, cell * cell) * limb * appear;
          blue[i] = mix(10, 54, cell * cell) * limb * appear;
          mark[i] = 0;
        } else {
          const glow = Math.exp(-(d - 1) / 0.28) * appear;
          red[i] += glow * 190;
          green[i] += glow * 54;
          blue[i] += glow * 18;
        }
      }
    }
    return;
  }

  const age = t - 3.4;
  const reach = 0.03 + 2.1 * (1 - Math.exp(-age * 0.19));
  const flash = 5 * Math.exp(-age * 2.3);
  const cooled = smooth(0.2, 3.2, age);
  const glowing = smooth(0, 0.4, age) * smooth(STAGES.nova[1] - 3.4, 5, age);

  for (let r = 0; r < rows; r++) {
    const v = ((r - rows / 2) * CELL) / unit - cy;
    for (let c = 0; c < cols; c++) {
      const u = (c - cols / 2) / unit - cx;
      const d = Math.hypot(u, v);
      const i = r * cols + c;
      const blast = flash * Math.exp(-d / 0.32);
      let lr = blast * 255;
      let lg = blast * 245;
      let lb = blast * 255;

      if (d < reach * 1.5) {
        const ca = u / (d + 1e-6);
        const sa = v / (d + 1e-6);
        const wide = fbm(ca * 2.6 + 3, sa * 2.6 + 7);
        const finger = noise(ca * 9 + 5, sa * 9 + 2);
        const rim = reach * (0.76 + 0.34 * wide + 0.2 * finger * finger);
        const e = d / rim;
        const shock = gauss(e - 1, 0.018 + 0.012 * cooled) * 0.5 * glowing;
        lr += shock * 190;
        lg += shock * 216;
        lb += shock * 255;

        if (e < 1) {
          const limb = Math.min(5, 1 / Math.sqrt(1 - e * e + 0.04));
          const tx = clamp((u / reach) * 0.3 + 0.5, 0, 0.999);
          const ty = clamp((v / reach) * 0.3 + 0.5, 0, 0.999);
          const texel = Math.floor(tx * CLOUD_SIZE) + Math.floor(ty * CLOUD_SIZE) * CLOUD_SIZE;
          const clump = tex.density[texel];
          const element = tex.hue[texel];
          const gas = 0.62 * limb * (clump * 0.8 + 0.12) * glowing * mix(1.5, 0.85, cooled);
          const sulphur = smooth(0.46, 0.56, element);
          heatTone(mix(0.86, 0.3, cooled), rgb);
          lr += gas * mix(rgb[0], mix(70, 255, sulphur), cooled);
          lg += gas * mix(rgb[1], mix(226, 70, sulphur), cooled);
          lb += gas * mix(rgb[2], mix(236, 54, sulphur), cooled);
        }
      }

      if (lr + lg + lb > 2) {
        red[i] += lr;
        green[i] += lg;
        blue[i] += lb;
      }
    }
  }

  const core = smooth(1.4, 2.2, age) * glowing;
  plot(space, cx, cy, 200 * core, 230 * core, 255 * core, 42);
}

function drawComet(space, f) {
  const n = stageOf(f, STAGES.comet);
  if (n <= 0 || n >= 1) return;
  const z = flyZ(n, 7);
  const x = -0.82 / z;
  const y = -0.46 / z;
  const fade = smooth(0, 0.08, n);
  const len = Math.hypot(x, y) + 1e-3;
  const dirX = x / len;
  const dirY = y / len;
  const reach = 1.5 / z;
  const scale = Math.min(1, 0.5 / z + 0.15);

  for (let i = 0; i < 900; i++) {
    const t = Math.pow(hash(i, 2.3), 1.5);
    const spread = (hash(i, 5.9) - 0.5) * (0.004 + t * 0.03) * reach;
    const lit = fade * (1 - t) * 5 * scale;
    plot(space, x + dirX * t * reach - dirY * spread, y + dirY * t * reach + dirX * spread, lit * 60, lit * 130, lit * 255);
  }
  for (let i = 0; i < 1500; i++) {
    const t = Math.pow(hash(i, 7.1), 1.4);
    const bend = t * t * 0.3 * reach;
    const spread = (hash(i, 4.3) - 0.5) * (0.01 + t * 0.2) * reach;
    const lit = fade * (1 - t) * 4 * scale;
    plot(space, x + dirX * t * reach * 0.8 - dirY * (bend + spread), y + dirY * t * reach * 0.8 + dirX * (bend + spread), lit * 255, lit * 226, lit * 170);
  }
  for (let i = 0; i < 260; i++) {
    const angle = hash(i, 1.1) * TAU;
    const out = Math.pow(hash(i, 3.2), 2) * 0.09 * scale;
    plot(space, x + Math.cos(angle) * out, y + Math.sin(angle) * out, 34 * fade, 50 * fade, 44 * fade);
  }
  plot(space, x, y, 255 * fade, 255 * fade, 255 * fade, 42);
}

function drawSun(space, f, x, y, radius, glare, fade) {
  const { cols, rows, unit, red, green, blue } = space;
  const [left, right, top, bottom] = bounds(space, x, y, Math.max(radius * 4.5, 0.7));

  for (let r = top; r <= bottom; r++) {
    const ny = (((r - rows / 2) * CELL) / unit - y) / radius;
    for (let c = left; c <= right; c++) {
      const nx = ((c - cols / 2) / unit - x) / radius;
      const d = Math.hypot(nx, ny);
      const i = r * cols + c;
      if (d < 1) {
        const nz = Math.sqrt(1 - d * d);
        sunSurface(Math.asin(ny), Math.atan2(nx, nz) + f * 0.05, f, rgb);
        dim(rgb, 0.42 + 0.58 * Math.pow(nz, 0.55));
        paint(space, i, rgb, fade);
      } else {
        const ca = nx / d;
        const sa = ny / d;
        const high = d - 1;
        const streamer = noise(ca * 2.6 + 9 + f * 0.03, sa * 2.6 + 4);
        const corona = Math.exp(-high / (0.18 + 0.72 * streamer * streamer)) * 1.1;
        const spike = noise(ca * 14 + f * 0.12, sa * 14);
        const flame = Math.exp(-high / (0.012 + 0.12 * smooth(0.55, 0.85, spike)));
        const glow = glare * Math.exp(-(high * radius) / 0.09) * 0.9;
        red[i] += fade * (245 * corona + 255 * flame + 255 * glow);
        green[i] += fade * (235 * corona + 70 * flame + 170 * glow);
        blue[i] += fade * (225 * corona + 50 * flame + 80 * glow);
      }
    }
  }
}

function sunRadius(space, f) {
  const p = clamp((f - SUN_AT) / (JOURNEY_END - SUN_AT));
  return 0.012 * Math.exp(Math.log(space.fill / 0.012) * Math.pow(p, 1.35));
}

function moonSpot(space, f) {
  const n = stageOf(f, STAGES.eclipse);
  if (n <= 0 || n >= 1) return null;
  const s = 2 * n - 1;
  return { x: s * s * s * (space.edge + 0.7), y: 0.015 + s * 0.05 };
}

function drawSolar(space, view, f) {
  if (f < SUN_AT) return;
  if (f >= JOURNEY_END) {
    drawSun(space, f, view.sunX, view.sunY, view.sunR, 0.5, 1);
    return;
  }
  const radius = sunRadius(space, f);
  const moon = moonSpot(space, f);
  const glare = moon ? smooth(radius * 0.25, radius * 2.2, Math.hypot(moon.x, moon.y)) : 1;
  drawSun(space, f, 0, 0, radius, glare, smooth(SUN_AT, SUN_AT + 2, f));
}

function drawMoon(space, f) {
  const moon = moonSpot(space, f);
  if (!moon) return;
  const angle = Math.atan2(Math.abs(moon.x), 0.35);
  const toward = moon.x > 0 ? -1 : 1;
  const radius = sunRadius(space, f) * 1.07;
  drawBody(space, MOON, f, moon.x, moon.y, radius, toward * Math.sin(angle), 0, -Math.cos(angle) * 0.25 + 0.15, 1, 0);
}

function bangSolid(f) {
  const b = f - STAGES.bang[0];
  return b < 0 || b > 9 ? 0 : smooth(0, 0.4, b) * smooth(8.8, 7, b);
}

function drawBang(space, f) {
  const b = f - STAGES.bang[0];
  const end = STAGES.bang[1];
  if (b < 0 || b >= end) return;
  const { cols, rows, unit, red, green, blue, mark, clouds: tex } = space;
  const { mottle, web } = tex;
  const front = space.fill * 1.25 * smooth(0, 1.2, b) + 0.02;
  const grow = 1 + b * 0.32;
  const cooled = smooth(0.5, 5, b);
  const bold = smooth(2, 5.5, b);
  const relic = smooth(4.4, 6, b) * smooth(9, 7.2, b);
  const flash = Math.exp(-b * 2.6) * 3;
  const late = smooth(7.2, 9.5, b) * smooth(15.5, 12.5, b);
  const dive = 1 + Math.max(b - 7, 0) * 0.17;

  for (let r = 0; r < rows; r++) {
    const v = ((r - rows / 2) * CELL) / unit;
    for (let c = 0; c < cols; c++) {
      const u = (c - cols / 2) / unit;
      const i = r * cols + c;
      const d = Math.hypot(u, v);
      let lr = 0;
      let lg = 0;
      let lb = 0;

      if (b < 9.2) {
        const inside = smooth(front, front * 0.86, d);
        const m = mottle[cloudIndex(u * 0.3 / grow + 0.5, v * 0.3 / grow + 0.5)];
        const grain = clamp(0.5 + (m - 0.5) * mix(1.2, 2, bold));
        const heat = cooled * (0.82 + 0.36 * grain);
        const hot = clamp(heat);
        const rim = gauss(d - front, 0.1 + front * 0.1) * smooth(3, 0.8, b) * 1.6;
        const fire = (mix(1.5, 0.82, cooled) + (grain - 0.5) * bold * 0.8) * smooth(9, 6.4, b);
        const tr = hot < 0.5 ? 255 : mix(255, 214, (hot - 0.5) * 2);
        const tg = hot < 0.5 ? mix(248, 176, hot * 2) : mix(176, 58, (hot - 0.5) * 2);
        const tb = hot < 0.5 ? mix(226, 66, hot * 2) : mix(66, 34, (hot - 0.5) * 2);
        lr = inside * tr * fire + rim * 255 + flash * 255;
        lg = inside * tg * fire + rim * 226 + flash * 244;
        lb = inside * tb * fire + rim * 176 + flash * 226;

        if (relic > 0) {
          const cold = smooth(0.62, 0.3, grain);
          const warm = smooth(0.42, 0.8, grain);
          const seenR = mix(mix(214, 226, warm), 60, cold);
          const seenG = mix(mix(196, 112, warm), 110, cold);
          const seenB = mix(mix(150, 62, warm), 196, cold);
          lr = mix(lr, seenR * 0.82, relic);
          lg = mix(lg, seenG * 0.82, relic);
          lb = mix(lb, seenB * 0.82, relic);
        }
      }

      if (late > 0) {
        const strand = web[cloudIndex(u * 0.24 / dive + 0.31, v * 0.24 / dive + 0.57)];
        const reveal = late * clamp(strand * 1.25);
        const knot = smooth(0.9, 1.5, strand) * late;
        lr += reveal * 92 + knot * 255;
        lg += reveal * 70 + knot * 210;
        lb += reveal * 226 + knot * 150;
        const seed = space.speck[i] + 0.07;
        if (seed > 0.125) {
          const birth = 7.4 + ((seed - 0.125) / 0.015) * 7;
          const pop = smooth(birth, birth + 0.5, b) * smooth(15.5, 13, b);
          if (pop > 0) {
            const shine = 1.5 * Math.exp(-(b - birth) * 1.2) + 0.65;
            lr += pop * shine * 190;
            lg += pop * shine * 216;
            lb += pop * shine * 255;
            mark[i] = 42;
          }
        }
      }

      red[i] += lr;
      green[i] += lg;
      blue[i] += lb;
    }
  }
}

function drawRebirth(space, t, f) {
  const b = f - STAGES.bang[0];
  const end = STAGES.bang[1];
  if (b < 12 || b >= end + 2) return;
  const beacon = smooth(19.5, 21.5, b) * smooth(end + 2, end, b);
  if (beacon > 0) addGlow(space, 0, 0, 0.012 + 0.012 * beacon, 620 * beacon, 560 * beacon, 420 * beacon);
  if (b >= end) return;
  const form = smooth(12, 18.5, b);
  const fade = smooth(12, 14, b) * smooth(end, end - 1.2, b);
  const rush = b > 19 ? Math.exp(Math.pow(b - 19, 2) * 0.12) : 1;
  const scale = (0.22 + 0.72 * smooth(12, 19, b)) * rush;
  const roll = -0.45 + t * 0.012;
  const aimX = 0.5 * Math.cos(roll) + 0.12 * Math.sin(roll);
  const aimY = 0.5 * Math.sin(roll) - 0.12 * Math.cos(roll);
  const onto = smooth(18.5, 21, b);
  plotGalaxy(space, { x: -aimX * scale * onto, y: -aimY * scale * onto, form, scale }, t, fade);
}

function ringAt(x, y, open) {
  const r = Math.hypot(x, y / open);
  if (r < 1.3 || r > 2.3) return 0;
  if (r > 1.84 && r < 1.92) return 0;
  return (0.8 + 0.2 * Math.sin(r * 38)) * smooth(1.3, 1.4, r) * smooth(2.3, 2.15, r);
}

function paint(space, i, source, k) {
  space.red[i] = source[0] * k;
  space.green[i] = source[1] * k;
  space.blue[i] = source[2] * k;
  space.mark[i] = 0;
}

function spot(space, x, y, radius, tint, shade) {
  const { cols, rows, unit } = space;
  const [left, right, top, bottom] = bounds(space, x, y, radius);
  for (let r = top; r <= bottom; r++) {
    const ny = (((r - rows / 2) * CELL) / unit - y) / radius;
    for (let c = left; c <= right; c++) {
      const nx = ((c - cols / 2) / unit - x) / radius;
      if (nx * nx + ny * ny <= 1.2) paint(space, r * cols + c, tint, shade);
    }
  }
}

function drawBody(space, world, f, px, py, radius, lightX, lightY, lightZ, fade, turn) {
  const { cols, rows, unit } = space;
  const [left, right, top, bottom] = bounds(space, px, py, radius * world.reach * (world.halo ? 1.25 : 1));
  const cos = Math.cos(world.tilt);
  const sin = Math.sin(world.tilt);
  const ringColor = [206, 180, 138];
  const flat = Math.hypot(lightX, lightY) + 1e-3;
  const throwLength = (2.6 * flat) / Math.max(lightZ, 0.12);
  const ambient = world.ambient || 0.05;

  for (let r = top; r <= bottom; r++) {
    const ny = (((r - rows / 2) * CELL) / unit - py) / radius;
    for (let c = left; c <= right; c++) {
      const nx = ((c - cols / 2) / unit - px) / radius;
      const i = r * cols + c;
      const d = Math.hypot(nx, ny);
      const rx = nx * cos + ny * sin;
      const ry = ny * cos - nx * sin;
      const ring = world.rings ? ringAt(rx, ry, world.open) : 0;

      if (d < 1 && !(ring > 0 && ry > 0)) {
        const nz = Math.sqrt(1 - d * d);
        const lat = Math.asin(clamp(ry, -1, 1));
        const lon = Math.atan2(rx, nz) + f * world.spin + turn;
        world.surface(lat, lon, f, rgb);
        const sun = clamp(nx * lightX + ny * lightY + nz * lightZ);
        dim(rgb, ambient + (1 - ambient) * Math.pow(sun, 0.75));
        if (world.night && sun < 0.25) world.night(lat, lon, f, 1 - sun * 4, rgb);
        if (world.halo) tone(rgb, world.halo[0], world.halo[1], world.halo[2], Math.pow(1 - nz, 3) * sun);
        paint(space, i, rgb, fade);
      } else if (ring > 0) {
        const along = -(nx * lightX + ny * lightY) / flat;
        const beside = Math.abs(nx * lightY - ny * lightX) / flat;
        const shadow = along > 0 && along < throwLength ? mix(0.12, 1, smooth(0.84, 1.04, beside)) : 1;
        paint(space, i, ringColor, fade * ring * shadow);
      } else if (world.halo && d >= 1) {
        const glow = Math.exp(-(d - 1) / world.haloWidth) * fade;
        space.red[i] += world.halo[0] * glow;
        space.green[i] += world.halo[1] * glow;
        space.blue[i] += world.halo[2] * glow;
      }
    }
  }
}

function drawWorld(space, world, f) {
  const p = (f - world.at) / world.span;
  if (p <= 0 || p >= 1) return;
  const side = world.side * (world.size * world.reach * 1.25 + 0.1);
  const fade = smooth(0, 0.12, p);

  if (world.sling) {
    const path = sling(p, 0.8, 7, space.edge);
    const azimuth = mix(-0.7, 1.2, p);
    world.open = 0.14 + 0.26 * (1 - path.away);
    world.tilt = -0.34 + 0.28 * path.s;
    const light = fade * smooth(1, 0.92, p);
    drawBody(space, world, f, path.x, 0.02 - 0.1 * path.s, world.size / path.z, Math.sin(azimuth) * 0.95, -0.28, Math.cos(azimuth) * 0.95, light, p * 2);
    return;
  }

  const z = flyZ(p);
  const offset = Math.hypot(side, world.lift);
  const px = side / z;
  const py = world.lift / z;
  const radius = world.size / z;
  const angle = Math.atan2(offset, z);
  const swing = 0.3 + angle * 0.9;
  drawBody(space, world, f, px, py, radius, (-side / offset) * Math.sin(swing), (-world.lift / offset) * Math.sin(swing), Math.cos(swing), fade, world.side * angle);

  if (!world.moons) return;
  for (const moon of world.moons) {
    const around = moon.phase + f * moon.speed;
    const mx = Math.cos(around) * moon.orbit;
    const my = Math.sin(around) * moon.orbit * 0.1;
    if (Math.sin(around) < 0 && Math.hypot(mx, my) < 1) continue;
    spot(space, px + mx * radius, py + my * radius, Math.max(moon.size * radius, 0.008), moon.tint, fade);
  }
}

function drawEarthApproach(space, f) {
  const n = (f - EARTH_AT) / ENTRY_TIME;
  if (n <= 0 || n >= 1) return;
  const radius = 0.03 * Math.exp(Math.pow(n, 1.4) * Math.log(300));
  drawBody(space, EARTH, f, 0, radius * 0.86 * smooth(0.35, 1, n), radius, -0.55, -0.3, 0.78, smooth(0, 0.1, n), 0);
}

function drawEarthDeparture(space, f) {
  const n = (f - CLIMB_AT) / CLIMB_TIME;
  if (n < 0 || n >= 1) return;
  const radius = mix(7, 1.2, Math.pow(n, 0.7));
  const limb = mix(-0.5, space.fill + 0.2, n * n);
  drawBody(space, EARTH_LIMB, f, 0, limb + radius, radius, 0, -0.66, -0.75, 1, 0);
}

function drawBelt(space, f, dt) {
  const fade = smooth(BELT_AT, BELT_AT + 1, f) * smooth(BELT_AT + BELT_TIME, BELT_AT + BELT_TIME - 1, f);
  if (fade <= 0) return;
  const { cols, rows, unit } = space;
  for (const rock of space.rocks) {
    rock.z -= dt * 1.3;
    if (rock.z < 0.15) rock.z += 5;
    const size = rock.size / rock.z;
    const x = rock.x / rock.z;
    const y = rock.y / rock.z;
    const reach = Math.ceil(size * unit) + 1;
    const col = Math.round(x * unit + cols / 2);
    const row = Math.round((y * unit) / CELL + rows / 2);
    const tall = Math.ceil(reach / CELL);
    for (let r = Math.max(0, row - tall); r <= Math.min(rows - 1, row + tall); r++) {
      for (let c = Math.max(0, col - reach); c <= Math.min(cols - 1, col + reach); c++) {
        const nx = ((c - cols / 2) / unit - x) / size;
        const ny = (((r - rows / 2) * CELL) / unit - y) / size;
        const lump = 1 + (noise(nx * 2 + rock.x * 9, ny * 2 + rock.y * 9) - 0.5) * 0.7;
        const d = Math.hypot(nx, ny) / lump;
        if (d > 1) continue;
        const light = clamp(0.25 + (-nx * 0.5 - ny * 0.4 + 0.5) * 0.8) * rock.shade * fade;
        rgb[0] = 196;
        rgb[1] = 170;
        rgb[2] = 142;
        paint(space, r * cols + c, rgb, light);
      }
    }
  }
}

function drawCosmos(space, view, t, f, dt) {
  space.red.fill(0);
  space.green.fill(0);
  space.blue.fill(0);
  space.mark.fill(0);

  drawNebula(space, f);
  drawGalaxy(space, view, t, f);
  drawStars(space, f, dt);
  drawCluster(space, f);
  drawYoungStar(space, f);
  drawBinary(space, f);
  drawPulsar(space, f);
  drawPlanetary(space, f);
  drawSupernova(space, f);
  drawMerger(space, f);
  drawBang(space, f);
  drawRebirth(space, t, f);
  drawBlackHole(space, f);
  drawComet(space, f);
  drawSolar(space, view, f);
  for (let w = JOURNEY.length - 1; w >= 0; w--) drawWorld(space, JOURNEY[w], f);
  drawEarthApproach(space, f);
  drawEarthDeparture(space, f);
  drawMoon(space, f);
  drawBelt(space, f, dt);

  if (view.veil > 0) {
    for (let i = 0; i < space.n; i++) {
      space.red[i] += 8 * view.veil;
      space.green[i] += 34 * view.veil;
      space.blue[i] += 130 * view.veil;
    }
  }
}

function drawVeil(space, amount, t) {
  const { cols, rows, unit, red, green, blue, mark, clouds: tex } = space;
  const { density } = tex;
  for (let r = 0; r < rows; r++) {
    const v = ((r - rows / 2) * CELL) / unit;
    for (let c = 0; c < cols; c++) {
      const u = (c - cols / 2) / unit;
      const puff = (density[cloudIndex(u * 0.2 + 0.3 + t * 0.03, v * 0.2 + 0.4 - t * 0.09)] + density[cloudIndex(u * 0.5 + 0.1 - t * 0.05, v * 0.5 + 0.7 - t * 0.2)]) / 2;
      const cover = clamp((puff - 1 + amount * 1.5) * 3.2);
      if (cover <= 0) continue;
      const i = r * cols + c;
      const light = 196 + puff * 60;
      red[i] = mix(red[i], light, cover);
      green[i] = mix(green[i], light * 1.01, cover);
      blue[i] = mix(blue[i], light * 1.04, cover);
      mark[i] = 0;
    }
  }
}

function resolve(space, frame, solid = 0) {
  for (let i = 0; i < space.n; i++) {
    const r = space.red[i];
    const g = space.green[i];
    const b = space.blue[i];
    const peak = Math.max(r, g, b);
    if (peak < 16) {
      frame.ch[i] = 32;
      frame.r[i] = frame.g[i] = frame.b[i] = 0;
      frame.backR[i] = frame.backG[i] = frame.backB[i] = 0;
      continue;
    }
    const v = 1 - Math.exp(-peak / 150);
    const gain = (v * 255) / peak;
    const exposed = 1 - Math.exp(-(0.3 * r + 0.45 * g + 0.25 * b) / 110);
    const light = solid > 0.5 ? Math.round(exposed * 13) / 13 : exposed;
    const body = Math.max(solid, space.mark[i] ? 0 : 0.5 * smooth(36, 180, peak));
    const lift = 1 + 0.32 * body;
    frame.ch[i] = space.mark[i] || RAMP.charCodeAt(Math.round(clamp(Math.pow(light, 1.2) + space.speck[i]) * (RAMP.length - 1)));
    frame.r[i] = Math.min(255, r * gain * lift);
    frame.g[i] = Math.min(255, g * gain * lift);
    frame.b[i] = Math.min(255, b * gain * lift);
    frame.backR[i] = Math.min(255, r * gain * 0.66 * body);
    frame.backG[i] = Math.min(255, g * gain * 0.66 * body);
    frame.backB[i] = Math.min(255, b * gain * 0.66 * body);
  }
}

function dissolve(frame, other, k) {
  for (let i = 0; i < frame.ch.length; i++) {
    frame.r[i] = mix(frame.r[i], other.r[i], k);
    frame.g[i] = mix(frame.g[i], other.g[i], k);
    frame.b[i] = mix(frame.b[i], other.b[i], k);
    frame.backR[i] = mix(frame.backR[i], other.backR[i], k);
    frame.backG[i] = mix(frame.backG[i], other.backG[i], k);
    frame.backB[i] = mix(frame.backB[i], other.backB[i], k);
    if (hash(i, 2.9) < k) frame.ch[i] = other.ch[i];
  }
}

function trackX(z) {
  return 512 + 70 * Math.sin(z * 0.0065) + 30 * Math.sin(z * 0.017 + 1);
}

function cityAt(x, z) {
  const old = gauss(Math.hypot(x - trackX(640) - 20, z - 640), 150);
  const metro = 1.05 * gauss(Math.hypot(x - 470, z - 4390), 300);
  const sprawl = 0.5 * smooth(4190, 4260, z) * smooth(4640, 4570, z) * smooth(0.35, 0.6, noise(x * 0.012 + 7, z * 0.012));
  return clamp(Math.max(old, metro, sprawl));
}

const band = (z, a, b, c, d) => smooth(a, b, z) * smooth(d, c, z);
const desertAt = (z) => band(z, 1250, 1320, 1870, 1930);
const chinaAt = (z) => band(z, 2340, 2420, 2930, 2990);
const japanAt = (z) => band(z, 3600, 3660, 4190, 4250);
const arcticAt = (z) => smooth(5120, 5220, z);
const deckAt = (z) => Math.max(band(z, 760, 860, 1180, 1280), band(z, 1840, 1940, 2260, 2360), band(z, 4640, 4740, 5060, 5160));
const wallX = (z) => trackX(z) + 150 + 42 * Math.sin(z * 0.013) + 18 * Math.sin(z * 0.031);
const PYRAMIDS = [[205, 1760, 74], [315, 1800, 58], [395, 1830, 36]].map(([off, z, half]) => ({ x: trackX(z) + off, z, half }));
const SPIRE = { x: trackX(640) + 54, z: 640 };
const FUJI = { x: trackX(4060) - 420, z: 4060, base: 345, peak: 262 };

function fujiReach(x, z) {
  const dx = x - FUJI.x;
  return Math.hypot(dx - WORLD_W * WORLD_STEP * Math.round(dx / (WORLD_W * WORLD_STEP)), z - FUJI.z);
}

function pyramidAt(x, z) {
  let top = 0;
  for (const { x: px, z: pz, half } of PYRAMIDS) {
    top = Math.max(top, half - Math.max(Math.abs(x - px), Math.abs(z - pz)));
  }
  return top;
}

function karstAt(x, z) {
  const size = 68;
  const cellX = Math.floor(x / size);
  const cellZ = Math.floor(z / size);
  let top = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cellX + dx;
      const gz = cellZ + dz;
      const away = Math.hypot(x - (gx + hash(gx, gz)) * size, z - (gz + hash(gz, gx + 9)) * size);
      const radius = 30 + hash(gx + 3, gz) * 26;
      top = Math.max(top, (90 + hash(gx, gz + 5) * 140) * Math.exp(-Math.pow(away / radius, 2.4)));
    }
  }
  return top;
}

let world = null;

function bakeWorld() {
  if (world) return world;
  const n = WORLD_W * WORLD_L;
  const ground = new Float32Array(n);
  const cities = new Float32Array(n);
  const towers = new Uint8Array(n);
  const lamps = new Uint8Array(n);
  const kind = new Uint8Array(n);
  const seed = new Uint8Array(n);
  const tintR = new Uint8Array(n);
  const tintG = new Uint8Array(n);
  const tintB = new Uint8Array(n);
  const shade = new Float32Array(n);
  const shore = new Float32Array(WORLD_W);
  for (let i = 0; i < WORLD_W; i++) shore[i] = (fbm(i * WORLD_STEP * 0.004 + 3, 1.7) - 0.5) * 170;

  for (let j = 0; j < WORLD_L; j++) {
    const z = j * WORLD_STEP;
    const path = trackX(z);
    const bend = 36 * Math.sin(z * 0.01);
    const range = smooth(400, 110, z);
    const desert = desertAt(z);
    const china = chinaAt(z);
    const arctic = arcticAt(z);
    const deck = deckAt(z);
    const stream = Math.max(smooth(800, 740, z), desert);
    const wall = wallX(z);
    for (let i = 0; i < WORLD_W; i++) {
      const x = i * WORLD_STEP;
      const at = z + shore[i];
      const away = Math.abs(x - path);
      const sea = band(at, 2980, 3040, 3580, 3640);
      let h = 6 + 16 * fbm(x * 0.012 + 5, z * 0.012 + 9);
      if (range > 0) {
        const ridge = 1 - Math.abs(2 * fbm(x * 0.0055 + 1, z * 0.0055 + 2) - 1);
        h += range * ((Math.pow(ridge, 1.8) * 250 + 90 * smooth(70, 200, away)) * mix(0.3, 1, smooth(40, 130, away)) + (noise(x * 0.045, z * 0.045) - 0.5) * 34 + (noise(x * 0.11 + 4, z * 0.11) - 0.5) * 14);
      }
      const river = Math.abs(x - path - bend);
      if (river < 30 && stream > 0) h = mix(h, mix(-3, h, smooth(12, 30, river)), stream);
      if (desert > 0) {
        const dune = Math.abs(Math.sin(x * 0.026 + 6 * fbm(x * 0.006 + 2, z * 0.006 + 8)));
        h = mix(h, (8 + dune * 13) * mix(0.3, 1, smooth(26, 70, river)), desert);
        if (river < 16 * smooth(0.3, 0.8, desert)) h = -3;
        const stone = pyramidAt(x, z);
        if (stone > 0) h = Math.max(h, 8 + stone * 1.3);
      }
      if (china > 0) {
        const fromWall = Math.abs(x - wall);
        h += china * (karstAt(x, z) * smooth(34, 110, away) * smooth(18, 60, fromWall) + 74 * gauss(fromWall, 70));
        if (fromWall < 5 && china > 0.5) h += 8 + (z % 84 < 12 ? 11 : 0);
      }
      const fromFuji = fujiReach(x, z);
      if (fromFuji < FUJI.base) {
        const slope = 1 - fromFuji / FUJI.base;
        const around = Math.atan2(z - FUJI.z, x - FUJI.x);
        const gully = noise(Math.cos(around) * 5 + 2, Math.sin(around) * 5 + 5) - 0.5;
        h += FUJI.peak * Math.min(Math.pow(slope, 1.7), 0.9) * (1 + gully * 0.1);
      }
      if (arctic > 0) {
        const ridge = 1 - Math.abs(2 * fbm(x * 0.0055 + 31, z * 0.0055 + 12) - 1);
        const peaks = (Math.pow(ridge, 1.8) * 120 + 30 * smooth(90, 240, away) + (noise(x * 0.05, z * 0.05) - 0.5) * 26) * smooth(40, 170, away);
        h = mix(h, peaks - 4, arctic);
      }
      const city = cityAt(x, z) * (1 - smooth(0, 0.03, sea)) * (1 - desert) * (1 - deck) * (1 - china) * (1 - arctic) * smooth(FUJI.base - 40, FUJI.base, fromFuji) * mix(1, smooth(30, 46, river), stream);
      h = mix(h, 4, smooth(0.08, 0.35, city));
      const idx = j * WORLD_W + i;
      ground[idx] = mix(h, -16, sea);
      cities[idx] = city;
    }
  }

  const heightAt = (i, j) => ground[clamp(j, 0, WORLD_L - 1) * WORLD_W + ((i + WORLD_W) % WORLD_W)];

  for (let j = 0; j < WORLD_L; j++) {
    for (let i = 0; i < WORLD_W; i++) {
      const idx = j * WORLD_W + i;
      const h = ground[idx];
      if (h <= 0) {
        kind[idx] = 1;
        tintR[idx] = 176;
        tintG[idx] = 156;
        tintB[idx] = 118;
        continue;
      }
      const x = i * WORLD_STEP;
      const z = j * WORLD_STEP;
      const slope = Math.hypot(heightAt(i + 1, j) - heightAt(i - 1, j), heightAt(i, j + 1) - heightAt(i, j - 1)) / (2 * WORLD_STEP);
      const wild = fbm(x * 0.02 + 11, z * 0.02 + 3);
      const patch = hash(Math.floor(x / 44), Math.floor(z / 32));
      let r = mix(24, 60, wild);
      let g = mix(58, 104, wild);
      let b = mix(30, 52, wild);
      const farm = smooth(0.62, 0.42, wild) * smooth(230, 360, z);
      if (farm > 0) {
        const field = patch < 0.34 ? [170, 158, 78] : patch < 0.68 ? [96, 136, 62] : [140, 110, 70];
        r = mix(r, field[0], farm);
        g = mix(g, field[1], farm);
        b = mix(b, field[2], farm);
      }
      const rock = Math.max(smooth(0.5, 0.95, slope), smooth(70, 110, h));
      r = mix(r, 116, rock);
      g = mix(g, 106, rock);
      b = mix(b, 98, rock);
      const snow = smooth(105, 150, h + (wild - 0.5) * 60) * smooth(1.2, 0.6, slope);
      r = mix(r, 244, snow);
      g = mix(g, 248, snow);
      b = mix(b, 252, snow);
      const sand = smooth(7, 3, h) * smooth(600, 700, z);
      r = mix(r, 214, sand);
      g = mix(g, 192, sand);
      b = mix(b, 146, sand);
      const desert = desertAt(z);
      if (desert > 0) {
        const ripple = 0.9 + 0.2 * noise(x * 0.09, z * 0.3);
        const bank = smooth(76, 34, Math.abs(x - trackX(z) - 36 * Math.sin(z * 0.01)));
        r = mix(mix(r, 178 * ripple, desert), 52, bank);
        g = mix(mix(g, 128 * ripple, desert), 120, bank);
        b = mix(mix(b, 78 * ripple, desert), 50, bank);
        const stone = pyramidAt(x, z);
        if (stone > 0) {
          const course = 0.95 + 0.07 * (Math.floor(h / 12) % 2);
          r = 196 * course;
          g = 172 * course;
          b = 126 * course;
        }
      }
      const china = chinaAt(z);
      if (china > 0) {
        const cliff = smooth(0.6, 1.3, slope);
        r = mix(r, mix(48, 128, cliff), china);
        g = mix(g, mix(138, 132, cliff), china);
        b = mix(b, mix(74, 112, cliff), china);
        const paddy = smooth(36, 16, h) * china;
        if (paddy > 0) {
          const step = Math.floor(h / 2.4) & 1;
          r = mix(r, step ? 74 : 118, paddy);
          g = mix(g, step ? 136 : 176, paddy);
          b = mix(b, step ? 72 : 104, paddy);
        }
        if (Math.abs(x - wallX(z)) < 5.5 && china > 0.5) {
          const brick = 0.86 + 0.2 * (Math.floor(z / 7) & 1);
          r = 196 * brick;
          g = 176 * brick;
          b = 142 * brick;
        }
      }
      const japan = japanAt(z);
      if (japan > 0) {
        if (h < 34 && noise(x * 0.028 + 3, z * 0.028 + 8) > 0.5) {
          const bloom = 0.9 + 0.16 * noise(x * 0.09, z * 0.09);
          r = mix(r, 248 * bloom, japan);
          g = mix(g, 168 * bloom, japan);
          b = mix(b, 196 * bloom, japan);
          towers[idx] = 3 + hash(i, j) * 3;
        }
      }
      const fromFuji = fujiReach(x, z);
      if (fromFuji < FUJI.base) {
        const around = Math.atan2(z - FUJI.z, x - FUJI.x);
        const finger = noise(Math.cos(around) * 9 + 7, Math.sin(around) * 9 + 3) * 0.6 + noise(Math.cos(around) * 23 + 1, Math.sin(around) * 23 + 6) * 0.4;
        const rock = smooth(26, 62, h);
        r = mix(r, 66, rock);
        g = mix(g, 72, rock);
        b = mix(b, 70, rock);
        const cap = smooth(0, 10, h - 118 - (finger - 0.5) * 120);
        r = mix(r, 252, cap);
        g = mix(g, 252, cap);
        b = mix(b, 250, cap);
      }
      const arctic = arcticAt(z);
      if (arctic > 0) {
        const bare = smooth(0.8, 1.4, slope);
        r = mix(r, mix(226, 72, bare), arctic);
        g = mix(g, mix(236, 80, bare), arctic);
        b = mix(b, mix(248, 98, bare), arctic);
      }

      const city = cities[idx];
      if (city > 0.06) {
        const cellI = i % 16;
        const cellJ = j % 16;
        const blockI = Math.floor(i / 16);
        const blockJ = Math.floor(j / 16);
        const avenue = (blockI % 5 === 0 && cellI < 3) || (blockJ % 4 === 0 && cellJ < 3);
        const lane = Math.abs(x - trackX(z));
        const old = z < 1200;
        if (lane < 15) {
          kind[idx] = 4;
          r = g = 58;
          b = 64;
          lamps[idx] = lane > 11 && hash(Math.floor(z / 10), x > trackX(z) ? 1 : 2) > 0.4 ? 255 : 0;
        } else if (cellI < 3 || cellJ < 3) {
          kind[idx] = avenue ? 4 : 2;
          r = g = 66;
          b = 72;
          lamps[idx] = (hash(Math.floor(i / 3), Math.floor(j / 3)) > 0.35 ? 255 : 90) * mix(0.35, 1, city);
        } else if (hash(blockI, blockJ) < 0.06) {
          r = 58;
          g = 112;
          b = 56;
        } else {
          const lotI = cellI > 9 ? 1 : 0;
          const lotJ = cellJ > 9 ? 1 : 0;
          const lot = hash(blockI * 2 + lotI + 0.5, blockJ * 2 + lotJ + 0.5);
          if (lot < city * 1.8 && cellI !== 9 && cellJ !== 9) {
            const tall = hash(lot * 91, 3.3);
            const clear = old ? 1 : mix(0.75, 1, smooth(30, 70, lane));
            towers[idx] = old ? 6 + tall * 11 : Math.min(150, (9 + Math.pow(tall, 2.4) * (24 + 124 * city * city)) * clear);
            kind[idx] = 3;
            seed[idx] = lot * 255;
            const paint = hash(lot * 37, 8.1);
            if (old) {
              r = paint < 0.5 ? 188 : 142;
              g = paint < 0.5 ? 96 : 138;
              b = paint < 0.5 ? 66 : 132;
            } else {
              r = paint < 0.4 ? 150 : paint < 0.7 ? 104 : 196;
              g = paint < 0.4 ? 150 : paint < 0.7 ? 134 : 178;
              b = paint < 0.4 ? 156 : paint < 0.7 ? 164 : 150;
            }
          } else {
            r = 96;
            g = 94;
            b = 88;
            lamps[idx] = 50 * city;
          }
        }
      }
      const spire = Math.max(Math.abs(x - SPIRE.x), Math.abs(z - SPIRE.z));
      if (spire < 20) {
        towers[idx] = spire < 1.8 ? 170 : Math.max(0, -32 * Math.log((spire - 1.2) / 19));
        kind[idx] = 5;
        r = 106;
        g = 92;
        b = 78;
      }
      tintR[idx] = r;
      tintG[idx] = g;
      tintB[idx] = b;
    }
  }

  const reach = Math.hypot(-0.78, 0.52, -0.2);
  const sunX = -0.78 / reach;
  const sunY = 0.52 / reach;
  const sunZ = -0.2 / reach;
  const topAt = (i, j) => {
    const wrapped = (i + WORLD_W) % WORLD_W;
    const row = clamp(j, 0, WORLD_L - 1);
    const idx = row * WORLD_W + wrapped;
    return Math.max(ground[idx], 0) + towers[idx];
  };
  for (let j = 0; j < WORLD_L; j++) {
    for (let i = 0; i < WORLD_W; i++) {
      const top = topAt(i, j);
      const dx = (topAt(i + 1, j) - topAt(i - 1, j)) / (2 * WORLD_STEP);
      const dz = (topAt(i, j + 1) - topAt(i, j - 1)) / (2 * WORLD_STEP);
      const lift = Math.sqrt(1 + dx * dx + dz * dz);
      if (fujiReach(i * WORLD_STEP, j * WORLD_STEP) < FUJI.base) {
        shade[j * WORLD_W + i] = clamp((-dx * 0.68 + 0.5 + dz * 0.54) / lift);
        continue;
      }
      let light = clamp((-dx * sunX + sunY - dz * sunZ) / lift);
      for (let s = 1; s <= 8; s++) {
        if (topAt(i - Math.round(s * 3.8), j - Math.round(s)) > top + s * 8 * 0.6) {
          light *= 0.35;
          break;
        }
      }
      shade[j * WORLD_W + i] = light;
    }
  }

  const blurW = WORLD_W >> 3;
  const blurL = WORLD_L >> 3;
  let blur = new Float32Array(blurW * blurL);
  for (let j = 0; j < WORLD_L; j++) {
    for (let i = 0; i < WORLD_W; i++) {
      const idx = j * WORLD_W + i;
      blur[(j >> 3) * blurW + (i >> 3)] += (lamps[idx] + towers[idx] * 3) / (64 * 255);
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(blurW * blurL);
    for (let j = 0; j < blurL; j++) {
      for (let i = 0; i < blurW; i++) {
        let sum = 0;
        for (let dj = -2; dj <= 2; dj++) {
          for (let di = -2; di <= 2; di++) {
            sum += blur[clamp(j + dj, 0, blurL - 1) * blurW + clamp(i + di, 0, blurW - 1)];
          }
        }
        next[j * blurW + i] = sum / 25;
      }
    }
    blur = next;
  }

  world = { ground, towers, lamps, kind, seed, tintR, tintG, tintB, shade, blur, blurW };
  return world;
}

let waves = null;

function bakeWaves() {
  if (waves) return waves;
  const swell = [[3, 2, 1, 0.4], [-2, 5, 0.7, 2.1], [5, 3, 0.5, 4.4], [-7, 4, 0.34, 1.3], [4, 9, 0.28, 5.2], [11, -6, 0.2, 3.1], [-13, 9, 0.14, 0.7], [17, 12, 0.1, 2.6]];
  const height = new Float32Array(WAVE_SIZE * WAVE_SIZE);
  const slopeX = new Float32Array(WAVE_SIZE * WAVE_SIZE);
  const slopeZ = new Float32Array(WAVE_SIZE * WAVE_SIZE);
  for (let j = 0; j < WAVE_SIZE; j++) {
    for (let i = 0; i < WAVE_SIZE; i++) {
      let h = 0;
      for (const [kx, kz, amp, phase] of swell) {
        const s = Math.sin(((kx * i + kz * j) / WAVE_SIZE) * TAU + phase) * 0.5 + 0.5;
        h += amp * (Math.pow(s, 2.2) * 2 - 0.7);
      }
      height[j * WAVE_SIZE + i] = h * 0.5;
    }
  }
  const mask = WAVE_SIZE - 1;
  for (let j = 0; j < WAVE_SIZE; j++) {
    for (let i = 0; i < WAVE_SIZE; i++) {
      slopeX[j * WAVE_SIZE + i] = (height[j * WAVE_SIZE + ((i + 1) & mask)] - height[j * WAVE_SIZE + ((i - 1) & mask)]) / 2;
      slopeZ[j * WAVE_SIZE + i] = (height[((j + 1) & mask) * WAVE_SIZE + i] - height[((j - 1) & mask) * WAVE_SIZE + i]) / 2;
    }
  }
  waves = { height, slopeX, slopeZ };
  return waves;
}

const FLIGHT = [
  [-3, -80, 170, 0.1],
  [0, 40, 150, 0.08],
  [4, 250, 130, 0.1],
  [7, 420, 84, 0.16],
  [10, 545, 38, 0.1],
  [12.5, 650, 44, 0.1],
  [14.5, 730, 90, 0.12],
  [16.5, 810, 230, 0.16],
  [18.5, 890, 345, 0.22],
  [22, 1190, 345, 0.24],
  [24, 1310, 250, 0.3],
  [26, 1400, 92, 0.02],
  [28, 1480, 40, -0.1],
  [31, 1600, 32, -0.16],
  [33.5, 1700, 32, -0.14],
  [35, 1770, 60, -0.02],
  [36.5, 1850, 120, 0.1],
  [38, 1920, 250, 0.18],
  [40, 2000, 345, 0.22],
  [43.5, 2290, 345, 0.24],
  [45.5, 2400, 220, 0.26],
  [47.5, 2490, 100, 0.16],
  [51, 2650, 66, 0.1],
  [55, 2840, 62, 0.1],
  [57, 2930, 40, 0.08],
  [59, 3010, 13, 0.05],
  [61, 3090, 4.2, 0.02],
  [68, 3440, 4.2, 0.02],
  [70, 3540, 12, -0.06],
  [72, 3640, 36, -0.14],
  [76, 3790, 44, -0.24],
  [79, 3930, 50, -0.2],
  [81.5, 4080, 46, -0.02],
  [83, 4170, 40, 0.06],
  [84.5, 4250, 31, 0.05],
  [90, 4520, 31, 0.05],
  [92, 4600, 90, 0.14],
  [94, 4680, 230, 0.18],
  [96, 4770, 345, 0.22],
  [99, 5030, 345, 0.24],
  [101, 5140, 230, 0.24],
  [103, 5240, 110, 0.06],
  [105, 5330, 60, -0.12],
  [110, 5570, 70, -0.12],
  [112, 5660, 230, 0.06],
  [114, 5730, 420, 0.3],
  [116, 5800, 500, 0.34],
  [119, 5880, 540, 0.34],
];
const SUN_PATH = [[0, 0.7], [16, 0.6], [30, 0.5], [44, 0.46], [60, 0.44], [79, 0.4], [81.5, 0.16], [83.5, 0], [85.5, -0.2], [90, -0.4], [100, -0.5], [120, -0.5]];
const SUN_TURN = [[0, 2.4], [24, 2.4], [46, -0.42], [120, -0.42]];
const BANKS = [[0, 0.08], [7, -0.2], [11, 0.16], [15, -0.1], [21, 0.12], [25, -0.14], [30, 0.12], [34, -0.1], [42, 0.1], [46, -0.14], [50, 0.16], [55, -0.12], [60, 0], [66, 0.08], [71, -0.08], [76, 0.14], [82, -0.12], [88, 0.12], [92, -0.1], [98, 0.08], [103, -0.14], [108, 0.12], [112, 0], [119, 0]];
const MIST = [[46, 0], [48.5, 1], [56, 1], [58.5, 0]];
const VISTA = [[63, 0], [66, 1], [80, 1], [83, 0]];
const SKY = [
  [0, 16, 56, 150, 136, 168, 206],
  [62, 18, 62, 156, 156, 186, 216],
  [70, 30, 86, 172, 184, 210, 234],
  [79, 30, 86, 172, 184, 210, 234],
  [81.5, 24, 68, 142, 238, 200, 150],
  [83.5, 10, 32, 76, 222, 134, 66],
  [85.5, 5, 12, 34, 62, 58, 56],
  [88, 3, 4, 14, 7, 10, 26],
  [120, 3, 4, 14, 7, 10, 26],
];
const SIGHTS = [
  { from: 25.5, to: 35, x: PYRAMIDS[1].x, z: PYRAMIDS[1].z },
  { from: 65, to: 80.5, x: FUJI.x, z: FUJI.z },
];

function sighted(e, x, z, yaw) {
  for (const sight of SIGHTS) {
    const weight = smooth(sight.from, sight.from + 2.5, e) * smooth(sight.to, sight.to - 2.5, e);
    if (weight > 0) return mix(yaw, Math.atan2(sight.x - x, sight.z - z), weight);
  }
  return yaw;
}
const AURORA = [[99, 0], [103, 1], [120, 1]];
const NIGHT_LANTERN = [255, 176, 96];

function pagoda(x, z, base) {
  const boxes = [];
  for (let k = 0; k < 6; k++) {
    const y = base + k * 11;
    boxes.push({ x: 0, half: 12 - k * 1.5, low: y, high: y + 8.5, color: [204, 170, 128], glow: true });
    boxes.push({ x: 0, half: 17 - k * 1.9, low: y + 8.5, high: y + 11, color: [118, 34, 30] });
  }
  boxes.push({ x: 0, half: 0.8, low: base + 66, high: base + 76, color: [120, 96, 60] });
  return { x, z, boxes };
}

function torii(x, z) {
  const red = [214, 48, 34];
  const parts = [
    { x: -8, half: 1.1, low: 0, high: 19 },
    { x: 8, half: 1.1, low: 0, high: 19 },
    { x: 0, half: 13, low: 19, high: 21.4 },
    { x: 0, half: 10, low: 14.5, high: 15.8 },
  ];
  const boxes = parts.map((part) => ({ ...part, color: red }));
  for (const part of parts) {
    boxes.push({ ...part, low: -part.high, high: -part.low, color: [96, 30, 30], mirror: true });
  }
  return { x, z, boxes };
}

const LANDMARKS = [pagoda(trackX(2790) - 34, 2790, 12), torii(trackX(3590) + 26, 3590)];

function drawDeck(space, cam) {
  const { cols, rows, red, green, blue, mark, depth, clouds: tex } = space;
  const { density } = tex;
  const level = 230;
  if (cam.alt <= level + 2) return;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dc = c - cam.center;
      const below = r - (cam.horizon + cam.slope * dc + cam.sag * dc * dc);
      if (below < 0.6) continue;
      const z = ((cam.alt - level) / below) * cam.stretch;
      const i = r * cols + c;
      if (z > 1500 || depth[i] < z) continue;
      const px = dc / cam.focal;
      const wx = cam.x + (cam.sin + px * cam.cos) * z;
      const wz = cam.z + (cam.cos - px * cam.sin) * z;
      const edge = deckAt(wz);
      if (edge <= 0) continue;
      const puff = density[cloudIndex(wx * 0.0017, wz * 0.0017)];
      const fine = density[cloudIndex(wx * 0.0065 + 0.3, wz * 0.0065 + 0.6)];
      const cover = clamp((puff * 0.7 + fine * 0.3 - 1 + edge * 1.3) * 3.4);
      if (cover <= 0) continue;
      const side = density[cloudIndex((wx + 34) * 0.0065 + 0.3, (wz + 12) * 0.0065 + 0.6)];
      const light = clamp(0.62 + (fine - side) * 1.1 + puff * 0.2, 0.42, 1) * (0.2 + 0.8 * cam.day);
      const air = 1 - Math.exp(-z / 1500);
      red[i] = mix(red[i], mix(250 * light, cam.low[0], air), cover);
      green[i] = mix(green[i], mix(250 * light, cam.low[1], air), cover);
      blue[i] = mix(blue[i], mix(256 * light, cam.low[2], air), cover);
      mark[i] = 0;
      if (cover > 0.6) depth[i] = z;
    }
  }
}

function drawLandmarks(space, cam) {
  const { cols, rows, red, green, blue, mark, depth } = space;
  for (const item of LANDMARKS) {
    const dx = item.x - cam.x;
    const dz = item.z - cam.z;
    const along = dx * cam.sin + dz * cam.cos;
    const across = dx * cam.cos - dz * cam.sin;
    if (along < 6 || along > 760) continue;
    const air = Math.exp(-along / 1500) * smooth(760, 560, along);
    for (const box of item.boxes) {
      const left = Math.max(0, Math.round(cam.center + ((across + box.x - box.half) / along) * cam.focal));
      const right = Math.min(cols - 1, Math.round(cam.center + ((across + box.x + box.half) / along) * cam.focal));
      const level = cam.horizon + cam.slope * (left - cam.center);
      const top = Math.max(0, Math.round(level + ((cam.alt - box.high) / along) * cam.stretch));
      const bottom = Math.min(rows - 1, Math.round(level + ((cam.alt - box.low) / along) * cam.stretch));
      const light = 0.34 + 0.66 * cam.day;
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          const i = r * cols + c;
          if (depth[i] < along && !box.mirror) continue;
          const lantern = box.glow ? cam.dark * 0.8 : 0;
          red[i] = mix(red[i], box.color[0] * light + NIGHT_LANTERN[0] * lantern, air);
          green[i] = mix(green[i], box.color[1] * light + NIGHT_LANTERN[1] * lantern, air);
          blue[i] = mix(blue[i], box.color[2] * light + NIGHT_LANTERN[2] * lantern, air);
          mark[i] = 0;
        }
      }
    }
  }
}

function auroraAt(px, up, e) {
  const foot = 0.1 + 0.22 * noise(px * 1.3 + e * 0.05, 3.3);
  const rays = 0.3 + 1.2 * Math.pow(noise(px * 26 + e * 0.7, 6.1), 2) + 0.5 * noise(px * 7 - e * 0.3, 1.2);
  const rise = up - foot;
  return (rise < 0 ? gauss(rise, 0.02) : Math.exp(-rise / 0.3)) * rays;
}

function catmull(a, b, c, d, t) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}

function flightAt(e) {
  let k = 1;
  while (k < FLIGHT.length - 3 && e > FLIGHT[k + 1][0]) k++;
  const t = clamp((e - FLIGHT[k][0]) / (FLIGHT[k + 1][0] - FLIGHT[k][0]));
  const value = (slot) => catmull(FLIGHT[k - 1][slot], FLIGHT[k][slot], FLIGHT[k + 1][slot], FLIGHT[k + 2][slot], t);
  return { z: value(1), alt: Math.max(value(2), 3.4), tilt: value(3) };
}

function keyed(keys, e, slot = 1) {
  let k = 0;
  while (k < keys.length - 2 && e > keys[k + 1][0]) k++;
  return mix(keys[k][slot], keys[k + 1][slot], smooth(keys[k][0], keys[k + 1][0], e));
}

function drawGround(space, e) {
  const { cols, rows, red, green, blue, mark, skyline, depth, clouds: tex } = space;
  const { ground, towers, lamps, kind, seed, tintR, tintG, tintB, shade, blur, blurW } = space.world;
  const { height, slopeX, slopeZ } = space.waves;
  const { density } = tex;
  mark.fill(0);

  const { z: camZ, alt, tilt } = flightAt(e);
  const camX = trackX(camZ);
  const lean = (trackX(camZ + 6) - trackX(camZ - 6)) / 12;
  const yaw = sighted(e, camX, camZ, Math.atan(lean));
  const sway = (trackX(camZ + 12) - 2 * trackX(camZ) + trackX(camZ - 12)) / 144;
  const bank = sway * 26 + keyed(BANKS, e);
  const sinYaw = Math.sin(yaw);
  const cosYaw = Math.cos(yaw);

  const sunEl = keyed(SUN_PATH, e);
  const day = smooth(-0.12, 0.3, sunEl);
  const dusk = gauss(sunEl - 0.02, 0.14);
  const dark = smooth(0, -0.22, sunEl);
  const sunAz = keyed(SUN_TURN, e);
  const mist = keyed(MIST, e);
  const aurora = keyed(AURORA, e);
  const sunPx = Math.cos(sunAz - yaw) > 0.1 ? Math.tan(sunAz - yaw) : 99;
  const sunTan = Math.tan(sunEl);
  const sunX = Math.sin(sunAz) * Math.cos(sunEl);
  const sunY = Math.sin(sunEl);
  const sunZ = Math.cos(sunAz) * Math.cos(sunEl);

  const topR = keyed(SKY, e, 1);
  const topG = keyed(SKY, e, 2);
  const topB = keyed(SKY, e, 3);
  const lowR = keyed(SKY, e, 4);
  const lowG = keyed(SKY, e, 5);
  const lowB = keyed(SKY, e, 6);
  const glow = Math.max(smooth(-0.05, 0.16, sunEl), dusk * 0.8);
  const beamR = 255 * glow;
  const beamG = mix(246, 150, dusk) * glow;
  const beamB = mix(230, 70, dusk) * glow;
  const skyR = mix(12, 44, day) + 70 * dusk;
  const skyG = mix(16, 58, day) + 30 * aurora + 48 * dusk;
  const skyB = mix(36, 84, day) + 44 * aurora + 14 * dusk;

  const focal = cols * 0.62;
  const stretch = focal / CELL;
  const center = cols / 2;
  const slope = Math.tan(bank) / CELL;
  const horizon = rows * (0.4 - tilt) + Math.sin(e * 0.9) * 0.4;
  const sag = ((alt / 420) * 5) / (center * center);
  const fogRate = ((1 + 2.6 * mist) * (1 - 0.55 * keyed(VISTA, e))) / 1700;
  const far = 680 + alt * 1.6 + 520 * keyed(VISTA, e);
  const start = Math.max(0.6, alt * 0.012);
  const skim = smooth(60.6, 61.8, e) * smooth(68.2, 67, e);
  const mask = WAVE_SIZE - 1;
  const swellX = -e * 3;
  const swellZ = e * 7;
  const chopX = e * 4;
  const chopZ = e * 9;

  for (let c = 0; c < cols; c++) {
    const px = (c - center) / focal;
    const dirX = sinYaw + px * cosYaw;
    const dirZ = cosYaw - px * sinYaw;
    const dc = c - center;
    const hz = horizon + slope * dc + sag * dc * dc;
    const toSun = px - sunPx;
    const flare = dusk * Math.exp(-toSun * toSun * 1.6);
    const fogR = lowR + (255 - lowR) * flare;
    const fogG = lowG + (176 - lowG) * flare;
    const fogB = lowB + (92 - lowB) * flare;
    let bottom = rows;
    let dz = start;
    let previous = -99;

    for (let z = start * 3; z < far; z += dz, dz *= 1.0135) {
      const wx = camX + dirX * z;
      const wz = camZ + dirZ * z;
      const fi = wx / WORLD_STEP;
      const fj = wz / WORLD_STEP;
      const i = ((Math.floor(fi) % WORLD_W) + WORLD_W) % WORLD_W;
      const j = fj < 0 ? 0 : fj >= WORLD_L ? Math.max(0, 2 * WORLD_L - 1 - Math.floor(fj)) : Math.floor(fj);
      const idx = j * WORLD_W + i;
      let land = ground[idx];
      if (z < 110 && j + 1 < WORLD_L && i + 1 < WORLD_W) {
        const a = fi - Math.floor(fi);
        const b = fj - j;
        land = mix(mix(land, ground[idx + 1], a), mix(ground[idx + WORLD_W], ground[idx + WORLD_W + 1], a), b);
      }

      const water = land <= 0;
      let top = water ? 0 : land + towers[idx];
      let foam = 0;
      let a0 = 0;
      let a1 = 0;
      if (water) {
        const damp = (z < 70 ? 1 : 70 / z) * (1 - 0.85 * aurora);
        a0 = (((Math.floor(wz * 0.5 + swellZ) & mask) << 8) | (Math.floor(wx * 0.5 + swellX) & mask));
        a1 = (((Math.floor(wz * 1.9 + chopZ) & mask) << 8) | (Math.floor(wx * 1.9 + chopX) & mask));
        const swell = height[a0];
        const chop = height[a1];
        top = (swell * 1.5 + chop * 0.42) * damp;
        foam = smooth(0.8, 1.6, swell * 1.5 + chop * 0.6) * 0.8 * (z < 160 ? 1 : 0.4);
        if (land > -4) {
          const surf = 0.5 + 0.5 * Math.sin(land * 2.6 + e * 2.2);
          foam = Math.max(foam, smooth(0.6, 0.92, surf) * smooth(-4, -1, land));
        }
        if (wz < 2870 || wz > 3750) {
          top = 0;
          foam = 0;
        }
        if (skim > 0 && z < 22) {
          const side = Math.abs(px * z);
          const behind = 15 - z;
          const ridge = behind > 0 ? gauss(side - behind * 0.354, 0.22 + behind * 0.04) * smooth(0, 2, behind) : 0;
          const bow = gauss(z - 15, 1.1) * gauss(side, 0.8);
          foam = Math.max(foam, (ridge + bow) * skim);
          top += ridge * 0.5 * skim;
        }
      }

      const row = hz + ((alt - top) / z) * stretch;
      if (row < bottom) {
        const first = row < 0 ? 0 : Math.floor(row);
        const valley = mist * smooth(80, 12, top) * smooth(20, 200, z) * 0.72;
        const haze = Math.max(1 - Math.exp(-z * fogRate), smooth(far * 0.64, far * 0.98, z), valley);
        const glowCell = blur[(j >> 3) * blurW + (i >> 3)];
        let lr;
        let lg;
        let lb;
        let shineR = 0;
        let shineG = 0;
        let shineB = 0;
        const type = kind[idx];
        const face = type === 3 && top - previous > 1.5;

        if (water) {
          const calm = wz < 2870 || wz > 3750;
          const ripple = calm ? 0.12 : 1.5 * (1 - 0.88 * aurora);
          const sx = (slopeX[a0] + slopeX[a1]) * ripple;
          const sz = (slopeZ[a0] + slopeZ[a1]) * ripple;
          const drop = -(alt - top) / z;
          const length = Math.sqrt(dirX * dirX + dirZ * dirZ + drop * drop);
          const vx = dirX / length;
          const vy = drop / length;
          const vz = dirZ / length;
          const scale = 1 / Math.sqrt(1 + sx * sx + sz * sz);
          const nx = -sx * scale;
          const nz = -sz * scale;
          const facing = vx * nx + vy * scale + vz * nz;
          const rx = vx - 2 * facing * nx;
          const ry = Math.abs(vy - 2 * facing * scale);
          const rz = vz - 2 * facing * nz;
          const fresnel = (0.03 + 0.97 * Math.pow(1 - clamp(-facing), 5)) * (calm && aurora < 0.5 ? 0.4 : 1);
          const rise = 1 - Math.exp(-ry * 3.2);
          const body = 0.16 + 0.7 * day + 0.3 * dusk;
          const lean = clamp(nx * sunX + nz * sunZ + scale * sunY + 0.18);
          lr = mix((10 + 20 * lean) * body, mix(fogR, topR, rise), fresnel);
          lg = mix((64 + 120 * lean) * body, mix(fogG, topG, rise), fresnel);
          lb = mix((92 + 120 * lean) * body, mix(fogB, topB, rise), fresnel);
          lr += lean * beamR * 0.5 * dusk;
          lg += lean * beamG * 0.5 * dusk;
          lb += lean * beamB * 0.5 * dusk;
          const glitter = Math.pow(clamp(rx * sunX + ry * Math.abs(sunY) + rz * sunZ), 60) * smooth(-0.08, 0.02, sunEl);
          lr += glitter * 760;
          lg += glitter * mix(720, 400, dusk);
          lb += glitter * mix(640, 170, dusk);
          if (aurora > 0) {
            const mirrored = auroraAt(px, ry * 0.8, e) * aurora * (0.35 + fresnel);
            lr += mirrored * 12;
            lg += mirrored * 150;
            lb += mirrored * 84;
          }
          const foamLight = 40 + 200 * day;
          lr = mix(lr, foamLight * mix(1, 1.05, dusk), foam);
          lg = mix(lg, foamLight * mix(1, 0.8, dusk), foam);
          lb = mix(lb, foamLight * mix(1.02, 0.66, dusk), foam);
          shineR = glowCell * dark * 1100 * (0.3 + fresnel);
          shineG = glowCell * dark * 660 * (0.3 + fresnel);
          shineB = glowCell * dark * 260 * (0.3 + fresnel);
        } else {
          const sun = face ? 0.5 + (seed[idx] / 255) * 0.42 : shade[idx];
          const near = z < 160 ? (noise(wx * 0.3, wz * 0.3) - 0.5) * 0.3 : 0;
          const direct = sun * (1.2 - 0.85 * dusk);
          lr = (tintR[idx] / 255) * (skyR + beamR * direct) * (1 + near);
          lg = (tintG[idx] / 255) * (skyG + beamG * direct) * (1 + near);
          lb = (tintB[idx] / 255) * (skyB + beamB * direct) * (1 + near);
          if (dark > 0.02) {
            const lit = (lamps[idx] / 255) * dark;
            const carpet = Math.min(glowCell * 0.8, 0.22) * dark * (face ? 0.35 : 1);
            shineR = lit * 330 + carpet * 210;
            shineG = lit * 214 + carpet * 118;
            shineB = lit * 116 + carpet * 52;
            if (type === 4) {
              const lane = Math.floor((wx + wz) / 3) & 1;
              const car = hash(Math.floor(wz / 4 + (lane ? e * 7 : -e * 7)), Math.floor(wx / 12));
              if (car > 0.88) {
                shineR += dark * 280;
                shineG += dark * (lane ? 260 : 36);
                shineB += dark * (lane ? 230 : 26);
              }
            }
          }
        }

        lr = mix(lr, fogR, haze);
        lg = mix(lg, fogG, haze);
        lb = mix(lb, fogB, haze);
        const reach = Math.exp(-z / 1500);
        shineR *= reach;
        shineG *= reach;
        shineB *= reach;

        for (let r = first; r < bottom && r < rows; r++) {
          const cell = r * cols + c;
          let wr = lr + shineR;
          let wg = lg + shineG;
          let wb = lb + shineB;
          if (type === 3 && face) {
            const level = Math.floor((alt - ((r - hz) * z) / stretch) / 3);
            const span = Math.floor((wx + wz) / 2.4);
            const glass = hash(level + seed[idx] * 0.13, span);
            const pane = (level & 1) === 0 ? 0.82 : 1.08;
            wr *= pane;
            wg *= pane;
            wb *= pane;
            const neon = wz > 4190 && wz < 4640 && dark > 0.3 && (span & 7) === (seed[idx] & 7);
            if (neon) {
              const sign = seed[idx] % 3;
              const pulse = 0.75 + 0.25 * Math.sin(e * 3 + seed[idx]);
              wr += (sign === 1 ? 40 : 340) * pulse * reach;
              wg += (sign === 2 ? 210 : sign === 1 ? 240 : 40) * pulse * reach;
              wb += (sign === 2 ? 60 : 280) * pulse * reach;
            } else if (glass > mix(0.98, 0.55, dark) && (level & 1) === 0) {
              const warm = hash(span, level);
              wr += 300 * dark * reach + 20 * day;
              wg += (warm > 0.3 ? 210 : 240) * dark * reach + 20 * day;
              wb += (warm > 0.3 ? 110 : 250) * dark * reach + 26 * day;
            }
          }
          red[cell] = wr;
          green[cell] = wg;
          blue[cell] = wb;
          depth[cell] = z;
        }
        bottom = first;
        if (bottom <= 0) break;
      }
      previous = top;
    }

    skyline[c] = bottom;
    for (let r = 0; r < bottom; r++) {
      const rise = ((hz - r) * CELL) / focal;
      const up = rise > 0 ? rise : 0;
      const mixTop = 1 - Math.exp(-up * 3.2);
      let lr = mix(fogR, topR, mixTop);
      let lg = mix(fogG, topG, mixTop);
      let lb = mix(fogB, topB, mixTop);

      if (up > 0.012) {
        const depth = 0.1 / (up + 0.035);
        const cloud = density[cloudIndex(px * depth * 0.8 + camX * 0.00016 + e * 0.0016, depth * 0.45 + camZ * 0.00026)];
        const cover = smooth(0.5, 1, cloud) * smooth(0.012, 0.09, up) * 0.6;
        const shadeR = mix(mix(12, 244, day), 255, dusk);
        const shadeG = mix(mix(14, 246, day), 190, dusk);
        const shadeB = mix(mix(26, 252, day), 146, dusk);
        lr = mix(lr, shadeR, cover);
        lg = mix(lg, shadeG, cover);
        lb = mix(lb, shadeB, cover);
      }

      const off = Math.hypot(toSun, rise - sunTan);
      if (sunEl > -0.05 && off < 1.2) {
        const halo = Math.exp(-off / (0.08 + dusk * 0.1)) * 1.1 + Math.exp(-off / 0.35) * 0.3 * (0.4 + dusk);
        lr += 255 * halo;
        lg += mix(236, 150, dusk) * halo;
        lb += mix(200, 70, dusk) * halo;
        if (off < 0.024) {
          lr = 400;
          lg = 340;
          lb = mix(280, 150, dusk);
        }
      }

      if (dark > 0.05) {
        const dot = hash(c * 0.73 + Math.round(px * 3), r * 0.57 + 4.1);
        if (dot > 0.986) {
          const twinkle = 0.55 + 0.45 * Math.sin(e * 4 + dot * 90);
          const star = dark * smooth(0.01, 0.14, up) * twinkle * 240;
          lr += star;
          lg += star;
          lb += star * 1.08;
          if (star > 30) mark[r * cols + c] = star > 130 ? 42 : 46;
        }
        if (aurora > 0 && up > 0) {
          const veil = auroraAt(px, up, e) * aurora;
          const high = smooth(0.25, 0.62, up);
          lr += veil * mix(16, 24, high);
          lg += veil * mix(214, 170, high);
          lb += veil * mix(112, 150, high);
        }
      }

      const cell = r * cols + c;
      red[cell] = lr;
      green[cell] = Math.max(lg, Math.min(lr, lb) * 0.96);
      blue[cell] = lb;
      depth[cell] = 1e9;
    }
  }

  const cam = { x: camX, z: camZ, sin: sinYaw, cos: cosYaw, alt, horizon, slope, sag, focal, stretch, center, day, dark, low: [lowR, lowG, lowB] };
  drawDeck(space, cam);
  drawLandmarks(space, cam);
  const crossing = deckAt(camZ) * gauss(alt - 230, 42);
  if (crossing > 0.02) drawVeil(space, crossing, e);

  if (skim > 0) {
    for (let k = 0; k < 90; k++) {
      const life = (e * 1.5 + hash(k, 1.7)) % 1;
      const side = k % 2 ? 1 : -1;
      const z = 15 - life * 9;
      const flung = (15 - z) * 0.36 + life * hash(k, 3.1) * 1.2;
      const rise = Math.sin(Math.PI * life) * (0.5 + hash(k, 4.9) * 1.6);
      const col = Math.round(center + (side * flung * focal) / z);
      const row = Math.round(horizon + slope * side * (flung / z) * focal + ((alt - rise) / z) * stretch);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const cell = row * cols + col;
      const glow = skim * (1 - life) * (40 + 210 * day);
      red[cell] += glow;
      green[cell] += glow;
      blue[cell] += glow;
      mark[cell] = 46;
    }
  }

  if (dark > 0.3) {
    for (let k = 0; k < 4; k++) {
      const age = (e - 104 - k * 2.3) / 0.8;
      if (age < 0 || age > 1) continue;
      const fromC = cols * (0.2 + hash(k, 5.5) * 0.6);
      const fromR = rows * (0.05 + hash(k, 6.5) * 0.2);
      for (let s = 0; s < 14; s++) {
        const t = age - s * 0.018;
        if (t < 0) continue;
        const col = Math.round(fromC + t * cols * 0.26);
        const row = Math.round(fromR + t * rows * 0.16);
        if (col < 0 || col >= cols || row < 0 || row >= rows || row >= skyline[col]) continue;
        const cell = row * cols + col;
        const glow = 300 * (1 - s / 14) * smooth(1, 0.8, age);
        red[cell] += glow;
        green[cell] += glow * 0.95;
        blue[cell] += glow * 0.86;
        mark[cell] = 92;
      }
    }
  }
}

function drawSpace(space, view, t, f, dt, frame) {
  const low = f - GROUND_AT;
  if (low >= 0 && low < GROUND_TIME) {
    drawGround(space, low);
    if (low < 1.8) drawVeil(space, smooth(1.8, 0, low), f);
    resolve(space, frame, 1);
    return;
  }

  drawCosmos(space, view, t, f, dt);
  const entering = f > GROUND_AT - 1.4 && low < 0 ? smooth(-1.4, 0, low) : 0;
  if (entering > 0) drawVeil(space, entering, f);
  resolve(space, frame, Math.max(entering, bangSolid(f)));

  if (low >= GROUND_TIME && low < GROUND_TIME + DISSOLVE) {
    drawGround(space, low);
    resolve(space, space.other, 1);
    dissolve(frame, space.other, smooth(DISSOLVE, 0, low - GROUND_TIME));
  }
}

function fadeFrame(frame, k) {
  for (let i = 0; i < frame.ch.length; i++) {
    frame.r[i] *= k;
    frame.g[i] *= k;
    frame.b[i] *= k;
    frame.backR[i] *= k;
    frame.backG[i] *= k;
    frame.backB[i] *= k;
    if (k < 0.08) frame.ch[i] = 32;
  }
}

function createShow() {
  const eye = createEye();
  eye.lid = 0;
  return { clock: 0, eye, depth: 0, flinched: false, view: { x: 0, y: 0, scale: 0.1, form: 0, veil: 1, sunX: 0, sunY: 0, sunR: 1 } };
}

function emergeFromSun(show, scene, space, outro) {
  const { eye, view } = show;
  if (!show.depth) {
    show.depth = diveDepth(scene, eye);
    eye.portal = true;
  }
  const p = smooth(0.5, 5.5, outro);
  eye.zoom = Math.exp(Math.log(show.depth) * (1 - p));
  eye.ember = smooth(7.4, 3, outro);
  if (outro > 4.2 && eye.mood === MOODS.locked) eye.mood = MOODS.dazzled;
  if (outro > 6.6 && !show.flinched) {
    show.flinched = true;
    blink(eye, 1);
    eye.closing = 0.2;
  }
  if (show.flinched && eye.lid < 0.15) eye.portal = false;

  const [irisX, irisY] = irisSpot(eye);
  aim(scene, eye.zoom, irisX, irisY);
  view.sunX = (irisX * scene.size + scene.cx - space.cols / 2) / space.unit;
  view.sunY = (((irisY * scene.size) / CELL + scene.cy - space.rows / 2) * CELL) / space.unit;
  view.sunR = ((IRIS * eye.pupil * scene.size) / space.unit) * mix(0.96, 0.62, smooth(3.2, 6.4, outro));
}

function wakeEye(eye) {
  eye.portal = false;
  eye.zoom = 1;
  eye.ember = 0;
  eye.mood = MOODS.calm;
  eye.nextLook = eye.t + 0.8;
  eye.nextFocus = eye.t + 2;
  eye.nextMood = eye.t + 6;
  eye.nextBlink = eye.t + rand(2, 4);
}

function playShow(show, scene, space, dt, frame) {
  const { eye, view } = show;
  show.clock += dt;
  const { clock } = show;
  const zoomEnd = ZOOM_AT + ZOOM_TIME;
  const flight = clock - zoomEnd - GALAXY_HOLD;
  const outro = flight - JOURNEY_END;
  const diving = clock < zoomEnd;
  const inEye = diving || outro >= 0;

  if (diving && clock > LOCK_AT && eye.mood !== MOODS.locked) lockEye(eye);
  if (inEye) updateEye(eye, dt);
  if (outro >= 0) emergeFromSun(show, scene, space, outro);

  if (clock >= FORM_AT) {
    if (diving) {
      const p = smooth(0, 1, (clock - ZOOM_AT) / ZOOM_TIME);
      const [irisX, irisY] = irisSpot(eye);
      const start = (IRIS * eye.pupil * scene.baseSize * 0.8) / space.unit;
      eye.portal = true;
      eye.zoom = Math.exp(Math.log(diveDepth(scene, eye)) * p);
      view.x = ((irisX * scene.size + scene.cx - space.cols / 2) / space.unit) * (1 - p);
      view.y = (((irisY * scene.size) / CELL + scene.cy - space.rows / 2) * CELL) / space.unit * (1 - p);
      view.scale = start * Math.pow(0.95 / start, p);
    } else {
      view.scale *= 1 + dt * 0.012;
    }
    view.form = smooth(FORM_AT, ZOOM_AT + 4.5, clock);
    view.veil = smooth(ZOOM_AT + 1.5, FORM_AT + 1, clock);
    drawSpace(space, view, clock - FORM_AT, flight, dt, frame);
  }

  if (inEye) drawFrame(scene, eye, frame);
  if (clock < 1.5) fadeFrame(frame, clock / 1.5);

  if (outro >= OUTRO_TIME) {
    wakeEye(eye);
    Object.assign(show, createShow(), { clock: 2, eye });
    resetView(scene);
  }
}

function main() {
  const { stdout, stdin } = process;
  if (!stdout.isTTY) {
    console.error('eye.js doit être lancé dans un terminal.');
    process.exit(1);
  }

  let scene, space, frame, prev;
  const rebuild = () => {
    scene = buildScene(stdout.columns || 80, stdout.rows || 24);
    space = buildSpace(scene.cols, scene.rows);
    frame = createFrame(scene.n);
    prev = new Float64Array(scene.n).fill(-1);
    stdout.write(`\x1b[48;2;${BG.join(';')}m\x1b[2J`);
  };

  let done = false;
  const quit = () => {
    if (done) return;
    done = true;
    stdout.write('\x1b[0m\x1b[?25h\x1b[?1049l');
    process.exit(0);
  };

  stdout.write('\x1b[?1049h\x1b[?25l');
  rebuild();
  stdout.on('resize', rebuild);
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);
  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', (d) => {
      const key = d.toString();
      if (key === 'q' || key === 'Q' || key === '\x03' || key === '\x1b') quit();
    });
  }

  const show = createShow();
  let last = process.hrtime.bigint();
  const tick = () => {
    const now = process.hrtime.bigint();
    const dt = Math.min(Number(now - last) / 1e9, 0.1);
    last = now;
    playShow(show, scene, space, dt, frame);
    const flushed = stdout.write(encodeFrame(scene, frame, prev));
    const spent = Number(process.hrtime.bigint() - now) / 1e6;
    const next = () => setTimeout(tick, Math.max(0, 1000 / FPS - spent));
    if (flushed) next();
    else stdout.once('drain', next);
  };
  tick();
}

if (require.main === module) main();

module.exports = { ZOOM_AT, ZOOM_TIME, GALAXY_HOLD, JOURNEY, JOURNEY_END, OUTRO_TIME, STAGES, EARTH_AT, GROUND_AT, CLIMB_AT, buildScene, buildSpace, createFrame, createShow, playShow, encodeFrame };
