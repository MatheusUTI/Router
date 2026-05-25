import { db } from '../db';
import { Vehicle } from '../../../types';
import { addToSyncQueue } from './syncQueueRepository';

export const VehicleRepository = {
  async getAll(): Promise<Vehicle[]> {
    return db.vehicles.toArray();
  },

  async getById(id: string): Promise<Vehicle | undefined> {
    return db.vehicles.get(id);
  },

  async put(vehicle: Vehicle, skipSync = false): Promise<string> {
    await db.vehicles.put(vehicle);
    if (!skipSync) {
      await addToSyncQueue('vehicle', 'UPDATE', vehicle);
    }
    return vehicle.id;
  },

  async delete(id: string, skipSync = false): Promise<void> {
    const existing = await db.vehicles.get(id);
    await db.vehicles.delete(id);
    if (existing && !skipSync) {
      await addToSyncQueue('vehicle', 'DELETE', { id });
    }
  },

  async clearAll(): Promise<void> {
    await db.vehicles.clear();
  }
};
