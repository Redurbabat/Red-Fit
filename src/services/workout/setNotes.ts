/** Optional per-set note, inspired by openGym's concise set-row notes.
 * This only formats a value; saving still uses RED Fit's existing workout
 * autosave/revision pipeline. Empty notes are omitted on blur.
 */
export const SET_NOTE_MAX_LENGTH = 140;

/** Remove control characters, trim, and keep short set notes predictable. */
export function normalizeSetNote(value: string): string | undefined {
  const normalized = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : char;
  }).join("")
    .trim()
    .slice(0, SET_NOTE_MAX_LENGTH)
    .trim();
  return normalized || undefined;
}
