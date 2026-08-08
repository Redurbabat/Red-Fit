import { describe, expect, it } from "vitest";
import type { FoodItem } from "../../models";
import { matchFood, parseRecipeText } from "./recipeTextParser";

function food(name: string, servingSizeG?: number): FoodItem {
  return {
    id: `f-${name}`,
    name,
    category: "other",
    kcalPer100g: 100,
    proteinPer100g: 5,
    carbsPer100g: 10,
    fatPer100g: 2,
    servingSizeG,
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const FOODS = [
  food("Haferflocken", 50),
  food("Banane", 120),
  food("Milch 1.5%", 200),
  food("Hähnchenbrust ohne Haut", 150),
  food("Reis (roh)", 75),
];

describe("parseRecipeText", () => {
  it("parses '200 g Haferflocken'", () => {
    const [line] = parseRecipeText("200 g Haferflocken", FOODS);
    expect(line.amountG).toBe(200);
    expect(line.food?.name).toBe("Haferflocken");
    expect(line.approximate).toBeFalsy();
  });

  it("parses compact '200g' and trailing formats", () => {
    const lines = parseRecipeText("200g Haferflocken\nHaferflocken 150 g", FOODS);
    expect(lines[0].amountG).toBe(200);
    expect(lines[1].amountG).toBe(150);
    expect(lines[1].food?.name).toBe("Haferflocken");
  });

  it("converts kg and kitchen units", () => {
    const lines = parseRecipeText("0,5 kg Reis\n2 EL Haferflocken\n1 Tasse Milch", FOODS);
    expect(lines[0].amountG).toBe(500);
    expect(lines[1].amountG).toBe(30);
    expect(lines[1].approximate).toBe(true);
    expect(lines[2].amountG).toBe(240);
  });

  it("resolves piece counts via servingSizeG ('2 Bananen')", () => {
    const [line] = parseRecipeText("2 Bananen", FOODS);
    expect(line.food?.name).toBe("Banane");
    expect(line.amountG).toBe(240);
    expect(line.approximate).toBe(true);
  });

  it("strips bullets and ignores adjective noise", () => {
    const [line] = parseRecipeText("- 1 große Banane", FOODS);
    expect(line.food?.name).toBe("Banane");
    expect(line.amountG).toBe(120);
  });

  it("keeps unmatched lines with their text", () => {
    const [line] = parseRecipeText("1 Prise Muskatnuss", FOODS);
    expect(line.food).toBeUndefined();
    expect(line.name).toContain("Muskatnuss");
  });

  it("handles fractions", () => {
    const [line] = parseRecipeText("1/2 Tasse Milch", FOODS);
    expect(line.amountG).toBe(120);
  });

  it("skips empty lines", () => {
    expect(parseRecipeText("\n\n200 g Reis\n\n", FOODS)).toHaveLength(1);
  });
});

describe("matchFood", () => {
  it("matches case-insensitively and partially", () => {
    expect(matchFood("hähnchenbrust", FOODS)?.name).toBe("Hähnchenbrust ohne Haut");
  });

  it("prefers the shortest matching name", () => {
    const foods = [...FOODS, food("Bananenchips")];
    expect(matchFood("Banane", foods)?.name).toBe("Banane");
  });

  it("returns undefined for very short queries", () => {
    expect(matchFood("El", FOODS)).toBeUndefined();
  });
});
