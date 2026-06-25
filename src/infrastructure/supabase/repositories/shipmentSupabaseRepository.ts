import { getSupabaseClient, checkSupabaseHealth } from "../client";

export interface Shipment {
  id: string;
  company_code: string;
  ctrc_number: string;
  ctrc_series: string;
  unique_key: string;
  issue_date?: string;
  forecast_delivery_date?: string;
  unit_arrival_date?: string;
  delivery_date?: string;
  sender_name?: string;
  recipient_name?: string;
  payer_name?: string;
  destination_city?: string;
  destination_state?: string;
  total_value?: number;
  weight?: number;
  volume_count?: number;
  status?: string;
  is_delivered?: boolean;
  is_curve_a?: boolean;
  is_critical_client?: boolean;
  last_import_batch_id?: string;
  raw_payload?: any;
  created_at?: string;
  updated_at?: string;
}

export const shipmentSupabaseRepository = {
  async upsertShipments(
    shipments: Shipment[],
  ): Promise<{ success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client)
      return { success: false, error: "Supabase offline" };

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, error: "Supabase network offline" };

    try {
      const { error } = await client.from("shipments").upsert(shipments, {
        onConflict: "unique_key",
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error upserting shipments to Supabase:", err);
      return { success: false, error: err };
    }
  },

  async getRecentShipments(
    days: number = 31,
  ): Promise<{ data: Shipment[] | null; success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client)
      return { success: false, data: null, error: "Supabase offline" };

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, data: null, error: "Supabase network offline" };

    try {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      const dateIso = dateLimit.toISOString();
      const { data, error } = await client
        .from("shipments")
        .select("*")
        .or(
          `issue_date.gte.${dateIso},forecast_delivery_date.gte.${dateIso},created_at.gte.${dateIso}`,
        )
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error("Error fetching recent shipments from Supabase:", err);
      return { success: false, data: null, error: err };
    }
  },

  async softDeleteShipment(
    uniqueKey: string,
  ): Promise<{ success: boolean; error?: any }> {
    const { client, isOnline } = getSupabaseClient();
    if (!isOnline || !client)
      return { success: false, error: "Supabase offline" };

    const isActuallyOnline = await checkSupabaseHealth();
    if (!isActuallyOnline)
      return { success: false, error: "Supabase network offline" };

    try {
      const { error } = await client
        .from("shipments")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq("unique_key", uniqueKey);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error soft deleting shipment in Supabase:", err);
      return { success: false, error: err };
    }
  },
};
