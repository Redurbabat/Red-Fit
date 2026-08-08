import { z } from "zod";
import { baseEntitySchema, localDateKeySchema, nonNegativeNumber } from "./common";

/** Append-only: historical measurements are never overwritten. */
export const bodyMeasurementSchema = baseEntitySchema.extend({
  date: localDateKeySchema,
  weightKg: nonNegativeNumber.optional(),
  waistCm: nonNegativeNumber.optional(),
  chestCm: nonNegativeNumber.optional(),
  armCm: nonNegativeNumber.optional(),
  legCm: nonNegativeNumber.optional(),
  bodyFatPercent: z.number().min(0).max(100).optional(),
  photoUrls: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type BodyMeasurement = z.infer<typeof bodyMeasurementSchema>;
