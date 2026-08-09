import { z } from "zod";

export const userSettingsSchema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  units: z.literal("metric"),
  firstDayOfWeek: z.enum(["monday", "sunday"]),
  show3dPlaceholders: z.boolean(),
  reducedMotion: z.boolean(),
  language: z.literal("de"),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  units: "metric",
  firstDayOfWeek: "monday",
  show3dPlaceholders: true,
  reducedMotion: false,
  language: "de",
};

export const appMetadataSchema = z.object({
  schemaVersion: z.number().int().min(1),
  onboardingCompleted: z.boolean(),
  onboardingVersion: z.number().int().min(0),
  demoDataSeeded: z.boolean(),
  /** Set on every successful export — shown under Speicher & Diagnose. */
  lastBackupAt: z.string().optional(),
});
export type AppMetadata = z.infer<typeof appMetadataSchema>;

export const DEFAULT_METADATA: AppMetadata = {
  schemaVersion: 1,
  onboardingCompleted: false,
  onboardingVersion: 0,
  demoDataSeeded: false,
};
