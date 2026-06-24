import React, { useState, useEffect, useMemo } from 'react';
import { Ctrc, Vehicle, AppUser, CurvaAClient, DeliveryOccurrence, RoteirizacaoItem, CidadeRota, CurvaAClientLocal, Helper, RoutePlanningItem, DensityMode, RoteirizacaoPreferences, PreRomaneio, RouteGateMap, CriticClient, RoteirizacaoDiagnostics, CidadeAtendidaSSW } from '../../types';
import { OccurrenceRepository } from '../../infrastructure/localdb/repositories/occurrenceRepository';
import { CidadeRotaRepository } from '../../infrastructure/localdb/repositories/cidadeRotaRepository';
import { CurvaAClientRepository } from '../../infrastructure/localdb/repositories/curvaAClientRepository';
import { HelperRepository } from '../../infrastructure/localdb/repositories/helperRepository';
import { RoutePlanningRepository } from '../../infrastructure/localdb/repositories/routePlanningRepository';
import { UserPreferenceRepository } from '../../infrastructure/localdb/repositories/userPreferenceRepository';
import { RouteGateRepository } from '../../infrastructure/localdb/repositories/routeGateRepository';
import { PreRomaneioRepository } from '../../infrastructure/localdb/repositories/preRomaneioRepository';
import { CidadeAtendidaSSWRepository } from '../../infrastructure/localdb/repositories/cidadeAtendidaSSWRepository';
import { RoteirizacaoEnrichmentService } from './services/roteirizacaoEnrichmentService';

// Modular Imports
import RoteirizacaoHeader from './RoteirizacaoHeader';
import CargaList from './CargaList';
import ConsolidacaoDrawer from './ConsolidacaoDrawer';
import SelectionSummary from './SelectionSummary';
import OperationalNoticesBanner from './OperationalNoticesBanner';
import RoteirizacaoDiagnosticsPanel from './RoteirizacaoDiagnosticsPanel';

// Custom Hooks
import { useRoteirizacaoFilters, isLogisticallyCompatible } from './hooks/useRoteirizacaoFilters';
import { useCargaSelection } from './hooks/useCargaSelection';
import { useRoteirizacaoGrouping } from './hooks/useRoteirizacaoGrouping';
import { useVehicleAllocation } from './hooks/useVehicleAllocation';
import { validateFieldContract } from './helpers/fieldContractValidator';

const ENABLE_ROUTER_DIAGNOSTICS = false;

