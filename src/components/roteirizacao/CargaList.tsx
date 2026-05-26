import React from 'react';
import { RoteirizacaoItem } from '../../types';
import CargaItem from './CargaItem';

interface CargaListProps {
  filteredCtrcs: RoteirizacaoItem[];
  groupingMode: 'city' | 'sector' | 'destinatario' | 'previsao' | 'none';
  setGroupingMode: (mode: 'city' | 'sector' | 'destinatario' | 'previsao' | 'none') => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupKey: string) => void;
  groupedData: Record<string, RoteirizacaoItem[]>;
  selectedIds: string[];
  onToggleItem: (id: string) => void;
  onToggleGroupSelection: (ids: string[]) => void;
  onSelectAllVisible: (ids: string[]) => void;
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
}: CargaListProps) {
  // Check master selection
  const visibleIds = filteredCtrcs.map((c) => c.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#080c14] border border-[#16223f] rounded-xl overflow-hidden relative">
      {/* List Sub-header with Master Selection and Grouping Triggers */}
      <div className="bg-[#0b1322] px-3 py-1.5 flex items-center justify-between border-b border-[#1a2440] shrink-0 text-slate-300">
        
        {/* Master Checkbox */}
        <div className="flex items-center gap-2 select-none">
          <input
            type="checkbox"
            id="master-cargo-checkbox"
            checked={allVisibleChecked}
            onChange={() => onSelectAllVisible(visibleIds)}
            className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-705 bg-[#070c14] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="master-cargo-checkbox" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer">
            Selecionar Todos ({filteredCtrcs.length})
          </label>
        </div>

        {/* Group Selector Pills */}
        <div className="flex items-center gap-1 bg-[#070c14] p-0.5 rounded border border-[#16223f] select-none scale-95 origin-right">
          <span className="text-[9.5px] text-slate-500 font-bold uppercase px-1.5 py-0.2">Agrupar:</span>
          <button
            id="group-by-city-btn"
            onClick={() => setGroupingMode('city')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
              groupingMode === 'city' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cidade
          </button>
          <button
            id="group-by-sector-btn"
            onClick={() => setGroupingMode('sector')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
              groupingMode === 'sector' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Setor
          </button>
          <button
            id="group-by-destinatario-btn"
            onClick={() => setGroupingMode('destinatario')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
              groupingMode === 'destinatario' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Destinatário
          </button>
          <button
            id="group-by-previsao-btn"
            onClick={() => setGroupingMode('previsao')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
              groupingMode === 'previsao' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Previsão
          </button>
          <button
            id="group-by-none-btn"
            onClick={() => setGroupingMode('none')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-all cursor-pointer ${
              groupingMode === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Nenhum
          </button>
        </div>
      </div>

      {/* Main Items View Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto divide-y divide-[#14203a] scrollbar-thin scrollbar-track-[#080c14] scrollbar-thumb-indigo-550 scroll-smooth">
        {filteredCtrcs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
            <span className="text-3xl">📦</span>
            <p className="text-xs font-bold uppercase font-mono">Nenhuma carga pendente corresponde ao filtro selecionado</p>
          </div>
        ) : groupingMode === 'none' ? (
          // Direct List Mode
          <div className="divide-y divide-[#14203a]">
            {filteredCtrcs.map((item) => (
              <CargaItem
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggle={onToggleItem}
              />
            ))}
          </div>
        ) : (
          // Grouped modes (City, Sector, etc.) - rendered sequentially without group header lines
          <div className="divide-y divide-[#14203a]">
            {Object.keys(groupedData).flatMap((groupKey) => {
              const groupCtrcs = groupedData[groupKey] || [];
              return groupCtrcs.map((item) => (
                <CargaItem
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.includes(item.id)}
                  onToggle={onToggleItem}
                />
              ));
            })}
          </div>
        )}
      </div>
    </div>
  );
}
