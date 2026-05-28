import React from 'react';
import { RoteirizacaoItem, RoutePlanningItem } from '../../types';
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
  onUpdatePlanning?: (ctrcId: string, patch: Partial<RoutePlanningItem>) => void;
}

export default function CargaGroup({
  groupKey,
  items,
  isExpanded,
  onToggleCollapse,
  selectedIds,
  onToggleItem,
  onToggleGroupSelection,
  onUpdatePlanning,
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
    <div className="border-b border-[#14203a]/45 bg-[#0d1322]">
      {/* Group Header Row - Compact, single line sticky bar */}
      <div className="sticky top-0 z-20 bg-[#111b32] hover:bg-[#15213d] py-1.5 px-3 flex items-center justify-between gap-2 border-l-[3px] border-indigo-500 select-none transition-all shadow-sm">
        {/* Toggle + Checkbox + Group Name + Single Line Summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Arrow */}
          <button
            onClick={onToggleCollapse}
            className="w-4.5 h-4.5 flex items-center justify-center text-slate-350 hover:text-white rounded bg-[#1a2641]/50 hover:bg-[#202f50] border border-indigo-950/40 transition-colors cursor-pointer text-[9px] shrink-0 font-extrabold"
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Selector group checkbox */}
          <input
            type="checkbox"
            checked={allGroupChecked}
            onChange={() => onToggleGroupSelection(itemIds)}
            className="w-3.5 h-3.5 cursor-pointer rounded-sm border-slate-700 bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all shrink-0"
          />

          <div className="flex items-center gap-2 min-w-0 flex-wrap py-0.5 leading-none">
            <span className="font-extrabold text-[#f8fafc] uppercase tracking-wide text-[12.5px] truncate">
              {groupKey}
              {subRouteLabel && groupKey !== subRouteLabel && (
                <span className="text-indigo-400 font-semibold text-[11px] ml-1.5 font-mono">
                  • {subRouteLabel}
                </span>
              )}
            </span>
            
            <span className="text-slate-600 font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-slate-350 font-bold font-mono text-[10.5px] shrink-0">
              {items.length} {items.length === 1 ? 'carga' : 'cargas'}
            </span>
            
            <span className="text-slate-600 font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-emerald-400 font-black font-mono text-[10.5px] shrink-0">
              {totalWeightTons}
            </span>
            
            <span className="text-slate-600 font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-yellow-450 font-black font-mono text-[10.5px] shrink-0">
              {totalVolume} {totalVolume === 1 ? 'vol' : 'vols'}
            </span>
            
            <span className="text-slate-600 font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-indigo-300 font-bold font-mono text-[10.5px] shrink-0">
              R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>

            {(() => {
              const attentionCount = naoVaiCount + prioridadeCount + atencaoCount + aguardarCount;
              if (attentionCount > 0) {
                return (
                  <>
                    <span className="text-slate-600 font-sans text-[10px] font-bold select-none">•</span>
                    <span className="text-red-400 font-black font-mono text-[10.5px] shrink-0 flex items-center gap-1">
                      ⚠️ {attentionCount} {attentionCount === 1 ? 'atenção' : 'atenções'}
                    </span>
                  </>
                );
              }
              return null;
            })()}
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
              onUpdatePlanning={onUpdatePlanning}
            />
          ))}
        </div>
      )}
    </div>
  );
}
