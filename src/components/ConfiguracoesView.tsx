import { useState, FormEvent, useEffect } from "react";
import {
  Vehicle,
  DriverScore,
  Ctrc,
  Ticket,
  CriticClient,
  AppUser,
  DeliveryOccurrence,
  CurvaAClient,
  OperationalUnit,
  RoutePlanningItem,
  PreRomaneio,
} from "../types";
import { db, RomaneioSave } from "../infrastructure/localdb/db";
import { SyncQueueRepository } from "../infrastructure/localdb/repositories/syncQueueRepository";
import { CtrcRepository } from "../infrastructure/localdb/repositories/ctrcRepository";
import { RoutePlanningRepository } from "../infrastructure/localdb/repositories/routePlanningRepository";
import { PreRomaneioRepository } from "../infrastructure/localdb/repositories/preRomaneioRepository";
import { TripRepository } from "../infrastructure/localdb/repositories/tripRepository";
import {
  DEFAULT_OPERATIONAL_UNIT,
  OPERATIONAL_UNITS,
  getOperationalUnits,
  saveOperationalUnits,
} from "../constants/operationalUnits";
import {
  isSupabaseConfigured,
  testSupabaseConnection,
  exportStateToSupabase,
  importStateFromSupabase,
  SUPABASE_SQL_SCHEMA,
  getSavedCredentials,
  updateActiveSupabaseClient,
  getAppUsers,
  saveAppUser,
  deleteAppUser,
  exportOperationalStateToSupabase,
  importOperationalStateFromSupabase,
  syncOperationalStateWithSupabase,
  mergeGeneric,
} from "../supabase";
import { SystemLogsPanel } from "./configuracoes/SystemLogsPanel";
import { IS_DEMO_MODE } from "../constants/runtimeMode";
import {
  initialVehicles,
  initialDrivers,
  initialAvailableCtrcs,
  initialLinkedCtrcs,
  initialTickets,
  initialCriticalClients,
} from "../data";

interface ConfiguracoesViewProps {
  onResetOP01: () => void;
  onResetOP02: () => void;
  onResetOP03: () => void;
  adminUser: AppUser;
  onUpdateAdminUser: (user: AppUser) => void;
  vehicles: Vehicle[];
  drivers: DriverScore[];
  availableCtrcs: Ctrc[];
  tickets: Ticket[];
  clients: CriticClient[];
  occurrences: DeliveryOccurrence[];
  curvaAClients: CurvaAClient[];
  onSyncFromSupabase: (data: {
    vehicles?: Vehicle[];
    drivers?: DriverScore[];
    ctrcs?: Ctrc[];
    tickets?: Ticket[];
    clients?: CriticClient[];
    occurrences?: DeliveryOccurrence[];
    curvaAClients?: CurvaAClient[];
  }) => void;
  onRefreshAllLocalData?: () => void;
}

