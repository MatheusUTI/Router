import { db } from '../db';
import { Ctrc } from '../../../types';
import { addToSyncQueue } from './syncQueueRepository';

export const CtrcRepository = {
  async getAll(): Promise<Ctrc[]> {
    return db.ctrcs.toArray();
  },

  async getByUnid(unid: string): Promise<Ctrc[]> {
    if (unid === 'TODAS') {
      return db.ctrcs.toArray();
    }
    return db.ctrcs.where('unid').equalsIgnoreCase(unid).toArray();
  },

  async getById(id: string): Promise<Ctrc | undefined> {
    return db.ctrcs.get(id);
  },

  async put(ctrc: Ctrc, skipSync = false): Promise<string> {
    await db.ctrcs.put(ctrc);
    if (!skipSync) {
      await addToSyncQueue('ctrc', 'UPDATE', ctrc);
    }
    return ctrc.id;
  },

  async putMany(ctrcs: Ctrc[], skipSync = false): Promise<void> {
    // Uso de transação rápida nativa do Dexie para performance bruta no upload de faturamento
    await db.transaction('rw', db.ctrcs, async () => {
      await db.ctrcs.bulkPut(ctrcs);
    });

    if (!skipSync) {
      for (const ctrc of ctrcs) {
        await addToSyncQueue('ctrc', 'UPDATE', ctrc);
      }
    }
  },

  async delete(id: string, skipSync = false): Promise<void> {
    const existing = await db.ctrcs.get(id);
    await db.ctrcs.delete(id);
    if (existing && !skipSync) {
      await addToSyncQueue('ctrc', 'DELETE', { id });
    }
  },

  async clearAll(): Promise<void> {
    await db.ctrcs.clear();
  }
};
