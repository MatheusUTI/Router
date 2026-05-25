import React, { useState, useEffect, useMemo } from 'react';
import { Ctrc, Vehicle, AppUser, CurvaAClient, DeliveryOccurrence } from '../../types';
import { OccurrenceRepository } from '../../infrastructure/localdb/repositories/occurrenceRepository';
import { CidadeRotaRepository } from '../../infrastructure/localdb/repositories/cidadeRotaRepository';

// Modular Imports
import RoteirizacaoHeader from './RoteirizacaoHeader';
import CargaList from './CargaList';
import FrotaPanel from './FrotaPanel';
import SelectionSummary from './SelectionSummary';

// Custom Hooks
import { useRoteirizacaoFilters } from './hooks/useRoteirizacaoFilters';
import { useCargaSelection } from './hooks/useCargaSelection';
import { useRoteirizacaoGrouping } from './hooks/useRoteirizacaoGrouping';
import { useVehicleAllocation } from './hooks/useVehicleAllocation';

// Custom Helpers
import { isClienteCurvaA } from './helpers/isClienteCurvaA';

interface RoteirizacaoViewProps {
  availableCtrcs: Ctrc[];
  vehicles: Vehicle[];
  onAssignCtre: (ctrcId: string, vehicleId: string) => void;
  onConsolidateRomaneio: (vehicleId: string, assignedCtrcs: Ctrc[]) => void;
  adminUser: AppUser;
  curvaAClients?: CurvaAClient[];
}

export interface NormalizedCtrc extends Ctrc {
  unid: string;
  normCidade: string;
  normSetor: string;
  normRota: string;
  normPrazo: number;
  normPriority: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA';
  isCurvaA: boolean;
  curvaAClass?: string;
  enrichedOcorrenciaDesc?: string;
  enrichedOcorrenciaTratativa?: string;
}

