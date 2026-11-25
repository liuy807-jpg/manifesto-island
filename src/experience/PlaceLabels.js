/**
 * Handmade scrap-paper name tags that hover over each explorable place.
 * Screen-aligned HTML, faded by distance, never intercepts taps.
 */
import * as THREE from "three";
import { islandHeight } from "./terrain.js";

export class PlaceLabels {
  constructor(camera, canvas, stations, root) {
    this.camera = camera;
    this.canvas = canvas;
    this.stations = stations;
    this.root = root;
    this._tmp = new THREE.Vector3();
    this._tags = new Map();
    if (!root) return;
    for (const item of stations.items) {
      const def = item.def;
      const el = document.createElement("div");
      el.className = "place-tag" + (def.isFinale ? " is-boat" : "");
      el.innerHTML = def.isFinale
        ? `<svg class="scrap-bg" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><use href="#paper-d" fill="#f7eed8" stroke="#2a2218" stroke-width="2.4" stroke-linejoin="round"/></svg><span class="scrap-grain" aria-hidden="true"></span><span class="tag-kicker">Drift</span><span class="tag-name">${escapeHtml(def.name)}</span>`
        : `<svg class="scrap-bg" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><use href="#paper-c" fill="#f6edd8" stroke="#2a2218" stroke-width="2.4" stroke-linejoin="round"/></svg><span class="scrap-grain" aria-hidden="true"></span><span class="tag-name">${escapeHtml(def.name)}</span>`;
      root.appendChild(el);
      const lift = def.isFinale ? 2.35 : def.id === "invisible" ? 4.4 : def.id === "bridge" ? 2.6 : 2.15;
      this._tags.set(def.id, { el, item, lift, def });
    }
  }

  update(clarities = {}, hidden = false) {
    if (!this.root) return;
    this.root.hidden = !!hidden;
    if (hidden) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const cam = this.camera.position;
    for (const { el, item, lift, def } of this._tags.values()) {
      const x = item.x;
      const z = item.z;
      const y = (item.y ?? islandHeight(x, z)) + lift;
      const v = this._tmp.set(x, y, z).project(this.camera);
      const behind = v.z < -1 || v.z > 1 || v.x < -1.15 || v.x > 1.15 || v.y < -1.2 || v.y > 1.2;
      const dist = Math.hypot(cam.x - x, cam.y - y, cam.z - z);
      let opacity = 0;
      if (!behind) {
        // Readable nearby, fade out before they clutter the horizon.
        const fade = dist < 14 ? 1 : dist > 42 ? 0 : 1 - (dist - 14) / 28;
        opacity = fade * fade;
      }
      const known = (clarities[def.id] || 0) >= 0.72;
      el.classList.toggle("is-found", known);
      el.classList.toggle("is-unfound", !known);
      if (opacity < 0.05) {
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        continue;
      }
      const sx = (v.x * 0.5 + 0.5) * w;
      const sy = (-v.y * 0.5 + 0.5) * h;
      el.style.visibility = "visible";
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -120%) rotate(${def.isFinale ? 1.6 : -1.2}deg)`;
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
