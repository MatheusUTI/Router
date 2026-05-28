import React, { useMemo } from 'react';
import { RoteirizacaoItem } from '../../types';

interface SelectionSummaryProps {
  selectedCtrcs: RoteirizacaoItem[];
  onOpenConsolidacao: () => void;
  onClearSelection: () => void;
}

export default function SelectionSummary({
  selectedCtrcs,
  onOpenConsolidacao,
  onClearSelection,
}: SelectionSummaryProps) {
  const selectedCount = selectedCtrcs.length;
  if (selectedCount === 0) return null;

  // Aggregate selected parameters
  const selectedWeight = useMemo(() => {
    return selectedCtrcs.reduce((sum, item) => sum + (item.peso_r || item.weight || 0), 0);
  }, [selectedCtrcs]);

  const selectedVolume = useMemo(() => {
    return selectedCtrcs.reduce((sum, item) => sum + (item.volume || 1), 0);
  }, [selectedCtrcs]);

  const uniqueSelectedRoutesCount = useMemo(() => {
    const routes = selectedCtrcs.map((item) => item.effectiveRoute || item.normRota).filter(Boolean);
    return new Set(routes).size;
  }, [selectedCtrcs]);

  const counts = useMemo(() => {
    let urgent = 0;
    let priority = 0;
    let segurar = 0;
    let naoSaiHoje = 0;
    let semLoc = 0;

    for (const item of selectedCtrcs) {
      if (item.planningStatus === 'URGENTE') urgent++;
      if (item.planningStatus === 'PRIORIDADE') priority++;
      if (item.planningStatus === 'SEGURAR') segurar++;
      if (item.planningStatus === 'NAO_SAI_HOJE') naoSaiHoje++;
      
      const hasNoLoc = !item.localizacao || item.localizacao.trim() === '' || (item.locationLabel || '').toUpperCase().includes('SEM BOX');
      if (hasNoLoc) semLoc++;
    }

    return { urgent, priority, segurar, naoSaiHoje, semLoc };
  }, [selectedCtrcs]);

  const hasSpecialAlert = counts.segurar > 0 || counts.naoSaiHoje > 0;

  // Format weight to tons with 1 decimal place if >= 1000 kg, else kilograms
  const formattedWeight = useMemo(() => {
    if (selectedWeight >= 1000) {
      return `${(selectedWeight / 1000).toFixed(1)}t`;
    }
    return `${selectedWeight} kg`;
  }, [selectedWeight]);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-6xl bg-[#111929]/95 backdrop-blur-md border border-indigo-500/40 min-h-[58px] py-2 px-4 rounded-xl flex flex-wrap gap-2 items-center justify-between z-40 shrink-0 shadow-[0_10px_35px_rgba(0,0,0,0.85)] animate-[slideUp_150ms_ease-out]">
      
      {/* Metrics Section */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-3.5 text-xs text-slate-200">
        
        {/* Selected CTRCs Count Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md text-[11px] min-w-[22px] text-center shadow-md">
            {selectedCount}
          </span>
          <span className="text-slate-300 font-extrabold uppercase tracking-wide text-[10px]">
            {selectedCount === 1 ? 'Lote Selecionado' : 'Lotes Selecionados'}
          </span>
        </div>

        <div className="h-5 w-px bg-[#1e2d4e]"></div>

        {/* Physical Totals */}
        <div className="font-mono text-slate-300 font-bold shrink-0 text-[11px]">
          ⚖️ Peso: <span className="text-emerald-400 font-black">{formattedWeight}</span>
        </div>

        <div className="h-5 w-px bg-[#1e2d4e] hidden sm:block"></div>

        <div className="font-mono text-slate-300 font-bold shrink-0 text-[11px]">
          📦 Vols: <span className="text-yellow-450 font-black">{selectedVolume}</span>
        </div>

        <div className="h-4 w-px bg-[#1e2d4e] hidden sm:block"></div>

        {/* Selected distinct routes count */}
        <div className="text-slate-300 font-bold font-mono shrink-0 text-[11px]">
          🧭 Rotas: <span className="text-sky-400 font-black">{uniqueSelectedRoutesCount}</span>
        </div>

        <div className="h-5 w-px bg-[#1e2d4e]"></div>

        {/* Strategic category breakdown badges */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {counts.urgent > 0 && (
            <span className="bg-red-500/15 text-red-400 font-bold text-[9px] px-1.5 py-0.2 rounded border border-red-500/30 font-mono">
              🚨 {counts.urgent} URGENTES
            </span>
          )}
          {counts.priority > 0 && (
            <span className="bg-amber-500/15 text-amber-405 font-bold text-[9px] px-1.5 py-0.2 rounded border border-amber-500/30 font-mono">
              ✨ {counts.priority} PRIORID.
            </span>
          )}
          {counts.segurar > 0 && (
            <span className="bg-orange-500/20 text-orange-400 font-black text-[9px] px-1.5 py-0.2 rounded border border-orange-500/40 font-mono animate-pulse">
              ⏸️ {counts.segurar} SEGURADOS
            </span>
          )}
          {counts.naoSaiHoje > 0 && (
            <span className="bg-slate-800 text-slate-400 font-bold text-[9px] px-1.5 py-0.2 rounded border border-slate-700 font-mono">
              🚫 {counts.naoSaiHoje} DEFERIDOS
            </span>
          )}
          {counts.semLoc > 0 && (
            <span className="bg-[#1e1b4b] text-indigo-300 font-medium text-[9px] px-1.5 py-0.2 rounded border border-indigo-500/30 font-mono">
              📍 {counts.semLoc} SEM LOC
            </span>
          )}
        </div>

      </div>

      {/* Action CTA Panel with Hold Safety Checks */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Soft warning alert (clearly visible, non-blocking) */}
        {hasSpecialAlert && (
          <div className="bg-red-650/20 border border-red-500/45 text-red-400 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded animate-pulse select-none max-w-xs truncate" title="Atenção: A seleção possui cargas seguradas ou despriorizadas.">
            ⚠️ Contém Cargas Seguradas/NÃO SAI
          </div>
        )}

        <button
          onClick={onClearSelection}
          className="text-[10.5px] text-slate-400 hover:text-white uppercase font-black tracking-wider px-2.5 py-1.5 hover:bg-slate-800/40 rounded-lg transition-all duration-150 cursor-pointer select-none"
        >
          Limpar
        </button>

        {/* Consolidar Rota trigger */}
        <button
          onClick={onOpenConsolidacao}
          className={`font-black text-[11px] uppercase tracking-wider px-4.5 py-2.5 rounded-lg transition-all duration-150 active:scale-97 cursor-pointer flex items-center gap-2 shadow-lg ${
            hasSpecialAlert
              ? 'bg-amber-600 hover:bg-amber-550 border border-amber-500/50 text-white'
              : 'bg-indigo-650 hover:bg-indigo-600 border border-indigo-550 text-white'
          }`}
        >
          <span>Consolidar Rota</span>
          <span className="text-[11px]">→</span>
        </button>
      </div>

    </div>
  );
}
