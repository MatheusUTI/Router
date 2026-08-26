import { routingPlanSupabaseRepository } from '../../infrastructure/supabase/repositories/routingPlanSupabaseRepository';
import { routingPlanItemSupabaseRepository, RoutingPlanItem as RemoteRoutingPlanItem } from '../../infrastructure/supabase/repositories/routingPlanItemSupabaseRepository';
import { routePlanningRepository } from '../../infrastructure/repositories';
import { checkSupabaseHealth } from '../../infrastructure/supabase/client';
import { UserPresenceSupabaseRepository } from '../../infrastructure/supabase/repositories/userPresenceSupabaseRepository';
import { RoutePlanningItem } from '../../types';

export class RoutingPlanService {
  /**
   * Synchronizes routing plans between local DB and Supabase.
   * Extracted from RoteirizacaoView.tsx performFullSync to decouple persistence orchestration from the UI.
   */
  async performFullSync(
    companyCode: string,
    username: string,
    planningDate: string,
    activeRoutingPlanId: string | undefined,
    isAdminMaster: boolean,
    adminUserName: string
  ): Promise<{ 
    success: boolean, 
    isOnline: boolean, 
    activeUsers: any[], 
    activePlan: any, 
    items: RoutePlanningItem[] 
  }> {
    
    const isOnline = await checkSupabaseHealth();
    
    if (!isOnline) {
      // Offline fallback: load from local DB
      const localItems = await routePlanningRepository.getByDate(planningDate);
      return { success: true, isOnline: false, activeUsers: [], activePlan: null, items: localItems };
    }

    try {
      // Sync Presence
      await UserPresenceSupabaseRepository.heartbeatPresence({
        id: username,
        username: username,
        name: adminUserName,
        role: isAdminMaster ? 'master' : 'user',
        company_code: companyCode,
        current_view: 'Mesa de Roteirização',
        current_plan_id: activeRoutingPlanId || '',
        status: 'ONLINE'
      });

      const activeUsers = await UserPresenceSupabaseRepository.getActiveUsers();
      
      const planRes = await routingPlanSupabaseRepository.getOrCreatePlan(companyCode, planningDate, username);
      if (!planRes.success || !planRes.data) {
        throw new Error('Failed to create or get plan');
      }
      
      const activePlan = planRes.data;
      const planId = activePlan.id;
      
      const itemsRes = await routingPlanItemSupabaseRepository.getItemsByPlan(planId);
      
      if (itemsRes.success && itemsRes.data) {
        const remoteItems = itemsRes.data;
        
        if (remoteItems.length > 0) {
          const mappedRemoteItems: RoutePlanningItem[] = remoteItems.map((item: RemoteRoutingPlanItem) => ({
            id: `${item.planningDate}_${item.ctrcId}`,
            ctrcId: item.ctrcId,
            planningDate: item.planningDate,
            suggestedRoute: item.suggestedRoute || '',
            operationalRoute: item.operationalRoute,
            manualPriority: item.manualPriority as any,
            planningStatus: (item.planningStatus || 'A_PLANEJAR') as any,
            operationalNote: item.operationalNote,
            vehicleId: item.vehicleId,
            vehiclePlate: item.vehiclePlate,
            driverName: item.driverName,
            helperName: item.helperName,
            lockedByUser: !!item.lockedByUser,
            updatedBy: item.updatedBy,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          }));
          
          await routePlanningRepository.putMany(mappedRemoteItems);
        } else {
          // Empty plan, hydrate from active shipments
          const { shipmentSupabaseRepository } = await import('../../infrastructure/supabase/repositories/shipmentSupabaseRepository');
          const shipmentRes = await shipmentSupabaseRepository.getRecentShipments(31, companyCode, true);
          
          if (shipmentRes.success && shipmentRes.data) {
            const filteredShipments = shipmentRes.data.filter(s => s.raw_payload?.planningDate === planningDate);
            
            const newItemsToSync = filteredShipments.map((shipment) => {
              const ctrcId = shipment.raw_payload?.id || shipment.ctrc_number;
              return {
                id: `${planId}_${ctrcId}`,
                planId: planId,
                shipmentUniqueKey: `${companyCode}_${ctrcId}`,
                ctrcId: ctrcId,
                planningDate: planningDate,
                companyCode: companyCode,
                suggestedRoute: shipment.raw_payload?.setor || undefined,
                planningStatus: 'A_PLANEJAR',
                manualPriority: shipment.raw_payload?.manualPriority || undefined,
                operationalNote: shipment.raw_payload?.operationalNote || undefined,
                updatedBy: username,
              };
            });
            
            if (newItemsToSync.length > 0) {
              const BATCH_SIZE = 500;
              for (let i = 0; i < newItemsToSync.length; i += BATCH_SIZE) {
                await routingPlanItemSupabaseRepository.upsertItems(newItemsToSync.slice(i, i + BATCH_SIZE));
              }
              
              const localRouteItems = newItemsToSync.map((item) => ({
                id: `${item.planningDate}_${item.ctrcId}`,
                ctrcId: item.ctrcId,
                planningDate: item.planningDate,
                suggestedRoute: item.suggestedRoute || '',
                planningStatus: 'A_PLANEJAR' as any,
                updatedBy: username,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));
              
              await routePlanningRepository.putMany(localRouteItems);
            }
          }
        }
        
        // Return unified local cache
        const unifiedItems = await routePlanningRepository.getByDate(planningDate);
        return { success: true, isOnline: true, activeUsers, activePlan, items: unifiedItems };
      }

      return { success: false, isOnline: true, activeUsers, activePlan: null, items: [] };
    } catch (err) {
      console.error('[RoutingPlanService] Sync error:', err);
      // Fallback
      const localItems = await routePlanningRepository.getByDate(planningDate);
      return { success: false, isOnline: true, activeUsers: [], activePlan: null, items: localItems };
    }
  }

  async upsertItem(item: RoutePlanningItem): Promise<{ success: boolean; error?: any }> {
    const { routingPlanItemSupabaseRepository } = await import('../../infrastructure/supabase/repositories/routingPlanItemSupabaseRepository');
    return routingPlanItemSupabaseRepository.upsertItem(item as any);
  }
}
export const routingPlanService = new RoutingPlanService();