export default function RoteirizacaoView({
  availableCtrcs = [],
  vehicles = [],
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
  curvaAClients = [],
}: RoteirizacaoViewProps) {
  // Operational caching of occurrences
  const [dbOccurrences, setDbOccurrences] = useState<Record<string, DeliveryOccurrence>>({});

  // Unified running time
  const [currentTime, setCurrentTime] = useState<string>('');

  // Toast status notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Normalization state
  const [normalizedCtrcs, setNormalizedCtrcs] = useState<NormalizedCtrc[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(true);

  // Load clock ticking (UTC 15:58 standard)
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll database load occurrences
  useEffect(() => {
    const loadCache = async () => {
      try {
        const occList = await OccurrenceRepository.getAll();
        const map: Record<string, DeliveryOccurrence> = {};
        occList.forEach((occ) => {
          map[occ.codigo] = occ;
        });
        setDbOccurrences(map);
      } catch (e) {
        console.error('[Roteirizacao] Erro carregando banco de ocorrencias:', e);
      }
    };
    loadCache();
  }, []);

  // Sync available pending items with custom autopilot normalization rules
  useEffect(() => {
    const syncAndNormalize = async () => {
      setIsNormalizing(true);
      const items: NormalizedCtrc[] = [];

      for (const c of availableCtrcs) {
        const unitLabel = (c.unid || c.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();

        let normCidade = c.cidade_ent || c.cidade || 'NÃO ESPECIFICADO';
        normCidade = normCidade.split(',')[0].trim().toUpperCase();

        let normSetor = c.setor || 'NÃO DEFINIDO';
        let normRota = 'ROTA INDEFINIDA';
        let normPrazo = 2; // Default Standard Transit Day D+2
        let normPriority: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA' = 'NORMAL';

        // Autopilot smart corrector lookup
        try {
          const match = await CidadeRotaRepository.normalize(normCidade, c.setor);
          normCidade = match.cidade;
          normSetor = match.setor;
          normRota = match.rota;
          normPrazo = match.prazo;
          normPriority = match.prioridade;
        } catch (e) {
          // fallback gracefully
        }

        // Curva A check
        const curvaCheck = isClienteCurvaA(c, curvaAClients);

        items.push({
          ...c,
          unid: unitLabel,
          normCidade,
          normSetor,
          normRota,
          normPrazo,
          normPriority,
          isCurvaA: curvaCheck.isCurvaA,
          curvaAClass: curvaCheck.classification || 'A',
        });
      }

      setNormalizedCtrcs(items);
      setIsNormalizing(false);
    };

    syncAndNormalize();
  }, [availableCtrcs, dbOccurrences, curvaAClients]);

  // Temporary allocations triggers
  const {
    draftAssignments,
    setDraftAssignments,
    assignCargasToVehicle,
    unassignCarga,
    clearVehicleDraft,
  } = useVehicleAllocation();

  // Clean stale draft allocations which are no longer present inside availableCtrcs elements
  useEffect(() => {
    const activeIds = availableCtrcs.map((c) => c.id);
    setDraftAssignments((prev) => {
      const copy: Record<string, string> = {};
      Object.keys(prev).forEach((id) => {
        if (activeIds.includes(id)) {
          copy[id] = prev[id];
        }
      });
      return copy;
    });
  }, [availableCtrcs, setDraftAssignments]);

  // Calculate unassigned pending items (that are not yet assigned to any vehicle in draft mode)
  const unassignedCtrcs = useMemo(() => {
    return normalizedCtrcs.filter((c) => !draftAssignments[c.id]);
  }, [normalizedCtrcs, draftAssignments]);

  // Hook-centric management of filters and text search
  const {
    selectedUnit,
    setSelectedUnit,
    selectedSector,
    setSelectedSector,
    searchQuery,
    setSearchQuery,
    activeTacticalFilter,
    setActiveTacticalFilter,
    uniqueSectors,
    filteredCtrcs,
    clearFilters,
  } = useRoteirizacaoFilters({
    ctrcs: unassignedCtrcs,
    adminUser,
  });

  // Checklist multi-select state management
  const {
    selectedIds,
    setSelectedIds,
    toggleRow,
    toggleSelectAll,
    clearSelection,
  } = useCargaSelection();

  // Subordinated colapsable groupings
  const {
    groupingMode,
    setGroupingMode,
    expandedGroups,
    toggleGroup,
    groupedData,
  } = useRoteirizacaoGrouping(filteredCtrcs);

  // Checklist aggregation totals calculation
  const { selectedWeight, selectedVolume, selectedValue } = useMemo(() => {
    // Collect active checked entries
    const checkedItems = filteredCtrcs.filter((c) => selectedIds.includes(c.id));
    const weightSum = checkedItems.reduce((sum, item) => sum + (item.peso_r || item.weight || 0), 0);
    const volumeSum = checkedItems.reduce((sum, item) => sum + (item.volume || 1), 0);
    const valueSum = checkedItems.reduce((sum, item) => sum + (item.valor || 0), 0);

    return {
      selectedWeight: weightSum,
      selectedVolume: volumeSum,
      selectedValue: valueSum,
    };
  }, [filteredCtrcs, selectedIds]);

  // Core functions for alocating selected items to individual plates
  const handleAssignSelectionToVehicle = (vehicleId: string) => {
    const itemsToAllocate = filteredCtrcs.filter((c) => selectedIds.includes(c.id));
    const count = itemsToAllocate.length;
    if (count === 0) return;

    assignCargasToVehicle(selectedIds, vehicleId);
    clearSelection();

    setToastMessage(`🚛 ${count} carga(s) alocada(s) temporariamente na placa ${vehicleId}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dispatch final consolidate, triggering DB writes
  const handleEmitRomaneio = (vehicleId: string) => {
    const draftedItemsOfVehicle = normalizedCtrcs.filter((c) => draftAssignments[c.id] === vehicleId);
    if (draftedItemsOfVehicle.length === 0) return;

    // Trigger sequential persistent callbacks
    draftedItemsOfVehicle.forEach((item) => {
      onAssignCtre(item.id, vehicleId);
    });

    // Remove from draft state triggers
    const ids = draftedItemsOfVehicle.map((t) => t.id);
    setDraftAssignments((prev) => {
      const copy = { ...prev };
      ids.forEach((id) => delete copy[id]);
      return copy;
    });

    // Save of the consolidated manifest
    onConsolidateRomaneio(vehicleId, draftedItemsOfVehicle);
  };

  // Group selection toggle dispatcher
  const handleToggleGroupSelection = (groupIds: string[]) => {
    const allChecked = groupIds.every((id) => selectedIds.includes(id));
    if (allChecked) {
      // unselect all these ids
      setSelectedIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      // select all these ids
      setSelectedIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-130px)] bg-[#080c14] border border-[#1a2440] rounded-2xl overflow-hidden relative text-slate-200 select-none">
      {/* Prime Header Block */}
      <RoteirizacaoHeader
        adminUser={adminUser}
        selectedUnit={selectedUnit}
        setSelectedUnit={setSelectedUnit}
        selectedSector={selectedSector}
        setSelectedSector={setSelectedSector}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTacticalFilter={activeTacticalFilter}
        setActiveTacticalFilter={setActiveTacticalFilter}
        uniqueSectors={uniqueSectors}
        totalCtrcsCount={unassignedCtrcs.length}
        filteredCtrcsCount={filteredCtrcs.length}
        onClearFilters={clearFilters}
        currentTime={currentTime}
      />

      {/* Main Containers: Left List & Right Fleet Panel */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 relative">
        {/* Left Cargo Fila Column */}
        {isNormalizing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-1.5 bg-[#080c14] border border-[#16223f] rounded-xl font-mono">
            <span className="animate-spin text-xl">⏳</span>
            <p className="text-xs font-bold uppercase">Correlacionando dicionários e rotas da malha...</p>
          </div>
        ) : (
          <CargaList
            filteredCtrcs={filteredCtrcs}
            groupingMode={groupingMode}
            setGroupingMode={setGroupingMode}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            groupedData={groupedData}
            selectedIds={selectedIds}
            onToggleItem={toggleRow}
            onToggleGroupSelection={handleToggleGroupSelection}
            onSelectAllVisible={toggleSelectAll}
            curvaAClients={curvaAClients}
            occurrencesDict={dbOccurrences}
          />
        )}

        {/* Right Active Fleet Column */}
        <FrotaPanel
          vehicles={vehicles}
          draftAssignments={draftAssignments}
          selectedIds={selectedIds}
          selectedWeight={selectedWeight}
          availablePendingCtrcs={normalizedCtrcs}
          onAllocateSelectedToVehicle={handleAssignSelectionToVehicle}
          onEmitRomaneio={handleEmitRomaneio}
          onUnassignCarga={unassignCarga}
          onClearVehicleDraft={clearVehicleDraft}
        />
      </div>

      {/* Persistent Overlay Toast alerts */}
      {toastMessage && (
        <div className="absolute top-16 right-4 z-50 bg-[#0d1527] border-l-4 border-indigo-500 border-y border-r border-indigo-500/20 text-indigo-300 text-xs p-3 rounded-lg shadow-2xl flex items-center gap-2 max-w-sm animate-bounce font-sans font-bold">
          <span>🚚</span>
          <p className="leading-tight uppercase font-mono">{toastMessage}</p>
        </div>
      )}

      {/* Expandable Footer Action parameters */}
      <SelectionSummary
        selectedCount={selectedIds.length}
        selectedWeight={selectedWeight}
        selectedVolume={selectedVolume}
        selectedValue={selectedValue}
        vehicles={vehicles}
        onAllocateToVehicle={handleAssignSelectionToVehicle}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
