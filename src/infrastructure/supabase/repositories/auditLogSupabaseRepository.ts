import { getSupabaseClient } from '../client';
import { AuditLog } from '../../../types';

export const auditLogSupabaseRepository = {
  async insertLog(log: AuditLog): Promise<{ success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client) return { success: false, error: 'Supabase offline' };

    try {
      const payload = {
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        user_name: log.userName,
        profile: log.profile,
        entity_type: log.entityType,
        entity_id: log.entityId,
        action: log.action,
        field: log.field,
        old_value: log.oldValue ? String(log.oldValue) : null,
        new_value: log.newValue ? String(log.newValue) : null,
        description: log.description
      };

      const { error } = await client.from('audit_logs').insert([payload]);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error inserting audit log to Supabase:', err);
      return { success: false, error: err };
    }
  },

  async insertLogsBulk(logs: AuditLog[]): Promise<{ success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client || logs.length === 0) return { success: false, error: 'Supabase offline or empty array' };

    try {
      const payloads = logs.map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        user_name: log.userName,
        profile: log.profile,
        entity_type: log.entityType,
        entity_id: log.entityId,
        action: log.action,
        field: log.field,
        old_value: log.oldValue ? String(log.oldValue) : null,
        new_value: log.newValue ? String(log.newValue) : null,
        description: log.description
      }));

      const { error } = await client.from('audit_logs').insert(payloads);
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error inserting audit logs bulk to Supabase:', err);
      return { success: false, error: err };
    }
  }
};
