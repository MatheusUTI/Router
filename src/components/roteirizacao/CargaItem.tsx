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
      className={`border-b border-[#14203a] p-2 hover:bg-[#111c30] transition-all duration-150 cursor-pointer flex items-start gap-2.5 text-xs select-none relative ${
        isSelected ? 'bg-indigo-650/10' : ''
      } ${item.visualFlags.rowClass}`}
    >
      {/* Checkbox leftmost */}
      <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          id={`checkbox-carga-${item.id}`}
          checked={isSelected}
          onChange={() => onToggle(item.id)}
          className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-705 bg-[#070c14] focus:ring-0 cursor-pointer"
        />
      </div>

      {/* Structured flex content container */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-w-0">
        
        {/* BLOCO ESQUERDO: col-span-5
            - destinatário (NÍVEL 1)
            - CTRC + NF (NÍVEL 3)
            - remetente (NÍVEL 3)
            - badges: Curva A / FOB
        */}
        <div className="col-span-12 sm:col-span-5 min-w-0 flex flex-col justify-between">
          <div className="min-w-0">
            {/* Destinatário (NÍVEL 1) */}
            <span 
              className="font-extrabold uppercase truncate text-[#f1f5f9] text-[12px] leading-tight tracking-wide block"
              title={item.destinatario}
            >
              {item.destinatario}
            </span>

            {/* CTRC + NF (NÍVEL 3) */}
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-medium leading-none">
              CT <span className="text-slate-300 font-extrabold">{item.id}</span>
              {item.nf && <span className="text-slate-500 font-normal"> · NF <span className="text-slate-300 font-extrabold">{item.nf}</span></span>}
            </p>
          </div>

          {/* Remetente (NÍVEL 3) */}
          {item.remetente && (
            <p className="text-[10px] text-slate-500 truncate mt-1 leading-none" title={`Remetente: ${item.remetente}`}>
              Rem: <span className="text-slate-400">{item.remetente}</span>
            </p>
          )}

          {/* Badges Curva A / FOB row */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {item.isCurvaA && (
              <span className="text-[9px] bg-red-650/20 text-red-400 font-black px-1.5 py-0.2 rounded border border-red-500/20 tracking-wider">
                ★ CURVA {item.curvaAClass || 'A'}
              </span>
            )}
            {item.isFob && (
              <span className="text-[9px] bg-amber-500/20 text-amber-500 font-black px-1.5 py-0.2 rounded border border-amber-500/20 tracking-wider">
                FOB
              </span>
            )}
            <span className="text-[9px] font-mono font-bold bg-[#070c14] border border-slate-800 text-slate-500 px-1 rounded uppercase">
              {item.unid || 'SPO'}
            </span>
          </div>
        </div>

        {/* BLOCO CENTRAL: col-span-4
            - cidade/praça (NÍVEL 2)
            - setor/rota (NÍVEL 2)
            - SLA (NÍVEL 1)
            - ocorrência código + descrição resumida (NÍVEL 2)
        */}
        <div className="col-span-12 sm:col-span-4 min-w-0 flex flex-col justify-between">
          <div className="min-w-0">
            {/* Cidade/Praça (NÍVEL 2) */}
            <span 
              className="font-bold text-slate-200 uppercase truncate text-[11px] tracking-wide block"
              title={item.normCidade}
            >
              {item.normCidade}
            </span>
            {/* Setor/Rota (NÍVEL 2) */}
            <span className="text-[10px] text-slate-400 font-bold uppercase block leading-tight">
              {item.normSetor} · {item.normRota}
            </span>
          </div>

          {/* SLA Space inline container (NÍVEL 1) */}
          <div className="mt-1 flex items-center">
            <span className={`inline-block text-[9.5px] px-1.5 py-0.2 rounded font-black tracking-wide ${item.slaStatus.bgClass} ${item.slaStatus.textClass}`}>
              {item.slaStatus.label}
            </span>
          </div>

          {/* Ocorrência (NÍVEL 2) */}
          {occurrenceCompact && (
            <p 
              className={`text-[9.5px] font-medium truncate mt-1 leading-none ${
                item.occurrenceCriticality === 'CRÍTICA' || item.occurrenceCriticality === 'MÉDIA' ? 'text-red-400' : 'text-amber-500'
              }`} 
              title={occurrenceCompact}
            >
              ⚠️ {occurrenceCompact}
            </p>
          )}
        </div>

        {/* BLOCO DIREITO: col-span-3 text-right
            - peso (NÍVEL 1)
            - volumes (NÍVEL 1)
            - valor (NÍVEL 3)
            - frete (NÍVEL 3)
            - disponibilidade (NÍVEL 1)
            - localização/box (NÍVEL 2)
        */}
        <div className="col-span-12 sm:col-span-3 min-w-0 flex flex-col justify-between text-right items-end">
          {/* Peso + Volume inline (NÍVEL 1) */}
          <div className="font-mono text-[11px] leading-tight font-bold text-slate-200">
            <span className={`${item.pesoStatus.textClass}`}>{item.pesoStatus.label}</span>
            <span className="text-slate-600"> · </span>
            <span className="text-zinc-200 font-extrabold">{item.volume || 1} VOL</span>
          </div>

          {/* Valor + Frete compact text (NÍVEL 3) */}
          <div className="text-[9.2px] text-slate-500 font-mono leading-none mt-0.5">
            <span>R$ {(item.valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            <span className="text-slate-700"> / </span>
            <span className="text-slate-400">Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>

          {/* Disponibilidade Status Badge (NÍVEL 1) */}
          <div className="mt-1">
            <span className={`inline-block text-[9px] px-1.2 py-0.2 rounded font-black tracking-wide leading-none ${item.visualFlags.statusClass}`}>
              {item.availabilityLabel}
            </span>
          </div>

          {/* Localização/Box (NÍVEL 2 - Point 4) */}
          <div className="mt-1 max-w-full">
            <span 
              className="inline-block bg-[#070c14]/80 text-teal-400 font-mono text-[8.5px] px-1.5 py-0.2 rounded border border-teal-950 uppercase font-black tracking-tight truncate max-w-full"
              title={item.locationLabel}
            >
              {item.locationLabel}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

