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

  // Decision counts aggregator
  const counts = useMemo(() => {
    let vai = 0;
    let atencao = 0;
    let naoVai = 0;

    for (const item of selectedCtrcs) {
      const status = item.availabilityStatus ? item.availabilityStatus.toLowerCase() : '';
      const occurrenceCri = (item.occurrenceCriticality || '') as string;

      if (
        occurrenceCri === 'CRÍTICA' ||
        status === 'retido' ||
        status === 'problema' ||
        status === 'devolução'
      ) {
        naoVai++;
      } else if (
        item.isCurvaA ||
        item.slaStatus?.isDelayed ||
        item.normPriority === 'CRÍTICA' ||
        item.slaStatus?.isToday ||
        item.slaStatus?.daysDiff === 1 ||
        (item.occurrenceCode && occurrenceCri !== 'CRÍTICA') ||
        item.pesoStatus?.category === 'CRÍTICO' ||
        item.pesoStatus?.category === 'PESADO' ||
        status === 'aguardando'
      ) {
        atencao++;
      } else {
        vai++;
      }
    }
    return { vai, atencao, naoVai };
  }, [selectedCtrcs]);

  const hasBloqueados = counts.naoVai > 0;

  // Format weight to tons with 1 decimal place if it's 1000 kg or greater, else keep as kilograms
  const formattedWeight = useMemo(() => {
    if (selectedWeight >= 1000) {
      return `${(selectedWeight / 1000).toFixed(1)}t`;
    }
    return `${selectedWeight} kg`;
  }, [selectedWeight]);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-5xl bg-[#111929]/95 backdrop-blur-md border border-indigo-500/40 min-h-[52px] py-2 px-4 rounded-xl flex flex-wrap gap-2 items-center justify-between z-40 shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.7)] animate-[slideUp_150ms_ease-out]">
      
      {/* 1. Left Section - Metrics and Status highlights */}
      <div className="flex flex-wrap items-center gap-2 sm: gap-3 md:gap-3.5 text-xs text-slate-200">
        
        {/* Selected CTRCs Count Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md text-[11px] min-w-[22px] text-center shadow-md">
            {selectedCount}
          </span>
          <span className="text-slate-300 font-extrabold uppercase tracking-wide text-[10px]">
            {selectedCount === 1 ? 'Selecionado' : 'Selecionados'}
          </span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e] hidden sm:block"></div>

        {/* Weight indicator */}
        <div className="font-mono text-slate-300 font-bold shrink-0 text-[11px]">
          ⚖️ <span className="text-emerald-450 font-black">{formattedWeight}</span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e] hidden sm:block"></div>

        {/* Volumes */}
        <div className="font-mono text-slate-300 font-bold shrink-0 text-[11px]">
          📦 <span className="text-yellow-450 font-black">{selectedVolume}</span> <span className="text-slate-500 text-[9.5px]">VOL</span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e] hidden md:block"></div>

        {/* Cities */}
        <div className="text-slate-300 font-bold font-mono shrink-0 text-[11px] hidden md:block">
          📍 <span className="text-sky-400 font-black">{uniqueCities}</span> {uniqueCities === 1 ? 'PRAÇA' : 'PRAÇAS'}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2d4e]"></div>

        {/* Real-time batch diagnostics pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {counts.vai > 0 && (
            <span className="bg-emerald-500/10 text-emerald-400 font-bold text-[9.5px] px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
              {counts.vai} VÃO
            </span>
          )}
          {counts.atencao > 0 && (
            <span className="bg-amber-500/10 text-amber-500 font-bold text-[9.5px] px-1.5 py-0.2 rounded border border-amber-500/20 font-mono">
              {counts.atencao} ATENÇÃO
            </span>
          )}
          {counts.naoVai > 0 && (
            <span className="bg-red-500/10 text-red-400 font-bold text-[9.5px] px-1.5 py-0.2 rounded border border-red-500/25 font-mono animate-pulse">
              {counts.naoVai} BLOQUEADO
            </span>
          )}
        </div>

      </div>

      {/* 2. Right Section - Execution Controls CTA */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Warning Indicator */}
        {hasBloqueados && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded animate-pulse">
            ⚠️ Seleção contém bloqueios
          </div>
        )}

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
          className={`font-black text-[11px] uppercase tracking-wider px-4.5 py-2 rounded-lg transition-all duration-150 active:scale-97 cursor-pointer flex items-center gap-2 shadow-lg ${
            hasBloqueados
              ? 'bg-amber-600 hover:bg-amber-550 border border-amber-500/60 text-white'
              : 'bg-indigo-650 hover:bg-indigo-600 border border-indigo-550 text-white'
          }`}
        >
          <span>{hasBloqueados ? 'Prosseguir mesmo com Bloqueio' : 'Consolidar Rota'}</span>
          <span className="text-[11px]">→</span>
        </button>
      </div>

    </div>
  );
}
