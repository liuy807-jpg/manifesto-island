/**
 * The seven places on the island. Each is a modest, symbolic object
 * built from primitives — no imported models required to run.
 * Pastel toon materials, soft ink outlines; same seven meanings.
 */
import * as THREE from "three";
import { STATIONS } from "../config.js";
import { islandHeight } from "./terrain.js";
import { toonMat, outlineGroup } from "./toon.js";

const stone = (hex) => toonMat(hex);
const wood = (hex) => toonMat(hex);
const cloth = (hex) => toonMat(hex, { side: THREE.DoubleSide });

export class Stations {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.lights = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    for (const def of STATIONS) this._place(def);
  }

  _anchor(def) {
    const x = def.pos[0];
    const z = def.pos[1];
    const y = Math.max(islandHeight(x, z), 0);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.userData.id = def.id;
    this.group.add(g);
    const item = { def, group: g, x, y, z, glow: null, light: null };
    this.items.push(item);
    return item;
  }

  _place(def) {
    const item = this._anchor(def);
    const builders = {
      voices: buildBasin,
      invisible: buildLighthouse,
      bridge: buildBridge,
      presence: buildHut,
      listening: buildCircle,
      making: buildHull,
      freedom: buildBoat,
    };
    (builders[def.id] || buildMarker)(item);
    item.group.traverse((o) => {
      if (o.isMesh && o.material && o.material.blending !== THREE.AdditiveBlending) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    outlineGroup(item.group, 0.03);
  }

  update(time, progress, clarities) {
    for (const item of this.items) {
      const c = clarities[item.def.id] || 0;
      if (item.light) {
        const base = item.light.userData.baseIntensity || 1;
        item.light.intensity = base * (0.7 + c * 0.45 + Math.sin(time * 1.3) * 0.06);
      }
      if (item.glow) {
        item.glow.material.opacity = 0.1 + c * 0.16;
        item.glow.scale.setScalar(1 + c * 0.12);
      }
      if (item.lantern) {
        item.lantern.rotation.y = time * 0.25;
      }
    }
  }

  /** World position of a station, for proximity tests. */
  worldPos(id, out) {
    const item = this.items.find((s) => s.def.id === id);
    if (!item) return out.set(0, 0, 0);
    return out.set(item.x, item.y, item.z);
  }
}

function addGlow(item, radius, color) {
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.28, 12, 10), mat);
  mesh.position.y = 0.55;
  mesh.renderOrder = 2;
  mesh.userData.noOutline = true;
  item.group.add(mesh);
  item.glow = mesh;
}

function addAccent(item, color, intensity = 0.7, distance = 8, y = 1.05) {
  if (item.light) return;
  const light = new THREE.PointLight(color, intensity, distance, 1.85);
  light.position.y = y;
  light.userData.baseIntensity = intensity;
  item.group.add(light);
  item.light = light;
}

function buildBasin(item) {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.18, 8, 24), stone(0x9ab0d4));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.28;
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    toonMat(0x7ea8c4)
  );
  bowl.position.y = 0.28;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.92, 24),
    toonMat(0x7ed0c8, { emissive: 0x4aa090, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.34;
  water.userData.noOutline = true;
  item.group.add(rim, bowl, water);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + (i % 3) * 0.06, 0), stone(i % 2 ? 0xb8c8e8 : 0xa0b8d8));
    s.position.set(Math.cos(a) * 1.55, 0.12, Math.sin(a) * 1.55);
    s.rotation.set(Math.random(), a, Math.random());
    item.group.add(s);
  }
  addGlow(item, 1.4, 0xb8e8e0);
  addAccent(item, 0xb8e8e0, 0.55, 7, 0.8);
}

function buildLighthouse(item) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.7, 10), stone(0xb8a8c8));
  base.position.y = 0.35;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 6.2, 10), wood(0xf3e6d0));
  shaft.position.y = 3.5;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.28, 10), wood(0xe8a070));
  band.position.y = 5.2;
  const walk = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 12), wood(0xe8c8a0));
  walk.position.y = 6.55;
  const lantern = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.7, 8),
    toonMat(0xffe6b0, { emissive: 0xffc078, emissiveIntensity: 0.85, transparent: true, opacity: 0.95 })
  );
  glass.position.y = 0.35;
  glass.userData.noOutline = true;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 8), wood(0xe89070));
  cap.position.y = 0.9;
  lantern.add(glass, cap);
  lantern.position.y = 6.7;
  item.lantern = lantern;
  item.group.add(base, shaft, band, walk, lantern);
  const light = new THREE.PointLight(0xffd19a, 1.35, 18, 1.6);
  light.position.y = 7.1;
  light.userData.baseIntensity = 1.35;
  item.group.add(light);
  item.light = light;
  addGlow(item, 1.8, 0xffd19a);
}

