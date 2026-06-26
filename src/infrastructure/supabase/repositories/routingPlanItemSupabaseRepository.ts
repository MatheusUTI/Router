import { getSupabaseClient, checkSupabaseHealth } from "../client";

export interface RoutingPlanItem {
  id: string;
  planId: string;
  shipmentUniqueKey?: string;
  ctrcId: string;
  planningDate: string;
  companyCode: string;
  suggestedRoute?: string;
  operationalRoute?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverName?: string;
  helperName?: string;
  planningStatus: string;
  manualPriority?: string;
  operationalNote?: string;
  lockedByUser?: string;
  updatedBy?: string;
  rawPayload?: any;
  createdAt?: string;
  updatedAt?: string;
}

function mapToDb(item: Partial<RoutingPlanItem>): any {
  const db: any = {};
  if (item.id !== undefined) db.id = item.id;
  if (item.planId !== undefined) db.plan_id = item.planId;
  if (item.shipmentUniqueKey !== undefined) db.shipment_unique_key = item.shipmentUniqueKey;
  if (item.ctrcId !== undefined) db.ctrc_id = item.ctrcId;
  if (item.planningDate !== undefined) db.planning_date = item.planningDate;
  if (item.companyCode !== undefined) db.company_code = item.companyCode;
  if (item.suggestedRoute !== undefined) db.suggested_route = item.suggestedRoute;
  if (item.operationalRoute !== undefined) db.operational_route = item.operationalRoute;
  if (item.vehicleId !== undefined) db.vehicle_id = item.vehicleId;
  if (item.vehiclePlate !== undefined) db.vehicle_plate = item.vehiclePlate;
  if (item.driverName !== undefined) db.driver_name = item.driverName;
  if (item.helperName !== undefined) db.helper_name = item.helperName;
  if (item.planningStatus !== undefined) db.planning_status = item.planningStatus;
  if (item.manualPriority !== undefined) db.manual_priority = item.manualPriority;
  if (item.operationalNote !== undefined) db.operational_note = item.operationalNote;
  if (item.lockedByUser !== undefined) db.locked_by_user = item.lockedByUser;
  if (item.updatedBy !== undefined) db.updated_by = item.updatedBy;
  if (item.rawPayload !== undefined) db.raw_payload = item.rawPayload;
  if (item.createdAt !== undefined) db.created_at = item.createdAt;
  if (item.updatedAt !== undefined) db.updated_at = item.updatedAt;
  return db;
}

function mapFromDb(db: any): RoutingPlanItem {
  return {
    id: db.id,
    planId: db.plan_id,
    shipmentUniqueKey: db.shipment_unique_key,
    ctrcId: db.ctrc_id,
    planningDate: db.planning_date,
    companyCode: db.company_code,
    suggestedRoute: db.suggested_route,
    operationalRoute: db.operational_route,
    vehicleId: db.vehicle_id,
    vehiclePlate: db.vehicle_plate,
    driverName: db.driver_name,
    helperName: db.helper_name,
    planningStatus: db.planning_status,
    manualPriority: db.manual_priority,
    operationalNote: db.operational_note,
    lockedByUser: db.locked_by_user,
    updatedBy: db.updated_by,
    rawPayload: db.raw_payload,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const routingPlanItemSupabaseRepository = {
  async getItemsByPlan(
    planId: string
  ): Promise<{ data: RoutingPlanItem[] | null; success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, data: null, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, data: null, error: "Supabase network offline" };

    try {
      const { data, error } = await client
        .from("routing_plan_items")
        .select("*")
        .eq("plan_id", planId);

      if (error) throw error;
      return { success: true, data: (data || []).map(mapFromDb) };
    } catch (err) {
      console.error("Error fetching routing plan items from Supabase:", err);
      return { success: false, data: null, error: err };
    }
  },

  async upsertItem(
    item: RoutingPlanItem
  ): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, error: "Supabase network offline" };

    try {
      const dbItem = mapToDb(item);
      const { error } = await client
        .from("routing_plan_items")
        .upsert(dbItem, { onConflict: "plan_id,ctrc_id" });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error upserting routing plan item in Supabase:", err);
      return { success: false, error: err };
    }
  },

  async upsertItems(
    items: RoutingPlanItem[]
  ): Promise<{ success: boolean; error?: any }> {
    if (items.length === 0) return { success: true };

    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, error: "Supabase network offline" };

    try {
      const dbItems = items.map(mapToDb);
      const { error } = await client
        .from("routing_plan_items")
        .upsert(dbItems, { onConflict: "plan_id,ctrc_id" });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error upserting routing plan items in Supabase:", err);
      return { success: false, error: err };
    }
  },

  async deleteLogicalOrDetachItem(
    planId: string,
    ctrcId: string
  ): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, error: "Supabase network offline" };

    try {
      const { error } = await client
        .from("routing_plan_items")
        .update({
          planning_status: 'EXCLUIDO',
          updated_at: new Date().toISOString(),
        })
        .eq("plan_id", planId)
        .eq("ctrc_id", ctrcId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error logically deleting/detaching routing plan item in Supabase:", err);
      return { success: false, error: err };
    }
  }
};
