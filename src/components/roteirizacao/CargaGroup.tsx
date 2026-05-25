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
  
  // Calculate selection status
  const itemIds = items.map((i) => i.id);
  const allGroupChecked = itemIds.length > 0 && itemIds.every((id) => selectedIds.includes(id));

  // Auto detect typical sub route code if available
  const subRouteLabel = items[0]?.normSetor || '';

  return (
    <div className="border-b border-[#16223f] bg-[#0d1322]">
      {/* Group Header Row */}
      <div className="bg-[#10192e] p-2 flex items-center justify-between gap-2 border-l-2 border-indigo-500 select-none">
        {/* Toggle + Checkbox + Group Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Arrow */}
          <button
            onClick={onToggleCollapse}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-[#1a2440] transition-colors cursor-pointer text-xs shrink-0"
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Selector group checkbox */}
          <input
            type="checkbox"
            checked={allGroupChecked}
            onChange={() => onToggleGroupSelection(itemIds)}
            className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-705 bg-[#070c14] focus:ring-0 cursor-pointer shrink-0"
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className="font-extrabold text-[#f1f5f9] uppercase tracking-wide text-[12px] truncate">
              {groupKey} {subRouteLabel && <span className="text-indigo-400 font-semibold text-[11px] font-mono ml-1">• {subRouteLabel}</span>}
            </span>
            
            {/* Horizontal parameters summary */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate">
              <span className="font-mono bg-[#070c14] text-[10px] text-zinc-300 font-bold px-1 py-0.2 rounded leading-none">
                {items.length} {items.length === 1 ? 'carga' : 'cargas'}
              </span>
              <span>•</span>
              <span className="font-mono text-emerald-400 font-bold">{totalWeight.toLocaleString('pt-BR')} kg</span>
              <span>•</span>
              <span className="font-mono text-yellow-400 font-semibold">{totalVolume} vol{totalVolume !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span className="font-mono text-indigo-300">R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              
              {delayedCount > 0 && (
                <>
                  <span>•</span>
                  <span className="bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    ⚠️ {delayedCount} ATRASO{delayedCount !== 1 ? 'S' : ''}
                  </span>
                </>
              )}

              {occurrenceCount > 0 && (
                <>
                  <span>•</span>
                  <span className="bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-semibold px-1.5 py-0.2 rounded">
                    {occurrenceCount} OCORRÊNCIA{occurrenceCount !== 1 ? 'S' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Manual selection total weight notice */}
        <div className="text-[10.5px] font-mono text-slate-500 hidden md:block shrink-0 uppercase">
          grupo {groupKey.substring(0, 10)}
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
