import { MAX_NAME, MAX_TEXT } from "./config.js";

const URL_RE = /https?:\/\/|www\.|[\w.-]+\.(com|net|org|io|cn|xyz|gg|co|app|info|me|cc)\b/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const INVITE_RE = /(?:t\.me|discord\.gg|wa\.me)\b/i;

const BAD = [
  "nigger", "nigga", "faggot", "retard", "kike", "tranny",
  "child porn", "csam",
  "去死", "婊子", "操你妈", "你妈逼", "操你",
];

export function normalizeText(raw, max = MAX_TEXT) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

export function validateEntry({ text, name }) {
  const cleanText = normalizeText(text, MAX_TEXT);
  const cleanName = normalizeText(name, MAX_NAME);
  if (cleanText.length < 2) return { ok: false, reason: "too-short", message: "Write a little more." };
  if (URL_RE.test(cleanText) || URL_RE.test(cleanName) || EMAIL_RE.test(cleanText) || INVITE_RE.test(cleanText)) {
    return { ok: false, reason: "url", message: "Please do not leave a URL or contact details." };
  }
  const blob = `${cleanText} ${cleanName}`.toLowerCase();
  if (BAD.some((w) => blob.includes(w))) {
    return { ok: false, reason: "filter", message: "This line cannot go out to sea. Please try a gentler one." };
  }
  return { ok: true, text: cleanText, name: cleanName };
}
