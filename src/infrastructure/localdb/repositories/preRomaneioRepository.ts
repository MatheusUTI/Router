import { db } from '../db';
import { PreRomaneio, PreRomaneioStatus } from '../../../types';

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
    return item.id;
  },

  async putMany(items: PreRomaneio[]): Promise<void> {
    await db.pre_romaneios.bulkPut(items);
  },

  async delete(id: string): Promise<void> {
    await db.pre_romaneios.delete(id);
  },

  async updateStatus(id: string, status: PreRomaneioStatus, extras?: Partial<PreRomaneio>): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    if (!existing) return;

    await db.pre_romaneios.update(id, {
      status,
      updatedAt: new Date().toISOString(),
      ...extras
    });
  },

  async updateAssignment(id: string, data: Partial<PreRomaneio>): Promise<void> {
    const existing = await db.pre_romaneios.get(id);
    if (!existing) return;

    await db.pre_romaneios.update(id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
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
