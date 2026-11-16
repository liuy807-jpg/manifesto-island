/**
 * Shared island height field — used both to sculpt the mesh and to
 * keep the walker's feet on the ground. One function, one world.
 */

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise2(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm(x, z, octaves = 4) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * noise2(x * f, z * f);
    a *= 0.5;
    f *= 2.03;
  }
  return v;
}

export function islandRadius(ang) {
  let r = 22 + 4.6 * Math.cos(ang * 2 + 0.3) + 2.1 * Math.sin(ang * 3 - 0.4);
  const north = Math.exp(-(((ang + Math.PI / 2) / 0.52) ** 2));
  r += 11 * north;
  const se = Math.exp(-(((ang - 0.85) / 0.72) ** 2));
  r += 3.2 * se;
  return r;
}

function cutWeight(x, z) {
  const cx = x + 11.2;
  const cz = z - 10.1;
  const along = cx * 0.82 + cz * 0.57;
  const across = -cx * 0.57 + cz * 0.82;
  if (along < -5 || along > 8.5) return 0;
  const w = 1 - Math.abs(across) / 2.15;
  return w > 0 ? w * w : 0;
}

export function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  const R = islandRadius(ang);
  const n = fbm(x * 0.11, z * 0.11);

  if (r > R + 8) return -3;

  const t = 1 - r / R;
  let h;
  if (t < 0) {
    const d = r - R;
    h = -0.12 - d * 0.22 + n * 0.04;
  } else if (t < 0.17) {
    h = (t / 0.17) * 0.58 + n * 0.06;
  } else {
    h = 0.58 + ((t - 0.17) / 0.83) ** 1.05 * (2.9 + n * 1.55);
  }

  const hut = Math.hypot(x - 1.4, z + 1.8);
  if (hut < 6.5) {
    const k = hut / 6.5;
    h = h * (0.35 + 0.65 * k) + 0.9 * (1 - k);
  }

  const circ = Math.hypot(x - 9.6, z + 5.2);
  if (circ < 5.2) {
    const k = circ / 5.2;
    h = 1.02 * (1 - k) + h * k;
  }

  if (z < -12) h += Math.max(0, -12 - z) * 0.13 + n * 0.35;

  const cut = cutWeight(x, z);
  if (cut > 0) h = h * (1 - cut) + (-0.18) * cut;

  return h;
}

export function islandNormal(x, z, e = 0.32) {
  const h = islandHeight(x, z);
  const dx = islandHeight(x + e, z) - h;
  const dz = islandHeight(x, z + e) - h;
  const nx = -dx / e;
  const ny = 1;
  const nz = -dz / e;
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/** Height underfoot: stand on land or in the very shallows. */
export function walkHeight(x, z) {
  return Math.max(islandHeight(x, z), 0);
}

export function isWalkable(x, z) {
  const h = islandHeight(x, z);
  if (h >= -0.22) return true;
  return false;
}