interface RoteirizacaoViewProps {
  availableCtrcs: Ctrc[];
  vehicles: Vehicle[];
  onAssignCtre: (ctrcId: string, vehicleId: string) => void;
  onConsolidateRomaneio: (vehicleId: string, assignedCtrcs: Ctrc[]) => void;
  adminUser: AppUser;
  curvaAClients?: CurvaAClient[];
  criticClients?: CriticClient[];
  onGeneratePreRomaneioSuccess?: (preRomaneios: PreRomaneio[], originalCtrcs: Ctrc[]) => void;
  linkedCtrcs?: Ctrc[];
  onRefreshCtrcs?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function RoteirizacaoView({
  availableCtrcs = [],
  vehicles = [],
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
  curvaAClients = [],
  criticClients = [],
  onGeneratePreRomaneioSuccess,
  linkedCtrcs = [],
  onRefreshCtrcs,
  theme,
  onToggleTheme,
}: RoteirizacaoViewProps) {
  // Operational caching of enrichment bases
  const [dbOccurrencesList, setDbOccurrencesList] = useState<DeliveryOccurrence[]>([]);
  const [cidadesRotas, setCidadesRotas] = useState<CidadeRota[]>([]);
  const [sswCidades, setSswCidades] = useState<CidadeAtendidaSSW[]>([]);
  const [curvaAClientsLocal, setCurvaAClientsLocal] = useState<CurvaAClientLocal[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [routePlanningItems, setRoutePlanningItems] = useState<RoutePlanningItem[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [generatedPreRomaneios, setGeneratedPreRomaneios] = useState<PreRomaneio[] | null>(null);
  
  // Operational Diagnostics Panel open state
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // Operational Notices state management
  const [isAvisosOpen, setIsAvisosOpen] = useState<boolean>(true);
  const [noticesCount, setNoticesCount] = useState<number>(0);
  const [highestNoticeSeverity, setHighestNoticeSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');

  // User Preferences sync and visual density management
  const [densityMode, setDensityMode] = useState<DensityMode>('default');
  const [mesaScale, setMesaScale] = useState<'85%' | '90%' | '100%' | '110%' | '120%'>('100%');
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
        const [occList, crList, caList, hList, planList, sswList] = await Promise.all([
          OccurrenceRepository.getAll().catch(() => [] as DeliveryOccurrence[]),
          CidadeRotaRepository.getAll().catch(() => [] as CidadeRota[]),
          CurvaAClientRepository.getAll().catch(() => [] as CurvaAClientLocal[]),
          HelperRepository.getAll().catch(() => [] as Helper[]),
          RoutePlanningRepository.getAll().catch(() => [] as RoutePlanningItem[]),
          CidadeAtendidaSSWRepository.getAll().catch(() => [] as CidadeAtendidaSSW[]),
        ]);

        setDbOccurrencesList(occList);
        setCidadesRotas(crList);
        setSswCidades(sswList);
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

    // LOG BEFORE ENRICHMENT
    if (ENABLE_ROUTER_DIAGNOSTICS) {
      console.log('[DIAG_ROTEIRIZACAO_BEFORE] Configurações de Entrada:', {
        availableCtrcsLength: availableCtrcs.length,
        planningDate,
        adminUnid: adminUser?.unid,
        adminIsMaster: adminUser?.is_master,
      });
    }

    const res = RoteirizacaoEnrichmentService.enrichCargas(
      availableCtrcs,
      cidadesRotas,
      dbOccurrencesList,
      combinedCurvaClients,
      vehicles,
      [], // drivers score if not retrieved yet
      helpers,
      routePlanningItems,
      planningDate,
      criticClients,
      sswCidades
    );

    // LOG AFTER ENRICHMENT
    const occurrenceSectorCounts: Record<string, number> = {};
    const routingEligibilityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const unidCounts: Record<string, number> = {};
    const logisticCompatibilityCounts = {
      compatible: 0,
      incompatible: 0,
    };

    const targetUnit = adminUser?.is_master ? 'TODAS' : (adminUser?.unid || 'SPO');

    res.forEach((item) => {
      const sec = item.occurrenceSector || 'Sem setor';
      occurrenceSectorCounts[sec] = (occurrenceSectorCounts[sec] || 0) + 1;

      const elig = item.routingEligibility || 'Sem elegibilidade';
      routingEligibilityCounts[elig] = (routingEligibilityCounts[elig] || 0) + 1;

      const st = item.status || 'sem status';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      const u = (item.unid || 'sem filial').toUpperCase();
      unidCounts[u] = (unidCounts[u] || 0) + 1;

      const comp = isLogisticallyCompatible(
        item.locationLabel || item.localizacao || '',
        item.unid || '',
        targetUnit,
        item.pracaHub,
        item.pracaDestino
      );
      if (comp) {
        logisticCompatibilityCounts.compatible++;
      } else {
        logisticCompatibilityCounts.incompatible++;
      }
    });

    if (ENABLE_ROUTER_DIAGNOSTICS) {
      console.log('[DIAG_ROTEIRIZACAO_AFTER] Estatísticas Pós-Enrichment:', {
        enrichedItemsLength: res.length,
        bySector: occurrenceSectorCounts,
        byEligibility: routingEligibilityCounts,
        byStatus: statusCounts,
        byUnid: unidCounts,
        byCompatibility: logisticCompatibilityCounts,
      });
    }

    return res;
  }, [availableCtrcs, cidadesRotas, dbOccurrencesList, combinedCurvaClients, vehicles, helpers, isNormalizing, routePlanningItems, planningDate, criticClients, adminUser, sswCidades]);

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
    uniqueUnits,
    selectedSector,
    setSelectedSector,
    selectedLocationFilter,
    setSelectedLocationFilter,
    searchQuery,
    setSearchQuery,
    showOtherUnits,
    setShowOtherUnits,
    logisticScope,
    setLogisticScope,
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
    filterCounts,
    clearFilters,

    // Excel column filters properties
    excelUniqueRoutes,
    excelUniqueCities,
    excelUniqueDests,
    excelUniquePrevs,
    excelUniqueStatuses,
    excelUniqueLocs,
    excelUniqueSenders,
    excelUniqueOcorrSectors,
    excelRouteFilter,
    setExcelRouteFilter,
    excelCityFilter,
    setExcelCityFilter,
    excelDestFilter,
    setExcelDestFilter,
    excelPrevFilter,
    setExcelPrevFilter,
    excelStatusFilter,
    setExcelStatusFilter,
    excelLocationFilter,
    setExcelLocationFilter,
    excelSenderFilter,
    setExcelSenderFilter,
    excelOcorrSectorFilter,
    setExcelOcorrSectorFilter,
  } = useRoteirizacaoFilters({
    ctrcs: unassignedCtrcs,
    adminUser,
  });

  // Operational Diagnostics calculation
  const diagnostics: RoteirizacaoDiagnostics = useMemo(() => {
    const totalIndexedDb = (availableCtrcs?.length || 0) + (linkedCtrcs?.length || 0);
    const totalAppAvailable = availableCtrcs?.length || 0;
    const totalAppLinked = linkedCtrcs?.length || 0;
    const totalBeforeEnrichment = availableCtrcs?.length || 0;
    const totalAfterEnrichment = enrichedCtrcsList?.length || 0;

    // Filter step counts from the useRoteirizacaoFilters hook
    const totalAfterUnitFilter = filterCounts?.totalAfterUnitFilter ?? 0;
    const totalAfterRouteFilter = filterCounts?.totalAfterRouteFilter ?? 0;
    const totalAfterOccurrenceFilter = filterCounts?.totalAfterOccurrenceFilter ?? 0;
    const totalAfterSearchFilter = filterCounts?.totalAfterSearchFilter ?? 0;
    const totalAfterLogisticFilter = filterCounts?.totalAfterLogisticFilter ?? 0;
    const totalAfterStatusFilter = filterCounts?.totalAfterStatusFilter ?? 0;
    const totalFinalVisible = filterCounts?.totalFinalVisible ?? 0;

    // Distributions based on the input set (unassignedCtrcs)
    const byStatus: Record<string, number> = {};
    const byUnit: Record<string, number> = {};
    const byOccurrenceSector: Record<string, number> = {};
    const byRoutingEligibility: Record<string, number> = {};
    const byLogisticCompatibility: Record<string, number> = { compatible: 0, incompatible: 0 };

    const targetUnit = adminUser?.is_master ? 'TODAS' : (adminUser?.unid || 'SPO');

    unassignedCtrcs.forEach((item) => {
      // status
      const st = item.status || 'Sem status';
      byStatus[st] = (byStatus[st] || 0) + 1;

      // unit
      const u = (item.unid || 'Sem filial').toUpperCase();
      byUnit[u] = (byUnit[u] || 0) + 1;

      // occurrence sector
      const sec = item.occurrenceSector || 'Sem setor';
      byOccurrenceSector[sec] = (byOccurrenceSector[sec] || 0) + 1;

      // eligibility
      const elig = item.routingEligibility || 'Sem elegibilidade';
      byRoutingEligibility[elig] = (byRoutingEligibility[elig] || 0) + 1;

      // compatibility
      const comp = isLogisticallyCompatible(
        item.locationLabel || item.localizacao || '',
        item.unid || '',
        targetUnit,
        item.pracaHub,
        item.pracaDestino
      );
      if (comp) {
        byLogisticCompatibility.compatible++;
      } else {
        byLogisticCompatibility.incompatible++;
      }
    });

    // Create Warning array
    const warnings: string[] = [];

    if (totalIndexedDb > 0 && totalAppAvailable === 0) {
      warnings.push(
        `Existem ${totalIndexedDb} faturas salvas no IndexedDB local, mas nenhuma com o status "Disponível". Faturas em outras fases (Separando, No Pátio, Em Rota, Entregue) foram ocultas temporariamente para evitar duplo planejamento.`
      );
    }

    if (totalAppAvailable > 0 && totalAfterEnrichment === 0) {
      warnings.push(
        "Faturas disponíveis falharam no processo de enriquecimento síncrono. Certifique-se de que os cadastros de cidades, rotas e ocorrências estão hidratados."
      );
    }

    if (totalAfterEnrichment > 0 && totalAfterUnitFilter === 0) {
      warnings.push(
        `Filtro de Filial/Unidade reteve 100% das faturas enriquecidas. Sua unidade operacional é "${adminUser?.unid || 'SPO'}", e as faturas disponíveis são de outras filiais.`
      );
    }

    if (totalAfterUnitFilter > 0 && totalAfterRouteFilter === 0) {
      warnings.push(
        "Filtro de Rota/Setor ativo reteve todas as faturas da unidade. Limpe as pesquisas e selecione 'Todas as rotas' na Mesa."
      );
    }

    if (totalAfterRouteFilter > 0 && totalAfterOccurrenceFilter === 0) {
      warnings.push(
        "O multi-select de Setor Ocorrência (Agendamento, Disponível, Solução, etc.) está ocultando 100% das faturas elegíveis."
      );
    }

    if (totalAfterOccurrenceFilter > 0 && totalAfterSearchFilter === 0) {
      warnings.push(
        "A caixa de busca textual por NF, Contrato, Emitente ou Localização não retornou nenhuma correspondência ativa."
      );
    }

    if (totalAfterSearchFilter > 0 && totalAfterLogisticFilter === 0) {
      const incCount = byLogisticCompatibility.incompatible;
      warnings.push(
        `Regra de Compatibilidade Logística reteve ${incCount} faturas porque constam como em trânsito ou no depósito de outra filial. Habilite 'Outras unidades' para visualizar.`
      );
    }

    // Calculate contamination metrics (destinatario === cidade)
    const contaminationExamples: { id: string; destinatario: string; cidade: string; }[] = [];
    let contaminationCount = 0;

    unassignedCtrcs.forEach(rec => {
      const dest = (rec.destinatario || '').toUpperCase().trim();
      const city = (rec.cidade_ent || rec.cidade || '').toUpperCase().trim();
      if (dest && city && dest === city && dest.length > 3) {
        contaminationCount++;
        if (contaminationExamples.length < 20) {
          contaminationExamples.push({
            id: rec.id || 'N/A',
            destinatario: rec.destinatario || '',
            cidade: rec.cidade_ent || rec.cidade || '',
          });
        }
      }
    });

    if (contaminationCount > 0) {
      warnings.push(
        `[MAPEAMENTO] Crítico: Foram detectados ${contaminationCount} CTRCs com o destinatário idêntico à cidade. Isso indica uma provável inconformidade física no arquivo de carregamento originada no "Mapeamento de Importação".`
      );
    }

    // Execute active Test Harness for Field Mappings Contract to prevent future regressions
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const validation = validateFieldContract(unassignedCtrcs, isDiagnosticsOpen || isDev);
      if (!validation.success) {
        // Exclude general "cidade igual destinatario" warning messages since we handle separately with rich stats
        const otherWarnings = validation.warnings.filter(w => !w.includes('Contaminação crítica detectada') && !w.includes('Contaminação cruzada'));
        warnings.push(...otherWarnings.slice(0, 10));
      }
    } catch (err) {
      console.warn('[Validation Harness Error]', err);
    }

    return {
      totalIndexedDb,
      totalAppAvailable,
      totalAppLinked,
      totalBeforeEnrichment,
      totalAfterEnrichment,
      totalAfterUnitFilter,
      totalAfterRouteFilter,
      totalAfterOccurrenceFilter,
      totalAfterSearchFilter,
      totalAfterLogisticFilter,
      totalAfterStatusFilter,
      totalFinalVisible,
      byStatus,
      byUnit,
      byOccurrenceSector,
      byRoutingEligibility,
      byLogisticCompatibility,
      warnings,
      contaminationCount,
      contaminationExamples,
      totalCtrcs: unassignedCtrcs.length,
    };
  }, [availableCtrcs, linkedCtrcs, enrichedCtrcsList, unassignedCtrcs, filterCounts, adminUser, isDiagnosticsOpen]);

