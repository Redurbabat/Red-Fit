/**
 * A summary note is saved on debounce, blur, pagehide and explicit "Fertig".
 * Several events can submit the same text before the preceding promise
 * settles. Persist it once, but let every caller await the SAME promise.
 *
 * Do not compare only with the last COMMITTED text: when "A" is saved,
 * "B" is queued, and the user types "A" again, "A" must be queued behind
 * "B" or the database would finish with stale text "B".
 */
export function createCoalescedNoteWriter(
  persist: (text: string) => Promise<unknown>,
  initialText = "",
): (text: string) => Promise<void> {
  let committedText = initialText.trim();
  let lastQueuedText = committedText;
  let lastResult: Promise<void> = Promise.resolve();
  let tail: Promise<void> = Promise.resolve();

  return (text: string): Promise<void> => {
    const value = text.trim();
    if (value === lastQueuedText) return lastResult;

    // Both successful and rejected writes release the queue. A failed
    // operation still rejects its own callers and can be explicitly retried.
    const current = tail.then(async () => {
      await persist(value);
      committedText = value;
    });
    tail = current.catch(() => undefined);
    lastQueuedText = value;
    const result = current.catch((error: unknown) => {
      if (lastQueuedText === value) {
        // A failure of the latest queued value permits a future retry.
        // Do not change the token if a newer distinct write is queued.
        lastQueuedText = committedText;
      }
      throw error;
    });
    lastResult = result;
    return result;
  };
}
