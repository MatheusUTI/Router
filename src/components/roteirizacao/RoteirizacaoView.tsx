import React, { useState, useEffect, useMemo } from 'react';
import { Ctrc, Vehicle, AppUser, CurvaAClient, DeliveryOccurrence, RoteirizacaoItem, CidadeRota, CurvaAClientLocal, Helper, RoutePlanningItem, DensityMode, RoteirizacaoPreferences } from '../../types';
import { OccurrenceRepository } from '../../infrastructure/localdb/repositories/occurrenceRepository';
import { CidadeRotaRepository } from '../../infrastructure/localdb/repositories/cidadeRotaRepository';
import { CurvaAClientRepository } from '../../infrastructure/localdb/repositories/curvaAClientRepository';
import { HelperRepository } from '../../infrastructure/localdb/repositories/helperRepository';
import { RoutePlanningRepository } from '../../infrastructure/localdb/repositories/routePlanningRepository';
import { UserPreferenceRepository } from '../../infrastructure/localdb/repositories/userPreferenceRepository';
import { RoteirizacaoEnrichmentService } from './services/roteirizacaoEnrichmentService';

// Modular Imports
import RoteirizacaoHeader from './RoteirizacaoHeader';
import CargaList from './CargaList';
import ConsolidacaoDrawer from './ConsolidacaoDrawer';
import SelectionSummary from './SelectionSummary';

// Custom Hooks
import { useRoteirizacaoFilters } from './hooks/useRoteirizacaoFilters';
import { useCargaSelection } from './hooks/useCargaSelection';
import { useRoteirizacaoGrouping } from './hooks/useRoteirizacaoGrouping';
import { useVehicleAllocation } from './hooks/useVehicleAllocation';

interface RoteirizacaoViewProps {
  availableCtrcs: Ctrc[];
  vehicles: Vehicle[];
  onAssignCtre: (ctrcId: string, vehicleId: string) => void;
  onConsolidateRomaneio: (vehicleId: string, assignedCtrcs: Ctrc[]) => void;
  adminUser: AppUser;
  curvaAClients?: CurvaAClient[];
}

