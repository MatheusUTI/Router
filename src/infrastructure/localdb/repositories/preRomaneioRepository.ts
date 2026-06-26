import { db } from '../db';
import { PreRomaneio, PreRomaneioStatus } from '../../../types';
import { preRomaneioSupabaseRepository } from '../../supabase/repositories/preRomaneioSupabaseRepository';

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
      await preRomaneioSupabaseRepository.upsertPreRomaneio(item, companyCode);
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar pré-romaneio no Supabase:', err);
    }
    return item.id;
  },

  async putMany(items: PreRomaneio[]): Promise<void> {
    await db.pre_romaneios.bulkPut(items);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await preRomaneioSupabaseRepository.upsertPreRomaneios(items, companyCode);
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar pré-romaneios no Supabase:', err);
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    await db.pre_romaneios.delete(id);
    if (existing) {
      try {
        const companyCode = localStorage.getItem('user_unit') || 'SPO';
        const cancelled = { ...existing, status: 'CANCELADO' as const, updatedAt: new Date().toISOString() };
        await preRomaneioSupabaseRepository.upsertPreRomaneio(cancelled, companyCode);
      } catch (err) {
        console.warn('[PreRomaneioRepository] Erro ao marcar como cancelado no Supabase durante remoção:', err);
      }
    }
  },

  async updateStatus(id: string, status: PreRomaneioStatus, extras?: Partial<PreRomaneio>): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    if (!existing) return;

    const updated = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      ...extras
    };

    await db.pre_romaneios.put(updated);

    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await preRomaneioSupabaseRepository.upsertPreRomaneio(updated, companyCode);
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
      await preRomaneioSupabaseRepository.upsertPreRomaneio(updated, companyCode);
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
