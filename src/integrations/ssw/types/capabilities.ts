/**
 * Identificadores lógicos das capacidades operacionais do SSW.
 * Estes identificadores representam capacidades de negócio, NUNCA endpoints fixos.
 */
export enum SswCapabilityId {
  REPORT_455_REQUEST = 'REPORT_455_REQUEST',
  REPORT_QUEUE = 'REPORT_QUEUE',
  REPORT_DOWNLOAD = 'REPORT_DOWNLOAD',
  CTRC_101 = 'CTRC_101',
  EMISSIONS_063 = 'EMISSIONS_063',
  FORECAST_029 = 'FORECAST_029',
  MANIFEST_030 = 'MANIFEST_030',
  MANIFEST_DETAIL_023 = 'MANIFEST_DETAIL_023',
  UNLOADING_264 = 'UNLOADING_264'
}

/**
 * Status operacional de uma capacidade no Router.
 */
export enum SswCapabilityStatus {
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  DISCOVERING = 'DISCOVERING',
  BLOCKED = 'BLOCKED'
}

/**
 * Estados do Circuit Breaker para proteção contra falhas em cascata.
 */
export enum SswCircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Status de um incidente de integração agregado.
 */
export enum SswIncidentStatus {
  OPEN = 'OPEN',
  AUTO_RESOLVED = 'AUTO_RESOLVED',
  MANUAL_REQUIRED = 'MANUAL_REQUIRED',
  RESOLVED = 'RESOLVED'
}

/**
 * Assinatura declarativa e imutável que identifica uma funcionalidade no SSW.
 */
export interface SswCapabilitySignature {
  capabilityId: SswCapabilityId;
  expectedMethod: 'GET' | 'POST';
  expectedContentType?: string;
  requiredPayloadFields?: string[];
  expectedResponsePattern?: string;
  description?: string;
}

/**
 * Registro de uma capacidade no SswCapabilityRegistry.
 */
export interface SswCapabilityEntry {
  capabilityId: SswCapabilityId;
  currentEndpoint?: string;
  httpMethod: 'GET' | 'POST';
  signature: SswCapabilitySignature;
  confidence: number; // 0.00 a 1.00
  status: SswCapabilityStatus;
  failureCount: number;
  lastSuccess?: string; // ISO 8601
  lastFailure?: string; // ISO 8601
  discoveryDate?: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

/**
 * Candidato de endpoint descoberto automaticamente pelo Discovery Engine.
 */
export interface SswEndpointCandidate {
  capabilityId: SswCapabilityId;
  endpoint: string;
  method: 'GET' | 'POST';
  confidence: number;
  matchedFields: string[];
  discoveredAt: string; // ISO 8601
}

/**
 * Registro estruturado de incidente agregado.
 */
export interface SswIncident {
  id: string;
  capability: SswCapabilityId;
  firstSeen: string; // ISO 8601
  lastSeen: string; // ISO 8601
  attempts: number;
  lastError: string;
  autoRecovery: boolean;
  previousEndpoint?: string;
  newEndpoint?: string;
  status: SswIncidentStatus;
}
