import React from 'react';
import { AppUser, RoteirizacaoDiagnostics, DensityMode } from '../../types';
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
  densityMode?: DensityMode;
  onUpdateDensity?: (density: DensityMode) => void;
  mesaScale?: '85%' | '90%' | '100%' | '110%' | '120%';
  onUpdateMesaScale?: (scale: '85%' | '90%' | '100%' | '110%' | '120%') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
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
  densityMode = 'default',
  onUpdateDensity,
  mesaScale = '100%',
  onUpdateMesaScale,
  theme = 'dark',
  onToggleTheme,
}: RoteirizacaoHeaderProps) {
  const formattedPlanningDate = planningDate 
    ? new Date(planningDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const hasVisibilityAlert = !!(diagnostics && diagnostics.totalAfterEnrichment > 0 && (diagnostics.totalFinalVisible === 0 || (diagnostics.totalFinalVisible / diagnostics.totalAfterEnrichment) < 0.05));
  const warningsCount = diagnostics?.warnings?.length ?? 0;

  const titleClass = "font-black text-[#2563EB] dark:text-slate-100 tracking-tight text-xs md:text-sm uppercase leading-none truncate";
  const subtitleClass = "font-sans text-indigo-600 dark:text-indigo-400 font-bold tracking-wider text-[9px] leading-none mt-0.5 flex items-center gap-1.5 flex-wrap";

  const btnClass = "bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-500/20 rounded font-bold text-[11px] px-2 py-1 h-8 transition-all flex items-center gap-1 cursor-pointer select-none leading-none shrink-0";
  const btnSecondaryClass = "bg-slate-100 dark:bg-[#1a2440] hover:bg-slate-200 dark:hover:bg-[#253359] text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-[#2d3a5e] rounded font-bold text-[11px] px-2 py-1 h-8 transition-all cursor-pointer select-none leading-none flex items-center justify-center gap-1 shrink-0";
  const badgeClass = "bg-slate-50 dark:bg-[#070c14] border border-slate-200 dark:border-[#1a2440] rounded font-mono text-indigo-600 dark:text-indigo-300 text-[11px] px-1.5 py-1 h-8 items-center leading-none shrink-0 hidden 2xl:flex";

  const searchInputClass = "w-full bg-slate-50 dark:bg-[#070c14] border border-slate-200 dark:border-[#1a2440] rounded-md pl-6 pr-2 py-1 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-[11px] h-8 transition-all uppercase";
  const rightStatusClass = "font-sans bg-slate-50 dark:bg-[#070c14] rounded border border-slate-200 dark:border-[#16223f] px-1.5 py-1 h-8 flex items-center text-[10px] text-slate-550 dark:text-slate-450 leading-none shrink-0";

  return (
    <div className="bg-white dark:bg-[#0b1322] border-b border-slate-200 dark:border-[#1a2440] py-1.5 px-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 shrink-0 select-none min-h-[44px]">
      
      {/* 1. Brand, Plan, Filial */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="relative flex h-2 w-2 shrink-0 hidden sm:flex">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38bdf8] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0ea5e9]"></span>
        </span>
        <div className="flex flex-col min-w-0">
          <h1 className={titleClass}>Mesa de Roteirização</h1>
          <div className={subtitleClass}>
            <span>Plano: {formattedPlanningDate}</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 hidden sm:flex">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Filial:</span>
              {adminUser.is_master ? (
                <select
                  id="header-unit-selector"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="bg-slate-50 dark:bg-[#070c14] border border-slate-200 dark:border-[#1d2a45] rounded px-1 py-0.5 text-slate-800 dark:text-white font-mono font-bold focus:outline-none cursor-pointer text-[9px] h-4 leading-none transition-all hover:bg-slate-150 dark:hover:bg-slate-900 border-none select-none"
                >
                  <option value="TODAS" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">TODAS</option>
                  {getOperationalUnits().filter(u => u.active).map(u => (
                    <option key={u.code} value={u.code} className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">{u.code}</option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-800 dark:text-white font-mono font-extrabold text-[9px] leading-none flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900/40 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700/20" title="Unidade restrita">
                  🔒 {(adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Busca */}
      <div className="relative flex-1 min-w-[150px] max-w-[280px] h-8 shrink-1 w-full xl:w-auto order-3 xl:order-2">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] font-mono select-none">🔍</span>
        <input
          id="header-universal-search"
          type="text"
          placeholder="Buscar CTRC, NF..."
          title="Buscar CTRC, NF, destinatário ou remetente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={searchInputClass}
        />
      </div>

      {/* 3. Controls (Buttons & Selects) */}
      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto xl:overflow-visible pb-1 xl:pb-0 hide-scrollbar w-full xl:w-auto order-2 xl:order-3">
        
        {/* Consolidar */}
        {onOpenFleetDrawer && (
          <button onClick={onOpenFleetDrawer} className={btnClass} title="Consolidar Cargas">
            <span>🚚</span>
            <span className="hidden lg:inline">Consolidar</span>
            {draftCount > 0 && (
              <span className="bg-amber-400 text-[#080c14] font-bold px-1 rounded-full text-[9px] min-w-[12px] text-center ml-0.5">
                {draftCount}
              </span>
            )}
          </button>
        )}

        {/* Diagnóstico */}
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className={`rounded font-extrabold text-[11px] px-2 py-1 h-8 transition-all cursor-pointer select-none leading-none flex items-center gap-1 shrink-0 border shadow-sm ${
              hasVisibilityAlert
                ? 'bg-amber-600 hover:bg-amber-550 border-amber-500 text-white animate-pulse'
                : warningsCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-905/45 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-305'
                : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-705/85 border-slate-200 dark:border-slate-700/40 text-indigo-650 dark:text-indigo-400'
            }`}
            title="Diagnóstico de Visibilidade da Mesa"
          >
            {hasVisibilityAlert ? (
              <>
                <span>⚠️</span>
                <span className="hidden lg:inline">Oculto</span>
                {warningsCount > 0 && (
                  <span className="bg-amber-950/60 text-amber-205 text-[9px] font-black px-1 py-0.5 rounded-full border border-amber-700/30">
                    {warningsCount}
                  </span>
                )}
              </>
            ) : warningsCount > 0 ? (
              <>
                <span>⚠️</span>
                <span className="hidden lg:inline">Diag.</span>
                <span className="bg-amber-900/50 text-amber-205 text-[9px] font-black px-1 py-0.5 rounded-full border border-amber-700/30">
                  {warningsCount}
                </span>
              </>
            ) : (
              <>
                <span>📊</span>
                <span className="hidden lg:inline">Diag.</span>
              </>
            )}
          </button>
        )}

        {/* Avisos Operacionais */}
        {!isAvisosOpen && noticesCount > 0 && (
          <button
            type="button"
            onClick={() => setIsAvisosOpen?.(true)}
            className={`rounded font-extrabold text-[11px] px-2 py-1 h-8 transition-all cursor-pointer select-none leading-none flex items-center gap-1 shrink-0 border shadow-sm ${
              highestNoticeSeverity === 'CRITICAL'
                ? 'bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/65 border-red-200 dark:border-red-700/60 text-red-700 dark:text-red-350 animate-pulse'
                : highestNoticeSeverity === 'WARNING'
                ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-350'
                : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-900/55 text-blue-700 dark:text-blue-350'
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
            <span className="hidden lg:inline">Avisos</span>
            <span>({noticesCount})</span>
          </button>
        )}

        {/* Layout/Escala Group */}
        {(onUpdateDensity || onUpdateMesaScale) && (
          <div className="flex items-center bg-slate-50 dark:bg-[#070c14] border border-slate-200 dark:border-[#1a2440] rounded h-8 text-[10px] select-none text-slate-500 dark:text-slate-400 shrink-0 overflow-hidden">
            {onUpdateDensity && (
              <div className="flex items-center px-1.5 border-r border-slate-200 dark:border-[#1a2440]">
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 hidden lg:inline" title="Layout da Mesa">Layout:</span>
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 lg:hidden" title="Layout da Mesa">L:</span>
                <select
                  value={densityMode}
                  onChange={(e) => onUpdateDensity(e.target.value as DensityMode)}
                  className="bg-transparent border-none text-slate-800 dark:text-white font-black uppercase text-[10px] tracking-wider cursor-pointer focus:outline-none select-none h-full py-1"
                  title="Layout da Mesa"
                >
                  <option value="default" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">PAD</option>
                  <option value="compact" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">COMP</option>
                  <option value="planilha_operacional" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">PLAN</option>
                </select>
              </div>
            )}
            {onUpdateMesaScale && (
              <div className="flex items-center px-1.5">
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 hidden lg:inline" title="Escala da Mesa">Escala:</span>
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 lg:hidden" title="Escala da Mesa">E:</span>
                <select
                  value={mesaScale}
                  onChange={(e) => onUpdateMesaScale(e.target.value as any)}
                  className="bg-transparent border-none text-slate-800 dark:text-white font-black uppercase text-[10px] tracking-wider cursor-pointer focus:outline-none select-none h-full py-1"
                  title="Escala da Mesa"
                >
                  <option value="85%" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">85%</option>
                  <option value="90%" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">90%</option>
                  <option value="100%" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">100%</option>
                  <option value="110%" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">110%</option>
                  <option value="120%" className="bg-white dark:bg-[#0b1322] text-slate-800 dark:text-white">120%</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Limpar button */}
        <button
          id="btn-clear-filters-header"
          onClick={onClearFilters}
          className={btnSecondaryClass}
          title="Limpar filtros"
        >
          <span className="hidden lg:inline">Limpar</span>
          <span className="lg:hidden material-symbols-outlined text-[14px]">filter_alt_off</span>
        </button>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            id="btn-toggle-theme-mesa"
            onClick={onToggleTheme}
            className={btnSecondaryClass}
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            <span className="material-symbols-outlined text-[14px] select-none">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        )}

        {/* Fila */}
        <div className={rightStatusClass} title={`Fila: ${filteredCtrcsCount} / ${totalCtrcsCount}`}>
          <span className="hidden lg:inline mr-1 font-bold">Fila:</span>
          <span className="text-slate-800 dark:text-white font-black uppercase">{filteredCtrcsCount}/{totalCtrcsCount}</span>
        </div>

        {/* Relógio - Oculto em resoluções < 2xl para economizar espaço */}
        <div className={badgeClass} title="Horário Atual (UTC)">
          {currentTime} <span className="text-slate-500 text-[9px] ml-1">UTC</span>
        </div>
      </div>

    </div>
  );
}
