import { getSupabaseClient } from '../client';
import { CriticClient } from '../../../types';

export const criticalClientSupabaseRepository = {
  async upsertClient(clientData: CriticClient): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: 'Supabase offline' };
    }

    try {
      const payload = {
        id: clientData.id,
        name: clientData.name,
        prefix: clientData.prefix,
        score: clientData.score,
        reason: clientData.auditDetail || 'Recorrente',
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('critical_clients').upsert([payload]);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error upserting critical client to Supabase:', err);
      return { success: false, error: err };
    }
  },

  async getAllClients(): Promise<{ data: any[] | null; success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, data: null, error: 'Supabase offline' };
    }

    try {
      const { data, error } = await client.from('critical_clients').select('*');
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching critical clients from Supabase:', err);
      return { success: false, data: null, error: err };
    }
  }
};
