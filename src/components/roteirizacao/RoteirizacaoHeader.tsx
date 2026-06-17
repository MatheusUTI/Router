import React from 'react';
import { AppUser, RoteirizacaoSortField, SortDirection, RoteirizacaoDiagnostics } from '../../types';
import { DEFAULT_OPERATIONAL_UNIT, getOperationalUnits } from '../../constants/operationalUnits';

interface RoteirizacaoHeaderProps {
  adminUser: AppUser;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedOccurrenceSectors: string[];
  setSelectedOccurrenceSectors: (sectors: string[]) => void;
  sortField: RoteirizacaoSortField;
  setSortField: (field: RoteirizacaoSortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  availableSectors: string[];
  uniqueSectors: string[];
  totalCtrcsCount: number;
  filteredCtrcsCount: number;
  onClearFilters: () => void;
  currentTime?: string;
  onOpenFleetDrawer?: () => void;
  draftCount?: number;
  planningDate?: string;
  // Legacy optional properties allowing safe background transition
  selectedLocationFilter?: string;
  setSelectedLocationFilter?: (filter: string) => void;
  activeTacticalFilter?: string;
  setActiveTacticalFilter?: (filter: string) => void;
  selectedEligibility?: 'ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS';
  setSelectedEligibility?: (eligibility: 'ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS') => void;
  densityMode?: 'compact' | 'default' | 'comfortable';
  showOtherUnits?: boolean;
  setShowOtherUnits?: (show: boolean) => void;
  onOpenDiagnostics?: () => void;
  diagnostics?: RoteirizacaoDiagnostics;
}

export default function RoteirizacaoHeader({
  adminUser,
  selectedUnit,
  setSelectedUnit,
  selectedSector,
  setSelectedSector,
  searchQuery,
  setSearchQuery,
  selectedOccurrenceSectors,
  setSelectedOccurrenceSectors,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  availableSectors,
  uniqueSectors,
  totalCtrcsCount,
  filteredCtrcsCount,
  onClearFilters,
  currentTime = '12:00',
  onOpenFleetDrawer,
  draftCount = 0,
  planningDate,
  showOtherUnits = false,
  setShowOtherUnits = () => {},
  onOpenDiagnostics,
  diagnostics,
}: RoteirizacaoHeaderProps) {
  const formattedPlanningDate = planningDate 
    ? new Date(planningDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const hasVisibilityAlert = !!(diagnostics && diagnostics.totalAfterEnrichment > 0 && (diagnostics.totalFinalVisible === 0 || (diagnostics.totalFinalVisible / diagnostics.totalAfterEnrichment) < 0.05));
  const warningsCount = diagnostics?.warnings?.length ?? 0;

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

  // Common styling tokens suited perfectly for 100%, 110%, 125% screen zooms
  const containerClass = "bg-[#0b1322] border-b border-[#1a2440] py-2 px-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-3 shrink-0 select-none";
  
  const selectorWrapClass = "flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2 py-1 h-9 shrink-0";
  const selectorLabelClass = "font-extrabold uppercase font-mono tracking-tight text-[11px] text-slate-400 leading-none";
  
  const selectClass = "bg-transparent text-slate-100 font-sans font-black focus:outline-none cursor-pointer border-none p-0 outline-none text-[12px] leading-none";
  const selectMonoClass = "bg-transparent text-slate-100 font-mono font-black focus:outline-none cursor-pointer border-none p-0 outline-none text-[12px] leading-none";

  const titleClass = "font-black text-slate-100 tracking-tight text-sm uppercase leading-none truncate";
  const subtitleClass = "font-mono text-indigo-400 font-black tracking-widest text-[10px] leading-none mt-0.5";

  const btnClass = "bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 rounded font-black tracking-wide text-[12px] px-2.5 py-1 h-9 transition-all flex items-center gap-1.5 cursor-pointer select-none leading-none";
  const btnSecondaryClass = "bg-[#1a2440] hover:bg-[#253359] text-gray-200 border border-[#2d3a5e] rounded font-extrabold text-[12px] px-2.5 py-1 h-9 transition-all cursor-pointer select-none leading-none";
  const badgeClass = "bg-[#070c14] border border-[#1a2440] rounded font-mono text-indigo-300 text-[12px] px-2 py-1 h-9 flex items-center leading-none shrink-0";

  const searchInputClass = "w-full bg-[#070c14] border border-[#1a2440] rounded-md pl-6 pr-2 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-[12px] h-9 transition-all uppercase";
  const searchWrapClass = "relative w-44 md:w-52 h-9 shrink-0";

  const rightStatusClass = "font-mono bg-[#070c14] rounded border border-[#16223f] px-2 py-1 h-9 flex items-center text-[12px] text-slate-400 leading-none shrink-0";

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const parts = val.split('-');
    if (parts.length === 2) {
      setSortField(parts[0] as RoteirizacaoSortField);
      setSortDirection(parts[1] as SortDirection);
    }
  };

  return (
    <div className={containerClass}>
      {/* Brand Title and Operational Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status indicator & Title */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38bdf8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0ea5e9]"></span>
          </span>
          <div className="flex flex-col min-w-0 max-w-[150px]">
            <h1 className={titleClass}>Mesa de Roteirização</h1>
            <span className={subtitleClass}>PLAN: {formattedPlanningDate}</span>
          </div>
        </div>

        {/* Filial selection */}
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
              {getOperationalUnits().filter(u => u.active).map(u => (
                <option key={u.code} value={u.code} className="bg-[#0b1322]">{u.code}</option>
              ))}
            </select>
          ) : (
            <span className="text-slate-400 font-mono font-bold text-[12px] flex items-center gap-0.5 select-none leading-none">
              🔒 {(adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase()}
            </span>
          )}
        </div>

        {/* Toggle showOtherUnits (Mostrar outras unidades) */}
        <label className="flex items-center gap-1.5 bg-[#070c14] border border-[#1a2440] rounded px-2 py-1 h-9 shrink-0 cursor-pointer hover:bg-slate-900 select-none text-[12px]">
          <input
            type="checkbox"
            checked={showOtherUnits}
            onChange={(e) => setShowOtherUnits(e.target.checked)}
            className="rounded border-slate-700 text-indigo-500 bg-slate-900 focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5 accent-indigo-500"
          />
          <span className="font-extrabold uppercase font-mono tracking-tight text-[11px] text-slate-400 leading-none">
            Outras Unidades
          </span>
        </label>

        {/* Route Selector (Bind to sector state) */}
        <div className={selectorWrapClass}>
          <span className={selectorLabelClass}>ROTA:</span>
          <select
            id="header-sector-selector"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className={selectClass}
          >
            <option value="all" className="bg-[#0b1322]">TODAS</option>
            {uniqueSectors.map((sec) => (
              <option key={sec} value={sec} className="bg-[#0b1322]">{sec.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Setor de Ocorrência Multi-select Filter */}
        <div className={`${selectorWrapClass} relative`}>
          <span className={selectorLabelClass}>SETOR OCORRÊNCIA:</span>
          <button
            onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
            className="bg-transparent text-slate-105 font-sans font-black focus:outline-none cursor-pointer border-none p-0 outline-none leading-none select-none flex items-center gap-1 hover:text-indigo-400 transition-colors text-[12px]"
          >
            <span>{getSectorSummary().toUpperCase()}</span>
            <span className="text-[10px] opacity-75">▼</span>
          </button>

          {isSectorDropdownOpen && (
            <>
              {/* Backdrop overlay */}
              <div 
                className="fixed inset-0 z-[140] cursor-default" 
                onClick={() => setIsSectorDropdownOpen(false)} 
              />
              
              {/* Dropdown Panel */}
              <div className="absolute top-full left-0 mt-1.5 bg-[#090f1d] border border-slate-700/60 rounded-xl p-3 z-[150] shadow-2xl w-64 text-xs flex flex-col gap-2 font-mono">
                <div className="flex items-center justify-between text-[12px] text-slate-400 font-bold border-b border-slate-800 pb-1.5 uppercase select-none">
                  <span>Selecionar Setores</span>
                  <span className="text-indigo-400 font-black">{selectedOccurrenceSectors.length} de {availableSectors.length}</span>
                </div>

                {/* Dropdown Actions */}
                <div className="grid grid-cols-3 gap-1 py-1">
                  <button
                    onClick={() => {
                      setSelectedOccurrenceSectors(availableSectors);
                    }}
                    className="bg-slate-800/60 hover:bg-slate-700/80 active:scale-95 text-[11px] text-slate-200 py-1 px-1.5 rounded font-black border border-slate-700/30 uppercase cursor-pointer transition-all text-center leading-none"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOccurrenceSectors([]);
                    }}
                    className="bg-slate-850/40 hover:bg-slate-800/80 active:scale-95 text-[11px] text-slate-300 py-1 px-1.5 rounded font-black border border-slate-800/40 uppercase cursor-pointer transition-all text-center leading-none"
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
                    className="bg-emerald-950/45 hover:bg-emerald-900/65 active:scale-95 text-[11px] text-emerald-300 py-1 px-1.5 rounded font-black border border-emerald-800/30 uppercase cursor-pointer transition-all text-center leading-none"
                    title="Setores úteis para faturamento normal"
                  >
                    Padrão
                  </button>
                </div>

                {/* Dropdown Checklist */}
                <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin select-none py-1">
                  {availableSectors.map((sector) => {
                    const isChecked = selectedOccurrenceSectors.includes(sector);
                    return (
                      <label 
                        key={sector} 
                        className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:bg-slate-800/40 cursor-pointer text-[12px] text-slate-300 transition-colors uppercase"
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

        {/* Excel Sorting Selection */}
        <div className={selectorWrapClass}>
          <span className={selectorLabelClass}>ORDENAR:</span>
          <select
            id="header-sorting-selector"
            value={`${sortField}-${sortDirection}`}
            onChange={handleSortChange}
            className={selectClass}
          >
            <option value="prev_ent-asc" className="bg-[#0b1322]">Previsão mais antiga</option>
            <option value="prev_ent-desc" className="bg-[#0b1322]">Previsão mais nova</option>
            <option value="remetente-asc" className="bg-[#0b1322]">Remetente A-Z</option>
            <option value="remetente-desc" className="bg-[#0b1322]">Remetente Z-A</option>
            <option value="destinatario-asc" className="bg-[#0b1322]">Destinatário A-Z</option>
            <option value="destinatario-desc" className="bg-[#0b1322]">Destinatário Z-A</option>
            <option value="cidade-asc" className="bg-[#0b1322]">Cidade A-Z</option>
            <option value="cidade-desc" className="bg-[#0b1322]">Cidade Z-A</option>
            <option value="peso-desc" className="bg-[#0b1322]">Peso maior</option>
            <option value="peso-asc" className="bg-[#0b1322]">Peso menor</option>
            <option value="volumes-desc" className="bg-[#0b1322]">Volumes maior</option>
            <option value="volumes-asc" className="bg-[#0b1322]">Volumes menor</option>
            <option value="valor-desc" className="bg-[#0b1322]">Valor maior</option>
            <option value="valor-asc" className="bg-[#0b1322]">Valor menor</option>
            <option value="frete-desc" className="bg-[#0b1322]">Frete maior</option>
            <option value="frete-asc" className="bg-[#0b1322]">Frete menor</option>
          </select>
        </div>
      </div>

      {/* Control Actions & Search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Unified Search Input */}
        <div className={searchWrapClass}>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[12px] font-mono select-none">🔍</span>
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
              <span className="bg-amber-500 text-[#080c14] font-black px-1.5 rounded-full text-[11px] min-w-[14px] text-center">
                {draftCount}
              </span>
            )}
          </button>
        )}

        {/* Diagnóstico button */}
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className={`rounded font-extrabold text-[12px] px-2.5 py-1 h-9 transition-all cursor-pointer select-none leading-none flex items-center gap-1.5 shrink-0 border shadow-sm ${
              hasVisibilityAlert
                ? 'bg-amber-600 hover:bg-amber-550 border-amber-500 text-white animate-pulse'
                : warningsCount > 0
                ? 'bg-amber-950/40 hover:bg-amber-900/40 border-amber-800/50 text-amber-300'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/40 text-indigo-400 hover:text-indigo-300'
            }`}
            title="Diagnóstico de Visibilidade da Mesa"
          >
            {hasVisibilityAlert ? (
              <>
                <span>⚠️ Filtros ocultando dados</span>
                {warningsCount > 0 && (
                  <span className="bg-amber-950/60 text-amber-205 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-700/30">
                    {warningsCount}
                  </span>
                )}
              </>
            ) : warningsCount > 0 ? (
              <>
                <span>⚠️ Diagnóstico</span>
                <span className="bg-amber-900/50 text-amber-205 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-700/30">
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

        {/* Limpar button */}
        <button
          id="btn-clear-filters-header"
          onClick={onClearFilters}
          className={btnSecondaryClass}
        >
          Limpar
        </button>

        {/* Fila count display */}
        <div className={rightStatusClass}>
          Fila: <span className="text-white font-extrabold ml-1 uppercase">{filteredCtrcsCount} / {totalCtrcsCount}</span>
        </div>

        {/* Current clock */}
        <div className={badgeClass}>
          {currentTime} <span className="text-slate-500 text-[10px] ml-1">UTC</span>
        </div>
      </div>
    </div>
  );
}
