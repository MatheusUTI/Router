import { getSupabaseClient } from '../client';
import { Vehicle } from '../../../types';

export const vehicleSupabaseRepository = {
  async upsertVehicle(vehicle: Vehicle): Promise<{ success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client) return { success: false, error: 'Supabase offline' };

    try {
      const payload = {
        id: vehicle.id,
        plate: vehicle.id, // Using id as plate
        driver_name: vehicle.driverName,
        capacity: vehicle.capacity,
        type: vehicle.type,
        status: vehicle.status,
        is_active: vehicle.status === 'Disponível' || vehicle.status === 'Em Rota',
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('vehicles').upsert([payload]);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error upserting vehicle to Supabase:', err);
      return { success: false, error: err };
    }
  },

  async getAllVehicles(): Promise<{ data: any[] | null; success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client) return { success: false, data: null, error: 'Supabase offline' };

    try {
      const { data, error } = await client.from('vehicles').select('*');
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching vehicles from Supabase:', err);
      return { success: false, data: null, error: err };
    }
  }
};
