import { useState, useEffect } from 'react';
import { Ctrc } from '../types';
import { db } from '../infrastructure/localdb/db';
import { Search, ExternalLink, RefreshCw, FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface CtrcSswViewProps {
  onRefreshCtrcs?: () => void;
}

const SSW_SERIES_BY_UNIT: Record<string, string> = {
  'SPO': 'SPO',
  'VGA': 'BCA',
  'VGS': 'BCA',
  'BHZ': 'BHZ',
  'CWB': 'CWB',
  'TNE': 'TNE',
  'EXT': 'EXT',
  'POU': 'POU',
  'SJE': 'SJE',
  'VCP': 'VCP'
};

const parseSswCtrcCode = (rawId: string): { series: string | null; number: string | null } => {
  const value = String(rawId ?? '').trim().toUpperCase();
  if (!value) return { series: null, number: null };

  const fullMatch = value.match(/^([A-Z]{2,5})[-\s]?(\d+)(?:-\d+)?$/);
  if (fullMatch) {
    return {
      series: fullMatch[1],
      number: fullMatch[2],
    };
  }

  const digitsOnly = value.replace(/\D/g, '');
  return {
    series: null,
    number: digitsOnly || null,
  };
};

const normalizeSswSeriesFromUnit = (rawUnit?: string): string | null => {
  const unit = String(rawUnit ?? '').trim().toUpperCase();
  if (!unit) return null;
  if (SSW_SERIES_BY_UNIT[unit]) {
    return SSW_SERIES_BY_UNIT[unit];
  }
  if (unit.includes('VGA') || unit.includes('VGS')) {
    return 'BCA';
  }
  return null;
};

const formatSswDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
};

const getSswSafeDateRange = (): { dataIni: string; dataFin: string } => {
  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - 23);
  start.setDate(1);
  return {
    dataIni: formatSswDate(start),
    dataFin: formatSswDate(today),
  };
};

const buildSswLink = (ctrc: Pick<Ctrc, 'id' | 'unid'>): string | null => {
  const rawId = String(ctrc.id ?? '').trim();
  const parsed = parseSswCtrcCode(rawId);
  const series = parsed.series || normalizeSswSeriesFromUnit(ctrc.unid);
  const number = parsed.number;

  if (!series || !number) return null;

  const { dataIni, dataFin } = getSswSafeDateRange();
  const params = new URLSearchParams({
    act: 'P1',
    t_ser_ctrc: series,
    t_nro_ctrc: number,
    t_data_ini: dataIni,
    t_data_fin: dataFin,
  });

  return `https://sistema.ssw.inf.br/bin/ssw0053?${params.toString()}`;
};

