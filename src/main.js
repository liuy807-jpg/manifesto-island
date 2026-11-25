import "./style.css";
import { Experience } from "./experience/Experience.js";

async function boot() {
const canvas = document.getElementById("view");
const gate = document.getElementById("gate");
const action = document.getElementById("gate-action");
const fail = document.getElementById("fail");

const ui = {
  root: document.body,
  mute: document.getElementById("mute"),
  pips: [...document.querySelectorAll(".pip")],
  card: document.getElementById("card"),
  num: document.getElementById("card-num"),
  name: document.getElementById("card-name"),
  headline: document.getElementById("card-headline"),
  excerpt: document.getElementById("card-excerpt"),
  more: document.getElementById("more"),
  speak: document.getElementById("speak"),
  hint: document.getElementById("hint"),
  joystick: document.getElementById("joystick"),
  sheet: document.getElementById("sheet"),
  sheetNum: document.getElementById("sheet-num"),
  sheetTitle: document.getElementById("sheet-title"),
  sheetBody: document.getElementById("sheet-body"),
  sheetClose: document.getElementById("sheet-close"),
  drift: document.getElementById("drift"),
  driftCta: document.getElementById("drift-cta"),
  driftNote: document.getElementById("drift-note"),
  placeKicker: document.getElementById("place-kicker"),
  placeName: document.getElementById("place-name"),
  placeSub: document.getElementById("place-sub"),
  objective: document.getElementById("objective-text"),
  objectiveSub: document.getElementById("objective-sub"),
  help: document.getElementById("hud-help"),
  journal: document.getElementById("journal"),
  journalBtn: document.getElementById("journal-btn"),
  journalClose: document.getElementById("journal-close"),
  journalList: document.getElementById("journal-list"),
  journalCount: document.getElementById("journal-count"),
  cardContinue: document.getElementById("card-continue"),
  driftKicker: document.getElementById("drift-kicker"),
  driftTitle: document.getElementById("drift-title"),
  driftLead: document.getElementById("drift-lead"),
  driftCount: document.getElementById("drift-count"),
  driftReread: document.getElementById("drift-reread"),
  driftStatus: document.getElementById("drift-status"),
  isleCount: document.getElementById("isle-count"),
  isleCountNum: document.getElementById("isle-count-num"),
  compose: document.getElementById("compose"),
  composeForm: document.getElementById("compose-form"),
  composeText: document.getElementById("compose-text"),
  composeName: document.getElementById("compose-name"),
  composeCount: document.getElementById("compose-count"),
  composeError: document.getElementById("compose-error"),
  composeSend: document.getElementById("compose-send"),
  composeCancel: document.getElementById("compose-cancel"),
  receive: document.getElementById("receive"),
  receiveKicker: document.getElementById("receive-kicker"),
  receiveText: document.getElementById("receive-text"),
  receiveEn: document.getElementById("receive-en"),
  receiveFrom: document.getElementById("receive-from"),
  receiveNote: document.getElementById("receive-note"),
  receiveClose: document.getElementById("receive-close"),
  landing: document.getElementById("landing"),
  landingClose: document.getElementById("landing-close"),
  landingNote: document.getElementById("landing-note"),
  isletCard: document.getElementById("islet-card"),
  isletText: document.getElementById("islet-text"),
  isletEn: document.getElementById("islet-en"),
  isletFrom: document.getElementById("islet-from"),
  isletClose: document.getElementById("islet-close"),
  isletHide: document.getElementById("islet-hide"),
  isletUnhide: document.getElementById("islet-unhide"),
  labels: document.getElementById("place-labels"),
  chapters: document.getElementById("chapters"),
};

const exp = new Experience(canvas, ui);
window.__exp = exp;

function showFail() {
  fail.hidden = false;
  gate.hidden = true;
}

try {
  await exp.init();
} catch (err) {
  console.error(err);
  showFail();
}

if (!exp.renderer) {
  showFail();
} else {
  gate.setAttribute("aria-busy", "false");
  gate.classList.add("is-ready");
  action.textContent = "Tap to come ashore";
  gate.setAttribute("aria-label", "Tap to come ashore");

  const alreadyAshore = (() => {
    try { return sessionStorage.getItem("island-ashore") === "1"; }
    catch { return false; }
  })();

  const enter = async () => {
    if (gate.disabled || gate.classList.contains("is-leaving")) return;
    gate.disabled = true;
    gate.classList.remove("is-ready");
    action.textContent = "Coming ashore";
    gate.classList.add("is-leaving");
    gate.setAttribute("aria-hidden", "true");
    try { sessionStorage.setItem("island-ashore", "1"); } catch {}
    await exp.enter();
  };

  if (alreadyAshore) {
    // Mid-session reload or back-forward: skip the cover so it cannot
    // come back over the island or an open statement.
    await enter();
  } else {
    gate.addEventListener("click", enter, { once: true });
    // Keyboard: Enter / Space also starts
    window.addEventListener("keydown", (e) => {
      if (gate.classList.contains("is-leaving") || gate.disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enter();
      }
    }, { once: true });
  }
}
}

boot();
