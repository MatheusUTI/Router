import React, { useState, useEffect } from 'react';
import { RoteirizacaoItem, RoutePlanningItem, PlanningStatus, PlanningPriority } from '../../types';
import { MoreVertical, X, Calendar, AlertCircle, Star, PauseCircle, Ban, RefreshCw } from 'lucide-react';

interface CargaItemProps {
  key?: React.Key | string;
  item: RoteirizacaoItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onUpdatePlanning?: (ctrcId: string, patch: Partial<RoutePlanningItem>) => void;
  densityMode?: 'compact' | 'default' | 'comfortable';
}

const resolveStatusColor = (statusStr: string): { bg: string; text: string; border: string } => {
  const norm = (statusStr || '').toUpperCase();
  if (norm === 'DISPONÍVEL' || norm === 'DISPONIVEL' || norm === 'LIBERADO') {
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  }
  if (norm.includes('AGUARDANDO') || norm.includes('BOX') || norm === 'AGUARDANDO DESCARGA') {
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/10' };
  }
  if (norm.includes('RETIDO') || norm.includes('PROBLEMA') || norm.includes('DEVOLUÇÃO') || norm.includes('RECUSADO') || norm.includes('RETIDO/PROBLEMA')) {
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
  }
  if (norm.includes('TRANSFERÊNCIA') || norm.includes('EM ROTA') || norm.includes('TRANSFER') || norm.includes('ROTA') || norm.includes('EM TRANSFERÊNCIA')) {
    return { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' };
  }
  if (norm.includes('AGENDADO') || norm.includes('AGENDAMENTO')) {
    return { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/20' };
  }
  return { bg: 'bg-[#101a2e]', text: 'text-slate-350', border: 'border-slate-800' };
};

const resolvePlanningStyle = (status: PlanningStatus | undefined) => {
  switch (status) {
    case 'URGENTE':
      return {
        label: 'URG',
        borderClass: 'border-l-red-500',
        badgeBg: 'bg-red-500/15 text-red-400 border-red-500/20 font-black',
        textClass: 'text-red-400',
        cardBg: 'bg-red-950/[0.015] hover:bg-red-950/[0.035]',
      };
    case 'PRIORIDADE':
      return {
        label: 'PRI',
        borderClass: 'border-l-amber-500',
        badgeBg: 'bg-amber-500/15 text-amber-405 border-amber-500/20 font-bold',
        textClass: 'text-amber-450',
        cardBg: 'bg-amber-950/[0.015] hover:bg-amber-950/[0.035]',
      };
    case 'SEGURAR':
      return {
        label: 'SEG',
        borderClass: 'border-l-orange-500',
        badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/25 font-black',
        textClass: 'text-orange-400',
        cardBg: 'bg-orange-950/[0.025] hover:bg-orange-950/[0.055]',
      };
    case 'NAO_SAI_HOJE':
      return {
        label: 'NÃO',
        borderClass: 'border-l-slate-700',
        badgeBg: 'bg-slate-900/40 text-slate-500 border-slate-705/25',
        textClass: 'text-slate-500 line-through',
        cardBg: 'bg-slate-950/20 hover:bg-slate-900/20 opacity-55 saturate-[45%]',
      };
    case 'AGENDADO':
      return {
        label: 'AGD',
        borderClass: 'border-l-cyan-500',
        badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
        textClass: 'text-cyan-300',
        cardBg: 'bg-cyan-950/[0.01] hover:bg-cyan-950/[0.035]',
      };
    case 'CONSOLIDADO':
      return {
        label: 'CONS',
        borderClass: 'border-l-emerald-500',
        badgeBg: 'bg-emerald-500/15 text-emerald-450 border-emerald-500/25 font-black',
        textClass: 'text-emerald-450',
        cardBg: 'bg-emerald-950/[0.015] hover:bg-emerald-950/[0.035]',
      };
    case 'PLANEJADO':
      return {
        label: 'PLAN',
        borderClass: 'border-l-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        textClass: 'text-emerald-450',
        cardBg: 'bg-emerald-950/[0.005] hover:bg-emerald-950/[0.02]',
      };
    case 'A_PLANEJAR':
    default:
      return {
        label: 'PEND',
        borderClass: 'border-l-indigo-500/20',
        badgeBg: 'bg-slate-900 text-slate-405 border-slate-805',
        textClass: 'text-slate-400',
        cardBg: 'bg-slate-950/10 hover:bg-slate-950/20',
      };
  }
};

export default function CargaItem({
  item,
  isSelected,
  onToggle,
  onUpdatePlanning,
  densityMode = 'default',
}: CargaItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [typedRoute, setTypedRoute] = useState(item.operationalRoute || '');
  const [typedNote, setTypedNote] = useState(item.operationalNote || '');

  // Keep internal states synced with latest database items
  useEffect(() => {
    setTypedRoute(item.operationalRoute || '');
    setTypedNote(item.operationalNote || '');
  }, [item.operationalRoute, item.operationalNote]);

  const pStyle = resolvePlanningStyle(item.planningStatus);

  // Dynamic density classes
  const padOuterY = densityMode === 'compact' ? 'py-0.5' : densityMode === 'comfortable' ? 'py-2.5' : 'py-1';
  const padBlock2 = densityMode === 'compact' ? 'py-0.5 pl-2 pr-1' : densityMode === 'comfortable' ? 'py-2.5 pl-3 pr-2' : 'py-1 pl-2.5 pr-1.5';
  const padBlock3 = densityMode === 'compact' ? 'py-0.5 px-2' : densityMode === 'comfortable' ? 'py-2.5 px-3' : 'py-1 px-2.5';
  const padBlock4 = densityMode === 'compact' ? 'py-0.5 px-2 gap-0' : densityMode === 'comfortable' ? 'py-2.5 px-3 gap-1.5' : 'py-1 px-2.5 gap-0.5';
  const padBlock5 = densityMode === 'compact' ? 'py-0.5 px-2 gap-0' : densityMode === 'comfortable' ? 'py-2.5 px-3 gap-1.5' : 'py-1 px-2.5 gap-0.5';

  // Dropdown density dynamic styles
  const isCompact = densityMode === 'compact';
  const isComfortable = densityMode === 'comfortable';

  const dropWidth = isCompact ? 'w-[235px]' : isComfortable ? 'w-[305px]' : 'w-[270px]';
  const dropHeaderPad = isCompact ? 'px-2.5 py-2' : isComfortable ? 'px-3.5 py-3' : 'px-3 py-2.5';
  const dropHeaderText = isCompact ? 'text-[9.5px]' : isComfortable ? 'text-[11.5px]' : 'text-[10px]';
  const dropBlockPad = isCompact ? 'p-2.5 gap-1' : isComfortable ? 'p-4 gap-2' : 'p-3 gap-1.5';
  
  const labelTextSize = isCompact ? 'text-[8px]' : isComfortable ? 'text-[9.5px]' : 'text-[8.5px]';
  const inputPadY = isCompact ? 'py-1 px-2 text-[10px]' : isComfortable ? 'py-2 px-2.5 text-[11.5px]' : 'py-1.5 px-2 text-[10.5px]';
  const buttonPadY = isCompact ? 'px-2 py-1 text-[8.5px]' : isComfortable ? 'px-3.5 py-2 text-[10px]' : 'px-3 py-1.5 text-[9px]';
  
  const priorityHeaderLabel = isCompact ? 'px-2.5 py-1 text-[7.5px]' : isComfortable ? 'px-3.5 py-1 text-[9px]' : 'px-3 py-1 text-[8px]';
  const priorityBtnPad = isCompact ? 'px-2.5 py-1.5 text-[9px]' : isComfortable ? 'px-3.5 py-2.5 text-[11px]' : 'px-3 py-2 text-[10px]';
  const tagTextSize = isCompact ? 'text-[7px]' : isComfortable ? 'text-[8px]' : 'text-[7.5px]';

  const resetBtnPad = isCompact ? 'py-1 text-[8.5px]' : isComfortable ? 'py-2 text-[10px]' : 'py-1.5 text-[9px]';

  return (
    <div
      onClick={() => {
        if (item.planningStatus !== 'CONSOLIDADO') {
          onToggle(item.id);
        }
      }}
      className={`border-b border-[#14203a]/45 grid grid-cols-[24px_minmax(140px,0.85fr)_minmax(250px,1.4fr)_minmax(310px,1.55fr)_minmax(110px,0.45fr)_36px] items-stretch select-none transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'bg-indigo-650/[0.07] shadow-[inset_2px_0_0_#4f46e5,inset_0_0_6px_rgba(99,102,241,0.03)]' 
          : pStyle.cardBg
      } hover:shadow-[0_1px_4px_rgba(0,0,0,0.25)] group w-full ${dropdownOpen ? 'relative z-40 overflow-visible' : 'relative z-10 overflow-visible'}`}
    >
      {/* Block 1: [FAIXA LATERAL COMPACTA] (24px) */}
      <div 
        className={`shrink-0 flex flex-col items-center justify-start ${padOuterY} px-0.5 gap-1.5 font-mono select-none border-l-[2px] ${pStyle.borderClass} ${pStyle.badgeBg}`}
        style={{ minWidth: '24px', maxWidth: '24px' }}
      >
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (item.planningStatus !== 'CONSOLIDADO') {
              onToggle(item.id);
            }
          }} 
          className="flex items-center justify-center shrink-0 mt-0.5"
        >
          <input
            type="checkbox"
            id={`checkbox-carga-${item.id}`}
            checked={isSelected}
            disabled={item.planningStatus === 'CONSOLIDADO'}
            onChange={() => {}}
            className="w-3 h-3 cursor-pointer rounded-sm border-slate-700 bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
        <div className="[writing-mode:vertical-lr] rotate-180 font-black tracking-widest uppercase text-[7px] leading-none whitespace-nowrap shrink-0 mt-0.5 scale-95">
          {pStyle.label}
        </div>
      </div>

      {/* Block 2: [BLOCO ROTA] - Cidade de Destaque e Linha Direcional */}
      <div className={`min-w-0 flex flex-col justify-center text-left ${padBlock2} select-text leading-tight`}>
        <span className="text-white hover:text-indigo-200 font-extrabold text-[12px] uppercase tracking-wide truncate block" title={item.normCidade}>
          {item.normCidade || 'LOCALIDADE IND'}
        </span>
        
        <div className="flex flex-col gap-0.5 mt-0.5 leading-none">
          {/* Main Directing Route */}
          <div className="flex items-center gap-1 flex-wrap text-[10px]">
            <span className="text-indigo-400 font-black uppercase">
              {item.effectiveRoute || 'SEM ROTA'}
            </span>
            {item.isManualRoute && (
              <span className="text-orange-400 font-extrabold uppercase text-[8px] tracking-tight shrink-0 select-none">
                • MANUAL
              </span>
            )}
            {item.planningStatus === 'SEGURAR' && (
              <span className="text-red-400 font-extrabold uppercase text-[8px] tracking-tight shrink-0 select-none">
                • SEGURAR
              </span>
            )}
          </div>

          {/* Suggested route if Manual overwrite is active */}
          {item.isManualRoute && item.suggestedRoute && (
            <span className="text-slate-500 font-bold font-mono text-[8.5px] block truncate" title={`Sugestão: ${item.suggestedRoute}`}>
              Sug.: {item.suggestedRoute}
            </span>
          )}
        </div>
      </div>

      {/* Block 3: [BLOCO IDENTIDADE] - Destinatário, Remetente, CTRC e NF */}
      <div className={`min-w-0 flex flex-col justify-center text-left ${padBlock3} gap-0.5 select-text border-l border-[#131f38]/15`}>
        <div className="flex items-center gap-1 leading-none truncate w-full">
          <span className="text-slate-4a5 font-black select-none shrink-0 text-[8.5px] tracking-tight">DEST:</span>
          <span className="text-slate-100 font-semibold truncate block uppercase text-[10.5px] tracking-wide" title={item.destinatario}>
            {item.destinatario}
          </span>
        </div>

        <div className="flex items-center gap-1 leading-none truncate w-full mt-0.5">
          <span className="text-slate-4a5 font-black select-none shrink-0 text-[8.5px] tracking-tight">REM:</span>
          <span 
            className={`font-semibold truncate block uppercase text-[10.5px] tracking-wide ${
              item.isCurvaA 
                ? 'text-purple-300 bg-purple-500/12 px-1 py-0.2 rounded border border-purple-500/20' 
                : 'text-slate-350'
            }`}
            title={item.remetente}
          >
            {item.remetente || 'REMETENTE VAGO'}
            {item.isCurvaA && <span className="text-[8px] font-black text-purple-400 ml-1 select-none">[★ CURVA A]</span>}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-mono select-text font-black mt-0.5 leading-none text-indigo-350">
          <span>CTRC: {item.id}</span>
          <span>•</span>
          <span>NF: {item.nf || 'S/N'}</span>
          {item.isFob && (
            <span className="bg-amber-500/10 text-amber-400 font-bold text-[7.5px] px-1 py-0.2 rounded border border-amber-500/20 shrink-0 select-none leading-none">
              FOB
            </span>
          )}
        </div>
      </div>

      {/* Block 4: [BLOCO OPERACIONAL] - SLA, Ocorrência, Disponibilidade e Localização */}
      <div className={`min-w-0 ${padBlock4} flex flex-col justify-center leading-tight border-l border-[#131f38]/15`}>
        
        {/* Line 1: SLA and date parameters */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold font-mono text-slate-400 leading-none">
          <span>PREV: {item.prev_ent ? item.prev_ent.slice(0, 5) : 'S/P'}</span>
          <span>•</span>
          <span className={`font-black rounded-sm border px-1 py-0.2 text-[8px] leading-none ${item.slaStatus?.bgClass || 'bg-slate-900/30'} ${item.slaStatus?.textClass || 'text-slate-400 border-slate-755/25'}`}>
            {item.slaStatus?.label || 'D+0'}
            {item.slaStatus?.daysDiff !== undefined && item.slaStatus.daysDiff > 0 && ` +${item.slaStatus.daysDiff}D`}
            {item.slaStatus?.isDelayed && ` ATRASADO`}
          </span>
          {(item.status === 'Agendamento' || item.planningStatus === 'AGENDADO') && (
            <span className="font-extrabold text-[#00f2fe] bg-cyan-950/20 px-1 rounded-sm border border-cyan-800/15 text-[7.5px] leading-none whitespace-nowrap">
              AGENDA
            </span>
          )}
        </div>

        {/* Line 2: Occurrence Code and Description */}
        <div className="min-w-0 text-[10px] leading-none select-text">
          {item.occurrenceCode ? (
            item.occurrenceDescription === 'Ocorrência não mapeada' ? (
              <span className="text-slate-400 font-bold block truncate text-[9px]">
                ⚠️ OC {item.occurrenceCode} • não mapeada
              </span>
            ) : item.occurrenceCriticality === 'CRÍTICA' ? (
              <span className="text-red-400 font-extrabold block truncate text-[9px]" title={item.occurrenceDescription}>
                🚨 OC {item.occurrenceCode} • {item.occurrenceDescription}
              </span>
            ) : item.occurrenceCriticality === 'MÉDIA' ? (
              <span className="text-amber-400 font-bold block truncate text-[9px]" title={item.occurrenceDescription}>
                ⚠️ OC {item.occurrenceCode} • {item.occurrenceDescription}
              </span>
            ) : (
              <span className="text-indigo-405 font-bold block truncate text-[9px]" title={item.occurrenceDescription}>
                ℹ️ OC {item.occurrenceCode} • {item.occurrenceDescription}
              </span>
            )
          ) : (
            <span className="text-emerald-550 font-bold uppercase text-[9px] tracking-tight">
              🟢 SEM OCORRÊNCIA
            </span>
          )}
        </div>

        {/* Line 3: Operational Availability Status and Physical Warehouse Location */}
        <div className="flex items-center gap-1.5 text-[9px] leading-none w-full min-w-0">
          {(() => {
            const displayStatus = (item.availabilityLabel || item.status || 'DISPONÍVEL').toUpperCase();
            const colors = resolveStatusColor(displayStatus);
            return (
              <span className={`font-mono font-black uppercase px-1 py-0.2 rounded-sm border text-[8px] shrink-0 leading-none ${colors.bg} ${colors.text} ${colors.border}`}>
                {displayStatus}
              </span>
            );
          })()}

          {item.locationLabel && (
            <span className="text-teal-400 font-mono text-[8.5px] truncate max-w-[190px]" title={item.locationLabel}>
              LOC: <span className="font-extrabold uppercase text-slate-200">{item.locationLabel.replace(/📍/g, '').trim()}</span>
            </span>
          )}
        </div>

        {/* Micro operational note banner */}
        {item.operationalNote && (
          <div className="text-[8.5px] font-medium text-amber-305 italic truncate" title={item.operationalNote}>
            Obs: {item.operationalNote}
          </div>
        )}
      </div>

      {/* Block 5: [BLOCO NÚMEROS] - Peso (kg), Volumes, Valor e Frete */}
      <div className={`min-w-0 flex flex-col items-end justify-center text-right leading-none ${padBlock5} shrink-0 whitespace-nowrap text-[9.5px] font-mono border-l border-[#131f38]/15 bg-[#070c14]/15`}>
        <span className="text-slate-105 font-black text-[12px] leading-none">
          {(item.peso_r || item.weight || 0).toLocaleString('pt-BR')} kg
        </span>
        <span className="text-amber-455 font-bold text-[9px] leading-none">
          {item.volume || 1} {item.volume === 1 ? 'vol' : 'vols'}
        </span>
        <span className="text-slate-400 text-[8.5px]">
          R$ {(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className="text-indigo-350 text-[8px] mt-0.5">
          Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Block 6: [BLOCO ACOES] - Discreet absolute priority dropdown & details editor */}
      <div className="flex items-center justify-center px-0.5 border-l border-[#131f38]/15 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-155 cursor-pointer ${
            dropdownOpen
              ? 'bg-red-950/40 text-red-500 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
              : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-slate-850'
          }`}
          title="Definir rota ou prioridade"
        >
          {dropdownOpen ? <X size={15} className="stroke-[2.5]" /> : <MoreVertical size={15} className="stroke-[2.5]" />}
        </button>

        {dropdownOpen && (
          <>
            {/* Click-away overlay specific to this item's dropdown */}
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setDropdownOpen(false)} 
            />

            {/* Absolute Dropdown body */}
            <div 
              className={`absolute top-full right-0 mt-2 bg-[#0b132a]/95 backdrop-blur-md border border-[#1d2d53] ${dropWidth} rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.95)] z-50 flex flex-col text-slate-200 select-none ${isCompact ? 'text-[9.2px]' : isComfortable ? 'text-[11.2px]' : 'text-[10px]'}`}
              style={{ filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.05))' }}
            >
              {/* Dropdown Header */}
              <div className={`${dropHeaderPad} bg-[#0e1732] border-b border-[#1c2e5c] flex items-center justify-between rounded-t-xl`}>
                <span className={`${dropHeaderText} font-sans font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5`}>
                  🛡️ Parâmetros CTRC {item.id}
                </span>
                <button 
                  onClick={() => setDropdownOpen(false)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
              
              {/* Option block 1: Route overwrite */}
              <div className={`${dropBlockPad} border-b border-[#16223f]/70 flex flex-col`}>
                <span className={`${labelTextSize} font-sans font-black text-indigo-350 uppercase tracking-wider block`}>
                  📍 Rota Operacional
                </span>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ex: ROTA 04"
                    value={typedRoute}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setTypedRoute(e.target.value.toUpperCase())}
                    className={`bg-[#05080f] border border-[#16223f] text-slate-100 placeholder-slate-650 font-mono font-bold rounded-lg focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 flex-1 uppercase tracking-wide ${inputPadY}`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePlanning?.(item.id, { operationalRoute: typedRoute || undefined });
                      setDropdownOpen(false);
                    }}
                    className={`bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white font-extrabold rounded-lg transition-all cursor-pointer uppercase shrink-0 leading-none shadow-sm ${buttonPadY}`}
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Option block 2: Priority modifiers */}
              <div className="flex flex-col py-1 border-b border-[#16223f]/70 bg-[#070c16]/30">
                <div className={`${priorityHeaderLabel} font-mono font-black text-slate-500 uppercase tracking-widest select-none`}>
                  Definir Alerta Prioridade
                </div>

                <button
                  onClick={() => {
                    onUpdatePlanning?.(item.id, { manualPriority: 'URGENTE', planningStatus: 'URGENTE' });
                    setDropdownOpen(false);
                  }}
                  className={`${priorityBtnPad} text-left hover:bg-red-500/10 text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                    item.planningStatus === 'URGENTE' ? 'bg-red-500/5 text-red-300 border-l-2 border-red-500 pl-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-red-405 shrink-0"><AlertCircle size={12} className="stroke-[2.5]" /></span>
                    <span className="font-extrabold tracking-wide uppercase group-hover/btn:text-red-300 w-full text-left">P0 / URGENTE</span>
                  </div>
                  <span className={`${tagTextSize} font-mono font-semibold text-red-500/60 bg-red-500/10 px-1 py-0.2 rounded border border-red-500/15 uppercase`}>CRÍTICO</span>
                </button>

                <button
                  onClick={() => {
                    onUpdatePlanning?.(item.id, { manualPriority: 'PRIORIDADE', planningStatus: 'PRIORIDADE' });
                    setDropdownOpen(false);
                  }}
                  className={`${priorityBtnPad} text-left hover:bg-amber-500/10 text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                    item.planningStatus === 'PRIORIDADE' ? 'bg-amber-500/5 text-amber-300 border-l-2 border-amber-500 pl-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 shrink-0"><Star size={12} className="fill-amber-400/20" /></span>
                    <span className="font-bold tracking-wide uppercase group-hover/btn:text-amber-300 w-full text-left">P1 / PRIORIDADE</span>
                  </div>
                  <span className={`${tagTextSize} font-mono font-semibold text-amber-500/60 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/15 uppercase`}>ALTO</span>
                </button>

                <button
                  onClick={() => {
                    onUpdatePlanning?.(item.id, { manualPriority: 'SEGURAR', planningStatus: 'SEGURAR' });
                    setDropdownOpen(false);
                  }}
                  className={`${priorityBtnPad} text-left hover:bg-orange-500/10 text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                    item.planningStatus === 'SEGURAR' ? 'bg-orange-500/5 text-orange-305 border-l-2 border-orange-550 pl-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 shrink-0"><PauseCircle size={12} /></span>
                    <span className="font-black tracking-wide uppercase group-hover/btn:text-orange-300 w-full text-left">SEGURAR CARGA</span>
                  </div>
                  <span className={`${tagTextSize} font-mono font-semibold text-orange-500/60 bg-orange-500/10 px-1 py-0.2 rounded border border-orange-500/15 uppercase`}>HOLD</span>
                </button>

                <button
                  onClick={() => {
                    onUpdatePlanning?.(item.id, { manualPriority: 'NAO_SAI_HOJE', planningStatus: 'NAO_SAI_HOJE' });
                    setDropdownOpen(false);
                  }}
                  className={`${priorityBtnPad} text-left hover:bg-slate-700/15 text-slate-400 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                    item.planningStatus === 'NAO_SAI_HOJE' ? 'bg-slate-900/50 text-slate-300 border-l-2 border-slate-600 pl-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 shrink-0"><Ban size={12} /></span>
                    <span className="font-semibold tracking-wide uppercase group-hover/btn:text-slate-300 w-full text-left">NÃO SAI HOJE</span>
                  </div>
                  <span className={`${tagTextSize} font-mono font-semibold text-slate-500/80 bg-slate-900 px-1 py-0.2 rounded border border-slate-700/30 uppercase`}>CORTE</span>
                </button>

                <button
                  onClick={() => {
                    onUpdatePlanning?.(item.id, { manualPriority: 'AGENDADO', planningStatus: 'AGENDADO' });
                    setDropdownOpen(false);
                  }}
                  className={`${priorityBtnPad} text-left hover:bg-cyan-500/10 text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                    item.planningStatus === 'AGENDADO' ? 'bg-cyan-500/5 text-cyan-300 border-l-2 border-cyan-500 pl-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 shrink-0"><Calendar size={12} /></span>
                    <span className="font-bold tracking-wide uppercase group-hover/btn:text-cyan-305 w-full text-left">AGENDADO</span>
                  </div>
                  <span className={`${tagTextSize} font-mono font-semibold text-cyan-500/60 bg-cyan-500/10 px-1 py-0.2 rounded border border-cyan-500/15 uppercase`}>DATA</span>
                </button>
              </div>

              {/* Option block 3: Note comment editor */}
              <div className={`${dropBlockPad} border-b border-[#16223f]/70 flex flex-col`}>
                <span className={`${labelTextSize} font-sans font-black text-indigo-350 uppercase tracking-wider block`}>
                  📝 Observação Operacional
                </span>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Ex: Aguardando docs..."
                    value={typedNote}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setTypedNote(e.target.value)}
                    className={`bg-[#05080f] border border-[#16223f] text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 flex-1 ${inputPadY}`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdatePlanning?.(item.id, { operationalNote: typedNote || undefined });
                      setDropdownOpen(false);
                    }}
                    className={`bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white font-extrabold rounded-lg transition-all cursor-pointer uppercase shrink-0 leading-none shadow-sm ${buttonPadY}`}
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Option block 4: Clean reset */}
              <div className="p-2 bg-[#061021] rounded-b-xl flex justify-center">
                <button
                  onClick={() => {
                    onUpdatePlanning?.(item.id, { manualPriority: 'NORMAL', planningStatus: 'A_PLANEJAR', operationalRoute: undefined, operationalNote: undefined });
                    setDropdownOpen(false);
                  }}
                  className={`w-full bg-slate-900 border border-slate-800 hover:border-red-500/20 hover:bg-red-550/[0.06] text-slate-400 hover:text-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.05)] font-sans font-black rounded-lg text-center uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${resetBtnPad}`}
                >
                  <RefreshCw size={11} className="transition-transform duration-300 group-hover:rotate-180" />
                  Restaurar planejamento automático
                </button>
              </div>

            </div>
          </>
        )}
      </div>

    </div>
  );
}
