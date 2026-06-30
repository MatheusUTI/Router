import { getSupabaseClient, checkSupabaseHealth } from "../client";
import { PreRomaneio } from "../../../types";
import { systemLogService } from "../../../services/systemLogService";

function mapToDb(item: PreRomaneio, companyCode: string): any {
  return {
    id: item.id,
    planning_date: item.planningDate,
    company_code: companyCode,
    route: item.route,
    gate: item.gate || null,
    status: item.status,
    plan_id: item.planId || null,
    vehicle_plate: item.vehiclePlate || null,
    driver_name: item.driverName || null,
    helper_name: item.helperName || null,
    total_weight: item.totalWeight || 0,
    total_volumes: item.totalVolumes || 0,
    total_value: item.totalValue || 0,
    total_frete: item.totalFrete || 0,
    created_by: item.createdBy || null,
    updated_by: item.createdBy || null,
    notes: item.notes || null,
    observations: item.observations || null,
    import_batch_id: item.importBatchId || null,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
    cancelled_at: item.cancelledAt || null,
    cancelled_by: item.cancelledBy || null,
    cancel_reason: item.cancelReason || null
  };
}

function mapFromDb(db: any, ctrcIds: string[]): PreRomaneio {
  return {
    id: db.id,
    planningDate: db.planning_date,
    route: db.route,
    gate: db.gate || '',
    status: db.status as any,
    ctrcIds: ctrcIds,
    totalWeight: Number(db.total_weight || 0),
    totalVolumes: Number(db.total_volumes || 0),
    totalValue: Number(db.total_value || 0),
    totalFrete: Number(db.total_frete || 0),
    createdBy: db.created_by || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    cancelledAt: db.cancelled_at || undefined,
    cancelledBy: db.cancelled_by || undefined,
    cancelReason: db.cancel_reason || undefined,
    notes: db.notes || undefined,
    vehiclePlate: db.vehicle_plate || undefined,
    driverName: db.driver_name || undefined,
    helperName: db.helper_name || undefined,
    observations: db.observations || undefined,
    importBatchId: db.import_batch_id || undefined,
    planId: db.plan_id || undefined
  };
}

