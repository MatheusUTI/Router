const fs = require('fs');
let code = fs.readFileSync('src/infrastructure/localdb/repositories/syncQueueRepository.ts', 'utf-8');

const newProcessSyncQueue = `  async processSyncQueue(): Promise<void> {
    const pendingItems = await this.getPending();
    if (pendingItems.length === 0) return;

    try {
      const { auditLogSupabaseRepository } = await import("../../supabase/repositories/auditLogSupabaseRepository");
      const { shipmentSupabaseRepository } = await import("../../supabase/repositories/shipmentSupabaseRepository");
      const { routingPlanItemSupabaseRepository } = await import("../../supabase/repositories/routingPlanItemSupabaseRepository");
      const { preRomaneioSupabaseRepository } = await import("../../supabase/repositories/preRomaneioSupabaseRepository");
      const { vehicleSupabaseRepository } = await import("../../supabase/repositories/vehicleSupabaseRepository");
      const { syncDriverToSupabase, removeDriverFromSupabase } = await import("../../../supabase");

      for (const item of pendingItems) {
        if (!item.id) continue;
        await db.sync_queue.update(item.id, {
          status: "processing",
          last_attempt_at: new Date().toISOString(),
        });

        try {
          let success = false;
          let errorObj: any = null;

          if (item.entity === "audit_log" && item.operation === "CREATE") {
            const res = await auditLogSupabaseRepository.insertLog(item.payload);
            success = res.success;
            errorObj = res.error;
          } else if (item.entity === "ctrc" && item.operation === "DELETE") {
            const uniqueKey = item.payload?.unique_key || item.payload?.uniqueKey;
            if (uniqueKey) {
              const res = await shipmentSupabaseRepository.softDeleteShipment(uniqueKey);
              success = res.success;
              errorObj = res.error;
            } else if (item.payload?.id && String(item.payload.id).includes("_")) {
              const res = await shipmentSupabaseRepository.softDeleteShipment(item.payload.id);
              success = res.success;
              errorObj = res.error;
            } else {
              errorObj = new Error("unique_key não encontrada no payload");
            }
          } else if (item.entity === "route_planning_item" && item.operation === "UPDATE") {
            const res = await routingPlanItemSupabaseRepository.upsertItem(item.payload);
            success = res.success;
            errorObj = res.error;
          } else if (item.entity === "pre_romaneio" && (item.operation === "CREATE" || item.operation === "UPDATE")) {
            const payload = item.payload;
            try {
              if (payload.action === 'upsertMany') {
                await preRomaneioSupabaseRepository.upsertPreRomaneios(payload.items, payload.companyCode);
              } else if (payload.action === 'cancel') {
                await preRomaneioSupabaseRepository.cancelPreRomaneio(payload.id, payload.cancelledBy, payload.cancelReason);
              } else {
                await preRomaneioSupabaseRepository.upsertPreRomaneio(payload.item, payload.companyCode);
              }
              success = true;
            } catch (err: any) {
              success = false;
              errorObj = err;
            }
          } else if (item.entity === "pre_romaneio" && item.operation === "DELETE") {
             try {
                await preRomaneioSupabaseRepository.cancelPreRomaneio(item.payload.id, item.payload.cancelledBy, item.payload.cancelReason);
                success = true;
             } catch (err: any) {
                success = false;
                errorObj = err;
             }
          } else if (item.entity === "vehicle" && (item.operation === "CREATE" || item.operation === "UPDATE")) {
            const res = await vehicleSupabaseRepository.upsertVehicle(item.payload);
            success = res.success;
            errorObj = res.error;
          } else if (item.entity === "vehicle" && item.operation === "DELETE") {
            success = true; // Fallback MVP
          } else if (item.entity === "driver" && (item.operation === "CREATE" || item.operation === "UPDATE")) {
            success = await syncDriverToSupabase(item.payload);
            if (!success) errorObj = new Error("syncDriverToSupabase failed");
          } else if (item.entity === "driver" && item.operation === "DELETE") {
            success = await removeDriverFromSupabase(item.payload.id);
            if (!success) errorObj = new Error("removeDriverFromSupabase failed");
          } else if (item.entity === "romaneio") {
            // MVP Fallback - saved romaneios are local-first only via export flow
            success = true;
          } else {
            errorObj = new Error(\`Auto-retry not implemented for \${item.entity} / \${item.operation}\`);
          }

          if (success) {
            await this.markAsCompleted(item.id);
          } else {
            await this.markAsFailed(item.id, errorObj?.message || String(errorObj));
          }
        } catch (err: any) {
          await this.markAsFailed(item.id, err.message || String(err));
        }
      }

      await this.cleanupOldItems();
    } catch (err) {
      console.warn("Failed to load dependencies for sync queue processing:", err);
    }
  },`;

const startIndex = code.indexOf('  async processSyncQueue(): Promise<void> {');
const endIndex = code.lastIndexOf('},');
code = code.substring(0, startIndex) + newProcessSyncQueue + '\n' + code.substring(endIndex);

fs.writeFileSync('src/infrastructure/localdb/repositories/syncQueueRepository.ts', code);
