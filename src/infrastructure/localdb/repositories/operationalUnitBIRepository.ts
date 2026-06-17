import { db } from '../db';
import { OperationalUnitBI } from '../../../types';

export const OperationalUnitBIRepository = {
  async getAll(): Promise<OperationalUnitBI[]> {
    return db.operational_units_bi.toArray();
  },

  async getActive(): Promise<OperationalUnitBI[]> {
    const list = await db.operational_units_bi.toArray();
    return list.filter(item => item.ativo !== false);
  },

  async getByUnidade(unidade: string): Promise<OperationalUnitBI | null> {
    const item = await db.operational_units_bi.where('unidade').equalsIgnoreCase(unidade).first();
    return item || null;
  },

  async putMany(items: OperationalUnitBI[]): Promise<void> {
    const itemsWithIds = items.map(item => ({
      ...item,
      id: item.id || Math.random().toString(36).substring(2, 11),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    await db.operational_units_bi.bulkPut(itemsWithIds);
  },

  async upsert(item: OperationalUnitBI): Promise<void> {
    const id = item.id || Math.random().toString(36).substring(2, 11);
    const existing = await db.operational_units_bi.get(id);
    const now = new Date().toISOString();
    
    const prepared: OperationalUnitBI = {
      ...item,
      id,
      createdAt: existing?.createdAt || item.createdAt || now,
      updatedAt: now
    };
    await db.operational_units_bi.put(prepared);
  },

  async remove(id: string): Promise<void> {
    await db.operational_units_bi.delete(id);
  },

  async importFromJson(items: any[]): Promise<void> {
    const prepared: OperationalUnitBI[] = items.map(item => ({
      id: item.id || item.unidade || Math.random().toString(36).substring(2, 11),
      unidade: String(item.unidade || '').trim().toUpperCase(),
      uf: String(item.uf || '').trim().toUpperCase(),
      tipo: String(item.tipo || 'Unidade').trim(),
      responsavelOperacional: item.responsavelOperacional || null,
      responsavelComercial: item.responsavelComercial || null,
      responsavel: item.responsavel || null,
      controleParceiros: item.controleParceiros === true || item.controleParceiros === 'true',
      parceiroUrbano: item.parceiroUrbano === true || item.parceiroUrbano === 'true',
      ativo: item.ativo !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    await db.operational_units_bi.clear();
    if (prepared.length > 0) {
      await db.operational_units_bi.bulkPut(prepared);
    }
  },

  async exportToJson(): Promise<string> {
    const list = await this.getAll();
    return JSON.stringify({
      schemaVersion: 1,
      name: "bd_unidades_operacionais_bi",
      exportedAt: new Date().toISOString(),
      records: list
    }, null, 2);
  },

  async exportToCsv(): Promise<string> {
    const list = await this.getAll();
    const headers = [
      'Unidade',
      'UF',
      'Tipo',
      'Responsavel Oper',
      'Responsavel CML',
      'Responsável',
      'Controle de Parceiros',
      'Parceiro - Urbano',
      'Ativo'
    ];
    
    const csvRows = [headers.join(';')];
    for (const item of list) {
      const values = [
        item.unidade || '',
        item.uf || '',
        item.tipo || '',
        item.responsavelOperacional || '',
        item.responsavelComercial || '',
        item.responsavel || '',
        item.controleParceiros ? 'true' : 'false',
        item.parceiroUrbano ? 'true' : 'false',
        item.ativo ? 'true' : 'false'
      ];
      const escapedValues = values.map(v => {
        let str = String(v).replace(/"/g, '""');
        if (str.includes(';') || str.includes('\n') || str.includes('"')) {
          str = `"${str}"`;
        }
        return str;
      });
      csvRows.push(escapedValues.join(';'));
    }
    return csvRows.join('\n');
  }
};
