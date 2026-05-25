import { db } from '../db';
import { DriverScore } from '../../../types';
import { addToSyncQueue } from './syncQueueRepository';

export const DriverRepository = {
  async getAll(): Promise<DriverScore[]> {
    return db.drivers.toArray();
  },

  async getById(id: string): Promise<DriverScore | undefined> {
    return db.drivers.get(id);
  },

  async put(driver: DriverScore, skipSync = false): Promise<string> {
    await db.drivers.put(driver);
    if (!skipSync) {
      await addToSyncQueue('driver', 'UPDATE', driver);
    }
    return driver.id;
  },

  async delete(id: string, skipSync = false): Promise<void> {
    const existing = await db.drivers.get(id);
    await db.drivers.delete(id);
    if (existing && !skipSync) {
      await addToSyncQueue('driver', 'DELETE', { id });
    }
  },

  async clearAll(): Promise<void> {
    await db.drivers.clear();
  }
};
