'use strict';

const { spawn, execFileSync } = require('child_process');
const { existsSync, mkdirSync, statSync, writeFileSync, readFileSync } = require('fs');
const { join, resolve: resolvePath } = require('path');
const { tmpdir } = require('os');
const E = require('../eye.js');
const { composeScore } = require('./score.js');

const WIDTH = 3840;
const HEIGHT = 2160;
const COLS = 320;
const ROWS = 88;
const FPS = 30;
const LIMIT_MB = 900;
const AUDIO_KBPS = 256;
const WORK = join(tmpdir(), 'seijurio-record');

function readArgs() {
  const options = { out: 'episode1-4k.mp4', music: null, from: 0, to: Infinity, codec: 'h264', size: LIMIT_MB, score: false };
  const list = process.argv.slice(2);
  for (let k = 0; k < list.length; k++) {
    const key = list[k];
    if (key === '--out') options.out = list[++k];
    else if (key === '--music') options.music = resolvePath(list[++k]);
    else if (key === '--from') options.from = Number(list[++k]);
    else if (key === '--to') options.to = Number(list[++k]);
    else if (key === '--hevc') options.codec = 'hevc';
    else if (key === '--size') options.size = Number(list[++k]);
    else if (key === '--score') options.score = true;
    else throw new Error(`Option inconnue : ${key}`);
  }
  return options;
}

function seedRandom() {
  let state = 0x5e1a0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bake = () => new Promise((done) => {
  E.startLoading(() => {}, (baked) => {
    if (baked) E.adoptBakes(baked);
    done();
  });
});

function createPlayer(cols, rows) {
  seedRandom();
  const canvas = E.buildCanvas(cols, rows);
  const intro = E.buildIntro(cols, rows);
  const scene = E.buildScene(cols, rows);
  const space = E.buildSpace(cols, rows);
  const show = E.createShow();
  const frame = E.createFrame(canvas.n);
  const dt = 1 / FPS;
  let opening = 0;
  let index = 0;
  return {
    frame,
    canvas,
    next() {
      if (opening < E.INTRO_TIME) {
        E.drawIntro(intro, canvas, opening, frame, null);
        opening += dt;
      } else {
        E.playShow(show, scene, space, dt, frame);
      }
      index += 1;
      return !(show.credits >= E.CREDITS_TIME - dt);
    },
    time: () => index / FPS,
    credits: () => show.credits,
  };
}

async function analyse() {
  const path = join(WORK, 'timeline.json');
  const stamp = statSync(join(__dirname, '..', 'eye.js')).mtimeMs;
  if (existsSync(path)) {
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    if (saved.stamp === stamp) return saved;
  }
  const player = createPlayer(160, 45);
  const { frame, canvas } = player;
  const light = [];
  const motion = [];
  const warm = [];
  const last = new Uint8Array(canvas.n);
  let creditsAt = 0;
  let alive = true;
  while (alive) {
    alive = player.next();
    if (!creditsAt && player.credits() >= 0) creditsAt = player.time();
    let sum = 0;
    let moved = 0;
    let heat = 0;
    for (let i = 0; i < canvas.n; i++) {
      const value = (frame.r[i] * 2 + frame.g[i] * 3 + frame.b[i] + frame.backR[i] * 2 + frame.backG[i] * 3 + frame.backB[i]) / 12;
      sum += value;
      heat += frame.r[i] - frame.b[i];
      moved += Math.abs(value - last[i]);
      last[i] = value;
    }
    light.push(Math.round(sum / canvas.n));
    motion.push(Math.round(moved / canvas.n));
    warm.push(Math.round(heat / canvas.n));
  }
  const data = { stamp, fps: FPS, end: player.time(), creditsAt, light, motion, warm };
  writeFileSync(path, JSON.stringify(data));
  return data;
}

function encoderPath() {
  const source = join(__dirname, 'encoder.swift');
  const binary = join(WORK, 'encoder');
  if (!existsSync(binary) || statSync(binary).mtimeMs < statSync(source).mtimeMs) {
    console.log('Compilation de l\'encodeur...');
    execFileSync('swiftc', ['-O', '-swift-version', '5', source, '-o', binary], { stdio: 'inherit' });
  }
  return binary;
}

async function renderVideo(options, binary, seconds, path) {
  const bits = Math.round((options.size * 8e6) / seconds - AUDIO_KBPS * 1000);
  console.log(`Vidéo ${WIDTH}x${HEIGHT} à ${(bits / 1e6).toFixed(1)} Mb/s, ${seconds.toFixed(0)} s`);
  const encoder = spawn(binary, ['encode', COLS, ROWS, WIDTH, HEIGHT, FPS, bits, options.codec, path], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((done, stop) => encoder.on('close', (code) => (code ? stop(new Error(`encodeur : ${code}`)) : done())));
  const player = createPlayer(COLS, ROWS);
  const { frame, canvas } = player;
  const { n } = canvas;
  const planes = ['ch', 'r', 'g', 'b', 'backR', 'backG', 'backB'];
  const started = Date.now();
  let alive = true;
  let sent = 0;
  while (alive && player.time() < options.to) {
    alive = player.next();
    if (player.time() < options.from) continue;
    const packet = Buffer.allocUnsafe(n * 7);
    planes.forEach((name, k) => packet.set(frame[name], k * n));
    if (!encoder.stdin.write(packet)) await new Promise((done) => encoder.stdin.once('drain', done));
    sent += 1;
    if (sent % 300 === 0) {
      const pace = sent / ((Date.now() - started) / 1000);
      console.log(`${player.time().toFixed(0)} s / ${options.to === Infinity ? seconds.toFixed(0) : options.to} s, ${pace.toFixed(1)} images/s`);
    }
  }
  encoder.stdin.end();
  await closed;
}

function audioTrack(options, timeline) {
  const output = join(WORK, 'audio.m4a');
  let source = options.music;
  if (!source) {
    source = join(WORK, 'score.wav');
    composeScore(timeline, source);
  }
  execFileSync('afconvert', ['-f', 'm4af', '-d', `aac`, '-b', `${AUDIO_KBPS * 1000}`, '-q', '127', source, output]);
  return output;
}

async function main() {
  mkdirSync(WORK, { recursive: true });
  const options = readArgs();
  console.log('Préparation du monde...');
  await bake();
  console.log('Analyse du film...');
  const timeline = await analyse();
  console.log(`Film : ${timeline.end.toFixed(1)} s, générique à ${timeline.creditsAt.toFixed(1)} s`);
  if (options.score) {
    composeScore(timeline, join(WORK, 'score.wav'));
    process.exit(0);
  }
  const binary = encoderPath();
  const silent = join(WORK, 'video.mp4');
  await renderVideo(options, binary, timeline.end, silent);
  console.log('Pose de la musique...');
  const audio = audioTrack(options, timeline);
  const out = resolvePath(options.out);
  execFileSync(binary, ['mux', silent, audio, out, String(options.from)], { stdio: 'inherit' });
  console.log(`Terminé : ${out} (${(statSync(out).size / 1e6).toFixed(0)} Mo)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
