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

function put(scene, frame, i, rgb, v) {
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
  for (let i = 0; i < n; i++) {
    const packed = (frame.r[i] >> 3) << 10 | (frame.g[i] >> 3) << 5 | frame.b[i] >> 3;
    const key = frame.ch[i] * 32768 + packed;
    if (key === prev[i]) continue;
    prev[i] = key;
    if (cursor !== i || i % cols === 0) {
      out.push(`\x1b[${Math.floor(i / cols) + 1};${i % cols + 1}H`);
    }
    if (packed !== color) {
      color = packed;
      out.push(`\x1b[38;2;${frame.r[i] & 248};${frame.g[i] & 248};${frame.b[i] & 248}m`);
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
  hole: [36, 15],
  binary: [50, 11],
  pulsar: [60, 11],
  planetary: [70, 11],
  nova: [80, 12],
  comet: [97, 11],
  eclipse: [135, 9],
};
const WARPS = [6, 25.5, 36, 50, 60, 70, 80];
const SUN_AT = 91;
const BELT_AT = 118.5;
const BELT_TIME = 6;
const JOURNEY_END = 160;

const JOURNEY = [
  { surface: neptuneSurface, at: 91, span: 10, size: 0.42, side: 1, lift: -0.14, tilt: 0.49, spin: 0.14, reach: 1.1, halo: [80, 150, 255], haloWidth: 0.05 },
  { surface: uranusSurface, at: 97, span: 10, size: 0.4, side: -1, lift: 0.12, tilt: 1.71, spin: 0.1, reach: 1.1, halo: [150, 225, 235], haloWidth: 0.05 },
  { surface: saturnSurface, at: 103, span: 11, size: 0.36, side: 1, lift: -0.1, tilt: -0.34, spin: 0.2, reach: 2.4, rings: true },
  {
    surface: jupiterSurface, at: 109, span: 11, size: 0.66, side: -1, lift: 0.16, tilt: 0.05, spin: 0.22, reach: 1,
    moons: [
      { orbit: 1.5, size: 0.05, speed: 1.3, phase: 0.4, tint: [236, 208, 120] },
      { orbit: 1.9, size: 0.045, speed: 0.9, phase: 2.2, tint: [226, 220, 208] },
      { orbit: 2.5, size: 0.075, speed: 0.6, phase: 4.1, tint: [176, 160, 142] },
      { orbit: 3.4, size: 0.07, speed: 0.4, phase: 5.3, tint: [120, 108, 98] },
    ],
  },
  { surface: marsSurface, at: 120, span: 9, size: 0.3, side: 1, lift: 0.14, tilt: 0.44, spin: 0.14, reach: 1 },
  { surface: earthSurface, night: earthNight, at: 126, span: 11, size: 0.42, side: -1, lift: -0.08, tilt: 0.41, spin: 0.14, reach: 1.1, halo: [110, 180, 255], haloWidth: 0.06 },
  { surface: venusSurface, at: 142, span: 9, size: 0.38, side: 1, lift: -0.12, tilt: 0.05, spin: 0.05, reach: 1.1, halo: [250, 210, 140], haloWidth: 0.05 },
  { surface: mercurySurface, at: 147, span: 8.5, size: 0.24, side: -1, lift: 0.1, tilt: 0.03, spin: 0.08, reach: 1 },
];
const MOON = { surface: moonSurface, tilt: 0.1, spin: 0.05, reach: 1, ambient: 0.1 };

const flyZ = (n, from = 10) => Math.max(from * (1 - n) * (1 - n), 0.02);
const driftZ = (n) => Math.max(3.2 * Math.pow(1 - n * n * n, 1.5), 0.02);
const stageOf = (f, [at, span]) => (f - at) / span;

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
    }
  }
  clouds = { density, hue, lane };
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
    hazeR: new Float32Array(n),
    hazeG: new Float32Array(n),
    hazeB: new Float32Array(n),
    speck: new Float32Array(n),
    backR: new Float32Array(n),
    backG: new Float32Array(n),
    backB: new Float32Array(n),
    backM: new Uint8Array(n),
    mark: new Uint8Array(n),
    clouds: bakeClouds(),
    lens: bakeLensing(),
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
      const u = (c - cols / 2) / unit;
      const v = ((r - rows / 2) * CELL) / unit;
      const i = r * cols + c;
      const haze = smooth(0.5, 0.78, fbm(u * 1.1 + 4, v * 1.1 + 9));
      const tint = noise(u * 0.7 + 1, v * 0.7 + 6);
      space.hazeR[i] = haze * mix(34, 10, tint);
      space.hazeG[i] = haze * 10;
      space.hazeB[i] = haze * mix(44, 54, tint);
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
    const scatter = (Math.random() + Math.random() - 1) * (0.26 + 0.5 * radius);
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

