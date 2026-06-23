import { db } from '../db';
import { VehicleRegistry } from '../../../types';

export const VehicleRegistryRepository = {
  async getAll(): Promise<VehicleRegistry[]> {
    return db.vehicle_registries.toArray();
  },

  async getById(placa: string): Promise<VehicleRegistry | undefined> {
    return db.vehicle_registries.get(placa.toUpperCase().trim());
  },

  async put(vehicle: VehicleRegistry): Promise<string> {
    const cleanVehicle = {
      ...vehicle,
      placa: vehicle.placa.toUpperCase().trim(),
      updated_at: new Date().toISOString(),
      created_at: vehicle.created_at || new Date().toISOString()
    };
    await db.vehicle_registries.put(cleanVehicle);
    return cleanVehicle.placa;
  },

  async delete(placa: string): Promise<void> {
    await db.vehicle_registries.delete(placa.toUpperCase().trim());
  },

  async clearAll(): Promise<void> {
    await db.vehicle_registries.clear();
  }
};
