import type { UserProfile } from "../../models";
import { createBaseRepository } from "./baseRepository";
import { db } from "./database";

const base = createBaseRepository<UserProfile>(db.userProfiles);

export const profileRepository = {
  ...base,

  async getCurrent(): Promise<UserProfile | undefined> {
    const all = await db.userProfiles.toArray();
    return all[0];
  },
};
