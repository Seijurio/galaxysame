'use strict';

const { writeFileSync } = require('fs');

const RATE = 48000;
const TAU = Math.PI * 2;
const BAR = 3.2;

const CHORDS = {
  Dm: [38, 50, 57, 62, 65, 69],
  Bb: [34, 46, 58, 62, 65, 70],
  F: [41, 53, 57, 60, 65, 69],
  C: [36, 48, 55, 60, 64, 67],
  Gm: [43, 50, 58, 62, 67, 70],
  A: [33, 45, 57, 61, 64, 69],
  Am: [33, 45, 57, 60, 64, 69],
  Eb: [39, 51, 58, 63, 67, 70],
};

const THEME = [[0, 69, 3], [3, 67, 1], [4, 65, 2], [6, 62, 2], [8, 65, 3], [11, 67, 1], [12, 69, 4], [16, 74, 3], [19, 72, 1], [20, 69, 2], [22, 67, 2], [24, 65, 3], [27, 67, 1], [28, 62, 4]];
const ARP = [1, 3, 2, 4, 3, 5, 4, 3];
const STARS = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84];

const PLAN = [
  { at: 0, chords: ['Dm'], level: 0.4, stars: 0.5 },
  { at: 7.4, chords: ['Dm', 'Bb', 'F', 'C'], level: 0.5, piano: 1, heart: 0.5 },
  { at: 27.4, chords: ['Gm', 'A'], level: 0.6, rise: true, arp: 0.3 },
  { at: 34.4, chords: ['Dm'], level: 0.55, stars: 1, hit: 0.5 },
  { at: 44.4, chords: ['Dm', 'Bb', 'Gm', 'A'], level: 0.6, arp: 0.5, stars: 0.7, hit: 0.3 },
  { at: 63.9, chords: ['Dm', 'C', 'Bb', 'A'], level: 0.68, arp: 0.7, heart: 0.5, hit: 0.3 },
  { at: 75.4, chords: ['Dm', 'Eb'], level: 0.62, sub: 1, tick: 0.3, hit: 0.5 },
  { at: 92.4, chords: ['Gm', 'Dm', 'Eb', 'A'], level: 0.66, arp: 0.7, hit: 0.3 },
  { at: 102.4, chords: ['Dm', 'Bb'], level: 0.7, arp: 0.8, tick: 1, hit: 0.3 },
  { at: 112.4, chords: ['Gm', 'A'], level: 0.74, arp: 0.9, tick: 0.6, heart: 0.6, hit: 0.3, rise: true },
  { at: 125.8, chords: ['Dm', 'Eb'], level: 0.72, stars: 1, sub: 1, hit: 1 },
  { at: 133.4, chords: ['Dm', 'Bb', 'Gm', 'A'], level: 0.9, arp: 1, tick: 1, drive: 1, hit: 0.5, rise: true },
  { at: 149.4, chords: ['F', 'C', 'Dm', 'Bb'], level: 1, lead: 1, arp: 0.5, stars: 1, hit: 2 },
  { at: 174.4, chords: ['Dm', 'Bb', 'F', 'C'], level: 0.72, arp: 0.7, stars: 0.5, hit: 0.3 },
  { at: 188.4, chords: ['F', 'C', 'Bb', 'F'], level: 0.66, piano: 1, stars: 0.7 },
  { at: 209.4, chords: ['Gm', 'Eb'], level: 0.7, arp: 0.8, tick: 0.8, rise: true },
  { at: 217.4, chords: ['Dm', 'C'], level: 0.46, sub: 1, wind: 1, hit: 0.4 },
  { at: 243.4, chords: ['Bb', 'C'], level: 0.66, arp: 0.5, rise: true },
  { at: 254.4, chords: ['F', 'C', 'Dm', 'Bb'], level: 0.74, piano: 1, arp: 0.7, heart: 0.4, hit: 0.5 },
  { at: 304.9, chords: ['Dm', 'Bb', 'Gm', 'A'], level: 0.82, arp: 0.9, tick: 0.8, drive: 0.7, hit: 0.6 },
  { at: 322.3, chords: ['F', 'C', 'Dm', 'Bb'], level: 0.95, lead: 1, arp: 1, drive: 1, tick: 0.7, hit: 1 },
  { at: 350.9, chords: ['F', 'C', 'Bb', 'C'], level: 0.76, piano: 1, arp: 0.7, heart: 0.4, hit: 0.4 },
  { at: 379.6, chords: ['Dm', 'Bb', 'F', 'C'], level: 0.66, piano: 1, arp: 0.4, stars: 0.5 },
  { at: 421.4, chords: ['Gm', 'A'], level: 0.74, arp: 0.8, tick: 0.5, rise: true },
  { at: 429.4, chords: ['Dm'], level: 0.42, stars: 1, sub: 1, hit: 0.5 },
  { at: 440, chords: ['Bb', 'C', 'Gm', 'A'], level: 0.76, arp: 0.9, tick: 0.8, heart: 0.7, rise: true },
  { at: 454.4, chords: ['Dm', 'Bb'], level: 0.8, lead: 1, stars: 0.8, hit: 1 },
  { at: 463, chords: ['Dm', 'Bb', 'F', 'C'], level: 0.46, piano: 1 },
  { at: 476, chords: ['Dm', 'Bb', 'F', 'C'], level: 0.7, lead: 0.7, piano: 1, arp: 0.6, stars: 0.5, heart: 0.3 },
];

