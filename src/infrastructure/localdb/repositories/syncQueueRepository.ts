import { db, SyncQueueItem } from '../db';

/**
 * Adiciona uma ação operativa pendente na fila de sincronização secundária.
 */
export async function addToSyncQueue(
  entity: 'ctrc' | 'vehicle' | 'driver' | 'romaneio' | 'occurrence' | 'cidade_rota',
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: any
): Promise<number> {
  const item: SyncQueueItem = {
    entity,
    operation,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending'
  };
  return db.sync_queue.add(item);
}

export const SyncQueueRepository = {
  async getPending(): Promise<SyncQueueItem[]> {
    return db.sync_queue.where('status').equals('pending').toArray();
  },

  async markAsCompleted(id: number): Promise<void> {
    await db.sync_queue.update(id, { status: 'completed' });
  },

  async markAsFailed(id: number, errorMessage: string): Promise<void> {
    const item = await db.sync_queue.get(id);
    if (item) {
      const nextRetry = item.retry_count + 1;
      await db.sync_queue.update(id, {
        status: nextRetry >= 5 ? 'failed' : 'pending', // Re-enfileira automaticamente até 5 tentativas
        retry_count: nextRetry,
        errorMessage
      });
    }
  },

  async delete(id: number): Promise<void> {
    await db.sync_queue.delete(id);
  },

  async getAll(): Promise<SyncQueueItem[]> {
    return db.sync_queue.toArray();
  },

  async clearCompleted(): Promise<void> {
    await db.sync_queue.where('status').equals('completed').delete();
  }
};
