import React, { useState, useEffect } from 'react';
import { ViewType, Vehicle, DriverScore, Ctrc, Expense, Ticket, CriticClient, AppUser, DeliveryOccurrence, CurvaAClient, CtrcOccurrenceHistoryItem, PreRomaneio, VehicleRegistry, VehicleGrRule, AuditLog } from './types';
import { DEFAULT_OPERATIONAL_UNIT } from './constants/operationalUnits';
import { IS_DEMO_MODE } from './constants/runtimeMode';
import {
  initialVehicles,
  initialDrivers,
  initialAvailableCtrcs,
  initialLinkedCtrcs,
  initialExpenses,
  initialTickets,
  initialCriticalClients,
  initialDeliveryOccurrences,
  initialCurvaAClients,
} from './data';
import {
  syncVehicleToSupabase,
  removeVehicleFromSupabase,
  syncDriverToSupabase,
  removeDriverFromSupabase,
  syncOccurrenceToSupabase,
  removeOccurrenceFromSupabase,
  syncCurvaAClientToSupabase,
  removeCurvaAClientFromSupabase
} from './supabase';

// Local Persistence Layer & Repositories
import { db } from './infrastructure/localdb/db';
import { runCompatibilityMigration } from './infrastructure/localdb/adapters/localStorageAdapter';
import { CtrcRepository } from './infrastructure/localdb/repositories/ctrcRepository';
import { VehicleRepository } from './infrastructure/localdb/repositories/vehicleRepository';
import { VehicleRegistryRepository } from './infrastructure/localdb/repositories/vehicleRegistryRepository';
import { VehicleGrRuleRepository } from './infrastructure/localdb/repositories/vehicleGrRuleRepository';
import { AuditLogRepository } from './infrastructure/localdb/repositories/auditLogRepository';
import { DriverRepository } from './infrastructure/localdb/repositories/driverRepository';
import { TripRepository } from './infrastructure/localdb/repositories/tripRepository';
import { OccurrenceRepository } from './infrastructure/localdb/repositories/occurrenceRepository';
import { CtrcOccurrenceHistoryRepository } from './infrastructure/localdb/repositories/ctrcOccurrenceHistoryRepository';
import { RouteGateRepository } from './infrastructure/localdb/repositories/routeGateRepository';
import { PreRomaneioRepository } from './infrastructure/localdb/repositories/preRomaneioRepository';
import { UserPreferenceRepository } from './infrastructure/localdb/repositories/userPreferenceRepository';
import { APP_VERSION } from './constants/appVersion';

// Diagnostics master switch to reduce console verbosity
const ENABLE_ROUTER_DIAGNOSTICS = false;

// Import Views
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import ImportacaoView from './components/ImportacaoView';
import FrotaView from './components/FrotaView';
import DesempenhoView from './components/DesempenhoView';
import ClientesView from './components/ClientesView';
import RoteirizacaoView from './components/RoteirizacaoView';
import FinalizacaoView from './components/FinalizacaoView';
import SolucaoView from './components/SolucaoView';
import ConfiguracoesView from './components/ConfiguracoesView';
import LoginView from './components/LoginView';
import OcorrenciasView from './components/OcorrenciasView';
import CurvaAView from './components/CurvaAView';
import CidadesRotasView from './components/CidadesRotasView';
import BaseDadosView from './components/BaseDadosView';
import CtrcSswView from './components/CtrcSswView';
import RegrasGrView from './components/RegrasGrView';
import AuditoriaView from './components/AuditoriaView';

// Helper to determine if a status is "available"
export const notAvailableStatuses = new Set<string>([
  'Separando',
  'Programado',
  'Romaneio',
  'Em Rota',
  'Entregue',
  'Finalizado',
  'Cancelado'
]);

export function isStatusAvailable(status?: string | null): boolean {
  if (!status) return true;
  return !notAvailableStatuses.has(status);
}

