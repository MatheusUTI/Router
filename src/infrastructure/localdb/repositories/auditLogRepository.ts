import { db } from '../db';
import { AuditLog } from '../../../types';

export const AuditLogRepository = {
  async getAll(): Promise<AuditLog[]> {
    const logs = await db.audit_logs.toArray();
    // Sort from most recent to oldest
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async add(log: Omit<AuditLog, 'id'>): Promise<string> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLog: AuditLog = {
      ...log,
      id,
    };
    await db.audit_logs.put(newLog);
    return id;
  },

  /**
   * Helper to write an audit log quickly
   */
  async log(params: {
    user: string;
    isMaster: boolean;
    entityType: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    field?: string;
    oldValue?: string;
    newValue?: string;
    description: string;
  }): Promise<string> {
    return this.add({
      timestamp: new Date().toISOString(),
      user: params.user || 'Desconhecido',
      profile: params.isMaster ? 'MASTER' : 'OPERADOR',
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      field: params.field,
      oldValue: params.oldValue,
      newValue: params.newValue,
      description: params.description,
    });
  },

  async clearAll(): Promise<void> {
    await db.audit_logs.clear();
  }
};
