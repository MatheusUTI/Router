import { db } from '../db';
import { DeliveryOccurrence } from '../../../types';
import { addToSyncQueue } from './syncQueueRepository';

export const OccurrenceRepository = {
  async getAll(): Promise<DeliveryOccurrence[]> {
    return db.occurrences.toArray();
  },

  async getByCodigo(codigo: string): Promise<DeliveryOccurrence | undefined> {
    return db.occurrences.get(codigo);
  },

  async put(occurrence: DeliveryOccurrence, skipSync = false): Promise<string> {
    await db.occurrences.put(occurrence);
    if (!skipSync) {
      await addToSyncQueue('occurrence', 'UPDATE', occurrence);
    }
    return occurrence.codigo;
  },

  async delete(codigo: string, skipSync = false): Promise<void> {
    const existing = await db.occurrences.get(codigo);
    await db.occurrences.delete(codigo);
    if (existing && !skipSync) {
      await addToSyncQueue('occurrence', 'DELETE', { codigo });
    }
  },

  async clearAll(): Promise<void> {
    await db.occurrences.clear();
  }
};
