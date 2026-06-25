import { db, SyncQueueItem } from '../db';

/**
 * Adiciona uma ação operativa pendente na fila de sincronização secundária.
 */
export async function addToSyncQueue(
  entity: 'ctrc' | 'vehicle' | 'driver' | 'romaneio' | 'occurrence' | 'cidade_rota' | 'audit_log',
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
  },

  async processSyncQueue(): Promise<void> {
    const pendingItems = await this.getPending();
    if (pendingItems.length === 0) return;

    // To avoid circular dependencies or massive imports, we dynamically import the repos here.
    // In a real robust system, this might be handled by a dedicated worker or dispatcher pattern.
    try {
      const { auditLogSupabaseRepository } = await import('../../supabase/repositories/auditLogSupabaseRepository');
      const { shipmentSupabaseRepository } = await import('../../supabase/repositories/shipmentSupabaseRepository');
      
      for (const item of pendingItems) {
        if (!item.id) continue;
        
        await db.sync_queue.update(item.id, { 
          status: 'processing', 
          last_attempt_at: new Date().toISOString() 
        });

        try {
          let success = false;
          let errorObj = null;

          if (item.entity === 'audit_log' && item.operation === 'CREATE') {
            const res = await auditLogSupabaseRepository.insertLog(item.payload);
            success = res.success;
            errorObj = res.error;
          } else if (item.entity === 'ctrc' && item.operation === 'DELETE') {
            const ctrcNumber = item.payload.id.replace(/\D/g, '').substring(0, 8) || item.payload.id;
            const res = await shipmentSupabaseRepository.softDeleteShipment(ctrcNumber);
            success = res.success;
            errorObj = res.error;
          } else {
            // For MVP, we will just mark other non-implemented operations as failed.
            errorObj = new Error(`Auto-retry not implemented for ${item.entity} / ${item.operation}`);
          }

          if (success) {
            await this.markAsCompleted(item.id);
          } else {
            await this.markAsFailed(item.id, errorObj?.message || String(errorObj));
          }
        } catch (err: any) {
          await this.markAsFailed(item.id, err.message || String(err));
        }
      }
    } catch (err) {
      console.warn('Failed to load dependencies for sync queue processing:', err);
    }
  }
};
