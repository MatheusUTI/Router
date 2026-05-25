import React from 'react';
import { Vehicle, Ctrc } from '../../types';

interface VehicleCardProps {
  key?: string | number;
  vehicle: Vehicle;
  draftCtrcs: Ctrc[];
  selectedWeight: number;
  selectedVolume?: number;
  selectedValue?: number;
  selectedFrete?: number;
  onAllocateSelected: () => void;
  onEmitRomaneio: () => void;
  onUnassignCarga: (id: string) => void;
  onClearDraft: () => void;
  isRecommended: boolean; // Point 6 recommended indicator
}

export default function VehicleCard({
  vehicle,
  draftCtrcs,
  selectedWeight,
  selectedVolume = 0,
  selectedValue = 0,
  selectedFrete = 0,
  onAllocateSelected,
  onEmitRomaneio,
  onUnassignCarga,
  onClearDraft,
  isRecommended,
}: VehicleCardProps) {
  // Parse maximum capacity using tolerant logic helper
  const parseVehicleCapacityRaw = (capacityStr: string): number => {
    const cleaned = capacityStr.toLowerCase();
    const matchFloat = cleaned.match(/([\d.]+)\s*t/);
    if (matchFloat && matchFloat[1]) {
      return parseFloat(matchFloat[1]) * 1000;
    }
    const matchNum = cleaned.match(/(\d+)/);
    if (matchNum && matchNum[1]) {
      const num = parseInt(matchNum[1], 10);
      if (num < 150) {
        return num * 1000;
      }
      return num;
    }
    return 4000;
  };

  const capacityMax = parseVehicleCapacityRaw(vehicle.capacity);

  // Compute allocated weight and volume in current draft
  const allocatedWeight = draftCtrcs.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
  const allocatedVolume = draftCtrcs.reduce((sum, c) => sum + (c.volume || 1), 0);

  // Compute saturation percentage
  const saturationPct = capacityMax > 0 ? (allocatedWeight / capacityMax) * 100 : 0;

  // Determine saturation color scheme
  // < 60%: Blue, 60-85%: Green, 85-95%: Orange, > 95%: Red
  let saturationBarColor = 'bg-indigo-500';
  if (saturationPct > 95) {
    saturationBarColor = 'bg-red-500';
  } else if (saturationPct >= 85) {
    saturationBarColor = 'bg-amber-500';
  } else if (saturationPct >= 60) {
    saturationBarColor = 'bg-emerald-500';
  }

  // Compatibility checking with selected cargo weight
  const remainingPayload = capacityMax - allocatedWeight;
  const isSelectedActive = selectedWeight > 0;
  const isSelectionTooHeavy = isSelectedActive && selectedWeight > remainingPayload;

  // Determine container styling classes reflecting Point 6 & Point 9 (Visually "disabled"/faded state if incompatible)
  let containerClasses = 'bg-[#0a0f1d] border border-[#16223f] ';
  if (isSelectedActive) {
    if (isSelectionTooHeavy) {
      containerClasses += 'opacity-40 border-dashed border-red-500/20 bg-red-950/[0.01] pointer-events-none filter brightness-75';
    } else if (isRecommended) {
      containerClasses += 'border-amber-500/60 bg-amber-500/[0.03] ring-1 ring-amber-500/20';
    } else {
      containerClasses += 'border-indigo-500/40 bg-[#0c1328]';
    }
  } else {
    containerClasses += 'hover:border-slate-750 transition-colors duration-150';
  }

  // Display label for status
  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('dispon') || s.includes('patio')) {
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[8.5px] px-1 rounded-sm font-bold uppercase tracking-tight">
          PÁTIO
        </span>
      );
    }
    return (
      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 text-[8.5px] px-1 rounded-sm font-bold uppercase tracking-tight">
        {statusStr.toUpperCase()}
      </span>
    );
  };

  return (
    <div className={`rounded-xl p-2.5 flex flex-col gap-1.5 transition-all duration-150 select-none relative ${containerClasses}`}>
      
      {/* ----------------------------------------------------
          LINHA 1: PLACA • TIPO • STATUS (+ RECOMMENDATION BADGE)
          ---------------------------------------------------- */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          {/* Placa Badge */}
          <span className="bg-[#1e293b] text-slate-100 font-mono text-[11px] font-black tracking-widest px-1.5 py-0.3 rounded border border-slate-700 shadow-xs">
            {vehicle.id}
          </span>
          <span className="text-slate-400 text-[10px] font-bold uppercase">
            {vehicle.type}
          </span>
          <span className="text-slate-650 font-sans">•</span>
          {getStatusBadge(vehicle.status || 'Disponível')}
        </div>

        {/* Recommended Tag (Point 6) */}
        {isRecommended && isSelectedActive && !isSelectionTooHeavy && (
          <span className="bg-amber-500/25 text-amber-300 border border-amber-500/35 text-[9px] font-black uppercase px-2 py-0.3 rounded tracking-wider animate-[pulse_2s_infinite]">
            ⭐ RECOMENDADO
          </span>
        )}
      </div>

      {/* ----------------------------------------------------
          LINHA 2: MOTORISTA
          ---------------------------------------------------- */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-200 font-bold uppercase truncate max-w-[200px]" title={vehicle.driverName}>
          👤 {vehicle.driverName || 'NÃO DESIGNADO'}
        </span>
        <span className="text-slate-400 font-mono text-[9.5px]">
          Capacidade: <span className="text-slate-200 font-bold">{vehicle.capacity}</span>
        </span>
      </div>

      {/* ----------------------------------------------------
          LINHA 3: BARRA COMPACTA + PESO/VOLUME
          ---------------------------------------------------- */}
      <div className="w-full flex flex-col gap-0.5 font-mono">
        {/* Occupancy state details */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 leading-none">
          <div>
            <span className="text-slate-200 font-extrabold">{allocatedWeight.toLocaleString('pt-BR')} kg</span>
            <span className="text-slate-600 font-bold"> / </span>
            <span className="text-slate-400 font-semibold">{capacityMax.toLocaleString('pt-BR')} kg</span>
            <span className="text-slate-500"> • </span>
            <span className="text-slate-300 font-bold">{allocatedVolume} VOL</span>
          </div>
          <span className={`font-black ${saturationPct > 100 ? 'text-red-400' : 'text-slate-300'}`}>
            {saturationPct.toFixed(0)}%
          </span>
        </div>

        {/* Highly sleek 2px progress scale */}
        <div className="h-1 w-full bg-[#070c14] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${saturationBarColor}`}
            style={{ width: `${Math.min(saturationPct, 100)}%` }}
          ></div>
        </div>

        {/* Overflow alert */}
        {allocatedWeight > capacityMax && (
          <p className="text-[9.5px] text-red-400 font-bold uppercase leading-none mt-0.5">
            ⚠️ EXCESSO DE CARGA (+{(allocatedWeight - capacityMax).toLocaleString('pt-BR')} kg)
          </p>
        )}
      </div>

      {/* Selected highlights context (Slices space beautifully if selected) */}
      {isSelectedActive && !isSelectionTooHeavy && (
        <div className="p-1.5 rounded bg-indigo-950/20 border border-indigo-900/40 text-[10.5px] grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono mt-0.5">
          <div className="text-slate-400">
            A alocar: <span className="font-bold text-white">{selectedWeight.toLocaleString('pt-BR')} kg</span>
          </div>
          <div className="text-slate-400 text-right">
            Sobra: <span className="font-bold text-teal-400">{(remainingPayload - selectedWeight).toLocaleString('pt-BR')} kg</span>
          </div>
        </div>
      )}

      {/* Draft elements inside accordion drawer - Keep it super tight! */}
      {draftCtrcs.length > 0 && (
        <div className="bg-[#05080f]/90 rounded-lg border border-[#16223f] p-1 flex flex-col gap-0.5 max-h-16 overflow-y-auto mt-0.5 scrollbar-none font-sans text-[9px]">
          <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[8px] px-1 border-b border-[#16223f]/60 pb-0.5 shrink-0 select-none">
            <span>Fila de Rascunho ({draftCtrcs.length})</span>
            <button onClick={onClearDraft} className="text-red-400 hover:text-red-300 cursor-pointer">
              LIMPAR
            </button>
          </div>
          <div className="divide-y divide-[#16223f]/30">
            {draftCtrcs.map((c) => (
              <div key={c.id} className="flex justify-between items-center py-0.5 px-1 leading-none">
                <span className="truncate max-w-[140px] text-slate-350 uppercase">
                  {c.id} · {c.destinatario}
                </span>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-slate-405 font-medium">{(c.peso_r || c.weight || 0)}kg</span>
                  <button
                    onClick={() => onUnassignCarga(c.id)}
                    className="text-slate-505 hover:text-red-400 text-[11px] font-bold p-0 leading-none cursor-pointer"
                    title="Excluir do rascunho"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          LINHA 4: BOTÕES DE OPERAÇÃO
          ---------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-1.5 mt-0.5">
        <button
          onClick={onAllocateSelected}
          disabled={selectedWeight === 0 || isSelectionTooHeavy}
          className={`text-[10px] py-1 rounded font-black uppercase tracking-wide cursor-pointer text-center select-none transition-all duration-150 ${
            selectedWeight > 0 && !isSelectionTooHeavy
              ? 'bg-indigo-650 hover:bg-indigo-550 text-white shadow-xs font-black'
              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed font-medium'
          }`}
        >
          Alocar
        </button>

        <button
          onClick={onEmitRomaneio}
          disabled={draftCtrcs.length === 0}
          className={`text-[10px] py-1 rounded font-black uppercase tracking-wide cursor-pointer text-center select-none transition-all duration-150 ${
            draftCtrcs.length > 0
              ? 'bg-emerald-650 hover:bg-emerald-555 text-white shadow-xs font-bold'
              : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed font-medium'
          }`}
        >
          Emitir
        </button>
      </div>

    </div>
  );
}
