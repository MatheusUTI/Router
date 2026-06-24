import React from 'react';
import { RoteirizacaoItem, RoutePlanningItem, DensityMode } from '../../types';
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
  densityMode?: DensityMode;
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
  densityMode,
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

  const padY = densityMode === 'compact' ? 'py-1' : 'py-1.5';

  return (
    <div className="border-b border-[var(--router-border)] bg-[#080d19]">
      {/* Excel Style continuous Group Header Row */}
      <div className={`sticky top-0 z-20 bg-[#0d1425] hover:bg-[#121c32] ${padY} px-3 flex items-center justify-between gap-2 border-b border-[var(--router-border)] border-l-[3px] border-[var(--router-border)]/60 select-none transition-all shadow-md`}>
        {/* Toggle + Checkbox + Group Name + Single Line Summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Arrow */}
          <button
            onClick={onToggleCollapse}
            className="w-4.5 h-4.5 flex items-center justify-center text-[var(--router-text-muted)] hover:text-white rounded bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] border border-[var(--router-border)] transition-colors cursor-pointer text-[9px] shrink-0 font-bold"
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {/* Selector group checkbox */}
          <input
            type="checkbox"
            checked={allGroupChecked}
            onChange={() => onToggleGroupSelection(itemIds)}
            className="w-3.5 h-3.5 cursor-pointer rounded-sm border-[var(--router-border)] bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all shrink-0"
          />

          <div className="flex items-center gap-2 min-w-0 flex-wrap py-0.5 leading-none">
            <span className="font-extrabold text-[#f1f5f9] uppercase tracking-wide text-[13px] truncate">
              {groupKey}
              {subRouteLabel && groupKey !== subRouteLabel && (
                <span className="text-gray-400 font-semibold text-[11px] ml-1.5 font-mono">
                  • {subRouteLabel}
                </span>
              )}
            </span>
            
            <span className="text-[var(--router-text-soft)] font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-[var(--router-text-soft)] font-black font-mono text-[11px] shrink-0 uppercase">
              {items.length} {items.length === 1 ? 'carga' : 'cargas'}
            </span>
            
            <span className="text-[var(--router-text-soft)] font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-[#10b981] font-black font-mono text-[11px] shrink-0">
              {totalWeightTons}
            </span>
            
            <span className="text-[var(--router-text-soft)] font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-amber-400 font-black font-mono text-[11px] shrink-0">
              {totalVolume} {totalVolume === 1 ? 'vol' : 'vols'}
            </span>
            
            <span className="text-[var(--router-text-soft)] font-sans text-[10px] font-bold select-none">•</span>
            
            <span className="text-indigo-305 font-bold font-mono text-[11px] shrink-0">
              R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>

            {(() => {
              const attentionCount = naoVaiCount + prioridadeCount + atencaoCount + aguardarCount;
              if (attentionCount > 0) {
                return (
                  <>
                    <span className="text-[var(--router-text-soft)] font-sans text-[10px] font-bold select-none">•</span>
                    <span className="text-red-405 font-black font-mono text-[11px] shrink-0 flex items-center gap-0.5">
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
        <div className="bg-[var(--router-bg)] divide-y divide-[var(--router-border)]">
          {items.map((item) => (
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
      )}
    </div>
  );
}
