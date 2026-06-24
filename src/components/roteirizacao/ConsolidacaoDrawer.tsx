import React, { useMemo } from 'react';
import { Vehicle, Ctrc, RoteirizacaoItem } from '../../types';
import VehicleCard from './VehicleCard';

interface ConsolidacaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  draftAssignments: Record<string, string>;
  selectedIds: string[];
  selectedWeight: number;
  selectedVolume: number;
  selectedValue: number;
  selectedFrete?: number;
  availablePendingCtrcs: RoteirizacaoItem[];
  onAllocateSelectedToVehicle: (vehicleId: string) => void;
  onEmitRomaneio: (vehicleId: string) => void;
  onUnassignCarga: (cargaId: string) => void;
  onClearVehicleDraft: (vehicleId: string) => void;
}

export default function ConsolidacaoDrawer({
  isOpen,
  onClose,
  vehicles,
  draftAssignments,
  selectedIds,
  selectedWeight,
  selectedVolume,
  selectedValue,
  selectedFrete = 0,
  availablePendingCtrcs,
  onAllocateSelectedToVehicle,
  onEmitRomaneio,
  onUnassignCarga,
  onClearVehicleDraft,
}: ConsolidacaoDrawerProps) {
  if (!isOpen) return null;

  // Filter active and manageable vehicle list
  const activeVehicles = vehicles.filter((v) => v.status === 'Disponível' || v.status === 'Em Rota');

  // Compute stats of selected cargas for visual compatibility matching inside each VehicleCard
  const selectedCtrcs = useMemo(() => {
    return availablePendingCtrcs.filter((ctrc) => selectedIds.includes(ctrc.id));
  }, [availablePendingCtrcs, selectedIds]);

  const uniqueCities = useMemo(() => {
    return new Set(selectedCtrcs.map((c) => c.normCidade?.toUpperCase().trim() || '')).size;
  }, [selectedCtrcs]);

  const delayedCount = useMemo(() => {
    return selectedCtrcs.filter((c) => c.slaStatus?.isDelayed).length;
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

  // Determine RECOMMENDED vehicle dynamically
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
        // Choose the vehicle with the smallest leftover space (tightest fit)
        if (leftoverSpace < minLeftoverSpace) {
          minLeftoverSpace = leftoverSpace;
          bestMatchVehicleId = v.id;
        }
      }
    }

    return bestMatchVehicleId;
  }, [activeVehicles, availablePendingCtrcs, draftAssignments, selectedWeight]);

  // Sort recommendation vehicle to the top
  const finalVehiclesList = useMemo(() => {
    if (!recommendedVehicleId) return activeVehicles;
    return [...activeVehicles].sort((a, b) => {
      if (a.id === recommendedVehicleId) return -1;
      if (b.id === recommendedVehicleId) return 1;
      return 0;
    });
  }, [activeVehicles, recommendedVehicleId]);

  return (
    <>
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-45 transition-all duration-200" 
        onClick={onClose} 
      />

      {/* Drawer Body Sliding-in */}
      <div className="fixed top-0 right-0 h-full w-[460px] max-w-full bg-[var(--router-bg)] border-l border-[var(--router-border)] shadow-[var(--router-shadow)] z-50 flex flex-col overflow-hidden animate-[slide-in_200ms_ease-out]">
        
        {/* Header Section */}
        <div className="bg-[var(--router-surface)] px-4 py-3 border-b border-[var(--router-border)] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-base">🚛</span>
            <div>
              <h2 className="text-[13px] font-black text-[var(--router-text)] dark:text-[var(--router-text)] uppercase tracking-widest leading-none">CONSOLIDAÇÃO E FROTA</h2>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase font-mono mt-0.5">ALOCAÇÃO DE VEÍCULO EM PÁTIO</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] dark:text-[var(--router-text-muted)] dark:hover:text-white font-black text-lg p-1.5 hover:bg-[var(--router-surface-2)] dark:hover:bg-[#1a2440] rounded transition-all cursor-pointer leading-none"
            title="Fechar Painel"
          >
            &times;
          </button>
        </div>

        {/* Selected Cargo Mini Summary Metrics inside the Drawer */}
        <div className="bg-[var(--router-surface-2)] border-b border-[var(--router-border)] p-3 text-xs shrink-0 select-none">
          {selectedIds.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-indigo-700 dark:text-indigo-300 font-black uppercase text-[12px] tracking-wider">Carga Consolidada Pronta:</span>
                <span className="bg-indigo-600 dark:bg-indigo-650 text-white font-black px-1.5 py-0.3 rounded text-[11px]">
                  {selectedIds.length} CTRCs
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[12.5px] font-mono border-t border-[var(--router-border)] pt-1.5 text-[var(--router-text-muted)]">
                <div>
                  PESO: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedWeight >= 1000 ? `${(selectedWeight / 1000).toFixed(2)}t` : `${selectedWeight} kg`}</span>
                </div>
                <div>
                  VOLUMES: <span className="text-amber-600 dark:text-yellow-400 font-bold">{selectedVolume}</span>
                </div>
                <div>
                  CIDADES: <span className="text-sky-600 dark:text-sky-400 font-bold">{uniqueCities}</span>
                </div>
                <div>
                  ATRASADOS: <span className={`font-bold ${delayedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--router-text-muted)] dark:text-[var(--router-text-muted)]'}`}>{delayedCount}</span>
                </div>
              </div>

              {recommendedVehicleId && (
                <div className="mt-1 bg-[var(--router-warning)]/10 border border-[var(--router-warning)]/20 rounded p-1.5 text-[11.5px] text-[var(--router-warning)] flex items-start gap-1 font-sans leading-relaxed">
                  <span>💡</span>
                  <p className="font-bold">
                    Veículo <span className="font-mono bg-[var(--router-warning)]/20 px-1 rounded">{recommendedVehicleId}</span> é recomendado para este lote por eficiência de aproveitamento de carga.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-center py-1">
              <span className="text-[var(--router-text-muted)] text-[11.5px] uppercase font-bold tracking-wider">Nenhum CTRC selecionado à parte</span>
              <p className="text-[11px] text-[var(--router-text-muted)] font-medium leading-normal">Você está gerenciando rascunhos de carga e Romaneios existentes para cada veículo disponível no pátio.</p>
            </div>
          )}
        </div>

        {/* Vehicles Scrolling Panel Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-track-transparent dark:scrollbar-track-[#080c14] scrollbar-thumb-indigo-500 dark:scrollbar-thumb-indigo-550 scroll-smooth">
          {finalVehiclesList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[var(--router-text-muted)] gap-1.5 p-4 text-center">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-bold uppercase font-mono">Nenhum veículo disponível no pátio logístico</p>
              <p className="text-[10px] text-[var(--router-text-muted)] dark:text-[var(--router-text-soft)] uppercase">Verifique o cadastro de frotas e certifique-se de que há veículos ativos com status Pátio.</p>
            </div>
          ) : (
            finalVehiclesList.map((vehicle) => {
              // Retrieve CTRCs currently drafted to this specific vehicle
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
                  onAllocateSelected={() => {
                    onAllocateSelectedToVehicle(vehicle.id);
                    onClose(); // Automatically close side-drawer upon successful allocation for smooth UX!
                  }}
                  onEmitRomaneio={() => {
                    onEmitRomaneio(vehicle.id);
                  }}
                  onUnassignCarga={onUnassignCarga}
                  onClearDraft={() => onClearVehicleDraft(vehicle.id)}
                  isRecommended={vehicle.id === recommendedVehicleId}
                />
              );
            })
          )}
        </div>

        {/* Footer Area with informative message */}
        <div className="bg-[var(--router-surface)] border-t border-[var(--router-border)] p-3 text-center text-[9.5px] text-[var(--router-text-muted)] select-none uppercase font-mono shrink-0">
          <span>Soberania Offline · Router Expedição</span>
        </div>

      </div>
    </>
  );
}
