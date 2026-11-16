/**
 * Third-person walking: a small traveler on the island.
 * WASD / arrows + Q/E to orbit, drag to orbit, click / tap the ground
 * (or a place) to walk there. Optional gamepad and virtual joystick.
 */
import * as THREE from "three";
import { PLAYER } from "../config.js";
import { islandHeight, isWalkable, walkHeight } from "./terrain.js";
import { toonMat, outlineGroup } from "./toon.js";

export class Player {
  constructor(camera, canvas, islandMesh, opts = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.islandMesh = islandMesh;
    this.stationGroup = opts.stationGroup || null;
    this.onUnlockAudio = opts.onUnlockAudio || null;
    this.onClickStation = opts.onClickStation || null;
    this.enabled = false;
    this.yaw = PLAYER.arrival.yaw; // character facing
    this.camYaw = 0; // 0 = camera south of character, looking north
    this.pitch = -0.7;
    this.camDist = PLAYER.camDist;
    this.camHeight = PLAYER.camHeight;
    this.position = new THREE.Vector3(PLAYER.arrival.x, 0, PLAYER.arrival.z);
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.lookDragging = false;
    this.pointerLocked = false;
    this.walkTarget = null;
    this.joystick = { x: 0, y: 0, active: false };
    this.speedMul = 1;
    this.raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._scratch = new THREE.Vector3();
    this.lastMoved = 0;
    this.speed = 0;
    this._lookStart = null;
    this._facing = 0;
    this.cinematic = false;
    this.onPickIslet = opts.onPickIslet || null;
    this.character = makeTraveler();
    if (opts.scene) opts.scene.add(this.character);

    this._bind();
    this._syncCamera();
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!on) this._exitPointerLock();
  }

  setCinematic(on) {
    this.cinematic = !!on;
    if (on) {
      this.enabled = false;
      this.walkTarget = null;
      this.keys.clear();
      this.joystick = { x: 0, y: 0, active: false };
      this.lookDragging = false;
      this._lookStart = null;
    }
  }

  setJoystick(x, y, active) {
    this.joystick.x = x;
    this.joystick.y = y;
    this.joystick.active = active;
    if (active) this.walkTarget = null;
  }

  setWalkTarget(x, z) {
    if (!isWalkable(x, z)) return false;
    this.walkTarget = new THREE.Vector3(x, 0, z);
    return true;
  }

  place(x, z, yaw) {
    this.position.set(x, walkHeight(x, z), z);
    if (yaw != null) {
      this.yaw = yaw;
      this._facing = yaw;
    }
    this._syncCamera();
  }

  _bind() {
    const el = this.canvas;
    window.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "q", "e"].includes(k)) {
        this.keys.add(k);
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
          this.walkTarget = null;
        }
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    el.addEventListener("click", () => {
      if (this.onUnlockAudio) this.onUnlockAudio();
    });

    el.addEventListener("pointerdown", (e) => this._onDown(e));
    window.addEventListener("pointermove", (e) => this._onMove(e));
    window.addEventListener("pointerup", (e) => this._onUp(e));
    window.addEventListener("pointercancel", (e) => this._onUp(e));
    el.addEventListener("wheel", (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.camDist = Math.max(PLAYER.zoomMin, Math.min(PLAYER.zoomMax, this.camDist + e.deltaY * 0.012));
      this.camHeight = this.camDist * (PLAYER.camHeight / PLAYER.camDist);
    }, { passive: false });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  _onDown(e) {
    if (!this.enabled) return;
    if (e.target.closest?.(".ui-ignore, button, a, .sheet, .joystick, .hud-box, .scrap, .journal-book, .modal-layer, #journal, #gate, #compose, #receive, #landing, #islet-card")) return;
    this._lookStart = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      moved: 0,
    };
    this.lookDragging = true;
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  _onMove(e) {
    if (!this.lookDragging || !this._lookStart || e.pointerId !== this._lookStart.id) return;
    const dx = e.clientX - this._lookStart.x;
    const dy = e.clientY - this._lookStart.y;
    this._lookStart.moved += Math.hypot(e.movementX || dx, e.movementY || dy);
    this.camYaw -= (e.movementX || dx * 0.4) * PLAYER.lookSens;
    this._lookStart.x = e.clientX;
    this._lookStart.y = e.clientY;
  }

  _onUp(e) {
    if (!this._lookStart || e.pointerId !== this._lookStart.id) return;
    const dt = performance.now() - this._lookStart.t;
    const moved = this._lookStart.moved;
    const sx = this._lookStart.x;
    const sy = this._lookStart.y;
    this.lookDragging = false;
    this._lookStart = null;
    if (dt < 320 && moved < 14) this._tapToWalk(sx, sy);
  }

  _tapToWalk(cx, cy) {
    this._ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this._ndc, this.camera);
    if (this.stationGroup) {
      const hits = this.raycaster.intersectObject(this.stationGroup, true);
      if (hits.length) {
        let obj = hits[0].object;
        while (obj && !obj.userData.id && obj.parent) obj = obj.parent;
        const id = obj?.userData?.id;
        if (id) {
          this.onClickStation?.(id);
          const p = hits[0].point;
          if (isWalkable(p.x, p.z)) this.walkTarget = new THREE.Vector3(p.x, 0, p.z);
          return;
        }
      }
    }
    if (this.onPickIslet) {
      const islet = this.onPickIslet(this.raycaster);
      if (islet) return;
    }
    if (!this.islandMesh) return;
    const hits = this.raycaster.intersectObject(this.islandMesh, false);
    if (!hits.length) return;
    const p = hits[0].point;
    if (!isWalkable(p.x, p.z)) return;
    this.walkTarget = new THREE.Vector3(p.x, 0, p.z);
  }

  _exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  _readGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const gp = [...pads].find((p) => p && p.mapping === "standard");
    if (!gp) return null;
    const dead = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    return {
      x: dead(gp.axes[0] || 0),
      y: dead(gp.axes[1] || 0),
      lookX: dead(gp.axes[2] || 0),
      lookY: dead(gp.axes[3] || 0),
    };
  }

  update(dt) {
    if (this.cinematic) {
      if (this.character) {
        this.character.position.set(this.position.x, this.position.y, this.position.z);
        this.character.rotation.y = this.yaw;
      }
      return;
    }
    if (this.keys.has("q")) this.camYaw += 1.1 * dt;
    if (this.keys.has("e")) this.camYaw -= 1.1 * dt;

    if (!this.enabled) {
      this._syncCamera();
      return;
    }

    const gp = this._readGamepad();
    if (gp) this.camYaw -= gp.lookX * 1.6 * dt;

    this._fwd.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    this._right.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));

    const input = new THREE.Vector3();
    const running = this.keys.has("shift");

    if (this.keys.has("w") || this.keys.has("arrowup")) input.add(this._fwd);
    if (this.keys.has("s") || this.keys.has("arrowdown")) input.sub(this._fwd);
    if (this.keys.has("a") || this.keys.has("arrowleft")) input.sub(this._right);
    if (this.keys.has("d") || this.keys.has("arrowright")) input.add(this._right);

    if (this.joystick.active) {
      input.addScaledVector(this._fwd, -this.joystick.y);
      input.addScaledVector(this._right, this.joystick.x);
    }
    if (gp && (gp.x || gp.y)) {
      input.addScaledVector(this._fwd, -gp.y);
      input.addScaledVector(this._right, gp.x);
    }

    const want = PLAYER.walk * (running ? PLAYER.run / PLAYER.walk : 1) * this.speedMul;

    if (input.lengthSq() > 0.0001) {
      input.normalize().multiplyScalar(want);
      this.walkTarget = null;
      this._facing = Math.atan2(-input.x, -input.z);
    } else if (this.walkTarget) {
      const to = this._scratch.set(
        this.walkTarget.x - this.position.x,
        0,
        this.walkTarget.z - this.position.z
      );
      const dist = to.length();
      if (dist < 0.35) this.walkTarget = null;
      else {
        input.copy(to.multiplyScalar(1 / dist)).multiplyScalar(Math.min(want, dist * 2.2));
        this._facing = Math.atan2(-input.x, -input.z);
      }
    }

    this.velocity.lerp(input, 1 - Math.exp(-10 * dt));
    const step = this._scratch.copy(this.velocity).multiplyScalar(dt);
    const nx = this.position.x + step.x;
    const nz = this.position.z + step.z;
    if (isWalkable(nx, nz)) {
      this.position.x = nx;
      this.position.z = nz;
    } else if (isWalkable(nx, this.position.z)) {
      this.position.x = nx;
    } else if (isWalkable(this.position.x, nz)) {
      this.position.z = nz;
    } else {
      this.velocity.set(0, 0, 0);
    }

    this.position.y = walkHeight(this.position.x, this.position.z);
    this.speed = this.velocity.length();
    if (this.speed > 0.25) this.lastMoved = performance.now();

    this.yaw += shortAngle(this._facing - this.yaw) * (1 - Math.exp(-10 * dt));
    this._syncCamera();
  }

  _syncCamera() {
    if (this.character) {
      const bob = this.speed > 0.4 ? Math.sin(performance.now() * 0.012) * 0.04 : 0;
      this.character.position.set(this.position.x, this.position.y + bob, this.position.z);
      this.character.rotation.y = this.yaw;
    }
    const dist = this.camDist;
    const h = this.camHeight;
    this.camera.position.set(
      this.position.x + Math.sin(this.camYaw) * dist,
      this.position.y + h,
      this.position.z + Math.cos(this.camYaw) * dist
    );
    this.camera.lookAt(this.position.x, this.position.y + 1.15, this.position.z);
    this.camera.fov = PLAYER.camFov;
    this.camera.updateProjectionMatrix?.();
  }
}

function shortAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** A small original traveler — short dark hair, cream coat, rose scarf, a tiny journal. */
function makeTraveler() {
  const g = new THREE.Group();
  const skin = toonMat(0xf0c9b0);
  const coat = toonMat(0xefe6d4);
  const scarf = toonMat(0xd88aa0);
  const hair = toonMat(0x2a1f28);
  const boot = toonMat(0x6a4a3a);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 3, 8), coat);
  body.position.y = 0.62;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 7), skin);
  head.position.y = 1.08;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.215, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.7), hair);
  cap.position.y = 1.14;
  cap.rotation.x = 0.15;
  g.add(cap);
  const bang = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), hair);
  bang.scale.set(1.4, 0.5, 0.7);
  bang.position.set(0, 1.16, 0.12);
  g.add(bang);
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 5, 10), scarf);
  wrap.position.y = 0.9;
  wrap.rotation.x = Math.PI / 2;
  g.add(wrap);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.05), scarf);
  tail.position.set(0.16, 0.72, 0.04);
  g.add(tail);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), toonMat(0x6b7fd7));
  book.position.set(-0.26, 0.62, 0.02);
  book.rotation.z = 0.2;
  g.add(book);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 2, 6), boot);
    leg.position.set(s * 0.1, 0.22, 0);
    g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 2, 6), coat);
    arm.position.set(s * 0.28, 0.7, 0);
    arm.rotation.z = s * 0.15;
    g.add(arm);
  }
  outlineGroup(g, 0.022);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
