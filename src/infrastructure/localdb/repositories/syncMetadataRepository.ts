import { db } from '../db';
import { SyncMetadata } from '../../../types';

export const SyncMetadataRepository = {
  async getAll(): Promise<SyncMetadata[]> {
    return db.sync_metadata.toArray();
  },

  async getById(entity: string): Promise<SyncMetadata | undefined> {
    return db.sync_metadata.get(entity);
  },

  async put(metadata: SyncMetadata): Promise<string> {
    await db.sync_metadata.put(metadata);
    return metadata.entity;
  },

  async putMany(metadataList: SyncMetadata[]): Promise<void> {
    await db.sync_metadata.bulkPut(metadataList);
  },

  async delete(entity: string): Promise<void> {
    await db.sync_metadata.delete(entity);
  },

  async clear(): Promise<void> {
    await db.sync_metadata.clear();
  },

  async clearAll(): Promise<void> {
    await db.sync_metadata.clear();
  }
};
