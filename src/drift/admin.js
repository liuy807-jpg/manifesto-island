import { ADMIN_HASH } from "./config.js";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAdminFromSearch(search = location.search) {
  const token = new URLSearchParams(search).get("admin");
  if (!token) return false;
  try {
    const hex = await sha256Hex(token);
    return hex === ADMIN_HASH;
  } catch {
    return false;
  }
}