function buildBridge(item) {
  const dir = new THREE.Vector3(0.82, 0, 0.57).normalize();
  const len = 5.4;
  const plankMat = wood(0xf0d8b0);
  const railMat = wood(0xe0b888);
  for (let i = 0; i < 11; i++) {
    const t = (i / 10 - 0.5) * len;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.46), plankMat);
    plank.position.set(dir.x * t, 0.42, dir.z * t);
    plank.rotation.y = Math.atan2(dir.x, dir.z);
    item.group.add(plank);
  }
  for (const side of [-0.38, 0.38]) {
    const postOff = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side);
    for (let i = 0; i < 5; i++) {
      const t = (i / 4 - 0.5) * len;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.95, 6), railMat);
      post.position.set(dir.x * t + postOff.x, 0.85, dir.z * t + postOff.z);
      item.group.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, len + 0.2), railMat);
    rail.position.set(postOff.x, 1.25, postOff.z);
    rail.rotation.y = Math.atan2(dir.x, dir.z);
    item.group.add(rail);
  }
  addGlow(item, 1.3, 0xf0d8b0);
  addAccent(item, 0xffe0b8, 0.55, 7, 1.1);
}

function buildHut(item) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.15, 2.6), toonMat(0xf4e6d0));
  body.position.y = 1.15;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.15, 4), toonMat(0xe8a0b0));
  roof.position.y = 2.7;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.35, 0.08), wood(0xe0b898));
  door.position.set(0, 0.75, 1.34);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.06), wood(0xe8c8a8));
  frame.position.set(0.7, 1.35, 1.33);
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.68),
    toonMat(0xffe0a8, { emissive: 0xffb45a, emissiveIntensity: 0.7 })
  );
  pane.position.set(0.7, 1.35, 1.37);
  pane.userData.noOutline = true;
  item.group.add(body, roof, door, frame, pane);
  const light = new THREE.PointLight(0xffc07a, 1.1, 12, 1.8);
  light.position.set(0.3, 1.4, 0.6);
  light.userData.baseIntensity = 1.1;
  item.group.add(light);
  item.light = light;
  for (let i = 1; i <= 4; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 7), stone(0xc8d8f0));
    s.position.set((i % 2) * 0.25, 0.05, 1.8 + i * 0.7);
    item.group.add(s);
  }
  addGlow(item, 1.6, 0xffd0a0);
}

function buildCircle(item) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.15;
    const r = 2.15 + (i % 3) * 0.12;
    const h = 0.38 + (i % 2) * 0.18;
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 6, 5),
      stone(i % 2 ? 0xa8c0e8 : 0xb8d0f0)
    );
    s.scale.set(1, h / 0.42, 0.85);
    s.position.set(Math.cos(a) * r, h * 0.45, Math.sin(a) * r);
    item.group.add(s);
  }
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 16),
    toonMat(0xf6f0dc)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.03;
  ground.userData.noOutline = true;
  item.group.add(ground);
  addGlow(item, 1.8, 0xe8d8f0);
  addAccent(item, 0xe8d4a8, 0.55, 8, 0.7);
}

function buildHull(item) {
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 3.4), wood(0xe0b888));
  keel.position.y = 0.18;
  item.group.add(keel);
  for (let i = 0; i < 5; i++) {
    const z = (i / 4 - 0.5) * 2.6;
    const w = 0.45 + Math.sin((i / 4) * Math.PI) * 0.55;
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(w, 0.04, 6, 12, Math.PI),
      wood(0xf0d0a8)
    );
    rib.rotation.z = Math.PI;
    rib.rotation.y = Math.PI / 2;
    rib.position.set(0, 0.18, z);
    item.group.add(rib);
  }
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 2.2), wood(0xf4d8b0));
  plank.position.set(0.7, 0.08, 0.2);
  plank.rotation.y = 0.3;
  plank.rotation.z = 0.08;
  item.group.add(plank);
  addGlow(item, 1.3, 0xf0d0a0);
  addAccent(item, 0xffe0b0, 0.5, 7, 0.7);
}

function buildBoat(item) {
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), wood(0xe8b888));
  hull.scale.set(0.85, 0.42, 1.55);
  hull.position.y = 0.22;
  const deck = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), wood(0xf6e6c8));
  deck.rotation.x = -Math.PI / 2;
  deck.scale.set(0.9, 1.6, 1);
  deck.position.y = 0.38;
  deck.userData.noOutline = true;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.6, 8), wood(0xd4a070));
  mast.position.y = 1.6;
  const sail = new THREE.Mesh(new THREE.BufferGeometry(), cloth(0xfff6ea));
  const verts = new Float32Array([0, 0, 0, 0, 2.15, 0, 1.15, 0.45, 0.05]);
  sail.geometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  sail.geometry.setIndex([0, 1, 2]);
  sail.geometry.computeVertexNormals();
  sail.position.set(0.04, 0.5, 0);
  item.group.rotation.y = Math.PI / 2;
  item.group.add(hull, deck, mast, sail);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6), wood(0xe0b080));
  post.position.set(0, 0.4, 1.6);
  item.group.add(post);
  addGlow(item, 1.6, 0xffe0b0);
  addAccent(item, 0xffe0b0, 0.7, 9, 1.3);
}

function buildMarker(item) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 5), stone(0xc8b0e0));
  m.position.y = 0.6;
  item.group.add(m);
}