function flightSpeed(f) {
  if (f < 0) return 0.015;
  let speed = mix(0.06, 0.24, smooth(88, 92, f)) + 2.2 * gauss(f - 89.5, 1.5) + gauss(f - 154, 4);
  for (const at of WARPS) speed += 1.8 * gauss(f - at, 1.3);
  return speed;
}

function drawStars(space, f, dt) {
  const speed = flightSpeed(f);
  for (const star of space.stars) {
    star.z -= speed * dt * 0.5;
    const x = star.x / Math.max(star.z, 0.01);
    const y = star.y / Math.max(star.z, 0.01);
    if (star.z < 0.04 || Math.abs(x) > 2.6 || Math.abs(y) > 2) {
      resetStar(star, rand(0.7, 1));
      continue;
    }
    const lit = smooth(1, 0.3, star.z) * 215 + 40;
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
  const fade = smooth(9, 6.5, f);
  if (fade <= 0) return;
  const rush = f > 2.5 ? Math.exp(Math.pow(f - 2.5, 2) * 0.17) : 1;
  const scale = view.scale * rush;
  const roll = -0.45 + t * 0.012;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const lit = (fade * 0.24 * space.n) / space.count;
  for (let i = 0; i < space.count; i++) {
    const seed = space.seed[i];
    const grown = clamp(view.form * 1.7 - seed * 0.7);
    if (grown <= 0) continue;
    const loose = 1 - grown;
    const angle = space.angle[i] + t * space.orbit[i] + loose * loose * (2.5 + seed * 3);
    const radius = space.radius[i] * (1 + loose * (1 + seed * 1.4));
    const gx = Math.cos(angle) * radius;
    const gy = Math.sin(angle) * radius * 0.46 + space.height[i];
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
      const py = (v * cos - u * sin) / scale / 0.46;
      const radius = Math.hypot(px, py);
      if (radius > 1.7) continue;

      const spin = Math.atan2(py, px) - (t * 0.16) / (radius + 0.25);
      const phase = spin - Math.log(radius + 0.06) * 2.2;
      const major = 0.5 + 0.5 * Math.cos(2 * phase);
      const minor = 0.5 + 0.5 * Math.cos(2 * phase + 1.57);
      const lane = 0.5 + 0.5 * Math.cos(2 * phase - 0.75);
      const clump = noise(Math.cos(spin) * radius * 9 + 30, Math.sin(spin) * radius * 9 + 30);

      const disc = Math.exp(-radius * 2.5);
      const dust = 1 - 0.75 * Math.pow(lane, 5) * smooth(0.1, 0.28, radius) * smooth(1.25, 0.7, radius) * strength;
      const barX = px * barCos + py * barSin;
      const barY = py * barCos - px * barSin;
      const core = 1.5 * gauss(radius, 0.15) + 0.8 * gauss(barX, 0.36) * gauss(barY, 0.1);
      const arms = disc * (0.2 + 1.5 * Math.pow(major, 2.4) + 0.5 * Math.pow(minor, 3)) * (0.55 + 0.9 * clump);
      const knot = 1.7 * smooth(0.6, 0.78, clump) * Math.pow(major, 3) * disc * smooth(0.14, 0.3, radius);

      const i = r * cols + c;
      red[i] = red[i] * dust + strength * (arms * 210 + core * 255 + knot * 255);
      green[i] = green[i] * dust + strength * (arms * 262 + core * 205 + knot * 84);
      blue[i] = blue[i] * dust + strength * (arms * 420 + core * 140 + knot * 150);
    }
  }
}