// Function to partition CTRCs based on their operational phase and pre-romaneio links
export async function partitionCtrcs(localCtrcs: Ctrc[]): Promise<{ available: Ctrc[]; linked: Ctrc[]; allImported: Ctrc[] }> {
  let activePreRomaneioCtrcIds = new Set<string>();
  let activePreRomaneioIds = new Set<string>();
  
  const activeImportBatchId = localStorage.getItem('active_import_batch_id');

  try {
    const preRomaneios = await PreRomaneioRepository.getAll();
    preRomaneios.forEach((pr) => {
      if (pr.status !== 'CANCELADO') {
        activePreRomaneioIds.add(pr.id);
        pr.ctrcIds?.forEach((id) => {
          activePreRomaneioCtrcIds.add(id);
        });
      }
    });
  } catch (err) {
    console.error('[partitionCtrcs] Failed to retrieve pre-romaneios:', err);
  }

  const available: Ctrc[] = [];
  const linked: Ctrc[] = [];
  const allImported: Ctrc[] = [];

  for (const ctrc of localCtrcs) {
    // Collect all active import CTRCs for BI/Dashboard
    if (activeImportBatchId && ctrc.importBatchId === activeImportBatchId) {
      allImported.push(ctrc);
    } else if (!activeImportBatchId) {
      allImported.push(ctrc);
    }

    // Only process CTRCs belonging to the active import batch for Mesa
    if (activeImportBatchId && ctrc.importBatchId && ctrc.importBatchId !== activeImportBatchId) {
      continue;
    }

    const isActive = ctrc.isActiveForRouting !== undefined
      ? ctrc.isActiveForRouting
      : !(ctrc.status === 'Entregue' || ctrc.status === 'Recusado' || (ctrc.status as string) === 'Finalizado' || (ctrc.status as string) === 'Cancelado');

    if (!isActive) {
      continue;
    }

    const isLinkedByPreRomaneio = activePreRomaneioCtrcIds.has(ctrc.id);
    const preRomaneioId = (ctrc as any).preRomaneioId;
    const hasPreRomaneioId = preRomaneioId && activePreRomaneioIds.has(preRomaneioId);
    const hasRomaneioId = !!(ctrc as any).romaneioId;
    const isSelectedPermanently = !!(ctrc as any).selectedForRoute;

    const hasLinkedStatus = ctrc.status && notAvailableStatuses.has(ctrc.status);

    if (
      (hasLinkedStatus && ctrc.status !== 'Disponível') ||
      isLinkedByPreRomaneio ||
      hasPreRomaneioId ||
      hasRomaneioId ||
      isSelectedPermanently
    ) {
      linked.push(ctrc);
    } else {
      available.push(ctrc);
    }
  }

  return { available, linked, allImported };
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('router_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('router_theme', theme);
  }, [theme]);

  // Load and apply initial density & contrast on mount
  useEffect(() => {
    const savedDensity = localStorage.getItem('router_density') || 'normal';
    document.documentElement.setAttribute('data-density', savedDensity);
    document.documentElement.classList.toggle('density-compact', savedDensity === 'compact');
    document.documentElement.classList.toggle('density-comfortable', savedDensity === 'comfortable');

    const savedContrast = localStorage.getItem('router_contrast') || 'standard';
    document.documentElement.setAttribute('data-contrast', savedContrast);
    document.documentElement.classList.toggle('contrast-high', savedContrast === 'high');

    // Sync theme if changed externally (e.g. from ConfiguracoesView)
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('router_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    };
    window.addEventListener('router-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('router-theme-change', handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('router_theme', nextTheme);
      return nextTheme;
    });
  };
  
  // Operator profile state
  const [adminProfile, setAdminProfile] = useState<AppUser>({
    username: 'master',
    name: 'Anderson M. (Master)',
    role: 'Superintendente de Logística',
    is_master: true,
    unid: DEFAULT_OPERATIONAL_UNIT
  });

  // Master Session Control & Intercept States
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);
  const [showMasterUnlockModal, setShowMasterUnlockModal] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState<ViewType | null>(null);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Automatically unlock master screens for logged-in master users
  useEffect(() => {
    setIsSessionUnlocked(adminProfile?.is_master === true);
  }, [adminProfile]);

  // Global Operational Databases State
  const [vehicles, setVehicles] = useState<Vehicle[]>(IS_DEMO_MODE ? initialVehicles : []);
  const [vehicleRegistries, setVehicleRegistries] = useState<VehicleRegistry[]>([]);
  const [grRules, setGrRules] = useState<VehicleGrRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [drivers, setDrivers] = useState<DriverScore[]>(IS_DEMO_MODE ? initialDrivers : []);
  const [availableCtrcs, setAvailableCtrcs] = useState<Ctrc[]>(IS_DEMO_MODE ? initialAvailableCtrcs : []);
  const [linkedCtrcs, setLinkedCtrcs] = useState<Ctrc[]>(IS_DEMO_MODE ? initialLinkedCtrcs : []);
  const [allImportedCtrcs, setAllImportedCtrcs] = useState<Ctrc[]>([]);
  const [savedRomaneios, setSavedRomaneios] = useState<any[]>(() => {
    const saved = localStorage.getItem('saved_romaneios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    if (!IS_DEMO_MODE) {
      return [];
    }
    // Static initial romaneio representing a realistic preloaded historical routing check
    return [
      {
        id: '2981',
        date: '24/05/2026',
        vehicleId: 'RUE3B11',
        vehiclePlate: 'RUE3B11',
        driverName: 'HIAN THAYRON SOARES DE OLIVEIRA',
        helperName: 'VALDECI CARDOSO',
        ctrcs: [
          {
            id: 'SPO684122-2',
            destinatario: 'A.P. AUTO PECAS E ACESSORIOS LTD',
            cidade: 'ALFENAS',
            cidade_ent: 'ALFENAS, SP',
            weight: 350,
            volume: 4,
            type: 'NORMAL',
            status: 'Pendente',
            remetente: 'RODOBENS DISTRIBUIDORA',
            setor: 'SUL-1'
          },
          {
            id: 'BHS040163-3',
            destinatario: 'VARGINHA COMERCIAL LTDA',
            cidade: 'VARGINHA',
            cidade_ent: 'VARGINHA, MG',
            weight: 710,
            volume: 12,
            type: 'NORMAL',
            status: 'Pendente',
            remetente: 'SAMS CLUB SPO',
            setor: 'SUL-2'
          }
        ],
        observations: 'Roteirizado sob encomenda prioritária. Checar cubagem traseira.'
      }
    ];
  });
  const [expenses, setExpenses] = useState<Expense[]>(IS_DEMO_MODE ? initialExpenses : []);
  const [tickets, setTickets] = useState<Ticket[]>(IS_DEMO_MODE ? initialTickets : []);
  const [clients, setClients] = useState<CriticClient[]>(IS_DEMO_MODE ? initialCriticalClients : []);
  const [occurrences, setOccurrences] = useState<DeliveryOccurrence[]>(initialDeliveryOccurrences);
  const [curvaAClients, setCurvaAClients] = useState<CurvaAClient[]>(initialCurvaAClients);

  // Syncing state spinner
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active Romaneio Vehicle Tracker
  const [activeRomaneioVehicleId, setActiveRomaneioVehicleId] = useState<string | null>('RTA3G45');

  // Search filter
  const [searchValue, setSearchValue] = useState<string>('');

  // ---------------------------------------------------------
  // LOGIN FLOW HANDLER
  // ---------------------------------------------------------
  const handleLoginSuccess = (user: AppUser) => {
    const finalUser = {
      ...user,
      unid: user.unid || DEFAULT_OPERATIONAL_UNIT
    };
    setAdminProfile(finalUser);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentView('login');
    setSearchValue('');
  };

  // ---------------------------------------------------------
  // INITIALIZATION AND OFFLINE LOGISTICS HYDRATION
  // ---------------------------------------------------------
  useEffect(() => {
    async function initLocalDB() {
      try {
        // Controle de versão pós-deploy e reset seguro de filtros voláteis da Mesa
        const oldVersion = localStorage.getItem("router_app_version");
        if (oldVersion !== APP_VERSION) {
          console.log(`[Version Bump] Migrando de ${oldVersion || "vazio"} para ${APP_VERSION}.`);
          // Limpa apenas preferências de filtros da Mesa sem deletar dados operacionais
          await UserPreferenceRepository.clearAll();
          localStorage.setItem("router_app_version", APP_VERSION);
        }

        // Executa compatibilidade de localStorage legado e seeding estruturado para o IndexedDB
        await runCompatibilityMigration();
        await RouteGateRepository.seedDefaultGates();

        // Hidratação a partir do IndexedDB
        const localVehicles = await VehicleRepository.getAll();
        if (localVehicles.length > 0) {
          setVehicles(localVehicles);
        }

        const localVehicleRegistries = await VehicleRegistryRepository.getAll();
        setVehicleRegistries(localVehicleRegistries);

        const localGrRules = await VehicleGrRuleRepository.getAll();
        setGrRules(localGrRules);

        const localAuditLogs = await AuditLogRepository.getAll();
        setAuditLogs(localAuditLogs);
        
        // CR-MVP-SUPABASE-06: Sincronização Inicial do Supabase para Regras, Veículos e Clientes
        setTimeout(async () => {
          try {
            const { vehicleSupabaseRepository } = await import('./infrastructure/supabase/repositories/vehicleSupabaseRepository');
            const { vehicleGrRuleSupabaseRepository } = await import('./infrastructure/supabase/repositories/vehicleGrRuleSupabaseRepository');
            const { criticalClientSupabaseRepository } = await import('./infrastructure/supabase/repositories/criticalClientSupabaseRepository');
            
            // Sync GR Rules
            const remoteRulesRes = await vehicleGrRuleSupabaseRepository.getAllRules();
            if (remoteRulesRes.success && remoteRulesRes.data && remoteRulesRes.data.length > 0) {
              const remoteRules = remoteRulesRes.data.map(r => ({
                id: r.id,
                vehicleType: r.vehicle_type,
                maxValueWithoutGr: Number(r.max_value_without_gr),
                requiresTrackingAboveValue: Number(r.requires_tracking_above_value),
                requiresAuthorizationAboveLimit: r.requires_authorization_above_limit,
                blocksRoutingAboveLimit: r.blocks_routing_above_limit
              }));
              await VehicleGrRuleRepository.clearAll();
              for (const r of remoteRules) await VehicleGrRuleRepository.put(r);
              setGrRules(await VehicleGrRuleRepository.getAll());
            }

            // Sync Vehicles
            const remoteVehiclesRes = await vehicleSupabaseRepository.getAllVehicles();
            if (remoteVehiclesRes.success && remoteVehiclesRes.data && remoteVehiclesRes.data.length > 0) {
              const remoteVehicles = remoteVehiclesRes.data.map(v => ({
                id: v.id,
                plate: v.plate || undefined,
                driverName: v.driver_name,
                capacity: v.capacity,
                type: v.type,
                status: v.status
              }));
              for (const v of remoteVehicles) await VehicleRepository.put(v);
              setVehicles(await VehicleRepository.getAll());
            }

            // Sync Critical Clients (CriticClient)
            const remoteClientsRes = await criticalClientSupabaseRepository.getAllClients();
            if (remoteClientsRes.success && remoteClientsRes.data && remoteClientsRes.data.length > 0) {
              const remoteClients = remoteClientsRes.data.map(c => ({
                id: c.id,
                name: c.name,
                prefix: c.prefix,
                score: c.score,
                rejections30d: 0,
                avgQueueTime: '-',
                address: '',
                recurrentIssues: [],
                auditUser: '',
                auditAvatar: '',
                auditTime: '',
                auditDetail: c.reason || ''
              }));
              // Since CriticClient local state is normally mocked, we update the React state directly
              setClients(remoteClients);
            }
          } catch (e) {
            console.warn('[Sync] Supabase sync initialization failed (offline mode):', e);
          }
        }, 0);

        const localDrivers = await DriverRepository.getAll();
        if (localDrivers.length > 0) {
          setDrivers(localDrivers);
        }

        const localOccurrences = await OccurrenceRepository.getAll();
        if (localOccurrences.length > 0) {
          setOccurrences(localOccurrences);
        }

        const localRomaneios = await TripRepository.getAll();
        if (localRomaneios.length > 0) {
          const sorted = [...localRomaneios].sort((a, b) => b.id.localeCompare(a.id));
          setSavedRomaneios(sorted);
        }

        const localCtrcs = await CtrcRepository.getAll();
        if (localCtrcs.length > 0) {
          const { available, linked, allImported } = await partitionCtrcs(localCtrcs);

          // Diagnostics block for App.tsx mount
          if (ENABLE_ROUTER_DIAGNOSTICS) {
            const statusCounts: Record<string, number> = {};
            const unidCounts: Record<string, number> = {};
            localCtrcs.forEach((c) => {
              statusCounts[c.status || 'sem status'] = (statusCounts[c.status || 'sem status'] || 0) + 1;
              const u = (c.unid || 'sem filial').toUpperCase();
              unidCounts[u] = (unidCounts[u] || 0) + 1;
            });
            console.log('[DIAG_APP_MOUNT] Reidratação de Inicialização:', {
              totalCtrcsFromDb: localCtrcs.length,
              availableCount: available.length,
              linkedCount: linked.length,
              allImportedCount: allImported.length,
              byStatus: statusCounts,
              byUnid: unidCounts,
            });
          }

          setAvailableCtrcs(available);
          setLinkedCtrcs(linked);
          setAllImportedCtrcs(allImported);
        }
      } catch (err) {
        console.error('[App] Falha crítica de inicialização IndexedDB, usando memória:', err);
      }
    }
    initLocalDB();
  }, []);

  // ---------------------------------------------------------
  // OPERATIONAL STATE CHANGERS (FROTA)
  // ---------------------------------------------------------
  const handleAddVehicle = async (v: Vehicle) => {
    setVehicles((prev) => [...prev, v]);
    await VehicleRepository.put(v);
    setIsSyncing(true);
    try {
      const { vehicleSupabaseRepository } = await import('./infrastructure/supabase/repositories/vehicleSupabaseRepository');
      await vehicleSupabaseRepository.upsertVehicle(v);
    } catch (e) { console.warn(e) }
    setIsSyncing(false);
  };

  const handleUpdateVehicle = async (v: Vehicle) => {
    setVehicles((prev) => prev.map((item) => (item.id === v.id ? v : item)));
    await VehicleRepository.put(v);
    setIsSyncing(true);
    try {
      const { vehicleSupabaseRepository } = await import('./infrastructure/supabase/repositories/vehicleSupabaseRepository');
      await vehicleSupabaseRepository.upsertVehicle(v);
    } catch (e) { console.warn(e) }
    setIsSyncing(false);
  };

  const handleRemoveVehicle = async (id: string) => {
    setVehicles((prev) => prev.filter((item) => item.id !== id));
    await VehicleRepository.delete(id);
    setIsSyncing(true);
    await removeVehicleFromSupabase(id);
    setIsSyncing(false);
  };

  const handleAddVehicleRegistry = async (vr: VehicleRegistry) => {
    await VehicleRegistryRepository.put(vr);
    const updated = await VehicleRegistryRepository.getAll();
    setVehicleRegistries(updated);

    await AuditLogRepository.log({
      user: adminProfile.name,
      isMaster: isSessionUnlocked,
      entityType: 'VEHICLE_REGISTRY',
      entityId: vr.placa,
      action: 'CREATE',
      description: `Veículo ${vr.placa} cadastrado na frota. Tipo: ${vr.tipo}, Status: ${vr.statusOperacional}`
    });

    const logs = await AuditLogRepository.getAll();
    setAuditLogs(logs);
  };

  const handleUpdateVehicleRegistry = async (vr: VehicleRegistry) => {
    const oldVr = vehicleRegistries.find(item => item.placa === vr.placa);
    await VehicleRegistryRepository.put(vr);
    const updated = await VehicleRegistryRepository.getAll();
    setVehicleRegistries(updated);

    if (oldVr) {
      const changes: string[] = [];
      if (oldVr.statusOperacional !== vr.statusOperacional) {
        await AuditLogRepository.log({
          user: adminProfile.name,
          isMaster: isSessionUnlocked,
          entityType: 'VEHICLE_REGISTRY',
          entityId: vr.placa,
          action: 'UPDATE',
          field: 'statusOperacional',
          oldValue: oldVr.statusOperacional,
          newValue: vr.statusOperacional,
          description: `Status operacional do veículo ${vr.placa} alterado de ${oldVr.statusOperacional} para ${vr.statusOperacional}`
        });
      } else {
        if (oldVr.tipo !== vr.tipo) changes.push(`tipo (${oldVr.tipo} -> ${vr.tipo})`);
        if (oldVr.limiteGrSugerido !== vr.limiteGrSugerido) changes.push(`limite GR (${oldVr.limiteGrSugerido} -> ${vr.limiteGrSugerido})`);
        if (oldVr.motoristaPadrao !== vr.motoristaPadrao) changes.push(`motorista (${oldVr.motoristaPadrao || 'Nenhum'} -> ${vr.motoristaPadrao || 'Nenhum'})`);
        
        await AuditLogRepository.log({
          user: adminProfile.name,
          isMaster: isSessionUnlocked,
          entityType: 'VEHICLE_REGISTRY',
          entityId: vr.placa,
          action: 'UPDATE',
          description: `Dados cadastrais do veículo ${vr.placa} atualizados. Alterações: ${changes.join(', ') || 'Sem alterações relevantes'}`
        });
      }
    }

    const logs = await AuditLogRepository.getAll();
    setAuditLogs(logs);
  };

  const handleRemoveVehicleRegistry = async (placa: string) => {
    const oldVr = vehicleRegistries.find(item => item.placa === placa);
    await VehicleRegistryRepository.delete(placa);
    const updated = await VehicleRegistryRepository.getAll();
    setVehicleRegistries(updated);

    await AuditLogRepository.log({
      user: adminProfile.name,
      isMaster: isSessionUnlocked,
      entityType: 'VEHICLE_REGISTRY',
      entityId: placa,
      action: 'DELETE',
      description: `Veículo ${placa} (${oldVr?.tipo || 'Sem Tipo'}) foi removido administrativamente da frota`
    });

    const logs = await AuditLogRepository.getAll();
    setAuditLogs(logs);
  };

  const handleUpdateGrRule = async (rule: VehicleGrRule) => {
    const oldRule = grRules.find(r => r.id === rule.id);
    await VehicleGrRuleRepository.put(rule);
    const updated = await VehicleGrRuleRepository.getAll();
    setGrRules(updated);

    // CR-MVP-SUPABASE-06: Sync GR Rule
    setTimeout(async () => {
      try {
        const { vehicleGrRuleSupabaseRepository } = await import('./infrastructure/supabase/repositories/vehicleGrRuleSupabaseRepository');
        await vehicleGrRuleSupabaseRepository.upsertRule(rule);
      } catch (e) {
        console.warn('Failed to sync GR rule to Supabase:', e);
      }
    }, 0);

    if (oldRule) {
      if (oldRule.maxValueWithoutGr !== rule.maxValueWithoutGr) {
        await AuditLogRepository.log({
          user: adminProfile.name,
          isMaster: isSessionUnlocked,
          entityType: 'VEHICLE_GR_RULE',
          entityId: rule.id,
          action: 'UPDATE',
          field: 'maxValueWithoutGr',
          oldValue: String(oldRule.maxValueWithoutGr),
          newValue: String(rule.maxValueWithoutGr),
          description: `Alterado limite de valor para ${rule.id} de R$ ${oldRule.maxValueWithoutGr.toLocaleString('pt-BR')} para R$ ${rule.maxValueWithoutGr.toLocaleString('pt-BR')}`
        });
      }
      if (oldRule.requiresTrackingAboveValue !== rule.requiresTrackingAboveValue) {
        await AuditLogRepository.log({
          user: adminProfile.name,
          isMaster: isSessionUnlocked,
          entityType: 'VEHICLE_GR_RULE',
          entityId: rule.id,
          action: 'UPDATE',
          field: 'requiresTrackingAboveValue',
          oldValue: String(oldRule.requiresTrackingAboveValue),
          newValue: String(rule.requiresTrackingAboveValue),
          description: `Exigência de rastreamento de GR para ${rule.id} alterada de ${oldRule.requiresTrackingAboveValue ? 'Sim' : 'Não'} para ${rule.requiresTrackingAboveValue ? 'Sim' : 'Não'}`
        });
      }
      if (oldRule.requiresAuthorizationAboveLimit !== rule.requiresAuthorizationAboveLimit) {
        await AuditLogRepository.log({
          user: adminProfile.name,
          isMaster: isSessionUnlocked,
          entityType: 'VEHICLE_GR_RULE',
          entityId: rule.id,
          action: 'UPDATE',
          field: 'requiresAuthorizationAboveLimit',
          oldValue: String(oldRule.requiresAuthorizationAboveLimit),
          newValue: String(rule.requiresAuthorizationAboveLimit),
          description: `Exigência de autorização especial para ${rule.id} alterada de ${oldRule.requiresAuthorizationAboveLimit ? 'Sim' : 'Não'} para ${rule.requiresAuthorizationAboveLimit ? 'Sim' : 'Não'}`
        });
      }
      if (oldRule.blocksRoutingAboveLimit !== rule.blocksRoutingAboveLimit) {
        await AuditLogRepository.log({
          user: adminProfile.name,
          isMaster: isSessionUnlocked,
          entityType: 'VEHICLE_GR_RULE',
          entityId: rule.id,
          action: 'UPDATE',
          field: 'blocksRoutingAboveLimit',
          oldValue: String(oldRule.blocksRoutingAboveLimit),
          newValue: String(rule.blocksRoutingAboveLimit),
          description: `Bloqueio operacional acima do limite para ${rule.id} alterado de ${oldRule.blocksRoutingAboveLimit ? 'Sim' : 'Não'} para ${rule.blocksRoutingAboveLimit ? 'Sim' : 'Não'}`
        });
      }
    }

    const logs = await AuditLogRepository.getAll();
    setAuditLogs(logs);
  };

  const handleRefreshLogs = async () => {
    setIsSyncing(true);
    const updated = await AuditLogRepository.getAll();
    setAuditLogs(updated);
    setIsSyncing(false);
  };

  const handleAddDriver = async (d: DriverScore) => {
    setDrivers((prev) => [...prev, d]);
    await DriverRepository.put(d);
    setIsSyncing(true);
    await syncDriverToSupabase(d);
    setIsSyncing(false);
  };

  const handleUpdateDriver = async (d: DriverScore) => {
    setDrivers((prev) => prev.map((item) => (item.id === d.id ? d : item)));
    await DriverRepository.put(d);
    setIsSyncing(true);
    await syncDriverToSupabase(d);
    setIsSyncing(false);
  };

  const handleRemoveDriver = async (id: string) => {
    setDrivers((prev) => prev.filter((item) => item.id !== id));
    await DriverRepository.delete(id);
    setIsSyncing(true);
    await removeDriverFromSupabase(id);
    setIsSyncing(false);
  };

  // ---------------------------------------------------------
  // OPERATIONAL STATE CHANGERS (OCORRENCIAS & CURVA A)
  // ---------------------------------------------------------
  const handleAddOccurrence = async (o: DeliveryOccurrence) => {
    setOccurrences((prev) => [...prev, o]);
    await OccurrenceRepository.put(o);
    setIsSyncing(true);
    await syncOccurrenceToSupabase(o);
    setIsSyncing(false);
  };

  const handleUpdateOccurrence = async (o: DeliveryOccurrence) => {
    setOccurrences((prev) => prev.map((item) => (item.codigo === o.codigo ? o : item)));
    await OccurrenceRepository.put(o);
    setIsSyncing(true);
    await syncOccurrenceToSupabase(o);
    setIsSyncing(false);
  };

  const handleRemoveOccurrence = async (codigo: string) => {
    setOccurrences((prev) => prev.filter((item) => item.codigo !== codigo));
    await OccurrenceRepository.delete(codigo);
    setIsSyncing(true);
    await removeOccurrenceFromSupabase(codigo);
    setIsSyncing(false);
  };

  const handleBulkImportOccurrences = async (list: DeliveryOccurrence[], replaceMode?: boolean) => {
    if (replaceMode) {
      setOccurrences(list);
      await OccurrenceRepository.clearAll();
      for (const o of list) {
        await OccurrenceRepository.put(o, true);
      }
      setIsSyncing(true);
      for (const o of list) {
        await syncOccurrenceToSupabase(o);
      }
      setIsSyncing(false);
    } else {
      setOccurrences((prev) => {
        const filteredPrev = prev.filter(p => !list.some(l => l.codigo === p.codigo));
        return [...filteredPrev, ...list];
      });
      for (const o of list) {
        await OccurrenceRepository.put(o);
      }
      setIsSyncing(true);
      for (const o of list) {
        await syncOccurrenceToSupabase(o);
      }
      setIsSyncing(false);
    }
  };

  const handleClearAllOccurrences = async () => {
    setOccurrences([]);
    await OccurrenceRepository.clearAll();
  };

  const handleAddCurvaA = async (c: CurvaAClient) => {
    setCurvaAClients((prev) => [...prev, c]);
    setIsSyncing(true);
    await syncCurvaAClientToSupabase(c);
    setIsSyncing(false);
  };

  const handleUpdateCurvaA = async (c: CurvaAClient) => {
    setCurvaAClients((prev) => prev.map((item) => (item.cnpj_remetente === c.cnpj_remetente ? c : item)));
    setIsSyncing(true);
    await syncCurvaAClientToSupabase(c);
    setIsSyncing(false);
  };

  const handleRemoveCurvaA = async (cnpj: string) => {
    setCurvaAClients((prev) => prev.filter((item) => item.cnpj_remetente !== cnpj));
    setIsSyncing(true);
    await removeCurvaAClientFromSupabase(cnpj);
    setIsSyncing(false);
  };

  const handleBulkImportCurvaA = async (list: CurvaAClient[]) => {
    setCurvaAClients((prev) => {
      const filteredPrev = prev.filter(p => !list.some(l => l.cnpj_remetente === p.cnpj_remetente));
      return [...filteredPrev, ...list];
    });
    setIsSyncing(true);
    for (const c of list) {
      await syncCurvaAClientToSupabase(c);
    }
    setIsSyncing(false);
  };

  // ---------------------------------------------------------
  // IMPORTAÇÃO DE CTRC
  // ---------------------------------------------------------
  const handleAddCtrcs = async (newCtrcs: Ctrc[]) => {
    // 0. Generate new importBatchId and planningDate
    const nowStr = new Date().toISOString();
    const planningDate = nowStr.split('T')[0];
    const importBatchId = nowStr;

    localStorage.setItem('active_import_batch_id', importBatchId);
    localStorage.setItem('active_planning_date', planningDate);

    // 0.1 Fetch all existing local CTRCs first
    const allExistingCtrcs = await CtrcRepository.getAll();
    const { available: oldAvailable, linked: oldLinked } = await partitionCtrcs(allExistingCtrcs);
    const oldAvailableCount = oldAvailable.length;

    // Apply importBatchId and planningDate to newCtrcs
    const enrichedNewCtrcs = newCtrcs.map(c => ({
      ...c,
      importBatchId,
      planningDate
    }));

    // 1. Load existing CTRCs from the offline database to perform a safe merge
    const ids = enrichedNewCtrcs.map(c => c.id);
    const existingCtrcs = await CtrcRepository.getByIds(ids);
    const existingMap = new Map<string, Ctrc>(existingCtrcs.map(c => [c.id, c]));

    // 2. Perform safe merge: keep new raw SSW fields but preserve existing local decisions/states (for linked/saved CTRCs)
    const mergedCtrcs = enrichedNewCtrcs.map((newCtrc) => {
      const existing = existingMap.get(newCtrc.id);
      if (!existing) {
        return newCtrc;
      }

      const merged = { ...newCtrc };

      // Preserving local decision fields if they exist
      const fieldsToPreserve = [
        'operationalRoute',
        'manualPriority',
        'planningStatus',
        'operationalNote',
        'isManualRoute',
        'preRomaneioId',
        'romaneioId',
        'routePlanningId',
      ];

      fieldsToPreserve.forEach((field) => {
        if ((existing as any)[field] !== undefined) {
          (merged as any)[field] = (existing as any)[field];
        }
      });

      // Preserve existing operational status (e.g. 'Disponível', 'Em Rota', 'Entregue', etc.)
      if (existing.status) {
        merged.status = existing.status;
      }

      return merged;
    });

    // 3. Update memory react states safely replacing the active available queue
    // We do not delete old CTRCs from DB anymore, we just don't show them in the active available queue
    const oldLinkedIdsSet = new Set(oldLinked.map(l => l.id));
    const toAvailable = mergedCtrcs.filter(c => !oldLinkedIdsSet.has(c.id));

    setAvailableCtrcs(toAvailable);

    setLinkedCtrcs((prev) => {
      // Merge updated raw fields for items already inside the linked list
      return prev.map((item) => {
        const merged = mergedCtrcs.find((m) => m.id === item.id);
        return merged ? merged : item;
      });
    });

    // 4. Batch persist to local IndexedDB
    await CtrcRepository.putMany(mergedCtrcs);

    // 5. Stash the import stats in localStorage so we can display beautiful, detailed numbers in the UI
    localStorage.setItem('last_import_old_removed_count', String(oldAvailableCount));
    localStorage.setItem('last_import_new_added_count', String(newCtrcs.length));

    // 6. Incremental historical occurrence capture to IndexedDB
    try {
      const nowStr = new Date().toISOString();
      const historyItemsToSave: CtrcOccurrenceHistoryItem[] = [];

      for (const ctrc of mergedCtrcs) {
        // Query current historic logs for this single CTRC
        const history = await CtrcOccurrenceHistoryRepository.getByCtrcId(ctrc.id);
        const sortedHistory = history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latest = sortedHistory[0];

        const currentCode = (ctrc.ocorrencia || '').trim();
        const currentStatus = (ctrc.status || '').trim();
        const currentLocation = (ctrc.localizacao || '').trim();

        // Detect if there's any state displacement
        const isNewEvent = !latest || 
          (latest.occurrenceCode || '') !== currentCode ||
          (latest.status || '') !== currentStatus ||
          (latest.locationLabel || '') !== currentLocation;

        if (isNewEvent) {
          const historyId = `${ctrc.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          historyItemsToSave.push({
            id: historyId,
            ctrcId: ctrc.id,
            importDate: nowStr.split('T')[0], // YYYY-MM-DD
            occurrenceCode: ctrc.ocorrencia || undefined,
            occurrenceDescription: ctrc.descricao_ocorr || undefined,
            locationLabel: ctrc.localizacao || undefined,
            status: ctrc.status || undefined,
            unid: ctrc.unid || undefined,
            cidade: ctrc.cidade || undefined,
            rota: ctrc.setor || undefined,
            prevEnt: ctrc.prev_ent || undefined,
            createdAt: nowStr,
          });
        }
      }

      if (historyItemsToSave.length > 0) {
        await CtrcOccurrenceHistoryRepository.upsertManyDeduped(historyItemsToSave);
        console.log(`[Importacao] Gravados ${historyItemsToSave.length} novos eventos no histórico.`);
      }
    } catch (err) {
      console.error('[Importacao] Erro durante o salvamento do histórico de ocorrências do CTRC:', err);
    }

    // Garantir recarga explícita pós-importação bem-sucedida direto do IndexedDB para o estado React
    try {
      const allLocalCtres = await CtrcRepository.getAll();
      if (allLocalCtres.length > 0) {
        const { available, linked, allImported } = await partitionCtrcs(allLocalCtres);

        // Diagnostics block for App.tsx handleAddCtrcs rehydration
        if (ENABLE_ROUTER_DIAGNOSTICS) {
          const statusCounts: Record<string, number> = {};
          const unidCounts: Record<string, number> = {};
          allLocalCtres.forEach((c) => {
            statusCounts[c.status || 'sem status'] = (statusCounts[c.status || 'sem status'] || 0) + 1;
            const u = (c.unid || 'sem filial').toUpperCase();
            unidCounts[u] = (unidCounts[u] || 0) + 1;
          });
          console.log('[DIAG_APP_REHYDRATE] Reidratação Pós-Importação:', {
            totalCtrcsFromDb: allLocalCtres.length,
            availableCount: available.length,
            linkedCount: linked.length,
            allImportedCount: allImported.length,
            byStatus: statusCounts,
            byUnid: unidCounts,
          });
        }

        setAvailableCtrcs(available);
        setLinkedCtrcs(linked);
        setAllImportedCtrcs(allImported);
      } else {
        setAvailableCtrcs([]);
        setLinkedCtrcs([]);
        setAllImportedCtrcs([]);
      }
      console.log(`[Importacao] Memória reidratada explicitamente com ${allLocalCtres.length} CTRCs do banco.`);
      
      // CR-MVP-SUPABASE-06: Sincronização com Supabase (Em Background)
      setTimeout(async () => {
        try {
          const { importBatchSupabaseRepository } = await import('./infrastructure/supabase/repositories/importBatchSupabaseRepository');
          const { shipmentSupabaseRepository } = await import('./infrastructure/supabase/repositories/shipmentSupabaseRepository');
          
          const adminUnid = adminProfile?.unid || DEFAULT_OPERATIONAL_UNIT;
          const adminUsername = adminProfile?.username || 'admin';
          
          // 1. Criar Lote de Importação
          await importBatchSupabaseRepository.createBatch({
            id: importBatchId,
            imported_at: new Date().toISOString(),
            imported_by: adminUsername,
            source_filename: `importacao_${planningDate}.csv`,
            total_rows: mergedCtrcs.length,
            inserted_count: newCtrcs.length,
            updated_count: mergedCtrcs.length - newCtrcs.length,
            rejected_count: 0
          });

          // 2. Converter CTRCs para Formato Shipment
          const shipmentsToSync = mergedCtrcs.map(c => ({
            id: c.id,
            company_code: adminUnid,
            ctrc_number: c.id.replace(/\D/g, '').substring(0, 8) || c.id,
            ctrc_series: '1',
            unique_key: `${adminUnid}_1_${c.id}`,
            issue_date: c.data_ocorrencia || undefined,
            forecast_delivery_date: c.prev_ent || undefined,
            unit_arrival_date: c.data_ocorrencia || undefined,
            sender_name: c.remetente || undefined,
            recipient_name: c.destinatario || undefined,
            payer_name: c.pagador || undefined,
            destination_city: c.cidade || undefined,
            destination_state: 'MG', // Default for now
            total_value: c.valor || undefined,
            weight: c.weight || undefined,
            volume_count: c.volume || undefined,
            status: c.status || undefined,
            is_delivered: c.status === 'Entregue',
            is_curve_a: c.type === 'CURVA A',
            is_critical_client: false,
            last_import_batch_id: importBatchId,
            raw_payload: c,
            updated_at: new Date().toISOString()
          }));

          // 3. Upsert shipments
          const BATCH_SIZE = 500;
          for (let i = 0; i < shipmentsToSync.length; i += BATCH_SIZE) {
            const batch = shipmentsToSync.slice(i, i + BATCH_SIZE);
            await shipmentSupabaseRepository.upsertShipments(batch);
          }
          console.log(`[Importacao] Sincronização Supabase concluída (${shipmentsToSync.length} shipments)`);
        } catch (syncErr) {
          console.error('[Importacao] Falha na sincronização Supabase (fallback ativo):', syncErr);
        }
      }, 0);

    } catch (rehydrateErr) {
      console.error('[Importacao] Falha na recarga explícita pós-importação:', rehydrateErr);
    }
  };

  // ---------------------------------------------------------
  // ROTEIRIZAÇÃO FLOW HANDLER
  // ---------------------------------------------------------
  const handleAssignCtre = async (ctrcId: string, vehicleId: string) => {
    // Flag vehicle status to active "Em Rota" when cargo starts mapping
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          const updated = { ...v, status: 'Em Rota' as const };
          VehicleRepository.put(updated);
          return updated;
        }
        return v;
      })
    );
  };

  const handleConsolidateRomaneio = async (vehicleId: string, assignedCtrcs: Ctrc[]) => {
    // Purge from pending/available list
    const assignedIds = assignedCtrcs.map((c) => c.id);
    setAvailableCtrcs((prev) => prev.filter((c) => !assignedIds.includes(c.id)));

    // Set the designated vehicle ID for the active session
    setActiveRomaneioVehicleId(vehicleId);

    const updatedCtrcs = assignedCtrcs.map((c) => ({ ...c, status: 'Pendente' as const }));

    // Append to Romaneio's linked CTRCs checklist
    setLinkedCtrcs((prev) => [
      ...prev,
      ...updatedCtrcs,
    ]);

    // Persiste no IndexedDB em segundo plano
    await CtrcRepository.putMany(updatedCtrcs);

    // Define standard starting tab on finalization screen
    localStorage.setItem('finalizacao_initial_tab', 'active');

    // Go to finalization page!
    setCurrentView('finalizacao');
  };

  const handleGeneratePreRomaneioSuccess = async (preRomaneios: PreRomaneio[], originalCtrcs: Ctrc[]) => {
    const preSeparatingIds = originalCtrcs.map((c) => c.id);
    
    // 1. Update in CtrcRepository to 'Separando' on DB level
    const updatedCtrcs = originalCtrcs.map((c) => ({ ...c, status: 'Separando' as const }));
    await CtrcRepository.putMany(updatedCtrcs);

    // 2. Clear from available in-memory set
    setAvailableCtrcs((prev) => prev.filter((c) => !preSeparatingIds.includes(c.id)));

    // 3. Insert into linked sets in-memory
    setLinkedCtrcs((prev) => {
      const filtered = prev.filter((c) => !preSeparatingIds.includes(c.id));
      return [...filtered, ...updatedCtrcs];
    });

    // 4. Force state direction to pre-romaneio list
    localStorage.setItem('finalizacao_initial_tab', 'preromaneio');
  };

  // ---------------------------------------------------------
  // FINALIZAÇÃO DE ROMANEIO & FINANCEIRO
  // ---------------------------------------------------------
  const handleUpdateCtrcStatus = async (id: string, status: 'Pendente' | 'Entregue' | 'Recusado') => {
    setLinkedCtrcs((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, status };
          CtrcRepository.put(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const handleAddExpense = (exp: Expense) => {
    setExpenses((prev) => [...prev, exp]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCloseRomaneio = async () => {
    // Purge linked list representing the manifest closing session
    setLinkedCtrcs([]);
    // Restore primary vehicles to "Disponível"
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.status === 'Em Rota') {
          const updated = { ...v, status: 'Disponível' as const };
          VehicleRepository.put(updated);
          return updated;
        }
        return v;
      })
    );
    // Reset vehicle tracker
    setActiveRomaneioVehicleId(null);
  };

  const handleSaveRomaneio = async (newRom: any) => {
    setSavedRomaneios((prev) => [newRom, ...prev]);
    await TripRepository.put(newRom);
  };

  const handleDeleteRomaneio = async (id: string) => {
    setSavedRomaneios((prev) => prev.filter((r) => r.id !== id));
    await TripRepository.delete(id);
  };

  // ---------------------------------------------------------
  // SOLUTIONS TICKETS DE DESERVIÇO
  // ---------------------------------------------------------
  const handleResolveTicket = (
    id: string,
    resolution: 'Re-agendado' | 'Devolvido' | 'Troca Motorista'
  ) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: resolution } : t))
    );
  };

  // ---------------------------------------------------------
  // CLIENTES CRÍTICOS AUDITING NOTES APPENDER
  // ---------------------------------------------------------
  const handleAddAuditNote = (clientId: string, note: string, author: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === clientId) {
          const updatedClient = {
            ...c,
            auditUser: author,
            auditTime: 'Há poucos segundos',
            auditDetail: note,
          };
          
          // CR-MVP-SUPABASE-06: Sincronizar atualização de auditoria do cliente crítico
          setTimeout(async () => {
            try {
              const { criticalClientSupabaseRepository } = await import('./infrastructure/supabase/repositories/criticalClientSupabaseRepository');
              await criticalClientSupabaseRepository.upsertClient(updatedClient);
            } catch (err) {
              console.warn('Falha ao sincronizar cliente crítico:', err);
            }
          }, 0);

          return updatedClient;
        }
        return c;
      })
    );
  };

  // ---------------------------------------------------------
  // SYSTEM RESETS (GOVERNANÇA)
  // ---------------------------------------------------------
  const handleResetOP01 = () => {
    setVehicles(IS_DEMO_MODE ? initialVehicles : []);
    setDrivers(IS_DEMO_MODE ? initialDrivers : []);
  };

  const handleResetOP02 = () => {
    setAvailableCtrcs(IS_DEMO_MODE ? initialAvailableCtrcs : []);
    setTickets(IS_DEMO_MODE ? initialTickets : []);
  };

  const handleResetOP03 = () => {
    setClients(IS_DEMO_MODE ? initialCriticalClients : []);
    setOccurrences(initialDeliveryOccurrences);
    setCurvaAClients(initialCurvaAClients);
  };

  const rehydrateCtrcsOnly = async () => {
    try {
      const localCtrcs = await CtrcRepository.getAll();
      if (localCtrcs.length > 0) {
        const { available, linked, allImported } = await partitionCtrcs(localCtrcs);
        setAvailableCtrcs(available);
        setLinkedCtrcs(linked);
        setAllImportedCtrcs(allImported);
      } else {
        setAvailableCtrcs([]);
        setLinkedCtrcs([]);
        setAllImportedCtrcs([]);
      }
    } catch (err) {
      console.error('[App] Erro ao reidratar CTRCs do IndexedDB:', err);
    }
  };

  const handleRefreshAllLocalData = async () => {
    try {
      const localVehicles = await VehicleRepository.getAll();
      if (localVehicles.length > 0) {
        setVehicles(localVehicles);
      }

      const localDrivers = await DriverRepository.getAll();
      if (localDrivers.length > 0) {
        setDrivers(localDrivers);
      }

      const localOccurrences = await OccurrenceRepository.getAll();
      if (localOccurrences.length > 0) {
        setOccurrences(localOccurrences);
      }

      const localRomaneios = await TripRepository.getAll();
      if (localRomaneios.length > 0) {
        const sorted = [...localRomaneios].sort((a, b) => b.id.localeCompare(a.id));
        setSavedRomaneios(sorted);
      } else {
        setSavedRomaneios([]);
      }

      await rehydrateCtrcsOnly();
    } catch (err) {
      console.error('[App] Erro ao reidratar memória local do IndexedDB:', err);
    }
  };

  // Resolve counts for notifications indicator
  const pendingTicketsCount = tickets.filter((t) => t.status === 'Pendente').length;

  const handleClearNotifications = () => {
    // Simply navigate to problem ticket resolving
    setCurrentView('solucao');
  };

  const handleNavigateFromDash = (view: 'importacao' | 'frota' | 'roteirizacao') => {
    setCurrentView(view);
  };

  // ---------------------------------------------------------
  // SECURE ADMINISTRATION VIEW REORGANIZATION & GUARD
  // ---------------------------------------------------------
  const ADMIN_VIEWS = new Set<ViewType>([
    'frota',
    'desempenho',
    'solucao',
    'clientes',
    'ocorrencias',
    'curva_a',
    'base_dados',
    'configuracoes',
    'regras_gr',
    'auditoria'
  ]);

  const handleDirectUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPasswordInput === '123') {
      setIsSessionUnlocked(true);
      setUnlockPasswordInput('');
      setUnlockError('');
    } else {
      setUnlockError('Senha mestre incorreta. Tente novamente.');
    }
  };

  const handleSidebarUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPasswordInput === '123') {
      setIsSessionUnlocked(true);
      setShowMasterUnlockModal(false);
      setUnlockPasswordInput('');
      setUnlockError('');
      if (pendingTargetView) {
        setCurrentView(pendingTargetView);
        setPendingTargetView(null);
      }
    } else {
      setUnlockError('Senha mestre incorreta. Tente novamente.');
    }
  };

  const handleViewChange = (view: ViewType) => {
    if (ADMIN_VIEWS.has(view) && !isSessionUnlocked) {
      setPendingTargetView(view);
      setUnlockPasswordInput('');
      setUnlockError('');
      setShowMasterUnlockModal(true);
    } else {
      setCurrentView(view);
    }
  };

  // ---------------------------------------------------------
  // CONDITIONAL VIEW DISPATCHER
  // ---------------------------------------------------------
  const renderActiveView = () => {
    // Route-level security guard: block rendering if trying to access restricted view without unlocking
    if (ADMIN_VIEWS.has(currentView) && !isSessionUnlocked) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4 py-8">
          <div className="bg-surface-container border border-outline-variant max-w-md w-full rounded-2xl p-6 md:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-500" />
            
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[36px] select-none">lock</span>
            </div>

            <h2 className="text-xl font-bold text-on-surface mb-2 tracking-tight">
              Área Administrativa Protegida
            </h2>
            
            <p className="text-xs text-[var(--router-text-soft)] mb-6 leading-relaxed">
              Você está tentando acessar uma tela de configuração ou auditoria restrita. Insira a senha mestre para desbloquear o acesso.
            </p>

            <form onSubmit={handleDirectUnlockSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Senha Mestre (padrão: 123)"
                  value={unlockPasswordInput}
                  onChange={(e) => {
                    setUnlockPasswordInput(e.target.value);
                    setUnlockError('');
                  }}
                  className="w-full bg-[var(--router-input-bg)] border border-[var(--router-input-border)] text-on-surface text-center rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--router-primary)] focus:ring-1 focus:ring-[var(--router-primary)]/30 font-sans tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  autoFocus
                />
                {unlockError && (
                  <p className="text-[11px] text-[var(--router-danger)] font-semibold mt-2">
                    ⚠️ {unlockError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="w-1/2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-on-surface-variant font-medium py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Voltar ao Painel
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigateToView={handleNavigateFromDash}
            searchValue={searchValue}
            allImportedCtrcs={allImportedCtrcs}
            criticClients={clients}
          />
        );
      case 'importacao':
        return <ImportacaoView onAddCtrcs={handleAddCtrcs} adminUser={adminProfile} />;
      case 'ctrcs_ssw':
        return <CtrcSswView onRefreshCtrcs={rehydrateCtrcsOnly} />;
      case 'frota':
        return (
          <FrotaView
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onRemoveVehicle={handleRemoveVehicle}
            drivers={drivers}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onRemoveDriver={handleRemoveDriver}
            searchValue={searchValue}
            isMaster={isSessionUnlocked}
            vehicleRegistries={vehicleRegistries}
            onAddVehicleRegistry={handleAddVehicleRegistry}
            onUpdateVehicleRegistry={handleUpdateVehicleRegistry}
            onRemoveVehicleRegistry={handleRemoveVehicleRegistry}
            grRules={grRules}
          />
        );
      case 'roteirizacao':
        return (
          <RoteirizacaoView
            availableCtrcs={availableCtrcs}
            vehicles={vehicles}
            onAssignCtre={handleAssignCtre}
            onConsolidateRomaneio={handleConsolidateRomaneio}
            adminUser={adminProfile}
            curvaAClients={curvaAClients}
            criticClients={clients}
            onGeneratePreRomaneioSuccess={handleGeneratePreRomaneioSuccess}
            linkedCtrcs={linkedCtrcs}
            onRefreshCtrcs={rehydrateCtrcsOnly}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            occurrences={occurrences}
          />
        );
      case 'finalizacao':
        return (
          <FinalizacaoView
            linkedCtrcs={linkedCtrcs}
            onUpdateCtrcStatus={handleUpdateCtrcStatus}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onRemoveExpense={handleRemoveExpense}
            onCloseRomaneio={handleCloseRomaneio}
            activeVehicle={vehicles.find((v) => v.id === activeRomaneioVehicleId)}
            savedRomaneios={savedRomaneios}
            onSaveRomaneio={handleSaveRomaneio}
            onDeleteRomaneio={handleDeleteRomaneio}
            adminUser={adminProfile}
            onRefreshCtrcs={rehydrateCtrcsOnly}
            vehicleRegistries={vehicleRegistries}
            onAddVehicleRegistry={handleAddVehicleRegistry}
            grRules={grRules}
          />
        );
      case 'desempenho':
        return <DesempenhoView drivers={drivers} searchValue={searchValue} />;
      case 'solucao':
        return (
          <SolucaoView
            tickets={tickets}
            onResolveTicket={handleResolveTicket}
            searchValue={searchValue}
          />
        );
      case 'clientes':
        return (
          <ClientesView
            clients={clients}
            onAddAuditNote={handleAddAuditNote}
            searchValue={searchValue}
          />
        );
      case 'ocorrencias':
        return (
          <OcorrenciasView
            occurrences={occurrences}
            onAddOccurrence={handleAddOccurrence}
            onUpdateOccurrence={handleUpdateOccurrence}
            onRemoveOccurrence={handleRemoveOccurrence}
            onBulkImportOccurrences={handleBulkImportOccurrences}
            onClearAllOccurrences={handleClearAllOccurrences}
            isSyncing={isSyncing}
            isMaster={isSessionUnlocked}
          />
        );
      case 'curva_a':
        return (
          <CurvaAView
            clients={curvaAClients}
            onAddClient={handleAddCurvaA}
            onUpdateClient={handleUpdateCurvaA}
            onRemoveClient={handleRemoveCurvaA}
            onBulkImportClients={handleBulkImportCurvaA}
            isSyncing={isSyncing}
            isMaster={isSessionUnlocked}
          />
        );
      case 'cidades_rotas':
        return (
          <CidadesRotasView isMaster={isSessionUnlocked} />
        );
      case 'regras_gr':
        return (
          <RegrasGrView
            adminUser={adminProfile ? { ...adminProfile, is_master: isSessionUnlocked } : null}
            rules={grRules}
            onUpdateRule={handleUpdateGrRule}
            isSyncing={isSyncing}
          />
        );
      case 'auditoria':
        return (
          <AuditoriaView
            adminUser={adminProfile ? { ...adminProfile, is_master: isSessionUnlocked } : null}
            logs={auditLogs}
            onRefreshLogs={handleRefreshLogs}
            isSyncing={isSyncing}
          />
        );
      case 'base_dados':
        return (
          <BaseDadosView
            adminUser={{ ...adminProfile, is_master: isSessionUnlocked }}
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onRemoveVehicle={handleRemoveVehicle}
            drivers={drivers}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onRemoveDriver={handleRemoveDriver}
            occurrences={occurrences}
            onAddOccurrence={handleAddOccurrence}
            onUpdateOccurrence={handleUpdateOccurrence}
            onRemoveOccurrence={handleRemoveOccurrence}
            onBulkImportOccurrences={handleBulkImportOccurrences}
            onClearAllOccurrences={handleClearAllOccurrences}
            curvaAClients={curvaAClients}
            onAddCurvaA={handleAddCurvaA}
            onUpdateCurvaA={handleUpdateCurvaA}
            onRemoveCurvaA={handleRemoveCurvaA}
            onBulkImportCurvaA={handleBulkImportCurvaA}
            criticClients={clients}
            onAddAuditNote={(clientId, note) => handleAddAuditNote(clientId, note, adminProfile.name)}
            searchValue={searchValue}
            vehicleRegistries={vehicleRegistries}
            onAddVehicleRegistry={handleAddVehicleRegistry}
            onUpdateVehicleRegistry={handleUpdateVehicleRegistry}
            onRemoveVehicleRegistry={handleRemoveVehicleRegistry}
            onRefreshCtrcs={rehydrateCtrcsOnly}
          />
        );
      case 'configuracoes':
        return (
          <ConfiguracoesView
            onResetOP01={handleResetOP01}
            onResetOP02={handleResetOP02}
            onResetOP03={handleResetOP03}
            adminUser={{ ...adminProfile, is_master: isSessionUnlocked }}
            onUpdateAdminUser={(user) => setAdminProfile(user)}
            vehicles={vehicles}
            drivers={drivers}
            availableCtrcs={availableCtrcs}
            tickets={tickets}
            clients={clients}
            occurrences={occurrences}
            curvaAClients={curvaAClients}
            onSyncFromSupabase={(data) => {
              if (data.vehicles) setVehicles(data.vehicles);
              if (data.drivers) setDrivers(data.drivers);
              if (data.ctrcs) setAvailableCtrcs(data.ctrcs);
              if (data.tickets) setTickets(data.tickets);
              if (data.clients) setClients(data.clients);
              if (data.occurrences) setOccurrences(data.occurrences);
              if (data.curvaAClients) setCurvaAClients(data.curvaAClients);
            }}
            onRefreshAllLocalData={handleRefreshAllLocalData}
          />
        );
      default:
        return (
          <DashboardView
            onNavigateToView={handleNavigateFromDash}
            searchValue={searchValue}
            allImportedCtrcs={allImportedCtrcs}
          />
        );
    }
  };

  if (currentView === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`router-app font-sans antialiased ${currentView === 'roteirizacao' ? 'pt-0' : 'pt-16'} md:pl-[72px] transition-all duration-300`}>
      {/* Collapsible overlay sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        adminName={adminProfile.name}
        adminRole={adminProfile.role}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isSessionUnlocked={isSessionUnlocked}
      />

      {/* Global page top-header */}
      {currentView !== 'roteirizacao' && (
        <Header
          currentView={currentView}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          notificationCount={pendingTicketsCount}
          onClearNotifications={handleClearNotifications}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Main Content viewport container */}
      <main className={currentView === 'roteirizacao' ? 'p-1 w-full max-w-none' : 'p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]'}>
        {renderActiveView()}
      </main>

      {/* Master Unlock Modal Overlay */}
      {showMasterUnlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant max-w-sm w-full rounded-2xl p-6 md:p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-500" />
            
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[24px] select-none">lock</span>
            </div>

            <h3 className="text-lg font-bold text-on-surface mb-1 tracking-tight">
              Acesso Restrito Mestre
            </h3>
            
            <p className="text-xs text-[var(--router-text-soft)] mb-5 leading-normal">
              Insira a senha de usuário master para habilitar os recursos administrativos.
            </p>

            <form onSubmit={handleSidebarUnlockSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Senha Mestre"
                  value={unlockPasswordInput}
                  onChange={(e) => {
                    setUnlockPasswordInput(e.target.value);
                    setUnlockError('');
                  }}
                  className="w-full bg-[var(--router-input-bg)] border border-[var(--router-input-border)] text-on-surface text-center rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--router-primary)] focus:ring-1 focus:ring-[var(--router-primary)]/30 font-sans tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  autoFocus
                />
                {unlockError && (
                  <p className="text-[11px] text-[var(--router-danger)] font-semibold mt-1.5">
                    ⚠️ {unlockError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterUnlockModal(false);
                    setPendingTargetView(null);
                    setUnlockPasswordInput('');
                    setUnlockError('');
                  }}
                  className="w-1/2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-on-surface-variant font-medium py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
