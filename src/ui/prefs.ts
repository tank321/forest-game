// Per-browser preferences (sound and music on/off, tutorial progress), not part of the save. Storage can be blocked, so both sides tolerate failure.
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not remembered; it still holds for this session
  }
}
