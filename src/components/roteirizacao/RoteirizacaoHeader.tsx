import React from 'react';
import { AppUser, RoteirizacaoDiagnostics } from '../../types';
import { DEFAULT_OPERATIONAL_UNIT, getOperationalUnits } from '../../constants/operationalUnits';

interface RoteirizacaoHeaderProps {
  adminUser: AppUser;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalCtrcsCount: number;
  filteredCtrcsCount: number;
  onClearFilters: () => void;
  currentTime?: string;
  onOpenFleetDrawer?: () => void;
  draftCount?: number;
  planningDate?: string;
  onOpenDiagnostics?: () => void;
  diagnostics?: RoteirizacaoDiagnostics;
  isAvisosOpen?: boolean;
  setIsAvisosOpen?: (open: boolean) => void;
  noticesCount?: number;
  highestNoticeSeverity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export default function RoteirizacaoHeader({
  adminUser,
  selectedUnit,
  setSelectedUnit,
  searchQuery,
  setSearchQuery,
  totalCtrcsCount,
  filteredCtrcsCount,
  onClearFilters,
  currentTime = '12:00',
  onOpenFleetDrawer,
  draftCount = 0,
  planningDate,
  onOpenDiagnostics,
  diagnostics,
  isAvisosOpen = true,
  setIsAvisosOpen,
  noticesCount = 0,
  highestNoticeSeverity = 'INFO',
}: RoteirizacaoHeaderProps) {
  const formattedPlanningDate = planningDate 
    ? new Date(planningDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const hasVisibilityAlert = !!(diagnostics && diagnostics.totalAfterEnrichment > 0 && (diagnostics.totalFinalVisible === 0 || (diagnostics.totalFinalVisible / diagnostics.totalAfterEnrichment) < 0.05));
  const warningsCount = diagnostics?.warnings?.length ?? 0;

  // Compact tokens suited for sleek visual rhythm and spacing
  const containerClass = "bg-[#0b1322] border-b border-[#1a2440] py-1.5 px-3 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 shrink-0 select-none h-auto md:h-12";
  
  const titleClass = "font-black text-slate-100 tracking-tight text-xs md:text-sm uppercase leading-none truncate";
  const subtitleClass = "font-mono text-indigo-405 font-bold tracking-wider text-[9px] leading-none mt-0.5 flex items-center gap-1.5 flex-wrap";

  const btnClass = "bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-500/20 rounded font-bold text-[11px] px-2.5 py-1.5 h-8.5 transition-all flex items-center gap-1 cursor-pointer select-none leading-none";
  const btnSecondaryClass = "bg-[#1a2440] hover:bg-[#253359] text-gray-200 border border-[#2d3a5e] rounded font-bold text-[11px] px-2.5 py-1.5 h-8.5 transition-all cursor-pointer select-none leading-none";
  const badgeClass = "bg-[#070c14] border border-[#1a2440] rounded font-mono text-indigo-300 text-[11px] px-2 py-1.5 h-8.5 flex items-center leading-none shrink-0";

  const searchInputClass = "w-full bg-[#070c14] border border-[#1a2440] rounded-md pl-6 pr-2 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-[11px] h-8.5 transition-all uppercase";
  const searchWrapClass = "relative w-40 md:w-48 h-8.5 shrink-0";

  const rightStatusClass = "font-mono bg-[#070c14] rounded border border-[#16223f] px-2 py-1 h-8.5 flex items-center text-[11px] text-slate-450 leading-none shrink-0";

  return (
    <div className={containerClass}>
      {/* Brand Title and Date */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38bdf8] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0ea5e9]"></span>
        </span>
        <div className="flex flex-col min-w-0">
          <h1 className={titleClass}>Mesa de Roteirização</h1>
          <div className={subtitleClass}>
            <span>Plano: {formattedPlanningDate}</span>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Filial:</span>
              {adminUser.is_master ? (
                <select
                  id="header-unit-selector"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="bg-[#070c14] border border-[#1d2a45] rounded px-1.5 py-0.5 text-white font-mono font-bold focus:outline-none cursor-pointer text-[10px] h-5 leading-none transition-all hover:bg-slate-900 border-none select-none"
                >
                  <option value="TODAS" className="bg-[#0b1322]">TODAS</option>
                  {getOperationalUnits().filter(u => u.active).map(u => (
                    <option key={u.code} value={u.code} className="bg-[#0b1322]">{u.code}</option>
                  ))}
                </select>
              ) : (
                <span className="text-white font-mono font-extrabold text-[10px] leading-none flex items-center gap-0.5 bg-slate-900/40 px-1 py-0.5 rounded border border-slate-700/20" title="Unidade restrita">
                  🔒 {(adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions, Search, Clock, Counters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Unified Search Input (busca) */}
        <div className={searchWrapClass}>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] font-mono select-none">🔍</span>
          <input
            id="header-universal-search"
            type="text"
            placeholder="Buscar CTRC, NF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={searchInputClass}
          />
        </div>

        {/* Consolidar button */}
        {onOpenFleetDrawer && (
          <button
            onClick={onOpenFleetDrawer}
            className={btnClass}
          >
            <span>🚚 Consolidar</span>
            {draftCount > 0 && (
              <span className="bg-amber-400 text-[#080c14] font-bold px-1 rounded-full text-[10px] min-w-[12px] text-center">
                {draftCount}
              </span>
            )}
          </button>
        )}

        {/* Diagnóstico button */}
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className={`rounded font-extrabold text-[11px] px-2.5 py-1.5 h-8.5 transition-all cursor-pointer select-none leading-none flex items-center gap-1.5 shrink-0 border shadow-sm ${
              hasVisibilityAlert
                ? 'bg-amber-600 hover:bg-amber-550 border-amber-500 text-white animate-pulse'
                : warningsCount > 0
                ? 'bg-amber-950/40 hover:bg-amber-905/45 border-amber-800/40 text-amber-305'
                : 'bg-slate-800/80 hover:bg-slate-705/85 border-slate-700/40 text-indigo-400 hover:text-indigo-305'
            }`}
            title="Diagnóstico de Visibilidade da Mesa"
          >
            {hasVisibilityAlert ? (
              <>
                <span>⚠️ Oculto</span>
                {warningsCount > 0 && (
                  <span className="bg-amber-950/60 text-amber-205 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-700/30">
                    {warningsCount}
                  </span>
                )}
              </>
            ) : warningsCount > 0 ? (
              <>
                <span>⚠️ Diagnóstico</span>
                <span className="bg-amber-900/50 text-amber-205 text-[10px] font-black px-1 py-0.5 rounded-full border border-amber-700/30">
                  {warningsCount}
                </span>
              </>
            ) : (
              <>
                <span>📊 Diagnóstico</span>
              </>
            )}
          </button>
        )}

        {/* Compact reopen notices badge (Avisos Operacionais) */}
        {!isAvisosOpen && noticesCount > 0 && (
          <button
            type="button"
            onClick={() => setIsAvisosOpen?.(true)}
            className={`rounded font-extrabold text-[11px] px-2.5 py-1.5 h-8.5 transition-all cursor-pointer select-none leading-none flex items-center gap-1.5 shrink-0 border shadow-sm ${
              highestNoticeSeverity === 'CRITICAL'
                ? 'bg-red-950/50 hover:bg-red-900/65 border-red-700/60 text-red-350 animate-pulse'
                : highestNoticeSeverity === 'WARNING'
                ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-700/50 text-amber-350'
                : 'bg-blue-950/40 hover:bg-blue-900/50 border-blue-900/55 text-blue-350'
            }`}
            title="Reabrir Avisos Operacionais"
            id="reopen-notices-badge"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                highestNoticeSeverity === 'CRITICAL' ? 'bg-red-400' : highestNoticeSeverity === 'WARNING' ? 'bg-amber-400' : 'bg-blue-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                highestNoticeSeverity === 'CRITICAL' ? 'bg-red-500' : highestNoticeSeverity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
              }`}></span>
            </span>
            <span>⚠️ Avisos ({noticesCount})</span>
          </button>
        )}

        {/* Limpar button */}
        <button
          id="btn-clear-filters-header"
          onClick={onClearFilters}
          className={btnSecondaryClass}
        >
          Limpar
        </button>

        {/* Fila count display (fila) */}
        <div className={rightStatusClass}>
          Fila: <span className="text-white font-extrabold ml-1 uppercase">{filteredCtrcsCount} / {totalCtrcsCount}</span>
        </div>

        {/* Current clock (relógio) */}
        <div className={badgeClass}>
          {currentTime} <span className="text-slate-500 text-[9px] ml-1">UTC</span>
        </div>
      </div>
    </div>
  );
}
