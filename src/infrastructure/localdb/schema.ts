export const TABLES = {
  CTRCS: 'ctrcs',
  VEHICLES: 'vehicles',
  DRIVERS: 'drivers',
  SAVED_ROMANEIOS: 'savedRomaneios',
  OCCURRENCES: 'occurrences',
  SYNC_QUEUE: 'sync_queue',
} as const;

export type DBTableName = typeof TABLES[keyof typeof TABLES];

export interface DBSchemaDefinition {
  version: number;
  stores: Record<string, string>;
}

export const CURRENT_SCHEMA: DBSchemaDefinition = {
  version: 1,
  stores: {
    ctrcs: 'id, status, unid',
    vehicles: 'id, status',
    drivers: 'id, status',
    savedRomaneios: 'id, vehicleId, date',
    occurrences: 'codigo, tipo',
    sync_queue: '++id, entity, status, operation'
  }
};
