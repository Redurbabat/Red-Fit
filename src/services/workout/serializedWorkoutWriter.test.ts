import { describe, expect, it } from "vitest";
import { createSerializedWorkoutWriter } from "./serializedWorkoutWriter";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("serialized workout autosave", () => {
  it("never persists a stale active workout after the completed snapshot", async () => {
    const blockActive = deferred();
    const saved: { status: string; sets: number }[] = [];
    const writer = createSerializedWorkoutWriter(async (snapshot: { status: string; sets: number }) => {
      if (snapshot.sets === 1) await blockActive.promise;
      saved.push(snapshot);
    });
    const first = writer({ status: "active", sets: 1 });
    const finished = writer({ status: "completed", sets: 2 });
    await Promise.resolve();
    expect(saved).toHaveLength(0);
    blockActive.resolve();
    await Promise.all([first, finished]);
    expect(saved.map((s) => s.status)).toEqual(["active", "completed"]);
    expect(saved.at(-1)).toEqual({ status: "completed", sets: 2 });
  });

  it("writes discarded workouts after any queued active snapshot", async () => {
    const saved: string[] = [];
    const writer = createSerializedWorkoutWriter(async (s: string) => {
      saved.push(s);
    });
    await Promise.all([writer("active"), writer("cancelled")]);
    expect(saved).toEqual(["active", "cancelled"]);
  });

  it("continues with newer data after an earlier write fails", async () => {
    const stored: string[] = [];
    const writer = createSerializedWorkoutWriter(async (status: string) => {
      if (status === "outdated") throw Error("write failed");
      stored.push(status);
    });
    const old = writer("outdated");
    const recent = writer("active");
    await expect(old).rejects.toThrow("write failed");
    await expect(recent).resolves.toBeUndefined();
    expect(stored).toEqual(["active"]);
  });

  it("waits for the actual write to finish before resolving", async () => {
    const gate = deferred();
    const writer = createSerializedWorkoutWriter(async () => { await gate.promise; });
    let resolved = false;
    const operation = writer(1).then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    gate.resolve();
    await operation;
    expect(resolved).toBe(true);
  });
});