const hz = (note) => 440 * Math.pow(2, (note - 69) / 12);
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

function makeNoise(seed) {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) / 4294967296) * 2 - 1;
  };
}

function createMix(seconds) {
  const n = Math.ceil(seconds * RATE);
  return {
    n,
    padL: new Float32Array(n), padR: new Float32Array(n),
    dryL: new Float32Array(n), dryR: new Float32Array(n),
    sendL: new Float32Array(n), sendR: new Float32Array(n),
  };
}

function partials(mix, bus, start, length, freqs, amps, fades, pan, send, envelope) {
  const from = Math.floor(start * RATE);
  const count = Math.min(Math.floor(length * RATE), mix.n - from);
  if (count <= 0 || from < 0) return;
  const left = Math.cos((pan + 1) * 0.785) * 1.2;
  const right = Math.sin((pan + 1) * 0.785) * 1.2;
  const outL = bus === 'pad' ? mix.padL : mix.dryL;
  const outR = bus === 'pad' ? mix.padR : mix.dryR;
  const line = new Float32Array(count);
  for (let k = 0; k < freqs.length; k++) {
    if (freqs[k] > 17000) continue;
    const step = (TAU * freqs[k]) / RATE;
    const c = Math.cos(step);
    const s = Math.sin(step);
    let x = amps[k];
    let y = 0;
    const fall = fades ? Math.exp(-fades[k] / RATE) : 1;
    for (let i = 0; i < count; i++) {
      line[i] += y;
      const nx = x * c - y * s;
      y = (x * s + y * c) * fall;
      x = nx * fall;
    }
  }
  for (let i = 0; i < count; i++) {
    const v = line[i] * envelope(i / RATE, count / RATE);
    outL[from + i] += v * left;
    outR[from + i] += v * right;
    mix.sendL[from + i] += v * left * send;
    mix.sendR[from + i] += v * right * send;
  }
}

function pad(mix, start, length, note, gain, pan) {
  const base = hz(note);
  const attack = Math.min(1.4, length * 0.4);
  const envelope = (t, total) => clamp(t / attack) * clamp((total - t) / 2.4) * gain;
  for (const detune of [-1, 1]) {
    const freqs = [];
    const amps = [];
    for (let k = 1; k <= 7; k++) {
      freqs.push(base * k * (1 + detune * 0.0011));
      amps.push(1 / Math.pow(k, 1.3));
    }
    partials(mix, 'pad', start, length + 2.4, freqs, amps, null, pan + detune * 0.3, 0.5, envelope);
  }
}

function piano(mix, start, note, gain, pan, send = 0.5) {
  const base = hz(note);
  const freqs = [];
  const amps = [];
  const fades = [];
  for (let k = 1; k <= 8; k++) {
    freqs.push(base * k * Math.sqrt(1 + 0.0004 * k * k));
    amps.push(1 / Math.pow(k, 1.5));
    fades.push(0.8 + k * k * 0.32 + base * 0.0012);
  }
  partials(mix, 'dry', start, 5, freqs, amps, fades, pan, send, (t) => clamp(t / 0.003) * gain);
}

