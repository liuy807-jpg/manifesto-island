/**
 * Small toon props for the Drift chapter: a folded paper boat and a bottle.
 */
import * as THREE from "three";
import { toonMat, outlineGroup } from "./toon.js";

export function makePaperBoat() {
  const g = new THREE.Group();
  const paper = toonMat(0xf7f0de);
  const crease = toonMat(0xe8d9b8);
  const ink = toonMat(0xb5443c);

  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.62, 4), paper);
  hull.rotation.y = Math.PI / 4;
  hull.rotation.x = Math.PI;
  hull.position.y = 0.12;
  g.add(hull);

  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), crease);
  keel.position.y = 0.02;
  g.add(keel);

  const sail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 3), paper);
  sail.position.set(0, 0.42, -0.02);
  sail.rotation.y = 0.4;
  g.add(sail);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.46, 5), crease);
  mast.position.y = 0.32;
  g.add(mast);

  const stamp = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), ink);
  stamp.position.set(0.08, 0.28, 0.16);
  stamp.rotation.x = -0.6;
  g.add(stamp);

  outlineGroup(g, 0.018, 0x5a3d48);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  g.scale.setScalar(1);
  return g;
}

export function makeBottle() {
  const g = new THREE.Group();
  const glass = toonMat(0xc8e4e2);
  glass.transparent = true;
  glass.opacity = 0.78;
  const cork = toonMat(0xc49a6c);
  const paper = toonMat(0xf4ead0);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.32, 8), glass);
  body.position.y = 0.16;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.12, 6), glass);
  neck.position.y = 0.36;
  g.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), cork);
  cap.position.y = 0.44;
  g.add(cap);
  const note = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.02), paper);
  note.position.set(0.02, 0.16, 0);
  note.rotation.z = 0.2;
  g.add(note);

  outlineGroup(g, 0.014, 0x4a6670);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
