import React, { useState, useEffect, useMemo } from 'react';
import { Ctrc, Vehicle, AppUser, CurvaAClient, DeliveryOccurrence, RoteirizacaoItem, CidadeRota, CurvaAClientLocal, Helper, RoutePlanningItem, DensityMode, RoteirizacaoPreferences, PreRomaneio, RouteGateMap, CriticClient } from '../../types';
import { OccurrenceRepository } from '../../infrastructure/localdb/repositories/occurrenceRepository';
import { CidadeRotaRepository } from '../../infrastructure/localdb/repositories/cidadeRotaRepository';
import { CurvaAClientRepository } from '../../infrastructure/localdb/repositories/curvaAClientRepository';
import { HelperRepository } from '../../infrastructure/localdb/repositories/helperRepository';
import { RoutePlanningRepository } from '../../infrastructure/localdb/repositories/routePlanningRepository';
import { UserPreferenceRepository } from '../../infrastructure/localdb/repositories/userPreferenceRepository';
import { RouteGateRepository } from '../../infrastructure/localdb/repositories/routeGateRepository';
import { PreRomaneioRepository } from '../../infrastructure/localdb/repositories/preRomaneioRepository';
import { RoteirizacaoEnrichmentService } from './services/roteirizacaoEnrichmentService';

// Modular Imports
import RoteirizacaoHeader from './RoteirizacaoHeader';
import CargaList from './CargaList';
import ConsolidacaoDrawer from './ConsolidacaoDrawer';
import SelectionSummary from './SelectionSummary';
import OperationalNoticesBanner from './OperationalNoticesBanner';

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
  criticClients?: CriticClient[];
}

