import { db, RomaneioSave } from '../db';
import { addToSyncQueue } from './syncQueueRepository';

export const TripRepository = {
  async getAll(): Promise<RomaneioSave[]> {
    return db.savedRomaneios.toArray();
  },

  async getById(id: string): Promise<RomaneioSave | undefined> {
    return db.savedRomaneios.get(id);
  },

  async put(romaneio: RomaneioSave, skipSync = false): Promise<string> {
    await db.savedRomaneios.put(romaneio);
    if (!skipSync) {
      await addToSyncQueue('romaneio', 'UPDATE', romaneio);
    }
    return romaneio.id;
  },

  async delete(id: string, skipSync = false): Promise<void> {
    const existing = await db.savedRomaneios.get(id);
    await db.savedRomaneios.delete(id);
    if (existing && !skipSync) {
      await addToSyncQueue('romaneio', 'DELETE', { id });
    }
  },

  async clearAll(): Promise<void> {
    await db.savedRomaneios.clear();
  }
};
