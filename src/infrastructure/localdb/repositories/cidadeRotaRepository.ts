import { db } from '../db';
import { CidadeRota } from '../../../types';
import { addToSyncQueue } from './syncQueueRepository';

export const CidadeRotaRepository = {
  async getAll(): Promise<CidadeRota[]> {
    return db.cidades_rotas.toArray();
  },

  async getById(id: number): Promise<CidadeRota | undefined> {
    return db.cidades_rotas.get(id);
  },

  async getByCidade(cidade: string): Promise<CidadeRota | undefined> {
    const term = cidade.trim().toUpperCase();
    // Exact match
    let found = await db.cidades_rotas.where('cidade').equals(term).first();
    if (found) return found;

    // Check alias or alias list
    const all = await db.cidades_rotas.toArray();
    found = all.find((cr) => {
      if (cr.cidade === term) return true;
      const aliases = cr.alias ? cr.alias.split(',').map(a => a.trim().toUpperCase()) : [];
      return aliases.includes(term) || cr.cidade.includes(term) || term.includes(cr.cidade);
    });
    return found;
  },

  async put(item: CidadeRota, skipSync = true): Promise<number> {
    // Standardize text fields
    const formatted: CidadeRota = {
      ...item,
      cidade: item.cidade.trim().toUpperCase(),
      alias: (item.alias || '').trim().toUpperCase(),
      setor: (item.setor || '').trim().toUpperCase(),
      rota: (item.rota || '').trim().toUpperCase(),
    };

    let id: number;
    if (formatted.id) {
      await db.cidades_rotas.put(formatted);
      id = formatted.id;
    } else {
      id = await db.cidades_rotas.add(formatted);
    }

    if (!skipSync) {
      await addToSyncQueue('cidade_rota', 'UPDATE', { ...formatted, id });
    }
    return id;
  },

  async delete(id: number, skipSync = true): Promise<void> {
    const existing = await db.cidades_rotas.get(id);
    await db.cidades_rotas.delete(id);
    if (existing && !skipSync) {
      await addToSyncQueue('cidade_rota', 'DELETE', { id });
    }
  },

  async clearAll(): Promise<void> {
    await db.cidades_rotas.clear();
  },

  // Dynamic normalizer to process city name or sector format to standardized canonical routes
  async normalize(rawCidade: string, rawSetor?: string): Promise<{ cidade: string; setor: string; rota: string; prazo: number; prioridade: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA' }> {
    const searchCidade = (rawCidade || '').split(',')[0].trim().toUpperCase();
    const config = await this.getByCidade(searchCidade);

    if (config) {
      return {
        cidade: config.cidade,
        setor: config.setor,
        rota: config.rota,
        prazo: config.prazo_padrao,
        prioridade: config.prioridade_operacional
      };
    }

    // Default normalization rules if not found in db config
    let normalizedSetor = (rawSetor || 'OUTROS').trim().toUpperCase();
    let normalizedRota = 'ROTA GERAL';

    // Normalize common ERP messy names of routing sectors
    // Example: "06 ROTA 6", "R6", "ROTA06" -> "ROTA 06"
    const routeMatch = normalizedSetor.match(/(?:ROTA|R|ROT)\s*0?(\d+)/i);
    if (routeMatch) {
      const num = parseInt(routeMatch[1], 10);
      const paddedNum = num < 10 ? `0${num}` : `${num}`;
      normalizedSetor = `ROTA ${paddedNum}`;
      normalizedRota = `ROTA ${paddedNum}`;
    }

    return {
      cidade: searchCidade,
      setor: normalizedSetor,
      rota: normalizedRota,
      prazo: 2, // Standard fallback D+2
      prioridade: 'NORMAL'
    };
  }
};
