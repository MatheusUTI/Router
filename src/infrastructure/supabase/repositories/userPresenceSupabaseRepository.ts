import { getSupabaseClient } from '../client';
import { systemLogService } from '../../../services/systemLogService';

export interface UserPresencePayload {
  id: string; // combination of username and something else, maybe just username? or unique session id? Let's use username.
  username: string;
  name?: string;
  role?: string;
  company_code?: string;
  current_view?: string;
  current_plan_id?: string;
  current_route?: string;
  status?: 'ONLINE' | 'OFFLINE' | 'IDLE';
  metadata?: any;
}

export class UserPresenceSupabaseRepository {
  static async heartbeatPresence(payload: UserPresencePayload): Promise<{ success: boolean; error?: any }> {
    try {
      const client = getSupabaseClient() as any;
      if (!client) return { success: false, error: 'No client' };

      const dataToUpsert = {
        id: payload.username, // using username as ID for simplicity
        username: payload.username,
        name: payload.name || '',
        role: payload.role || '',
        company_code: payload.company_code || '',
        current_view: payload.current_view || '',
        current_plan_id: payload.current_plan_id || '',
        current_route: payload.current_route || '',
        status: payload.status || 'ONLINE',
        metadata: payload.metadata || {},
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('user_presence').upsert([dataToUpsert] as any);
      if (error) {
        systemLogService.logError('Presence', 'Falha ao enviar heartbeat', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (err) {
      systemLogService.logError('Presence', 'Exceção no heartbeatPresence', err);
      return { success: false, error: err };
    }
  }

  static async getActiveUsers(companyCode?: string, planId?: string): Promise<any[]> {
    try {
      const client = getSupabaseClient() as any;
      if (!client) return [];

      let query = client
        .from('user_presence')
        .select('*')
        .gt('last_seen_at', new Date(Date.now() - 2 * 60000).toISOString()) // last 2 minutes
        .eq('status', 'ONLINE');

      if (companyCode) {
        query = query.eq('company_code', companyCode);
      }
      if (planId) {
        query = query.eq('current_plan_id', planId);
      }

      const { data, error } = await query.order('last_seen_at', { ascending: false });
      if (error) {
        systemLogService.logError('Presence', 'Falha ao obter usuários ativos', error);
        return [];
      }
      return data || [];
    } catch (err) {
      systemLogService.logError('Presence', 'Exceção em getActiveUsers', err);
      return [];
    }
  }

  static async markOffline(username: string): Promise<{ success: boolean }> {
    try {
      const client = getSupabaseClient() as any;
      if (!client) return { success: false };

      const { error } = await client
        .from('user_presence')
        .update({ status: 'OFFLINE', last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
        .eq('id', username);

      if (error) {
        systemLogService.logError('Presence', 'Falha ao marcar offline', error);
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }
}
