import {
  DEFAULT_METADATA,
  DEFAULT_SETTINGS,
  type AppMetadata,
  type UserSettings,
} from "../../models/settings";
import { db, METADATA_ID, SETTINGS_ID } from "./database";

export const settingsRepository = {
  async getSettings(): Promise<UserSettings> {
    const row = await db.settings.get(SETTINGS_ID);
    if (!row) return DEFAULT_SETTINGS;
    const { id: _id, ...settings } = row;
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    await db.settings.put({ ...settings, id: SETTINGS_ID });
  },

  async updateSettings(changes: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...changes };
    await this.saveSettings(next);
    return next;
  },

  async getMetadata(): Promise<AppMetadata> {
    const row = await db.metadata.get(METADATA_ID);
    if (!row) return DEFAULT_METADATA;
    const { id: _id, ...metadata } = row;
    return { ...DEFAULT_METADATA, ...metadata };
  },

  async saveMetadata(metadata: AppMetadata): Promise<void> {
    await db.metadata.put({ ...metadata, id: METADATA_ID });
  },

  async updateMetadata(changes: Partial<AppMetadata>): Promise<AppMetadata> {
    const current = await this.getMetadata();
    const next = { ...current, ...changes };
    await this.saveMetadata(next);
    return next;
  },
};