function drawNebula(space, f) {
  const n = (f - 6.5) / 15;
  if (n <= 0 || n >= 1) return;
  const fade = smooth(0, 0.18, n) * smooth(1, 0.82, n);
  const { cols, rows, unit, red, green, blue, clouds: tex } = space;
  const zoomFar = 0.42 / Math.exp(n * 0.7);
  const zoomNear = 0.3 / Math.exp(n * 1.5);
  const cos = Math.cos(n * 0.5);
  const sin = Math.sin(n * 0.5);
  for (let r = 0; r < rows; r++) {
    const v = ((r - rows / 2) * CELL) / unit;
    for (let c = 0; c < cols; c++) {
      const u = (c - cols / 2) / unit;
      const x = u * cos - v * sin;
      const y = u * sin + v * cos;
      const a = Math.floor((x * zoomFar * 0.5 + 0.5) * (CLOUD_SIZE - 1)) + Math.floor((y * zoomFar * 0.5 + 0.5) * (CLOUD_SIZE - 1)) * CLOUD_SIZE;
      const b = Math.floor((x * zoomNear * 0.5 + 0.31) * (CLOUD_SIZE - 1)) + Math.floor((y * zoomNear * 0.5 + 0.63) * (CLOUD_SIZE - 1)) * CLOUD_SIZE;
      const glow = tex.density[a] * tex.density[a];
      const hue = tex.hue[a];
      const veil = 1 - tex.lane[b] * 0.85;
      const lit = fade * 1.5 * (glow + 0.7 * tex.density[b] * tex.density[b]) * veil;
      const warm = smooth(0.4, 0.56, hue);
      const i = r * cols + c;
      red[i] += lit * mix(40, 255, warm);
      green[i] += lit * mix(170, 72, warm) + lit * lit * 90;
      blue[i] += lit * mix(230, 140, warm);
    }
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

function drawBlackHole(space, f) {
  const n = stageOf(f, STAGES.hole);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, mark, backR, backG, backB, backM } = space;
  const { orbit, sweep, h } = space.lens;
  const z = driftZ(n);
  const scale = 0.06 / z;
  const cx = -1.15 / z;
  const cy = -0.1 / z;
  const fade = smooth(0, 0.1, n);
  const incline = mix(1.5, 1.22, n);
  const cosI = Math.cos(incline);
  const sinI = Math.sin(incline);
  const [left, right, top, bottom] = bounds(space, cx, cy, LENS_REACH * scale);

  backR.set(red);
  backG.set(green);
  backB.set(blue);
  backM.set(mark);

  for (let r = top; r <= bottom; r++) {
    const dv = -(((r - rows / 2) * CELL) / unit - cy) / scale;
    for (let c = left; c <= right; c++) {
      const du = ((c - cols / 2) / unit - cx) / scale;
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
        const col = Math.round((cx + ex * away) * unit + cols / 2);
        const row = Math.round(((cy - ey * away) * unit) / CELL + rows / 2);
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
        const swirl = phi - f * 11 * Math.pow(radius, -1.5);
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
  const z = driftZ(n);
  const size = 0.9 / z;
  const cx = 1.3 / z;
  const cy = 0.18 / z;
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

function drawBinary(space, f) {
  const n = stageOf(f, STAGES.binary);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, mark } = space;
  const z = driftZ(n);
  const size = 1.05 / z;
  const cx = -1.55 / z;
  const cy = 0.1 / z;
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

  for (let i = 0; i < 700; i++) {
    const t = (hash(i, 6.1) + f * 0.35) % 1;
    const x = mix(L1.x, 0.56, t) + (hash(i, 1.9) - 0.5) * 0.02;
    const y = -0.2 * Math.sin(Math.PI * t) + (hash(i, 3.7) - 0.5) * (0.012 + t * 0.03);
    const px = (x * cos - y * sin) * size + cx;
    const py = (x * sin + y * cos) * size * squash + cy;
    plot(space, px, py, 170 * fade, 110 * fade, 90 * fade);
  }
}

function drawPulsar(space, f) {
  const n = stageOf(f, STAGES.pulsar);
  if (n <= 0 || n >= 1) return;
  const { cols, rows, unit, red, green, blue, clouds: tex } = space;
  const z = driftZ(n);
  const size = 0.72 / z;
  const cx = -1.05 / z;
  const cy = 0.1 / z;
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
  const { cols, rows, unit, red, green, blue } = space;
  const z = driftZ(n);
  const size = 0.74 / z;
  const cx = 1.08 / z;
  const cy = -0.12 / z;
  const fade = smooth(0, 0.12, n);
  const cos = Math.cos(0.4);
  const sin = Math.sin(0.4);
  const [left, right, top, bottom] = bounds(space, cx, cy, size * 1.18);

  for (let r = top; r <= bottom; r++) {
    const v = ((r - rows / 2) * CELL) / unit - cy;
    for (let c = left; c <= right; c++) {
      const u = (c - cols / 2) / unit - cx;
      const rx = (u * cos + v * sin) / size;
      const ry = ((v * cos - u * sin) / size) / 0.82;
      const e = Math.hypot(rx, ry);
      if (e > 1.18) continue;
      const i = r * cols + c;
      const a = Math.atan2(ry, rx);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const lump = 0.7 + 0.6 * fbm(ca * 2.4 + 5 + rx * 2, sa * 2.4 + 2 + ry * 2);
      const spoke = noise(ca * 26 + 3, sa * 26 + 8);
      const shell = gauss(e - 0.62, 0.15) * lump + 0.24 * gauss(e - 1, 0.06) * lump;
      const knots = smooth(0.58, 0.72, spoke) * gauss(e - 0.46, 0.08) * 0.9;
      const inside = 0.2 * smooth(0.65, 0.2, e);
      const star = Math.exp(-e / 0.02) * 7;
      const outer = smooth(0.42, 0.78, e);
      const light = fade * (shell + inside) * 1.6;
      red[i] += light * mix(70, 255, outer) + fade * (knots * 255 + star * 215);
      green[i] += light * mix(214, 62, outer) + fade * (knots * 142 + star * 232);
      blue[i] += light * mix(226, 58, outer) + fade * (knots * 92 + star * 255);
    }
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

function ringAt(x, y) {
  const r = Math.hypot(x, y / 0.24);
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
  const ambient = world.ambient || 0.03;

  for (let r = top; r <= bottom; r++) {
    const ny = (((r - rows / 2) * CELL) / unit - py) / radius;
    for (let c = left; c <= right; c++) {
      const nx = ((c - cols / 2) / unit - px) / radius;
      const i = r * cols + c;
      const d = Math.hypot(nx, ny);
      const rx = nx * cos + ny * sin;
      const ry = ny * cos - nx * sin;
      const ring = world.rings ? ringAt(rx, ry) : 0;

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
  const z = flyZ(p);
  const side = world.side * (world.size * world.reach * 1.25 + 0.1);
  const offset = Math.hypot(side, world.lift);
  const px = side / z;
  const py = world.lift / z;
  const radius = world.size / z;
  const angle = Math.atan2(offset, z);
  const swing = 0.3 + angle * 0.9;
  const fade = smooth(0, 0.12, p);
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

function drawSpace(space, view, t, f, dt, frame) {
  space.red.set(space.hazeR);
  space.green.set(space.hazeG);
  space.blue.set(space.hazeB);
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
  drawBlackHole(space, f);
  drawComet(space, f);
  drawSolar(space, view, f);
  for (let w = JOURNEY.length - 1; w >= 0; w--) drawWorld(space, JOURNEY[w], f);
  drawMoon(space, f);
  drawBelt(space, f, dt);

  if (view.veil > 0) {
    for (let i = 0; i < space.n; i++) {
      space.red[i] += 8 * view.veil;
      space.green[i] += 34 * view.veil;
      space.blue[i] += 130 * view.veil;
    }
  }

  for (let i = 0; i < space.n; i++) {
    const r = space.red[i];
    const g = space.green[i];
    const b = space.blue[i];
    const peak = Math.max(r, g, b);
    if (peak < 16) {
      frame.ch[i] = 32;
      frame.r[i] = frame.g[i] = frame.b[i] = 0;
      continue;
    }
    const v = 1 - Math.exp(-peak / 150);
    const gain = (v * 255) / peak;
    const light = 1 - Math.exp(-(0.3 * r + 0.45 * g + 0.25 * b) / 110);
    frame.ch[i] = space.mark[i] || RAMP.charCodeAt(Math.round(clamp(Math.pow(light, 1.2) + space.speck[i]) * (RAMP.length - 1)));
    frame.r[i] = Math.min(255, r * gain);
    frame.g[i] = Math.min(255, g * gain);
    frame.b[i] = Math.min(255, b * gain);
  }
}

function fadeFrame(frame, k) {
  for (let i = 0; i < frame.ch.length; i++) {
    frame.r[i] *= k;
    frame.g[i] *= k;
    frame.b[i] *= k;
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

module.exports = { ZOOM_AT, ZOOM_TIME, GALAXY_HOLD, JOURNEY, JOURNEY_END, OUTRO_TIME, STAGES, buildScene, buildSpace, createFrame, createShow, playShow, encodeFrame };
