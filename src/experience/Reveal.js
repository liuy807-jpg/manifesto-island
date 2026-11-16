/**
 * Stay-to-reveal: proximity starts the listening, stillness earns clarity,
 * rushing scatters the words again. Trust, once earned, comes back faster.
 */
import { STATIONS, TIMING } from "../config.js";

export class Reveal {
  constructor() {
    this.states = Object.fromEntries(
      STATIONS.map((s) => [
        s.id,
        { clarity: 0, scatter: 0, known: false, near: false, distance: Infinity },
      ])
    );
    this.activeId = null;
    this._tmpLast = performance.now();
  }

  update(dt, player, stations) {
    const pos = player.position;
    const speed = player.speed || 0;
    let closest = null;
    let closestD = Infinity;

    for (const item of stations.items) {
      const id = item.def.id;
      const st = this.states[id];
      const dx = pos.x - item.x;
      const dz = pos.z - item.z;
      const d = Math.hypot(dx, dz);
      st.distance = d;
      st.near = d < item.def.radius;
      if (d < closestD) {
        closestD = d;
        closest = id;
      }

      if (st.near) {
        const still = speed < 0.45;
        if (still) {
          const rate = st.known ? TIMING.knownRate : TIMING.stillRate;
          st.clarity = Math.min(1, st.clarity + dt * rate);
          st.scatter = Math.max(0, st.scatter - dt * 2.4);
          if (st.clarity >= 0.995 && !st.known) {
            st.known = true;
            st.clarity = 1;
            try {
              if (typeof navigator.vibrate === "function") navigator.vibrate([10, 30, 14]);
            } catch {
              /* iOS */
            }
          }
        } else {
          const force = Math.min(2.2, speed * 0.35);
          st.clarity = Math.max(st.known ? 0.12 : 0, st.clarity - dt * TIMING.scatterRate * force);
          st.scatter = Math.min(1, st.scatter + dt * 2.8 * force);
        }
      } else {
        st.scatter = Math.max(0, st.scatter - dt * 1.6);
        // Fade gently when walking away, keep a ghost if already known
        if (st.clarity > (st.known ? 0.08 : 0)) {
          st.clarity = Math.max(st.known ? 0.08 : 0, st.clarity - dt * 0.22);
        }
      }
    }

    this.activeId = closest && this.states[closest].near ? closest : null;
    return this.activeId;
  }

  get discovered() {
    return STATIONS.filter((s) => this.states[s.id].known).length;
  }

  get progress() {
    const sum = STATIONS.reduce((a, s) => a + Math.max(this.states[s.id].clarity, this.states[s.id].known ? 1 : 0) * (this.states[s.id].known ? 1 : 0.35), 0);
    // Sky is driven by how many have been truly found, with a little lift from approach
    return Math.min(1, this.discovered / STATIONS.length + 0.08 * (sum / STATIONS.length));
  }

  get(id) {
    return this.states[id];
  }
}
