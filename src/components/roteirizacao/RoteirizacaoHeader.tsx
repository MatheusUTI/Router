import React from 'react';
import { AppUser } from '../../types';

interface RoteirizacaoHeaderProps {
  adminUser: AppUser;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTacticalFilter: string;
  setActiveTacticalFilter: (filter: string) => void;
  uniqueSectors: string[];
  totalCtrcsCount: number;
  filteredCtrcsCount: number;
  onClearFilters: () => void;
  currentTime?: string;
}

export default function RoteirizacaoHeader({
  adminUser,
  selectedUnit,
  setSelectedUnit,
  selectedSector,
  setSelectedSector,
  searchQuery,
  setSearchQuery,
  activeTacticalFilter,
  setActiveTacticalFilter,
  uniqueSectors,
  totalCtrcsCount,
  filteredCtrcsCount,
  onClearFilters,
  currentTime = '15:50'
}: RoteirizacaoHeaderProps) {
  // Mini stats for quick overview
  const tacticalOptions = [
    { id: 'all', label: 'TODOS', icon: 'list_alt' },
    { id: 'delayed', label: 'SLA ESTOURADO', icon: 'error', color: 'text-rose-400' },
    { id: 'curva', label: '★ CURVA A', icon: 'stars', color: 'text-amber-300' },
    { id: 'heavy', label: 'PESO CRÍTICO (+1T)', icon: 'scale', color: 'text-purple-300' },
    { id: 'priority', label: 'ALTA PRIORIDADE', icon: 'bolt', color: 'text-red-400' },
    { id: 'retained', label: 'RETIDOS', icon: 'assignment_late', color: 'text-orange-400' },
    { id: 'missingbox', label: 'AGUARDANDO BOX', icon: 'shelves', color: 'text-pink-300' }
  ];

  return (
    <div className="bg-[#0b1322] border-b border-[#1a2440] p-3 flex flex-col gap-3 shrink-0">
      {/* Prime Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Unit and Active Terminal Status */}
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 font-mono">FILIAL:</span>
            {adminUser.is_master ? (
              <select
                id="header-unit-selector"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent text-slate-100 font-mono font-black text-[11px] focus:outline-none cursor-pointer focus:ring-0 select-none border-none p-0"
              >
                <option value="TODAS" className="bg-[#0b1322]">TODAS</option>
                <option value="SPO" className="bg-[#0b1322]">SPO (SÃO PAULO)</option>
                <option value="VGA" className="bg-[#0b1322]">VGA (VARGINHA)</option>
                <option value="BHS" className="bg-[#0b1322]">BHS (BELO HORIZONTE)</option>
              </select>
            ) : (
              <span className="text-slate-100 font-mono font-black text-[11px]">{(adminUser.unid || 'SPO').toUpperCase()}</span>
            )}
          </div>

          {/* Sector Selector */}
          <div className="flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2 py-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 font-mono">SETOR:</span>
            <select
              id="header-sector-selector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-slate-100 font-sans font-black text-[11px] focus:outline-none cursor-pointer focus:ring-0 select-none border-none p-0"
            >
              <option value="all" className="bg-[#0b1322]">TODOS OS SETORES</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec} className="bg-[#0b1322]">{sec.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global search */}
        <div className="flex-1 max-w-xs relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold font-mono">🔍</span>
          <input
            id="header-universal-search"
            type="text"
            placeholder="Buscar CTRC, Remetente, Cidade, NF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070c14] border border-[#1a2440] rounded-lg pl-7 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all uppercase"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            id="btn-clear-filters-header"
            onClick={onClearFilters}
            className="bg-[#1a2440] hover:bg-[#253359] text-gray-200 text-xs px-2.5 py-1 rounded font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            Limpar Filtros
          </button>
          <div className="bg-[#070c14] border border-[#1a2440] rounded px-2 py-1 text-[11px] font-mono text-indigo-300">
            {currentTime} <span className="text-slate-500">UTC</span>
          </div>
        </div>
      </div>

      {/* Modern Compact Chips Selectors (SLA/Tactical Filters) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 border-t border-[#16223f]/60 pt-2 shrink-0">
        <span className="text-[10px] text-slate-400 font-bold font-mono tracking-widest uppercase shrink-0">Foco Rápido:</span>
        <div className="flex items-center gap-1.5 select-none">
          {tacticalOptions.map((opt) => {
            const isActive = activeTacticalFilter === opt.id;
            return (
              <button
                key={opt.id}
                id={`tactical-chip-${opt.id}`}
                onClick={() => setActiveTacticalFilter(opt.id)}
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase transition-all duration-150 cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50'
                    : 'bg-[#070c14] hover:bg-[#1a2440] text-slate-400 border border-[#16223f]'
                }`}
              >
                <span className={opt.color || 'text-indigo-400'}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[10.5px] text-slate-400 font-mono bg-[#070c14] px-2 py-0.5 rounded border border-[#16223f]">
          Fila: <span className="text-white font-bold">{filteredCtrcsCount}</span> / {totalCtrcsCount} CTRCs
        </div>
      </div>
    </div>
  );
}
