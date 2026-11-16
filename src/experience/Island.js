import * as THREE from "three";
import { islandHeight, fbm } from "./terrain.js";
import { STATIONS, PLAYER } from "../config.js";
import { toonMat, outlineMesh, outlineGroup } from "./toon.js";

const LILAC = new THREE.Color(0xd9c6ea);
const PINK = new THREE.Color(0xf3c2ce);
const PEACH = new THREE.Color(0xf7d3b8);
const MINT = new THREE.Color(0xb7e0cc);
const CREAM = new THREE.Color(0xf6f0dc);
const LAVENDER = new THREE.Color(0xcbb4e0);
const PATH = new THREE.Color(0xf8f3e0);

export class Island {
  constructor(scene, quality = "high") {
    this.scene = scene;
    this.quality = quality;
    this.group = new THREE.Group();
    scene.add(this.group);
    this._buildTerrain(quality);
    this._scatter(quality);
    this._flora(quality);
    this._tideBloom();
  }

  _buildTerrain(quality) {
    const segs = quality === "high" ? 128 : quality === "medium" ? 96 : 64;
    const size = 90;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = islandHeight(x, z);
      pos.setY(i, h);
      const n = fbm(x * 0.22, z * 0.22);
      const n2 = fbm(x * 0.55 + 8, z * 0.55);
      if (h < 0.12) c.lerpColors(PINK, PEACH, n);
      else if (h < 0.7) c.lerpColors(PEACH, PINK, 0.35 + n * 0.5);
      else {
        c.lerpColors(LILAC, LAVENDER, n);
        if (n2 > 0.62) c.lerp(MINT, (n2 - 0.62) * 1.6);
        c.offsetHSL(0, 0, (n - 0.5) * 0.06);
      }
      const path = pathAmount(x, z);
      if (path > 0) c.lerp(PATH, Math.min(1, path * 0.95));
      // keep underwater tint so the shoreline reads
      if (h < -0.05) c.lerp(new THREE.Color(0x9ab8d8), Math.min(1, -h * 0.5));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = toonMat(0xffffff, { vertexColors: true, steps: 4 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.userData.noOutline = true;
    this.group.add(this.mesh);
  }

  _scatter(quality) {
    const count = quality === "low" ? 22 : quality === "medium" ? 36 : 52;
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = toonMat(0xa8c6e4);
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const e = new THREE.Euler();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 900) {
      guard++;
      const x = (Math.random() - 0.5) * 58;
      const z = (Math.random() - 0.5) * 58;
      const h = islandHeight(x, z);
      if (h < 0.15 || h > 4.2) continue;
      if (pathAmount(x, z) > 0.35) continue;
      if (Math.hypot(x - 1.4, z + 1.8) < 4.5) continue;
      const sc = 0.28 + Math.random() * 0.85 + (h > 2.5 ? 0.25 : 0);
      p.set(x, h + sc * 0.22, z);
      e.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      q.setFromEuler(e);
      s.set(sc, sc * (0.7 + Math.random() * 0.45), sc * (0.8 + Math.random() * 0.4));
      m.compose(p, q, s);
      rocks.setMatrixAt(placed, m);
      placed++;
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    rocks.userData.noOutline = true;
    this.group.add(rocks);

    const trees = quality === "low" ? 8 : quality === "medium" ? 12 : 16;
    let t = 0;
    let g = 0;
    while (t < trees && g < 80) {
      g++;
      const x = (hash(t * 3 + g) - 0.5) * 36;
      const z = (hash(t * 7 + g + 2) - 0.5) * 36;
      const h = islandHeight(x, z);
      if (h < 0.6) continue;
      if (pathAmount(x, z) > 0.25) continue;
      if (Math.hypot(x - 1.4, z + 1.8) < 6) continue;
      this.group.add(makeGradientTree(x, h, z, 0.9 + hash(t + 3) * 0.55, t));
      t++;
    }
  }

  _flora(quality) {
    const popN = quality === "low" ? 90 : quality === "medium" ? 180 : 280;
    this.group.add(makeFlowerField(popN, "poppy"));
    const lupN = quality === "low" ? 40 : quality === "medium" ? 80 : 130;
    this.group.add(makeFlowerField(lupN, "lupine"));
    const grassN = quality === "low" ? 70 : quality === "medium" ? 140 : 220;
    this.group.add(makeGrassField(grassN));
  }

  /** An original harbor blossom — tall curling fronds, not a copy of any reference plant. */
  _tideBloom() {
    const root = new THREE.Group();
    const x = -5.5;
    const z = -12.5;
    const h = Math.max(islandHeight(x, z), 0.2);
    root.position.set(x, h, z);

    const stemMat = toonMat(0xe8a8b8);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, 7.2, 7), stemMat);
    stem.position.y = 3.6;
    root.add(stem);
    outlineMesh(stem, 0.05);

    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const frond = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 2.8, 3, 6),
        toonMat(i % 2 ? 0xf3b3c4 : 0xf7c8b0)
      );
      frond.position.set(Math.cos(a) * 0.15, 6.4, Math.sin(a) * 0.15);
      frond.rotation.z = Math.cos(a) * 0.85;
      frond.rotation.x = Math.sin(a) * 0.85;
      root.add(frond);
      outlineMesh(frond, 0.04);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), toonMat(0xffe08a, { emissive: 0xffc878, emissiveIntensity: 0.25 }));
      bell.position.set(Math.cos(a) * 1.7, 5.3, Math.sin(a) * 1.7);
      root.add(bell);
    }
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), toonMat(0xf6d0c0));
    crown.position.y = 7.3;
    root.add(crown);
    outlineMesh(crown, 0.05);
    this.group.add(root);
  }
}

