/**
 * Tipos e contratos de configuração centralizada para a integração SSW.
 * Obedece ao princípio arquitetural:
 * Configuração SSW -> Capability Configuration -> Application Service -> Gateway -> SSW.
 */

export interface SswConnectionConfig {
  empresa: string;
  useri: string;
  usuario: string;
  senha?: string; // Somente enviado no POST/PUT de atualização; NUNCA retornado no GET
  unidade: string;
  baseUrl: string;
  hasPassword?: boolean; // Indicador seguro para o frontend
  lastUpdated?: string;
}

export type Ssw455TipoPeriodo = 'AUTORIZACAO' | 'EMISSAO' | 'PREVISAO' | 'ENTREGA';

export interface Ssw455Config {
  tipoPeriodo: Ssw455TipoPeriodo;
  unidadeTipo: string;           // f3 (default: 'A' - Todas)
  regionalTipo: string;          // reg_tipo (default: 'E' - Emitente)
  ufTipo: string;                // f5 (default: 'R' - Remetente)
  clienteTipo: string;           // f8 (default: 'T' - Todos)
  tipoDocumento: string;         // f18 (default: 'T' - Todos)
  tipoFrete: string;             // f19 (default: 'T' - Todos)
  impostoRepassado: string;      // f20 (default: 'S' - Sim)
  liquidacao: string;            // f21 (default: 'X' - Todos)
  entrega: string;               // f22 (default: 'p' - Pendente)
  pagamentoVista: string;        // f23 (default: 'A' - Ambos)
  tipoCalculo: string;           // f25 (default: 'T' - Todos)
  entregaDificil: string;        // f26 (default: 'A' - Ambos)
  reversaoFrete: string;         // f27 (default: 'A' - Ambos)
  icmsIss: string;               // f28 (default: 'T' - Todos)
  ibsCbs: string;                // ibscbs (default: 'A' - Ambos)
  averbado: string;              // f29 (default: 'A' - Ambos)
  compEntregaEscaneado: string;  // f30 (default: 'A' - Ambos)
  arquivo: string;               // f35 (default: 'e' - Excel/CSV)
  dadosComplementares: string;   // f37 (default: 'B' - Completo/Bloco)
  basico: string;                // basico (default: 'N' - Não)
}

export interface SswFutureCapabilityMeta {
  code: string;
  name: string;
  description: string;
  status: 'NOT_IMPLEMENTED' | 'PLANNED' | 'DEVELOPMENT';
  estimatedCycle?: string;
}

export interface SswFullConfigDTO {
  connection: SswConnectionConfig;
  capabilities: {
    '455': Ssw455Config;
    '101': SswFutureCapabilityMeta;
    '063': SswFutureCapabilityMeta;
    '029': SswFutureCapabilityMeta;
    '030': SswFutureCapabilityMeta;
    '023': SswFutureCapabilityMeta;
    '264': SswFutureCapabilityMeta;
  };
  lastSavedAt?: string;
}

/**
 * Defaults canônicos e obrigatórios da Capability 455 baseados no SSWTools.
 */
export const DEFAULT_SSW_455_CONFIG: Readonly<Ssw455Config> = Object.freeze({
  tipoPeriodo: 'AUTORIZACAO',
  unidadeTipo: 'A',
  regionalTipo: 'E',
  ufTipo: 'R',
  clienteTipo: 'T',
  tipoDocumento: 'T',
  tipoFrete: 'T',
  impostoRepassado: 'S',
  liquidacao: 'X',
  entrega: 'p',
  pagamentoVista: 'A',
  tipoCalculo: 'T',
  entregaDificil: 'A',
  reversaoFrete: 'A',
  icmsIss: 'T',
  ibsCbs: 'A',
  averbado: 'A',
  compEntregaEscaneado: 'A',
  arquivo: 'e',
  dadosComplementares: 'B',
  basico: 'N'
});

export const FUTURE_SSW_CAPABILITIES: Record<string, SswFutureCapabilityMeta> = {
  '101': {
    code: '101',
    name: 'Coletas e Consulta de CTRCs',
    description: 'Consulta rápida de coletas pendentes e dados sumários de CTRC por número/série.',
    status: 'PLANNED',
    estimatedCycle: 'SSW-101-001'
  },
  '063': {
    code: '063',
    name: 'Rastreamento de Cargas',
    description: 'Tracking completo de mercadorias em trânsito e localização física.',
    status: 'PLANNED',
    estimatedCycle: 'SSW-063-001'
  },
  '029': {
    code: '029',
    name: 'Faturas e Previsão Financeira',
    description: 'Gestão de faturamento de frete, boletos emitidos e posições a receber.',
    status: 'NOT_IMPLEMENTED'
  },
  '030': {
    code: '030',
    name: 'Manifestos de Carga',
    description: 'Consulta e auditoria estruturada de manifestos emitidos e em trânsito.',
    status: 'NOT_IMPLEMENTED'
  },
  '023': {
    code: '023',
    name: 'Ocorrências e Pendências',
    description: 'Registro e auditoria de ocorrências de entrega e recusas operacionais.',
    status: 'NOT_IMPLEMENTED'
  },
  '264': {
    code: '264',
    name: 'Descarga e Romaneios',
    description: 'Controle de conferência física na descarga e conferência de romaneios.',
    status: 'NOT_IMPLEMENTED'
  }
};
