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
import { AuditLogRepository } from '../../infrastructure/localdb/repositories/auditLogRepository';
import { RoteirizacaoEnrichmentService } from './services/roteirizacaoEnrichmentService';
import { routingPlanSupabaseRepository } from '../../infrastructure/supabase/repositories/routingPlanSupabaseRepository';
import { routingPlanItemSupabaseRepository } from '../../infrastructure/supabase/repositories/routingPlanItemSupabaseRepository';
import { preRomaneioSupabaseRepository } from '../../infrastructure/supabase/repositories/preRomaneioSupabaseRepository';

import { UserPresenceSupabaseRepository } from '../../infrastructure/supabase/repositories/userPresenceSupabaseRepository';
import { checkSupabaseHealth } from '../../infrastructure/supabase/client';

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
  occurrences?: DeliveryOccurrence[];
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
  occurrences = [],
}: RoteirizacaoViewProps) {
  // Operational caching of enrichment bases
  const [dbOccurrencesList, setDbOccurrencesList] = useState<DeliveryOccurrence[]>([]);
  const [cidadesRotas, setCidadesRotas] = useState<CidadeRota[]>([]);
  const [sswCidades, setSswCidades] = useState<CidadeAtendidaSSW[]>([]);
  const [curvaAClientsLocal, setCurvaAClientsLocal] = useState<CurvaAClientLocal[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [routePlanningItems, setRoutePlanningItems] = useState<RoutePlanningItem[]>([]);
  const [activeRoutingPlan, setActiveRoutingPlan] = useState<any>(null);
  const [isSyncingPlan, setIsSyncingPlan] = useState<boolean>(false);
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

  // Sync & Presence states
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);
  const [activeUsersList, setActiveUsersList] = useState<any[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Unified running time
  const [currentTime, setCurrentTime] = useState<string>('');

  // Define planning date (defaults to active_planning_date or today's date formatted as YYYY-MM-DD)
  const [planningDate, setPlanningDate] = useState<string>(() => {
    return localStorage.getItem('active_planning_date') || new Date().toISOString().split('T')[0];
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
        const [occList, crList, caList, hList, sswList] = await Promise.all([
          OccurrenceRepository.getAll().catch(() => [] as DeliveryOccurrence[]),
          CidadeRotaRepository.getAll().catch(() => [] as CidadeRota[]),
          CurvaAClientRepository.getAll().catch(() => [] as CurvaAClientLocal[]),
          HelperRepository.getAll().catch(() => [] as Helper[]),
          CidadeAtendidaSSWRepository.getAll().catch(() => [] as CidadeAtendidaSSW[]),
        ]);

        setDbOccurrencesList(occList);
        setCidadesRotas(crList);
        setSswCidades(sswList);
        setCurvaAClientsLocal(caList);
        setHelpers(hList);
      } catch (e) {
        console.error('[Roteirizacao] Erro carregando bases auxiliares de enriquecimento:', e);
      } finally {
        setIsNormalizing(false);
      }
    };
    loadEnrichmentBases();
  }, []);

  // Extract sync logic so it can be called manually and automatically
  const performFullSync = async (active = true, showToast = true) => {
    const companyCode = adminUser?.unid || 'SPO';
    const username = adminUser?.username || 'admin';
    
    setIsSyncingPlan(true);

    try {
      // Health check first
      const isOnline = await checkSupabaseHealth();
      setOnlineStatus(isOnline);
      if (!isOnline) {
        if (showToast) {
          setToastMessage('⚠️ Supabase offline. Trabalhando localmente.');
          setTimeout(() => setToastMessage(null), 3000);
        }
        return;
      }

      // Sync Presence
      await UserPresenceSupabaseRepository.heartbeatPresence({
        id: username,
        username: username,
        name: adminUser?.name || '',
        role: adminUser?.is_master ? 'master' : 'user',
        company_code: companyCode,
        current_view: 'Mesa de Roteirização',
        current_plan_id: activeRoutingPlan?.id || '',
        status: 'ONLINE'
      });

      const activeUsers = await UserPresenceSupabaseRepository.getActiveUsers();
      if (active) {
        setActiveUsersList(activeUsers);
        setActiveUsersCount(activeUsers.length);
      }

      // Step A: Load Local Cache first for immediate, non-blocking render
      try {
        const localItems = await RoutePlanningRepository.getByDate(planningDate);
        if (active) {
          setRoutePlanningItems(localItems);
        }
      } catch (err) {
        console.warn('[Roteirizacao] Erro ao carregar planejamento local:', err);
      }

      // Step B: Connect to Supabase to fetch/create collaborative state
      const planRes = await routingPlanSupabaseRepository.getOrCreatePlan(companyCode, planningDate, username);
      if (!active) return;

      if (planRes.success && planRes.data) {
        setActiveRoutingPlan(planRes.data);
        const planId = planRes.data.id;
        
        const itemsRes = await routingPlanItemSupabaseRepository.getItemsByPlan(planId);
        if (itemsRes.success && itemsRes.data && active) {
          const remoteItems = itemsRes.data;
          
          if (remoteItems.length > 0) {
            const mappedRemoteItems: RoutePlanningItem[] = remoteItems.map((item) => ({
              id: `${item.planningDate}_${item.ctrcId}`,
              ctrcId: item.ctrcId,
              planningDate: item.planningDate,
              suggestedRoute: item.suggestedRoute || '',
              operationalRoute: item.operationalRoute,
              manualPriority: item.manualPriority as any,
              planningStatus: (item.planningStatus || 'A_PLANEJAR') as any,
              operationalNote: item.operationalNote,
              vehicleId: item.vehicleId,
              vehiclePlate: item.vehiclePlate,
              driverName: item.driverName,
              helperName: item.helperName,
              lockedByUser: !!item.lockedByUser,
              updatedBy: item.updatedBy,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            }));
            
            // Seed/update local cache with remote changes
            await RoutePlanningRepository.putMany(mappedRemoteItems);
            
            // Load the final unified state from local cache
            const unifiedItems = await RoutePlanningRepository.getByDate(planningDate);
            setRoutePlanningItems(unifiedItems);
          }
          
          if (showToast) {
            setToastMessage('🔄 Mesa sincronizada com o Supabase');
            setTimeout(() => setToastMessage(null), 3000);
          }
          setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        console.warn('[Roteirizacao] Supabase não retornou plano. Operando em modo offline.');
      }

      // Step C: Sync Pre-Romaneios from Supabase for this date and unit
      try {
        const preRes = await preRomaneioSupabaseRepository.getPreRomaneiosByDateAndUnit(companyCode, planningDate);
        if (preRes.success && preRes.data && active) {
          const remotePre = preRes.data;
          if (remotePre.length > 0) {
            await PreRomaneioRepository.putMany(remotePre);
            // Trigger parent CTRC re-partition so newly fetched pre-romaneios map their CTRCs as linked
            if (onRefreshCtrcs) {
              onRefreshCtrcs();
            }
          }
        }
      } catch (preErr) {
        console.warn('[Roteirizacao] Erro ao sincronizar pré-romaneios do Supabase:', preErr);
      }
    } catch (err) {
      console.warn('[Roteirizacao] Falha na sincronia remota (Mesa Colaborativa offline):', err);
      setOnlineStatus(false);
    } finally {
      if (active) setIsSyncingPlan(false);
    }
  };

  // Synchronized loading of Routing Plan & Routing Plan Items from Supabase on Mount or Date/Unit change
  useEffect(() => {
    let active = true;
    performFullSync(active, false);
    return () => {
      active = false;
    };
  }, [planningDate, adminUser?.unid, adminUser?.username]);

  // Auto-sync intervals and window focus
  useEffect(() => {
    let active = true;
    
    // Auto-sync every 60 seconds
    const intervalId = setInterval(() => {
      if (active && document.hasFocus()) {
        performFullSync(active, false);
      }
    }, 60000);

    // Sync on window focus
    const onFocus = () => {
      if (active) {
        performFullSync(active, true);
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [planningDate, adminUser?.unid, adminUser?.username, activeRoutingPlan?.id]);

  // Set up planning update callback handler
  const handleUpdatePlanning = async (ctrcId: string, patch: Partial<RoutePlanningItem>) => {
    try {
      const oldItem = routePlanningItems.find((p) => p.ctrcId === ctrcId);
      const userName = adminUser?.name || adminUser?.username || 'admin';
      const isMaster = adminUser?.is_master || false;

      // 1. Audit route changes
      if (patch.operationalRoute !== undefined && (!oldItem || oldItem.operationalRoute !== patch.operationalRoute)) {
        const oldRoute = oldItem?.operationalRoute || 'NENHUMA';
        const newRoute = patch.operationalRoute || 'NENHUMA';
        AuditLogRepository.log({
          user: userName,
          isMaster,
          entityType: 'ROUTING_PLAN_ITEM',
          entityId: ctrcId,
          action: 'UPDATE',
          field: 'operationalRoute',
          oldValue: oldRoute,
          newValue: newRoute,
          description: `CTRC ${ctrcId} movido de ROTA ${oldRoute} para ROTA ${newRoute} por ${userName}`
        }).catch((err) => console.warn('[Audit] Erro ao registrar log de rota:', err));
      }

      // 2. Audit planning status changes
      if (patch.planningStatus !== undefined && (!oldItem || oldItem.planningStatus !== patch.planningStatus)) {
        const oldStatus = oldItem?.planningStatus || 'A_PLANEJAR';
        const newStatus = patch.planningStatus;
        AuditLogRepository.log({
          user: userName,
          isMaster,
          entityType: 'ROUTING_PLAN_ITEM',
          entityId: ctrcId,
          action: 'UPDATE',
          field: 'planningStatus',
          oldValue: oldStatus,
          newValue: newStatus,
          description: `Status de planejamento do CTRC ${ctrcId} alterado de ${oldStatus} para ${newStatus} por ${userName}`
        }).catch((err) => console.warn('[Audit] Erro ao registrar log de status:', err));
      }

      // 3. Audit operational notes changes
      if (patch.operationalNote !== undefined && (!oldItem || oldItem.operationalNote !== patch.operationalNote)) {
        const oldNote = oldItem?.operationalNote || '';
        const newNote = patch.operationalNote || '';
        AuditLogRepository.log({
          user: userName,
          isMaster,
          entityType: 'ROUTING_PLAN_ITEM',
          entityId: ctrcId,
          action: 'UPDATE',
          field: 'operationalNote',
          oldValue: oldNote,
          newValue: newNote,
          description: `Observação operacional do CTRC ${ctrcId} alterada de '${oldNote}' para '${newNote}' por ${userName}`
        }).catch((err) => console.warn('[Audit] Erro ao registrar log de observação:', err));
      }

      // 4. Audit vehicle assignments
      if (patch.vehiclePlate !== undefined && (!oldItem || oldItem.vehiclePlate !== patch.vehiclePlate)) {
        const oldPlate = oldItem?.vehiclePlate || 'NENHUM';
        const newPlate = patch.vehiclePlate || 'NENHUM';
        AuditLogRepository.log({
          user: userName,
          isMaster,
          entityType: 'ROUTING_PLAN_ITEM',
          entityId: ctrcId,
          action: 'UPDATE',
          field: 'vehiclePlate',
          oldValue: oldPlate,
          newValue: newPlate,
          description: `Veículo ${newPlate} vinculado ao CTRC ${ctrcId} por ${userName}`
        }).catch((err) => console.warn('[Audit] Erro ao registrar log de veículo:', err));
      }

      // 5. Audit driver assignments
      if (patch.driverName !== undefined && (!oldItem || oldItem.driverName !== patch.driverName)) {
        const oldDriver = oldItem?.driverName || 'NENHUM';
        const newDriver = patch.driverName || 'NENHUM';
        AuditLogRepository.log({
          user: userName,
          isMaster,
          entityType: 'ROUTING_PLAN_ITEM',
          entityId: ctrcId,
          action: 'UPDATE',
          field: 'driverName',
          oldValue: oldDriver,
          newValue: newDriver,
          description: `Motorista ${newDriver} vinculado ao CTRC ${ctrcId} por ${userName}`
        }).catch((err) => console.warn('[Audit] Erro ao registrar log de motorista:', err));
      }

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

      // If active routing plan exists on Supabase, synchronize in background
      if (activeRoutingPlan) {
        const companyCode = adminUser?.unid || 'SPO';
        const remoteItem = {
          id: `${activeRoutingPlan.id}_${ctrcId}`,
          planId: activeRoutingPlan.id,
          shipmentUniqueKey: `${companyCode}_${ctrcId}`,
          ctrcId: ctrcId,
          planningDate: planningDate,
          companyCode: companyCode,
          suggestedRoute: updatedItem.suggestedRoute || undefined,
          operationalRoute: updatedItem.operationalRoute || undefined,
          planningStatus: updatedItem.planningStatus || 'A_PLANEJAR',
          manualPriority: updatedItem.manualPriority || undefined,
          operationalNote: updatedItem.operationalNote || undefined,
          vehicleId: updatedItem.vehicleId || undefined,
          vehiclePlate: updatedItem.vehiclePlate || undefined,
          driverName: updatedItem.driverName || undefined,
          helperName: updatedItem.helperName || undefined,
          lockedByUser: updatedItem.lockedByUser ? String(updatedItem.lockedByUser) : undefined,
          updatedBy: adminUser?.username || 'admin',
        };

        routingPlanItemSupabaseRepository.upsertItem(remoteItem).catch((err) => {
          console.warn('[Roteirizacao] Erro silencioso ao salvar item no Supabase:', err);
        });
      }

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

  // Keep dbOccurrencesList in sync with occurrences prop
  useEffect(() => {
    if (occurrences) {
      setDbOccurrencesList(occurrences);
      const validSectors = new Set(occurrences.map((o) => (o.setor_ocorr || '').toUpperCase().trim()));
      
      setSelectedOccurrenceSectors((prev) => {
        if (!prev || prev.length === 0) return prev;
        const filtered = prev.filter((sec) => {
          const uSec = sec.toUpperCase().trim();
          return validSectors.has(uSec) || [
            'Agendamento',
            'Disponível',
            'Disponível Cobrança',
            'Disponível Pendência',
            'Disponível Transferência',
            'Sem setor',
            'Solução'
          ].map(s => s.toUpperCase().trim()).includes(uSec);
        });
        return filtered.length === prev.length ? prev : filtered;
      });
    }
  }, [occurrences, setSelectedOccurrenceSectors]);

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
      groupingMode
    });
  }, [densityMode, mesaScale, groupingMode, isPrefLoaded, isNormalizing]);

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
      const importBatchId = localStorage.getItem('active_import_batch_id') || undefined;

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
          importBatchId,
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
          updatedAt: nowStr,
          planId: activeRoutingPlan?.id
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

      // Audit Log for created pre-romaneios
      for (const pr of generatedPreRomaneios) {
        AuditLogRepository.log({
          user: adminUser.name || adminUser.username || 'admin',
          isMaster: adminUser.is_master || false,
          entityType: 'PRE_ROMANEIO',
          entityId: pr.id,
          action: 'CREATE',
          description: `Pré-romaneio ${pr.id} criado para a rota ${pr.route} (Portão: ${pr.gate || 'Nenhum'}) com ${pr.ctrcIds?.length || 0} CTRCs por ${adminUser.name || adminUser.username}`
        }).catch((err) => console.warn('[Audit] Erro ao registrar log de criacao de pre-romaneio:', err));
      }

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
    <div className="w-full flex flex-col h-[calc(100vh-12px)] bg-[var(--router-bg)] border border-[var(--router-border)] rounded-2xl overflow-hidden relative text-[var(--router-text)] select-none">
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
        onManualSync={() => performFullSync(true, true)}
        isSyncing={isSyncingPlan}
        onlineStatus={onlineStatus}
        activeUsersCount={activeUsersCount}
        activeUsersList={activeUsersList}
        lastSyncTime={lastSyncTime}
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
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--router-text-muted)] gap-1.5 bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl font-mono">
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
        <div className="absolute top-16 right-4 z-[70] bg-[var(--router-surface)] border-l-[4px] border-l-[var(--router-primary)] border-y border-r border-y-[var(--router-border)] border-r-[var(--router-border)] text-[var(--router-primary)] text-xs p-3 rounded-lg shadow-[var(--router-shadow)] flex items-center gap-2 max-w-sm animate-bounce font-sans font-bold">
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
            className="fixed inset-0 bg-[var(--router-surface-3)]/50 dark:bg-black/80 backdrop-blur-md z-[100] transition-all duration-200" 
            onClick={() => setGeneratedPreRomaneios(null)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[var(--router-bg)] border border-[var(--router-border)] rounded-2xl shadow-[var(--router-shadow)] z-[110] overflow-hidden flex flex-col p-6 font-sans">
            <div className="flex items-center gap-3.5 border-b border-[var(--router-border)] pb-4 mb-4 shrink-0 select-none">
              <div className="w-10 h-10 rounded-xl bg-[var(--router-surface)] border border-[var(--router-border)] flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--router-text)] uppercase tracking-wider leading-none">Confirmar Pré-separação</h3>
                <p className="text-[10px] text-[var(--router-success)] font-bold uppercase font-mono mt-1.5 font-bold">Enviar lote agrupado por rota e portão para docas</p>
              </div>
            </div>

            <p className="text-[11px] text-[var(--router-text-muted)] leading-relaxed uppercase font-mono mb-4">
              O sistema consolidou as cargas selecionadas em lotes de separação física. Confirme o despacho abaixo para criar os respectivos pré-romaneios:
            </p>

            <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-3.5 pr-1.5 scrollbar-thin scrollbar-track-transparent dark:scrollbar-track-transparent scrollbar-thumb-[var(--router-success)]/20">
              {generatedPreRomaneios.map((pr) => (
                <div key={pr.id} className="bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-xl p-3 flex flex-col gap-2.5 hover:border-[var(--router-success)]/35 transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[var(--router-text)] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-[var(--router-surface-3)] border border-[var(--router-border)] flex items-center justify-center text-[10px]">🚚</span>
                      {pr.route}
                    </span>
                    <span className="router-badge router-badge-success text-[9.5px] font-black font-mono px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      ⚓ {pr.gate}
                    </span>
                  </div>

                  {/* Elegant Bento Grid elements inside matching the custom styling guide */}
                  <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-[var(--router-border)]">
                    <div className="bg-[var(--router-bg)] border border-[var(--router-border)] rounded p-1.5 text-center">
                      <div className="text-[8px] text-[var(--router-text-muted)] uppercase font-black font-mono tracking-wider mb-0.5">📑 CTRCs</div>
                      <div className="text-xs text-[var(--router-text)] font-black font-mono">{pr.ctrcIds.length}</div>
                    </div>
                    <div className="bg-[var(--router-bg)] border border-[var(--router-border)] rounded p-1.5 text-center">
                      <div className="text-[8px] text-[var(--router-text-muted)] uppercase font-black font-mono tracking-wider mb-0.5">⚖️ Peso</div>
                      <div className="text-xs text-[var(--router-success)] font-black font-mono">
                        {pr.totalWeight >= 1000 ? `${(pr.totalWeight / 1000).toFixed(1)}t` : `${pr.totalWeight}kg`}
                      </div>
                    </div>
                    <div className="bg-[var(--router-bg)] border border-[var(--router-border)] rounded p-1.5 text-center">
                      <div className="text-[8px] text-[var(--router-text-muted)] uppercase font-black font-mono tracking-wider mb-0.5">📦 Vols</div>
                      <div className="text-xs text-[var(--router-warning)] font-black font-mono">{pr.totalVolumes}</div>
                    </div>
                    <div className="bg-[var(--router-bg)] border border-[var(--router-border)] rounded p-1.5 text-center">
                      <div className="text-[8px] text-[var(--router-text-muted)] uppercase font-black font-mono tracking-wider mb-0.5">💰 Frete</div>
                      <div className="text-[10px] text-[var(--router-info)] font-extrabold font-mono truncate" title={`R$ ${pr.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                        R$ {pr.totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-[var(--router-text-muted)] pt-1 border-t border-[var(--router-border)]">
                    <span className="font-bold text-[var(--router-success)] uppercase opacity-80">● AGUARDANDO LIBERAÇÃO</span>
                    <span>PROG: {pr.planningDate}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Standard buttons with secondary cancel action */}
            <div className="mt-6 pt-4 border-t border-[var(--router-border)] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setGeneratedPreRomaneios(null)}
                className="px-4 py-2.5 bg-[var(--router-surface)] border border-[var(--router-border)] text-[var(--router-text-muted)] hover:text-[var(--router-text)] uppercase font-black text-xs tracking-wider rounded-xl transition-all duration-150 cursor-pointer text-center flex-1"
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
