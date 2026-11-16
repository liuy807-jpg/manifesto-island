import * as THREE from "three";
import { STATIONS, PLAYER, TIMING, paletteAt } from "../config.js";
import { Sky } from "./Sky.js";
import { Water } from "./Water.js";
import { Island } from "./Island.js";
import { Stations } from "./Stations.js";
import { Player } from "./Player.js";
import { Reveal } from "./Reveal.js";
import { AmbientAudio } from "./Audio.js";
import { Post } from "./Post.js";
import { LiveBridge, liveUrlFromSearch } from "./LiveBridge.js";
import { Presence } from "./Presence.js";
import { islandHeight } from "./terrain.js";
import { DriftFlow } from "./DriftFlow.js";

export class Experience {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
    this.quality = this.mobile ? "medium" : "high";
    this.time = 0;
    this.running = false;
    this.intro = true;
    this._fps = [];
    this._lastSend = 0;
    this._lastTouchSend = 0;
    this._journalOpen = false;
    this._journalKnown = 0;
  }

  async init() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality === "high",
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = this.quality !== "low";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const camera = new THREE.PerspectiveCamera(PLAYER.camFov, 1, 0.12, 500);
    this.camera = camera;

    this.sky = new Sky(scene);
    this.water = new Water(scene, camera);
    this.island = new Island(scene, this.quality);
    this.stations = new Stations(scene);
    this.presence = new Presence(scene);
    this.reveal = new Reveal();
    this.audio = new AmbientAudio();

    if (this.sky.moon) {
      const size = this.quality === "high" ? 1024 : 512;
      this.sky.moon.castShadow = this.quality !== "low";
      this.sky.moon.shadow.mapSize.set(size, size);
    }

    scene.fog = new THREE.FogExp2(0xe2c8d8, 0.0032);

    this.player = new Player(camera, this.canvas, this.island.mesh, {
      scene,
      stationGroup: this.stations.group,
      onUnlockAudio: () => this.audio.start(),
      onClickStation: (id) => this._onClickStation(id),
    });
    this.player.place(PLAYER.arrival.x, PLAYER.arrival.z, PLAYER.arrival.yaw);
    this.player.setEnabled(false);

    this.post = new Post(renderer, scene, camera, "off");
    this._resize();
    window.addEventListener("resize", () => this._resize());
    if (window.visualViewport) window.visualViewport.addEventListener("resize", () => this._resize());

    const live = liveUrlFromSearch();
    if (live) {
      this.live = new LiveBridge(live, {
        onParams: (m) => this._onLiveParams(m),
        onPresence: (m) => this.presence.upsert(m),
        onCue: (m) => this._onCue(m),
        onDrift: (m) => this.drift?.onLiveDrift(m),
      });
    }

    this._wireUI();
    this._renderJournal();
    this.drift = new DriftFlow(this);
    this.drift.init().catch((err) => console.warn("Drift init failed", err));
    this._installDebug();
    this.player.camDist = PLAYER.camDist;
    this.player.camHeight = PLAYER.camHeight;
    this.player.camYaw = 0.15;
    this.player.place(PLAYER.arrival.x, PLAYER.arrival.z, PLAYER.arrival.yaw);
    this.intro = false;
    this._awaitingEnter = true;
    this._startLoop();
    return this.renderer.capabilities.isWebGL2 || true;
  }

  _wireUI() {
    const ui = this.ui;
    ui.mute?.addEventListener("click", () => {
      const muted = this.audio.toggleMuted();
      ui.mute.setAttribute("aria-pressed", muted ? "true" : "false");
      ui.mute.classList.toggle("is-muted", muted);
    });
    ui.more?.addEventListener("click", () => this._openSheet());
    ui.sheetClose?.addEventListener("click", () => this._closeSheet());
    ui.sheet?.addEventListener("click", (e) => {
      if (e.target === ui.sheet) this._closeSheet();
    });
    ui.speak?.addEventListener("click", () => this._toggleSpeech());
    ui.journalBtn?.addEventListener("click", () => this._toggleJournal());
    ui.journalClose?.addEventListener("click", () => this._setJournal(false));
    ui.journal?.addEventListener("click", (e) => {
      if (e.target === ui.journal) this._setJournal(false);
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "j" || e.key === "J") {
        if (e.target && /input|textarea/i.test(e.target.tagName)) return;
        e.preventDefault();
        this._toggleJournal();
      }
      if (e.key === "Escape") {
        this._setJournal(false);
        this._closeSheet();
        this.drift?.onEscape();
      }
    });

    this._bindJoystick();
  }

  _bindJoystick() {
    const stick = this.ui.joystick;
    if (!stick) return;
    const knob = stick.querySelector(".joystick-knob");
    const max = 42;
    const start = { x: 0, y: 0, id: null };
    const set = (x, y) => {
      const l = Math.hypot(x, y) || 1;
      const c = Math.min(1, l / max);
      const nx = (x / l) * c;
      const ny = (y / l) * c;
      if (knob) {
        knob.style.transform = `translate(${nx * max}px, ${ny * max}px)`;
      }
      this.player.setJoystick(nx, ny, c > 0.05);
    };
    stick.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      start.x = e.clientX;
      start.y = e.clientY;
      start.id = e.pointerId;
      stick.setPointerCapture?.(e.pointerId);
      stick.classList.add("is-active");
    });
    stick.addEventListener("pointermove", (e) => {
      if (start.id !== e.pointerId) return;
      set(e.clientX - start.x, e.clientY - start.y);
    });
    const end = (e) => {
      if (start.id != null && e && e.pointerId !== start.id) return;
      start.id = null;
      set(0, 0);
      this.player.setJoystick(0, 0, false);
      if (knob) knob.style.transform = "translate(0,0)";
      stick.classList.remove("is-active");
    };
    stick.addEventListener("pointerup", end);
    stick.addEventListener("pointercancel", end);
  }

  _onClickStation(id) {
    const item = this.stations.items.find((s) => s.def.id === id);
    if (!item) return;
    this.player.setWalkTarget(item.x, item.z);
  }

  _toggleJournal() {
    this._setJournal(!this._journalOpen);
  }

  _setJournal(open) {
    this._journalOpen = !!open;
    const el = this.ui.journal;
    if (!el) return;
    document.body.classList.toggle("is-journal-open", !!open);
    if (open) {
      this._renderJournal();
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add("is-open"));
    } else {
      el.classList.remove("is-open");
      setTimeout(() => {
        if (el && !el.classList.contains("is-open")) el.hidden = true;
      }, 280);
    }
  }

  _renderJournal() {
    const list = this.ui.journalList;
    if (!list) return;
    const known = STATIONS.filter((s) => this.reveal.get(s.id).known).length;
    if (this.ui.journalCount) this.ui.journalCount.textContent = `${known}/7`;
    if (this.ui.journalBtn) {
      this.ui.journalBtn.setAttribute("aria-label", `Journal ${known}/7`);
    }
    if (known === this._journalKnown && list.childElementCount === STATIONS.length) return;
    this._journalKnown = known;
    list.innerHTML = "";
    for (const def of STATIONS) {
      const st = this.reveal.get(def.id);
      const li = document.createElement("li");
      li.className = "journal-entry" + (st.known ? " is-known" : " is-locked");
      const tilts = ["rot-a", "rot-b", "rot-c", "rot-d"];
      li.classList.add(tilts[STATIONS.indexOf(def) % 4]);
      if (st.known) {
        li.innerHTML = `<span class="tape tape-sm tape-entry" aria-hidden="true"></span><p class="journal-num">${def.num}</p>
          <div>
            <h3>${def.name}</h3>
            <p class="journal-line">${def.headline}</p>
          </div>`;
        li.tabIndex = 0;
        li.addEventListener("click", () => {
          this.player.setWalkTarget(def.pos[0], def.pos[1]);
          this._setJournal(false);
        });
      } else {
        li.innerHTML = `<p class="journal-num">${def.num}</p>
          <div>
            <h3>Still looking</h3>
            <p class="journal-en">still looking</p>
          </div>`;
      }
      list.appendChild(li);
    }
  }

  _startLoop() {
    if (this._looping) return;
    this._looping = true;
    this.running = true;
    this._last = performance.now();
    const loop = (now) => {
      if (!this.running) {
        this._looping = false;
        return;
      }
      try {
        this._frame(now);
      } catch (err) {
        this._frameError = err;
        console.error("frame error", err);
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (this._visBound) return;
    this._visBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.running = false;
        this._looping = false;
        this.audio.ctx?.suspend?.();
      } else {
        if (!this._looping) this._startLoop();
        if (this.audio.ctx && !this.audio.muted) this.audio.ctx.resume?.();
      }
    });
  }

  async enter() {
    await this.audio.start();
    if (this.ui.mute) this.ui.mute.hidden = false;
    this._awaitingEnter = false;
    this.intro = false;
    this.player.camDist = PLAYER.camDist;
    this.player.camHeight = PLAYER.camHeight;
    this.player.camYaw = 0.15;
    this.player.place(PLAYER.arrival.x, PLAYER.arrival.z, PLAYER.arrival.yaw);
    this.player.setEnabled(true);
    this.ui.root?.classList.add("is-playing");
    this._startLoop();
  }

  _frame(now) {
    const rawDt = (now - this._last) / 1000;
    this._last = now;
    let dt = rawDt > 0.05 ? 0.05 : rawDt;
    this.time += dt;

    this._fps.push(rawDt);
    if (this._fps.length > 50) {
      this._fps.shift();
      const avg = this._fps.reduce((a, b) => a + b, 0) / this._fps.length;
      if (avg > 0.028 && this.quality === "high") this._downgrade();
    }

    if (this.intro) {
      this._introT = (now - this._introStart) / 1000;
      const t = Math.min(1, this._introT / TIMING.introSeconds);
      const e = t * t * (3 - 2 * t);
      this.player.place(PLAYER.arrival.x, PLAYER.arrival.z, PLAYER.arrival.yaw);
      this.player.camDist = PLAYER.zoomMax + (PLAYER.camDist - PLAYER.zoomMax) * e;
      this.player.camHeight = this.player.camDist * (PLAYER.camHeight / PLAYER.camDist);
      this.player.camYaw = 0.38 * (1 - e);
      this.player._syncCamera();
      if (t >= 1) {
        this.intro = false;
        this.player.camDist = PLAYER.camDist;
        this.player.camHeight = PLAYER.camHeight;
        this.player.camYaw = 0;
        this.player.place(PLAYER.arrival.x, PLAYER.arrival.z, PLAYER.arrival.yaw);
        this.player.setEnabled(true);
        this.ui.root?.classList.add("is-playing");
      }
    } else {
      this.player.update(dt);
    }

    this.drift?.update(dt);

    const active = this.reveal.update(dt, this.player, this.stations);
    const progress = this.reveal.progress;
    this.sky.setProgress(progress);
    const pal = this.sky.update(dt, this.time);
    const calm = active && this.player.speed < 0.45 ? 1 : this.player.speed > 2 ? 0 : 0.45;
    this.water.update(
      this.time,
      pal,
      this.sky.getSunDir(),
      progress,
      calm,
      this.sky.getMoonDir(),
      this.sky.getMoonAmount(),
      this.sky.getMoonColor()
    );

    const fogCol = pal.fog;
    this.scene.fog.color.setRGB(fogCol[0], fogCol[1], fogCol[2]);
    this.scene.fog.density = 0.0024 + (1 - progress) * 0.0012;

    const clarities = Object.fromEntries(STATIONS.map((s) => [s.id, this.reveal.get(s.id).clarity]));
    this.stations.update(this.time, progress, clarities);
    this.presence.update(dt);

    const shore = Math.max(0, 1 - Math.abs(islandHeight(this.player.position.x, this.player.position.z)) * 0.4);
    this.audio.setState({ progress, calm, nearShore: shore });

    this._updateHUD(active);
    this._sendLive(now, active);

    if (this.post.enabled && this.post.composer) {
      this.post.grain && (this.post.grain.uniforms.uTime.value = this.time);
      this.post.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _downgrade() {
    this.quality = "medium";
    this.renderer.shadowMap.enabled = false;
    this.water.setQuality("medium");
    this._resize();
  }

  _updateHUD(activeId) {
    const ui = this.ui;
    const discovered = this.reveal.discovered;
    const knownCount = STATIONS.filter((s) => this.reveal.get(s.id).known).length;
    if (ui.journalCount && `${knownCount}/7` !== ui.journalCount.textContent) {
      ui.journalCount.textContent = `${knownCount}/7`;
      if (ui.journalBtn) ui.journalBtn.setAttribute("aria-label", `Journal ${knownCount}/7`);
      if (this._journalOpen) this._renderJournal();
      else this._journalKnown = -1;
    }
    ui.pips?.forEach((pip, i) => {
      const id = STATIONS[i].id;
      const st = this.reveal.get(id);
      pip.classList.toggle("is-earned", st.known);
      pip.classList.toggle("is-active", activeId === id);
    });
    if (ui.hint) ui.hint.dataset.mode = this.mobile ? "touch" : "desk";
    if (ui.help) ui.help.dataset.mode = this.mobile ? "touch" : "desk";

    if (ui.objective) {
      if (this.drift?.sentId) ui.objective.textContent = "Look at the islands at sea";
      else if (this.drift?.phase === "teaser") ui.objective.textContent = "Leave a picture";
      else ui.objective.textContent = knownCount >= 7 ? "Walk to the boat" : "Find the seven voices";
    }
    if (ui.objectiveSub) ui.objectiveSub.hidden = true;

    if (ui.placeName || ui.placeSub) {
      if (activeId) {
        const def = STATIONS.find((s) => s.id === activeId);
        if (ui.placeKicker) ui.placeKicker.textContent = "Place";
        if (ui.placeName) ui.placeName.textContent = def.name;
        if (ui.placeSub) ui.placeSub.hidden = true;
      } else {
        if (ui.placeKicker) ui.placeKicker.textContent = "Place";
        if (ui.placeName) ui.placeName.textContent = "The Shore";
        if (ui.placeSub) ui.placeSub.hidden = true;
      }
    }

    const card = ui.card;
    if (!card) return;
    if (this.drift?.occupy() || document.body.classList.contains("is-islet-open")) {
      card.classList.remove("is-visible", "is-clear", "is-finale");
      this.drift?._showDrift(false);
      return;
    }
    if (!activeId) {
      card.classList.remove("is-visible", "is-clear", "is-finale");
      if (!this.drift?.occupy()) this.drift?._showDrift(false);
      return;
    }
    const def = STATIONS.find((s) => s.id === activeId);
    const st = this.reveal.get(activeId);
    this._activeDef = def;
    if (def.isFinale && st.known && this.drift) {
      const handled = this.drift.applyFinaleHUD(activeId, def, st);
      if (handled) {
        card.classList.remove("is-visible", "is-clear", "is-finale");
        return;
      }
    } else {
      this.drift?._showDrift(false);
    }
    card.classList.add("is-visible");
    card.classList.toggle("is-clear", st.clarity >= 0.72);
    card.classList.toggle("is-finale", !!def.isFinale && st.known);
    if (ui.num) ui.num.textContent = def.num;
    if (ui.name) ui.name.textContent = def.name;
    if (ui.headline) {
      ui.headline.textContent = def.headline;
      ui.headline.style.setProperty("--fog", (1 - st.clarity).toFixed(3));
      ui.headline.style.setProperty("--soft", ((1 - st.clarity) * 100).toFixed(1));
      const blur = (1 - st.clarity) * 7.2 + st.scatter * 6;
      ui.headline.style.filter = blur < 0.2 ? "none" : `blur(${blur.toFixed(2)}px)`;
      if (st.scatter > 0.05) {
        const sx = Math.sin(this.time * 9) * st.scatter * 8;
        ui.headline.style.transform = `translate(${sx}px, ${st.scatter * 6}px)`;
      } else ui.headline.style.transform = "";
    }
    if (ui.excerpt) ui.excerpt.textContent = def.excerpt;
    if (def.isFinale && st.known && this.drift) {
      this.drift.applyFinaleHUD(activeId, def, st);
    }
  }

  _installDebug() {
    const exp = this;
    this.debug = {
      unlockAll() {
        for (const s of STATIONS) {
          const st = exp.reveal.get(s.id);
          st.known = true;
          st.clarity = 1;
          st.scatter = 0;
        }
      },
      gotoBoat() {
        const boat = STATIONS.find((s) => s.isFinale);
        exp.player.place(boat.pos[0], boat.pos[1], -0.55);
        exp.player.camYaw = 0.55;
        exp.player.camDist = PLAYER.camDist;
        exp.player.camHeight = PLAYER.camHeight;
        exp.player.setEnabled(true);
        exp.player.setCinematic(false);
        exp.player._syncCamera();
      },
      setPhase(p) {
        if (exp.drift) exp.drift.phase = p;
      },
      openCompose() { exp.drift?._openCompose(); },
      openReceive() {
        const e = exp.drift?.received || exp.drift?.entries?.[0];
        if (e) exp.drift._openReceive(e);
      },
      openLanding() { exp.drift?._openLanding(); },
      pullback() {
        exp.player.camDist = 22;
        exp.player.camHeight = 14;
        exp.player.camYaw = 0.7;
        exp.player.place(6, 16, -0.4);
        exp.player._syncCamera();
      },
    };
  }

  _openSheet() {
    const def = this._activeDef;
    if (!def || !this.ui.sheet) return;
    this.ui.sheetNum.textContent = def.num;
    this.ui.sheetTitle.textContent = def.headline;
    this.ui.sheetBody.textContent = def.body;
    this.ui.sheet.hidden = false;
    document.body.classList.add("is-sheet-open");
    requestAnimationFrame(() => this.ui.sheet.classList.add("is-open"));
  }

  _closeSheet() {
    this.ui.sheet?.classList.remove("is-open");
    document.body.classList.remove("is-sheet-open");
    setTimeout(() => {
      if (this.ui.sheet && !this.ui.sheet.classList.contains("is-open")) this.ui.sheet.hidden = true;
    }, 400);
  }

  _toggleSpeech() {
    if (!("speechSynthesis" in window) || !this._activeDef) return;
    if (this._speaking) {
      speechSynthesis.cancel();
      this._speaking = false;
      this.ui.speak?.classList.remove("is-playing");
      return;
    }
    const u = new SpeechSynthesisUtterance(`${this._activeDef.headline}. ${this._activeDef.body}`);
    u.rate = 0.92;
    u.lang = "en-US";
    u.onend = () => {
      this._speaking = false;
      this.ui.speak?.classList.remove("is-playing");
    };
    this._speaking = true;
    this.ui.speak?.classList.add("is-playing");
    speechSynthesis.speak(u);
  }

  _sendLive(now, activeId) {
    if (!this.live) return;
    if (now - this._lastSend > 180) {
      this._lastSend = now;
      const p = this.player.position;
      this.live.send({
        type: "presence",
        id: "self",
        x: +p.x.toFixed(2),
        y: +p.y.toFixed(2),
        z: +p.z.toFixed(2),
        yaw: +this.player.yaw.toFixed(3),
      });
      this.live.send({ type: "sky", progress: +this.reveal.progress.toFixed(3) });
      if (activeId) {
        const st = this.reveal.get(activeId);
        this.live.send({
          type: "approach",
          station: activeId,
          distance: +st.distance.toFixed(2),
          clarity: +st.clarity.toFixed(3),
        });
        if (st.known) this.live.send({ type: "reveal", station: activeId });
      }
    }
  }

  _onLiveParams(msg) {
    if (typeof msg.skyProgress === "number") this.sky.setProgress(msg.skyProgress);
    if (typeof msg.intensity === "number" && this.sky.sun) {
      this.sky.sun.intensity = msg.intensity;
    }
  }

  _onCue(msg) {
    if (msg.name === "sunrise") this.sky.setProgress(1);
  }

  _resize() {
    const vp = window.visualViewport;
    const w = Math.max(1, Math.floor(vp ? vp.width : window.innerWidth));
    const h = Math.max(1, Math.floor(vp ? vp.height : window.innerHeight));
    const cap = this.quality === "high" ? 1.5 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize?.(w, h, dpr);
  }
}
