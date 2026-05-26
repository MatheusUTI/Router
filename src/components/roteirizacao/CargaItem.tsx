import React from 'react';
import { RoteirizacaoItem } from '../../types';

interface CargaItemProps {
  key?: string | number;
  item: RoteirizacaoItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export default function CargaItem({
  item,
  isSelected,
  onToggle,
}: CargaItemProps) {
  const occurrenceCompact = item.occurrenceCode && item.occurrenceDescription
    ? `${item.occurrenceCode} • ${item.occurrenceDescription}`
    : item.occurrenceCode
    ? `OC ${item.occurrenceCode}`
    : '';

  return (
    <div
      onClick={() => onToggle(item.id)}
      className={`border-b border-[#14203a] p-2.5 transition-all duration-150 cursor-pointer flex items-stretch gap-3 text-xs select-none relative ${
        isSelected 
          ? 'bg-indigo-600/10 border-l-[4px] border-l-indigo-500 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]' 
          : item.isCurvaA 
          ? 'border-l-[3px] border-l-red-500/60 hover:border-l-red-500 bg-red-950/[0.01]' 
          : item.isFob 
          ? 'border-l-[3px] border-l-amber-500/40 hover:border-l-amber-500 bg-amber-950/[0.01]' 
          : 'border-l-[3px] border-l-transparent hover:border-l-slate-500'
      } hover:bg-[#121c32] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] group`}
    >
      {/* Checkbox leftmost */}
      <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          id={`checkbox-carga-${item.id}`}
          checked={isSelected}
          onChange={() => onToggle(item.id)}
          className="w-4 h-4 cursor-pointer rounded-sm border-slate-700 bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all"
        />
      </div>

      {/* Structured flex content container */}
      <div className="flex-1 grid grid-cols-12 gap-3.5 min-w-0 items-center">
        
        {/* [ZONE 1] IDENTIDADE OPERACIONAL (ESQUERDA) - col-span-5
            - destinatário (NÍVEL 1)
            - CTRC + NF (NÍVEL 3)
            - remetente (NÍVEL 3)
        */}
        <div className="col-span-12 md:col-span-4 min-w-0 flex flex-col justify-center">
          <div className="min-w-0">
            {/* Destinatário (NÍVEL 1) */}
            <span 
              className="font-black uppercase truncate text-slate-100 text-[13px] leading-tight tracking-wide block group-hover:text-indigo-200 transition-colors"
              title={item.destinatario}
            >
              {item.destinatario}
            </span>

            {/* CTRC + NF (NÍVEL 3) */}
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
              CT <span className="text-indigo-400 font-black">{item.id}</span>
              {item.nf && (
                <span className="text-slate-500">
                  {" "}· NF <span className="text-slate-200 font-bold">{item.nf}</span>
                </span>
              )}
            </p>
          </div>

          {/* Remetente (NÍVEL 3) */}
          {item.remetente && (
            <p className="text-[9.5px] text-slate-500 truncate mt-1 leading-none uppercase" title={`Remetente: ${item.remetente}`}>
              REM: <span className="text-slate-400/90 font-medium">{item.remetente}</span>
            </p>
          )}
        </div>

        {/* [ZONE 2] DECISÃO LOGÍSTICA (CENTRO) - col-span-5
            - cidade/praça (NÍVEL 2 - MUITO FORTE)
            - setor/rota (NÍVEL 2)
            - badges operacionais (Curva A, FOB, SLA, Peso Crítico, Ocorrência)
        */}
        <div className="col-span-12 md:col-span-5 min-w-0 flex flex-col justify-center gap-1.5 border-l border-r border-[#14203a]/40 px-2 sm:px-4">
          <div className="min-w-0">
            {/* Cidade/Praça (NÍVEL 2 - MUITO FORTE) */}
            <div className="flex items-baseline gap-1.5">
              <span 
                className="font-black text-slate-50 uppercase text-[12.5px] tracking-wider shrink-0"
                title={item.normCidade}
              >
                {item.normCidade}
              </span>
              {/* Setor/Rota (NÍVEL 2) */}
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate">
                ({item.normSetor} · <span className="text-indigo-400 font-medium">{item.normRota}</span>)
              </span>
            </div>
          </div>

          {/* Badges operacionais compactos horizontais */}
          <div className="flex flex-wrap items-center gap-1">
            {/* SLA Badge */}
            {item.slaStatus && (
              <span className={`text-[8px] px-1.5 py-0.2 rounded font-black tracking-wide uppercase ${item.slaStatus.bgClass} ${item.slaStatus.textClass}`}>
                {item.slaStatus.label}
              </span>
            )}

            {/* Curva A Badge */}
            {item.isCurvaA && (
              <span className="text-[8px] bg-red-950/80 text-red-400 font-black px-1.5 py-0.2 rounded border border-red-500/20 tracking-wider">
                ★ CURVA {item.curvaAClass || 'A'}
              </span>
            )}

            {/* FOB Badge */}
            {item.isFob && (
              <span className="text-[8px] bg-amber-500/10 text-amber-500 font-black px-1.5 py-0.2 rounded border border-amber-500/20 tracking-wider uppercase">
                FOB
              </span>
            )}

            {/* Peso Crítico Special Flag */}
            {item.pesoStatus.category === 'CRÍTICO' && (
              <span className="text-[8px] bg-red-500/10 text-red-400 font-black px-1.5 py-0.2 rounded border border-red-500/20 tracking-wider uppercase animate-pulse">
                PESO CRÍTICO
              </span>
            )}

            {/* Ocorrência Special Badge */}
            {occurrenceCompact && (
              <span 
                className={`text-[8px] font-black tracking-wide uppercase px-1.5 py-0.2 rounded border ${
                  item.occurrenceCriticality === 'CRÍTICA' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}
                title={occurrenceCompact}
              >
                ⚠️ {item.occurrenceCode}
              </span>
            )}

            <span className="text-[8px] font-mono font-bold bg-[#070c14] border border-slate-800 text-slate-500 px-1 rounded uppercase">
              {item.unid || 'SPO'}
            </span>
          </div>
        </div>

        {/* [ZONE 3] STATUS FÍSICO OPERACIONAL (DIREITA) - col-span-3
            - peso (NÍVEL 1 - MUITO FORTE)
            - volumes (NÍVEL 1)
            - valor + frete (NÍVEL 3)
            - disponibilidade (NÍVEL 1)
            - localização/box (NÍVEL 2)
        */}
        <div className="col-span-12 md:col-span-3 min-w-0 flex flex-col justify-center items-end text-right">
          {/* Peso + Volume inline (NÍVEL 1) */}
          <div className="font-mono text-[12px] leading-none font-black text-slate-100 flex items-center gap-1.5">
            <span className={`${item.pesoStatus.textClass}`}>{item.pesoStatus.label.toUpperCase()}</span>
            <span className="text-slate-600 font-normal">·</span>
            <span className="text-yellow-400">{item.volume || 1} VOL</span>
          </div>

          {/* Valor + Frete compact text (NÍVEL 3) */}
          <div className="text-[8.8px] text-slate-500 font-mono leading-none mt-1">
            <span>R$ {(item.valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="text-slate-700"> / </span>
            <span className="text-slate-400">Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>

          {/* Transacional Disponibilidade + Localização row */}
          <div className="mt-1 flex items-center gap-1">
            {/* Disponibilidade Status Badge (NÍVEL 1) */}
            <span className={`inline-block text-[8px] px-1 py-0.2 rounded font-black tracking-wide leading-none ${item.visualFlags.statusClass}`}>
              {item.availabilityLabel.toUpperCase()}
            </span>

            {/* Localização/Box (NÍVEL 2) */}
            <span 
              className="inline-block bg-[#070c14]/80 text-teal-400 font-mono text-[8.5px] px-1.5 py-0.2 rounded border border-teal-950 uppercase font-black tracking-tight"
              title={item.locationLabel}
            >
              LOC: {item.locationLabel.replace(/📍/g, '').trim()}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

