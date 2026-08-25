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

/**
 * Evento de rastreamento / ocorrência de CTRC retornado pelo SSW 101.
 */
export interface Ssw101TrackingEventDTO {
  dataHora: string;
  codigo: string;
  descricao: string;
  unidade: string;
  observacao?: string;
  manifesto?: string;
  motorista?: string;
  recebedor?: string;
  documentoRecebedor?: string;
}

/**
 * Nota fiscal vinculada a um CTRC no SSW 101.
 */
export interface Ssw101NotaFiscalDTO {
  numero: string;
  serie?: string;
  valor?: number;
  peso?: number;
  volumes?: number;
  chaveNfe?: string;
  dataEmissao?: string;
  natureza?: string;
}

/**
 * Detalhamento analítico completo de CTRC retornado pelo SSW 101.
 */
export interface Ssw101CtrcDetailDTO {
  ctrc: string;
  serie: string;
  numero: string;
  chaveCte?: string;
  dataEmissao: string;
  dataPrevisao?: string;
  unidadeEmissora?: string;
  unidadeDestino?: string;
  cidadeDestino?: string;
  ufDestino?: string;
  remetente: {
    cnpj?: string;
    razaoSocial?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    fone?: string;
  };
  destinatario: {
    cnpj?: string;
    razaoSocial?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    fone?: string;
  };
  consignatario?: {
    cnpj?: string;
    razaoSocial?: string;
  };
  tomador?: {
    cnpj?: string;
    razaoSocial?: string;
    tipo?: string;
  };
  pesoBruto: number;
  pesoCubado?: number;
  volumes: number;
  especie?: string;
  m3?: number;
  valorMercadoria: number;
  valorFrete: number;
  tipoFrete?: 'CIF' | 'FOB' | string;
  natureza?: string;
  cfop?: string;
  status: string;
  situacaoAtual?: string;
  notasFiscais: Ssw101NotaFiscalDTO[];
  historico: Ssw101TrackingEventDTO[];
  comprovanteEntrega?: {
    recebedor?: string;
    documento?: string;
    dataEntrega?: string;
    temCanhoto?: boolean;
    urlCanhoto?: string;
  };
  fetchedAt: string;
  fromCache?: boolean;
}

/**
 * Item de listagem quando a busca por NF ou remetente retorna múltiplos CTRCs.
 */
export interface Ssw101MatchItemDTO {
  ctrc: string;
  serie: string;
  numero: string;
  dataEmissao: string;
  remetente: string;
  destinatario: string;
  cidadeDestino: string;
  status: string;
  valorMercadoria?: number;
  volumes?: number;
  peso?: number;
  nf?: string;
}

/**
 * Parâmetros de requisição para consulta pontual SSW 101.
 */
export interface Ssw101QueryRequestDTO {
  tipoConsulta: 'CTRC' | 'NF' | 'CHAVE';
  serie?: string;
  numero?: string;
  numeroNf?: string;
  cnpjRemetente?: string;
  cnpjDestinatario?: string;
  chave?: string;
  unidade?: string;
  dataIni?: string;
  dataFin?: string;
  forceFresh?: boolean;
}

/**
 * Resposta da consulta analítica SSW 101.
 */
export interface Ssw101SearchResultDTO {
  success: boolean;
  found: boolean;
  multipleResults?: boolean;
  resultsCount: number;
  items?: Ssw101MatchItemDTO[];
  detail?: Ssw101CtrcDetailDTO;
  rawMessage?: string;
  fromCache?: boolean;
  queryParamUsed?: Record<string, any>;
  latencyMs?: number;
}

