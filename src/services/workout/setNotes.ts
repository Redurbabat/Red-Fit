/** Optional per-set note, inspired by openGym's concise set-row notes.
 * This only formats a value; saving still uses RED Fit's existing workout
 * autosave/revision pipeline. Empty notes are omitted on blur.
 */
export const SET_NOTE_MAX_LENGTH = 140;

/** Remove control characters, trim, and keep short set notes predictable. */
export function normalizeSetNote(value: string): string | undefined {
  // ESLint no-control-regex rejects the original literal even though the sanitisation
  // was intentional. Replace ASCII controls and DEL without a control-character regex.
  const sanitized = [...value]
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 0x20 || code === 0x7f ? " " : char;
    })
    .join("");
  const normalized = sanitized
    .trim()
    .slice(0, SET_NOTE_MAX_LENGTH)
    .trim();
  return normalized || undefined;
}
