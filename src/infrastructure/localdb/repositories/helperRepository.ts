import { db } from '../db';
import { Helper } from '../../../types';

export const HelperRepository = {
  async getAll(): Promise<Helper[]> {
    return db.helpers.toArray();
  },

  async getById(id: string): Promise<Helper | undefined> {
    return db.helpers.get(id);
  },

  async put(helper: Helper): Promise<string> {
    await db.helpers.put(helper);
    return helper.id;
  },

  async putMany(helpers: Helper[]): Promise<void> {
    await db.helpers.bulkPut(helpers);
  },

  async delete(id: string): Promise<void> {
    await db.helpers.delete(id);
  },

  async clear(): Promise<void> {
    await db.helpers.clear();
  },

  async clearAll(): Promise<void> {
    await db.helpers.clear();
  }
};