export default function ConfiguracoesView({
  onResetOP01,
  onResetOP02,
  onResetOP03,
  adminUser,
  onUpdateAdminUser,
  vehicles,
  drivers,
  availableCtrcs,
  tickets,
  clients,
  occurrences,
  curvaAClients,
  onSyncFromSupabase,
  onRefreshAllLocalData,
}: ConfiguracoesViewProps) {
  // --- States for Theme Engine ---
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("router_theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">(
    () => {
      const saved = localStorage.getItem("router_density");
      return saved === "compact" ||
        saved === "normal" ||
        saved === "comfortable"
        ? saved
        : "normal";
    },
  );
  const [contrast, setContrast] = useState<"standard" | "high">(() => {
    const saved = localStorage.getItem("router_contrast");
    return saved === "standard" || saved === "high" ? saved : "standard";
  });

  const handleUpdateTheme = (newTheme: "light" | "dark") => {
    setCurrentTheme(newTheme);
    localStorage.setItem("router_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    window.dispatchEvent(new Event("router-theme-change"));
  };

  const handleUpdateDensity = (
    newDensity: "compact" | "normal" | "comfortable",
  ) => {
    setDensity(newDensity);
    localStorage.setItem("router_density", newDensity);
    document.documentElement.setAttribute("data-density", newDensity);
    document.documentElement.classList.toggle(
      "density-compact",
      newDensity === "compact",
    );
    document.documentElement.classList.toggle(
      "density-comfortable",
      newDensity === "comfortable",
    );
  };

  const handleUpdateContrast = (newContrast: "standard" | "high") => {
    setContrast(newContrast);
    localStorage.setItem("router_contrast", newContrast);
    document.documentElement.setAttribute("data-contrast", newContrast);
    document.documentElement.classList.toggle(
      "contrast-high",
      newContrast === "high",
    );
  };

  // --- States for Sincronização Operacional V1 ---
  const [isOperationalSyncing, setIsOperationalSyncing] = useState(false);
  const [operationalSyncMessage, setOperationalSyncMessage] = useState<
    string | null
  >(null);
  const [operationalSyncStatus, setOperationalSyncStatus] = useState<
    "success" | "error" | null
  >(null);
  const [operationalSyncDetails, setOperationalSyncDetails] = useState<
    string[]
  >([]);
  const [lastOperationalSyncTime, setLastOperationalSyncTime] = useState<
    string | null
  >(() => {
    return localStorage.getItem("last_operational_sync_time");
  });

  const [queueSummary, setQueueSummary] = useState<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } | null>(null);

  useEffect(() => {
    SyncQueueRepository.getSummary().then(setQueueSummary).catch(console.warn);
  }, []);

  const handleExportOperationalState = async () => {
    setIsOperationalSyncing(true);
    setOperationalSyncMessage(null);
    setOperationalSyncStatus(null);
    setOperationalSyncDetails([]);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase não está configurado. Por favor, especifique a URL e a Anon Key abaixo.",
        );
      }

      const ctrcs = await CtrcRepository.getAll();
      const routePlanningItems = await RoutePlanningRepository.getAll();
      const preRomaneios = await PreRomaneioRepository.getAll();
      const savedRomaneios = await TripRepository.getAll();

      const res = await exportOperationalStateToSupabase({
        ctrcs,
        routePlanningItems,
        preRomaneios,
        savedRomaneios,
      });

      setOperationalSyncDetails(res.results);
      if (res.success) {
        setOperationalSyncMessage(
          "Dados operacionais exportados com sucesso para a nuvem!",
        );
        setOperationalSyncStatus("success");
      } else {
        setOperationalSyncMessage(
          "Erro parcial ao exportar alguns dados operacionais.",
        );
        setOperationalSyncStatus("error");
      }
    } catch (err: any) {
      setOperationalSyncMessage(
        err.message || "Erro ao sincronizar dados operacionais.",
      );
      setOperationalSyncStatus("error");
    } finally {
      setIsOperationalSyncing(false);
    }
  };

  const handleImportOperationalState = async () => {
    setIsOperationalSyncing(true);
    setOperationalSyncMessage(null);
    setOperationalSyncStatus(null);
    setOperationalSyncDetails([]);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase não está configurado. Por favor, especifique a URL e a Anon Key abaixo.",
        );
      }

      const res = await importOperationalStateFromSupabase();
      if (!res.success || !res.data) {
        throw new Error(res.message || "Falha ao importar dados remotos.");
      }

      const remote = res.data;

      const localCtrcs = await CtrcRepository.getAll();
      const localPlanning = await RoutePlanningRepository.getAll();
      const localPre = await PreRomaneioRepository.getAll();
      const localSaved = await TripRepository.getAll();

      const mergedCtrcs = mergeGeneric(
        localCtrcs,
        remote.ctrcs,
        (c) => c.id,
        (c) => (c as any).updatedAt || (c as any).updated_at,
        "ctrc",
      );
      const mergedPlanning = mergeGeneric(
        localPlanning,
        remote.routePlanningItems,
        (p) => p.id,
        (p) => p.updatedAt,
        "planning",
      );
      const mergedPre = mergeGeneric(
        localPre,
        remote.preRomaneios,
        (p) => p.id,
        (p) => p.updatedAt,
        "pre",
      );
      const mergedSaved = mergeGeneric(
        localSaved,
        remote.savedRomaneios,
        (s) => s.id,
        (s) => (s as any).updatedAt || (s as any).updated_at,
        "saved",
      );

      if (mergedCtrcs.length > 0) await CtrcRepository.putMany(mergedCtrcs);
      if (mergedPlanning.length > 0)
        await RoutePlanningRepository.putMany(mergedPlanning);
      if (mergedPre.length > 0) await PreRomaneioRepository.putMany(mergedPre);
      if (mergedSaved.length > 0) await TripRepository.bulkPut(mergedSaved);

      if (onRefreshAllLocalData) {
        await onRefreshAllLocalData();
      }

      setOperationalSyncMessage(
        "Dados operacionais baixados e mesclados com sucesso da nuvem!",
      );
      setOperationalSyncStatus("success");
      setOperationalSyncDetails([
        `✓ ${mergedCtrcs.length} CTRCs resolvidos.`,
        `✓ ${mergedPlanning.length} itens de planejamento resolvidos.`,
        `✓ ${mergedPre.length} pré-romaneios resolvidos.`,
        `✓ ${mergedSaved.length} romaneios salvos resolvidos.`,
      ]);

      const nowStr = new Date().toLocaleString("pt-BR");
      setLastOperationalSyncTime(nowStr);
      localStorage.setItem("last_operational_sync_time", nowStr);
    } catch (err: any) {
      setOperationalSyncMessage(
        err.message || "Erro ao importar dados operacionais.",
      );
      setOperationalSyncStatus("error");
    } finally {
      setIsOperationalSyncing(false);
    }
  };

  const handleSyncOperationalState = async () => {
    setIsOperationalSyncing(true);
    setOperationalSyncMessage(null);
    setOperationalSyncStatus(null);
    setOperationalSyncDetails([]);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase não está configurado. Por favor, especifique a URL e a Anon Key abaixo.",
        );
      }

      const localCtrcs = await CtrcRepository.getAll();
      const localPlanning = await RoutePlanningRepository.getAll();
      const localPre = await PreRomaneioRepository.getAll();
      const localSaved = await TripRepository.getAll();

      const mergeRes = await syncOperationalStateWithSupabase({
        ctrcs: localCtrcs,
        routePlanningItems: localPlanning,
        preRomaneios: localPre,
        savedRomaneios: localSaved,
      });

      if (!mergeRes.success || !mergeRes.mergedData) {
        throw new Error(
          mergeRes.message || "Falha ao sincronizar e mesclar os dados.",
        );
      }

      const merged = mergeRes.mergedData;

      if (merged.ctrcs.length > 0) await CtrcRepository.putMany(merged.ctrcs);
      if (merged.routePlanningItems.length > 0)
        await RoutePlanningRepository.putMany(merged.routePlanningItems);
      if (merged.preRomaneios.length > 0)
        await PreRomaneioRepository.putMany(merged.preRomaneios);
      if (merged.savedRomaneios.length > 0)
        await TripRepository.bulkPut(merged.savedRomaneios);

      const exportRes = await exportOperationalStateToSupabase(merged);

      if (onRefreshAllLocalData) {
        await onRefreshAllLocalData();
      }

      setOperationalSyncDetails([...mergeRes.results, ...exportRes.results]);

      if (exportRes.success) {
        setOperationalSyncMessage(
          "Sincronização bidirecional e mesclagem concluída com sucesso!",
        );
        setOperationalSyncStatus("success");
      } else {
        setOperationalSyncMessage(
          "A mesclagem local foi feita, mas falhou ao reenviar o estado fundido para o Supabase.",
        );
        setOperationalSyncStatus("error");
      }

      const nowStr = new Date().toLocaleString("pt-BR");
      setLastOperationalSyncTime(nowStr);
      localStorage.setItem("last_operational_sync_time", nowStr);
    } catch (err: any) {
      setOperationalSyncMessage(
        err.message || "Erro inesperado durante a sincronização bidirecional.",
      );
      setOperationalSyncStatus("error");
    } finally {
      setIsOperationalSyncing(false);
    }
  };

  // Clean Demo Data States
  const [demoCleaningInput, setDemoCleaningInput] = useState("");
  const [demoCleaningMessage, setDemoCleaningMessage] = useState<string | null>(
    null,
  );
  const [demoCleaningStatus, setDemoCleaningStatus] = useState<
    "success" | "error" | null
  >(null);
  const [isCleaningDemo, setIsCleaningDemo] = useState(false);

  const handleClearDemoData = async () => {
    if (demoCleaningInput !== "LIMPAR DEMO") {
      setDemoCleaningStatus("error");
      setDemoCleaningMessage(
        'Confirmação inválida! Digite exatamente "LIMPAR DEMO" para prosseguir.',
      );
      return;
    }

    setIsCleaningDemo(true);
    setDemoCleaningMessage(null);
    setDemoCleaningStatus(null);

    try {
      // 1. Compile mock lists
      const mockVehicleIds = new Set(initialVehicles.map((v) => v.id));
      const mockDriverIds = new Set(initialDrivers.map((d) => d.id));
      const mockCtrcIds = new Set([
        ...initialAvailableCtrcs.map((c) => c.id),
        ...initialLinkedCtrcs.map((c) => c.id),
      ]);
      const mockTicketIds = new Set(initialTickets.map((t) => t.id));
      const mockClientIds = new Set(initialCriticalClients.map((c) => c.id));

      // 2. Check if there are actually any mock/demo items to clean up
      const anyVehicleDemo =
        vehicles.some((v) => mockVehicleIds.has(v.id)) ||
        (await db.vehicles
          .where("id")
          .anyOf([...mockVehicleIds])
          .count()) > 0;
      const anyDriverDemo =
        drivers.some((d) => mockDriverIds.has(d.id)) ||
        (await db.drivers
          .where("id")
          .anyOf([...mockDriverIds])
          .count()) > 0;
      const anyCtrcDemo =
        availableCtrcs.some((c) => mockCtrcIds.has(c.id)) ||
        (await db.ctrcs
          .where("id")
          .anyOf([...mockCtrcIds])
          .count()) > 0;
      const anyRomaneioDemo =
        (await db.savedRomaneios.get("2981")) !== undefined;

      if (
        !anyVehicleDemo &&
        !anyDriverDemo &&
        !anyCtrcDemo &&
        !anyRomaneioDemo
      ) {
        setDemoCleaningStatus("error");
        setDemoCleaningMessage(
          "Não foi possível identificar dados de demonstração com segurança ou eles já foram limpos.",
        );
        setIsCleaningDemo(false);
        return;
      }

      // 3. Purge from IndexedDB
      await db.transaction(
        "rw",
        [db.vehicles, db.drivers, db.ctrcs, db.savedRomaneios],
        async () => {
          // Vehicles
          for (const vId of mockVehicleIds) {
            await db.vehicles.delete(vId);
          }
          // Drivers
          for (const dId of mockDriverIds) {
            await db.drivers.delete(dId);
          }
          // CTRCs
          for (const cId of mockCtrcIds) {
            await db.ctrcs.delete(cId);
          }
          // Romaneio 2981
          await db.savedRomaneios.delete("2981");
        },
      );

      // 4. Remove fake legacy localStorage saved_romaneios
      localStorage.removeItem("saved_romaneios");

      // 5. Filter state variables & propagate changes up
      onSyncFromSupabase({
        vehicles: vehicles.filter((v) => !mockVehicleIds.has(v.id)),
        drivers: drivers.filter((d) => !mockDriverIds.has(d.id)),
        ctrcs: availableCtrcs.filter((c) => !mockCtrcIds.has(c.id)),
        tickets: tickets.filter((t) => !mockTicketIds.has(t.id)),
        clients: clients.filter((c) => !mockClientIds.has(c.id)),
      });

      setDemoCleaningStatus("success");
      setDemoCleaningMessage(
        "Massa de teste/dados de demonstração removidos com sucesso do IndexedDB e do estado de sessão!",
      );
      setDemoCleaningInput("");
      await loadDbStats();
    } catch (err: any) {
      console.error("[Purge] Erro ao limpar dados de demonstração:", err);
      setDemoCleaningStatus("error");
      setDemoCleaningMessage(`Falha ao remover dados: ${err.message || err}`);
    } finally {
      setIsCleaningDemo(false);
    }
  };

  // IndexedDB Table statistics states
  const [dbStats, setDbStats] = useState({
    ctrcs: 0,
    vehicles: 0,
    drivers: 0,
    romaneios: 0,
    occurrences: 0,
    syncQueue: 0,
    pendingSyncs: 0,
  });
  const [syncQueueItems, setSyncQueueItems] = useState<any[]>([]);

  const loadDbStats = async () => {
    try {
      await SyncQueueRepository.cleanupOldItems();

      const ctrcsCount = await db.ctrcs.count();
      const vehiclesCount = await db.vehicles.count();
      const driversCount = await db.drivers.count();
      const romaneiosCount = await db.savedRomaneios.count();
      const occurrencesCount = await db.occurrences.count();
      const syncQueueCount = await db.sync_queue.count();
      const pendingSyncsArray = await SyncQueueRepository.getPending();
      const allSyncItems = await SyncQueueRepository.getAll();
      const summary = await SyncQueueRepository.getSummary();

      setDbStats({
        ctrcs: ctrcsCount,
        vehicles: vehiclesCount,
        drivers: driversCount,
        romaneios: romaneiosCount,
        occurrences: occurrencesCount,
        syncQueue: syncQueueCount,
        pendingSyncs: pendingSyncsArray.length,
      });
      setQueueSummary(summary);
      setSyncQueueItems(allSyncItems.slice(-5).reverse());
    } catch (e) {
      console.error("[Config] Falha ao carregar estatísticas do IndexedDB:", e);
    }
  };

  const handleClearSyncQueue = async () => {
    try {
      await SyncQueueRepository.clearCompleted();
      await loadDbStats();
      setSupabaseStatus(
        "✓ Fila de sincronização concluída purgada do IndexedDB com sucesso!",
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDbStats();
  }, [vehicles, drivers, occurrences]);

  const [tempName, setTempName] = useState(adminUser.name);
  const [tempRole, setTempRole] = useState(adminUser.role);
  const [tempUnid, setTempUnid] = useState(
    adminUser.unid ||
      (adminUser.is_master ? "TODAS" : DEFAULT_OPERATIONAL_UNIT),
  );
  const [message, setMessage] = useState<string | null>(null);

  // Users Database management states
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userFormUsername, setUserFormUsername] = useState("");
  const [userFormPassword, setUserFormPassword] = useState("");
  const [userFormName, setUserFormName] = useState("");
  const [userFormRole, setUserFormRole] = useState("Operador de Despacho");
  const [userFormIsMaster, setUserFormIsMaster] = useState(false);
  const [userFormUnid, setUserFormUnid] = useState(DEFAULT_OPERATIONAL_UNIT);

  // Supabase Custom Form States for Database Setup
  const [customUrl, setCustomUrl] = useState(() => {
    const creds = getSavedCredentials();
    return creds.url;
  });
  const [customKey, setCustomKey] = useState(() => {
    const creds = getSavedCredentials();
    return creds.key;
  });
  const [activeSource, setActiveSource] = useState(() => {
    const creds = getSavedCredentials();
    return creds.source;
  });

  // Supabase Integration States
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

  // Operational units states & handlers
  const [opUnits, setOpUnits] = useState<OperationalUnit[]>(() =>
    getOperationalUnits(),
  );
  const [newOpCode, setNewOpCode] = useState("");
  const [newOpName, setNewOpName] = useState("");
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);
  const [editingOpCode, setEditingOpCode] = useState<string | null>(null);
  const [editingOpName, setEditingOpName] = useState("");

  const handleAddOpUnit = (e: FormEvent) => {
    e.preventDefault();
    setOpError(null);
    setOpSuccess(null);

    const code = newOpCode.trim().toUpperCase();
    const name = newOpName.trim();

    if (!code || !name) {
      setOpError("Código e nome são obrigatórios.");
      return;
    }

    if (code.length < 2 || code.length > 5) {
      setOpError("O código deve ter entre 2 e 5 caracteres.");
      return;
    }

    // Check if duplicate code
    if (opUnits.some((u) => u.code === code)) {
      setOpError(`A unidade com código '${code}' já existe.`);
      return;
    }

    const newUnit: OperationalUnit = {
      code,
      name: `${code} - ${name}`,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [...opUnits, newUnit];
    setOpUnits(updated);
    saveOperationalUnits(updated);
    setNewOpCode("");
    setNewOpName("");
    setOpSuccess(`Unidade '${code}' adicionada com sucesso.`);
  };

  const handleToggleOpUnit = (code: string) => {
    setOpError(null);
    setOpSuccess(null);

    const target = opUnits.find((u) => u.code === code);
    if (target && target.active) {
      const activeUnitsCount = opUnits.filter((u) => u.active).length;
      if (code === DEFAULT_OPERATIONAL_UNIT && activeUnitsCount <= 1) {
        setOpError(
          "Não é permitido desativar a unidade padrão 'VGA' quando ela é a única ativa.",
        );
        return;
      }
    }

    const updated = opUnits.map((u) => {
      if (u.code === code) {
        return { ...u, active: !u.active, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    setOpUnits(updated);
    saveOperationalUnits(updated);
  };

  const handleUpdateOpName = (code: string, newName: string) => {
    setOpError(null);
    setOpSuccess(null);

    if (!newName.trim()) {
      setOpError("O nome não pode ser vazio.");
      return;
    }

    let finalName = newName.trim();
    if (!finalName.startsWith(code)) {
      finalName = `${code} - ${finalName}`;
    }

    const updated = opUnits.map((u) => {
      if (u.code === code) {
        return { ...u, name: finalName, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    setOpUnits(updated);
    saveOperationalUnits(updated);
    setOpSuccess("Nome da unidade atualizado com sucesso.");
  };

  const handleDeleteOpUnit = (code: string) => {
    setOpError(null);
    setOpSuccess(null);

    if (code === DEFAULT_OPERATIONAL_UNIT) {
      setOpError("A unidade padrão 'VGA' não pode ser excluída.");
      return;
    }

    const updated = opUnits.filter((u) => u.code !== code);
    setOpUnits(updated);
    saveOperationalUnits(updated);
    setOpSuccess(`Unidade '${code}' excluída com sucesso.`);
  };

  // Custom modal states to avoid Chrome/Safari security sandbox blocks inside iframe
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    title: string;
    description: string;
  } | null>(null);

  // Load registered system users
  const handleLoadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const users = await getAppUsers();
      setAppUsers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    handleLoadUsers();
    // Synced profile update in case props changed
    setTempName(adminUser.name);
    setTempRole(adminUser.role);
    setTempUnid(
      adminUser.unid ||
        (adminUser.is_master ? "TODAS" : DEFAULT_OPERATIONAL_UNIT),
    );
  }, [adminUser]);

  const handleCreateOrUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUser.is_master) {
      setAlertModal({
        title: "Operação Bloqueada",
        description:
          "Somente usuários MASTER podem criar ou editar usuários operacionais.",
      });
      return;
    }

    const usernameRaw = userFormUsername.trim().toLowerCase();
    const nameRaw = userFormName.trim();

    if (!usernameRaw || !nameRaw) {
      setAlertModal({
        title: "Campos Requeridos",
        description:
          "Insira um nome completo e e-mail/username válidos para o novo operador.",
      });
      return;
    }

    const payload: AppUser = {
      username: usernameRaw,
      password: userFormPassword.trim() || "123",
      name: nameRaw,
      role: userFormRole,
      is_master: userFormIsMaster,
      unid: userFormUnid,
    };

    const res = await saveAppUser(payload);
    setMessage(res.message);
    setTimeout(() => setMessage(null), 3500);

    // Clear user fields
    setUserFormUsername("");
    setUserFormPassword("");
    setUserFormName("");
    setUserFormIsMaster(false);
    setUserFormUnid(DEFAULT_OPERATIONAL_UNIT);

    handleLoadUsers();
  };

  const handleDeleteUserClick = async (usernameToDelete: string) => {
    if (!adminUser.is_master) {
      setAlertModal({
        title: "Permissão Negada",
        description:
          "Apenas administradores MASTER de logística podem remover operadores de despacho.",
      });
      return;
    }
    if (usernameToDelete.toLowerCase() === adminUser.username.toLowerCase()) {
      setAlertModal({
        title: "Ação Não Permitida",
        description:
          "Você está logado nesta conta master atualmente e não pode excluir a si mesmo!",
      });
      return;
    }

    setConfirmModal({
      title: "Excluir Usuário Operacional",
      description: `Tem certeza que deseja remover permanentemente o usuário operacional '${usernameToDelete}' do sistema e do banco de dados sincronizado?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const res = await deleteAppUser(usernameToDelete);
        setMessage(res.message);
        setTimeout(() => setMessage(null), 3000);
        handleLoadUsers();
      },
    });
  };

  const handleSaveActiveCredentials = () => {
    if (!adminUser.is_master) {
      setAlertModal({
        title: "Acesso de Configurações Bloqueado",
        description:
          "Apenas administradores MASTER podem alterar as chaves de API Supabase do RotaOperational.",
      });
      return;
    }
    const res = updateActiveSupabaseClient(customUrl, customKey);
    if (res.success) {
      setActiveSource(res.source);
      setCustomUrl(res.url);
      setCustomKey(res.key);
      setMessage("Credenciais ativas atualizadas com sucesso!");
      setTimeout(() => setMessage(null), 3000);
      handleLoadUsers();
    }
  };

  const handleClearActiveCredentials = () => {
    if (!adminUser.is_master) {
      setAlertModal({
        title: "Acesso de Configurações Bloqueado",
        description:
          "Apenas administradores MASTER podem alterar as chaves de API Supabase do RotaOperational.",
      });
      return;
    }
    const res = updateActiveSupabaseClient("", "");
    setActiveSource(res.source);
    setCustomUrl(res.url);
    setCustomKey(res.key);
    setMessage("Configurações personalizadas limpas. Voltando aos padrões.");
    setTimeout(() => setMessage(null), 3000);
    handleLoadUsers();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setSupabaseStatus(null);
    try {
      const res = await testSupabaseConnection();
      setSupabaseStatus(res.message);
    } catch (err: any) {
      setSupabaseStatus(`Falha de conexão: ${err?.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportToSupabase = async () => {
    const trimmedUrl = customUrl.trim();
    const trimmedKey = customKey.trim();
    if (!trimmedUrl || !trimmedKey) {
      setAlertModal({
        title: "Chaves Supabase Não Configuradas",
        description:
          "Por favor, configure sua URL e Chave Anon do Supabase no formulário acima primeiro.",
      });
      return;
    }

    // Automatically apply/save if credentials in inputs are different from currently active client
    const activeCreds = getSavedCredentials();
    if (activeCreds.url !== trimmedUrl || activeCreds.key !== trimmedKey) {
      const saveRes = updateActiveSupabaseClient(trimmedUrl, trimmedKey);
      if (saveRes.success) {
        setActiveSource(saveRes.source);
        setCustomUrl(saveRes.url);
        setCustomKey(saveRes.key);
      }
    }

    setConfirmModal({
      title: "Confirmar Exportação de Carga Semente",
      description:
        "Isso exportará todos os dados locais atuais (veículos, motoristas, CTRCs, chamados, clientes críticos, ocorrências, curva A e usuários operacionais) para as tabelas do seu banco de dados Supabase na nuvem. Os registros lá serão sobrepostos ou atualizados. Continuar?",
      onConfirm: async () => {
        setConfirmModal(null);
        setIsExporting(true);
        setSyncLogs(["Iniciando exportação..."]);
        try {
          const res = await exportStateToSupabase({
            vehicles,
            drivers,
            ctrcs: availableCtrcs,
            tickets,
            clients,
            users: appUsers,
            occurrences,
            curvaAClients,
          });
          setSyncLogs(res.results);
          if (res.success) {
            setMessage(
              "Carga de semente operacional exportada para o Supabase com sucesso!",
            );
          } else {
            setMessage(
              "Exportação concluída com alguns alertas. Verifique o log do console.",
            );
          }
        } catch (err: any) {
          setSyncLogs((prev) => [
            ...prev,
            `❌ Falha crítica: ${err?.message || err}`,
          ]);
        } finally {
          setIsExporting(false);
        }
      },
    });
  };

  const handleImportFromSupabase = async () => {
    const trimmedUrl = customUrl.trim();
    const trimmedKey = customKey.trim();
    if (!trimmedUrl || !trimmedKey) {
      setAlertModal({
        title: "Chaves Supabase Não Configuradas",
        description:
          "Por favor, configure sua URL e Chave Anon do Supabase no formulário acima primeiro para poder importar dados.",
      });
      return;
    }

    // Automatically apply/save if credentials in inputs are different from currently active client
    const activeCreds = getSavedCredentials();
    if (activeCreds.url !== trimmedUrl || activeCreds.key !== trimmedKey) {
      const saveRes = updateActiveSupabaseClient(trimmedUrl, trimmedKey);
      if (saveRes.success) {
        setActiveSource(saveRes.source);
        setCustomUrl(saveRes.url);
        setCustomKey(saveRes.key);
      }
    }

    setConfirmModal({
      title: "Confirmar Importação de Banco de Dados",
      description:
        "Isso atualizará todas as tabelas em seu painel local baixando as informações de produção armazenadas no seu Supabase. Os dados locais não salvos que divergirem serão sobrepostos. Deseja prosseguir?",
      onConfirm: async () => {
        setConfirmModal(null);
        setIsImporting(true);
        setSyncLogs(["Buscando registros do Supabase..."]);
        try {
          const res = await importStateFromSupabase();
          if (res.success && res.data) {
            onSyncFromSupabase(res.data);
            setSyncLogs([
              "✓ Conexão estabelecida com sucesso.",
              `✓ ${res.data.vehicles.length} Veículos recuperados.`,
              `✓ ${res.data.drivers.length} Desempenhos de motorista sincronizados.`,
              `✓ ${res.data.ctrcs.length} Documentos operacionais CTRC carregados.`,
              `✓ ${res.data.tickets.length} Chamados obtidos.`,
              `✓ ${res.data.clients.length} Clientes críticos sincronizados.`,
              `✓ ${res.data.occurrences?.length || 0} Dicionários de Ocorrência carregados.`,
              `✓ ${res.data.curvaAClients?.length || 0} Clientes Curva A restabelecidos.`,
            ]);
            setMessage(res.message);
          } else {
            setSyncLogs((prev) => [...prev, `❌ Falha: ${res.message}`]);
            setAlertModal({
              title: "Falha na Sincronização",
              description: res.message,
            });
          }
        } catch (err: any) {
          setSyncLogs((prev) => [
            ...prev,
            `❌ Falha crítica: ${err?.message || err}`,
          ]);
        } finally {
          setIsImporting(false);
        }
      },
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    const updated: AppUser = {
      ...adminUser,
      name: tempName,
      role: tempRole,
      unid: tempUnid,
    };
    await saveAppUser(updated);
    onUpdateAdminUser(updated);
    setMessage("Perfil de operador atualizado com sucesso!");
    setTimeout(() => setMessage(null), 3000);
    handleLoadUsers();
  };

  const executeReset = (routine: "OP-01" | "OP-02" | "OP-03") => {
    setConfirmModal({
      title: "Executar Reset de Governança",
      description: `Tem certeza que deseja executar o Reset de Governança ${routine}? Essa ação restaurará dados operacionais iniciais e reiniciará as métricas operacionais para os valores padrão do sistema local. Deseja prosseguir com o reset local?`,
      onConfirm: () => {
        setConfirmModal(null);
        if (routine === "OP-01") onResetOP01();
        else if (routine === "OP-02") onResetOP02();
        else onResetOP03();

        setMessage(
          `Rotina de governança complementar ${routine} foi disparada e executada com sucesso! Os bancos de dados locais foram recarregados.`,
        );
      },
    });
  };

  return (
    <div className="space-y-6 text-[#dae2fd]">
      <div>
        <h2 className="text-3xl font-bold font-sans text-on-surface tracking-tight">
          Governança Integrada
        </h2>
        <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
          Configurações de controle institucional, permissões de usuários
          integradas ao Supabase Database e sincronizadores operacionais de
          manifesto.
        </p>
      </div>

      {message && (
        <div className="bg-[var(--router-primary)]-container/15 border border-primary/30 text-[var(--router-primary)] px-4 py-3 rounded-xl flex items-start gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] shrink-0">
            verified_user
          </span>
          <div>
            <p className="text-xs font-semibold">Mensagem do Sistema</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Profile and resets row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[18px]">
                manage_accounts
              </span>
              Seu Perfil de Operador
            </h3>
            <p className="text-xs text-on-surface-variant mb-5">
              Defina as credenciais locais e o nível de acesso operacional do
              usuário autenticado no sistema RotaOperational.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Cargo / Função Administrativa
                </label>
                <select
                  value={tempRole}
                  onChange={(e) => setTempRole(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="Superintendente de Logística">
                    Superintendente de Logística
                  </option>
                  <option value="Auditor de Operações">
                    Auditor de Operações
                  </option>
                  <option value="Controlador de Frota">
                    Controlador de Frota
                  </option>
                  <option value="Analista de Desempenho">
                    Analista de Desempenho
                  </option>
                  <option value="Operador de Despacho">
                    Operador de Despacho
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Unidade Relacionada (UNID)
                </label>
                <select
                  value={tempUnid}
                  onChange={(e) => setTempUnid(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-bold text-[var(--router-primary)]"
                >
                  {adminUser.is_master ? (
                    <>
                      <option value="TODAS">
                        TODAS AS UNIDADES (Master Filterable)
                      </option>
                      <option value="SPO">SPO - São Paulo</option>
                      <option value="PPY">PPY - Pouso Alegre</option>
                      <option value="ALF">ALF - Alfenas</option>
                      <option value="VGA">VGA - Varginha</option>
                    </>
                  ) : (
                    <>
                      <option value="SPO">SPO - São Paulo</option>
                      <option value="PPY">PPY - Pouso Alegre</option>
                      <option value="ALF">ALF - Alfenas</option>
                      <option value="VGA">VGA - Varginha</option>
                    </>
                  )}
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-normal">
                  Controla o filtro automático e restrições de visibilidade de
                  CTRCs que impactarão a roteirização.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/30">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                  Tipo de Privilégio:
                </span>
                {adminUser.is_master ? (
                  <span className="px-2 py-0.5 bg-error/15 text-error border border-error/20 font-mono text-[9px] uppercase tracking-wider rounded font-bold">
                    ★ USUÁRIO MASTER (TOTAL)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-[var(--router-primary)]/10 text-[var(--router-primary)] border border-primary/20 font-mono text-[9px] uppercase tracking-wider rounded font-bold">
                    OPERADOR PADRÃO
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--router-primary)] hover:bg-[var(--router-primary)]-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.98] shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    verified
                  </span>
                  Salvar Mudanças
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 border-t border-outline-variant/40 pt-4 text-[11px] text-on-surface-variant leading-relaxed">
            <p className="font-semibold text-on-surface mb-0.5">
              Nota de Sessão:
            </p>
            Suas modificações persistem na governança. Se estiver em modo
            Supabase ativo, sincronizará com sua conta `{adminUser.username}`.
          </div>
        </div>

        {/* Resets card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[18px]">
                restart_alt
              </span>
              Rotinas Sistêmicas Complementares (Displacers de Segurança)
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Em caso de desalinhamento de métricas locais, execute um dos
              resets de governança abaixo para purgar arquivos temporários e
              reiniciar as coleções simuladas.
            </p>

            <div className="space-y-4">
              {/* Reset OP-01 */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--router-primary)] rounded-full"></span>
                    <strong className="text-xs text-on-surface">
                      Mapeamento de Frota (OP-01)
                    </strong>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Reinicializa veículos, motoristas e ajudantes em memória.
                  </p>
                </div>
                <button
                  onClick={() => executeReset("OP-01")}
                  className="px-3.5 py-1.5 bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Reset OP-01
                </button>
              </div>

              {/* Reset OP-02 */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--router-primary)] rounded-full"></span>
                    <strong className="text-xs text-on-surface">
                      Roteirização Geral (OP-02)
                    </strong>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Restaura fila de CTRCs pendentes e chamados críticos.
                  </p>
                </div>
                <button
                  onClick={() => executeReset("OP-02")}
                  className="px-3.5 py-1.5 bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Reset OP-02
                </button>
              </div>

              {/* Reset OP-03 */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--router-primary)] rounded-full"></span>
                    <strong className="text-xs text-on-surface">
                      Controle de Risco (OP-03)
                    </strong>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Reseta dossiê de clientes críticos e auditorias de CTRC.
                  </p>
                </div>
                <button
                  onClick={() => executeReset("OP-03")}
                  className="px-3.5 py-1.5 bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Reset OP-03
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Aparência / Tema (Router Theme Engine) */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-5 text-left">
        <div>
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--router-primary)] text-[19px]">
              palette
            </span>
            Aparência e Tema (Router Theme Engine)
          </h3>
          <p className="text-xs text-on-surface-variant">
            Personalize a visualização operacional do sistema. O motor de temas
            central sincroniza suas preferências instantaneamente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface p-4 rounded-xl border border-outline-variant/60">
          {/* Tema */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
              Tema Visual
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUpdateTheme("light")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  currentTheme === "light"
                    ? "bg-[var(--router-primary)] text-on-primary border-transparent"
                    : "bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  light_mode
                </span>
                Claro
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTheme("dark")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  currentTheme === "dark"
                    ? "bg-[var(--router-primary)] text-on-primary border-transparent"
                    : "bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  dark_mode
                </span>
                Escuro
              </button>
            </div>
          </div>

          {/* Densidade */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
              Densidade Operacional
            </label>
            <select
              value={density}
              onChange={(e) => handleUpdateDensity(e.target.value as any)}
              className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:ring-1 focus:ring-primary focus:outline-none font-bold"
            >
              <option value="compact">Compacta (Alta Densidade)</option>
              <option value="normal">Normal</option>
              <option value="comfortable">Confortável (Espaçosa)</option>
            </select>
          </div>

          {/* Contraste */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
              Contraste
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUpdateContrast("standard")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                  contrast === "standard"
                    ? "bg-[var(--router-primary)] text-on-primary border-transparent"
                    : "bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface"
                }`}
              >
                Padrão
              </button>
              <button
                type="button"
                onClick={() => handleUpdateContrast("high")}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                  contrast === "high"
                    ? "bg-[var(--router-primary)] text-on-primary border-transparent"
                    : "bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface"
                }`}
              >
                Alto Contraste
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[var(--router-primary)]-container/10 border border-primary/20 rounded-lg text-[11px] text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--router-primary)] text-[16px]">
            info
          </span>
          <span>
            <strong>Motor de temas inicial:</strong> As preferências de
            aparência são salvas localmente no navegador para preservar seu
            fluxo de trabalho de despacho. Personalização avançada será evoluída
            depois.
          </span>
        </div>
      </div>

      {/* Database dependent - Users management. Visible to all but only editable/deletable by Master users */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-5 text-left">
        <div>
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--router-primary)] text-[19px]">
              group
            </span>
            Gestão Corporativa de Usuários do Sistema RotaOperational
          </h3>
          <p className="text-xs text-on-surface-variant">
            Lista de operadores autorizados no sistema e sincronizados em banco
            de dados Supabase PostgreSQL.{" "}
            {adminUser.is_master
              ? "Como usuário Master, você possui controle de escrita e exclusão total."
              : "Você possui privilégio de Leitura apenas."}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form to create/edit - ONLY edit if Master */}
          <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 space-y-4">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[16px]">
                person_add
              </span>
              Cadastrar Novo Operador
            </h4>

            {!adminUser.is_master ? (
              <div className="p-3 bg-error-container/10 border border-error/20 rounded-lg text-xs leading-normal font-semibold text-error flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                  lock
                </span>
                <span>
                  Criação bloqueada! Somente administradores MASTER possuem
                  acesso à criação de novos operadores.
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleCreateOrUpdateUser}
                className="space-y-3.5 text-left"
              >
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    E-mail ou Usuário (Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormUsername}
                    onChange={(e) => setUserFormUsername(e.target.value)}
                    placeholder="Ex: joao.silva"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormName}
                    onChange={(e) => setUserFormName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Senha de Entrada
                  </label>
                  <input
                    type="text"
                    required
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    placeholder="Padrão: 123"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Perfil/Acesso Funcional
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="Superintendente de Logística">
                      Superintendente de Logística
                    </option>
                    <option value="Auditor de Operações">
                      Auditor de Operações
                    </option>
                    <option value="Controlador de Frota">
                      Controlador de Frota
                    </option>
                    <option value="Analista de Desempenho">
                      Analista de Desempenho
                    </option>
                    <option value="Operador de Despacho">
                      Operador de Despacho
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Unidade Padrão (UNID)
                  </label>
                  <select
                    value={userFormUnid}
                    onChange={(e) => setUserFormUnid(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-[var(--router-success)]"
                  >
                    {opUnits
                      .filter((u) => u.active)
                      .map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="is_master_chk"
                    checked={userFormIsMaster}
                    onChange={(e) => setUserFormIsMaster(e.target.checked)}
                    className="w-4 h-4 text-[var(--router-primary)] bg-surface-container border-outline-variant rounded focus:ring-primary"
                  />
                  <label
                    htmlFor="is_master_chk"
                    className="text-xs text-on-surface cursor-pointer select-none"
                  >
                    Dar privilégio de{" "}
                    <span className="font-bold text-error">MASTER</span> (total)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[var(--router-primary)] hover:bg-[var(--router-primary)]-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    save
                  </span>
                  Gravar em Banco de Dados
                </button>
              </form>
            )}
          </div>

          {/* List of active users */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex justify-between items-center bg-surface px-4 py-2.5 rounded-lg border border-outline-variant/40">
              <span className="text-xs font-bold font-mono uppercase text-on-surface-variant">
                Operadores ({appUsers.length})
              </span>
              <button
                onClick={handleLoadUsers}
                disabled={isUsersLoading}
                className="text-[10px] bg-surface-container hover:bg-surface-container-high px-2 py-1 rounded text-[var(--router-primary)] border border-outline-variant font-bold flex items-center gap-1"
              >
                <span
                  className={`material-symbols-outlined text-[13px] ${isUsersLoading ? "animate-spin" : ""}`}
                >
                  sync_saved_locally
                </span>
                Sincronizar Lista
              </button>
            </div>

            {isUsersLoading ? (
              <div className="text-center py-10 bg-surface rounded-xl border border-outline-variant/40 space-y-2">
                <span className="material-symbols-outlined text-[var(--router-primary)] text-[32px] animate-spin">
                  sync
                </span>
                <p className="text-xs text-on-surface-variant">
                  Carregando usuários do Supabase...
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-outline-variant/60 rounded-xl bg-surface-container-low max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-outline-variant text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Usuário / Login</th>
                      <th className="p-3">Nome do Operador</th>
                      <th className="p-3">Perfil / Cargo</th>
                      <th className="p-3">Unidade</th>
                      <th className="p-3">Nível</th>
                      {adminUser.is_master && (
                        <th className="p-3 text-right">Ação</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {appUsers.map((u, idx) => (
                      <tr key={idx} className="hover:bg-surface/50 text-xs">
                        <td className="p-3 font-mono font-bold text-[var(--router-primary)]">
                          {u.username}
                        </td>
                        <td className="p-3 text-on-surface font-semibold">
                          {u.name}
                        </td>
                        <td className="p-3 text-on-surface-variant">
                          {u.role}
                        </td>
                        <td className="p-3 font-mono font-bold text-[var(--router-success)]">
                          {u.unid || "TODAS"}
                        </td>
                        <td className="p-3">
                          {u.is_master ? (
                            <span className="px-2 py-0.5 bg-error/10 text-error font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                              Master
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-[var(--router-primary)]/10 text-[var(--router-primary)] font-mono text-[9px] rounded uppercase tracking-wider">
                              Standard
                            </span>
                          )}
                        </td>
                        {adminUser.is_master && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteUserClick(u.username)}
                              disabled={
                                u.username.toLowerCase() ===
                                adminUser.username.toLowerCase()
                              }
                              className="p-1 px-1.5 hover:bg-error/15 text-error rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              title="Remover operador permanentemente"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete
                              </span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {appUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-on-surface-variant"
                        >
                          Nenhum usuário operacional cadastrado na tabela.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Operational Units Management Section */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-5 text-left relative overflow-hidden">
        {/* Locking warning for regular operators */}
        {!adminUser.is_master && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/20 mb-3.5 shadow-lg">
              <span
                className="material-symbols-outlined text-[30px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">
              Gestão de Unidades Operacionais Restrita
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mt-1 mb-4 leading-relaxed">
              Sua conta atual{" "}
              <strong className="text-white">({adminUser.name})</strong> não
              possui o nível de privilégio necessário. Apenas usuários com
              privilégio{" "}
              <strong className="text-error uppercase">Master</strong> podem
              adicionar ou alterar unidades.
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--router-primary)] text-[19px]">
              domain
            </span>
            Gestão de Unidades Operacionais (Filiais)
          </h3>
          <p className="text-xs text-on-surface-variant">
            Gerencie as filiais operacionais do RotaOperational cadastradas no
            sistema.
          </p>
        </div>

        {opError && (
          <div className="p-3 bg-error-container/10 border border-error/20 text-error rounded-lg text-xs font-semibold leading-normal">
            {opError}
          </div>
        )}

        {opSuccess && (
          <div className="p-3 bg-[var(--router-primary)]-container/10 border border-primary/20 text-[var(--router-success)] rounded-lg text-xs font-semibold leading-normal">
            {opSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Add unit form */}
          <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 space-y-4">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[16px]">
                add_home
              </span>
              Adicionar Nova Filial
            </h4>

            <form onSubmit={handleAddOpUnit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Código da Unidade (Ex: VGA, SPO)
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={newOpCode}
                  onChange={(e) => setNewOpCode(e.target.value)}
                  placeholder="Ex: LGA"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Nome da Cidade/Localização
                </label>
                <input
                  type="text"
                  required
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  placeholder="Ex: Varginha"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[var(--router-primary)] hover:bg-[var(--router-primary)]-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">
                  add
                </span>
                Cadastrar Unidade
              </button>
            </form>
          </div>

          {/* List of units */}
          <div className="xl:col-span-2 space-y-3">
            <div className="bg-surface px-4 py-2.5 rounded-lg border border-outline-variant/40 flex justify-between items-center bg-surface pb-3">
              <span className="text-xs font-bold font-mono uppercase text-on-surface-variant">
                Filiais Cadastradas ({opUnits.length})
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
                    <th className="p-3 font-mono">CÓDIGO</th>
                    <th className="p-3">NOME COMPLETO</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 text-xs">
                  {opUnits.map((unit) => (
                    <tr
                      key={unit.code}
                      className="hover:bg-surface-container-low/30 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-[var(--router-primary)]">
                        {unit.code}
                      </td>
                      <td className="p-3">
                        {editingOpCode === unit.code ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={editingOpName}
                              onChange={(e) => setEditingOpName(e.target.value)}
                              className="bg-surface-container border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                handleUpdateOpName(unit.code, editingOpName);
                                setEditingOpCode(null);
                              }}
                              className="text-xs font-bold bg-[var(--router-success)]/10 text-[var(--router-success)] border border-[#3ecf8e]/20 px-2.5 py-1 rounded hover:bg-[var(--router-success)]/20"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingOpCode(null)}
                              className="text-xs font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high px-2 py-1 border border-outline-variant rounded"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-on-surface">
                            {unit.name}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleOpUnit(unit.code)}
                          className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full border transition-all ${
                            unit.active
                              ? "bg-[var(--router-success)]/10 text-[var(--router-success)] border-[#3ecf8e]/30 hover:bg-[var(--router-success)]/20"
                              : "bg-error-container/20 text-error border-error/30 hover:bg-error-container/35"
                          }`}
                        >
                          {unit.active ? "Ativa" : "Inativa"}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {editingOpCode !== unit.code && (
                          <button
                            onClick={() => {
                              setEditingOpCode(unit.code);
                              setEditingOpName(
                                unit.name.includes(" - ")
                                  ? unit.name.substring(
                                      unit.name.indexOf(" - ") + 3,
                                    )
                                  : unit.name,
                              );
                            }}
                            className="p-1 text-[var(--router-primary)] hover:bg-[var(--router-primary)]/10 rounded transition-colors"
                            title="Editar Unidade"
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              edit
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOpUnit(unit.code)}
                          disabled={unit.code === DEFAULT_OPERATIONAL_UNIT}
                          className={`p-1 rounded transition-colors ${unit.code === DEFAULT_OPERATIONAL_UNIT ? "text-on-surface-variant/30 cursor-not-allowed" : "text-error hover:bg-error/10"}`}
                          title={
                            unit.code === DEFAULT_OPERATIONAL_UNIT
                              ? "Não é possível excluir a unidade padrão"
                              : "Excluir Unidade"
                          }
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            delete
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Ambiente de Produção e Limpeza de Demonstração Card */}
      <div
        id="ambiente_producao_panel"
        className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-4 text-left relative overflow-hidden"
      >
        {/* Locking overlay shield on standard user levels */}
        {!adminUser.is_master && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/20 mb-3.5 shadow-lg">
              <span
                className="material-symbols-outlined text-[30px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">
              Ambiente de Produção Restrito
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mt-1 mb-4 leading-relaxed">
              Apenas usuários{" "}
              <strong className="text-error uppercase">Master</strong> podem
              limpar os dados de demonstração e preparar o ambiente para
              produção.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[18px]">
                verified_user
              </span>
              Ambiente de Produção e Limpeza do Mock
            </h3>
            <p className="text-xs text-on-surface-variant">
              Utilize esta ferramenta para expurgar de forma irreversível os
              registros padrão de testes / demonstração instalados offline.
            </p>
          </div>
          <div>
            <span
              className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${IS_DEMO_MODE ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "bg-success/10 text-success border border-success/30"}`}
            >
              {IS_DEMO_MODE ? "Modo Demo Ativo" : "Modo de Produção Puro"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Status e Estatísticas de Teste */}
          <div className="bg-surface rounded-lg border border-outline-variant/40 p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Registros de Demonstração Identificáveis
            </h4>
            <ul className="text-xs space-y-2 font-mono text-on-surface-variant">
              <li className="flex justify-between">
                <span>Veículos Padrão:</span>
                <span className="text-white font-bold">
                  {
                    vehicles.filter((v) =>
                      [
                        "RTA3G45",
                        "OPR1B22",
                        "LOG9H88",
                        "FLT8M55",
                        "TRK4X90",
                      ].includes(v.id || ""),
                    ).length
                  }{" "}
                  detectados
                </span>
              </li>
              <li className="flex justify-between">
                <span>Motoristas Padrão:</span>
                <span className="text-white font-bold">
                  {
                    drivers.filter((d) =>
                      ["MOT-8842", "MOT-1109", "MOT-2911", "MOT-5590"].includes(
                        d.id || "",
                      ),
                    ).length
                  }{" "}
                  detectados
                </span>
              </li>
              <li className="flex justify-between">
                <span>CTRCs Fictícios:</span>
                <span className="text-white font-bold">
                  {
                    availableCtrcs.filter((c) =>
                      ["SPO683412-2", "BHS040163-3", "SPO683890-1"].some((id) =>
                        c.id?.startsWith(id.substring(0, 9)),
                      ),
                    ).length
                  }{" "}
                  detectados
                </span>
              </li>
              <li className="flex justify-between">
                <span>Romaneios Mock (Ex: 2981):</span>
                <span className="text-white font-bold">
                  {dbStats.romaneios > 0 ||
                  localStorage.getItem("saved_romaneios")
                    ? "Massa Existente de Exemplo"
                    : "Limpo / Ausente"}
                </span>
              </li>
            </ul>
          </div>

          {/* Form de Ação */}
          <div className="space-y-3 flex flex-col justify-center">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Para validar a exclusão segura e orientada, digite{" "}
              <strong className="text-on-surface">LIMPAR DEMO</strong> no campo
              abaixo e clique para limpar a base de testes offline local do
              IndexedDB.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={demoCleaningInput}
                onChange={(e) => setDemoCleaningInput(e.target.value)}
                placeholder="LIMPAR DEMO"
                className="bg-surface border border-outline-variant/65 rounded-lg px-3 py-2 text-xs text-on-surface flex-1 focus:outline-none focus:border-primary/80 uppercase font-bold animate-none"
              />
              <button
                id="btn_clear_demo_data"
                onClick={handleClearDemoData}
                disabled={isCleaningDemo || demoCleaningInput !== "LIMPAR DEMO"}
                className="bg-error hover:bg-error/80 disabled:bg-surface-variant/40 hover:text-white text-on-error px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {isCleaningDemo ? (
                  <>
                    <span className="animate-spin w-3 h-3 border-2 border-on-error border-t-transparent rounded-full" />
                    Processando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">
                      cleaning_services
                    </span>
                    Limpar Demonstração
                  </>
                )}
              </button>
            </div>

            {demoCleaningMessage && (
              <div
                id="demo_cleaning_msg"
                className={`p-3 rounded-lg text-xs leading-relaxed animate-fadeIn ${demoCleaningStatus === "success" ? "bg-success/10 text-success border border-success/30" : "bg-error/10 text-error border border-error/20"}`}
              >
                {demoCleaningMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supabase Database Integration Panel */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-6 text-left relative overflow-hidden">
        {/* Locking overlay shield on standard user levels */}
        {!adminUser.is_master && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/20 mb-3.5 shadow-lg animate-bounce duration-1000">
              <span
                className="material-symbols-outlined text-[30px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">
              Configuração de APIs Restrita
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mt-1 mb-4 leading-relaxed">
              Sua conta atual{" "}
              <strong className="text-white">({adminUser.name})</strong> não
              possui o nível de privilégio necessário. Apenas usuários{" "}
              <strong className="text-error uppercase">Master</strong> do
              RotaOperational podem alterar as conexões do banco de dados na
              nuvem Supabase e do repositório.
            </p>
            <div className="text-[10px] text-on-surface-variant font-mono bg-surface p-2 rounded-lg border border-outline-variant/65">
              Por favor, faça logout e autentique-se com o usuário{" "}
              <strong className="text-white">"master" (senha 123)</strong> para
              acessar. 🛡️
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--router-success)] text-[18px]">
                database
              </span>
              Gerenciamento de Chaves de Acesso e Sincronização Supabase
            </h3>
            <p className="text-xs text-on-surface-variant">
              Configure as chaves dinâmicas de acesso ao seu banco de dados
              Supabase para ativar a sincronização em tempo real.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
              Origem das Chaves:
            </span>
            {activeSource === "localStorage" && (
              <span className="px-2.5 py-1 bg-[var(--router-primary)]/10 text-[var(--router-primary)] border border-primary/30 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--router-primary)] rounded-full animate-bounce"></span>
                Salvo no Browser (localStorage)
              </span>
            )}
            {activeSource === "env" && (
              <span className="px-2.5 py-1 bg-tertiary-container/35 text-tertiary border border-tertiary/20 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                Variáveis de Ambiente (.env)
              </span>
            )}
            {activeSource === "none" && (
              <span className="px-2.5 py-1 bg-error-container/20 text-error border border-error/20 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                Sem Conexão Ativa
              </span>
            )}
          </div>
        </div>

        {/* Inputs Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-outline-variant/60">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[var(--router-primary)]">
                vpn_key
              </span>
              Credenciais do Banco de Dados
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  SUPABASE URL (Endereço da API)
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://seu-projeto.supabase.co"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  SUPABASE ANON KEY (Chave Pública Anon)
                </label>
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Seu token JWT Anon do Supabase"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveActiveCredentials}
                className="px-3 py-2 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">
                  save
                </span>
                Aplicar e Salvar no Browser
              </button>

              {activeSource === "localStorage" && (
                <button
                  type="button"
                  onClick={handleClearActiveCredentials}
                  className="px-3 py-2 bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 text-error border border-error/20 text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    delete_sweep
                  </span>
                  Limpar Override Local
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:border-l border-outline-variant/50 lg:pl-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[var(--router-success)]">
                  info
                </span>
                Como integrar seu Banco de Dados Supabase?
              </h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Para tornar o RotaOperational totalmente funcional com o seu
                próprio banco de dados na nuvem:
              </p>
              <ul className="text-[11px] text-on-surface-variant list-disc pl-4 space-y-1 leading-relaxed">
                <li>
                  Crie um projeto grátis no painel oficial do{" "}
                  <strong>Supabase</strong>.
                </li>
                <li>
                  Copie a <strong>Project URL</strong> e a{" "}
                  <strong>Anon public API key</strong> das configurações de API
                  do projeto.
                </li>
                <li>
                  Insira as chaves nos campos ao lado, salve e clique em{" "}
                  <strong>Testar Conexão</strong>.
                </li>
                <li>
                  Abra o dropdown do Script SQL abaixo, copie o código e execute
                  no SQL Editor do Supabase para criar as tabelas.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Database Sync Controls (Buttons container) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-on-surface flex items-center gap-1 pb-1">
            <span className="material-symbols-outlined text-[16px] text-[var(--router-primary)]">
              sync
            </span>
            Ações de Sincronização do Banco
          </h4>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className={`px-4 py-2 bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold rounded-lg transition-all flex items-center gap-2 ${isTesting ? "opacity-65 cursor-wait" : ""}`}
            >
              <span className="material-symbols-outlined text-[15px] text-[var(--router-success)]">
                quiz
              </span>
              {isTesting ? "Testando..." : "Testar Conexão API"}
            </button>

            <button
              onClick={handleExportToSupabase}
              disabled={isExporting || !customUrl.trim() || !customKey.trim()}
              className={`px-4 py-2 bg-[var(--router-success)] text-[var(--router-surface)] hover:bg-[var(--router-success)] text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">
                cloud_upload
              </span>
              {isExporting
                ? "Exportando..."
                : "Carga Semente (Exportar Local para Nuvem)"}
            </button>

            <button
              onClick={handleImportFromSupabase}
              disabled={isImporting || !customUrl.trim() || !customKey.trim()}
              className={`px-4 py-2 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">
                cloud_download
              </span>
              {isImporting
                ? "Baixando..."
                : "Importar Banco de Dados do Supabase"}
            </button>
          </div>
        </div>

        {/* Live response message container */}
        {supabaseStatus && (
          <div className="p-3 bg-surface border border-outline-variant rounded-lg text-xs font-mono space-y-1">
            <p className="font-semibold text-on-surface">
              Resultado do Diagnóstico:
            </p>
            <p className="text-on-surface-variant leading-relaxed select-all">
              {supabaseStatus}
            </p>
          </div>
        )}

        {/* Sync logs output console */}
        {syncLogs.length > 0 && (
          <div className="bg-surface p-4 rounded-lg border border-outline-variant">
            <h4 className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--router-success)]"></span>
              Console de Sincronização Supabase:
            </h4>
            <div className="space-y-1 font-mono text-[10px] max-h-40 overflow-y-auto">
              {syncLogs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.startsWith("❌")
                      ? "text-error font-semibold"
                      : "text-on-surface-variant"
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schema installation scripts copy card */}
        <div className="bg-surface-container rounded-lg border border-outline-variant/60 overflow-hidden">
          <button
            onClick={() => setShowSql(!showSql)}
            className="w-full px-4 py-3 bg-surface hover:bg-surface-container-high transition-colors flex justify-between items-center"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[17px]">
                terminal
              </span>
              Script SQL Setup de Tabelas (PostgreSQL)
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
              {showSql ? "expand_less" : "expand_more"}
            </span>
          </button>

          {showSql && (
            <div className="p-4 border-t border-outline-variant/40 space-y-3">
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>
                  Cole este script no console de consultas RLS do seu projeto
                  Supabase:
                </span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed rounded text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {sqlCopied ? "done" : "content_copy"}
                  </span>
                  {sqlCopied ? "Copiado!" : "Copiar SQL"}
                </button>
              </div>
              <textarea
                value={SUPABASE_SQL_SCHEMA}
                readOnly
                className="w-full h-48 bg-surface border border-outline-variant/70 text-[10px] font-mono text-tertiary rounded-lg p-3 focus:outline-none select-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sincronização Operacional Supabase V1 Panel */}
      <div
        id="sync_operacional_v1_panel"
        className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-6 text-left relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[#efb810] text-[18px]">
                sync_alt
              </span>
              Sync Operacional Supabase V1 (Multi-PC)
            </h3>
            <p className="text-xs text-on-surface-variant">
              Sincronize os dados da sua operação atual (CTRCs, planejamento,
              pré-romaneios e romaneios salvos) para poder continuar o trabalho
              em outra máquina.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 font-mono text-xs">
            {lastOperationalSyncTime ? (
              <span className="text-left sm:text-right text-on-surface-variant text-[11px] block">
                Último Sync:{" "}
                <strong className="text-white">
                  {lastOperationalSyncTime}
                </strong>
              </span>
            ) : (
              <span className="text-left sm:text-right text-on-surface-variant text-[11px] block text-amber-500/80">
                Nenhuma sincronização recente realizada.
              </span>
            )}
          </div>
        </div>

        {/* Informações de fluxo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface p-4 rounded-xl border border-outline-variant/60">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[16px]">
                info
              </span>
              Como Funciona a Sincronização?
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Diferente da sincronização estruturada de cadastros básicos, a
              sincronização operacional permite mover o estado dinâmico da sua
              roteirização atual de e para a nuvem.
            </p>
            <ul className="text-[11px] text-on-surface-variant list-disc pl-4 space-y-1 leading-relaxed">
              <li>
                Use <strong>Enviar operação para nuvem</strong> para fazer o
                upload do seu progresso local.
              </li>
              <li>
                Use <strong>Baixar operação da nuvem</strong> para obter e
                mesclar os dados operacionais remotos nesta máquina.
              </li>
              <li>
                Use <strong>Sincronizar operação agora</strong> para realizar
                uma mesclagem segura de duas vias (bidirecional baseada em data
                de atualização) sem duplicar CTRCs ou perder seus romaneios mais
                novos.
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-center space-y-3">
            <h4 className="text-xs font-bold text-[#efb810] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">
                shield
              </span>
              Regras Importantes de Segurança
            </h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              • A comparação é inteligente e realizada registro por registro.
              Caso um registro exista tanto local quanto remotamente, a versão
              local mais recente (
              <strong className="text-white">Last Write Wins</strong>) é sempre
              preservada e nunca sobrescrita por versões remotas mais antigas.
              <br />• O processo é totalmente tolerante a falhas e não deleta
              dados locais de forma destrutiva.
            </p>
          </div>
        </div>

        {/* Database Sync Controls (Buttons container) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-on-surface flex items-center gap-1 pb-1">
            <span className="material-symbols-outlined text-[16px] text-[var(--router-primary)]">
              touch_app
            </span>
            Ações Rápidas de Sincronização
          </h4>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportOperationalState}
              disabled={isOperationalSyncing}
              className={`px-4 py-2.5 bg-[var(--router-warning)] text-[#1E1B1B] hover:bg-[var(--router-warning)]/80 text-[11px] font-bold rounded-lg transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">
                arrow_upward
              </span>
              {isOperationalSyncing
                ? "Enviando..."
                : "Enviar operação para nuvem"}
            </button>

            <button
              onClick={handleImportOperationalState}
              disabled={isOperationalSyncing}
              className={`px-4 py-2.5 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed text-[11px] font-bold rounded-lg transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">
                arrow_downward
              </span>
              {isOperationalSyncing
                ? "Baixando..."
                : "Baixar operação da nuvem"}
            </button>

            <button
              onClick={handleSyncOperationalState}
              disabled={isOperationalSyncing}
              className={`px-4 py-2.5 bg-[var(--router-primary)] text-black hover:bg-[var(--router-primary)]/80 text-[11px] font-bold rounded-lg transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">
                sync
              </span>
              {isOperationalSyncing
                ? "Sincronizando..."
                : "Sincronizar operação agora"}
            </button>
          </div>
        </div>

        {/* Live response message container */}
        {operationalSyncMessage && (
          <div
            className={`p-4 rounded-xl text-xs flex gap-3 leading-relaxed animate-fadeIn ${operationalSyncStatus === "success" ? "bg-success/10 text-success border border-success/30" : "bg-error/10 text-error border border-error/20"}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {operationalSyncStatus === "success" ? "task_alt" : "warning"}
            </span>
            <div className="space-y-1">
              <p className="font-bold">
                {operationalSyncStatus === "success"
                  ? "Operação Concluída com Sucesso:"
                  : "Erro detectado:"}
              </p>
              <p className="text-on-surface-variant font-medium">
                {operationalSyncMessage}
              </p>
            </div>
          </div>
        )}

        {/* Sync logs output console */}
        {operationalSyncDetails.length > 0 && (
          <div className="bg-surface p-4 rounded-lg border border-outline-variant">
            <h4 className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--router-warning)]"></span>
              Console de Sincronização Operacional:
            </h4>
            <div className="space-y-1 font-mono text-[10px] max-h-40 overflow-y-auto">
              {operationalSyncDetails.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.startsWith("❌")
                      ? "text-error font-semibold"
                      : "text-on-surface-variant"
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Logs Panel */}
      <SystemLogsPanel />

      {/* IndexedDB Local Persistence Governance Board */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-6 text-left relative overflow-hidden animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-[18px]">
                analytics
              </span>
              Base de Dados Operacional Local (IndexedDB)
            </h3>
            <p className="text-xs text-on-surface-variant">
              Governança local de armazenamento de-para e fila transacional de
              resiliência offline do navegador (Dexie Engine).
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--router-surface)] border border-[var(--router-primary)]/20 text-[10px] font-bold text-[var(--router-primary)] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 bg-[var(--router-primary)] rounded-full animate-pulse"></span>
            Offline-First Protegido
          </div>
        </div>

        {/* Database Table Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-3 bg-surface rounded-xl border border-outline-variant/50 text-left space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              CTRCs Locais
            </span>
            <span className="text-lg font-extrabold font-mono text-[#dae2fd]">
              {dbStats.ctrcs}
            </span>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-outline-variant/50 text-left space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Veículos
            </span>
            <span className="text-lg font-extrabold font-mono text-[#dae2fd]">
              {dbStats.vehicles}
            </span>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-outline-variant/50 text-left space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Motoristas
            </span>
            <span className="text-lg font-extrabold font-mono text-[#dae2fd]">
              {dbStats.drivers}
            </span>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-outline-variant/50 text-left space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Ocorrências
            </span>
            <span className="text-lg font-extrabold font-mono text-[#dae2fd]">
              {dbStats.occurrences}
            </span>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-outline-variant/50 text-left space-y-1">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
              Histórico Viagens
            </span>
            <span className="text-lg font-extrabold font-mono text-[#dae2fd]">
              {dbStats.romaneios}
            </span>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-primary/20 bg-[var(--router-primary)]/5 text-left space-y-1 shadow-inner">
            <span className="text-[10px] font-bold text-[var(--router-primary)] uppercase tracking-wider block">
              Fila Sync (Total)
            </span>
            <span className="text-lg font-extrabold font-mono text-[var(--router-primary)] flex items-center gap-1">
              <span>{dbStats.syncQueue}</span>
              {dbStats.pendingSyncs > 0 && (
                <span className="text-[9px] bg-[var(--router-primary)] text-on-primary font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                  {dbStats.pendingSyncs} pend
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Sync Queue Table Preview */}
        <div className="space-y-3 bg-surface p-4 rounded-xl border border-outline-variant/60">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1">
            <div>
              <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--router-primary)]">
                  dynamic_feed
                </span>
                Fila Transacional Recente (sync_queue)
              </h4>
              <span className="text-[10px] font-mono text-on-surface-variant">
                Armazenamento sob-demanda Dexie
              </span>
            </div>

            {queueSummary && (
              <div className="flex gap-2 text-[10px] font-mono mt-2 sm:mt-0">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {queueSummary.pending} PENDENTES
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {queueSummary.processing} PROCESSANDO
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {queueSummary.completed} CONCLUÍDOS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {queueSummary.failed} FALHAS
                </span>
              </div>
            )}
          </div>

          {syncQueueItems.length === 0 ? (
            <div className="p-5 text-center text-xs text-on-surface-variant border border-dashed border-outline-variant rounded-lg">
              <span className="material-symbols-outlined text-[20px] mb-1 text-on-surface-variant/40 block">
                check_circle
              </span>
              Nenhuma transação pendente ou aguardando consolidação. Fila de
              sincronização limpa!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container-low/40">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--router-surface)] text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/40">
                  <tr>
                    <th className="px-3.5 py-2">ID</th>
                    <th className="px-3.5 py-2">Entidade</th>
                    <th className="px-3.5 py-2">Operação</th>
                    <th className="px-3.5 py-2">Data Enfileirada</th>
                    <th className="px-3.5 py-2">Estado local</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-mono text-[11px]">
                  {syncQueueItems.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-3.5 py-2 text-on-surface-variant">
                        #{item.id}
                      </td>
                      <td className="px-3.5 py-2 font-semibold text-[var(--router-primary)] uppercase">
                        {item.entity}
                      </td>
                      <td className="px-3.5 py-2">
                        <span
                          className={`px-2 py-0.5 rounded font-sans font-bold text-[9px] ${
                            item.operation === "CREATE"
                              ? "bg-[var(--router-success)]/10 text-[var(--router-success)]"
                              : item.operation === "DELETE"
                                ? "bg-error/10 text-error"
                                : "bg-[var(--router-primary)]/10 text-[var(--router-primary)]"
                          }`}
                        >
                          {item.operation}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-on-surface-variant">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-3.5 py-2">
                        <span
                          className={`inline-flex flex-col gap-0.5 font-sans text-[10px] font-bold ${
                            item.status === "completed"
                              ? "text-emerald-500"
                              : item.status === "failed"
                                ? "text-rose-500"
                                : item.status === "processing"
                                  ? "text-blue-500"
                                  : "text-amber-500"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === "completed"
                                  ? "bg-emerald-500"
                                  : item.status === "failed"
                                    ? "bg-rose-500"
                                    : item.status === "processing"
                                      ? "bg-blue-500 animate-pulse"
                                      : "bg-amber-500"
                              }`}
                            ></span>
                            {item.status === "completed"
                              ? "CONCLUÍDO"
                              : item.status === "failed"
                                ? "FALHA"
                                : item.status === "processing"
                                  ? "PROCESSANDO"
                                  : "PENDENTE"}
                          </span>
                          {item.status === "failed" && item.errorMessage && (
                            <span
                              className="text-[9px] font-normal text-rose-400/80 leading-tight"
                              title={item.errorMessage}
                            >
                              {item.errorMessage.includes(
                                "unique_key não encontrada",
                              )
                                ? "Falha não reenviável (Chave ausente)"
                                : item.errorMessage.substring(0, 35) +
                                  (item.errorMessage.length > 35 ? "..." : "")}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={loadDbStats}
              className="px-3 py-1.5 bg-surface hover:bg-surface-container border border-outline-variant rounded-lg text-[10px] font-mono text-on-surface font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">
                refresh
              </span>
              Atualizar Estatísticas
            </button>

            {dbStats.syncQueue > 0 && (
              <button
                onClick={handleClearSyncQueue}
                className="px-3 py-1.5 bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 border border-error/20 rounded-lg text-[10px] font-mono text-error font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">
                  cleaning_services
                </span>
                Limpar Fila Concluída
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Sandbox-compliant Custom Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-3xl shrink-0">
                warning
              </span>
              <div className="space-y-1">
                <h3 className="font-bold text-on-surface text-sm sm:text-base">
                  {alertModal.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                  {alertModal.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAlertModal(null)}
                className="px-4 py-1.5 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed text-xs font-bold rounded-lg transition-colors border border-transparent"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Sandbox-compliant Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--router-primary)] text-3xl shrink-0 font-light">
                help
              </span>
              <div className="space-y-1">
                <h3 className="font-bold text-on-surface text-sm sm:text-base">
                  {confirmModal.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-1.5 bg-surface hover:bg-surface-container border border-outline-variant text-[11px] font-bold rounded-lg text-on-surface transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-1.5 bg-[var(--router-success)] text-[var(--router-surface)] hover:bg-[var(--router-success)] text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
