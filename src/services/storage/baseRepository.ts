import type { EntityTable } from "dexie";
import type { BaseEntity } from "../../models/common";
import { nowIso } from "../../utils/dates";
import { newId } from "../../utils/ids";

/**
 * Shared CRUD used by all entity repositories. Components never talk to Dexie
 * directly — always through a repository.
 */
export function createBaseRepository<T extends BaseEntity>(
  table: EntityTable<T, "id">,
) {
  return {
    async list(): Promise<T[]> {
      return table.toArray();
    },

    async get(id: string): Promise<T | undefined> {
      return table.get(id as never);
    },

    /** Insert with generated id + timestamps. Returns the stored entity. */
    async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
      const now = nowIso();
      const entity = { ...data, id: newId(), createdAt: now, updatedAt: now } as T;
      await table.add(entity);
      return entity;
    },

    /** Insert an entity that already carries id/timestamps (backup import, seeds). */
    async put(entity: T): Promise<T> {
      await table.put(entity);
      return entity;
    },

    async update(id: string, changes: Partial<Omit<T, "id" | "createdAt">>): Promise<T | undefined> {
      // Dexie's table.update typing is strict about UpdateSpec; a plain object works at runtime.
      await table.update(id as never, { ...changes, updatedAt: nowIso() } as never);
      return table.get(id as never);
    },

    async delete(id: string): Promise<void> {
      await table.delete(id as never);
    },

    async count(): Promise<number> {
      return table.count();
    },
  };
}
