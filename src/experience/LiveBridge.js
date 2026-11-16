/**
 * Optional TouchDesigner / presence link.
 * Enabled only with ?live=ws://host:port — the public site runs without it.
 *
 * Outgoing types: hello, approach, dwell, reveal, sky, touch, presence, visitors, drift
 * Incoming types:  params, cue, presence (other visitors as soft lights), guestbook (reserved), drift
 */
export class LiveBridge {
  constructor(url, hooks = {}) {
    this.url = url;
    this.hooks = hooks;
    this.ws = null;
    this.ready = false;
    this.queue = [];
    this._backoff = 800;
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.warn("Live bridge: could not open", err);
      return;
    }
    this.ws.addEventListener("open", () => {
      this.ready = true;
      this._backoff = 800;
      this.send({ type: "hello", role: "site", protocol: 1 });
      for (const m of this.queue.splice(0)) this.send(m);
      this.hooks.onOpen?.();
    });
    this.ws.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data));
      } catch {
        return;
      }
      this._handle(msg);
    });
    this.ws.addEventListener("close", () => {
      this.ready = false;
      this.hooks.onClose?.();
      window.setTimeout(() => {
        this._backoff = Math.min(8000, this._backoff * 1.6);
        this.connect();
      }, this._backoff);
    });
    this.ws.addEventListener("error", () => this.ws?.close());
  }

  send(msg) {
    if (!this.ws || this.ws.readyState !== 1) {
      if (this.queue.length < 40) this.queue.push(msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  _handle(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === "params") this.hooks.onParams?.(msg);
    else if (msg.type === "cue") this.hooks.onCue?.(msg);
    else if (msg.type === "presence") this.hooks.onPresence?.(msg);
    else if (msg.type === "guestbook") this.hooks.onGuestbook?.(msg);
    else if (msg.type === "visitors") this.hooks.onVisitors?.(msg);
    else if (msg.type === "drift") this.hooks.onDrift?.(msg);
  }

  dispose() {
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
  }
}

/** Parse ?live=ws://… or ?live=wss://… */
export function liveUrlFromSearch(search = location.search) {
  const raw = new URLSearchParams(search).get("live");
  if (!raw) return null;
  if (raw === "1") return "ws://127.0.0.1:8081";
  if (/^wss?:\/\//i.test(raw)) return raw;
  return null;
}
