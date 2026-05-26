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

  // Group decision status breakdown
  let vaiCount = 0;
  let atencaoCount = 0;
  let naoVaiCount = 0;
  let aguardarCount = 0;
  let prioridadeCount = 0;

  for (const item of items) {
    const status = item.availabilityStatus ? item.availabilityStatus.toLowerCase() : '';
    const occurrenceCri = (item.occurrenceCriticality || '') as string;

    if (
      occurrenceCri === 'CRÍTICA' ||
      status === 'retido' ||
      status === 'problema' ||
      status === 'devolução'
    ) {
      naoVaiCount++;
    } else if (
      item.isCurvaA ||
      item.slaStatus?.isDelayed ||
      item.normPriority === 'CRÍTICA'
    ) {
      prioridadeCount++;
    } else if (
      item.slaStatus?.isToday ||
      item.slaStatus?.daysDiff === 1 ||
      (item.occurrenceCode && occurrenceCri !== 'CRÍTICA') ||
      item.pesoStatus?.category === 'CRÍTICO' ||
      item.pesoStatus?.category === 'PESADO' ||
      status === 'aguardando'
    ) {
      atencaoCount++;
    } else if (
      status === 'transferência' ||
      status === 'em rota'
    ) {
      aguardarCount++;
    } else {
      vaiCount++;
    }
  }

  // Calculate selection status
  const itemIds = items.map((i) => i.id);
  const allGroupChecked = itemIds.length > 0 && itemIds.every((id) => selectedIds.includes(id));

  // Auto detect typical sub route code if available
  const subRouteLabel = items[0]?.normSetor || '';

  // Format total weight for high scannability
  const totalWeightTons = totalWeight >= 1000 
    ? `${(totalWeight / 1000).toFixed(1)}t` 
    : `${totalWeight} kg`;

  return (
    <div className="border-b border-[#14203a]/40 bg-[#0d1322]">
      {/* Group Header Row - Sticky for rich scrolling */}
      <div className="sticky top-0 z-20 bg-[#111b30] hover:bg-[#15213b] p-3 flex items-center justify-between gap-3 border-l-4 border-indigo-500 select-none transition-all shadow-md">
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

          <div className="flex flex-col min-w-0">
            <span className="font-black text-[#f8fafc] uppercase tracking-wide text-[13.5px] truncate">
              {groupKey}
              {subRouteLabel && (
                <span className="text-indigo-400 font-semibold text-xs ml-1.5 font-mono">
                  [SET: {subRouteLabel}]
                </span>
              )}
            </span>
            
            {/* Horizontal physical attributes summary line */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold font-mono truncate mt-0.5">
              <span className="bg-[#070c14] text-[10px] text-zinc-300 px-1.5 py-0.5 rounded leading-none shrink-0 font-black">
                {items.length} {items.length === 1 ? 'CARGA' : 'CARGAS'}
              </span>
              <span className="text-slate-600 font-sans">•</span>
              <span className="text-emerald-400 font-black shrink-0">{totalWeightTons}</span>
              <span className="text-slate-600 font-sans">•</span>
              <span className="text-yellow-400 shrink-0">{totalVolume} VOLS</span>
              <span className="text-slate-600 font-sans">•</span>
              <span className="text-indigo-350 font-medium shrink-0">R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            </div>

            {/* Diagnostic Operational Decision summary line */}
            <div className="flex items-center gap-1.5 text-[9.5px] font-mono mt-1.5 flex-wrap">
              {vaiCount > 0 && (
                <span className="text-emerald-405 font-black bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-emerald-400">
                  {vaiCount} VÃO
                </span>
              )}
              {prioridadeCount > 0 && (
                <span className="text-purple-305 font-black bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 text-purple-300">
                  {prioridadeCount} PRIORIDADE
                </span>
              )}
              {atencaoCount > 0 && (
                <span className="text-amber-405 font-black bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 text-amber-500">
                  {atencaoCount} ATENÇÃO
                </span>
              )}
              {naoVaiCount > 0 && (
                <span className="text-red-405 font-black bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20 text-red-400">
                  {naoVaiCount} NÃO VÃO
                </span>
              )}
              {aguardarCount > 0 && (
                <span className="text-sky-305 font-black bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20 text-sky-400">
                  {aguardarCount} AGUARDAR
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Group Entries List */}
      {isExpanded && (
        <div className="bg-[#090f1a] divide-y divide-[#14203a]/40">
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