function lead(mix, start, length, note, gain) {
  const base = hz(note);
  const freqs = [];
  const amps = [];
  for (let k = 1; k <= 6; k++) {
    freqs.push(base * k);
    amps.push(1 / Math.pow(k, 1.1));
  }
  const envelope = (t, total) => clamp(t / 0.35) * clamp((total - t) / 0.9) * gain * (1 + 0.05 * Math.sin(TAU * 4.6 * t) * clamp(t - 0.5));
  for (const pan of [-0.25, 0.25]) partials(mix, 'dry', start, length + 0.9, freqs.map((f) => f * (1 + pan * 0.003)), amps, null, pan, 0.75, envelope);
}

function drum(mix, start, gain, low, high, drop, length) {
  const from = Math.floor(start * RATE);
  const count = Math.min(Math.floor(length * RATE), mix.n - from);
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    phase += (TAU * (low + (high - low) * Math.exp(-t * drop))) / RATE;
    const v = Math.sin(phase) * Math.exp((-t * 5) / length) * gain;
    mix.dryL[from + i] += v;
    mix.dryR[from + i] += v;
    mix.sendL[from + i] += v * 0.15;
    mix.sendR[from + i] += v * 0.15;
  }
}

function tick(mix, start, gain, pan, noise) {
  const from = Math.floor(start * RATE);
  const count = Math.min(Math.floor(0.03 * RATE), mix.n - from);
  let held = 0;
  for (let i = 0; i < count; i++) {
    const raw = noise();
    const v = (raw - held) * Math.exp((-i / RATE) * 240) * gain;
    held = raw;
    mix.dryL[from + i] += v * (1 - pan);
    mix.dryR[from + i] += v * (1 + pan);
    mix.sendL[from + i] += v * 0.3;
    mix.sendR[from + i] += v * 0.3;
  }
}

function sweep(mix, start, length, gain, noise, cutoff, shape) {
  const from = Math.floor(start * RATE);
  const count = Math.min(Math.floor(length * RATE), mix.n - from);
  let lowL = 0;
  let lowR = 0;
  for (let i = 0; i < count; i++) {
    const p = i / count;
    const k = 1 - Math.exp((-TAU * cutoff(p)) / RATE);
    lowL += (noise() - lowL) * k;
    lowR += (noise() - lowR) * k;
    const amp = shape(p) * gain;
    mix.dryL[from + i] += lowL * amp;
    mix.dryR[from + i] += lowR * amp;
    mix.sendL[from + i] += lowL * amp * 0.8;
    mix.sendR[from + i] += lowR * amp * 0.8;
  }
}

function impact(mix, start, power, noise) {
  drum(mix, start, 0.5 * Math.min(power, 1.4), 30, 95, 14, 1.6 + power * 2);
  sweep(mix, start, 1 + power * 2.4, 0.3 * Math.min(power, 1.4), noise, (p) => 4200 * Math.exp(-p * 4.4) + 120, (p) => Math.exp(-p * 5) * clamp(p * 300));
}

function reverb(mix) {
  const sizes = [1423, 1907, 2341, 2857, 3391, 3923, 4561, 5023];
  const lines = sizes.map((size) => new Float32Array(size));
  const at = new Int32Array(8);
  const soft = new Float32Array(8);
  const out = new Float32Array(8);
  const feedback = 0.84;
  const { n, sendL, sendR, dryL, dryR } = mix;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k < 8; k++) {
      out[k] = lines[k][at[k]];
      soft[k] += (out[k] - soft[k]) * 0.42;
      sum += soft[k];
    }
    sum *= 0.25;
    for (let k = 0; k < 8; k++) {
      lines[k][at[k]] = (soft[k] - sum) * feedback + (k % 2 ? sendR[i] : sendL[i]) * 0.5;
      at[k] = (at[k] + 1) % sizes[k];
    }
    dryL[i] += (out[0] + out[2] + out[4] + out[6]) * 0.32;
    dryR[i] += (out[1] + out[3] + out[5] + out[7]) * 0.32;
  }
}

function buildBars(end) {
  const bars = [];
  PLAN.forEach((section, index) => {
    const stop = index + 1 < PLAN.length ? PLAN[index + 1].at : end;
    const span = stop - section.at;
    const count = Math.max(1, Math.round(span / BAR));
    const length = span / count;
    for (let k = 0; k < count; k++) bars.push({ at: section.at + k * length, length, section, index: k, count });
  });
  return bars;
}

