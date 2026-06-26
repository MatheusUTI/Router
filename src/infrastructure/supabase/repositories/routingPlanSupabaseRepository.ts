import { getSupabaseClient, checkSupabaseHealth } from "../client";

export interface RoutingPlan {
  id: string;
  companyCode: string;
  planningDate: string;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapToDb(plan: Partial<RoutingPlan>): any {
  const db: any = {};
  if (plan.id !== undefined) db.id = plan.id;
  if (plan.companyCode !== undefined) db.company_code = plan.companyCode;
  if (plan.planningDate !== undefined) db.planning_date = plan.planningDate;
  if (plan.status !== undefined) db.status = plan.status;
  if (plan.createdBy !== undefined) db.created_by = plan.createdBy;
  if (plan.updatedBy !== undefined) db.updated_by = plan.updatedBy;
  if (plan.createdAt !== undefined) db.created_at = plan.createdAt;
  if (plan.updatedAt !== undefined) db.updated_at = plan.updatedAt;
  return db;
}

function mapFromDb(db: any): RoutingPlan {
  return {
    id: db.id,
    companyCode: db.company_code,
    planningDate: db.planning_date,
    status: db.status,
    createdBy: db.created_by,
    updatedBy: db.updated_by,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export const routingPlanSupabaseRepository = {
  async getPlan(
    companyCode: string,
    planningDate: string
  ): Promise<{ data: RoutingPlan | null; success: boolean; error?: any }> {
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
        .from("routing_plans")
        .select("*")
        .eq("company_code", companyCode)
        .eq("planning_date", planningDate)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: true, data: null };
      return { success: true, data: mapFromDb(data) };
    } catch (err) {
      console.error("Error fetching routing plan from Supabase:", err);
      return { success: false, data: null, error: err };
    }
  },

  async getOrCreatePlan(
    companyCode: string,
    planningDate: string,
    username: string
  ): Promise<{ data: RoutingPlan | null; success: boolean; error?: any }> {
    const getRes = await this.getPlan(companyCode, planningDate);
    if (getRes.success && getRes.data) {
      return getRes;
    }
    // If getting failed due to offline status or network errors, bubble it up
    if (!getRes.success && getRes.error) {
      return { success: false, data: null, error: getRes.error };
    }

    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, data: null, error: "Supabase offline" };
    }

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, data: null, error: "Supabase network offline" };

    const newPlan: RoutingPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyCode,
      planningDate,
      status: 'EM_MONTAGEM',
      createdBy: username,
      updatedBy: username,
    };

    try {
      const dbPlan = mapToDb(newPlan);
      const { data, error } = await client
        .from("routing_plans")
        .insert(dbPlan)
        .select("*")
        .single();

      if (error) {
        // Handle race conditions where another user just created the plan
        if (error.code === '23505') {
          return this.getPlan(companyCode, planningDate);
        }
        throw error;
      }

      return { success: true, data: mapFromDb(data) };
    } catch (err) {
      console.error("Error creating routing plan in Supabase:", err);
      return { success: false, data: null, error: err };
    }
  },

  async updatePlanStatus(
    planId: string,
    status: string,
    username: string
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
        .from("routing_plans")
        .update({
          status,
          updated_by: username,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error updating routing plan status in Supabase:", err);
      return { success: false, error: err };
    }
  }
};
