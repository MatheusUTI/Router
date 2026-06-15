import { db } from '../db';
import { CtrcOccurrenceHistoryItem } from '../../../types';

export const CtrcOccurrenceHistoryRepository = {
  async getAll(): Promise<CtrcOccurrenceHistoryItem[]> {
    return db.ctrc_occurrence_history.toArray();
  },

  async getByCtrcId(ctrcId: string): Promise<CtrcOccurrenceHistoryItem[]> {
    return db.ctrc_occurrence_history
      .where('ctrcId')
      .equals(ctrcId)
      .toArray();
  },

  async getByOccurrenceCode(code: string): Promise<CtrcOccurrenceHistoryItem[]> {
    return db.ctrc_occurrence_history
      .where('occurrenceCode')
      .equals(code)
      .toArray();
  },

  async getByImportDate(date: string): Promise<CtrcOccurrenceHistoryItem[]> {
    return db.ctrc_occurrence_history
      .where('importDate')
      .equals(date)
      .toArray();
  },

  async put(item: CtrcOccurrenceHistoryItem): Promise<string> {
    await db.ctrc_occurrence_history.put(item);
    return item.id;
  },

  async putMany(items: CtrcOccurrenceHistoryItem[]): Promise<void> {
    await db.ctrc_occurrence_history.bulkPut(items);
  },

  async upsertManyDeduped(items: CtrcOccurrenceHistoryItem[]): Promise<void> {
    for (const item of items) {
      // Find matches in the local IndexedDB using ctrcId index
      const existing = await db.ctrc_occurrence_history
        .where('ctrcId')
        .equals(item.ctrcId)
        .toArray();

      const isDuplicate = existing.some(
        (ex) =>
          ex.occurrenceCode === item.occurrenceCode &&
          ex.status === item.status &&
          ex.locationLabel === item.locationLabel &&
          ex.importDate === item.importDate
      );

      if (!isDuplicate) {
        await db.ctrc_occurrence_history.put(item);
      }
    }
  },

  async clear(): Promise<void> {
    await db.ctrc_occurrence_history.clear();
  }
};