export default function CtrcSswView({ onRefreshCtrcs }: CtrcSswViewProps) {
  const [ctrcsList, setCtrcsList] = useState<Ctrc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const loadCtrcs = async () => {
    setIsLoading(true);
    try {
      const list = await db.ctrcs.toArray();
      setCtrcsList(list);
    } catch (e) {
      console.error('[CtrcSswView] Error loading CTRCs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCtrcs();
  }, []);

  const handleToggleActive = async (ctrc: Ctrc) => {
    try {
      const currentActive = ctrc.isActiveForRouting !== undefined
        ? ctrc.isActiveForRouting
        : !(ctrc.status === 'Entregue' || ctrc.status === 'Recusado' || ctrc.status === 'Finalizado' || ctrc.status === 'Cancelado');

      const updated = {
        ...ctrc,
        isActiveForRouting: !currentActive
      };

      await db.ctrcs.put(updated);
      await loadCtrcs();
      if (onRefreshCtrcs) {
        onRefreshCtrcs();
      }
    } catch (e) {
      console.error('[CtrcSswView] Error toggling active status:', e);
    }
  };

  const filteredCtrcs = ctrcsList.filter((ctrc) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchId = (ctrc.id || '').toLowerCase().includes(q);
      const matchDest = (ctrc.destinatario || '').toLowerCase().includes(q);
      const matchRem = (ctrc.remetente || '').toLowerCase().includes(q);
      const matchCidade = (ctrc.cidade || '').toLowerCase().includes(q);
      const matchNf = (ctrc.nf || '').toLowerCase().includes(q);
      if (!matchId && !matchDest && !matchRem && !matchCidade && !matchNf) {
        return false;
      }
    }

    if (statusFilter !== 'ALL') {
      if ((ctrc.status || '').toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
    }

    if (unitFilter !== 'ALL') {
      if ((ctrc.unid || '').toUpperCase() !== unitFilter.toUpperCase()) {
        return false;
      }
    }

    return true;
  });

  const uniqueStatuses = Array.from(new Set(ctrcsList.map(c => c.status).filter(Boolean))).sort();
  const uniqueUnits = Array.from(new Set(ctrcsList.map(c => (c.unid || '').toUpperCase()).filter(Boolean))).sort();

  // Quick stats
  const totalCount = ctrcsList.length;
  const pendingCount = ctrcsList.filter(c => c.status === 'Pendente' || c.status === 'Disponível').length;
  const deliveredCount = ctrcsList.filter(c => c.status === 'Entregue' || c.status === 'Finalizado').length;

  return (
    <div className="space-y-6">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">CTRCs & Consulta SSW</h1>
          <p className="text-sm text-[var(--router-text-soft)]">Consulte documentos, valide status de entrega e abra diretamente no portal SSW.</p>
        </div>
        <button
          onClick={loadCtrcs}
          disabled={isLoading}
          className="bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] border border-[var(--router-border)] text-on-surface-variant font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Sincronizar Lista Local
        </button>
      </div>

      {/* Mini Dashboard Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--router-text-muted)] font-medium">Total de Documentos</p>
            <h3 className="text-lg font-bold text-on-surface">{totalCount}</h3>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--router-text-muted)] font-medium">Pendentes / Disponíveis</p>
            <h3 className="text-lg font-bold text-on-surface">{pendingCount}</h3>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--router-text-muted)] font-medium">Entregues / Finalizados</p>
            <h3 className="text-lg font-bold text-on-surface">{deliveredCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-surface-container/60 p-4 border border-outline-variant rounded-xl">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <input
              type="text"
              placeholder="Buscar por CTRC, Destinatário, Remetente, NF ou Cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--router-input-bg)] border-[var(--router-input-border)] text-[var(--router-text)] rounded-xl pl-9 pr-8 py-2 text-xs outline-none focus:border-[var(--router-primary)] focus:ring-1 focus:ring-[var(--router-primary)]/30 transition-all font-sans"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--router-text-muted)]" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-[var(--router-text-muted)] hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--router-input-bg)] border-[var(--router-input-border)] text-on-surface rounded-xl px-3 py-2 text-xs outline-none font-sans"
          >
            <option value="ALL">Todos os Status</option>
            {uniqueStatuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="bg-[var(--router-input-bg)] border-[var(--router-input-border)] text-on-surface rounded-xl px-3 py-2 text-xs outline-none font-sans"
          >
            <option value="ALL">Todas as Filiais</option>
            {uniqueUnits.map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-outline-variant bg-surface-container rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--router-surface-2)]/90 border-b border-outline-variant text-[var(--router-primary)] font-bold text-xs select-none">
                <th className="px-4 py-3.5 font-sans">CTRC</th>
                <th className="px-4 py-3.5 font-sans">NF</th>
                <th className="px-4 py-3.5 font-sans">Filial</th>
                <th className="px-4 py-3.5 font-sans">Remetente</th>
                <th className="px-4 py-3.5 font-sans">Destinatário</th>
                <th className="px-4 py-3.5 font-sans">Cidade</th>
                <th className="px-4 py-3.5 font-sans">Peso (kg)</th>
                <th className="px-4 py-3.5 font-sans text-center">Status</th>
                <th className="px-4 py-3.5 font-sans text-center">Roteirizável</th>
                <th className="px-4 py-3.5 font-sans text-right">Portal SSW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-xs">
              {filteredCtrcs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-[var(--router-text-muted)] font-sans">
                    Nenhum documento encontrado correspondente aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredCtrcs.map((item) => {
                  const sswUrl = buildSswLink(item);
                  const isActive = item.isActiveForRouting !== false;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--router-surface-3)]/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-on-surface text-[13px]">
                        {item.id}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--router-text-soft)]">
                        {item.nf || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.unid || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--router-text-soft)] truncate max-w-[150px]" title={item.remetente}>
                        {item.remetente || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-on-surface font-medium truncate max-w-[180px]" title={item.destinatario}>
                        {item.destinatario || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--router-text-soft)]">
                        {item.cidade || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[var(--router-text-soft)]">
                        {item.weight?.toLocaleString('pt-BR') || '0'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Entregue' || item.status === 'Finalizado'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : item.status === 'Recusado' || item.status === 'Cancelado'
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          {item.status || 'Disponível'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold select-none cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                            isActive
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                              : 'bg-outline-variant/20 border border-outline-variant/30 text-[var(--router-text-muted)]'
                          }`}
                          title={isActive ? "Clique para inativar (ocultar da Roteirização)" : "Clique para ativar (exibir na Roteirização)"}
                        >
                          {isActive ? '✓ SIM' : '✕ NÃO'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans">
                        {sswUrl ? (
                          <a
                            href={sswUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-primary text-on-primary hover:bg-primary-fixed hover:text-primary font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                            title="Consultar CTRC no SSW corporativo"
                          >
                            <span>SSW</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-[var(--router-text-muted)]" title="Formato inválido para SSW">
                            Sem link
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-[var(--router-surface)] border-t border-outline-variant/45 flex items-center justify-between text-[11px] text-[var(--router-text-muted)] select-none">
          <span>Mostrando {filteredCtrcs.length} de {ctrcsList.length} registros</span>
          <span className="font-mono text-[var(--router-text-muted)]">Consulta Operacional de CTRC (SSW Integração)</span>
        </div>
      </div>
    </div>
  );
}
