import { getSupabaseClient } from '../client';
import { VehicleGrRule } from '../../localdb/repositories/vehicleGrRuleRepository'; // Assume it exists or we use internal type

export const vehicleGrRuleSupabaseRepository = {
  async upsertRule(rule: VehicleGrRule): Promise<{ success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client) return { success: false, error: 'Supabase offline' };

    try {
      const payload = {
        id: rule.id,
        vehicle_type: rule.vehicleType,
        max_value_without_gr: rule.maxValueWithoutGr,
        requires_tracking_above_value: rule.requiresTrackingAboveValue,
        requires_authorization_above_limit: rule.requiresAuthorizationAboveLimit,
        blocks_routing_above_limit: rule.blocksRoutingAboveLimit,
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('vehicle_gr_rules').upsert([payload]);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error upserting GR rule to Supabase:', err);
      return { success: false, error: err };
    }
  },

  async getAllRules(): Promise<{ data: any[] | null; success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client) return { success: false, data: null, error: 'Supabase offline' };

    try {
      const { data, error } = await client.from('vehicle_gr_rules').select('*');
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching GR rules from Supabase:', err);
      return { success: false, data: null, error: err };
    }
  }
};