  // Trigger console table logs when diagnostics open
  useEffect(() => {
    if (isDiagnosticsOpen) {
      console.log('=== [DIAG_LOGS_MESA] INÍCIO DO RELATÓRIO DE DIAGNÓSTICO ===');
      console.table({
        '1. Total em Banco (IndexedDB)': diagnostics.totalIndexedDb,
        '2. Disponível p/ Roteiro': diagnostics.totalAppAvailable,
        '3. Vinculado/Oculte': diagnostics.totalAppLinked,
        '4. Entrada Enriquecimento': diagnostics.totalBeforeEnrichment,
        '5. Pós-Enriquecimento': diagnostics.totalAfterEnrichment,
        '6. Pós-Filtro Filial': diagnostics.totalAfterUnitFilter,
        '7. Pós-Filtro Rota': diagnostics.totalAfterRouteFilter,
        '8. Pós-Filtro Setor Ocorrência': diagnostics.totalAfterOccurrenceFilter,
        '9. Pós-Busca Textual': diagnostics.totalAfterSearchFilter,
        '10. Pós-Compatibilidade': diagnostics.totalAfterLogisticFilter,
        '11. Pós-Status': diagnostics.totalAfterStatusFilter,
        '12. Visível na Mesa': diagnostics.totalFinalVisible,
      });

      console.log('--- Distribuição de Filiais das Cargas ---');
      console.table(diagnostics.byUnit);

      console.log('--- Distribuição de Status Operacional ---');
      console.table(diagnostics.byStatus);

      console.log('--- Distribuição de Setor de Ocorrência ---');
      console.table(diagnostics.byOccurrenceSector);

      console.log('--- Distribuição de Elegibilidade de Roteiro ---');
      console.table(diagnostics.byRoutingEligibility);
      
      console.log('--- Alertas Operacionais Ativos ---');
      console.log(diagnostics.warnings);
      console.log('=== [DIAG_LOGS_MESA] FIM DO RELATÓRIO ===');
    }
  }, [isDiagnosticsOpen, diagnostics]);

