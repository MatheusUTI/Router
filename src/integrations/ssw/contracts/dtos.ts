import { SswCapabilityId, SswCapabilityStatus, SswCircuitState, SswIncident } from '../types/capabilities';

/**
 * Resumo seguro do status de integração SSW exposto para diagnóstico e monitoramento na UI.
 * Não expõe segredos, cookies ou credenciais.
 */
export interface SswHealthSummaryDTO {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  activeCapabilities: number;
  totalCapabilities: number;
  openCircuits: number;
  activeIncidentsCount: number;
  capabilities: Array<{
    id: SswCapabilityId;
    status: SswCapabilityStatus;
    confidence: number;
    circuitState: SswCircuitState;
    failureCount: number;
    lastSuccess?: string;
    lastFailure?: string;
  }>;
  recentIncidents: SswIncident[];
  timestamp: string;
}

/**
 * Requisição padronizada para consulta de status ou diagnóstico de capability.
 */
export interface SswCapabilityQueryDTO {
  capabilityId?: SswCapabilityId;
}
