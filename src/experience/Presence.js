/**
 * Hook for later multiplayer: other visitors appear as soft glowing lights.
 * Wired to the live WebSocket (`presence` messages) but inactive when alone.
 */
import * as THREE from "three";

export class Presence {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.others = new Map();
  }

  upsert(msg) {
    if (!msg || !msg.id) return;
    let rec = this.others.get(msg.id);
    if (!rec) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe0b0,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat);
      const glow = new THREE.PointLight(0xffd19a, 0.6, 5, 2);
      const g = new THREE.Group();
      g.add(mesh, glow);
      this.group.add(g);
      rec = { group: g, target: new THREE.Vector3() };
      this.others.set(msg.id, rec);
    }
    rec.target.set(msg.x || 0, (msg.y || 1.5) + 0.2, msg.z || 0);
    rec.last = performance.now();
  }

  update(dt) {
    const now = performance.now();
    for (const [id, rec] of this.others) {
      if (now - rec.last > 8000) {
        this.group.remove(rec.group);
        this.others.delete(id);
        continue;
      }
      rec.group.position.lerp(rec.target, 1 - Math.exp(-6 * dt));
    }
  }
}