export const preRomaneioSupabaseRepository = {
  async getPreRomaneiosByPlan(
    planId: string
  ): Promise<{ data: PreRomaneio[] | null; success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, data: null, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline) {
      systemLogService.logWarn('Sync', 'Supabase network offline durante getPreRomaneiosByPlan.');
      return { success: false, data: null, error: "Supabase network offline" };
    }

    try {
      const { data: pres, error } = await client
        .from("pre_romaneios")
        .select("*")
        .eq("plan_id", planId);

      if (error) throw error;
      if (!pres || pres.length === 0) return { success: true, data: [] };

      const preIds = pres.map((p) => p.id);
      const itemsMap = await this.getPreRomaneioItems(preIds);

      const mappedPres = pres.map((p) => mapFromDb(p, itemsMap[p.id] || []));
      return { success: true, data: mappedPres };
    } catch (err) {
      console.error("Error fetching pre-romaneios by plan:", err);
      return { success: false, data: null, error: err };
    }
  },

  async getPreRomaneioItems(preRomaneioIds: string[]): Promise<Record<string, string[]>> {
    if (preRomaneioIds.length === 0) return {};
    try {
      const client = getSupabaseClient();
      const { data: items, error } = await client
        .from("pre_romaneio_items")
        .select("*")
        .in("pre_romaneio_id", preRomaneioIds);

      if (error) throw error;
      const itemsMap: Record<string, string[]> = {};
      (items || []).forEach((it: any) => {
        if (!itemsMap[it.pre_romaneio_id]) {
          itemsMap[it.pre_romaneio_id] = [];
        }
        itemsMap[it.pre_romaneio_id].push(it.ctrc_id);
      });
      return itemsMap;
    } catch (err) {
      console.error("Error fetching pre_romaneio_items:", err);
      return {};
    }
  },

  async getPreRomaneiosByDateAndUnit(
    companyCode: string,
    date: string
  ): Promise<{ data: PreRomaneio[] | null; success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, data: null, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline) {
      systemLogService.logWarn('Sync', 'Supabase network offline durante getPreRomaneiosByDateAndUnit.');
      return { success: false, data: null, error: "Supabase network offline" };
    }

    try {
      const { data: pres, error } = await client
        .from("pre_romaneios")
        .select("*")
        .eq("company_code", companyCode)
        .eq("planning_date", date);

      if (error) {
        systemLogService.logError('Sync', `Erro na query pre_romaneios (${companyCode}, ${date})`, error);
        throw error;
      }
      if (!pres || pres.length === 0) {
        return { success: true, data: [] };
      }

      const preIds = pres.map((p) => p.id);

      const { data: items, error: itemsError } = await client
        .from("pre_romaneio_items")
        .select("*")
        .in("pre_romaneio_id", preIds);

      if (itemsError) {
         systemLogService.logError('Sync', `Erro na query pre_romaneio_items`, itemsError);
         throw itemsError;
      }

      const itemsMap: Record<string, string[]> = {};
      (items || []).forEach((it) => {
        if (!itemsMap[it.pre_romaneio_id]) {
          itemsMap[it.pre_romaneio_id] = [];
        }
        itemsMap[it.pre_romaneio_id].push(it.ctrc_id);
      });

      const mappedPres = pres.map((p) => mapFromDb(p, itemsMap[p.id] || []));
      systemLogService.logSuccess('Sync', `Recuperados ${mappedPres.length} pre-romaneios (${companyCode}, ${date}).`);
      return { success: true, data: mappedPres };
    } catch (err) {
      console.error("Error fetching pre-romaneios from Supabase:", err);
      return { success: false, data: null, error: err };
    }
  },

  async syncPreRomaneioItems(
    preRomaneioId: string,
    ctrcIds: string[],
    companyCode: string
  ): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: "Supabase offline" };
    }

    try {
      const { error: deleteError } = await client
        .from("pre_romaneio_items")
        .delete()
        .eq("pre_romaneio_id", preRomaneioId);

      if (deleteError) throw deleteError;

      if (ctrcIds.length > 0) {
        const dbItems = ctrcIds.map((ctrcId) => ({
          id: `${preRomaneioId}_${ctrcId}`,
          pre_romaneio_id: preRomaneioId,
          ctrc_id: ctrcId,
          shipment_unique_key: `${companyCode}_${ctrcId}`
        }));

        const { error: insertError } = await client
          .from("pre_romaneio_items")
          .insert(dbItems);

        if (insertError) throw insertError;
      }
      return { success: true };
    } catch (err) {
      console.error("Error syncing pre_romaneio_items:", err);
      return { success: false, error: err };
    }
  },

  async cancelPreRomaneio(
    preRomaneioId: string,
    username?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline) {
      systemLogService.logWarn('Sync', 'Supabase network offline durante cancelPreRomaneio.');
      return { success: false, error: "Supabase network offline" };
    }

    try {
      const { data: pres, error: fetchError } = await client
        .from("pre_romaneios")
        .select("plan_id")
        .eq("id", preRomaneioId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const now = new Date().toISOString();
      const { error: updateError } = await client
        .from("pre_romaneios")
        .update({
          status: 'CANCELADO',
          cancelled_at: now,
          cancelled_by: username || null,
          cancel_reason: reason || null,
          updated_at: now
        })
        .eq("id", preRomaneioId);

      if (updateError) throw updateError;

      if (pres?.plan_id) {
        const itemsMap = await this.getPreRomaneioItems([preRomaneioId]);
        const ctrcIds = itemsMap[preRomaneioId] || [];
        
        if (ctrcIds.length > 0) {
          const { error: planUpdateError } = await client
            .from("routing_plan_items")
            .update({
              planning_status: 'A_PLANEJAR',
              updated_at: now,
              updated_by: username || null
            })
            .eq("plan_id", pres.plan_id)
            .in("ctrc_id", ctrcIds);

          if (planUpdateError) {
             console.warn('[Supabase] Erro ao reverter status em routing_plan_items:', planUpdateError);
          }
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Error cancelling pre-romaneio:", err);
      return { success: false, error: err };
    }
  },

  async upsertPreRomaneio(
    item: PreRomaneio,
    companyCode: string
  ): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline) {
      systemLogService.logWarn('Sync', 'Supabase network offline durante upsertPreRomaneio.');
      return { success: false, error: "Supabase network offline" };
    }

    try {
      const dbPre = mapToDb(item, companyCode);
      const { error } = await client
        .from("pre_romaneios")
        .upsert(dbPre, { onConflict: "id" });

      if (error) {
         systemLogService.logError('Sync', `Erro no upsert de pre_romaneios (${item.id})`, error);
         throw error;
      }

      const { error: deleteError } = await client
        .from("pre_romaneio_items")
        .delete()
        .eq("pre_romaneio_id", item.id);

      if (deleteError) {
         systemLogService.logError('Sync', `Erro ao deletar pre_romaneio_items antigos (${item.id})`, deleteError);
         throw deleteError;
      }

      if (item.ctrcIds && item.ctrcIds.length > 0) {
        const dbItems = item.ctrcIds.map((ctrcId) => ({
          id: `${item.id}_${ctrcId}`,
          pre_romaneio_id: item.id,
          ctrc_id: ctrcId,
          shipment_unique_key: `${companyCode}_${ctrcId}`
        }));

        const { error: insertError } = await client
          .from("pre_romaneio_items")
          .insert(dbItems);

        if (insertError) throw insertError;
      }

      if (item.planId && item.ctrcIds && item.ctrcIds.length > 0) {
        let planningStatus = 'PLANEJADO';
        if (item.status === 'CONVERTIDO_ROMANEIO') {
          planningStatus = 'CONSOLIDADO';
        } else if (item.status === 'CANCELADO') {
          planningStatus = 'A_PLANEJAR';
        } else if (item.status === 'EM_SEPARACAO' || item.status === 'SEPARADO') {
          planningStatus = 'EM_SEPARACAO';
        }

        const { error: updatePlanError } = await client
          .from("routing_plan_items")
          .update({
            planning_status: planningStatus,
            operational_route: item.status !== 'CANCELADO' ? item.route : null,
            updated_by: item.createdBy || null,
            updated_at: new Date().toISOString(),
          })
          .eq("plan_id", item.planId)
          .in("ctrc_id", item.ctrcIds);

        if (updatePlanError) {
          console.warn('[Supabase] Erro ao atualizar status em routing_plan_items:', updatePlanError);
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Error upserting pre-romaneio on Supabase:", err);
      return { success: false, error: err };
    }
  },

  async upsertPreRomaneios(
    items: PreRomaneio[],
    companyCode: string
  ): Promise<{ success: boolean; error?: any }> {
    for (const item of items) {
      const res = await this.upsertPreRomaneio(item, companyCode);
      if (!res.success) {
        return res;
      }
    }
    return { success: true };
  }
};
