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

  // Aggregate selected values inside the summary footer bar
  const selectedWeight = useMemo(() => {
    return selectedCtrcs.reduce((sum, item) => sum + (item.peso_r || item.weight || 0), 0);
  }, [selectedCtrcs]);

  const selectedVolume = useMemo(() => {
    return selectedCtrcs.reduce((sum, item) => sum + (item.volume || 1), 0);
  }, [selectedCtrcs]);

  const selectedValue = useMemo(() => {
    return selectedCtrcs.reduce((sum, item) => sum + (item.valor || 0), 0);
  }, [selectedCtrcs]);

  const uniqueCities = useMemo(() => {
    return new Set(selectedCtrcs.map((item) => item.normCidade?.trim().toUpperCase() || '')).size;
  }, [selectedCtrcs]);

  const delayedCount = useMemo(() => {
    return selectedCtrcs.filter((item) => item.slaStatus?.isDelayed).length;
  }, [selectedCtrcs]);

  // Format weight to tons with 1 decimal place if it's 1000 kg or greater, else keep as kilograms
  const formattedWeight = useMemo(() => {
    if (selectedWeight >= 1000) {
      return `${(selectedWeight / 1000).toFixed(1)}t`;
    }
    return `${selectedWeight} kg`;
  }, [selectedWeight]);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-5xl bg-[#121c33]/95 backdrop-blur-md border border-indigo-500/40 h-12 px-5 py-2.5 rounded-xl flex items-center justify-between z-40 shrink-0 shadow-[0_10px_25px_rgba(0,0,0,0.6)] animate-[slideUp_150ms_ease-out]">
      
      {/* 1. Left Section - Metrics and Status highlights */}
      <div className="flex items-center gap-3.5 sm:gap-4.5 text-xs text-slate-200">
        
        {/* Selected CTRCs Count Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-indigo-650 text-white font-black px-2 py-0.5 rounded-md text-[11px] min-w-[22px] text-center shadow-md">
            {selectedCount}
          </span>
          <span className="text-indigo-200 font-extrabold uppercase tracking-wide text-[10px]">
            {selectedCount === 1 ? 'CTRC Selecionado' : 'CTRCs Selecionados'}
          </span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e]"></div>

        {/* Weight indicator */}
        <div className="font-mono text-slate-300 font-bold shrink-0">
          ⚖️ <span className="text-emerald-400 font-black">{formattedWeight}</span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e]"></div>

        {/* Volumes */}
        <div className="font-mono text-slate-300 font-bold shrink-0">
          📦 <span className="text-yellow-400 font-black">{selectedVolume}</span> <span className="text-slate-400 text-[10px]">VOL</span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e]"></div>

        {/* Cities */}
        <div className="text-slate-300 font-bold font-mono shrink-0">
          📍 <span className="text-sky-400 font-black">{uniqueCities}</span> {uniqueCities === 1 ? 'PRAÇA' : 'PRAÇAS'}
        </div>

        {/* Separator & Delayed highlights (rendered dynamically only if count > 0) */}
        {delayedCount > 0 && (
          <>
            <div className="h-5 w-px bg-[#1e2d4e]"></div>
            <div className="text-red-400 font-bold font-mono animate-pulse shrink-0">
              ⚠️ <span className="font-black text-rose-500">{delayedCount}</span> {delayedCount === 1 ? 'ATRASADO' : 'ATRASADOS'}
            </div>
          </>
        )}

        {/* Option value highlight on wider screens */}
        <div className="h-5 w-px bg-[#1e2d4e] hidden lg:block"></div>
        <div className="text-slate-400 font-mono hidden lg:block">
          VALOR: <span className="text-indigo-300 font-bold">R$ {selectedValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
        </div>

      </div>

      {/* 2. Right Section - Execution Controls CTA */}
      <div className="flex items-center gap-3">
        {/* Clear selection lever */}
        <button
          onClick={onClearSelection}
          className="text-[10.5px] text-slate-400 hover:text-white uppercase font-black tracking-wider px-2.5 py-1.5 hover:bg-slate-800/40 rounded-lg transition-all duration-150 cursor-pointer"
        >
          Limpar
        </button>

        {/* Major CTA Button: Consolidar Rota */}
        <button
          onClick={onOpenConsolidacao}
          className="bg-indigo-650 hover:bg-indigo-550 border border-indigo-500/50 hover:border-indigo-400/60 shadow-lg text-white font-black text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-lg transition-all duration-150 active:scale-97 cursor-pointer flex items-center gap-1.5"
        >
          <span>Consolidar Rota</span>
          <span className="text-[11px]">→</span>
        </button>
      </div>

    </div>
  );
}
