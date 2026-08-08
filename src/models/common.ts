import { z } from "zod";

/** ISO-8601 timestamp, e.g. "2026-08-08T18:25:12.123Z" */
export type ISODateTime = string;

/** Local calendar day key, e.g. "2026-08-08" (always local time, never UTC slice). */
export type LocalDateKey = string;

export const isoDateTimeSchema = z.string().min(1);
export const localDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Erwartet YYYY-MM-DD");

export interface BaseEntity {
  id: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const baseEntitySchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

/** Non-negative finite number (guards against NaN and negatives from forms). */
export const nonNegativeNumber = z.number().finite().nonnegative();
