import { SswCapabilityId, SswCapabilityEntry } from '../../../src/integrations/ssw/types/capabilities';

/**
 * Porta de persistência para o SswCapabilityRegistry.
 * Permite desacoplar o ciclo de vida e armazenamento dos registros (memória, banco, etc.).
 */
export interface RegistryStoragePort {
  load(): Promise<Map<SswCapabilityId, SswCapabilityEntry>>;
  get(capabilityId: SswCapabilityId): Promise<SswCapabilityEntry | null>;
  save(entry: SswCapabilityEntry): Promise<void>;
  saveAll(entries: SswCapabilityEntry[]): Promise<void>;
  delete(capabilityId: SswCapabilityId): Promise<boolean>;
}

/**
 * Implementação em memória da porta de armazenamento do Registry.
 * Usada como fallback padrão no bootstrap e em testes determinísticos.
 */
export class InMemoryRegistryStorage implements RegistryStoragePort {
  private readonly store = new Map<SswCapabilityId, SswCapabilityEntry>();

  constructor(initialEntries?: SswCapabilityEntry[]) {
    if (initialEntries) {
      for (const entry of initialEntries) {
        this.store.set(entry.capabilityId, { ...entry });
      }
    }
  }

  async load(): Promise<Map<SswCapabilityId, SswCapabilityEntry>> {
    const copy = new Map<SswCapabilityId, SswCapabilityEntry>();
    for (const [id, entry] of this.store.entries()) {
      copy.set(id, { ...entry });
    }
    return copy;
  }

  async get(capabilityId: SswCapabilityId): Promise<SswCapabilityEntry | null> {
    const found = this.store.get(capabilityId);
    return found ? { ...found } : null;
  }

  async save(entry: SswCapabilityEntry): Promise<void> {
    this.store.set(entry.capabilityId, { ...entry });
  }

  async saveAll(entries: SswCapabilityEntry[]): Promise<void> {
    for (const entry of entries) {
      this.store.set(entry.capabilityId, { ...entry });
    }
  }

  async delete(capabilityId: SswCapabilityId): Promise<boolean> {
    return this.store.delete(capabilityId);
  }
}
