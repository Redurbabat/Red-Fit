import { describe, expect, it } from "vitest";
import { normalizeSetNote, SET_NOTE_MAX_LENGTH } from "./setNotes";

describe("per-set workout notes", () => {
  it("trims and removes control characters before persisting", () => {
    expect(normalizeSetNote("  Griff verrutscht\n")).toBe("Griff verrutscht");
    expect(normalizeSetNote("erste\nzweite Zeile")).toBe("erste zweite Zeile");
  });

  it("replaces NUL, DEL and tab while retaining emoji and umlauts", () => {
    expect(normalizeSetNote("A\u0000B\u007fC\t💪 ä")).toBe("A B C 💪 ä");
  });

  it("removes a cleared note instead of storing empty text", () => {
    expect(normalizeSetNote("")).toBeUndefined();
    expect(normalizeSetNote(" \t\n ")).toBeUndefined();
  });

  it("limits short notes to 140 characters without changing German letters", () => {
    expect(normalizeSetNote("ä".repeat(500))).toHaveLength(SET_NOTE_MAX_LENGTH);
    expect(normalizeSetNote(" Schulter fühlt sich gut an ")).toBe(
      "Schulter fühlt sich gut an",
    );
  });
});
