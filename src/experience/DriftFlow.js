/**
 * Chapter 2 — Drift. Card sequencing, compose note, cinema, receive,
 * landing teaser, and the shared archipelago.
 */
import { STATIONS, PLAYER } from "../config.js";
import { createStore } from "../drift/store.js";
import { isAdminFromSearch } from "../drift/admin.js";
import { labelFor } from "../drift/seeds.js";
import { RATE_MS } from "../drift/config.js";
import { Archipelago, isletPosition } from "./Archipelago.js";
import { DriftCinema } from "./DriftCinema.js";
import { islandHeight } from "./terrain.js";

const BOAT = STATIONS.find((s) => s.isFinale);
const LAUNCH = { x: 12.4, z: 15.4 };
const SHORE = { x: 2.2, z: 18.4 };

export class DriftFlow {
  constructor(exp) {
    this.exp = exp;
    this.store = createStore();
    this.entries = [];
    this.phase = "idle"; // idle | statement | teaser | compose | cinema | receive | landing
    this.admin = false;
    this.sentId = null;
    this.received = null;
    this.persisted = true;
    this._poll = null;
  }

  async init() {
    const { scene, player, ui } = this.exp;
    this.archipelago = new Archipelago(scene);
    this.cinema = new DriftCinema(scene);
    player.isletGroup = this.archipelago.group;
    player.onPickIslet = (ray) => this.pickFromRay(ray);
    this.admin = await isAdminFromSearch();
    if (this.admin) document.body.classList.add("is-admin");
    this.sentId = this.store.lastSentId();
    this._wire(ui);
    await this.refresh();
    const rid = this.store.lastReceivedId();
    if (rid) this.received = this.entries.find((e) => e.id === rid) || null;
    this._poll = window.setInterval(() => this.refresh(), 45000);
  }

  async refresh() {
    try {
      const list = await this.store.list({ includeHidden: this.admin });
      this.entries = list;
      this.archipelago.setEntries(list.filter((e) => !e.hidden));
      this._updateCount();
    } catch (err) {
      console.warn("Drift refresh failed", err);
    }
  }

  dispose() {
    if (this._poll) window.clearInterval(this._poll);
  }

  occupy() {
    return this.phase === "compose" || this.phase === "cinema" || this.phase === "receive" || this.phase === "landing";
  }

  update(dt) {
    this.archipelago?.update(this.exp.time);
    if (this.phase === "cinema") {
      const playing = this.cinema.update(dt, this.exp.camera);
      if (!playing && this.phase === "cinema") {
        // finished callback should have moved us; belt and braces
      }
    }
  }

