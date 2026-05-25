import React from 'react';
import { Vehicle } from '../../types';

interface SelectionSummaryProps {
  selectedCount: number;
  selectedWeight: number;
  selectedVolume: number;
  selectedValue: number;
  vehicles: Vehicle[];
  onAllocateToVehicle: (vehicleId: string) => void;
  onClearSelection: () => void;
}

export default function SelectionSummary({
  selectedCount,
  selectedWeight,
  selectedVolume,
  selectedValue,
  vehicles,
  onAllocateToVehicle,
  onClearSelection,
}: SelectionSummaryProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-[#121c33] border-t border-[#1a3875] h-10 px-4 flex items-center justify-between z-40 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.5)]">
      {/* Selection Stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded text-[11px] min-w-[20px] text-center">
            {selectedCount}
          </span>
          <span className="text-indigo-200 font-semibold uppercase">CTRCs Selecionados</span>
        </div>

        <div className="h-4 w-px bg-slate-700"></div>

        <div className="text-slate-300 font-mono">
          PESO TOTAL: <span className="text-emerald-400 font-bold">{selectedWeight.toLocaleString('pt-BR')} kg</span>
        </div>

        <div className="h-4 w-px bg-slate-700"></div>

        <div className="text-slate-300 font-mono">
          VOLUMES: <span className="text-yellow-400 font-bold">{selectedVolume}</span>
        </div>

        <div className="h-4 w-px bg-slate-700 font-mono"></div>

        <div className="text-slate-300 hidden md:block font-mono">
          VALOR: <span className="text-indigo-300 font-bold">R$ {selectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Instant Action Alocation controls */}
      <div className="flex items-center gap-2">
        <button
          id="btn-clear-selection-footer"
          onClick={onClearSelection}
          className="text-[11px] text-slate-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1 hover:bg-[#1a2440] rounded transition-all transition-duration-150 cursor-pointer"
        >
          Limpar Seleção
        </button>

        <div className="h-5 w-px bg-indigo-900/40"></div>

        <div className="flex items-center gap-1.5 bg-[#070c14]/50 rounded px-2 py-0.5 border border-indigo-500/30">
          <span className="text-[10px] text-indigo-300 font-bold uppercase font-mono">DESPACHAR PARA:</span>
          <select
            id="footer-fast-vehicle-dispatcher"
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                onAllocateToVehicle(val);
                e.target.value = ''; // Reset select value after triggers
              }
            }}
            defaultValue=""
            className="bg-transparent border-none text-white text-[11px] font-mono leading-none focus:outline-none focus:ring-0 cursor-pointer p-0 font-bold"
          >
            <option value="" disabled className="bg-[#0b1322]">SELECIONE VEÍCULO</option>
            {vehicles
              .filter((v) => v.status === 'Disponível' || v.status === 'Em Rota')
              .map((v) => (
                <option key={v.id} value={v.id} className="bg-[#0b1322] font-mono">
                  {v.id} ({v.type} - {v.capacity})
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
}
