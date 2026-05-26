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
      badgeBg: 'bg-red-500/15 text-red-400 border-red-500/20',
      textClass: 'text-red-450',
      borderLeft: 'border-l-red-500',
      rowBg: 'bg-red-950/[0.04] hover:bg-red-950/[0.08]',
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
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
      textClass: 'text-purple-300',
      borderLeft: 'border-l-purple-500',
      rowBg: 'bg-purple-950/[0.04] hover:bg-purple-950/[0.08]',
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
      badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
      textClass: 'text-amber-400',
      borderLeft: 'border-l-amber-500',
      rowBg: 'bg-amber-950/[0.02] hover:bg-amber-950/[0.06]',
    };
  }

  // 4. AGUARDAR
  if (
    status === 'transferência' ||
    status === 'em rota'
  ) {
    return {
      label: 'AGUARDAR',
      badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
      textClass: 'text-sky-300',
      borderLeft: 'border-l-sky-500',
      rowBg: 'bg-sky-950/[0.03] hover:bg-sky-950/[0.07]',
    };
  }

  // 5. VAI (Default)
  return {
    label: 'VAI',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    textClass: 'text-emerald-450',
    borderLeft: 'border-l-emerald-500',
    rowBg: 'bg-emerald-950/[0.01] hover:bg-emerald-950/[0.03]',
  };
};

