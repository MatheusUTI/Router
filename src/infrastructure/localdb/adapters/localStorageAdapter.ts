import { db, RomaneioSave } from '../db';
import { 
  initialVehicles, 
  initialDrivers, 
  initialAvailableCtrcs, 
  initialLinkedCtrcs, 
  initialDeliveryOccurrences,
  initialCidadesRotas,
  initialCurvaAClients
} from '../../../data';

/**
 * Adapter responsável por migrar de forma incremental e segura 
 * os dados legados do localStorage para o IndexedDB resiliente.
 * Conserva dados dos usuários existentes e popula novos bancos vazios (seeding).
 */
export async function runCompatibilityMigration(): Promise<{
  migratedRomaneios: number;
  seededVehicles: number;
  seededDrivers: number;
  seededCtrcs: number;
}> {
  const result = {
    migratedRomaneios: 0,
    seededVehicles: 0,
    seededDrivers: 0,
    seededCtrcs: 0,
  };

  try {
    // 1. Migração de Romaneios Salvos (Histórico) do localStorage
    const migratedKey = 'rota_operational_saved_romaneios_migrated_v1';
    const hasAlreadyMigrated = localStorage.getItem(migratedKey) === 'true';

    if (!hasAlreadyMigrated) {
      const legacyRomaneiosStr = localStorage.getItem('saved_romaneios');
      if (legacyRomaneiosStr) {
        try {
          const legacyRomaneios = JSON.parse(legacyRomaneiosStr);
          if (Array.isArray(legacyRomaneios) && legacyRomaneios.length > 0) {
            // Bulk insert ignorando conflitos
            for (const rom of legacyRomaneios) {
              if (rom && rom.id) {
                const romaneioSave: RomaneioSave = {
                  id: String(rom.id),
                  date: rom.date || '24/05/2026',
                  vehicleId: rom.vehicleId || rom.vehiclePlate || 'ABC1234',
                  vehiclePlate: rom.vehiclePlate || rom.vehicleId || 'ABC1234',
                  driverName: rom.driverName || 'Operador não designado',
                  helperName: rom.helperName || '',
                  ctrcs: Array.isArray(rom.ctrcs) ? rom.ctrcs : [],
                  observations: rom.observations || '',
                  isSyncedWithCloud: !!rom.isSyncedWithCloud,
                };
                await db.savedRomaneios.put(romaneioSave);
                result.migratedRomaneios++;
              }
            }
          }
        } catch (e) {
          console.error('[Adapter] Falha ao analisar JSON legado de saved_romaneios:', e);
        }
      }
      // Marcar migração como realizada para evitar loops, mantendo o localStorage intacto para segurança reversível
      localStorage.setItem(migratedKey, 'true');
    }

    // 2. Seeding de Frota / Veículos (Se vazio)
    const vehiclesCount = await db.vehicles.count();
    if (vehiclesCount === 0) {
      for (const v of initialVehicles) {
        await db.vehicles.put(v);
        result.seededVehicles++;
      }
    }

    // 3. Seeding de Motoristas (Se vazio)
    const driversCount = await db.drivers.count();
    if (driversCount === 0) {
      for (const d of initialDrivers) {
        await db.drivers.put(d);
        result.seededDrivers++;
      }
    }

    // 4. Seeding de CTRCs iniciais (Disponíveis e Roteirizados ativos, Se vazio)
    const ctrcsCount = await db.ctrcs.count();
    if (ctrcsCount === 0) {
      // Unir CTRCs pendentes e associadas padrão para termos massa inicial offline consistente
      const allSeedCtrcs = [...initialAvailableCtrcs, ...initialLinkedCtrcs];
      for (const c of allSeedCtrcs) {
        await db.ctrcs.put(c);
        result.seededCtrcs++;
      }
    }

    // 5. Seeding de Ocorrências padrão (Se vazio)
    const occurrencesCount = await db.occurrences.count();
    if (occurrencesCount === 0) {
      for (const o of initialDeliveryOccurrences) {
        await db.occurrences.put(o);
      }
    }

    // 6. Seeding de Cidades e Rotas (Se vazio)
    const cidadesRotasCount = await db.cidades_rotas.count();
    if (cidadesRotasCount === 0) {
      for (const cr of initialCidadesRotas) {
        const payload: any = { ...cr };
        // Dexie will generate auto-increment id if it's undefined
        delete payload.id;
        await db.cidades_rotas.put(payload);
      }
    }

    // 7. Seeding de Clientes Curva A (Se vazio)
    const curvaACount = await db.curva_a_clients.count();
    if (curvaACount === 0) {
      for (const ca of initialCurvaAClients) {
        await db.curva_a_clients.put({
          curva_a: ca.curva_a,
          cnpj_remetente: ca.cnpj_remetente,
          cliente_remetente: ca.cliente_remetente
        } as any);
      }
    }

    console.log('[Adapter] Migração e Semeamento inteligente concluídos:', result);

  } catch (err) {
    console.error('[Adapter] Erro na camada de compatibilidade do adaptador local:', err);
  }

  return result;
}
