/**
 * Shared sea of visitor islands. Instanced mounds + markers, capped, pickable.
 */
import * as THREE from "three";
import { toonMat, makeOutlineMaterial, toonGradient } from "./toon.js";
import { islandHeight } from "./terrain.js";
import { LIST_CAP } from "../drift/config.js";

const GOLDEN = 2.399963229728653;

export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isletPosition(id, index) {
  const h = hash32(String(id || index));
  const angle = index * GOLDEN + (h % 1000) * 0.002;
  let radius = 23.8 + ((h >>> 8) % 900) / 900 * 6.5; // 23.8–30.3, just off the shore
  let x = Math.sin(angle) * radius;
  let z = Math.cos(angle) * radius;
  let guard = 0;
  while (islandHeight(x, z) > -0.7 && guard++ < 10) {
    radius += 2.4;
    x = Math.sin(angle) * radius;
    z = Math.cos(angle) * radius;
  }
  return { x, y: 0.04, z, angle, radius };
}

export class Archipelago {
  constructor(scene, max = LIST_CAP) {
    this.max = max;
    this.entries = [];
    this._ids = [];
    this.group = new THREE.Group();
    this.group.name = "archipelago";
    scene.add(this.group);

    const grad = toonGradient();
    const moundMat = toonMat(0xe889b0, { gradientMap: grad, emissive: 0xc45a7a, emissiveIntensity: 0.18 });
    const pathMat = toonMat(0xffe7b0, { gradientMap: grad, emissive: 0xffd090, emissiveIntensity: 0.12 });
    const markerMat = toonMat(0xd4453a, { gradientMap: grad, emissive: 0xff6a50, emissiveIntensity: 0.35 });
    const poleMat = toonMat(0xefe6d4, { gradientMap: grad });
    const seedMat = toonMat(0x7a8ad8, { gradientMap: grad });

    const moundGeo = new THREE.SphereGeometry(1.15, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    moundGeo.scale(1.25, 0.72, 1.2);
    this.mounds = new THREE.InstancedMesh(moundGeo, moundMat, max);
    this.mounds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mounds.castShadow = true;
    this.mounds.receiveShadow = true;
    this.mounds.frustumCulled = false;

    const capGeo = new THREE.SphereGeometry(0.42, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.scale(1.1, 0.45, 1);
    this.caps = new THREE.InstancedMesh(capGeo, pathMat, max);
    this.caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.caps.frustumCulled = false;

    const poleGeo = new THREE.CylinderGeometry(0.04, 0.045, 1.05, 5);
    this.poles = new THREE.InstancedMesh(poleGeo, poleMat, max);
    this.poles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.poles.frustumCulled = false;

    const flagGeo = new THREE.PlaneGeometry(0.55, 0.36);
    this.flags = new THREE.InstancedMesh(flagGeo, markerMat, max);
    this.flags.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.flags.frustumCulled = false;

    const seedGeo = new THREE.ConeGeometry(0.12, 0.22, 5);
    this.stars = new THREE.InstancedMesh(seedGeo, seedMat, max);
    this.stars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.stars.frustumCulled = false;

    // slightly larger pick volume
    const pickGeo = new THREE.SphereGeometry(1.15, 6, 5);
    const pickMat = new THREE.MeshBasicMaterial({ visible: false });
    this.picks = new THREE.InstancedMesh(pickGeo, pickMat, max);
    this.picks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.picks.frustumCulled = false;

    const outline = makeOutlineMaterial(0.05, 0x5a3d48);
    this.outlines = new THREE.InstancedMesh(moundGeo, outline, max);
    this.outlines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.outlines.frustumCulled = false;

    this.dummy = new THREE.Object3D();
    for (const m of [this.mounds, this.caps, this.poles, this.flags, this.stars, this.picks, this.outlines]) {
      m.count = 0;
      this.group.add(m);
    }
  }

  setEntries(entries) {
    const list = (entries || []).filter((e) => e && !e.hidden).slice(0, this.max);
    this.entries = list;
    this._ids = list.map((e) => e.id);
    const n = list.length;
    this.mounds.count = n;
    this.caps.count = n;
    this.poles.count = n;
    this.flags.count = n;
    this.stars.count = n;
    this.picks.count = n;
    this.outlines.count = n;

    for (let i = 0; i < n; i++) {
      const e = list[i];
      const p = isletPosition(e.id, i);
      e.x = p.x;
      e.z = p.z;
      const scale = e.seed ? 2.15 : 1.85 + (hash32(e.id) % 50) / 80;
      const dummy = this.dummy;

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.angle * 0.2, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.mounds.setMatrixAt(i, dummy.matrix);
      this.outlines.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, p.y + 0.28 * scale, p.z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.caps.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, p.y + 0.85 * scale, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, scale, 1);
      dummy.updateMatrix();
      this.poles.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x + 0.26 * scale, p.y + 1.1 * scale, p.z);
      dummy.rotation.set(0, p.angle, 0.15);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.flags.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, p.y + (e.seed ? 1.45 : 0) * scale, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(e.seed ? scale : 0.0001);
      dummy.updateMatrix();
      this.stars.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, p.y + 0.4, p.z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.picks.setMatrixAt(i, dummy.matrix);
    }
    for (const m of [this.mounds, this.caps, this.poles, this.flags, this.stars, this.picks, this.outlines]) {
      m.instanceMatrix.needsUpdate = true;
    }
  }

  upsert(entry) {
    if (!entry || entry.hidden) return;
    const i = this.entries.findIndex((e) => e.id === entry.id);
    const next = i >= 0 ? this.entries.map((e, k) => (k === i ? entry : e)) : [entry, ...this.entries];
    this.setEntries(next);
  }

  hide(id) {
    this.setEntries(this.entries.filter((e) => e.id !== id));
  }

  entryAt(id) {
    return this.entries.find((e) => e.id === id) || null;
  }

  pick(raycaster) {
    const hits = raycaster.intersectObject(this.picks, false);
    if (!hits.length) return null;
    const idx = hits[0].instanceId;
    if (idx == null) return null;
    return this.entries[idx] || null;
  }

  positionOf(id) {
    const i = this.entries.findIndex((e) => e.id === id);
    if (i < 0) return null;
    return isletPosition(id, i);
  }

  update(time) {
    const n = this.entries.length;
    if (!n) return;
    // gentle bob of flags
    for (let i = 0; i < n; i++) {
      const e = this.entries[i];
      const p = isletPosition(e.id, i);
      const scale = e.seed ? 2.15 : 1.85 + (hash32(e.id) % 50) / 80;
      const wave = Math.sin(time * 1.6 + i) * 0.08;
      this.dummy.position.set(p.x + 0.26 * scale, p.y + (1.1 + wave) * scale, p.z);
      this.dummy.rotation.set(0, p.angle + wave * 0.4, 0.15);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.flags.setMatrixAt(i, this.dummy.matrix);
    }
    this.flags.instanceMatrix.needsUpdate = true;
  }
}