function brightnessMap(timeline, end) {
  const step = 0.05;
  const map = new Float32Array(Math.ceil(end / step) + 2);
  for (let k = 0; k < map.length; k++) {
    const frame = Math.min(Math.floor(k * step * timeline.fps), timeline.light.length - 1);
    map[k] = timeline.light[frame] / 200;
  }
  return { map, step };
}

function flashes(timeline) {
  const { light, fps } = timeline;
  const list = [];
  for (let i = fps; i < light.length - fps; i++) {
    let past = 0;
    for (let k = 1; k <= 15; k++) past += light[i - k];
    past /= 15;
    if (light[i] - past < 22) continue;
    const t = i / fps;
    if (list.length && t - list[list.length - 1].t < 1) continue;
    if (PLAN.some((section) => section.hit && Math.abs(section.at - t) < 1)) continue;
    list.push({ t, power: Math.min((light[i] - past) / 50, 1) });
  }
  return list;
}

function writeNotes(mix, bars, noise) {
  let phrase = 0;
  let lastSection = null;
  for (const bar of bars) {
    const { section, at, length, index } = bar;
    if (section !== lastSection) {
      lastSection = section;
      phrase = 0;
      if (section.hit) impact(mix, section.at, section.hit, noise);
      if (section.rise) {
        const next = PLAN[PLAN.indexOf(section) + 1].at;
        sweep(mix, section.at, next - section.at, 0.1, noise, (p) => 180 + 7000 * p * p * p, (p) => p * p * p);
      }
      if (section.wind) sweep(mix, section.at, bar.length * bar.count, 0.09, noise, (p) => 300 + 260 * Math.sin(p * 37), (p) => Math.sin(p * Math.PI));
    }
    const chord = CHORDS[section.chords[Math.floor(index / 2) % section.chords.length]];
    if (index % 2 === 0) {
      const hold = length * 2;
      pad(mix, at, hold, chord[0], 0.1, 0);
      if (section.sub) pad(mix, at, hold, chord[0] - 12, 0.2, 0);
      chord.slice(1).forEach((note, k) => pad(mix, at, hold, note, 0.06, (k - 2) * 0.28));
    }
    const beat = length / 4;
    if (section.arp) {
      for (let k = 0; k < 16; k++) {
        const note = chord[ARP[k % 8]] + 12;
        const accent = k % 4 === 0 ? 1 : 0.68;
        piano(mix, at + (k * beat) / 2, note, 0.075 * section.arp * accent, Math.sin(k * 1.3) * 0.5);
      }
    }
    if (section.piano || section.lead) {
      const first = phrase % 8 === 0 ? phrase : phrase - (phrase % 8);
      const inside = phrase - first;
      for (const [when, note, size] of THEME) {
        if (Math.floor(when / 4) !== inside) continue;
        const start = at + (when % 4) * beat;
        if (section.piano) piano(mix, start, note + 12, 0.17, 0.1, 0.7);
        if (section.piano) piano(mix, start, note, 0.09, -0.1, 0.7);
        if (section.lead) lead(mix, start, size * beat, note, 0.05 * section.lead);
      }
    }
    if (section.heart) {
      drum(mix, at, 0.34 * section.heart, 44, 70, 30, 0.5);
      drum(mix, at + beat * 0.62, 0.24 * section.heart, 40, 62, 30, 0.45);
      if (section.drive) {
        drum(mix, at + beat * 2, 0.3, 44, 70, 30, 0.5);
      }
    }
    if (section.drive) {
      for (let k = 0; k < 16; k++) {
        const lowNote = chord[0] + 12;
        if (k % 2 === 0) piano(mix, at + (k * beat) / 2, lowNote, 0.1 * section.drive, 0, 0.2);
      }
      for (let k = 0; k < 4; k++) drum(mix, at + k * beat, 0.42 * section.drive, 42, 120, 34, 0.55);
    }
    if (section.tick) {
      for (let k = 0; k < 16; k++) tick(mix, at + (k * beat) / 4, (k % 4 === 0 ? 0.16 : 0.075) * section.tick, k % 2 ? 0.3 : -0.3, noise);
    }
    if (section.stars) {
      const grains = Math.round(section.stars * 6);
      for (let k = 0; k < grains; k++) {
        const t = at + ((noise() + 1) / 2) * length;
        const note = STARS[Math.floor(((noise() + 1) / 2) * STARS.length)] + 12;
        piano(mix, t, note, 0.022 + 0.018 * ((noise() + 1) / 2), noise() * 0.9, 0.95);
      }
    }
    phrase += 1;
  }
}

