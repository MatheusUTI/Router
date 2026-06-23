import Dexie, { type Table } from 'dexie';
import { Ctrc, Vehicle, DriverScore, DeliveryOccurrence, CidadeRota, Helper, CurvaAClientLocal, UserPreference, SyncMetadata, RoutePlanningItem, CtrcOccurrenceHistoryItem, RouteGateMap, PreRomaneio, OperationalCalendarEvent, OperationalUnitBI, CidadeAtendidaSSW, VehicleRegistry } from '../../types';

export interface SyncQueueItem {
  id?: number;
  entity: 'ctrc' | 'vehicle' | 'driver' | 'romaneio' | 'occurrence' | 'cidade_rota';
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  created_at: string;
  retry_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface RomaneioSave {
  id: string;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
  driverName: string;
  helperName: string;
  ctrcs: Ctrc[];
  observations?: string;
  isSyncedWithCloud?: boolean;
}

export class RotaLocalDatabase extends Dexie {
  ctrcs!: Table<Ctrc, string>;
  vehicles!: Table<Vehicle, string>;
  drivers!: Table<DriverScore, string>;
  savedRomaneios!: Table<RomaneioSave, string>;
  occurrences!: Table<DeliveryOccurrence, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  cidades_rotas!: Table<CidadeRota, number>;
  helpers!: Table<Helper, string>;
  curva_a_clients!: Table<CurvaAClientLocal, string>;
  user_preferences!: Table<UserPreference, string>;
  sync_metadata!: Table<SyncMetadata, string>;
  route_planning_items!: Table<RoutePlanningItem, string>;
  ctrc_occurrence_history!: Table<CtrcOccurrenceHistoryItem, string>;
  route_gate_map!: Table<RouteGateMap, string>;
  pre_romaneios!: Table<PreRomaneio, string>;
  operational_calendar_events!: Table<OperationalCalendarEvent, string>;
  operational_units_bi!: Table<OperationalUnitBI, string>;
  cidades_atendidas_ssw!: Table<CidadeAtendidaSSW, string>;
  vehicle_registries!: Table<VehicleRegistry, string>;

  constructor() {
    super('RotaLocalDatabase');
    this.version(1).stores({
      ctrcs: 'id, status, unid',
      vehicles: 'id, status',
      drivers: 'id, status',
      savedRomaneios: 'id, vehicleId, date',
      occurrences: 'codigo, tipo',
      sync_queue: '++id, entity, status, operation'
    });
    this.version(2).stores({
      cidades_rotas: '++id, cidade, setor, rota'
    });
    this.version(3).stores({
      helpers: 'id, name, status, unit',
      curva_a_clients: 'id, cnpj_remetente, cliente_remetente, curva_a',
      user_preferences: 'id, username, view',
      sync_metadata: 'entity, last_pull_at'
    });
    this.version(4).stores({
      route_planning_items: 'id, ctrcId, planningDate, suggestedRoute, operationalRoute, manualPriority, planningStatus, updatedAt'
    });
    this.version(5).stores({
      ctrc_occurrence_history: 'id, ctrcId, importDate, occurrenceCode, occurrenceSector, solutionType, status, unid, createdAt'
    });
    this.version(6).stores({
      route_gate_map: 'id, route, gate, active',
      pre_romaneios: 'id, planningDate, route, gate, status, createdAt, updatedAt'
    });
    this.version(7).stores({
      operational_calendar_events: 'id, date, dayMonth, city, active, severity'
    });
    this.version(8).stores({
      operational_units_bi: 'id, unidade, uf, tipo, responsavelOperacional, responsavelComercial, responsavel, ativo'
    });
    this.version(9).stores({
      cidades_atendidas_ssw: 'id, unidadeOrigem, ufOrigem, cidadeOrigem, ufDestino, cidadeDestino, pracaDestino, ativo'
    });
    this.version(10).stores({
      vehicle_registries: 'placa, tipo, statusOperacional'
    });
  }
}

export const db = new RotaLocalDatabase();
