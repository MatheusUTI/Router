const fs = require('fs');
let code = fs.readFileSync('src/infrastructure/localdb/repositories/preRomaneioRepository.ts', 'utf-8');

code = code.replace(/await preRomaneioSupabaseRepository\.cancelPreRomaneio\(id, updated\.cancelledBy, updated\.cancelReason\);/g, "await addToSyncQueue('pre_romaneio', 'DELETE', { action: 'cancel', id, cancelledBy: updated.cancelledBy, cancelReason: updated.cancelReason });");
code = code.replace(/await preRomaneioSupabaseRepository\.upsertPreRomaneio\(updated, companyCode\);/g, "await addToSyncQueue('pre_romaneio', 'UPDATE', { item: updated, companyCode });");

code = code.replace(/console\.warn\('\\[PreRomaneioRepository\\] Erro ao sincronizar status no Supabase:', err\);/g, "console.warn('[PreRomaneioRepository] Erro ao agendar atualização de status:', err);");
code = code.replace(/console\.warn\('\\[PreRomaneioRepository\\] Erro ao sincronizar atribuição no Supabase:', err\);/g, "console.warn('[PreRomaneioRepository] Erro ao agendar atualização de atribuição:', err);");

fs.writeFileSync('src/infrastructure/localdb/repositories/preRomaneioRepository.ts', code);
