const fs = require('fs');
let code = fs.readFileSync('src/infrastructure/localdb/repositories/preRomaneioRepository.ts', 'utf-8');

const additionalImports = `
import { addToSyncQueue, syncQueueRepository } from './syncQueueRepository';
`;

code = code.replace(
  "import { preRomaneioSupabaseRepository } from '../../supabase/repositories/preRomaneioSupabaseRepository';",
  additionalImports
);

// Replace put
code = code.replace(
  `  async put(item: PreRomaneio): Promise<string> {
    await db.pre_romaneios.put(item);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await preRomaneioSupabaseRepository.upsertPreRomaneio(item, companyCode);
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar pré-romaneio no Supabase:', err);
    }
    return item.id;
  },`,
  `  async put(item: PreRomaneio): Promise<string> {
    await db.pre_romaneios.put(item);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'UPDATE', { item, companyCode });
      syncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar sync de pré-romaneio:', err);
    }
    return item.id;
  },`
);

// Replace putMany
code = code.replace(
  `  async putMany(items: PreRomaneio[]): Promise<void> {
    await db.pre_romaneios.bulkPut(items);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await preRomaneioSupabaseRepository.upsertPreRomaneios(items, companyCode);
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar pré-romaneios no Supabase:', err);
    }
  },`,
  `  async putMany(items: PreRomaneio[]): Promise<void> {
    await db.pre_romaneios.bulkPut(items);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'CREATE', { action: 'upsertMany', items, companyCode });
      syncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar sync de pré-romaneios:', err);
    }
  },`
);

// Replace delete
code = code.replace(
  `      await db.pre_romaneios.put(cancelled);
      try {
        await preRomaneioSupabaseRepository.cancelPreRomaneio(id, cancelled.cancelledBy, cancelled.cancelReason);
      } catch (err) {
        console.warn('[PreRomaneioRepository] Erro ao marcar como cancelado no Supabase durante remoção:', err);
      }`,
  `      await db.pre_romaneios.put(cancelled);
      try {
        await addToSyncQueue('pre_romaneio', 'DELETE', { 
          action: 'cancel', 
          id, 
          cancelledBy: cancelled.cancelledBy, 
          cancelReason: cancelled.cancelReason 
        });
        syncQueueRepository.processSyncQueue().catch(() => {});
      } catch (err) {
        console.warn('[PreRomaneioRepository] Erro ao agendar cancelamento:', err);
      }`
);

// Replace updateStatus
code = code.replace(
  `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      if (status === 'CANCELADO') {
        await preRomaneioSupabaseRepository.cancelPreRomaneio(id, updated.cancelledBy, updated.cancelReason);
      } else {
        await preRomaneioSupabaseRepository.upsertPreRomaneio(updated, companyCode);
      }
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar status no Supabase:', err);
    }`,
  `    await db.pre_romaneios.put(updated);
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
      syncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar atualização de status:', err);
    }`
);

// Replace updateAssignment
code = code.replace(
  `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await preRomaneioSupabaseRepository.upsertPreRomaneio(updated, companyCode);
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao sincronizar atribuição no Supabase:', err);
    }`,
  `    await db.pre_romaneios.put(updated);
    try {
      const companyCode = localStorage.getItem('user_unit') || 'SPO';
      await addToSyncQueue('pre_romaneio', 'UPDATE', { item: updated, companyCode });
      syncQueueRepository.processSyncQueue().catch(() => {});
    } catch (err) {
      console.warn('[PreRomaneioRepository] Erro ao agendar atualização de atribuição:', err);
    }`
);


fs.writeFileSync('src/infrastructure/localdb/repositories/preRomaneioRepository.ts', code);