export default function RoteirizacaoView({
  availableCtrcs = [],
  vehicles = [],
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
  curvaAClients = [],
  criticClients = [],
}: RoteirizacaoViewProps) {
  // Operational caching of enrichment bases
  const [dbOccurrencesList, setDbOccurrencesList] = useState<DeliveryOccurrence[]>([]);
  const [cidadesRotas, setCidadesRotas] = useState<CidadeRota[]>([]);
  const [curvaAClientsLocal, setCurvaAClientsLocal] = useState<CurvaAClientLocal[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [routePlanningItems, setRoutePlanningItems] = useState<RoutePlanningItem[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [generatedPreRomaneios, setGeneratedPreRomaneios] = useState<PreRomaneio[] | null>(null);

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

      setToastMessage(`📌 Ajuste salvo para CTRC ${ctrcId}`);
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
      routePlanningItems,
      planningDate,
      criticClients
    );
  }, [availableCtrcs, cidadesRotas, dbOccurrencesList, combinedCurvaClients, vehicles, helpers, isNormalizing, routePlanningItems, planningDate, criticClients]);

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
    selectedEligibility,
    setSelectedEligibility,
    selectedOccurrenceSectors,
    setSelectedOccurrenceSectors,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    availableSectors,
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
          if (rotPref.selectedOccurrenceSectors) {
            setSelectedOccurrenceSectors(rotPref.selectedOccurrenceSectors);
          }
          if (rotPref.sortField) {
            setSortField(rotPref.sortField);
          }
          if (rotPref.sortDirection) {
            setSortDirection(rotPref.sortDirection);
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
          if (rotPref.selectedOccurrenceSectors) {
            setSelectedOccurrenceSectors(rotPref.selectedOccurrenceSectors);
          }
          if (rotPref.sortField) {
            setSortField(rotPref.sortField);
          }
          if (rotPref.sortDirection) {
            setSortDirection(rotPref.sortDirection);
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
      activeTacticalFilter,
      selectedOccurrenceSectors,
      sortField,
      sortDirection
    });
  }, [densityMode, groupingMode, selectedUnit, selectedSector, selectedLocationFilter, activeTacticalFilter, selectedOccurrenceSectors, sortField, sortDirection, isPrefLoaded, isNormalizing]);

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

  const handleGeneratePreRomaneio = async () => {
    const selectedCtrcs = filteredCtrcs.filter((c) => selectedIds.includes(c.id));
    if (selectedCtrcs.length === 0) return;

    try {
      // 1. Group selected CTRCs by effectiveRoute
      const groupedByRoute: Record<string, RoteirizacaoItem[]> = {};
      selectedCtrcs.forEach((ctrc) => {
        const route = ctrc.effectiveRoute || ctrc.normRota || 'ROTA 99';
        if (!groupedByRoute[route]) {
          groupedByRoute[route] = [];
        }
        groupedByRoute[route].push(ctrc);
      });

      // 2. Fetch all seeded route gate maps
      const allGates = await RouteGateRepository.getAll();

      const newPreRomaneios: PreRomaneio[] = [];
      const nowStr = new Date().toISOString();

      for (const [route, ctrcs] of Object.entries(groupedByRoute)) {
        // Resolve mapped gate
        const gateMatch = allGates.find((g) => g.route.toUpperCase() === route.toUpperCase());
        const gateName = gateMatch ? gateMatch.gate : `PORTÃO ${route.replace(/[^0-9]/g, '') || '99'}`;

        const totalWeight = ctrcs.reduce((sum, item) => sum + (item.peso_r || item.weight || 0), 0);
        const totalVolumes = ctrcs.reduce((sum, item) => sum + (item.volume || 1), 0);
        const totalValue = ctrcs.reduce((sum, item) => sum + (item.valor || 0), 0);
        const totalFrete = ctrcs.reduce((sum, item) => sum + (item.frete || 0), 0);

        const id = `pr_${Date.now()}_${route.replace(/\s+/g, '_')}_${Math.random().toString(36).substr(2, 5)}`;

        newPreRomaneios.push({
          id,
          planningDate,
          route,
          gate: gateName,
          status: 'EM_SEPARACAO',
          ctrcIds: ctrcs.map((c) => c.id),
          totalWeight,
          totalVolumes,
          totalValue,
          totalFrete,
          createdBy: adminUser.name || adminUser.username,
          createdAt: nowStr,
          updatedAt: nowStr
        });
      }

      // 3. Persist the pre-romaneios
      await PreRomaneioRepository.putMany(newPreRomaneios);

      // 4. Update state to show summary modal, clear current selections, show success toast
      setGeneratedPreRomaneios(newPreRomaneios);
      clearSelection();

      setToastMessage(`📦 Gerados ${newPreRomaneios.length} pré-romaneios com sucesso!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('[Roteirizacao] Erro ao gerar pré-romaneios de separação:', err);
      setToastMessage('⚠️ Erro ao gerar pré-romaneios');
      setTimeout(() => setToastMessage(null), 3000);
    }
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
        selectedEligibility={selectedEligibility}
        setSelectedEligibility={setSelectedEligibility}
        selectedOccurrenceSectors={selectedOccurrenceSectors}
        setSelectedOccurrenceSectors={setSelectedOccurrenceSectors}
        sortField={sortField}
        setSortField={setSortField}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        availableSectors={availableSectors}
        uniqueSectors={uniqueSectors}
        totalCtrcsCount={unassignedCtrcs.length}
        filteredCtrcsCount={filteredCtrcs.length}
        onClearFilters={clearFilters}
        currentTime={currentTime}
        onOpenFleetDrawer={() => setIsDrawerOpen(true)}
        draftCount={Object.keys(draftAssignments).length}
        planningDate={planningDate}
        densityMode={densityMode}
      />

      <OperationalNoticesBanner
        planningDate={planningDate}
        availableCtrcs={availableCtrcs}
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
        <div className="absolute top-16 right-4 z-50 bg-[#0d1527] border-l-4 border-indigo-500 border-y border-r border-[#1a2440] text-indigo-300 text-xs p-3 rounded-lg shadow-2xl flex items-center gap-2 max-w-sm animate-bounce font-sans font-bold">
          {toastMessage.startsWith('📌') || toastMessage.startsWith('📝') ? (
            <span>📌</span>
          ) : (
            <span>🚚</span>
          )}
          <p className="leading-tight uppercase font-mono">{toastMessage.replace(/^[📌📝🚛🚚]\s*/, '')}</p>
        </div>
      )}

      {/* Expandable Footer Action parameters */}
      <SelectionSummary
        selectedCtrcs={selectedCtrcsList}
        onOpenConsolidacao={() => setIsDrawerOpen(true)}
        onClearSelection={clearSelection}
        densityMode={densityMode}
        onGeneratePreRomaneio={handleGeneratePreRomaneio}
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

      {/* Pre-Romaneio Summary Modal */}
      {generatedPreRomaneios && (
        <>
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] transition-all duration-200" 
            onClick={() => setGeneratedPreRomaneios(null)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#080d1a] border border-emerald-500/45 rounded-2xl shadow-2xl z-[110] overflow-hidden flex flex-col p-5 font-sans">
            <div className="flex items-center gap-3 border-b border-[#1b2b4d] pb-3 mb-4 shrink-0 select-none">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider leading-none">Pré-Romaneio de Separação</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase font-mono mt-1">Carga Dividida por Portão Físico</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed uppercase font-mono mb-3">
              As faturas foram agrupadas por suas rotas de destino e direcionadas aos respectivos portões de separação na filial:
            </p>

            <div className="flex-1 overflow-y-auto max-h-[280px] flex flex-col gap-3 pr-1 scrollbar-thin">
              {generatedPreRomaneios.map((pr) => (
                <div key={pr.id} className="bg-[#0f1a30] border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>🚚</span> {pr.route}
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                      ⚓ {pr.gate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px] font-mono text-slate-300 pt-1 border-t border-[#1b2b4d]/40">
                    <div>
                      📑 CTRCs: <span className="text-white font-bold">{pr.ctrcIds.length}</span>
                    </div>
                    <div>
                      ⚖️ Peso: <span className="text-emerald-400 font-bold">{pr.totalWeight >= 1000 ? `${(pr.totalWeight / 1000).toFixed(2)}t` : `${pr.totalWeight} kg`}</span>
                    </div>
                    <div>
                      📦 Volumes: <span className="text-yellow-450 font-bold">{pr.totalVolumes}</span>
                    </div>
                    <div>
                      💰 Frete: <span className="text-sky-400 font-bold">R$ {pr.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-[#1b2b4d]/20">
                    <span>STATUS: EM SEPARAÇÃO</span>
                    <span>DATA: {pr.planningDate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3 border-t border-[#1b2b4d] flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setGeneratedPreRomaneios(null)}
                className="w-full bg-emerald-650 hover:bg-emerald-600 border border-emerald-550 text-white font-black uppercase text-xs tracking-wider py-2.5 rounded-lg transition-all duration-150 cursor-pointer text-center"
              >
                Concordar e Enviar às Docas de Separação
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
