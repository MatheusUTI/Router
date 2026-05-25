import React, { useMemo } from 'react';
import { Vehicle, Ctrc } from '../../types';
import VehicleCard from './VehicleCard';

interface FrotaPanelProps {
  vehicles: Vehicle[];
  draftAssignments: Record<string, string>;
  selectedIds: string[];
  selectedWeight: number;
  availablePendingCtrcs: Ctrc[];
  onAllocateSelectedToVehicle: (vehicleId: string) => void;
  onEmitRomaneio: (vehicleId: string) => void;
  onUnassignCarga: (cargaId: string) => void;
  onClearVehicleDraft: (vehicleId: string) => void;
}

export default function FrotaPanel({
  vehicles,
  draftAssignments,
  selectedIds,
  selectedWeight,
  availablePendingCtrcs,
  onAllocateSelectedToVehicle,
  onEmitRomaneio,
  onUnassignCarga,
  onClearVehicleDraft,
}: FrotaPanelProps) {
  // Filter active and manageable vehicle list
  const activeVehicles = vehicles.filter((v) => v.status === 'Disponível' || v.status === 'Em Rota');

  // Compute stats of selected cargas for visual compatibility matching inside each VehicleCard
  const selectedCtrcs = useMemo(() => {
    return availablePendingCtrcs.filter((ctrc) => selectedIds.includes(ctrc.id));
  }, [availablePendingCtrcs, selectedIds]);

  const selectedVolume = useMemo(() => {
    return selectedCtrcs.reduce((sum, c) => sum + (c.volume || 1), 0);
  }, [selectedCtrcs]);

  const selectedValue = useMemo(() => {
    return selectedCtrcs.reduce((sum, c) => sum + (c.valor || 0), 0);
  }, [selectedCtrcs]);

  const selectedFrete = useMemo(() => {
    return selectedCtrcs.reduce((sum, c) => sum + (c.frete || 0), 0);
  }, [selectedCtrcs]);

  // Helper to parse maximum vehicle payload capacity
  const parseVehicleCapacityLocal = (capacityStr: string): number => {
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

  // Determine RECOMMENDED vehicle dynamically (Point 6 Constraints)
  const recommendedVehicleId = useMemo(() => {
    if (selectedWeight <= 0) return null;
    
    let bestMatchVehicleId: string | null = null;
    let minLeftoverSpace = Infinity;

    for (const v of activeVehicles) {
      const capMax = parseVehicleCapacityLocal(v.capacity);
      // Cargas already draft-assigned to this vehicle
      const currentDraftCtrcs = availablePendingCtrcs.filter(
        (c) => draftAssignments[c.id] === v.id
      );
      const allocatedWeight = currentDraftCtrcs.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
      const remainingSpace = capMax - allocatedWeight;

      // Fit requirement: selected weight can fit in the vehicle without overloading
      if (selectedWeight <= remainingSpace) {
        const leftoverSpace = remainingSpace - selectedWeight;
        // Optimization choice: Choose the vehicle with the smallest leftover space (tightest compact fit)
        if (leftoverSpace < minLeftoverSpace) {
          minLeftoverSpace = leftoverSpace;
          bestMatchVehicleId = v.id;
        }
      }
    }

    return bestMatchVehicleId;
  }, [activeVehicles, availablePendingCtrcs, draftAssignments, selectedWeight]);

  // Sort recommendation vehicle to the top (Point 6 requirement)
  const finalVehiclesList = useMemo(() => {
    if (!recommendedVehicleId) return activeVehicles;
    return [...activeVehicles].sort((a, b) => {
      if (a.id === recommendedVehicleId) return -1;
      if (b.id === recommendedVehicleId) return 1;
      return 0;
    });
  }, [activeVehicles, recommendedVehicleId]);

  return (
    <div className="w-[380px] flex flex-col bg-[#080c14] border border-[#16223f] rounded-xl overflow-hidden shrink-0">
      {/* Panel title */}
      <div className="bg-[#0b1322] px-3 py-2 border-b border-[#1a2440] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-sm">🚚</span>
          <div>
            <h2 className="text-xs font-black text-slate-100 uppercase tracking-wider">PAINEL DA FROTA</h2>
            <p className="text-[9px] text-indigo-400 font-bold leading-none uppercase font-mono mt-0.5">DISPONÍVEL EM PATIO</p>
          </div>
        </div>
        <span className="bg-[#070c14] border border-[#16223f] text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded">
          {activeVehicles.length} VEÍCULOS
        </span>
      </div>

      {/* Vehicles list inside container */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin scrollbar-track-[#080c14] scrollbar-thumb-indigo-550 scroll-smooth">
        {finalVehiclesList.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-1.5 p-4 text-center">
            <span className="text-3xl">📭</span>
            <p className="text-xs font-bold uppercase font-mono">Nenhum veículo disponível no pátio logístico</p>
            <p className="text-[10px] text-slate-600 uppercase">Acesse o cadastro de frotas para lançar e liberar veículos adicionais.</p>
          </div>
        ) : (
          finalVehiclesList.map((vehicle) => {
            // Retrieve CTRCs allocated drafted to this specific vehicle
            const draftCtrcs = availablePendingCtrcs.filter(
              (ctrc) => draftAssignments[ctrc.id] === vehicle.id
            );

            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                draftCtrcs={draftCtrcs}
                selectedWeight={selectedWeight}
                selectedVolume={selectedVolume}
                selectedValue={selectedValue}
                selectedFrete={selectedFrete}
                onAllocateSelected={() => onAllocateSelectedToVehicle(vehicle.id)}
                onEmitRomaneio={() => onEmitRomaneio(vehicle.id)}
                onUnassignCarga={onUnassignCarga}
                onClearDraft={() => onClearVehicleDraft(vehicle.id)}
                isRecommended={vehicle.id === recommendedVehicleId}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