  // Checklist multi-select state management
  const {
    selectedIds,
    setSelectedIds,
    toggleRow,
    toggleSelectAll,
    clearSelection,
  } = useCargaSelection();

  // Clean stale selected checked row elements which are no longer present inside availableCtrcs elements
  useEffect(() => {
    const activeIds = availableCtrcs.map((c) => c.id);
    setSelectedIds((prev) => prev.filter((id) => activeIds.includes(id)));
  }, [availableCtrcs, setSelectedIds]);

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
          if (rotPref.mesaScale) {
            setMesaScale(rotPref.mesaScale);
          }
          if (rotPref.groupingMode) {
            setGroupingMode('none');
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
          if (rotPref.showOtherUnits !== undefined) {
            setShowOtherUnits(rotPref.showOtherUnits);
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
          if (rotPref.mesaScale) {
            setMesaScale(rotPref.mesaScale);
          }
          if (rotPref.groupingMode) {
            setGroupingMode('none');
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
          if (rotPref.showOtherUnits !== undefined) {
            setShowOtherUnits(rotPref.showOtherUnits);
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
      mesaScale,
      groupingMode,
      selectedUnit,
      selectedSector,
      selectedLocationFilter,
      activeTacticalFilter,
      selectedOccurrenceSectors,
      sortField,
      sortDirection,
      showOtherUnits
    });
  }, [densityMode, mesaScale, groupingMode, selectedUnit, selectedSector, selectedLocationFilter, activeTacticalFilter, selectedOccurrenceSectors, sortField, sortDirection, showOtherUnits, isPrefLoaded, isNormalizing]);

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

