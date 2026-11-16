/**
 * Camera + paper-boat beat: fold, sail out, become an islet, then a bottle
 * washes ashore with a stranger's line.
 */
import * as THREE from "three";
import { makePaperBoat, makeBottle } from "./PaperCrafts.js";

function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

export class DriftCinema {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.phase = "idle";
    this.t = 0;
    this.dur = 1;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this._camFrom = new THREE.Vector3();
    this._camTo = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._tmp2 = new THREE.Vector3();
    this.onDone = null;
    this.reduced = false;

    this.boat = makePaperBoat();
    this.boat.visible = false;
    this.scene.add(this.boat);

    this.bottle = makeBottle();
    this.bottle.visible = false;
    this.scene.add(this.bottle);
  }

  get playing() {
    return this.active;
  }

  cancel() {
    this.active = false;
    this.phase = "idle";
    this.boat.visible = false;
    this.bottle.visible = false;
    this.onDone = null;
  }

  /**
   * Sail a paper boat from `from` to `to` (world xz). Calls onArrive when
   * the boat reaches the new islet, then continues into the inbound wash
   * if `inboundTo` is set.
   */
  play(opts) {
    const { from, to, inboundTo, inboundFrom, camera, reduced, onArrive, onDone } = opts;
    this.reduced = !!reduced;
    this.from.set(from.x, 0.12, from.z);
    this.to.set(to.x, 0.12, to.z);
    this._inboundTo = inboundTo ? new THREE.Vector3(inboundTo.x, 0.1, inboundTo.z) : null;
    this._inboundFrom = inboundFrom ? new THREE.Vector3(inboundFrom.x, 0.1, inboundFrom.z) : null;
    this._camera = camera;
    this._onArrive = onArrive || null;
    this.onDone = onDone || null;
    this._arrived = false;
    this.active = true;
    this.phase = "sail";
    this.t = 0;
    this.dur = this.reduced ? 0.45 : 6.2;
    this.boat.visible = true;
    this.boat.position.copy(this.from);
    this.boat.scale.setScalar(0.15);
    this.bottle.visible = false;
    this._camFrom.copy(camera.position);
  }

  update(dt, camera) {
    if (!this.active) return false;
    this.t += dt;
    const cam = camera || this._camera;
    if (this.phase === "sail") {
      const u = smooth(this.t / this.dur);
      this._tmp.lerpVectors(this.from, this.to, u);
      // slight arc over the water
      const rise = Math.sin(u * Math.PI) * 0.18;
      this.boat.position.set(this._tmp.x, 0.1 + rise, this._tmp.z);
      const grow = this.reduced ? 1 : lerp(0.2, 1, smooth(this.t / 0.7));
      this.boat.scale.setScalar(grow);
      const yaw = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
      this.boat.rotation.y = yaw;
      this.boat.rotation.z = Math.sin(this.t * 3.2) * 0.08;
      this.boat.rotation.x = Math.sin(this.t * 2.4) * 0.05;

      // camera follows behind and a little above
      const back = 7.4;
      const height = 4.6 + u * 3.2;
      this._tmp2.set(
        this._tmp.x - Math.sin(yaw) * back,
        height,
        this._tmp.z - Math.cos(yaw) * back
      );
      if (this.t < 0.5 && !this.reduced) {
        cam.position.lerp(this._tmp2, 1 - Math.exp(-dt * 2.4));
      } else {
        cam.position.copy(this._tmp2);
      }
      this.look.set(this._tmp.x, 0.4, this._tmp.z);
      cam.lookAt(this.look);

      if (this.t >= this.dur) {
        if (!this._arrived) {
          this._arrived = true;
          this._onArrive?.();
        }
        this.phase = "settle";
        this.t = 0;
        this.dur = this.reduced ? 0.2 : 1.15;
      }
      return true;
    }

    if (this.phase === "settle") {
      const u = smooth(this.t / this.dur);
      this.boat.scale.setScalar(1 - u);
      this.boat.position.y = 0.1 + u * 0.4;
      const yaw = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
      cam.position.set(
        this.to.x - Math.sin(yaw) * (7.4 + u * 2),
        7.8 + u * 1.5,
        this.to.z - Math.cos(yaw) * (7.4 + u * 2)
      );
      cam.lookAt(this.to.x, 0.5, this.to.z);
      if (this.t >= this.dur) {
        this.boat.visible = false;
        if (this._inboundTo) {
          this.phase = "wash";
          this.t = 0;
          this.dur = this.reduced ? 0.4 : 5.0;
          this.bottle.visible = true;
          const src = this._inboundFrom || this.to;
          this.from.copy(src);
          this.to.copy(this._inboundTo);
          this.bottle.position.copy(this.from);
        } else {
          this._finish();
        }
      }
      return true;
    }

    if (this.phase === "wash") {
      const u = smooth(this.t / this.dur);
      this._tmp.lerpVectors(this.from, this.to, u);
      this.bottle.position.set(this._tmp.x, 0.08 + Math.sin(u * Math.PI) * 0.14, this._tmp.z);
      this.bottle.rotation.y = this.t * 0.8;
      this.bottle.rotation.z = Math.sin(this.t * 2.2) * 0.25;
      const yaw = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
      cam.position.set(
        this._tmp.x - Math.sin(yaw) * 6.2,
        4.2 + (1 - u) * 3.5,
        this._tmp.z - Math.cos(yaw) * 6.2
      );
      cam.lookAt(this._tmp.x, 0.3, this._tmp.z);
      if (this.t >= this.dur) {
        this._finish();
      }
      return true;
    }
    return false;
  }

  _finish() {
    this.active = false;
    this.phase = "idle";
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  hideProps() {
    this.boat.visible = false;
    this.bottle.visible = false;
  }
}
