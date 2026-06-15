import React, { useMemo } from 'react';
import { RoteirizacaoItem } from '../../types';

interface SelectionSummaryProps {
  selectedCtrcs: RoteirizacaoItem[];
  onOpenConsolidacao: () => void;
  onClearSelection: () => void;
  densityMode?: 'compact' | 'default' | 'comfortable';
  onGeneratePreRomaneio?: () => void;
}

export default function SelectionSummary({
  selectedCtrcs,
  onOpenConsolidacao,
  onClearSelection,
  densityMode = 'default',
  onGeneratePreRomaneio,
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
    let naoRoteirizavel = 0;

    for (const item of selectedCtrcs) {
      if (item.planningStatus === 'URGENTE') urgent++;
      if (item.planningStatus === 'PRIORIDADE') priority++;
      if (item.planningStatus === 'SEGURAR') segurar++;
      if (item.planningStatus === 'NAO_SAI_HOJE') naoSaiHoje++;
      if (item.routingEligibility === 'NAO_ROTEIRIZAVEL') naoRoteirizavel++;
      
      const hasNoLoc = !item.localizacao || item.localizacao.trim() === '' || (item.locationLabel || '').toUpperCase().includes('SEM BOX');
      if (hasNoLoc) semLoc++;
    }

    return { urgent, priority, segurar, naoSaiHoje, semLoc, naoRoteirizavel };
  }, [selectedCtrcs]);

  const hasSpecialAlert = counts.segurar > 0 || counts.naoSaiHoje > 0 || counts.naoRoteirizavel > 0;

  // Format weight to tons with 1 decimal place if >= 1000 kg, else kilograms
  const formattedWeight = useMemo(() => {
    if (selectedWeight >= 1000) {
      return `${(selectedWeight / 1000).toFixed(1)}t`;
    }
    return `${selectedWeight} kg`;
  }, [selectedWeight]);

  // Design Variables based on density mode
  const isCompact = densityMode === 'compact';
  const isComfortable = densityMode === 'comfortable';

  // Bar container classes
  const barClass = `fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-6xl bg-[#111929]/95 backdrop-blur-md border border-indigo-500/40 z-40 shrink-0 shadow-[0_10px_35px_rgba(0,0,0,0.85)] animate-[slideUp_150ms_ease-out] flex flex-wrap gap-2 items-center justify-between ${
    isCompact 
      ? 'bottom-2 min-h-[46px] py-1 px-3.5 rounded-lg' 
      : 'bottom-4 min-h-[66px] py-3 px-5 rounded-2xl'
  }`;

  // Badges and text class sizes
  const metricsOuterClass = `flex flex-wrap items-center text-slate-200 ${
    isCompact ? 'gap-2 text-[10.5px]' : 'gap-4.5 text-[13.5px]'
  }`;

  const boldCountClass = `bg-indigo-600 text-white font-black text-center shadow-md ${
    isCompact 
      ? 'px-1.5 py-0.2 text-[10px] min-w-[18px] rounded' 
      : 'px-2.5 py-1 text-[13px] min-w-[26px] rounded-lg'
  }`;

  const countLabelClass = `text-slate-300 font-extrabold uppercase tracking-wide shrink-0 ${
    isCompact ? 'text-[9px]' : 'text-[12px]'
  }`;

  const sepClass = `w-px bg-[#1e2d4e] ${isCompact ? 'h-4' : 'h-6'}`;

  // Individual parameters fonts
  const fontAndSizeClass = `font-mono text-slate-300 font-bold shrink-0 ${
    isCompact ? 'text-[10px]' : 'text-[13px]'
  }`;

  // Custom alert badges
  const alertBadgeClass = `font-bold font-mono ${
    isCompact ? 'text-[8px] px-1 py-0.2 rounded' : 'text-[11px] px-2 py-0.5 rounded border'
  }`;

  // Right section sizing
  const actionWrapperClass = `flex items-center shrink-0 ${
    isCompact ? 'gap-2' : 'gap-4'
  }`;

  const warningLabelClass = `border border-red-500/45 text-red-00 font-extrabold uppercase tracking-wide bg-red-650/20 text-red-400 rounded animate-pulse select-none max-w-xs truncate ${
    isCompact ? 'text-[8.5px] px-1.5 py-0.5' : 'text-[12px] px-2.5 py-1.5'
  }`;

  const btnClearClass = `text-slate-400 hover:text-white uppercase font-black tracking-wider transition-all duration-150 cursor-pointer select-none leading-none ${
    isCompact 
      ? 'text-[9.5px] px-2 py-1' 
      : 'text-[12px] px-3.5 py-2.5 hover:bg-slate-800/40 rounded-xl'
  }`;

  const btnConsolidatorClass = `font-black uppercase tracking-wider transition-all duration-150 active:scale-97 cursor-pointer flex items-center gap-2 shadow-lg leading-none ${
    isCompact 
      ? 'text-[10px] px-3 py-2 rounded-md' 
      : 'text-[13px] px-5 py-3 rounded-xl'
  } ${
    hasSpecialAlert
      ? 'bg-amber-600 hover:bg-amber-550 border border-amber-500/50 text-white'
      : 'bg-indigo-650 hover:bg-indigo-600 border border-indigo-550 text-white'
  }`;

  const btnPreRomaneioClass = `font-black uppercase tracking-wider transition-all duration-150 active:scale-97 cursor-pointer flex items-center gap-2 shadow-lg leading-none ${
    isCompact 
      ? 'text-[10px] px-3 py-2 rounded-md' 
      : 'text-[13px] px-5 py-3 rounded-xl'
  } bg-emerald-650 hover:bg-emerald-600 border border-emerald-550 text-white`;

  return (
    <div className={barClass}>
      
      {/* Metrics Section */}
      <div className={metricsOuterClass}>
        
        {/* Selected CTRCs Count Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={boldCountClass}>
            {selectedCount}
          </span>
          <span className={countLabelClass}>
            {selectedCount === 1 ? 'Lote Selecionado' : 'Lotes Selecionados'}
          </span>
        </div>

        <div className={sepClass}></div>

        {/* Physical Totals */}
        <div className={fontAndSizeClass}>
          ⚖️ Peso: <span className="text-emerald-400 font-black">{formattedWeight}</span>
        </div>

        <div className={`${sepClass} hidden sm:block`}></div>

        <div className={fontAndSizeClass}>
          📦 Vols: <span className="text-yellow-450 font-black">{selectedVolume}</span>
        </div>

        <div className={`${sepClass} hidden sm:block`}></div>

        {/* Selected distinct routes count */}
        <div className={fontAndSizeClass}>
          🧭 Rotas: <span className="text-sky-400 font-black">{uniqueSelectedRoutesCount}</span>
        </div>

        <div className={sepClass}></div>

        {/* Strategic category breakdown badges */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {counts.urgent > 0 && (
            <span className={`${alertBadgeClass} bg-red-500/15 text-red-400 ${isCompact ? '' : 'border-red-500/30'}`}>
              🚨 {counts.urgent} URGENTES
            </span>
          )}
          {counts.priority > 0 && (
            <span className={`${alertBadgeClass} bg-amber-500/15 text-amber-405 ${isCompact ? '' : 'border-amber-500/30'}`}>
              ✨ {counts.priority} PRIORID.
            </span>
          )}
          {counts.segurar > 0 && (
            <span className={`${alertBadgeClass} bg-orange-500/20 text-orange-400 animate-pulse ${isCompact ? '' : 'border-orange-500/40'}`}>
              ⏸️ {counts.segurar} SEGURADOS
            </span>
          )}
          {counts.naoSaiHoje > 0 && (
            <span className={`${alertBadgeClass} bg-slate-800 text-slate-400 ${isCompact ? '' : 'border-slate-700'}`}>
              🚫 {counts.naoSaiHoje} DEFERIDOS
            </span>
          )}
          {counts.semLoc > 0 && (
            <span className={`${alertBadgeClass} bg-[#1e1b4b] text-indigo-300 ${isCompact ? '' : 'border-indigo-500/30'}`}>
              📍 {counts.semLoc} SEM LOC
            </span>
          )}
          {counts.naoRoteirizavel > 0 && (
            <span className={`${alertBadgeClass} bg-red-950/40 text-red-400 border-red-500/40 animate-pulse`}>
              🚫 {counts.naoRoteirizavel} NÃO ROTEIRIZÁVEIS
            </span>
          )}
        </div>

      </div>

      {/* Action CTA Panel with Hold Safety Checks */}
      <div className={actionWrapperClass}>
        
        {/* Soft warning alert (clearly visible, non-blocking) */}
        {counts.naoRoteirizavel > 0 ? (
          <div className="border border-red-500 text-red-400 font-extrabold uppercase bg-red-950/20 rounded animate-pulse select-none" style={{ fontSize: isCompact ? '8.5px' : isComfortable ? '11px' : '10px', padding: isCompact ? '2px 6px' : '4px 8px' }} title="Atenção: A seleção contém cargas não roteirizáveis">
            ⚠️ NÃO ROTEIRIZÁVEL SELECIONADO
          </div>
        ) : hasSpecialAlert ? (
          <div className={warningLabelClass} title="Atenção: A seleção possui cargas seguradas ou despriorizadas.">
            ⚠️ Carga Segura/NÃO SAI
          </div>
        ) : null}

        <button
          onClick={onClearSelection}
          className={btnClearClass}
        >
          Limpar
        </button>

        {/* Pré-Romaneio Action */}
        {onGeneratePreRomaneio && (
          <button
            onClick={onGeneratePreRomaneio}
            className={btnPreRomaneioClass}
            title="Gerar Pré-Romaneio de separação por rota/portão"
          >
            <span>📦 Pré-Separar</span>
          </button>
        )}

        {/* Consolidar Rota trigger */}
        <button
          onClick={onOpenConsolidacao}
          className={btnConsolidatorClass}
        >
          <span>Consolidar Rota</span>
          <span>→</span>
        </button>
      </div>

    </div>
  );
}
