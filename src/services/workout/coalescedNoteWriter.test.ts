import { describe, expect, it, vi } from "vitest";
import { createCoalescedNoteWriter } from "./coalescedNoteWriter";

function deferred() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  return { wait, release };
}

describe("coalesced summary note persistence", () => {
  it("shares one save across debounce, blur and pagehide", async () => {
    const gate = deferred();
    const persist = vi.fn(async (_text: string) => { await gate.wait; });
    const writer = createCoalescedNoteWriter(persist, "Before");
    const debounce = writer("After");
    const blur = writer("After");
    const pagehide = writer("After");
    expect(blur).toBe(debounce);
    expect(pagehide).toBe(debounce);
    gate.release();
    await Promise.all([debounce, blur, pagehide]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith("After");
  });

  it("does not allow a queued edit to override a later revert", async () => {
    const gate = deferred();
    let stored = "Before";
    const persist = vi.fn(async (text: string) => {
      if (text === "Draft") await gate.wait;
      stored = text;
    });
    const writer = createCoalescedNoteWriter(persist, "Before");
    const draft = writer("Draft");
    const revert = writer("Before");
    gate.release();
    await Promise.all([draft, revert]);
    expect(stored).toBe("Before");
    expect(persist.mock.calls.map(([text]) => text)).toEqual(["Draft", "Before"]);
  });

  it("propagates failure to coalesced callers and retries afterward", async () => {
    const persist = vi.fn()
      .mockRejectedValueOnce(new Error("DB unavailable"))
      .mockResolvedValue(undefined);
    const writer = createCoalescedNoteWriter(persist, "Before");
    const one = writer("After");
    const two = writer("After");
    expect(one).toBe(two);
    await expect(one).rejects.toThrow("DB unavailable");
    await expect(writer("After")).resolves.toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("allows returning to committed text after a failed edit", async () => {
    const persist = vi.fn(async () => { throw Error("offline"); });
    const writer = createCoalescedNoteWriter(persist, "Before");
    await expect(writer("After")).rejects.toThrow("offline");
    await expect(writer("Before")).resolves.toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("never blocks a newer note after an earlier write fails", async () => {
    const persist = vi.fn(async (text: string) => {
      if (text === "Broken") throw Error("failure");
    });
    const writer = createCoalescedNoteWriter(persist);
    const results = await Promise.allSettled([
      writer("Broken"),
      writer("Recovered"),
    ]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled"]);
    expect(persist.mock.calls.map(([text]) => text)).toEqual(["Broken", "Recovered"]);
  });
});
