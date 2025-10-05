const STORAGE_KEY = "cinefinder.client.uuid";

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n) => n.toString(16).padStart(2, "0");
  const hex = Array.from(bytes, toHex).join("");
  return (
    hex.substring(0, 8) +
    "-" +
    hex.substring(8, 12) +
    "-" +
    hex.substring(12, 16) +
    "-" +
    hex.substring(16, 20) +
    "-" +
    hex.substring(20)
  );
}

export function getClientUUID() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && typeof existing === "string" && existing.length >= 8) {
      return existing;
    }
  } catch {}
  const id = generateUUID();
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  return id;
}
