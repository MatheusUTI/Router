import Dexie, { type Table } from 'dexie';
import { Ctrc, Vehicle, DriverScore, DeliveryOccurrence } from '../../types';

export interface SyncQueueItem {
  id?: number;
  entity: 'ctrc' | 'vehicle' | 'driver' | 'romaneio' | 'occurrence';
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
  }
}

export const db = new RotaLocalDatabase();
