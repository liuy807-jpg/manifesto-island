import { LIST_CAP, LS_PREFIX, MANTLE, RATE_MS } from "./config.js";
import { SEEDS, seedMap } from "./seeds.js";
import { validateEntry } from "./filter.js";

function deviceId() {
  const key = `${LS_PREFIX}:device`;
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "dev-session";
  }
}

function newId() {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toList(items, { includeHidden = false } = {}) {
  const arr = Object.values(items || {}).filter((e) => e && e.id && e.text);
  const visible = includeHidden ? arr : arr.filter((e) => !e.hidden);
  visible.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return visible.slice(0, LIST_CAP);
}

function mergeSeeds(items) {
  const next = { ...items };
  for (const s of SEEDS) {
    if (!next[s.id]) next[s.id] = { ...s };
  }
  return next;
}

class LocalAdapter {
  constructor() {
    this.key = `${LS_PREFIX}:items`;
  }
  _read() {
    try {
      const raw = localStorage.getItem(this.key);
      const parsed = raw ? JSON.parse(raw) : {};
      return mergeSeeds(parsed.items || parsed || {});
    } catch {
      return seedMap();
    }
  }
  _write(items) {
    try {
      localStorage.setItem(this.key, JSON.stringify({ items }));
    } catch {
      /* quota */
    }
  }
  async list(opts) {
    return toList(this._read(), opts);
  }
  async add(entry) {
    const items = this._read();
    items[entry.id] = entry;
    this._write(items);
    return entry;
  }
  async hide(id, hidden = true) {
    const items = this._read();
    if (!items[id]) return null;
    items[id] = { ...items[id], hidden: !!hidden };
    this._write(items);
    return items[id];
  }
}

class MantleAdapter {
  constructor() {
    this.url = `${MANTLE.base}/${MANTLE.namespace}/${MANTLE.path}`;
    this.key = MANTLE.key;
  }

  async _fetch(method, body, { withKey = true } = {}) {
    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    if (withKey) headers["X-Mantle-Key"] = this.key;
    const res = await fetch(this.url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`mantle ${method} ${res.status}`);
    if (res.status === 204) return {};
    return res.json();
  }

  async _all() {
    let data;
    try {
      data = await this._fetch("GET", undefined, { withKey: false });
    } catch {
      data = await this._fetch("GET", undefined, { withKey: true });
    }
    return mergeSeeds((data && data.items) || {});
  }

  async list(opts) {
    return toList(await this._all(), opts);
  }

  async add(entry) {
    await this._fetch("PATCH", { items: { [entry.id]: entry } }, { withKey: true });
    return entry;
  }

  async hide(id, hidden = true) {
    await this._fetch("PATCH", { items: { [id]: { hidden: !!hidden } } }, { withKey: true });
    return { id, hidden: !!hidden };
  }

  async ensureSeeds() {
    const items = await this._all();
    const missing = {};
    for (const s of SEEDS) {
      if (!items[s.id]) missing[s.id] = { ...s };
    }
    if (Object.keys(missing).length) {
      await this._fetch("PATCH", { items: missing }, { withKey: true });
    }
  }
}

export class DriftStore {
  constructor() {
    this.local = new LocalAdapter();
    this.remote = new MantleAdapter();
    this.mode = "local"; // 'remote' once a live read succeeds
    this.device = deviceId();
  }

  async list(opts = {}) {
    try {
      const items = await this.remote.list(opts);
      this.mode = "remote";
      this.remote.ensureSeeds().catch(() => {});
      return items;
    } catch (err) {
      console.warn("Drift store: remote list failed, using local", err);
      this.mode = "local";
      return this.local.list(opts);
    }
  }

  rateLimited() {
    try {
      const raw = localStorage.getItem(`${LS_PREFIX}:sentAt`);
      if (!raw) return false;
      return Date.now() - Number(raw) < RATE_MS;
    } catch {
      return false;
    }
  }

  lastSentId() {
    try {
      return localStorage.getItem(`${LS_PREFIX}:sentId`) || null;
    } catch {
      return null;
    }
  }

  lastReceivedId() {
    try {
      return localStorage.getItem(`${LS_PREFIX}:receivedId`) || null;
    } catch {
      return null;
    }
  }

  rememberReceived(id) {
    try {
      if (id) localStorage.setItem(`${LS_PREFIX}:receivedId`, id);
    } catch {
      /* ignore */
    }
  }

  /**
   * @param {{ text: string, name?: string }} input
   * @param {{ bypassRate?: boolean }} opts
   */
  async add(input, opts = {}) {
    const v = validateEntry(input);
    if (!v.ok) return { ok: false, reason: v.reason, message: v.message };
    if (!opts.bypassRate && this.rateLimited()) {
      return { ok: false, reason: "rate", message: "You have already left a picture. Please wait a few hours before sending another." };
    }
    const entry = {
      id: newId(),
      text: v.text,
      name: v.name,
      from: "visitor",
      seed: false,
      hidden: false,
      ts: Date.now(),
      device: this.device.slice(0, 12),
    };
    let persisted = false;
    try {
      await this.remote.add(entry);
      persisted = true;
      this.mode = "remote";
    } catch (err) {
      console.warn("Drift store: remote add failed, saving locally", err);
      this.mode = "local";
    }
    try {
      await this.local.add(entry);
      localStorage.setItem(`${LS_PREFIX}:sentAt`, String(entry.ts));
      localStorage.setItem(`${LS_PREFIX}:sentId`, entry.id);
    } catch {
      /* ignore */
    }
    return { ok: true, entry, persisted };
  }

  async hide(id, hidden = true) {
    try {
      await this.remote.hide(id, hidden);
    } catch (err) {
      console.warn("Drift store: remote hide failed", err);
    }
    return this.local.hide(id, hidden);
  }

  pickStranger(entries, exceptId) {
    const pool = entries.filter((e) => !e.hidden && e.id !== exceptId && !e.seed);
    const fallback = entries.filter((e) => !e.hidden && e.id !== exceptId);
    const src = pool.length ? pool : fallback;
    if (!src.length) return null;
    return src[Math.floor(Math.random() * src.length)];
  }
}

export function createStore() {
  return new DriftStore();
}