function applyStage(mix, timeline, end) {
  const { map, step } = brightnessMap(timeline, end);
  const { n, padL, padR, dryL, dryR } = mix;
  let lowL = 0;
  let lowR = 0;
  let open = 0.2;
  let level = PLAN[0].level;
  let part = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    while (part + 1 < PLAN.length && t >= PLAN[part + 1].at) part += 1;
    level += (PLAN[part].level - level) * 0.000012;
    const light = map[Math.min(Math.floor(t / step), map.length - 1)];
    open += (light - open) * 0.00003;
    const cut = 1 - Math.exp((-TAU * (320 + 5200 * clamp(open) * clamp(open) + 1500 * level)) / RATE);
    lowL += (padL[i] - lowL) * cut;
    lowR += (padR[i] - lowR) * cut;
    dryL[i] = (dryL[i] + lowL) * level;
    dryR[i] = (dryR[i] + lowR) * level;
  }
}

function hushBeforeBang(mix) {
  const from = 147.5;
  const to = 149.38;
  const { n, dryL, dryR } = mix;
  for (let i = Math.floor(from * RATE); i < Math.min(n, 149.4 * RATE); i++) {
    const t = i / RATE;
    const k = 1 - clamp((t - from) / (to - from - 1.2));
    dryL[i] *= k * k;
    dryR[i] *= k * k;
  }
}

function finish(mix, end) {
  const { n, dryL, dryR } = mix;
  const count = Math.min(n, Math.ceil(end * RATE));
  let peak = 0;
  let meanL = 0;
  let meanR = 0;
  for (let i = 0; i < count; i++) {
    meanL += dryL[i];
    meanR += dryR[i];
  }
  meanL /= count;
  meanR /= count;
  let keptL = 0;
  let keptR = 0;
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    const fade = clamp((end - t) / 8) * clamp(t / 0.3);
    const inL = dryL[i] - meanL;
    const inR = dryR[i] - meanR;
    keptL += (inL - keptL) * 0.00008;
    keptR += (inR - keptR) * 0.00008;
    dryL[i] = Math.tanh((inL - keptL) * 1.8) * fade;
    dryR[i] = Math.tanh((inR - keptR) * 1.8) * fade;
    peak = Math.max(peak, Math.abs(dryL[i]), Math.abs(dryR[i]));
  }
  const gain = 0.891 / peak;
  for (let i = 0; i < count; i++) {
    dryL[i] *= gain;
    dryR[i] *= gain;
  }
  return count;
}

function writeWav(path, left, right, count) {
  const data = Buffer.alloc(count * 4);
  const noise = makeNoise(77);
  for (let i = 0; i < count; i++) {
    const dither = (noise() + noise()) / 65536;
    data.writeInt16LE(Math.round(clamp(left[i] + dither, -1, 1) * 32767), i * 4);
    data.writeInt16LE(Math.round(clamp(right[i] + dither, -1, 1) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([head, data]));
}

function composeScore(timeline, path) {
  const end = timeline.end;
  const mix = createMix(end + 8);
  const noise = makeNoise(0x2f6e2b1);
  const bars = buildBars(end);
  writeNotes(mix, bars, noise);
  for (const flash of flashes(timeline)) {
    drum(mix, flash.t, 0.5 * flash.power, 34, 80, 12, 2.4);
    sweep(mix, flash.t, 3, 0.12 * flash.power, noise, (p) => 900 * Math.exp(-p * 3) + 90, (p) => Math.exp(-p * 3) * clamp(p * 200));
  }
  reverb(mix);
  applyStage(mix, timeline, end);
  hushBeforeBang(mix);
  const count = finish(mix, end);
  writeWav(path, mix.dryL, mix.dryR, count);
  return { bars: bars.length, flashes: flashes(timeline) };
}

module.exports = {
  RATE, TAU, clamp, hz, makeNoise, createMix, partials, pad, piano, lead, drum, tick, sweep, impact, reverb, finish, writeWav, composeScore,
};
