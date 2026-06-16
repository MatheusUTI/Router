import React from 'react';
import { RoteirizacaoItem, RoutePlanningItem, DensityMode } from '../../types';
import CargaItem from './CargaItem';
import CargaGroup from './CargaGroup';

interface CargaListProps {
  filteredCtrcs: RoteirizacaoItem[];
  groupingMode: 'sector' | 'city' | 'destinatario' | 'previsao' | 'priority' | 'status' | 'location' | 'none';
  setGroupingMode: (mode: 'sector' | 'city' | 'destinatario' | 'previsao' | 'priority' | 'status' | 'location' | 'none') => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupKey: string) => void;
  groupedData: Record<string, RoteirizacaoItem[]>;
  selectedIds: string[];
  onToggleItem: (id: string) => void;
  onToggleGroupSelection: (ids: string[]) => void;
  onSelectAllVisible: (ids: string[]) => void;
  onUpdatePlanning?: (ctrcId: string, patch: Partial<RoutePlanningItem>) => void;
  densityMode?: DensityMode;
  onUpdateDensity?: (density: DensityMode) => void;
  totalCtrcsCount?: number;
  onClearFilters?: () => void;
}

export default function CargaList({
  filteredCtrcs,
  groupingMode,
  setGroupingMode,
  expandedGroups,
  toggleGroup,
  groupedData,
  selectedIds,
  onToggleItem,
  onToggleGroupSelection,
  onSelectAllVisible,
  onUpdatePlanning,
  densityMode = 'default',
  onUpdateDensity,
  totalCtrcsCount = 0,
  onClearFilters,
}: CargaListProps) {
  // Check master selection
  const visibleIds = filteredCtrcs.map((c) => c.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#080c14] border border-[#16223f] rounded-xl overflow-hidden relative">
      {/* List Sub-header with Master Selection and Grouping Triggers */}
      <div className="bg-[#0b1322] px-3 py-2 flex flex-wrap gap-2 items-center justify-between border-b border-[#1a2440] shrink-0 text-slate-300">
        
        {/* Master Checkbox */}
        <div className="flex items-center gap-2 select-none">
          <input
            type="checkbox"
            id="master-cargo-checkbox"
            checked={allVisibleChecked}
            onChange={() => onSelectAllVisible(visibleIds)}
            className="w-4 h-4 accent-indigo-500 rounded border-slate-705 bg-[#070c14] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="master-cargo-checkbox" className="text-[13px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-white">
            Selecionar Todos ({filteredCtrcs.length})
          </label>
        </div>

        {/* Right side controls (Grouping) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Group Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#070c14] p-1 rounded border border-[#16223f] select-none">
            <span className="text-[12px] text-slate-500 font-extrabold uppercase px-1.5 py-0.5">Agrupar:</span>
            <button
              id="group-by-sector-btn"
              onClick={() => setGroupingMode('sector')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'sector' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rota Operacional
            </button>
            <button
              id="group-by-city-btn"
              onClick={() => setGroupingMode('city')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'city' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cidade
            </button>
            <button
              id="group-by-destinatario-btn"
              onClick={() => setGroupingMode('destinatario')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'destinatario' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Destinatário
            </button>
            <button
              id="group-by-previsao-btn"
              onClick={() => setGroupingMode('previsao')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'previsao' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Previsão
            </button>
            <button
              id="group-by-priority-btn"
              onClick={() => setGroupingMode('priority')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'priority' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Prioridade
            </button>
            <button
              id="group-by-status-btn"
              onClick={() => setGroupingMode('status')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'status' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Status
            </button>
            <button
              id="group-by-location-btn"
              onClick={() => setGroupingMode('location')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'location' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Localização
            </button>
            <button
              id="group-by-none-btn"
              onClick={() => setGroupingMode('none')}
              className={`px-3 py-1 text-[12px] font-black rounded uppercase transition-all cursor-pointer ${
                groupingMode === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nenhum
            </button>
          </div>
        </div>
      </div>

      {/* Main Items View Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto divide-y divide-[#14203a] scrollbar-thin scrollbar-track-[#080c14] scrollbar-thumb-indigo-550 scroll-smooth">
        {filteredCtrcs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3 px-4 text-center">
            <span className="text-3xl">📦</span>
            <p className="text-xs font-bold uppercase font-mono">Nenhuma carga pendente corresponde ao filtro selecionado</p>
            {totalCtrcsCount > 0 && onClearFilters && (
              <div className="mt-2 bg-[#0e1726]/80 border border-[#1e2e4f] rounded-lg p-3 max-w-sm animate-pulse">
                <p className="text-xs text-indigo-300 font-sans leading-relaxed mb-2">
                  Há CTRCs importados, mas nenhum visível com os filtros atuais. Limpar filtros da Mesa?
                </p>
                <button
                  onClick={onClearFilters}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : groupingMode === 'none' ? (
          // Direct List Mode
          <div className="divide-y divide-[#14203a] pb-36">
            {filteredCtrcs.map((item) => (
              <CargaItem
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggle={onToggleItem}
                onUpdatePlanning={onUpdatePlanning}
                densityMode={densityMode}
              />
            ))}
          </div>
        ) : (
          // Grouped modes with beautiful collapsible segment headers
          <div className="flex flex-col select-none pb-36">
            {Object.keys(groupedData).map((groupKey) => {
              const groupCtrcs = groupedData[groupKey] || [];
              const isExpanded = expandedGroups[groupKey] !== false;
              return (
                <CargaGroup
                  key={groupKey}
                  groupKey={groupKey}
                  items={groupCtrcs}
                  isExpanded={isExpanded}
                  onToggleCollapse={() => toggleGroup(groupKey)}
                  selectedIds={selectedIds}
                  onToggleItem={onToggleItem}
                  onToggleGroupSelection={onToggleGroupSelection}
                  onUpdatePlanning={onUpdatePlanning}
                  densityMode={densityMode}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
