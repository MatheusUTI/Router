import { SswCapabilityId } from './capabilities';

/**
 * Classificação funcional padronizada de erros na integração com o SSW.
 */
export enum SswErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  REQUEST_REJECTED = 'REQUEST_REJECTED',
  QUEUE_UNAVAILABLE = 'QUEUE_UNAVAILABLE',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_TIMEOUT = 'JOB_TIMEOUT',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  INVALID_REPORT_CONTENT = 'INVALID_REPORT_CONTENT',
  CAPABILITY_DEGRADED = 'CAPABILITY_DEGRADED',
  CONTRACT_CHANGED = 'CONTRACT_CHANGED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_CONFIGURED = 'NOT_CONFIGURED'
}

/**
 * DTO seguro de erro para comunicação com o frontend.
 * Não contém HTML bruto, senhas ou detalhes sensíveis de infraestrutura.
 */
export interface SswErrorDTO {
  code: SswErrorCode;
  message: string;
  capabilityId?: SswCapabilityId;
  details?: string;
  timestamp: string;
}

/**
 * Classe de erro tipada para o subsistema SSW.
 */
export class SswError extends Error {
  public readonly code: SswErrorCode;
  public readonly capabilityId?: SswCapabilityId;
  public readonly details?: string;
  public readonly isRetryable: boolean;

  constructor(
    code: SswErrorCode,
    message: string,
    options?: {
      capabilityId?: SswCapabilityId;
      details?: string;
      isRetryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'SswError';
    this.code = code;
    this.capabilityId = options?.capabilityId;
    this.details = options?.details;
    this.isRetryable = options?.isRetryable ?? (
      code === SswErrorCode.NETWORK_ERROR ||
      code === SswErrorCode.QUEUE_UNAVAILABLE ||
      code === SswErrorCode.SESSION_EXPIRED
    );
  }

  public toDTO(): SswErrorDTO {
    return {
      code: this.code,
      message: this.message,
      capabilityId: this.capabilityId,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}