  _wire(ui) {
    ui.cardContinue?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.phase = "teaser";
      this._closeCardOverlays();
    });
    ui.driftReread?.addEventListener("click", (e) => {
      e.preventDefault();
      this.phase = "statement";
    });
    ui.driftCta?.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.sentId && this.received && !this.admin) {
        this._openReceive(this.received, { again: true });
        return;
      }
      if (this.sentId && !this.admin && this.store.rateLimited()) {
        this._setStatus(ui, "already");
        return;
      }
      this._openCompose();
    });
    ui.composeCancel?.addEventListener("click", () => this._closeCompose());
    ui.composeForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this._submit();
    });
    ui.composeText?.addEventListener("input", () => this._updateCountChars());
    ui.composeBackdrop?.addEventListener("click", (e) => {
      if (e.target === ui.compose) this._closeCompose();
    });
    ui.receiveClose?.addEventListener("click", () => this._openLanding());
    ui.landingClose?.addEventListener("click", () => this._closeLanding());
    ui.isletClose?.addEventListener("click", () => this._closeIslet());
    ui.isletHide?.addEventListener("click", () => this._hideCurrent());
    ui.isletUnhide?.addEventListener("click", () => this._hideCurrent(false));

    if (ui.compose) ui.compose.addEventListener("click", (e) => {
      if (e.target === ui.compose) this._closeCompose();
    });
    if (ui.receive) ui.receive.addEventListener("click", (e) => {
      if (e.target === ui.receive) this._openLanding();
    });
    if (ui.landing) ui.landing.addEventListener("click", (e) => {
      if (e.target === ui.landing) this._closeLanding();
    });
  }

  onEscape() {
    if (this.phase === "compose") this._closeCompose();
    else if (this.phase === "receive") this._openLanding();
    else if (this.phase === "landing") this._closeLanding();
    else if (this.exp.ui.isletCard && !this.exp.ui.isletCard.hidden) this._closeIslet();
  }

  /**
   * Drive statement vs teaser so they never stack. Returns true if the
   * finale HUD was handled (caller should not also show #drift).
   */
  applyFinaleHUD(activeId, def, st) {
    const ui = this.exp.ui;
    const overlay = this.occupy() || this.exp._journalOpen || (ui.sheet && !ui.sheet.hidden && ui.sheet.classList.contains("is-open"));
    const atBoat = !!(def && def.isFinale && st && st.known && activeId);

    if (ui.cardContinue) ui.cardContinue.hidden = true;

    if (overlay) {
      this._showDrift(false);
      return true;
    }

    if (!atBoat) {
      if (this.phase === "statement" || this.phase === "teaser") this.phase = this.phase === "teaser" ? "teaser" : "idle";
      this._showDrift(false);
      // keep teaser memory if they already continued this session
      return false;
    }

    if (this.phase === "idle") this.phase = "statement";
    if (this.phase === "teaser") {
      this._hideCard();
      this._showDrift(true);
      this._fillTeaser();
      return true;
    }
    if (this.phase === "statement") {
      this._showDrift(false);
      if (ui.cardContinue) ui.cardContinue.hidden = st.clarity < 0.72;
      return false; // let Experience show the statement card
    }
    this._showDrift(false);
    return true;
  }

  _hideCard() {
    const card = this.exp.ui.card;
    if (!card) return;
    card.classList.remove("is-visible", "is-clear", "is-finale");
  }

  _showDrift(on) {
    const ui = this.exp.ui;
    if (!ui.drift) return;
    ui.drift.hidden = !on;
    document.body.classList.toggle("is-finale-open", !!on);
  }

  _fillTeaser() {
    const ui = this.exp.ui;
    const already = !!(this.sentId && this.store.rateLimited() && !this.admin);
    if (ui.driftKicker) ui.driftKicker.textContent = "Chapter 2 · Drift";
    if (ui.driftTitle) ui.driftTitle.textContent = "Drift";
    if (already) {
      if (ui.driftLead) {
        ui.driftLead.textContent = "You have already folded a picture into the sea. You can tap the little islands and read what others wrote.";
      }
      if (ui.driftCta) ui.driftCta.textContent = this.received ? "Read the line that drifted back" : "Look at the islands";
    } else {
      if (ui.driftLead) {
        ui.driftLead.textContent = "When you are ready, give the boat a picture you refuse to give up, and let it find the next person.";
      }
      if (ui.driftCta) ui.driftCta.textContent = "Leave a picture";
    }
    if (ui.driftReread) ui.driftReread.hidden = false;
    this._updateCount();
  }

  _updateCount() {
    const ui = this.exp.ui;
    const n = this.archipelago ? this.archipelago.entries.length : this.entries.filter((e) => !e.hidden).length;
    if (ui.isleCount) {
      ui.isleCount.hidden = n < 1;
      if (ui.isleCountNum) ui.isleCountNum.textContent = String(n);
    }
    if (ui.driftCount) ui.driftCount.textContent = `Islands ${n}`;
  }

  _updateCountChars() {
    const ui = this.exp.ui;
    const el = ui.composeText;
    const n = el ? el.value.length : 0;
    if (ui.composeCount) ui.composeCount.textContent = `${n} / 80`;
  }

  _setStatus(ui, kind) {
    if (!ui.driftStatus) return;
    ui.driftStatus.hidden = kind !== "already";
    if (kind === "already") {
      const hrs = Math.round(RATE_MS / 3600000);
      ui.driftStatus.textContent = `You have already left a picture. Please wait about ${hrs} hours before sending another.`;
    }
  }

  _openCompose() {
    const ui = this.exp.ui;
    this.phase = "compose";
    this._showDrift(false);
    this._hideCard();
    this._closeIslet();
    if (ui.composeText) ui.composeText.value = "";
    if (ui.composeName) ui.composeName.value = "";
    if (ui.composeError) {
      ui.composeError.hidden = true;
      ui.composeError.textContent = "";
    }
    this._updateCountChars();
    this._setModal("compose", true);
    ui.composeText?.focus();
  }

  _closeCompose() {
    this._setModal("compose", false);
    this.phase = "teaser";
  }

  _closeCardOverlays() {
    this.exp._closeSheet?.();
    this.exp._setJournal?.(false);
  }

  async _submit() {
    const ui = this.exp.ui;
    const text = ui.composeText?.value || "";
    const name = ui.composeName?.value || "";
    if (ui.composeSend) ui.composeSend.disabled = true;
    const result = await this.store.add({ text, name }, { bypassRate: this.admin });
    if (ui.composeSend) ui.composeSend.disabled = false;
    if (!result.ok) {
      if (ui.composeError) {
        ui.composeError.hidden = false;
        ui.composeError.textContent = result.message || "It could not be sent. Please try again.";
      }
      return;
    }
    this.sentId = result.entry.id;
    this.persisted = result.persisted;
    this.entries = [result.entry, ...this.entries.filter((e) => e.id !== result.entry.id)];
    const stranger = this.store.pickStranger(this.entries, result.entry.id);
    this.received = stranger;
    if (stranger) this.store.rememberReceived(stranger.id);
    this._setModal("compose", false);
    this._startCinema(result.entry, stranger);
    this.exp.live?.send({
      type: "drift",
      id: result.entry.id,
      text: result.entry.text,
      name: result.entry.name || "",
      seed: false,
    });
  }

  _startCinema(entry, stranger) {
    const reduced = this.exp.reduced;
    const dest = this.archipelago.positionOf(entry.id) || isletPosition(entry.id, this.archipelago.entries.length);
    // If not yet in the mesh, compute a slot
    const from = this._launchPoint();
    const inboundTo = this._shorePoint();
    const inboundFrom = stranger
      ? (this.archipelago.positionOf(stranger.id) || dest)
      : { x: dest.x * 0.4 + 18, z: dest.z * 0.4 + 18 };

    this.phase = "cinema";
    document.body.classList.add("is-cinema");
    this.exp.player.setCinematic(true);
    this._closeIslet();
    this._showDrift(false);
    this._hideCard();

    this.cinema.play({
      from,
      to: dest,
      inboundTo: stranger ? inboundTo : null,
      inboundFrom,
      camera: this.exp.camera,
      reduced,
      onArrive: () => {
        this.archipelago.upsert(entry);
        this._updateCount();
      },
      onDone: () => this._afterCinema(stranger),
    });
  }

  _afterCinema(stranger) {
    document.body.classList.remove("is-cinema");
    this.exp.player.setCinematic(false);
    this.exp.player.setEnabled(true);
    // look back toward the new sea
    this.exp.player.place(this.exp.player.position.x, this.exp.player.position.z, this.exp.player.yaw);
    if (stranger) this._openReceive(stranger, { localOnly: !this.persisted });
    else this._openLanding({ localOnly: !this.persisted });
  }

  _openReceive(entry, opts = {}) {
    const ui = this.exp.ui;
    this.phase = "receive";
    this._showDrift(false);
    this._hideCard();
    if (ui.receiveText) ui.receiveText.textContent = entry.text || "";
    if (ui.receiveFrom) ui.receiveFrom.textContent = labelFor(entry);
    if (ui.receiveEn) {
      const extra = entry.textEn && entry.textEn !== entry.text ? entry.textEn : "";
      ui.receiveEn.textContent = extra;
      ui.receiveEn.hidden = !extra;
    }
    if (ui.receiveNote) {
      if (opts.localOnly) {
        ui.receiveNote.hidden = false;
        ui.receiveNote.textContent = "Your picture is only on this device for now. Once you are online, it can join the islands other people have left.";
      } else {
        ui.receiveNote.hidden = true;
      }
    }
    if (ui.receiveKicker) ui.receiveKicker.textContent = opts.again ? "It drifted back" : "A line has washed ashore";
    this._setModal("receive", true);
  }

  _openLanding(opts = {}) {
    const ui = this.exp.ui;
    this._setModal("receive", false);
    this.phase = "landing";
    this.cinema.hideProps();
    if (ui.landingNote && opts.localOnly) {
      ui.landingNote.hidden = false;
    }
    this._setModal("landing", true);
  }

  _closeLanding() {
    this._setModal("landing", false);
    this.cinema.hideProps();
    this.phase = "teaser";
    this.exp.player.setCinematic(false);
    this.exp.player.setEnabled(true);
  }

  _setModal(name, on) {
    const ui = this.exp.ui;
    if (on) {
      for (const k of ["compose", "receive", "landing"]) {
        if (k === name) continue;
        document.body.classList.remove(`is-${k}-open`);
        const other = ui[k];
        if (other) {
          other.classList.remove("is-open");
          other.hidden = true;
        }
      }
    }
    const el = ui[name];
    document.body.classList.toggle(`is-${name}-open`, !!on);
    document.body.classList.toggle("is-modal", !!(
      document.body.classList.contains("is-compose-open") ||
      document.body.classList.contains("is-receive-open") ||
      document.body.classList.contains("is-landing-open") ||
      (on && (name === "compose" || name === "receive" || name === "landing"))
    ));
    if (!el) return;
    if (on) {
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add("is-open"));
    } else {
      el.classList.remove("is-open");
      setTimeout(() => {
        if (el && !el.classList.contains("is-open")) el.hidden = true;
      }, 280);
    }
    // recompute modal flag after close
    if (!on) {
      const any = ["compose", "receive", "landing"].some((k) => document.body.classList.contains(`is-${k}-open`));
      document.body.classList.toggle("is-modal", any);
    }
  }

  _onPick(entryOrHit) {
    if (this.occupy()) return;
    let entry = entryOrHit;
    if (entryOrHit && entryOrHit.isObject3D) {
      // unused
    }
    if (!entry || !entry.id) {
      // Player may pass a mesh; fall back to raycast
      return;
    }
    this._openIslet(entry);
  }

  pickFromRay(raycaster) {
    if (this.occupy()) return null;
    const entry = this.archipelago.pick(raycaster);
    if (entry) this._openIslet(entry);
    return entry;
  }

  _openIslet(entry) {
    const ui = this.exp.ui;
    if (!ui.isletCard || !entry) return;
    this._currentIslet = entry;
    this._showDrift(false);
    this._hideCard();
    if (ui.isletText) ui.isletText.textContent = entry.text || "";
    if (ui.isletFrom) ui.isletFrom.textContent = labelFor(entry);
    if (ui.isletEn) {
      const extra = entry.textEn && entry.textEn !== entry.text ? entry.textEn : "";
      ui.isletEn.textContent = extra;
      ui.isletEn.hidden = !extra;
    }
    const hidden = !!entry.hidden;
    if (ui.isletHide) ui.isletHide.hidden = !this.admin || hidden;
    if (ui.isletUnhide) ui.isletUnhide.hidden = !this.admin || !hidden;
    ui.isletCard.hidden = false;
    ui.isletCard.classList.add("is-visible");
    document.body.classList.add("is-islet-open");
  }

  _closeIslet() {
    const ui = this.exp.ui;
    if (!ui.isletCard) return;
    ui.isletCard.classList.remove("is-visible");
    ui.isletCard.hidden = true;
    document.body.classList.remove("is-islet-open");
    this._currentIslet = null;
  }

  async _hideCurrent(hidden = true) {
    if (!this.admin || !this._currentIslet) return;
    const id = this._currentIslet.id;
    await this.store.hide(id, hidden);
    if (hidden) {
      this.archipelago.hide(id);
      this.entries = this.entries.map((e) => (e.id === id ? { ...e, hidden: true } : e));
      this._closeIslet();
    } else {
      this._currentIslet.hidden = false;
      await this.refresh();
      this._closeIslet();
    }
    this._updateCount();
  }

  onLiveDrift(msg) {
    if (!msg || !msg.id || !msg.text) return;
    const entry = {
      id: msg.id,
      text: msg.text,
      name: msg.name || "",
      from: "visitor",
      seed: !!msg.seed,
      hidden: false,
      ts: msg.ts || Date.now(),
    };
    if (this.entries.some((e) => e.id === entry.id)) return;
    this.entries = [entry, ...this.entries];
    this.archipelago.upsert(entry);
    this._updateCount();
  }

  _launchPoint() {
    // A wet point just off the boat station, falling back if the height is still land.
    let x = LAUNCH.x;
    let z = LAUNCH.z;
    if (islandHeight(x, z) > -0.3) {
      x = BOAT.pos[0] + 3.2;
      z = BOAT.pos[1] + 3.6;
    }
    return { x, z };
  }

  _shorePoint() {
    return { x: SHORE.x, z: SHORE.z };
  }
}