const resolveStatusColor = (statusStr: string): { bg: string; text: string; border: string } => {
  const norm = statusStr.toUpperCase();
  if (norm === 'DISPONÍVEL' || norm === 'DISPONIVEL') {
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  }
  if (norm.includes('AGUARDANDO') || norm.includes('BOX') || norm === 'AGUARDANDO DESCARGA') {
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/10' };
  }
  if (norm.includes('RETIDO') || norm.includes('PROBLEMA') || norm.includes('DEVOLUÇÃO') || norm.includes('RECUSADO')) {
    return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
  }
  if (norm.includes('TRANSFERÊNCIA') || norm.includes('EM ROTA') || norm.includes('TRANSFER') || norm.includes('ROTA')) {
    return { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' };
  }
  if (norm.includes('AGENDADO') || norm.includes('AGENDAMENTO')) {
    return { bg: 'bg-indigo-500/10', text: 'text-indigo-300', border: 'border-indigo-500/20' };
  }
  return { bg: 'bg-[#101a2e]', text: 'text-slate-350', border: 'border-slate-800' };
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
      className={`border-b border-[#14203a]/75 flex items-stretch text-xs select-none transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'bg-indigo-650/[0.09] shadow-[inset_4px_0_0_#4f46e5,inset_0_0_12px_rgba(99,102,241,0.06)]' 
          : decision.rowBg
      } hover:shadow-[0_2px_8px_rgba(0,0,0,0.5)] group`}
    >
      {/* [1] FAIXA DE DECISÃO — extrema esquerda */}
      <div 
        className={`w-[48px] shrink-0 border-r border-[#14203a]/40 flex flex-col justify-between items-center text-center py-2 px-0.5 font-mono select-none border-l-[3px] ${decision.borderLeft} ${decision.badgeBg}`}
      >
        {/* Short SLA label at top */}
        <span className="text-[10px] font-black tracking-tighter leading-none block uppercase">
          {item.slaStatus?.label || 'D+0'}
        </span>

        {/* Rotated decision text */}
        <div className="[writing-mode:vertical-lr] rotate-180 font-black tracking-widest uppercase text-[10px] leading-none my-1.5 whitespace-nowrap shrink-0">
          {decision.label}
        </div>

        {/* Previsão data at bottom */}
        <span className="text-[9.5px] font-bold leading-none block font-mono shrink-0">
          {item.prev_ent ? item.prev_ent.slice(0, 5) : 'S/P'}
        </span>
      </div>

      {/* Select Control - checkbox immediately adjacent */}
      <div className="flex items-center pl-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          id={`checkbox-carga-${item.id}`}
          checked={isSelected}
          onChange={() => onToggle(item.id)}
          className="w-4 h-4 cursor-pointer rounded-sm border-slate-750 bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all"
        />
      </div>

      {/* Grid container spanning all remaining zones */}
      <div className="flex-grow grid grid-cols-12 gap-3.5 p-3 min-w-0 items-center">
        
        {/* [2] IDENTIDADE DA CARGA - 5 columns */}
        <div className="col-span-12 lg:col-span-5 min-w-0 flex flex-col justify-center gap-1">
          <div className="min-w-0 leading-none">
            <span className="text-[9.5px] text-slate-500 font-extrabold uppercase select-none block tracking-wider">DESTINATÁRIO:</span>
            <span 
              className="font-black uppercase truncate text-slate-100 text-[13px] tracking-wide block group-hover:text-indigo-200 transition-colors mt-0.5"
              title={item.destinatario}
            >
              {item.destinatario}
            </span>
          </div>

          <div className="min-w-0 leading-none">
            <span className="text-[9.5px] text-slate-500 font-extrabold uppercase select-none block tracking-wider">REMETENTE:</span>
            <span 
              className={`font-black uppercase truncate text-[12.5px] tracking-wide block mt-0.5 ${
                item.isCurvaA 
                  ? 'text-purple-300 bg-purple-500/10 px-1 py-0.5 border border-purple-500/20 rounded inline-block max-w-full' 
                  : 'text-slate-300'
              }`}
              title={item.remetente}
            >
              {item.remetente || 'REMETENTE VAGO'}
              {item.isCurvaA && <span className="text-[9px] font-black text-purple-300 ml-1 select-none">[★ CURVA {item.curvaAClass || 'A'}]</span>}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono select-text font-black mt-1 leading-none">
            <div className="bg-slate-900 border border-indigo-950 px-1.5 py-0.5 rounded text-indigo-300">
              <span className="text-slate-500 font-bold">CTRC:</span> <span className="font-extrabold">{item.id}</span>
            </div>
            {item.nf && (
              <div className="bg-slate-900 border border-indigo-950 px-1.5 py-0.5 rounded text-indigo-300">
                <span className="text-slate-500 font-bold">NF:</span> <span className="font-extrabold">{item.nf}</span>
              </div>
            )}
            {item.isFob && (
              <span className="bg-amber-500/10 text-amber-500 font-bold text-[9px] px-1.5 py-0.5 rounded border border-amber-500/20 font-mono tracking-tight shrink-0 select-none">
                DIRETRIZ FOB
              </span>
            )}
          </div>
        </div>

        {/* [3] CIDADE / SETOR / ROTA - 2 columns */}
        <div className="col-span-12 md:col-span-4 lg:col-span-2 min-w-0 flex flex-col justify-center border-l border-[#14203a]/40 pl-3 leading-tight">
          <span className="text-slate-100 font-black text-sm uppercase tracking-wide truncate">
            {item.normCidade || 'LOCALIDADE IND'}
          </span>
          <span className="text-indigo-400 font-extrabold uppercase tracking-tight text-xs mt-0.5">
            {item.normRota || 'ROT-PADRÃO'}
          </span>
          <span className="text-slate-400 font-black uppercase text-[10px] tracking-tight truncate mt-1 bg-[#101726] border border-[#1d2942] px-1.5 py-0.5 rounded-sm inline-block max-w-max">
            {item.normSetor ? `SET: ${item.normSetor}` : 'SETOR NÃO MAPEADO'}
          </span>
        </div>

        {/* [4] CENTRAL — OCORRÊNCIA + LOCALIZAÇÃO + STATUS - 3 columns */}
        <div className="col-span-12 md:col-span-5 lg:col-span-3 min-w-0 flex flex-col justify-center border-l border-r border-[#14203a]/40 px-3 gap-1.5 leading-none">
          {/* Occurrence code and text description */}
          <div className="min-w-0">
            {item.occurrenceCode ? (
              <span className="text-[11px] font-black text-red-400 tracking-wide block truncate">
                ⚠️ OC {item.occurrenceCode} • {item.occurrenceDescription || 'não mapeada'}
              </span>
            ) : (
              <span className="text-[9.5px] font-bold text-slate-500 uppercase font-mono block select-none">
                🟢 Sem Ocorrência Pendente
              </span>
            )}
          </div>

          {/* Operational highlight Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9.5px] text-slate-500 font-extrabold font-sans select-none">STATUS:</span>
            {(() => {
              const displayStatus = (item.availabilityLabel || item.status || 'DISPONÍVEL').toUpperCase();
              const colors = resolveStatusColor(displayStatus);
              return (
                <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {displayStatus}
                </span>
              );
            })()}
          </div>

          {/* Clean legibly prefixed physical physical location */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#070c14] border border-[#16243f] text-teal-400 font-mono text-[10px] mt-0.5 truncate select-none shadow-sm" title={item.locationLabel}>
            <span className="text-teal-500 font-normal">LOC:</span>
            <span className="font-extrabold truncate">
              {item.locationLabel.replace(/📍/g, '').trim()}
            </span>
          </div>

          {/* Agendado date indicator if applicable */}
          {item.status === 'Agendamento' && (
            <span className="text-[9.5px] font-black font-mono text-purple-300 mt-1 block select-none">
              📅 AGENDADO: {item.prev_ent ? item.prev_ent.slice(0, 5) : 'PENDENTE'}
            </span>
          )}
        </div>

        {/* [5] DIREITA DA LINHA — SOMENTE NÚMEROS OPERACIONAIS - 2 columns */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2 min-w-0 flex flex-col justify-center items-end text-right pr-1 leading-snug">
          {/* Peso */}
          <span className="text-slate-100 font-mono font-black text-[13.5px]">
            {(item.peso_r || item.weight || 0).toLocaleString('pt-BR')} kg
          </span>

          {/* Volume */}
          <span className="text-yellow-400 font-mono font-black text-[11.5px] mt-0.5 bg-yellow-500/5 border border-yellow-500/10 px-1 py-0.2 rounded inline-block">
            {item.volume || 1} VOL
          </span>

          {/* Valor */}
          <span className="text-slate-400 text-[10px] font-mono font-bold mt-1 block">
            VAL: <span className="text-slate-205">R$ {(item.valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </span>

          {/* Frete */}
          <span className="text-slate-400 text-[9.5px] font-mono font-medium block">
            FRETE: <span className="text-indigo-300 font-extrabold">R$ {(item.frete || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </span>
        </div>

      </div>
    </div>
  );
}
