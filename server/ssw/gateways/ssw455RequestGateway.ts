import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { Ssw455FilterParams } from '../../../src/integrations/ssw/types/jobs';
import { Ssw455Config, DEFAULT_SSW_455_CONFIG } from '../../../src/integrations/ssw/types/config';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface Ssw455RequestResult {
  sequence?: string;
  trackingUrl?: string;
  rawResponse: string;
  statusCode: number;
  isAccepted: boolean;
}

/**
 * Converte formatos de data (YYYY-MM-DD, DD/MM/YYYY, etc.) para o formato DDMMYY do SSW.
 */
export function formatToDdmmyy(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}${m}${y.slice(2)}`;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${d}${m}${y.slice(2)}`;
  }
  // DD/MM/YY
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${d}${m}${y}`;
  }
  // DDMMYY (6 dígitos)
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }
  // DDMMYYYY (8 dígitos)
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(0, 4)}${clean.slice(6, 8)}`;
  }
  return clean;
}

/**
 * Constrói o payload completo e rigoroso para a solicitação do 455 (act=E1)
 * com base na implementação comprovada do SSWTools e parâmetros da Capability Config.
 */
export function buildPayload455(
  params: {
    unid: string;
    startDate?: string;
    endDate?: string;
    dataTipo?: 'EMISSAO' | 'AUTORIZACAO' | 'PREVISAO' | 'ENTREGA' | string;
    empresa?: string;
  },
  config?: Partial<Ssw455Config>
): Record<string, string> {
  const d1 = formatToDdmmyy(params.startDate);
  const d2 = formatToDdmmyy(params.endDate);
  const tipo = (params.dataTipo || config?.tipoPeriodo || 'AUTORIZACAO').toUpperCase();

  const c = {
    unidadeTipo: config?.unidadeTipo ?? DEFAULT_SSW_455_CONFIG.unidadeTipo,
    regionalTipo: config?.regionalTipo ?? DEFAULT_SSW_455_CONFIG.regionalTipo,
    ufTipo: config?.ufTipo ?? DEFAULT_SSW_455_CONFIG.ufTipo,
    clienteTipo: config?.clienteTipo ?? DEFAULT_SSW_455_CONFIG.clienteTipo,
    tipoDocumento: config?.tipoDocumento ?? DEFAULT_SSW_455_CONFIG.tipoDocumento,
    tipoFrete: config?.tipoFrete ?? DEFAULT_SSW_455_CONFIG.tipoFrete,
    impostoRepassado: config?.impostoRepassado ?? DEFAULT_SSW_455_CONFIG.impostoRepassado,
    liquidacao: config?.liquidacao ?? DEFAULT_SSW_455_CONFIG.liquidacao,
    entrega: config?.entrega ?? DEFAULT_SSW_455_CONFIG.entrega,
    pagamentoVista: config?.pagamentoVista ?? DEFAULT_SSW_455_CONFIG.pagamentoVista,
    tipoCalculo: config?.tipoCalculo ?? DEFAULT_SSW_455_CONFIG.tipoCalculo,
    entregaDificil: config?.entregaDificil ?? DEFAULT_SSW_455_CONFIG.entregaDificil,
    reversaoFrete: config?.reversaoFrete ?? DEFAULT_SSW_455_CONFIG.reversaoFrete,
    icmsIss: config?.icmsIss ?? DEFAULT_SSW_455_CONFIG.icmsIss,
    ibsCbs: config?.ibsCbs ?? DEFAULT_SSW_455_CONFIG.ibsCbs,
    averbado: config?.averbado ?? DEFAULT_SSW_455_CONFIG.averbado,
    compEntregaEscaneado: config?.compEntregaEscaneado ?? DEFAULT_SSW_455_CONFIG.compEntregaEscaneado,
    arquivo: config?.arquivo ?? DEFAULT_SSW_455_CONFIG.arquivo,
    dadosComplementares: config?.dadosComplementares ?? DEFAULT_SSW_455_CONFIG.dadosComplementares,
    basico: config?.basico ?? DEFAULT_SSW_455_CONFIG.basico
  };

  const payload: Record<string, string> = {
    act: 'E1',
    cod_emp_ctb: '00',
    f2: params.unid.toUpperCase().trim(),
    f3: c.unidadeTipo,
    reg_tipo: c.regionalTipo,
    f4: '',
    f5: c.ufTipo,
    f7: '',
    f8: c.clienteTipo,
    f9: tipo === 'EMISSAO' ? d1 : '',
    f10: tipo === 'EMISSAO' ? d2 : '',
    f11: tipo === 'AUTORIZACAO' ? d1 : '',
    f12: tipo === 'AUTORIZACAO' ? d2 : '',
    f13: tipo === 'PREVISAO' ? d1 : '',
    f14: tipo === 'PREVISAO' ? d2 : '',
    f15: tipo === 'ENTREGA' ? d1 : '',
    f16: tipo === 'ENTREGA' ? d2 : '',
    f18: c.tipoDocumento,
    f19: c.tipoFrete,
    f20: c.impostoRepassado,
    f21: c.liquidacao,
    f22: c.entrega,
    f23: c.pagamentoVista,
    f25: c.tipoCalculo,
    f26: c.entregaDificil,
    f27: c.reversaoFrete,
    f28: c.icmsIss,
    ibscbs: c.ibsCbs,
    f29: c.averbado,
    f30: c.compEntregaEscaneado,
    f32: '',
    f34: '',
    f35: c.arquivo,
    f37: c.dadosComplementares,
    f38: '',
    f39: '',
    basico: c.basico,
    dummy: String(Date.now())
  };

  return payload;
}

