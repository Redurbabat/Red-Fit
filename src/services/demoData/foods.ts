import type { FoodItem } from "../../models";

const SEED_TIME = "2026-01-01T00:00:00.000Z";

type SeedFood = Omit<FoodItem, "id" | "createdAt" | "updatedAt" | "source" | "isCustom"> & {
  id: string;
};

function food(f: SeedFood): FoodItem {
  return { ...f, source: "manual", createdAt: SEED_TIME, updatedAt: SEED_TIME };
}

/** Base food library — plausible per-100-g values, German names. */
export const SEED_FOODS: FoodItem[] = [
  food({
    id: "seed-food-oats",
    name: "Haferflocken",
    category: "grain",
    kcalPer100g: 370,
    proteinPer100g: 13,
    carbsPer100g: 60,
    fatPer100g: 7,
    fiberPer100g: 10,
    sugarPer100g: 1,
    servingSizeG: 50,
  }),
  food({
    id: "seed-food-milk",
    name: "Milch 1.5%",
    category: "dairy",
    kcalPer100g: 47,
    proteinPer100g: 3.4,
    carbsPer100g: 4.9,
    fatPer100g: 1.5,
    sugarPer100g: 4.9,
    servingSizeG: 200,
  }),
  food({
    id: "seed-food-banana",
    name: "Banane",
    category: "fruit",
    kcalPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    sugarPer100g: 12.2,
    fiberPer100g: 2.6,
    servingSizeG: 120,
  }),
  food({
    id: "seed-food-rice",
    name: "Reis (roh)",
    category: "grain",
    kcalPer100g: 349,
    proteinPer100g: 7.1,
    carbsPer100g: 77.8,
    fatPer100g: 0.6,
    servingSizeG: 75,
  }),
  food({
    id: "seed-food-chicken",
    name: "Poulet-Brust",
    category: "meat",
    kcalPer100g: 110,
    proteinPer100g: 23,
    carbsPer100g: 0,
    fatPer100g: 1.5,
    servingSizeG: 150,
  }),
  food({
    id: "seed-food-egg",
    name: "Ei",
    category: "other",
    kcalPer100g: 155,
    proteinPer100g: 12.6,
    carbsPer100g: 1.1,
    fatPer100g: 10.6,
    servingSizeG: 60,
  }),
  food({
    id: "seed-food-yogurt",
    name: "Joghurt natur",
    category: "dairy",
    kcalPer100g: 62,
    proteinPer100g: 4.3,
    carbsPer100g: 4.7,
    fatPer100g: 3.0,
    sugarPer100g: 4.7,
    servingSizeG: 150,
  }),
  food({
    id: "seed-food-protein-shake",
    name: "Proteinshake (Pulver)",
    category: "supplement",
    kcalPer100g: 380,
    proteinPer100g: 78,
    carbsPer100g: 6,
    fatPer100g: 5,
    servingSizeG: 30,
  }),
  food({
    id: "seed-food-bread",
    name: "Vollkornbrot",
    category: "grain",
    kcalPer100g: 233,
    proteinPer100g: 8.5,
    carbsPer100g: 41,
    fatPer100g: 3.2,
    fiberPer100g: 7.5,
    saltPer100g: 1.1,
    servingSizeG: 50,
  }),
  food({
    id: "seed-food-tuna",
    name: "Thunfisch (Dose, in Wasser)",
    category: "fish",
    kcalPer100g: 116,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 1,
    saltPer100g: 1,
    servingSizeG: 140,
  }),
];
