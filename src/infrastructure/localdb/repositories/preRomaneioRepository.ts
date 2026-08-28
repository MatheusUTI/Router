import { db } from '../db';
import { PreRomaneio, PreRomaneioStatus } from '../../../types';

import { addToSyncQueue, SyncQueueRepository } from './syncQueueRepository';


export const PreRomaneioRepository = {
  async getAll(): Promise<PreRomaneio[]> {
    return db.pre_romaneios.toArray();
  },

  async getByDate(date: string): Promise<PreRomaneio[]> {
    return db.pre_romaneios.where('planningDate').equals(date).toArray();
  },

  async getByRoute(route: string): Promise<PreRomaneio[]> {
    return db.pre_romaneios.where('route').equals(route).toArray();
  },

  async getByStatus(status: PreRomaneioStatus): Promise<PreRomaneio[]> {
    return db.pre_romaneios.where('status').equals(status).toArray();
  },

  async put(item: PreRomaneio): Promise<string> {
    await db.pre_romaneios.put(item);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'UPDATE', { item, companyCode });
      SyncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar sync de pré-romaneio:', err);
    }
    return item.id;
  },

  async putMany(items: PreRomaneio[]): Promise<void> {
    await db.pre_romaneios.bulkPut(items);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'CREATE', { action: 'upsertMany', items, companyCode });
      SyncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar sync de pré-romaneios:', err);
    }
  },

  async delete(id: string, username?: string, reason?: string): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    if (existing) {
      const now = new Date().toISOString();
      const cancelled: PreRomaneio = {
        ...existing,
        status: 'CANCELADO' as const,
        updatedAt: now,
        cancelledAt: now,
        cancelledBy: username || 'sistema',
        cancelReason: reason || 'Cancelado operacionalmente'
      };
      await db.pre_romaneios.put(cancelled);
      try {
        await addToSyncQueue('pre_romaneio', 'DELETE', { 
          action: 'cancel', 
          id, 
          cancelledBy: cancelled.cancelledBy, 
          cancelReason: cancelled.cancelReason 
        });
        SyncQueueRepository.processSyncQueue().catch(() => {});
      } catch (err) {
        console.warn('[PreRomaneioRepository] Erro ao agendar cancelamento:', err);
      }
    }
  },

  async updateStatus(id: string, status: PreRomaneioStatus, extras?: Partial<PreRomaneio>, username?: string): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    if (!existing) return;

    let updated: PreRomaneio = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      ...extras
    };

    if (status === 'CANCELADO') {
      updated = {
        ...updated,
        cancelledAt: updated.updatedAt,
        cancelledBy: username || 'sistema',
        cancelReason: 'Cancelado operacionalmente via status'
      };
    }

    await db.pre_romaneios.put(updated);

    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      if (status === 'CANCELADO') {
        await addToSyncQueue('pre_romaneio', 'DELETE', { action: 'cancel', id, cancelledBy: updated.cancelledBy, cancelReason: updated.cancelReason });
      } else {
        await addToSyncQueue('pre_romaneio', 'UPDATE', { item: updated, companyCode });
      }
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar status no Supabase:', err);
    }
  },

  async updateAssignment(id: string, data: Partial<PreRomaneio>): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    if (!existing) return;

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };

    await db.pre_romaneios.put(updated);

    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'UPDATE', { item: updated, companyCode });
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar atribuição no Supabase:', err);
    }
  },

  async cancel(id: string): Promise<void> {
    await this.updateStatus(id, 'CANCELADO');
  },

  async markEmSeparacao(id: string): Promise<void> {
    await this.updateStatus(id, 'EM_SEPARACAO');
  },

  async markSeparado(id: string): Promise<void> {
    await this.updateStatus(id, 'SEPARADO');
  },

  async markComDivergencia(id: string): Promise<void> {
    await this.updateStatus(id, 'COM_DIVERGENCIA');
  },

  async markConvertidoRomaneio(id: string, romaneioId: string): Promise<void> {
    await this.updateStatus(id, 'CONVERTIDO_ROMANEIO', { convertedRomaneioId: romaneioId });
  }
};
