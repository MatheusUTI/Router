import { SswCapabilityId, SswIncident, SswIncidentStatus } from '../../../src/integrations/ssw/types/capabilities';

export interface IncidentFilter {
  status?: SswIncidentStatus;
  capability?: SswCapabilityId;
}

/**
 * Porta de armazenamento de incidentes de integração.
 */
export interface IncidentStorePort {
  get(id: string): Promise<SswIncident | null>;
  list(filter?: IncidentFilter): Promise<SswIncident[]>;
  save(incident: SswIncident): Promise<void>;
  findActiveByCapabilityAndError(
    capability: SswCapabilityId,
    errorSubstring: string
  ): Promise<SswIncident | null>;
}

/**
 * Implementação em memória da porta de incidentes.
 */
export class InMemoryIncidentStore implements IncidentStorePort {
  private readonly store = new Map<string, SswIncident>();

  async get(id: string): Promise<SswIncident | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async list(filter?: IncidentFilter): Promise<SswIncident[]> {
    let items = Array.from(this.store.values());

    if (filter?.status) {
      items = items.filter((i) => i.status === filter.status);
    }
    if (filter?.capability) {
      items = items.filter((i) => i.capability === filter.capability);
    }

    return items.map((i) => ({ ...i }));
  }

  async save(incident: SswIncident): Promise<void> {
    this.store.set(incident.id, { ...incident });
  }

  async findActiveByCapabilityAndError(
    capability: SswCapabilityId,
    errorSubstring: string
  ): Promise<SswIncident | null> {
    const normalizedQuery = errorSubstring.trim().toLowerCase();
    for (const incident of this.store.values()) {
      if (
        incident.capability === capability &&
        (incident.status === SswIncidentStatus.OPEN || incident.status === SswIncidentStatus.MANUAL_REQUIRED)
      ) {
        const incidentError = incident.lastError.trim().toLowerCase();
        if (incidentError === normalizedQuery || incidentError.includes(normalizedQuery) || normalizedQuery.includes(incidentError)) {
          return { ...incident };
        }
      }
    }
    return null;
  }
}
