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
  selectedEligibility: 'ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS';
  setSelectedEligibility: (eligibility: 'ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS') => void;
  selectedOccurrenceSectors: string[];
  setSelectedOccurrenceSectors: (sectors: string[]) => void;
  availableSectors: string[];
  uniqueSectors: string[];
  totalCtrcsCount: number;
  filteredCtrcsCount: number;
  onClearFilters: () => void;
  currentTime?: string;
  onOpenFleetDrawer?: () => void;
  draftCount?: number;
  planningDate?: string;
  densityMode?: 'compact' | 'default' | 'comfortable';
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
  selectedEligibility,
  setSelectedEligibility,
  selectedOccurrenceSectors,
  setSelectedOccurrenceSectors,
  availableSectors,
  uniqueSectors,
  totalCtrcsCount,
  filteredCtrcsCount,
  onClearFilters,
  currentTime = '15:50',
  onOpenFleetDrawer,
  draftCount = 0,
  planningDate,
  densityMode = 'default',
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

  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = React.useState(false);

  const getSectorSummary = () => {
    const isAllSelected = availableSectors.every((s) => selectedOccurrenceSectors.includes(s));
    if (isAllSelected) {
      return 'Todos';
    }
    if (selectedOccurrenceSectors.length === 0) {
      return 'Nenhum';
    }
    if (selectedOccurrenceSectors.length === 1) {
      return selectedOccurrenceSectors[0];
    }
    // Prioritize showing a nice fallback
    const firstWord = selectedOccurrenceSectors[0];
    return `${firstWord} +${selectedOccurrenceSectors.length - 1}`;
  };

  const toggleSector = (sector: string) => {
    if (selectedOccurrenceSectors.includes(sector)) {
      setSelectedOccurrenceSectors(selectedOccurrenceSectors.filter((s) => s !== sector));
    } else {
      setSelectedOccurrenceSectors([...selectedOccurrenceSectors, sector]);
    }
  };

  // Density variations setup
  const isCompact = densityMode === 'compact';
  const isComfortable = densityMode === 'comfortable';

  // Container styling
  const containerClass = `bg-[#0b1322] border-b border-[#1a2440] ${
    isCompact ? 'py-1 px-2.5 gap-1' : isComfortable ? 'py-2 px-3.5 gap-2' : 'py-1.5 px-3 gap-1.5'
  } flex flex-col shrink-0`;

  // Selectors wrapping styling
  const selectorWrapClass = `flex items-center gap-1 bg-[#070c14] border border-[#1a2440] rounded ${
    isCompact ? 'px-1 py-0.2' : isComfortable ? 'px-2 py-1' : 'px-1.5 py-0.5'
  }`;
  
  const selectorLabelClass = `font-bold uppercase font-mono tracking-tight leading-none ${
    isCompact ? 'text-[8px]' : isComfortable ? 'text-[9.5px]' : 'text-[9px]'
  } text-slate-400`;

  const selectClass = `bg-transparent text-slate-100 font-sans font-black focus:outline-none cursor-pointer border-none p-0 outline-none leading-none ${
    isCompact ? 'text-[9.5px]' : isComfortable ? 'text-[11px]' : 'text-[10px]'
  }`;

  const selectMonoClass = `bg-transparent text-slate-100 font-mono font-black focus:outline-none cursor-pointer border-none p-0 outline-none leading-none ${
    isCompact ? 'text-[9.5px]' : isComfortable ? 'text-[11px]' : 'text-[10px]'
  }`;

  // Title styling
  const titleClass = `font-black text-slate-100 tracking-tight uppercase leading-none ${
    isCompact ? 'text-[11px]' : isComfortable ? 'text-[13px]' : 'text-xs'
  }`;
  const subtitleClass = `font-mono text-indigo-400 font-black tracking-widest leading-none mt-0.5 ${
    isCompact ? 'text-[8.5px]' : isComfortable ? 'text-[10px]' : 'text-[9px]'
  }`;

  // Buttons styling
  const btnClass = `bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 rounded font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer select-none leading-none ${
    isCompact ? 'text-[9px] px-1.5 py-0.2' : isComfortable ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
  }`;

  const btnSecondaryClass = `bg-[#1a2440] hover:bg-[#253359] text-gray-200 rounded font-semibold transition-all cursor-pointer select-none leading-none ${
    isCompact ? 'text-[9px] px-1.5 py-0.2' : isComfortable ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
  }`;

  const badgeClass = `bg-[#070c14] border border-[#1a2440] rounded font-mono text-indigo-300 shrink-0 leading-none ${
    isCompact ? 'px-1 py-0.2 text-[9px]' : isComfortable ? 'px-2 py-1 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'
  }`;

  // Search input styling
  const searchInputClass = `w-full bg-[#070c14] border border-[#1a2440] rounded-md pr-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all uppercase ${
    isCompact ? 'pl-4.5 py-0.2 text-[9.5px]' : isComfortable ? 'pl-5.5 py-1 text-[11.5px]' : 'pl-5 py-0.5 text-[10.5px]'
  }`;
  const searchWrapClass = isCompact ? 'relative w-36 md:w-44' : isComfortable ? 'relative w-48 md:w-64' : 'relative w-44 md:w-56';

  // Foco Rapido row elements
  const focusWrapClass = `flex items-center gap-2  shrink-0 ${
    isCompact ? 'py-0.2 mt-0.5 pt-0.5' : isComfortable ? 'py-1 mt-0.5 border-t border-[#16223f]/40 pt-1.5' : 'py-0.5 border-t border-[#16223f]/40 pt-1'
  }`;
  const focusLabelClass = `text-slate-400 font-bold font-mono tracking-wider uppercase shrink-0 ${
    isCompact ? 'text-[8.5px]' : isComfortable ? 'text-[10px]' : 'text-[9px]'
  }`;
  const chipContainerClass = `flex items-center overflow-x-auto no-scrollbar py-0.2 shrink-0 ${
    isCompact ? 'gap-1' : isComfortable ? 'gap-1.8' : 'gap-1.5'
  }`;
  const chipClass = `rounded font-bold tracking-tight transition-all uppercase border cursor-pointer flex items-center gap-1 shrink-0 ${
    isCompact ? 'px-1.5 py-0.2 text-[9px]' : isComfortable ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
  }`;
  const rightStatusClass = `ml-auto font-mono bg-[#070c14] rounded border border-[#16223f]/40 shrink-0 text-slate-400 ${
    isCompact ? 'px-1.5 py-0.2 text-[9px]' : isComfortable ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
  }`;

  return (
    <div className={containerClass}>
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
              <h1 className={titleClass}>Mesa de Roteirização</h1>
              <span className={subtitleClass}>PLAN: {formattedPlanningDate}</span>
            </div>
          </div>

          {/* Unit selection */}
          <div className={selectorWrapClass}>
            <span className={selectorLabelClass}>FILIAL:</span>
            {adminUser.is_master ? (
              <select
                id="header-unit-selector"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className={selectMonoClass}
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
          <div className={selectorWrapClass}>
            <span className={selectorLabelClass}>SETOR:</span>
            <select
              id="header-sector-selector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className={selectClass}
            >
              <option value="all" className="bg-[#0b1322]">TODOS</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec} className="bg-[#0b1322]">{sec.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Situation Physical Location Filter */}
          <div className={selectorWrapClass}>
            <span className={selectorLabelClass}>OCUPAÇÃO:</span>
            <select
              id="header-location-filter"
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all" className="bg-[#0b1322]">TODAS</option>
              <option value="na_base" className="bg-[#0b1322]">NA BASE</option>
              <option value="outra_base" className="bg-[#0b1322]">OUTRA BASE</option>
              <option value="rota" className="bg-[#0b1322]">EM ROTA / TRANSF.</option>
              <option value="sem_loc" className="bg-[#0b1322]">SEM LOCALIZAÇÃO</option>
              <option value="box" className="bg-[#0b1322]">AGUARDANDO BOX</option>
            </select>
          </div>

          {/* Setor de Ocorrência Multi-select Filter */}
          <div className={`${selectorWrapClass} relative`}>
            <span className={selectorLabelClass}>SETOR OCORRÊNCIA:</span>
            <button
              onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
              className="bg-transparent text-slate-100 font-sans font-black focus:outline-none cursor-pointer border-none p-0 outline-none leading-none select-none flex items-center gap-1 hover:text-indigo-400 transition-colors"
              style={{ fontSize: isCompact ? '9.5px' : isComfortable ? '11px' : '10px' }}
            >
              <span>{getSectorSummary().toUpperCase()}</span>
              <span className="text-[8px] opacity-75">▼</span>
            </button>

            {isSectorDropdownOpen && (
              <>
                {/* Backdrop overlay to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-[140] cursor-default" 
                  onClick={() => setIsSectorDropdownOpen(false)} 
                />
                
                {/* Dropdown Card */}
                <div className="absolute top-full left-0 mt-1.5 bg-[#090f1d] border border-slate-700/60 rounded-xl p-3 z-[150] shadow-2xl w-64 text-xs flex flex-col gap-2 font-mono">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-1.5 uppercase select-none">
                    <span>Selecionar Setores</span>
                    <span className="text-indigo-400 font-black">{selectedOccurrenceSectors.length} de {availableSectors.length}</span>
                  </div>

                  {/* Quick Action Controls */}
                  <div className="grid grid-cols-3 gap-1 py-1">
                    <button
                      onClick={() => {
                        setSelectedOccurrenceSectors(availableSectors);
                      }}
                      className="bg-slate-800/60 hover:bg-slate-700/80 active:scale-95 text-[9px] text-slate-200 py-1 px-1.5 rounded font-black border border-slate-700/30 uppercase cursor-pointer transition-all text-center leading-none"
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOccurrenceSectors([]);
                      }}
                      className="bg-slate-850/40 hover:bg-slate-800/80 active:scale-95 text-[9px] text-slate-300 py-1 px-1.5 rounded font-black border border-slate-800/40 uppercase cursor-pointer transition-all text-center leading-none"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOccurrenceSectors([
                          'Agendamento',
                          'Disponível',
                          'Disponível Cobrança',
                          'Disponível Pendência',
                          'Disponível Transferência',
                          'Solução'
                        ]);
                      }}
                      className="bg-emerald-950/45 hover:bg-emerald-900/60 active:scale-95 text-[9px] text-emerald-300 py-1 px-1.5 rounded font-black border border-emerald-800/30 uppercase cursor-pointer transition-all text-center leading-none"
                      title="Setores úteis para faturamento normal"
                    >
                      Padrão
                    </button>
                  </div>

                  {/* Checklist options */}
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin select-none py-1">
                    {availableSectors.map((sector) => {
                      const isChecked = selectedOccurrenceSectors.includes(sector);
                      return (
                        <label 
                          key={sector} 
                          className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:bg-slate-800/40 cursor-pointer text-[11px] text-slate-300 transition-colors uppercase"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSector(sector)}
                            className="rounded border-slate-700 text-indigo-500 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5 accent-indigo-500"
                          />
                          <span className={isChecked ? 'text-white font-black' : 'text-slate-400 font-medium'}>
                            {sector}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search, Action controls, and Clock */}
        <div className="flex items-center gap-2">
          {/* Universal Search Input */}
          <div className={searchWrapClass}>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono select-none">🔍</span>
            <input
              id="header-universal-search"
              type="text"
              placeholder="Buscar CTRC, NF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={searchInputClass}
            />
          </div>

          {onOpenFleetDrawer && (
            <button
              onClick={onOpenFleetDrawer}
              className={btnClass}
            >
              <span>🚚 Consolidar</span>
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
            className={btnSecondaryClass}
          >
            Limpar
          </button>

          <div className={badgeClass}>
            {currentTime} <span className="text-slate-500 text-[8.5px]">UTC</span>
          </div>
        </div>
      </div>

      {/* Modern Compact Chips Area ("Foco Rápido") */}
      <div className={focusWrapClass}>
        <span className={focusLabelClass}>Foco Rápido:</span>
        
        <div className={chipContainerClass}>
          {tacticalOptions.map((opt) => {
            const isActive = activeTacticalFilter === opt.id;
            return (
              <button
                key={opt.id}
                id={`tactical-chip-${opt.id}`}
                onClick={() => setActiveTacticalFilter(opt.id)}
                className={`${chipClass} ${
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

        <div className={rightStatusClass}>
          Fila: <span className="text-white font-bold">{filteredCtrcsCount}</span> / {totalCtrcsCount}
        </div>
      </div>
    </div>
  );
}
