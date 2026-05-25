import Dexie, { type Table } from 'dexie';
import { Ctrc, Vehicle, DriverScore, DeliveryOccurrence, CidadeRota, Helper, CurvaAClientLocal, UserPreference, SyncMetadata } from '../../types';

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
  }
}

export const db = new RotaLocalDatabase();
