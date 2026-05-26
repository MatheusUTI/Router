import React from 'react';
import { RoteirizacaoItem } from '../../types';
import CargaItem from './CargaItem';

interface CargaGroupProps {
  key?: string | number;
  groupKey: string;
  items: RoteirizacaoItem[];
  isExpanded: boolean;
  onToggleCollapse: () => void;
  selectedIds: string[];
  onToggleItem: (id: string) => void;
  onToggleGroupSelection: (ids: string[]) => void;
}

export default function CargaGroup({
  groupKey,
  items,
  isExpanded,
  onToggleCollapse,
  selectedIds,
  onToggleItem,
  onToggleGroupSelection,
}: CargaGroupProps) {
  // Aggregate stats of this group's CTRCs
  const totalWeight = items.reduce((sum, item) => sum + (item.peso_r || item.weight || 0), 0);
  const totalVolume = items.reduce((sum, item) => sum + (item.volume || 1), 0);
  const totalValue = items.reduce((sum, item) => sum + (item.valor || 0), 0);

  // SLA Delays count
  const delayedCount = items.filter((item) => item.slaStatus.isDelayed).length;

  // Active Occurrence count
  const occurrenceCount = items.filter((item) => item.occurrenceCode).length;

  // Curva A count
  const curvaACount = items.filter((item) => item.isCurvaA).length;
  
  // Calculate selection status
  const itemIds = items.map((i) => i.id);
  const allGroupChecked = itemIds.length > 0 && itemIds.every((id) => selectedIds.includes(id));

  // Auto detect typical sub route code if available
  const subRouteLabel = items[0]?.normSetor || '';

  // Format total weight
  const totalWeightTons = totalWeight >= 1000 
    ? `${(totalWeight / 1000).toFixed(1)}t` 
    : `${totalWeight} kg`;

  return (
    <div className="border-b border-[#14203a]/40 bg-[#0d1322]">
      {/* Group Header Row - Sticky for rich scrolling */}
      <div className="sticky top-0 z-20 bg-[#111b30] hover:bg-[#15213b] p-2.5 flex items-center justify-between gap-3 border-l-4 border-indigo-500 select-none transition-all shadow-md">
        {/* Toggle + Checkbox + Group Name */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Arrow */}
          <button
            onClick={onToggleCollapse}
            className="w-5.5 h-5.5 flex items-center justify-center text-slate-300 hover:text-white rounded bg-[#1a2641]/50 hover:bg-[#202f50] border border-indigo-950 transition-colors cursor-pointer text-[10px] shrink-0 font-bold"
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Selector group checkbox */}
          <input
            type="checkbox"
            checked={allGroupChecked}
            onChange={() => onToggleGroupSelection(itemIds)}
            className="w-4 h-4 cursor-pointer rounded-sm border-slate-700 bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all shrink-0"
          />

          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3 min-w-0">
            <span className="font-black text-[#f8fafc] uppercase tracking-wide text-[13.5px] truncate">
              {groupKey}
              {subRouteLabel && (
                <span className="text-indigo-400 font-semibold text-xs ml-1.5 font-mono">
                  [SET: {subRouteLabel}]
                </span>
              )}
            </span>
            
            {/* Horizontal parameters summary */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold font-mono truncate">
              <span className="bg-[#070c14] text-[10px] text-zinc-300 px-1.5 py-0.5 rounded leading-none shrink-0 font-black">
                {items.length} {items.length === 1 ? 'CARGA' : 'CARGAS'}
              </span>
              <span className="text-slate-600 font-sans">•</span>
              <span className="text-emerald-400 font-black shrink-0">{totalWeightTons}</span>
              <span className="text-slate-600 font-sans">•</span>
              <span className="text-yellow-400 shrink-0">{totalVolume} VOLS</span>
              <span className="text-slate-600 font-sans">•</span>
              <span className="text-indigo-300 font-medium shrink-0">R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Alerts Column on the very right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {curvaACount > 0 && (
            <span className="bg-red-500/10 border border-red-500/20 text-red-450 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide">
              ★ {curvaACount} CURVA {curvaACount === 1 ? 'A' : 'A'}
            </span>
          )}

          {delayedCount > 0 && (
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide animate-pulse">
              ⚠️ {delayedCount} atraso{delayedCount !== 1 ? 's' : ''}
            </span>
          )}

          {occurrenceCount > 0 && (
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide">
              {occurrenceCount} OC
            </span>
          )}
        </div>
      </div>

      {/* Group Entries List */}
      {isExpanded && (
        <div className="bg-[#090f1a] divide-y divide-[#14203a]/50">
          {items.map((item) => (
            <CargaItem
              key={item.id}
              item={item}
              isSelected={selectedIds.includes(item.id)}
              onToggle={onToggleItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