export default function RoteirizacaoView({
  availableCtrcs = [],
  vehicles = [],
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
  curvaAClients = [],
}: RoteirizacaoViewProps) {
  // Operational caching of enrichment bases
  const [dbOccurrencesList, setDbOccurrencesList] = useState<DeliveryOccurrence[]>([]);
  const [cidadesRotas, setCidadesRotas] = useState<CidadeRota[]>([]);
  const [curvaAClientsLocal, setCurvaAClientsLocal] = useState<CurvaAClientLocal[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [routePlanningItems, setRoutePlanningItems] = useState<RoutePlanningItem[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // User Preferences sync and visual density management
  const [densityMode, setDensityMode] = useState<DensityMode>('default');
  const [isPrefLoaded, setIsPrefLoaded] = useState<boolean>(false);

  // Unified running time
  const [currentTime, setCurrentTime] = useState<string>('');

  // Define planning date (defaults to today's date formatted as YYYY-MM-DD)
  const [planningDate, setPlanningDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Toast status notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Poll database load auxiliary libraries in parallel
  useEffect(() => {
    const loadEnrichmentBases = async () => {
      setIsNormalizing(true);
      try {
        const [occList, crList, caList, hList, planList] = await Promise.all([
          OccurrenceRepository.getAll().catch(() => [] as DeliveryOccurrence[]),
          CidadeRotaRepository.getAll().catch(() => [] as CidadeRota[]),
          CurvaAClientRepository.getAll().catch(() => [] as CurvaAClientLocal[]),
          HelperRepository.getAll().catch(() => [] as Helper[]),
          RoutePlanningRepository.getAll().catch(() => [] as RoutePlanningItem[]),
        ]);

        setDbOccurrencesList(occList);
        setCidadesRotas(crList);
        setCurvaAClientsLocal(caList);
        setHelpers(hList);
        setRoutePlanningItems(planList);
      } catch (e) {
        console.error('[Roteirizacao] Erro carregando bases auxiliares de enriquecimento:', e);
      } finally {
        setIsNormalizing(false);
      }
    };
    loadEnrichmentBases();
  }, []);

  // Set up planning update callback handler
  const handleUpdatePlanning = async (ctrcId: string, patch: Partial<RoutePlanningItem>) => {
    try {
      const updatedItem = await RoutePlanningRepository.upsertForCtrc(ctrcId, planningDate, patch);
      
      setRoutePlanningItems((prev) => {
        const index = prev.findIndex((p) => p.id === updatedItem.id);
        if (index > -1) {
          const next = [...prev];
          next[index] = updatedItem;
          return next;
        } else {
          return [...prev, updatedItem];
        }
      });

      setToastMessage(`📝 Planejamento atualizado para CTRC ${ctrcId}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('[Roteirizacao] Erro ao salvar planejamento local:', err);
    }
  };

  // Combine prop curvaAClients and custom curving clients stored locally
  const combinedCurvaClients = useMemo(() => {
    const arr: CurvaAClient[] = [...curvaAClients];
    curvaAClientsLocal.forEach((lc) => {
      if (lc.ativo) {
        const exists = arr.some(
          (a) => a.cnpj_remetente === lc.cnpj_remetente || a.cliente_remetente === lc.cliente_remetente
        );
        if (!exists) {
          arr.push({
            cnpj_remetente: lc.cnpj_remetente,
            cliente_remetente: lc.cliente_remetente,
            curva_a: lc.curva_a,
          });
        }
      }
    });
    return arr;
  }, [curvaAClients, curvaAClientsLocal]);

  // Dynamic enrichment output mapping to RoteirizacaoItem list
  const enrichedCtrcsList = useMemo(() => {
    if (isNormalizing) return [] as RoteirizacaoItem[];
    return RoteirizacaoEnrichmentService.enrichCargas(
      availableCtrcs,
      cidadesRotas,
      dbOccurrencesList,
      combinedCurvaClients,
      vehicles,
      [], // drivers score if not retrieved yet
      helpers,
      routePlanningItems
    );
  }, [availableCtrcs, cidadesRotas, dbOccurrencesList, combinedCurvaClients, vehicles, helpers, isNormalizing, routePlanningItems]);

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
    return enrichedCtrcsList.filter((c) => !draftAssignments[c.id]);
  }, [enrichedCtrcsList, draftAssignments]);

  // Hook-centric management of filters and text search
  const {
    selectedUnit,
    setSelectedUnit,
    selectedSector,
    setSelectedSector,
    selectedLocationFilter,
    setSelectedLocationFilter,
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

  // Helper to save setting update
  const handleUpdatePreference = async (partial: Partial<RoteirizacaoPreferences>) => {
    if (!adminUser || !adminUser.username) return;
    try {
      const username = adminUser.username;
      const localPref = await UserPreferenceRepository.getLocalPreference(username, 'roteirizacao');
      const existingRoteirizacao = localPref?.preferences?.roteirizacao || {};
      
      const newRoteirizacao = {
        ...existingRoteirizacao,
        ...partial
      };

      // 1. Salvar localmente imediatamente
      const updated = await UserPreferenceRepository.mergeLocalPreference(
        username,
        'roteirizacao',
        { roteirizacao: newRoteirizacao }
      );
      
      // 2. Chamar o push para o Supabase em background (não-bloqueante)
      UserPreferenceRepository.pushUserPreferenceToCloud(updated).catch((err) => {
        console.warn('[Roteirizacao] Erro silencioso ao tentar sincronizar preferência com nuvem:', err);
      });
    } catch (err) {
      console.error('[Roteirizacao] Erro ao salvar preferência:', err);
    }
  };

  // Synchronized Preferences Loading on load
  useEffect(() => {
    const loadAndSyncPreferences = async () => {
      if (!adminUser || !adminUser.username) return;
      
      const username = adminUser.username;
      
      try {
        // 1. Load Local cached preferences first (for instant apply)
        const localPref = await UserPreferenceRepository.getLocalPreference(username, 'roteirizacao');
        if (localPref && localPref.preferences && localPref.preferences.roteirizacao) {
          const rotPref = localPref.preferences.roteirizacao;
          if (rotPref.densityMode) {
            setDensityMode(rotPref.densityMode);
          }
          if (rotPref.groupingMode) {
            setGroupingMode(rotPref.groupingMode as any);
          }
          if (rotPref.selectedUnit) {
            setSelectedUnit(rotPref.selectedUnit);
          }
          if (rotPref.selectedSector) {
            setSelectedSector(rotPref.selectedSector);
          }
          if (rotPref.selectedLocationFilter) {
            setSelectedLocationFilter(rotPref.selectedLocationFilter);
          }
          if (rotPref.activeTacticalFilter) {
            setActiveTacticalFilter(rotPref.activeTacticalFilter);
          }
        }
        setIsPrefLoaded(true);

        // 2. Tentar sincronizar e buscar preferências atualizadas do Supabase em background
        await UserPreferenceRepository.syncUserPreferences(username);

        // 3. Recarregar após a sincronia em background se houver alguma versão mais nova
        const syncedPref = await UserPreferenceRepository.getLocalPreference(username, 'roteirizacao');
        if (syncedPref && syncedPref.preferences && syncedPref.preferences.roteirizacao) {
          const rotPref = syncedPref.preferences.roteirizacao;
          if (rotPref.densityMode) {
            setDensityMode(rotPref.densityMode);
          }
          if (rotPref.groupingMode) {
            setGroupingMode(rotPref.groupingMode as any);
          }
          if (rotPref.selectedUnit) {
            setSelectedUnit(rotPref.selectedUnit);
          }
          if (rotPref.selectedSector) {
            setSelectedSector(rotPref.selectedSector);
          }
          if (rotPref.selectedLocationFilter) {
            setSelectedLocationFilter(rotPref.selectedLocationFilter);
          }
          if (rotPref.activeTacticalFilter) {
            setActiveTacticalFilter(rotPref.activeTacticalFilter);
          }
        }
      } catch (err) {
        console.error('[Roteirizacao] Erro no carregamento/sincronia das preferências do usuário:', err);
        setIsPrefLoaded(true);
      }
    };
    
    setIsPrefLoaded(false);
    loadAndSyncPreferences();
  }, [adminUser?.username]);

  // Save preferences when state changes
  useEffect(() => {
    if (!isPrefLoaded || isNormalizing) return;
    
    handleUpdatePreference({
      densityMode,
      groupingMode,
      selectedUnit,
      selectedSector,
      selectedLocationFilter,
      activeTacticalFilter
    });
  }, [densityMode, groupingMode, selectedUnit, selectedSector, selectedLocationFilter, activeTacticalFilter, isPrefLoaded, isNormalizing]);

  // Checklist aggregation totals calculation
  const { selectedWeight, selectedVolume, selectedValue, selectedFrete } = useMemo(() => {
    // Collect active checked entries
    const checkedItems = filteredCtrcs.filter((c) => selectedIds.includes(c.id));
    const weightSum = checkedItems.reduce((sum, item) => sum + (item.peso_r || item.weight || 0), 0);
    const volumeSum = checkedItems.reduce((sum, item) => sum + (item.volume || 1), 0);
    const valueSum = checkedItems.reduce((sum, item) => sum + (item.valor || 0), 0);
    const freteSum = checkedItems.reduce((sum, item) => sum + (item.frete || 0), 0);

    return {
      selectedWeight: weightSum,
      selectedVolume: volumeSum,
      selectedValue: valueSum,
      selectedFrete: freteSum,
    };
  }, [filteredCtrcs, selectedIds]);

  const selectedCtrcsList = useMemo(() => {
    return filteredCtrcs.filter((c) => selectedIds.includes(c.id));
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
    const draftedItemsOfVehicle = enrichedCtrcsList.filter((c) => draftAssignments[c.id] === vehicleId);
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
    <div className="w-full flex flex-col h-[calc(100vh-12px)] bg-[#080c14] border border-[#1a2440] rounded-2xl overflow-hidden relative text-slate-200 select-none">
      {/* Prime Header Block */}
      <RoteirizacaoHeader
        adminUser={adminUser}
        selectedUnit={selectedUnit}
        setSelectedUnit={setSelectedUnit}
        selectedSector={selectedSector}
        setSelectedSector={setSelectedSector}
        selectedLocationFilter={selectedLocationFilter}
        setSelectedLocationFilter={setSelectedLocationFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTacticalFilter={activeTacticalFilter}
        setActiveTacticalFilter={setActiveTacticalFilter}
        uniqueSectors={uniqueSectors}
        totalCtrcsCount={unassignedCtrcs.length}
        filteredCtrcsCount={filteredCtrcs.length}
        onClearFilters={clearFilters}
        currentTime={currentTime}
        onOpenFleetDrawer={() => setIsDrawerOpen(true)}
        draftCount={Object.keys(draftAssignments).length}
        planningDate={planningDate}
      />

      {/* Main Containers: Left List (Full Width) */}
      <div className="flex-1 flex gap-3 p-3 min-h-0 relative">
        {/* Cargo Fila Column */}
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
            onUpdatePlanning={handleUpdatePlanning}
            densityMode={densityMode}
            onUpdateDensity={(density) => setDensityMode(density)}
          />
        )}
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
        selectedCtrcs={selectedCtrcsList}
        onOpenConsolidacao={() => setIsDrawerOpen(true)}
        onClearSelection={clearSelection}
      />

      {/* Slide-over Consolidation & Fleet Alocation Drawer */}
      <ConsolidacaoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        vehicles={vehicles}
        draftAssignments={draftAssignments}
        selectedIds={selectedIds}
        selectedWeight={selectedWeight}
        selectedVolume={selectedVolume}
        selectedValue={selectedValue}
        selectedFrete={selectedFrete}
        availablePendingCtrcs={enrichedCtrcsList}
        onAllocateSelectedToVehicle={handleAssignSelectionToVehicle}
        onEmitRomaneio={handleEmitRomaneio}
        onUnassignCarga={unassignCarga}
        onClearVehicleDraft={clearVehicleDraft}
      />
    </div>
  );
}
