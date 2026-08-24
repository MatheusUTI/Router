import { SswCapabilityId, SswCapabilityStatus } from '../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from './registry/capabilityRegistry';
import { InMemoryRegistryStorage } from './registry/storagePort';
import { SswCircuitBreaker } from './resilience/circuitBreaker';
import { SswRetryPolicy } from './resilience/retryPolicy';
import { SswIncidentAggregator } from './resilience/incidentAggregator';
import { InMemoryIncidentStore } from './resilience/incidentStorePort';
import { SswSessionManager } from './session/sessionManager';
import { SswHttpClient } from './gateways/httpClient';
import { Ssw455RequestGateway } from './gateways/ssw455RequestGateway';
import { SswReportQueueGateway } from './gateways/sswReportQueueGateway';
import { SswReportDownloadGateway } from './gateways/sswReportDownloadGateway';
import { InMemoryJobStore } from './services/jobStorePort';
import { Ssw455Service } from './services/ssw455Service';
import { SSW_SIGNATURES, DEFAULT_KNOWN_ENDPOINTS } from './signatures/sswSignatures';

let globalSswService: Ssw455Service | null = null;
let globalRegistry: SswCapabilityRegistry | null = null;
let globalSessionManager: SswSessionManager | null = null;

/**
 * Inicializa e popula o registro canônico de capacidades SSW com as assinaturas e endpoints conhecidos.
 */
export async function setupSswCapabilityRegistry(): Promise<SswCapabilityRegistry> {
  if (globalRegistry) return globalRegistry;

  const storage = new InMemoryRegistryStorage();
  const registry = new SswCapabilityRegistry(storage);

  for (const [capIdKey, signature] of Object.entries(SSW_SIGNATURES)) {
    const capId = capIdKey as SswCapabilityId;
    const defaultEndpoint = DEFAULT_KNOWN_ENDPOINTS[capId];

    await registry.register({
      capabilityId: capId,
      currentEndpoint: defaultEndpoint?.endpoint,
      httpMethod: defaultEndpoint?.method || signature.expectedMethod,
      signature,
      confidence: defaultEndpoint?.confidence || 0.90,
      status: SswCapabilityStatus.ACTIVE,
      failureCount: 0,
      discoveryDate: new Date().toISOString()
    });
  }

  globalRegistry = registry;
  return registry;
}

/**
 * Retorna o gerenciador global de sessão SSW.
 */
export function getSswSessionManager(): SswSessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SswSessionManager();
  }
  return globalSessionManager;
}

/**
 * Instancia ou retorna o serviço singleton Ssw455Service.
 */
export async function getSsw455Service(): Promise<Ssw455Service> {
  if (globalSswService) return globalSswService;

  const registry = await setupSswCapabilityRegistry();
  const circuitBreaker = new SswCircuitBreaker({
    failureThreshold: 3,
    successThreshold: 2,
    backoffStepsMs: [30000, 120000, 300000] // 30s, 2m, 5m
  });
  const retryPolicy = new SswRetryPolicy({
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    backoffFactor: 2.0
  });
  const incidentStore = new InMemoryIncidentStore();
  const incidentAggregator = new SswIncidentAggregator(incidentStore);
  const sessionManager = getSswSessionManager();
  const httpClient = new SswHttpClient(sessionManager);

  const requestGateway = new Ssw455RequestGateway(registry, httpClient);
  const queueGateway = new SswReportQueueGateway(registry, httpClient);
  const downloadGateway = new SswReportDownloadGateway(registry, httpClient);
  const jobStore = new InMemoryJobStore();

  globalSswService = new Ssw455Service({
    registry,
    circuitBreaker,
    retryPolicy,
    incidentAggregator,
    sessionManager,
    requestGateway,
    queueGateway,
    downloadGateway,
    jobStore
  });

  return globalSswService;
}
