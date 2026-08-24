/**
 * Status operacional do ciclo de vida de um relatório na Fila 156 do SSW.
 */
export type SswReportJobStatus =
  | 'REQUESTED'
  | 'WAITING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'UNKNOWN';

/**
 * Período de consulta para geração do relatório.
 */
export interface SswReportPeriod {
  startDate: string; // Formato YYYY-MM-DD ou DD/MM/YYYY
  endDate: string;   // Formato YYYY-MM-DD ou DD/MM/YYYY
}

/**
 * Parâmetros de filtro para solicitação do Relatório 455.
 */
export interface Ssw455FilterParams {
  startDate?: string;
  endDate?: string;
  unid?: string;
  dataTipo?: 'EMISSAO' | 'PREVISAO' | 'ENTREGA';
  tipoRelatorio?: string;
}

/**
 * Representação de domínio de um Job de relatório no SSW.
 */
export interface SswReportJob {
  id: string;
  sequence?: string;
  requestedBy: string;
  requestedAt: string; // ISO 8601
  status: SswReportJobStatus;
  period: SswReportPeriod;
  reportType: string; // Ex: '455'
  unid?: string;
  lastCheckedAt?: string; // ISO 8601
  downloadAvailable: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resultado da aquisição automatizada do relatório SSW.
 */
export interface SswAcquisitionResult {
  success: boolean;
  job: SswReportJob;
  csvContent?: string;
  rowCount?: number;
  acquisitionTimestamp: string;
  error?: string;
  errorCode?: string;
}
