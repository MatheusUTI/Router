import React from 'react';
import { AppUser } from '../../types';

interface RoteirizacaoHeaderProps {
  adminUser: AppUser;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  selectedLocationFilter: string;
  setSelectedLocationFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTacticalFilter: string;
  setActiveTacticalFilter: (filter: string) => void;
  uniqueSectors: string[];
  totalCtrcsCount: number;
  filteredCtrcsCount: number;
  onClearFilters: () => void;
  currentTime?: string;
  onOpenFleetDrawer?: () => void;
  draftCount?: number;
  planningDate?: string;
}

export default function RoteirizacaoHeader({
  adminUser,
  selectedUnit,
  setSelectedUnit,
  selectedSector,
  setSelectedSector,
  selectedLocationFilter,
  setSelectedLocationFilter,
  searchQuery,
  setSearchQuery,
  activeTacticalFilter,
  setActiveTacticalFilter,
  uniqueSectors,
  totalCtrcsCount,
  filteredCtrcsCount,
  onClearFilters,
  currentTime = '15:50',
  onOpenFleetDrawer,
  draftCount = 0,
  planningDate,
}: RoteirizacaoHeaderProps) {
  // Padronized operational tactical focuses based 1-to-1 on SPEC page 3
  const tacticalOptions = [
    { id: 'all', label: 'TODOS', color: 'text-slate-400 font-bold' },
    { id: 'urgent', label: '🚨 P0 / URGENTE', color: 'text-red-400 font-extrabold' },
    { id: 'priority', label: '✨ P1 / PRIORIDADE', color: 'text-amber-400 font-extrabold' },
    { id: 'hold', label: '⏸️ SEGURAR', color: 'text-orange-400 font-bold' },
    { id: 'delayed_today', label: '🚫 NÃO SAI', color: 'text-rose-500 font-bold' },
    { id: 'scheduled', label: '📅 AGENDADOS', color: 'text-teal-400 font-bold' },
    { id: 'retained', label: '🔒 RETIDOS', color: 'text-rose-455 font-bold' },
    { id: 'no_location', label: '📍 SEM LOC', color: 'text-sky-300 font-bold' },
    { id: 'curva_a', label: '⭐ CURVA A', color: 'text-purple-300 font-semibold' },
    { id: 'fob', label: '💰 FOB', color: 'text-yellow-505 font-semibold' }
  ];

  const formattedPlanningDate = planningDate 
    ? new Date(planningDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="bg-[#0b1322] border-b border-[#1a2440] py-1.5 px-3 flex flex-col gap-1.5 shrink-0">
      {/* Prime Header Bar in one compact line */}
      <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2">
        {/* Left indicators and selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status signal + Title */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38bdf8] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0ea5e9]"></span>
            </span>
            <div className="flex flex-col">
              <h1 className="text-xs font-black text-slate-100 tracking-tight uppercase leading-none">Mesa de Roteirização</h1>
              <span className="text-[8.5px] font-mono text-indigo-400 font-black tracking-widest leading-none mt-0.5">PLAN: {formattedPlanningDate}</span>
            </div>
          </div>

          {/* Unit selection */}
          <div className="flex items-center gap-1 bg-[#070c14] border border-[#1a2440] rounded px-1.5 py-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">FILIAL:</span>
            {adminUser.is_master ? (
              <select
                id="header-unit-selector"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent text-slate-100 font-mono font-black text-[10px] focus:outline-none cursor-pointer border-none p-0 outline-none leading-none"
              >
                <option value="TODAS" className="bg-[#0b1322]">TODAS</option>
                <option value="SPO" className="bg-[#0b1322]">SPO</option>
                <option value="VGA" className="bg-[#0b1322]">VGA</option>
                <option value="BHS" className="bg-[#0b1322]">BHS</option>
              </select>
            ) : (
              <span className="text-slate-400 font-mono font-bold text-[10px] flex items-center gap-0.5 select-none leading-none">
                🔒 {(adminUser.unid || 'SPO').toUpperCase()}
              </span>
            )}
          </div>

          {/* Sector Selector */}
          <div className="flex items-center gap-1 bg-[#070c14] border border-[#1a2440] rounded px-1.5 py-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">SETOR:</span>
            <select
              id="header-sector-selector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-slate-100 font-sans font-black text-[10px] focus:outline-none cursor-pointer border-none p-0 outline-none leading-none"
            >
              <option value="all" className="bg-[#0b1322]">TODOS</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec} className="bg-[#0b1322]">{sec.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Situation Physical Location Filter */}
          <div className="flex items-center gap-1 bg-[#070c14] border border-[#1a2440] rounded px-1.5 py-0.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">OCUPAÇÃO:</span>
            <select
              id="header-location-filter"
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="bg-transparent text-slate-100 font-sans font-black text-[10px] focus:outline-none cursor-pointer border-none p-0 outline-none leading-none"
            >
              <option value="all" className="bg-[#0b1322]">TODAS</option>
              <option value="na_base" className="bg-[#0b1322]">NA BASE</option>
              <option value="outra_base" className="bg-[#0b1322]">OUTRA BASE</option>
              <option value="rota" className="bg-[#0b1322]">EM ROTA / TRANSF.</option>
              <option value="sem_loc" className="bg-[#0b1322]">SEM LOCALIZAÇÃO</option>
              <option value="box" className="bg-[#0b1322]">AGUARDANDO BOX</option>
            </select>
          </div>
        </div>

        {/* Search, Action controls, and Clock */}
        <div className="flex items-center gap-2">
          {/* Universal Search Input */}
          <div className="relative w-44 md:w-56">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono select-none">🔍</span>
            <input
              id="header-universal-search"
              type="text"
              placeholder="Buscar CTRC, NF, rem, dest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070c14] border border-[#1a2440] rounded-md pl-5 pr-1.5 py-0.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all uppercase"
            />
          </div>

          {onOpenFleetDrawer && (
            <button
              onClick={onOpenFleetDrawer}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 text-[10px] px-2 py-0.5 rounded font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer select-none"
            >
              <span>🚚 FROTA</span>
              {draftCount > 0 && (
                <span className="bg-amber-500 text-[#080c14] font-black px-1 rounded-full text-[8.5px] min-w-[12px] text-center">
                  {draftCount}
                </span>
              )}
            </button>
          )}

          <button
            id="btn-clear-filters-header"
            onClick={onClearFilters}
            className="bg-[#1a2440] hover:bg-[#253359] text-gray-200 text-[10px] px-2 py-0.5 rounded font-semibold transition-all cursor-pointer select-none"
          >
            Limpar
          </button>

          <div className="bg-[#070c14] border border-[#1a2440] rounded px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 shrink-0 leading-none">
            {currentTime} <span className="text-slate-500 text-[8.5px]">UTC</span>
          </div>
        </div>
      </div>

      {/* Modern Compact Chips Area ("Foco Rápido") */}
      <div className="flex items-center gap-2 py-0.5 border-t border-[#16223f]/40 pt-1 shrink-0">
        <span className="text-[9px] text-slate-400 font-bold font-mono tracking-wider uppercase shrink-0">Foco Rápido:</span>
        
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.2 shrink-0">
          {tacticalOptions.map((opt) => {
            const isActive = activeTacticalFilter === opt.id;
            return (
              <button
                key={opt.id}
                id={`tactical-chip-${opt.id}`}
                onClick={() => setActiveTacticalFilter(opt.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all uppercase border cursor-pointer flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-black shadow-sm'
                    : 'bg-[#070c14] hover:bg-[#1a2440] text-slate-400 hover:text-slate-200 border-[#16223f]/50'
                }`}
              >
                <span className={opt.color || 'text-indigo-400'}>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto text-[10px] text-slate-400 font-mono bg-[#070c14] px-2 py-0.5 rounded border border-[#16223f]/40 shrink-0">
          Fila: <span className="text-white font-bold">{filteredCtrcsCount}</span> / {totalCtrcsCount}
        </div>
      </div>
    </div>
  );
}
