import { SswCapabilityId, SswIncident, SswIncidentStatus } from '../../../src/integrations/ssw/types/capabilities';
import { IncidentStorePort, InMemoryIncidentStore } from './incidentStorePort';

export interface IncidentContext {
  previousEndpoint?: string;
  autoRecovery?: boolean;
}

export class SswIncidentAggregator {
  private readonly store: IncidentStorePort;
  private readonly nowProvider: () => string;
  private idCounter = 1;

  constructor(
    store: IncidentStorePort = new InMemoryIncidentStore(),
    nowProvider: () => string = () => new Date().toISOString()
  ) {
    this.store = store;
    this.nowProvider = nowProvider;
  }

  private generateId(capability: SswCapabilityId): string {
    const timestamp = Date.now();
    return `INC-${capability}-${timestamp}-${this.idCounter++}`;
  }

  /**
   * Registra uma falha. Se já houver um incidente aberto correspondente à mesma capability
   * e assinatura de erro, agrega a tentativa e atualiza timestamps. Caso contrário, abre um novo incidente.
   */
  async recordIncident(
    capability: SswCapabilityId,
    error: string,
    context?: IncidentContext
  ): Promise<SswIncident> {
    const now = this.nowProvider();
    const existing = await this.store.findActiveByCapabilityAndError(capability, error);

    if (existing) {
      const updated: SswIncident = {
        ...existing,
        lastSeen: now,
        attempts: existing.attempts + 1,
        lastError: error,
        previousEndpoint: context?.previousEndpoint ?? existing.previousEndpoint,
        autoRecovery: context?.autoRecovery !== undefined ? context.autoRecovery : existing.autoRecovery
      };
      await this.store.save(updated);
      return updated;
    }

    const newIncident: SswIncident = {
      id: this.generateId(capability),
      capability,
      firstSeen: now,
      lastSeen: now,
      attempts: 1,
      lastError: error,
      autoRecovery: context?.autoRecovery ?? false,
      previousEndpoint: context?.previousEndpoint,
      status: SswIncidentStatus.OPEN
    };

    await this.store.save(newIncident);
    return newIncident;
  }

  /**
   * Marca um incidente como resolvido, opcionalmente associando o novo endpoint descoberto/configurado.
   */
  async resolveIncident(
    incidentId: string,
    newEndpoint?: string
  ): Promise<SswIncident | null> {
    const incident = await this.store.get(incidentId);
    if (!incident) return null;

    const resolved: SswIncident = {
      ...incident,
      status: incident.autoRecovery ? SswIncidentStatus.AUTO_RESOLVED : SswIncidentStatus.RESOLVED,
      newEndpoint: newEndpoint ?? incident.newEndpoint,
      lastSeen: this.nowProvider()
    };

    await this.store.save(resolved);
    return resolved;
  }

  /**
   * Lista todos os incidentes que ainda demandam atenção operacional ou auto-recuperação.
   */
  async listActiveIncidents(): Promise<SswIncident[]> {
    const openItems = await this.store.list({ status: SswIncidentStatus.OPEN });
    const manualItems = await this.store.list({ status: SswIncidentStatus.MANUAL_REQUIRED });
    return [...openItems, ...manualItems];
  }
}