function hash(i) {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function makeGradientTree(x, y, z, scale, seed) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.12, 1.5, 5),
    toonMat(0x8a5a4a)
  );
  trunk.position.y = 0.75;
  g.add(trunk);
  outlineMesh(trunk, 0.03);

  const tall = 2.4 + hash(seed) * 1.8;
  const cone = new THREE.ConeGeometry(0.7 + hash(seed + 1) * 0.35, tall, 6);
  const pos = cone.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color(0xfff0a0);
  const mid = new THREE.Color(0x9ee08a);
  const bot = new THREE.Color(0x5ec8b8);
  const c = new THREE.Color();
  const h = tall;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + h / 2) / h;
    if (t > 0.55) c.lerpColors(mid, top, (t - 0.55) / 0.45);
    else c.lerpColors(bot, mid, t / 0.55);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  cone.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const foliage = new THREE.Mesh(cone, toonMat(0xffffff, { vertexColors: true }));
  foliage.position.y = 1.4 + tall * 0.42;
  foliage.rotation.y = hash(seed + 4) * Math.PI;
  foliage.castShadow = true;
  g.add(foliage);
  outlineMesh(foliage, 0.05);
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.rotation.y = hash(x * 10 + z) * Math.PI * 2;
  g.rotation.z = 0.04;
  return g;
}

function makeFlowerField(count, kind) {
  const isPoppy = kind === "poppy";
  const geo = isPoppy
    ? new THREE.SphereGeometry(0.16, 5, 4)
    : new THREE.ConeGeometry(0.09, 0.55, 5);
  const mat = toonMat(isPoppy ? 0xe85a3c : 0x6b7fd7);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let n = 0;
  let guard = 0;
  while (n < count && guard < count * 8) {
    guard++;
    const x = (Math.random() - 0.5) * 44;
    const z = (Math.random() - 0.5) * 44;
    const h = islandHeight(x, z);
    if (h < 0.2 || h > 3.6) continue;
    if (pathAmount(x, z) > 0.55) continue;
    dummy.position.set(x, h + (isPoppy ? 0.28 : 0.38), z);
    dummy.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
    const sc = isPoppy ? 0.7 + Math.random() * 0.7 : 0.8 + Math.random() * 0.6;
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    n++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.noOutline = true;
  mesh.castShadow = false;
  return mesh;
}

function makeGrassField(count) {
  const geo = new THREE.ConeGeometry(0.16, 0.45, 4);
  const mat = toonMat(0x7dce9a);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let n = 0;
  let guard = 0;
  while (n < count && guard < count * 8) {
    guard++;
    const x = (Math.random() - 0.5) * 46;
    const z = (Math.random() - 0.5) * 46;
    const h = islandHeight(x, z);
    if (h < 0.25 || h > 3.4) continue;
    if (pathAmount(x, z) > 0.45) continue;
    dummy.position.set(x, h + 0.18, z);
    dummy.rotation.set(0.15, Math.random() * Math.PI, 0.1);
    dummy.scale.set(0.7 + Math.random() * 0.8, 0.8 + Math.random() * 1.1, 0.7);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    n++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.noOutline = true;
  return mesh;
}

/** Faint worn path from the south beach through the hut, with spurs to each place. */
const PATH_SPINE = [
  [PLAYER.arrival.x, PLAYER.arrival.z],
  [0.6, 10.5],
  [1.0, 4.2],
  [1.4, -1.8],
];
const PATH_SPURS = [
  [[1.4, -1.8], [2.8, -9.5], [4.2, -17.5]],
  [[1.4, -1.8], [6.2, -3.8], [9.6, -5.2]],
  [[1.4, -1.8], [5.2, 4.6], [7.4, 8.4], [10.8, 13.2]],
  [[1.4, -1.8], [-4.6, 4.8], [-9.2, 9.8], [-12.5, 5.5]],
];

function distToSegment(x, z, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((x - ax) * dx + (z - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

function distToPolyline(x, z, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    d = Math.min(d, distToSegment(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  return d;
}

export function pathAmount(x, z) {
  let d = distToPolyline(x, z, PATH_SPINE);
  for (const spur of PATH_SPURS) d = Math.min(d, distToPolyline(x, z, spur));
  for (const s of STATIONS) {
    d = Math.min(d, Math.hypot(x - s.pos[0], z - s.pos[1]) - 0.7);
  }
  const width = 1.7;
  if (d > width) return 0;
  const a = 1 - d / width;
  return a * a;
}
