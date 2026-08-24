import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';

/**
 * Parâmetros de execução para uma requisição através do Gateway do SSW.
 */
export interface SswGatewayRequest {
  capabilityId: SswCapabilityId;
  endpointOverride?: string;
  parameters?: Record<string, string | number | boolean>;
  payload?: Record<string, unknown> | string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * Resposta estruturada retornada pelo Gateway do SSW.
 */
export interface SswGatewayResponse<T = unknown> {
  success: boolean;
  capabilityId: SswCapabilityId;
  statusCode: number;
  data: T;
  rawContentType?: string;
  latencyMs: number;
  timestamp: string;
  error?: string;
}

/**
 * Contrato abstrato do cliente HTTP Gateway do SSW.
 * Não realiza requisições reais neste ciclo fundacional.
 */
export interface SswGatewayClient {
  execute<T = unknown>(request: SswGatewayRequest): Promise<SswGatewayResponse<T>>;
}
