const fs = require('fs');
let code = fs.readFileSync('src/application/services/RoutingPlanService.ts', 'utf-8');

code = code.replace(
  "import { routePlanningRepository } from '../../infrastructure/repositories';",
  "import { routePlanningRepository, auditLogRepository, syncQueueRepository } from '../../infrastructure/repositories';\nimport { addToSyncQueue } from '../../infrastructure/localdb/repositories/syncQueueRepository';"
);

const oldUpsert = `  async upsertItem(item: RoutePlanningItem): Promise<{ success: boolean; error?: any }> {
    const { routingPlanItemSupabaseRepository } = await import('../../infrastructure/supabase/repositories/routingPlanItemSupabaseRepository');
    return routingPlanItemSupabaseRepository.upsertItem(item as any);
  }`;

const newUpsert = `  /**
   * Orchestrates the Write-First strategy for RoutePlanningItem.
   * Modifies local database immediately, then enqueues cloud sync.
   */
  async updatePlanningItem(
    ctrcId: string, 
    planningDate: string, 
    patch: Partial<RoutePlanningItem>, 
    adminUser: any,
    activeRoutingPlan: any
  ): Promise<RoutePlanningItem> {
    const userName = adminUser?.name || adminUser?.username || 'admin';
    const isMaster = adminUser?.is_master || false;
    const companyCode = adminUser?.unid || 'SPO';

    // 1. Audit logs logic (abbreviated) - the View currently does this, but ideally it should be here.
    // For simplicity of not moving 100 lines of UI code, the UI can still do the audit logging for now,
    // or we can move it later. Let's just do the local upsert and queue.
    
    // 1. Write to local database (Write-First)
    const updatedItem = await routePlanningRepository.upsertForCtrc(ctrcId, planningDate, patch);
    
    // 2. Queue cloud sync (only if there is an active remote plan)
    if (activeRoutingPlan) {
      const remoteItem = {
        id: \`\${activeRoutingPlan.id}_\${ctrcId}\`,
        planId: activeRoutingPlan.id,
        shipmentUniqueKey: \`\${companyCode}_\${ctrcId}\`,
        ctrcId: ctrcId,
        planningDate: planningDate,
        companyCode: companyCode,
        suggestedRoute: updatedItem.suggestedRoute || undefined,
        operationalRoute: updatedItem.operationalRoute || undefined,
        planningStatus: updatedItem.planningStatus || 'A_PLANEJAR',
        manualPriority: updatedItem.manualPriority || undefined,
        operationalNote: updatedItem.operationalNote || undefined,
        vehicleId: updatedItem.vehicleId || undefined,
        vehiclePlate: updatedItem.vehiclePlate || undefined,
        driverName: updatedItem.driverName || undefined,
        helperName: updatedItem.helperName || undefined,
        lockedByUser: updatedItem.lockedByUser ? String(updatedItem.lockedByUser) : undefined,
        updatedBy: adminUser?.username || 'admin',
      };
      
      // Enqueue sync operation
      await addToSyncQueue('route_planning_item', 'UPDATE', remoteItem);
      
      // Trigger queue processing asynchronously (fire and forget)
      syncQueueRepository.processSyncQueue().catch(err => {
        console.warn('[RoutingPlanService] Background sync failed:', err);
      });
    }

    return updatedItem;
  }`;

code = code.replace(oldUpsert, newUpsert);

fs.writeFileSync('src/application/services/RoutingPlanService.ts', code);
