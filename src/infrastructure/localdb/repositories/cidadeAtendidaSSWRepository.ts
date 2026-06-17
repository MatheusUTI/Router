import { db } from '../db';
import { CidadeAtendidaSSW } from '../../../types';

export function normalizePracaDestino(value: string): string {
  if (!value) return '';
  return value.trim().toUpperCase().replace(/\s+/g, '').substring(0, 3);
}

function parsePtBrFloat(val: string): number {
  if (!val) return 0;
  let clean = val.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parsePtBrInt(val: string): number {
  if (!val) return 0;
  let clean = val.replace(/\s/g, '').replace(/\./g, '').trim();
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

function parseBoolX(val: string): boolean {
  if (!val) return false;
  const clean = val.toLowerCase().trim();
  return (
    clean === 'x' ||
    clean === 's' ||
    clean === 'sim' ||
    clean === 'true' ||
    clean === '1' ||
    clean === 'ativo' ||
    clean === 'cif' ||
    clean === 'fob' ||
    clean === 'restrito'
  );
}

export const CidadeAtendidaSSWRepository = {
  async getAll(): Promise<CidadeAtendidaSSW[]> {
    return db.cidades_atendidas_ssw.toArray();
  },

  async getActive(): Promise<CidadeAtendidaSSW[]> {
    const list = await db.cidades_atendidas_ssw.toArray();
    return list.filter(item => item.ativo !== false);
  },

  async getByUnidadeOrigem(origem: string): Promise<CidadeAtendidaSSW[]> {
    const list = await db.cidades_atendidas_ssw.toArray();
    return list.filter(item => item.unidadeOrigem.toUpperCase() === origem.toUpperCase());
  },

  async getByCidadeDestino(cidade: string): Promise<CidadeAtendidaSSW[]> {
    const list = await db.cidades_atendidas_ssw.toArray();
    return list.filter(item => item.cidadeDestino.toUpperCase() === cidade.toUpperCase());
  },

  async getByPracaDestino(praca: string): Promise<CidadeAtendidaSSW[]> {
    const list = await db.cidades_atendidas_ssw.toArray();
    return list.filter(item => (item.pracaDestinoOriginal || item.pracaDestino || '').toUpperCase() === praca.toUpperCase());
  },

  async putMany(items: CidadeAtendidaSSW[]): Promise<void> {
    const prepared = items.map(item => {
      const rawPraca = item.pracaDestinoOriginal || item.pracaDestino || '';
      const normPraca = normalizePracaDestino(rawPraca);
      return {
        ...item,
        pracaDestinoOriginal: rawPraca,
        pracaDestinoNormalizada: normPraca,
        pracaHub: item.pracaHub || normPraca,
        pracaDestino: rawPraca,
        id: item.id || `ssw_${item.unidadeOrigem || ''}_${item.cidadeDestino || ''}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    await db.cidades_atendidas_ssw.bulkPut(prepared);
  },

  async upsert(item: CidadeAtendidaSSW): Promise<void> {
    const id = item.id || `ssw_${item.unidadeOrigem || ''}_${item.cidadeDestino || ''}_${Math.random().toString(36).substring(2, 7)}`;
    const existing = await db.cidades_atendidas_ssw.get(id);
    const now = new Date().toISOString();
    const rawPraca = item.pracaDestinoOriginal || item.pracaDestino || '';
    const normPraca = normalizePracaDestino(rawPraca);
    const prepared: CidadeAtendidaSSW = {
      ...item,
      pracaDestinoOriginal: rawPraca,
      pracaDestinoNormalizada: normPraca,
      pracaHub: item.pracaHub || normPraca,
      pracaDestino: rawPraca,
      id,
      createdAt: existing?.createdAt || item.createdAt || now,
      updatedAt: now
    };
    await db.cidades_atendidas_ssw.put(prepared);
  },

  async remove(id: string): Promise<void> {
    await db.cidades_atendidas_ssw.delete(id);
  },

  async importFromJson(items: any[]): Promise<void> {
    const prepared: CidadeAtendidaSSW[] = items.map(item => {
      const rawPraca = item.pracaDestinoOriginal || item.pracaDestino || '';
      const normPraca = normalizePracaDestino(rawPraca);
      return {
        id: item.id || `ssw_${item.unidadeOrigem || ''}_${item.cidadeDestino || ''}_${Math.random().toString(36).substring(2, 7)}`,
        unidadeOrigem: String(item.unidadeOrigem || '').trim().toUpperCase(),
        ufOrigem: String(item.ufOrigem || '').trim().toUpperCase(),
        cidadeOrigem: String(item.cidadeOrigem || '').trim(),
        codigoIbgeOrigem: item.codigoIbgeOrigem ? String(item.codigoIbgeOrigem).trim() : undefined,
        ufDestino: String(item.ufDestino || '').trim().toUpperCase(),
        cidadeDestino: String(item.cidadeDestino || '').trim(),
        pracaDestinoOriginal: rawPraca,
        pracaDestinoNormalizada: normPraca,
        pracaHub: item.pracaHub || normPraca,
        pracaDestino: rawPraca,
        codigoIbgeDestino: item.codigoIbgeDestino ? String(item.codigoIbgeDestino).trim() : undefined,
        distanciaKm: item.distanciaKm !== undefined ? Number(item.distanciaKm) : undefined,
        tarifa: item.tarifa !== undefined ? Number(item.tarifa) : undefined,
        prazo: item.prazo !== undefined ? Number(item.prazo) : undefined,
        frequencia: item.frequencia ? String(item.frequencia).trim() : undefined,
        quantPedagios: item.quantPedagios !== undefined ? Number(item.quantPedagios) : undefined,
        cif: item.cif === true || item.cif === 'true' || parseBoolX(String(item.cif)),
        fob: item.fob === true || item.fob === 'true' || parseBoolX(String(item.fob)),
        restrito: item.restrito === true || item.restrito === 'true' || parseBoolX(String(item.restrito)),
        tda: item.tda === true || item.tda === 'true' || parseBoolX(String(item.tda)),
        pracaComercial: item.pracaComercial ? String(item.pracaComercial).trim() : undefined,
        ativo: item.ativo !== false,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    await db.cidades_atendidas_ssw.clear();
    if (prepared.length > 0) {
      await db.cidades_atendidas_ssw.bulkPut(prepared);
    }
  },

  async importFromCsv(text: string): Promise<CidadeAtendidaSSW[]> {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    let headerLineIndex = -1;
    let delimiter = ';';

    // Search for header line containing 'unidade_origem' or common field names
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (
        lower.includes('unidade_origem') || 
        lower.includes('cidade_destino') || 
        lower.includes('unid_orig') ||
        lower.includes('uf_origem')
      ) {
        headerLineIndex = i;
        if (lines[i].includes(',')) {
          // Check if comma occurs more than semicolon in this line
          const commas = (lines[i].match(/,/g) || []).length;
          const semicolons = (lines[i].match(/;/g) || []).length;
          if (commas > semicolons) {
            delimiter = ',';
          }
        }
        break;
      }
    }

    // Fallback if no header was specifically identified: assume line 0 or line 1 (if there is some header on line 0)
    if (headerLineIndex === -1) {
      headerLineIndex = lines[0].toLowerCase().includes('ssw') ? 1 : 0;
      if (lines[headerLineIndex]?.includes(',')) {
        const commas = (lines[headerLineIndex].match(/,/g) || []).length;
        const semicolons = (lines[headerLineIndex].match(/;/g) || []).length;
        if (commas > semicolons) delimiter = ',';
      }
    }

    const firstRowIndex = headerLineIndex + 1;
    if (firstRowIndex >= lines.length) return [];

    const headers = lines[headerLineIndex]
      .split(delimiter)
      .map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '_'));

    const parsedList: CidadeAtendidaSSW[] = [];

    for (let i = firstRowIndex; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length === 0 || cols.every(col => col === '')) continue;

      const record: Partial<CidadeAtendidaSSW> = {};

      headers.forEach((header, idx) => {
        const val = cols[idx];
        if (val === undefined) return;

        // Normalization mappings
        if (header.includes('unidade_origem') || header === 'unidade' || header === 'unid_orig' || header === 'orig_unid') {
          record.unidadeOrigem = val.toUpperCase();
        } else if (header.includes('uf_orig') || header === 'uf_origem') {
          record.ufOrigem = val.toUpperCase();
        } else if (header.includes('cidade_orig') || header === 'cidade_origem') {
          record.cidadeOrigem = val;
        } else if (header.includes('codigo_ibge_orig') || header === 'ibge_orig' || header === 'cod_ibge_orig') {
          record.codigoIbgeOrigem = val;
        } else if (header.includes('uf_dest') || header === 'uf_destino') {
          record.ufDestino = val.toUpperCase();
        } else if (header.includes('cidade_dest') || header === 'cidade_destino') {
          record.cidadeDestino = val;
        } else if (header.includes('praca_dest') || header === 'praca_destino' || header === 'praca') {
          record.pracaDestinoOriginal = val;
          record.pracaDestinoNormalizada = normalizePracaDestino(val);
          record.pracaHub = record.pracaDestinoNormalizada;
          record.pracaDestino = val;
        } else if (header.includes('codigo_ibge_dest') || header === 'ibge_dest' || header === 'cod_ibge_dest') {
          record.codigoIbgeDestino = val;
        } else if (header.includes('distancia_km') || header === 'distancia' || header === 'dist') {
          record.distanciaKm = parsePtBrFloat(val);
        } else if (header.includes('tarifa') || header === 'valor_tarifa') {
          record.tarifa = parsePtBrFloat(val);
        } else if (header.includes('prazo')) {
          record.prazo = parsePtBrInt(val);
        } else if (header.includes('frequencia')) {
          record.frequencia = val;
        } else if (header.includes('quant_pedagios') || header.includes('pedagio')) {
          record.quantPedagios = parsePtBrInt(val);
        } else if (header === 'cif') {
          record.cif = parseBoolX(val);
        } else if (header === 'fob') {
          record.fob = parseBoolX(val);
        } else if (header.includes('restrito')) {
          record.restrito = parseBoolX(val);
        } else if (header === 'tda') {
          record.tda = parseBoolX(val);
        } else if (header.includes('praca_comercial') || header === 'comercial') {
          record.pracaComercial = val;
        } else if (header === 'ativo') {
          record.ativo = val !== 'false' && val !== '0' && val !== 'Não';
        }
      });

      // Validations: requires origin unit and destination city to count as valid CidadeAtendidaSSW record
      if (record.unidadeOrigem && record.cidadeDestino) {
        // Defaults
        if (!record.ufOrigem) record.ufOrigem = 'MG'; // default
        if (!record.cidadeOrigem) record.cidadeOrigem = 'Varginha'; // default or match unit center
        if (!record.ufDestino) record.ufDestino = 'MG';
        if (record.ativo === undefined) record.ativo = true;

        const rawPraca = record.pracaDestinoOriginal || record.pracaDestino || '';
        const normPraca = normalizePracaDestino(rawPraca);
        record.pracaDestinoOriginal = rawPraca;
        record.pracaDestinoNormalizada = normPraca;
        record.pracaHub = record.pracaHub || normPraca;
        record.pracaDestino = rawPraca;

        parsedList.push(record as CidadeAtendidaSSW);
      }
    }

    return parsedList;
  },

  async exportToJson(): Promise<string> {
    const list = await this.getAll();
    return JSON.stringify({
      schemaVersion: 1,
      name: "bd_cidades_atendidas_ssw",
      exportedAt: new Date().toISOString(),
      records: list
    }, null, 2);
  },

  async exportToCsv(): Promise<string> {
    const list = await this.getAll();
    const headers = [
      'Unidade Origem', 'UF Origem', 'Cidade Origem', 'Codigo Ibge Origem',
      'UF Destino', 'Cidade Destino', 'Praca Destino Original', 'Praca Destino Normalizada', 'Praca Hub', 'Codigo Ibge Destino',
      'Distancia Km', 'Tarifa', 'Prazo', 'Frequencia', 'Quant Pedagios',
      'CIF', 'FOB', 'Restrito', 'TDA', 'Praca Comercial', 'Ativo'
    ];

    const csvRows = [headers.join(';')];
    for (const item of list) {
      const values = [
        item.unidadeOrigem || '',
        item.ufOrigem || '',
        item.cidadeOrigem || '',
        item.codigoIbgeOrigem || '',
        item.ufDestino || '',
        item.cidadeDestino || '',
        item.pracaDestinoOriginal || item.pracaDestino || '',
        item.pracaDestinoNormalizada || '',
        item.pracaHub || '',
        item.codigoIbgeDestino || '',
        item.distanciaKm !== undefined ? String(item.distanciaKm).replace('.', ',') : '',
        item.tarifa !== undefined ? String(item.tarifa).replace('.', ',') : '',
        item.prazo !== undefined ? String(item.prazo) : '',
        item.frequencia || '',
        item.quantPedagios !== undefined ? String(item.quantPedagios) : '',
        item.cif ? 'X' : '',
        item.fob ? 'X' : '',
        item.restrito ? 'X' : '',
        item.tda ? 'X' : '',
        item.pracaComercial || '',
        item.ativo !== false ? 'Sim' : 'Não'
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
