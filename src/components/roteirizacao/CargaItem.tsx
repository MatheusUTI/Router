import React from 'react';
import { RoteirizacaoItem } from '../../types';

interface CargaItemProps {
  key?: string | number;
  item: RoteirizacaoItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export type DecisaoStatus = 'VAI' | 'ATENÇÃO' | 'NÃO VAI' | 'AGUARDAR' | 'PRIORIDADE';

interface DecisionConfig {
  label: DecisaoStatus;
  badgeBg: string;
  textClass: string;
  borderLeft: string;
  rowBg: string;
}

const resolveDecision = (item: RoteirizacaoItem): DecisionConfig => {
  const status = item.availabilityStatus ? item.availabilityStatus.toLowerCase() : '';
  const occurrenceCri = (item.occurrenceCriticality || '') as string;

  // 1. NÃO VAI
  if (
    occurrenceCri === 'CRÍTICA' ||
    status === 'retido' ||
    status === 'problema' ||
    status === 'devolução'
  ) {
    return {
      label: 'NÃO VAI',
      badgeBg: 'bg-red-500/15 text-red-400 border-red-500/25',
      textClass: 'text-red-400',
      borderLeft: 'border-l-red-500',
      rowBg: 'bg-red-950/[0.03] hover:bg-red-950/[0.06]',
    };
  }

  // 2. PRIORIDADE
  if (
    item.isCurvaA ||
    item.slaStatus?.isDelayed ||
    item.normPriority === 'CRÍTICA'
  ) {
    return {
      label: 'PRIORIDADE',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
      textClass: 'text-purple-305',
      borderLeft: 'border-l-purple-500',
      rowBg: 'bg-purple-950/[0.03] hover:bg-purple-950/[0.06]',
    };
  }

  // 3. ATENÇÃO
  if (
    item.slaStatus?.isToday ||
    item.slaStatus?.daysDiff === 1 ||
    (item.occurrenceCode && occurrenceCri !== 'CRÍTICA') ||
    item.pesoStatus?.category === 'CRÍTICO' ||
    item.pesoStatus?.category === 'PESADO' ||
    status === 'aguardando'
  ) {
    return {
      label: 'ATENÇÃO',
      badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      textClass: 'text-amber-400',
      borderLeft: 'border-l-amber-500',
      rowBg: 'bg-amber-950/[0.02] hover:bg-amber-950/[0.05]',
    };
  }

  // 4. AGUARDAR
  if (
    status === 'transferência' ||
    status === 'em rota'
  ) {
    return {
      label: 'AGUARDAR',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
      textClass: 'text-sky-300',
      borderLeft: 'border-l-sky-500',
      rowBg: 'bg-sky-950/[0.03] hover:bg-sky-950/[0.06]',
    };
  }

  // 5. VAI (Default)
  return {
    label: 'VAI',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    textClass: 'text-emerald-400',
    borderLeft: 'border-l-emerald-500',
    rowBg: 'bg-emerald-950/[0.01] hover:bg-emerald-950/[0.03]',
  };
};

const resolveStatusColor = (statusStr: string): { bg: string; text: string; border: string } => {
  const norm = statusStr.toUpperCase();
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
  return { bg: 'bg-[#101a2e]', text: 'text-slate-300', border: 'border-slate-800' };
};

export default function CargaItem({
  item,
  isSelected,
  onToggle,
}: CargaItemProps) {
  const decision = resolveDecision(item);

  return (
    <div
      onClick={() => onToggle(item.id)}
      className={`border-b border-[#14203a]/75 grid grid-cols-[24px_minmax(220px,1.1fr)_minmax(180px,0.9fr)_minmax(260px,1.3fr)_minmax(120px,0.5fr)] items-stretch select-none transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'bg-indigo-650/[0.07] shadow-[inset_3px_0_0_#4f46e5,inset_0_0_8px_rgba(99,102,241,0.04)]' 
          : decision.rowBg
      } hover:shadow-[0_1px_5px_rgba(0,0,0,0.4)] group w-full overflow-hidden`}
    >
      {/* 1. [FAIXA DE DECISÃO VERTICAL + CHECKBOX INTEGRADO] (24px) */}
      <div 
        className={`shrink-0 flex flex-col items-center justify-start py-1 px-0.5 gap-1.5 font-mono select-none border-l-[3px] ${decision.borderLeft} ${decision.badgeBg}`}
        style={{ minWidth: '24px', maxWidth: '24px' }}
      >
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={`checkbox-carga-${item.id}`}
            checked={isSelected}
            onChange={() => onToggle(item.id)}
            className="w-3.5 h-3.5 cursor-pointer rounded-sm border-slate-750 bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all"
          />
        </div>
        <div className="[writing-mode:vertical-lr] rotate-180 font-black tracking-wider uppercase text-[7.5px] leading-none whitespace-nowrap shrink-0">
          {decision.label}
        </div>
      </div>

      {/* 2. [IDENTIDADE] - Destinatário, Remetente, CTRC, NF */}
      <div className="min-w-0 flex flex-col justify-center text-left py-1 md:py-1.5 pl-3 pr-2 gap-0.5 select-text">
        <div className="flex items-center gap-1 leading-none truncate w-full">
          <span className="text-slate-400 font-extrabold select-none shrink-0 text-[10px]">DEST:</span>
          <span className="text-slate-100 font-black truncate block uppercase text-[clamp(10px,0.85vw,13px)] leading-[1.1]" title={item.destinatario}>
            {item.destinatario}
          </span>
        </div>

        <div className="flex items-center gap-1 leading-none truncate w-full mt-0.5">
          <span className="text-slate-400 font-extrabold select-none shrink-0 text-[10px]">REM:</span>
          <span 
            className={`font-black truncate block uppercase text-[clamp(10px,0.85vw,13px)] leading-[1.1] ${
              item.isCurvaA 
                ? 'text-purple-300 bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20' 
                : 'text-slate-350'
            }`}
            title={item.remetente}
          >
            {item.remetente || 'REMETENTE VAGO'}
            {item.isCurvaA && <span className="text-[clamp(8px,0.65vw,10px)] font-black text-purple-305 ml-1 select-none">[CURVA A]</span>}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[clamp(9px,0.73vw,11.5px)] font-mono select-text font-black mt-0.5 leading-none">
          <span className="bg-slate-900 border border-indigo-950 px-1 py-0.2 rounded text-indigo-350">
            CTRC: {item.id}
          </span>
          {item.nf && (
            <span className="bg-slate-900 border border-indigo-950 px-1 py-0.2 rounded text-indigo-350">
              NF: {item.nf}
            </span>
          )}
          {item.isFob && (
            <span className="bg-amber-500/10 text-amber-400 font-bold text-[8.5px] px-1 py-0.2 rounded border border-amber-500/20 shrink-0 select-none">
              FOB
            </span>
          )}
        </div>
      </div>

      {/* 3. [ROTA/CIDADE] - Cidade de destaque grandinha, Setor e Rota */}
      <div className="min-w-0 pl-3.5 pr-2 flex flex-col justify-center py-1 md:py-1.5">
        <span className="text-white hover:text-indigo-200 font-black text-[clamp(11.5px,0.95vw,15px)] uppercase tracking-wide truncate block" title={item.normCidade}>
          {item.normCidade || 'LOCALIDADE IND'}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5 leading-none text-[clamp(8.5px,0.72vw,10.5px)]">
          <span className="text-indigo-400 font-sans font-black uppercase">
            {item.normRota || 'ROT-PADRÃO'}
          </span>
          <span className="text-slate-400 font-mono font-bold uppercase bg-[#101726] border border-[#1d2942] px-1 rounded">
            {item.normSetor ? `SET: ${item.normSetor}` : 'SEM SETOR'}
          </span>
        </div>
      </div>

      {/* 4. [OCORRÊNCIA/STATUS/LOCALIZAÇÃO] - SLA do centro, Ocorrências, Status e Localização */}
      <div className="min-w-0 px-3.5 flex flex-col justify-center gap-0.5 leading-none py-1 md:py-1.5">
        
        {/* Data SLA Badges (PREV: 26/05, D+0, ATRASADO, etc.) */}
        <div className="flex flex-wrap items-center gap-1.5 leading-none text-[clamp(8px,0.65vw,10px)]">
          <span className="font-mono font-bold px-1 bg-slate-900/60 border border-slate-750 rounded text-slate-350 whitespace-nowrap">
            PREV: {item.prev_ent ? item.prev_ent.slice(0, 5) : 'S/P'}
          </span>
          <span className={`font-sans font-black px-1.5 py-0.2 rounded border whitespace-nowrap ${item.slaStatus?.bgClass || 'bg-slate-900/30'} ${item.slaStatus?.textClass || 'text-slate-400 border-slate-750/20'}`}>
            {item.slaStatus?.label || 'D+0'}
            {item.slaStatus?.daysDiff !== undefined && item.slaStatus.daysDiff > 0 && ` +${item.slaStatus.daysDiff}D`}
            {item.slaStatus?.isDelayed && ` ATRASADO`}
          </span>
          {item.status === 'Agendamento' && (
            <span className="font-bold font-mono text-[#00f2fe] shrink-0 bg-cyan-950/20 px-1 rounded border border-cyan-800/20 whitespace-nowrap">
              AGENDADO
            </span>
          )}
        </div>

        {/* Code Occurrence and text */}
        <div className="min-w-0 mt-0.5 text-[clamp(8.5px,0.72vw,11px)]">
          {item.occurrenceCode ? (
            item.occurrenceDescription === 'Ocorrência não mapeada' ? (
              <span className="text-slate-400 font-bold block truncate">
                ⚠️ OC {item.occurrenceCode} • não mapeada
              </span>
            ) : item.occurrenceCriticality === 'CRÍTICA' ? (
              <span className="text-red-400 font-extrabold block truncate" title={item.occurrenceDescription}>
                🚨 OC {item.occurrenceCode} • {item.occurrenceDescription}
              </span>
            ) : item.occurrenceCriticality === 'MÉDIA' ? (
              <span className="text-amber-400 font-bold block truncate" title={item.occurrenceDescription}>
                ⚠️ OC {item.occurrenceCode} • {item.occurrenceDescription}
              </span>
            ) : (
              <span className="text-indigo-400 font-bold block truncate" title={item.occurrenceDescription}>
                ℹ️ OC {item.occurrenceCode} • {item.occurrenceDescription}
              </span>
            )
          ) : (
            <span className="text-slate-500 font-semibold select-none block">
              🟢 SEM OCORRÊNCIA
            </span>
          )}
        </div>

        {/* Operational Status & Physical warehouse LOC */}
        <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap mt-0.5 leading-none text-[clamp(8px,0.65vw,10.5px)] w-full min-w-0 overflow-hidden">
          {(() => {
            const displayStatus = (item.availabilityLabel || item.status || 'DISPONÍVEL').toUpperCase();
            const colors = resolveStatusColor(displayStatus);
            return (
              <span className={`font-mono font-black uppercase px-1.5 py-0.2 rounded border shrink-0 ${colors.bg} ${colors.text} ${colors.border} whitespace-nowrap`}>
                {displayStatus}
              </span>
            );
          })()}

          <span className="text-teal-400 font-mono truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px] lg:max-w-[210px] inline-block" title={item.locationLabel.replace(/📍/g, '').trim()}>
            LOC: <span className="font-extrabold uppercase">{item.locationLabel.replace(/📍/g, '').trim()}</span>
          </span>
        </div>
      </div>

      {/* 5. [NÚMEROS] - Peso, volumes, valor, frete (centered on the right) */}
      <div className="min-w-0 flex flex-col items-center justify-center text-center leading-none gap-0.5 px-2 py-1.5 shrink-0 whitespace-nowrap text-[clamp(10px,0.85vw,13px)] font-mono">
        <span className="text-slate-100 font-black text-[clamp(11px,0.9vw,14px)]">
          {(item.peso_r || item.weight || 0).toLocaleString('pt-BR')} kg
        </span>
        <span className="text-amber-400 font-bold">
          {item.volume || 1} vol
        </span>
        <span className="text-slate-400 font-medium">
          R$ {(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[#a5b4fc] font-bold text-[clamp(9.5px,0.72vw,11.5px)]">
          Frete: R$ {(item.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
