import { getSupabaseClient } from '../client';
import { AuditLog } from '../../../types';
import { systemLogService } from '../../../services/systemLogService';

export const auditLogSupabaseRepository = {
  async insertLog(log: AuditLog): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: 'Supabase offline' };
    }

    try {
      const payload = {
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        user_name: log.user,
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
      
      if (error) {
         systemLogService.logError('Audit', 'Erro ao inserir log de auditoria no Supabase', error);
         throw error;
      }
      return { success: true };
    } catch (err) {
      console.error('Error inserting audit log to Supabase:', err);
      return { success: false, error: err };
    }
  },

  async insertLogsBulk(logs: AuditLog[]): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: 'Supabase offline' };
    }

    if (logs.length === 0) return { success: true };

    try {
      const payloads = logs.map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp).toISOString(),
        user_name: log.user,
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
      
      if (error) {
         systemLogService.logError('Audit', 'Erro ao inserir lote de logs de auditoria no Supabase', error);
         throw error;
      }
      return { success: true };
    } catch (err) {
      console.error('Error inserting audit logs bulk to Supabase:', err);
      return { success: false, error: err };
    }
  }
};
