import { z } from "zod";
import { baseEntitySchema, localDateKeySchema } from "./common";

/**
 * Recovery check-in ratings: 1–5, where 5 is always the OPTIMAL state
 * (sleep 5 = excellent, stress 5 = relaxed, soreness 5 = none). The UI
 * labels each dial so the shared direction stays unambiguous.
 */
export const recoveryRatingSchema = z.number().int().min(1).max(5);
export type RecoveryRating = z.infer<typeof recoveryRatingSchema>;

/** One check-in per local day — re-submitting the same day updates it. */
export const recoveryLogSchema = baseEntitySchema.extend({
  date: localDateKeySchema,
  sleepQuality: recoveryRatingSchema,
  energy: recoveryRatingSchema,
  stress: recoveryRatingSchema,
  soreness: recoveryRatingSchema,
  sleepHours: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});
export type RecoveryLog = z.infer<typeof recoveryLogSchema>;
