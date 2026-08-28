const fs = require('fs');
let code = fs.readFileSync('src/infrastructure/localdb/repositories/syncQueueRepository.ts', 'utf-8');

const additionalImports = `
      const { routingPlanItemSupabaseRepository } = await import("../../supabase/repositories/routingPlanItemSupabaseRepository");
      const { preRomaneioSupabaseRepository } = await import("../../supabase/repositories/preRomaneioSupabaseRepository");
`;

code = code.replace(
  'const { shipmentSupabaseRepository } =\n        await import("../../supabase/repositories/shipmentSupabaseRepository");',
  'const { shipmentSupabaseRepository } =\n        await import("../../supabase/repositories/shipmentSupabaseRepository");' + additionalImports
);

const newLogic = `
          } else if (item.entity === "route_planning_item" && item.operation === "UPDATE") {
            const res = await routingPlanItemSupabaseRepository.upsertItem(item.payload);
            success = res.success;
            errorObj = res.error;
          } else if (item.entity === "pre_romaneio" && (item.operation === "CREATE" || item.operation === "UPDATE")) {
            // For pre_romaneio payload contains { preRomaneio: ..., companyCode: ... }
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
             // Deletes are usually marked as 'cancel'
             try {
                await preRomaneioSupabaseRepository.cancelPreRomaneio(item.payload.id, item.payload.cancelledBy, item.payload.cancelReason);
                success = true;
             } catch (err: any) {
                success = false;
                errorObj = err;
             }
`;

code = code.replace('} else {', newLogic + '} else {');

fs.writeFileSync('src/infrastructure/localdb/repositories/syncQueueRepository.ts', code);
