import { describe, expect, it } from "vitest";
import { calculatePlates } from "./plates";

describe("calculatePlates", () => {
  it("loads 100 kg as bar + 40 kg per side (fewest plates)", () => {
    const result = calculatePlates(100);
    expect(result.perSide).toEqual([25, 15]);
    expect(result.achievableKg).toBe(100);
    expect(result.missingKg).toBe(0);
  });

  it("loads 60 kg as 20 kg per side", () => {
    const result = calculatePlates(60);
    expect(result.perSide).toEqual([20]);
    expect(result.achievableKg).toBe(60);
  });

  it("handles the empty bar", () => {
    const result = calculatePlates(20);
    expect(result.perSide).toEqual([]);
    expect(result.achievableKg).toBe(20);
  });

  it("reports missing weight for un-loadable targets", () => {
    // 21 kg: 0.5 kg per side is below the smallest plate.
    const result = calculatePlates(21);
    expect(result.achievableKg).toBe(20);
    expect(result.missingKg).toBe(1);
  });

  it("targets below bar weight stay at the bar", () => {
    const result = calculatePlates(10);
    expect(result.perSide).toEqual([]);
    expect(result.achievableKg).toBe(20);
    expect(result.missingKg).toBe(0);
  });

  it("stacks mixed plates (102.5 kg)", () => {
    const result = calculatePlates(102.5);
    expect(result.perSide).toEqual([25, 15, 1.25]);
    expect(result.achievableKg).toBe(102.5);
  });

  it("stacks duplicate plates (120 kg → 2×25 per side)", () => {
    const result = calculatePlates(120);
    expect(result.perSide).toEqual([25, 25]);
    expect(result.achievableKg).toBe(120);
  });

  it("respects a custom bar (Frauen-/Technikstange 15 kg)", () => {
    const result = calculatePlates(55, 15);
    expect(result.perSide).toEqual([20]);
    expect(result.achievableKg).toBe(55);
  });
});