/**
 * Gateway responsável por solicitar a geração do Relatório 455 no SSW.
 * Resolução dinâmica de endpoint através do SswCapabilityRegistry e configuração desacoplada.
 */
export class Ssw455RequestGateway {
  private registry: SswCapabilityRegistry;
  private httpClient: SswHttpClient;
  private configProvider?: () => Ssw455Config;

  constructor(
    registry: SswCapabilityRegistry,
    httpClient: SswHttpClient,
    configProvider?: () => Ssw455Config
  ) {
    this.registry = registry;
    this.httpClient = httpClient;
    this.configProvider = configProvider;
  }

  /**
   * Envia requisição de geração do relatório 455 utilizando o protocolo comprovado do SSW.
   */
  public async requestReport455(
    params: Ssw455FilterParams,
    defaultUnid = 'VGA',
    empresa = ''
  ): Promise<Ssw455RequestResult> {
    const capability = await this.registry.get(SswCapabilityId.REPORT_455_REQUEST);
    const endpoint = capability?.currentEndpoint || '/bin/ssw0230';
    const method = capability?.httpMethod || 'POST';

    const unid = (params.unid || defaultUnid).toUpperCase().trim();
    const currentConfig = this.configProvider ? this.configProvider() : undefined;
    
    // Constrói payload rigoroso com base na configuração da capability e nos parâmetros de requisição
    const payload = buildPayload455({
      unid,
      startDate: params.startDate,
      endDate: params.endDate,
      dataTipo: params.dataTipo,
      empresa
    }, currentConfig);

    const response = await this.httpClient.request({
      method,
      endpoint,
      payload,
      timeoutMs: 30000
    });

    if (response.statusCode >= 400) {
      throw new SswError(
        SswErrorCode.REQUEST_REJECTED,
        `SSW rejeitou a solicitação do relatório 455 com status HTTP ${response.statusCode}.`,
        { capabilityId: SswCapabilityId.REPORT_455_REQUEST }
      );
    }

    const html = response.bodyText;

    // Detecta erros explícitos reportados pelo SSW no HTML
    const lowerHtml = html.toLowerCase();
    const errorMatch = /(?:Erro|Aten[çc][ãa]o|Inconsist[êe]ncia|Inv[áa]lido):\s*([^<]+)/i.exec(html);
    if (errorMatch && !lowerHtml.includes('solicita') && !lowerHtml.includes('processamento') && !lowerHtml.includes('sucesso')) {
      const errorMsg = errorMatch[1].trim();
      if (errorMsg.length > 3 && errorMsg.length < 150) {
        throw new SswError(
          SswErrorCode.REQUEST_REJECTED,
          `SSW retornou mensagem de rejeição: ${errorMsg}`,
          { capabilityId: SswCapabilityId.REPORT_455_REQUEST, details: errorMsg }
        );
      }
    }

    // Verifica aceitação da solicitação (ex: "solicita" e "processamento", ou confirmação de enfileiramento)
    const isAccepted = (
      (lowerHtml.includes('solicita') && lowerHtml.includes('process')) ||
      lowerHtml.includes('solicitad') ||
      lowerHtml.includes('enfileirad') ||
      lowerHtml.includes('sucesso') ||
      lowerHtml.includes('ssw1440') ||
      response.statusCode === 200
    );

    // Extrai número de sequência se retornado explicitamente
    let sequence: string | undefined = undefined;
    const seqMatch = /(?:sequ[êe]ncia|relat[óo]rio\s+n[úu]mero|job\s*#?|id\s*[:=]|seq\s*[:=])\s*[:=]?\s*(\d{3,10})/i.exec(html);
    if (seqMatch) {
      sequence = seqMatch[1];
    } else {
      const linkSeqMatch = /(?:ssw0424|ssw1440)[^"']*?(?:seq|id|rel)=(\d+)/i.exec(html);
      if (linkSeqMatch) {
        sequence = linkSeqMatch[1];
      }
    }

    return {
      sequence,
      rawResponse: html,
      statusCode: response.statusCode,
      isAccepted
    };
  }
}


