const fs = require('fs');
let code = fs.readFileSync('src/infrastructure/localdb/repositories/preRomaneioRepository.ts', 'utf-8');

const oldUpdateStatus = `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      if (status === 'CANCELADO') {
        await preRomaneioSupabaseRepository.cancelPreRomaneio(id, updated.cancelledBy, updated.cancelReason);
      } else {
        await preRomaneioSupabaseRepository.upsertPreRomaneio(updated, companyCode);
      }
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar status no Supabase:', err);
    }`;

const newUpdateStatus = `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      if (status === 'CANCELADO') {
        await addToSyncQueue('pre_romaneio', 'DELETE', { 
          action: 'cancel', 
          id, 
          cancelledBy: updated.cancelledBy, 
          cancelReason: updated.cancelReason 
        });
      } else {
        await addToSyncQueue('pre_romaneio', 'UPDATE', { item: updated, companyCode });
      }
      SyncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar atualização de status:', err);
    }`;

code = code.replace(oldUpdateStatus, newUpdateStatus);

const oldUpdateAssignment = `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await preRomaneioSupabaseRepository.upsertPreRomaneio(updated, companyCode);
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar atribuição no Supabase:', err);
    }`;

const newUpdateAssignment = `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'UPDATE', { item: updated, companyCode });
      SyncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar atualização de atribuição:', err);
    }`;

code = code.replace(oldUpdateAssignment, newUpdateAssignment);

fs.writeFileSync('src/infrastructure/localdb/repositories/preRomaneioRepository.ts', code);
