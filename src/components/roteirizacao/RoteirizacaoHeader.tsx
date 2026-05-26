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
}: RoteirizacaoHeaderProps) {
  // Padronized operational tactical focuses
  const tacticalOptions = [
    { id: 'all', label: 'TODOS', icon: '🟢' },
    { id: 'delayed', label: 'SLA ESTOURADO', color: 'text-red-400' },
    { id: 'curva', label: '★ CURVA A', color: 'text-purple-300' },
    { id: 'heavy', label: 'PESO CRÍTICO', color: 'text-amber-400' },
    { id: 'priority', label: 'ALTA PRIORIDADE', color: 'text-orange-400' },
    { id: 'retained', label: 'RETIDOS', color: 'text-rose-500' },
    { id: 'missingbox', label: 'AGUARDANDO BOX', color: 'text-indigo-400' }
  ];

  return (
    <div className="bg-[#0b1322] border-b border-[#1a2440] p-3 flex flex-col gap-3 shrink-0">
      {/* Prime Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Unit and Active Terminal Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="leading-none">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">TMS Control Tower</p>
              <h1 className="text-sm font-black text-slate-100 tracking-tight">ROTEIRIZAÇÃO TÁTICA</h1>
            </div>
          </div>

          {/* Unit selection */}
          <div className="flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2.5 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 font-mono">FILIAL:</span>
            {adminUser.is_master ? (
              <select
                id="header-unit-selector"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent text-slate-100 font-mono font-black text-[11px] focus:outline-none cursor-pointer focus:ring-0 select-none border-none p-0 outline-none"
              >
                <option value="TODAS" className="bg-[#0b1322]">TODAS</option>
                <option value="SPO" className="bg-[#0b1322]">SPO (SÃO PAULO)</option>
                <option value="VGA" className="bg-[#0b1322]">VGA (VARGINHA)</option>
                <option value="BHS" className="bg-[#0b1322]">BHS (BELO HORIZONTE)</option>
              </select>
            ) : (
              <span className="text-slate-450 font-mono font-bold text-[11px] flex items-center gap-1 select-none">
                🔒 {(adminUser.unid || 'SPO').toUpperCase()}
              </span>
            )}
          </div>

          {/* Sector Selector */}
          <div className="flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2.5 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 font-mono">SETOR:</span>
            <select
              id="header-sector-selector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-slate-100 font-sans font-black text-[11px] focus:outline-none cursor-pointer focus:ring-0 select-none border-none p-0 outline-none"
            >
              <option value="all" className="bg-[#0b1322]">TODOS OS SETORES</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec} className="bg-[#0b1322]">{sec.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Situation Physical Location Filter */}
          <div className="flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2.5 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 font-mono">OCUPAÇÃO:</span>
            <select
              id="header-location-filter"
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="bg-transparent text-slate-100 font-sans font-black text-[11px] focus:outline-none cursor-pointer focus:ring-0 select-none border-none p-0 outline-none"
            >
              <option value="all" className="bg-[#0b1322]">TODAS</option>
              <option value="na_base" className="bg-[#0b1322]">NA MINHA BASE</option>
              <option value="outra_base" className="bg-[#0b1322]">EM OUTRA BASE</option>
              <option value="rota" className="bg-[#0b1322]">EM ROTA / TRANSFERÊNCIA</option>
              <option value="sem_loc" className="bg-[#0b1322]">SEM LOCALIZAÇÃO</option>
              <option value="box" className="bg-[#0b1322]">AGUARDANDO BOX</option>
            </select>
          </div>
        </div>

        {/* Global search */}
        <div className="flex-grow max-w-xs relative md:ml-2">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold font-mono">🔍</span>
          <input
            id="header-universal-search"
            type="text"
            placeholder="Universal: CTRC, NF, Rem, Dest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070c14] border border-[#1a2440] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-505 transition-all uppercase"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {onOpenFleetDrawer && (
            <button
              onClick={onOpenFleetDrawer}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 text-xs px-2.5 py-1.5 rounded font-black tracking-wide transition-all flex items-center gap-1.5 cursor-pointer select-none"
            >
              <span>🚚 GERENCIAR FROTA</span>
              {draftCount > 0 && (
                <span className="bg-amber-500 text-[#080c14] font-black px-1.5 py-0.2 rounded-full text-[9px] min-w-[15px] text-center">
                  {draftCount}
                </span>
              )}
            </button>
          )}

          <button
            id="btn-clear-filters-header"
            onClick={onClearFilters}
            className="bg-[#1a2440] hover:bg-[#253359] text-gray-200 text-xs px-2.5 py-1.5 rounded font-semibold transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            Limpar Filtros
          </button>
          <div className="bg-[#070c14] border border-[#1a2440] rounded px-2.5 py-1.5 text-[11px] font-mono text-indigo-300">
            {currentTime} <span className="text-slate-500">UTC</span>
          </div>
        </div>
      </div>

      {/* Modern Compact Chips Selectors (SLA/Tactical Filters) - Padronized Buttons */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 border-t border-[#16223f]/60 pt-2 shrink-0">
        <span className="text-[10px] text-slate-400 font-bold font-mono tracking-widest uppercase shrink-0">Foco Rápido:</span>
        
        <div className="flex items-center gap-2 select-none overflow-x-auto no-scrollbar">
          {tacticalOptions.map((opt) => {
            const isActive = activeTacticalFilter === opt.id;
            return (
              <button
                key={opt.id}
                id={`tactical-chip-${opt.id}`}
                onClick={() => setActiveTacticalFilter(opt.id)}
                className={`px-3 h-8 rounded-md text-[11px] font-bold tracking-wide transition-all uppercase duration-150 border cursor-pointer flex items-center justify-center gap-1.5 font-sans leading-none shrink-0 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-[0_2px_8px_rgba(99,102,241,0.15)] font-black'
                    : 'bg-[#070c14] hover:bg-[#1a2440] text-slate-400 hover:text-slate-200 border-[#16223f]'
                }`}
              >
                <span className={opt.color || 'text-indigo-400'}>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto text-[10.5px] text-slate-400 font-mono bg-[#070c14] px-2 py-1 rounded border border-[#16223f] shrink-0">
          Fila: <span className="text-white font-bold">{filteredCtrcsCount}</span> / {totalCtrcsCount} CTRCs
        </div>
      </div>
    </div>
  );
}
