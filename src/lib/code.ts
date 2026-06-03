// Room codes: 6 letters from an unambiguous alphabet (no 0/O/1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6): string {
  let out = "";
  const buf = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }
  return out;
}

export function isValidRoomCode(s: string): boolean {
  if (typeof s !== "string" || s.length < 4 || s.length > 12) return false;
  return [...s].every((ch) => ALPHABET.includes(ch));
}