      // Just update state to show confirmation modal, don't persist yet
      setGeneratedPreRomaneios(newPreRomaneios);
    } catch (err) {
      console.error('[Roteirizacao] Erro ao planejar pré-romaneios:', err);
      setToastMessage('⚠️ Erro ao calcular pré-romaneios');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleConfirmPreRomaneio = async () => {
    if (!generatedPreRomaneios) return;
    try {
      // 1. Persist the pre-romaneios
      await PreRomaneioRepository.putMany(generatedPreRomaneios);

      // 2. Clear current selections
      const selectedCtrcs = filteredCtrcs.filter((c) => selectedIds.includes(c.id));
      clearSelection();

      // 3. Update state, close modal and show success toast
      setToastMessage(`📦 Gerados ${generatedPreRomaneios.length} pré-romaneios com sucesso!`);
      setTimeout(() => setToastMessage(null), 3000);

      // Call parent success callback to handle state update and route redirection
      if (onGeneratePreRomaneioSuccess) {
        onGeneratePreRomaneioSuccess(generatedPreRomaneios, selectedCtrcs);
      }
    } catch (err) {
      console.error('[Roteirizacao] Erro ao gerar pré-romaneios de separação:', err);
      setToastMessage('⚠️ Erro ao gerar pré-romaneios');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setGeneratedPreRomaneios(null);
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

  const handleClearFilters = () => {
    clearFilters();
    setGroupingMode('none');
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-12px)] bg-white dark:bg-[#080c14] border border-slate-200 dark:border-[#1a2440] rounded-2xl overflow-hidden relative text-slate-800 dark:text-slate-200 select-none">
      {/* Prime Header Block */}
      <RoteirizacaoHeader
        adminUser={adminUser}
        selectedUnit={selectedUnit}
        setSelectedUnit={setSelectedUnit}
        uniqueUnits={uniqueUnits}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalCtrcsCount={filterCounts?.totalAfterUnitFilter || 0}
        filteredCtrcsCount={filteredCtrcs.length}
        onClearFilters={handleClearFilters}
        currentTime={currentTime}
        onOpenFleetDrawer={() => setIsDrawerOpen(true)}
        draftCount={Object.keys(draftAssignments).length}
        planningDate={planningDate}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        diagnostics={diagnostics}
        isAvisosOpen={isAvisosOpen}
        setIsAvisosOpen={setIsAvisosOpen}
        noticesCount={noticesCount}
        highestNoticeSeverity={highestNoticeSeverity}
        densityMode={densityMode}
        onUpdateDensity={(density) => setDensityMode(density)}
        mesaScale={mesaScale}
        onUpdateMesaScale={setMesaScale}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <OperationalNoticesBanner
        planningDate={planningDate}
        availableCtrcs={availableCtrcs}
        isOpen={isAvisosOpen}
        onClose={() => setIsAvisosOpen(false)}
        onNoticesChange={(count, severity) => {
          setNoticesCount(count);
          setHighestNoticeSeverity(severity);
        }}
      />

      {/* Main Containers: Left List (Full Width) */}
      <div 
        className="flex-1 flex gap-3 p-3 min-h-0 relative"
        style={{
          '--mesa-scale': mesaScale === '85%' ? '0.85' : mesaScale === '90%' ? '0.90' : mesaScale === '110%' ? '1.10' : mesaScale === '120%' ? '1.20' : '1'
        } as React.CSSProperties}
      >
        {/* Cargo Fila Column */}
        {isNormalizing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-1.5 bg-white dark:bg-[#080c14] border border-slate-200 dark:border-[#1a2440] rounded-xl font-mono">
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
            totalCtrcsCount={filterCounts?.totalAfterUnitFilter || 0}
            onClearFilters={handleClearFilters}
            
            // Migrated Filters Props
            adminUser={adminUser}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            selectedOccurrenceSectors={selectedOccurrenceSectors}
            setSelectedOccurrenceSectors={setSelectedOccurrenceSectors}
            sortField={sortField}
            setSortField={setSortField}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
            uniqueSectors={uniqueSectors}
            availableSectors={availableSectors}
            logisticScope={logisticScope}
            setLogisticScope={setLogisticScope}

            // Excel Column filtering props
            excelUniqueRoutes={excelUniqueRoutes}
            excelUniqueCities={excelUniqueCities}
            excelUniqueDests={excelUniqueDests}
            excelUniquePrevs={excelUniquePrevs}
            excelUniqueStatuses={excelUniqueStatuses}
            excelUniqueLocs={excelUniqueLocs}
            excelUniqueSenders={excelUniqueSenders}
            excelUniqueOcorrSectors={excelUniqueOcorrSectors}
            excelRouteFilter={excelRouteFilter}
            setExcelRouteFilter={setExcelRouteFilter}
            excelCityFilter={excelCityFilter}
            setExcelCityFilter={setExcelCityFilter}
            excelDestFilter={excelDestFilter}
            setExcelDestFilter={setExcelDestFilter}
            excelPrevFilter={excelPrevFilter}
            setExcelPrevFilter={setExcelPrevFilter}
            excelStatusFilter={excelStatusFilter}
            setExcelStatusFilter={setExcelStatusFilter}
            excelLocationFilter={excelLocationFilter}
            setExcelLocationFilter={setExcelLocationFilter}
            excelSenderFilter={excelSenderFilter}
            setExcelSenderFilter={setExcelSenderFilter}
            excelOcorrSectorFilter={excelOcorrSectorFilter}
            setExcelOcorrSectorFilter={setExcelOcorrSectorFilter}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            diagnostics={diagnostics}
          />
        )}
      </div>

      {/* Persistent Overlay Toast alerts */}
      {toastMessage && (
        <div className="absolute top-16 right-4 z-[70] bg-white dark:bg-[#0d1527] border-l-4 border-l-indigo-500 border-y border-r border-y-slate-200 border-r-slate-200 dark:border-y-[#1a2440] dark:border-r-[#1a2440] text-indigo-700 dark:text-indigo-300 text-xs p-3 rounded-lg shadow-xl flex items-center gap-2 max-w-sm animate-bounce font-sans font-bold">
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

      {/* Roteirizacao Diagnostics Panel Drawer Component */}
      <RoteirizacaoDiagnosticsPanel
        diagnostics={diagnostics}
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onClearFilters={handleClearFilters}
        adminUser={adminUser}
        onRefreshCtrcs={onRefreshCtrcs}
      />

      {/* Pre-Romaneio Summary Modal */}
      {generatedPreRomaneios && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md z-[100] transition-all duration-200" 
            onClick={() => setGeneratedPreRomaneios(null)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-emerald-500/40 rounded-2xl shadow-xl dark:shadow-[0_15px_50px_rgba(0,0,0,0.85)] z-[110] overflow-hidden flex flex-col p-6 font-sans">
            <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-[#1b2b4d] pb-4 mb-4 shrink-0 select-none">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">Confirmar Pré-separação</h3>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase font-mono mt-1.5 font-bold">Enviar lote agrupado por rota e portão para docas</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-355 leading-relaxed uppercase font-mono mb-4">
              O sistema consolidou as cargas selecionadas em lotes de separação física. Confirme o despacho abaixo para criar os respectivos pré-romaneios:
            </p>

            <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-3.5 pr-1.5 scrollbar-thin scrollbar-track-transparent dark:scrollbar-track-slate-950/20 scrollbar-thumb-emerald-500/20">
              {generatedPreRomaneios.map((pr) => (
                <div key={pr.id} className="bg-slate-50 dark:bg-[#101726] border border-slate-200 dark:border-emerald-500/15 rounded-xl p-3 flex flex-col gap-2.5 hover:border-emerald-400/50 dark:hover:border-emerald-500/35 transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-[10px]">🚚</span>
                      {pr.route}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[9.5px] font-black font-mono px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      ⚓ {pr.gate}
                    </span>
                  </div>

                  {/* Elegant Bento Grid elements inside matching the custom styling guide */}
                  <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-200 dark:border-[#1b2d4f]/50">
                    <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/60 rounded p-1.5 text-center">
                      <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black font-mono tracking-wider mb-0.5">📑 CTRCs</div>
                      <div className="text-xs text-slate-800 dark:text-white font-black font-mono">{pr.ctrcIds.length}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/60 rounded p-1.5 text-center">
                      <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black font-mono tracking-wider mb-0.5">⚖️ Peso</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-450 font-black font-mono">
                        {pr.totalWeight >= 1000 ? `${(pr.totalWeight / 1000).toFixed(1)}t` : `${pr.totalWeight}kg`}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/60 rounded p-1.5 text-center">
                      <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black font-mono tracking-wider mb-0.5">📦 Vols</div>
                      <div className="text-xs text-amber-600 dark:text-yellow-450 font-black font-mono">{pr.totalVolumes}</div>
                    </div>
                    <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/60 rounded p-1.5 text-center">
                      <div className="text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black font-mono tracking-wider mb-0.5">💰 Frete</div>
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-extrabold font-mono truncate" title={`R$ ${pr.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                        R$ {pr.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-slate-550 pt-1 border-t border-slate-200 dark:border-[#1b2d4f]/20">
                    <span className="font-bold text-emerald-600 dark:text-emerald-500/80 uppercase">● AGUARDANDO LIBERAÇÃO</span>
                    <span>PROG: {pr.planningDate}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Standard buttons with secondary cancel action */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1b2b4d] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setGeneratedPreRomaneios(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white uppercase font-black text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer text-center flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPreRomaneio}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-550 border border-emerald-500/50 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all duration-150 active:scale-98 cursor-pointer text-center flex-[1.5] shadow-md dark:shadow-[0_4px_12px_rgba(16,185,129,0.15)] dark:hover:shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
              >
                Confirmar envio para separação
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
