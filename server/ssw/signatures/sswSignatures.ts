import { SswCapabilityId, SswCapabilitySignature } from '../../../src/integrations/ssw/types/capabilities';

/**
 * Assinaturas funcionais canônicas para as capabilities do fluxo 455 do SSW.
 */
export const SSW_SIGNATURES: Record<SswCapabilityId, SswCapabilitySignature> = {
  [SswCapabilityId.REPORT_455_REQUEST]: {
    capabilityId: SswCapabilityId.REPORT_455_REQUEST,
    expectedMethod: 'POST',
    expectedContentType: 'application/x-www-form-urlencoded',
    requiredPayloadFields: ['act', 'f2'],
    expectedResponsePattern: '(?i)(?:solicita|processando|fila|sequencia|sucesso|relatorio|ok)',
    description: 'Solicitação de geração do Relatório SSW 455 de Entregas e Trânsito'
  },
  [SswCapabilityId.REPORT_QUEUE]: {
    capabilityId: SswCapabilityId.REPORT_QUEUE,
    expectedMethod: 'POST',
    expectedContentType: 'application/x-www-form-urlencoded',
    requiredPayloadFields: ['act'],
    expectedResponsePattern: '(?i)(?:aguardando|processando|concluido|download|fila|relatorio|156)',
    description: 'Acompanhamento da Fila 156 de relatórios do SSW'
  },
  [SswCapabilityId.REPORT_DOWNLOAD]: {
    capabilityId: SswCapabilityId.REPORT_DOWNLOAD,
    expectedMethod: 'GET',
    expectedContentType: 'text/csv',
    description: 'Download do arquivo CSV do Relatório 455 concluído'
  },
  [SswCapabilityId.CTRC_101]: {
    capabilityId: SswCapabilityId.CTRC_101,
    expectedMethod: 'POST',
    description: 'Consulta analítica de CTRC 101'
  },
  [SswCapabilityId.EMISSIONS_063]: {
    capabilityId: SswCapabilityId.EMISSIONS_063,
    expectedMethod: 'POST',
    description: 'Consulta de emissões SSW 063'
  },
  [SswCapabilityId.FORECAST_029]: {
    capabilityId: SswCapabilityId.FORECAST_029,
    expectedMethod: 'POST',
    description: 'Consulta de previsão de entrega SSW 029'
  },
  [SswCapabilityId.MANIFEST_030]: {
    capabilityId: SswCapabilityId.MANIFEST_030,
    expectedMethod: 'POST',
    description: 'Consulta de manifesto de carga SSW 030'
  },
  [SswCapabilityId.MANIFEST_DETAIL_023]: {
    capabilityId: SswCapabilityId.MANIFEST_DETAIL_023,
    expectedMethod: 'POST',
    description: 'Detalhamento de manifesto SSW 023'
  },
  [SswCapabilityId.UNLOADING_264]: {
    capabilityId: SswCapabilityId.UNLOADING_264,
    expectedMethod: 'POST',
    description: 'Registro e acompanhamento de descarga SSW 264'
  }
};

/**
 * Endpoints conhecidos padrão (candidatos iniciais para o CapabilityRegistry).
 */
export const DEFAULT_KNOWN_ENDPOINTS: Partial<Record<SswCapabilityId, { endpoint: string; method: 'GET' | 'POST'; confidence: number }>> = {
  [SswCapabilityId.REPORT_455_REQUEST]: {
    endpoint: '/bin/ssw0230',
    method: 'POST',
    confidence: 0.95
  },
  [SswCapabilityId.REPORT_QUEUE]: {
    endpoint: '/bin/ssw1440',
    method: 'POST',
    confidence: 0.95
  },
  [SswCapabilityId.REPORT_DOWNLOAD]: {
    endpoint: '/bin/ssw0424',
    method: 'GET',
    confidence: 0.95
  },
  [SswCapabilityId.CTRC_101]: {
    endpoint: '/bin/ssw0101',
    method: 'POST',
    confidence: 0.95
  }
};
