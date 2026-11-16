/**
 * Approach: Island — shared design language, station map, and manifesto copy.
 * All manifesto wording is kept verbatim from the original text.
 */

export const TIMING = {
  dwellDelay: 700,
  revealRate: 0.38,
  stillRate: 0.28,
  knownRate: 0.58,
  scatterRate: 1.4,
  nearPad: 0.6,
  introSeconds: 5.2,
};

export const PLAYER = {
  eye: 1.15,
  walk: 3.6,
  run: 5.4,
  lookSens: 0.0045,
  touchSens: 0.005,
  pitchMin: -0.55,
  pitchMax: 0.62,
  camDist: 14.5,
  camHeight: 7.4,
  camFov: 50,
  zoomMin: 8,
  zoomMax: 22,
  arrival: { x: 0.4, z: 16.6, yaw: 0 }, // on the walkable beach, facing north
};

/** Dawn palette, 0–1 journey. RGB 0–1. */
export const PALETTE_KEYS = [
  {
    t: 0,
    zenith: [0.55, 0.42, 0.72],
    horizon: [0.98, 0.78, 0.82],
    haze: [0.95, 0.82, 0.88],
    sun: [1.0, 0.82, 0.62],
    deep: [0.45, 0.55, 0.72],
    shallow: [0.72, 0.78, 0.88],
    fog: [0.82, 0.74, 0.84],
    sunAmount: 0.55,
    elevation: 0.22,
  },
  {
    t: 0.4,
    zenith: [0.48, 0.40, 0.68],
    horizon: [1.0, 0.72, 0.62],
    haze: [1.0, 0.84, 0.72],
    sun: [1.0, 0.78, 0.52],
    deep: [0.40, 0.50, 0.68],
    shallow: [0.78, 0.76, 0.82],
    fog: [0.90, 0.78, 0.76],
    sunAmount: 0.75,
    elevation: 0.28,
  },
  {
    t: 0.7,
    zenith: [0.42, 0.38, 0.62],
    horizon: [1.0, 0.70, 0.42],
    haze: [1.0, 0.78, 0.50],
    sun: [1.0, 0.86, 0.55],
    deep: [0.52, 0.54, 0.70],
    shallow: [0.96, 0.82, 0.68],
    fog: [0.98, 0.86, 0.70],
    sunAmount: 0.9,
    elevation: 0.36,
  },
  {
    t: 1,
    zenith: [0.38, 0.42, 0.62],
    horizon: [1.0, 0.78, 0.42],
    haze: [1.0, 0.88, 0.58],
    sun: [1.0, 0.92, 0.62],
    deep: [0.58, 0.56, 0.68],
    shallow: [1.0, 0.88, 0.64],
    fog: [1.0, 0.90, 0.70],
    sunAmount: 1,
    elevation: 0.46,
  },
];

export const STATIONS = [
  {
    id: "voices",
    num: "01",
    name: "The Listening Basin",
    pos: [-12.5, 5.5],
    radius: 5.2,
    headline:
      "My mission is to let the voices of all things be felt, and to do it without asking people to enter a gallery, find a signal, or have energy to spare.",
    excerpt:
      "I am shaped by social expectations: I long for the unknown, yet I cannot let go of worldly success. Freedom, for me, is not escaping society.",
    body: "",
  },
  {
    id: "invisible",
    num: "02",
    name: "The Lantern",
    pos: [4.2, -17.5],
    radius: 6.0,
    headline:
      "I want to make the invisible felt, and I believe technology should help us sense and question the world, not just decorate it.",
    excerpt:
      "Much of what shapes us is hard to see: emotions, memories, social expectations, the systems hidden behind our screens.",
    body: "",
  },
  {
    id: "bridge",
    num: "03",
    name: "The Crossing",
    pos: [-9.2, 9.8],
    radius: 4.8,
    headline:
      "I build bridges between physical and virtual worlds, because neither one alone can reach everyone.",
    excerpt:
      "Virtual spaces travel easily, but they need a screen and a signal. Physical spaces can be felt directly, but only by the people who are there.",
    body: "",
  },
  {
    id: "presence",
    num: "04",
    name: "The Window",
    pos: [1.4, -1.8],
    radius: 5.5,
    headline: "I believe that being present matters more than being seen to help.",
    excerpt:
      "Trust cannot be shown, only earned slowly by staying. That is what I want my work to do.",
    body: "",
  },
  {
    id: "listening",
    num: "05",
    name: "The Circle",
    pos: [9.6, -5.2],
    radius: 5.0,
    headline:
      "I believe that curiosity begins with listening, and that every life holds something I do not yet understand.",
    excerpt:
      "I sit with these people and hear how they came to live as they do. I respect each person’s choices, and I know my own view is still narrow.",
    body: "",
  },
  {
    id: "making",
    num: "06",
    name: "The Unfinished Hull",
    pos: [7.4, 8.4],
    radius: 4.8,
    headline:
      "I believe that making is a way of learning, and that I should make with others, not only for them.",
    excerpt:
      "I do not believe in perfect work. What matters most to me is trying something new, because each unfinished attempt shows me something the plan could not.",
    body: "",
  },
  {
    id: "freedom",
    num: "07",
    name: "The Boat",
    pos: [10.8, 13.2],
    radius: 5.5,
    headline: "I believe that freedom begins as an image you refuse to give up.",
    excerpt:
      "I keep having the same dream: I am alone on a boat in the middle of the ocean, watching the sun rise.",
    body: "",
    isFinale: true,
  },
];

// bodies filled below so this file stays readable
import { MANIFESTO_BODIES } from "./manifestoBodies.js";
STATIONS.forEach((s, i) => {
  s.body = MANIFESTO_BODIES[i];
});

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
export function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
export function paletteAt(progress) {
  const p = clamp(progress, 0, 1);
  const keys = PALETTE_KEYS;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t < p) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const t = smoothstep(a.t, b.t, p);
  return {
    zenith: lerp3(a.zenith, b.zenith, t),
    horizon: lerp3(a.horizon, b.horizon, t),
    haze: lerp3(a.haze, b.haze, t),
    sun: lerp3(a.sun, b.sun, t),
    deep: lerp3(a.deep, b.deep, t),
    shallow: lerp3(a.shallow, b.shallow, t),
    fog: lerp3(a.fog, b.fog, t),
    sunAmount: lerp(a.sunAmount, b.sunAmount, t),
    elevation: lerp(a.elevation, b.elevation, t),
  };
}
