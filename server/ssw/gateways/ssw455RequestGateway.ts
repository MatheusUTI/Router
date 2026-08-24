import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { Ssw455FilterParams } from '../../../src/integrations/ssw/types/jobs';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface Ssw455RequestResult {
  sequence?: string;
  trackingUrl?: string;
  rawResponse: string;
  statusCode: number;
}

/**
 * Gateway responsável por solicitar a geração do Relatório 455 no SSW.
 * Resolução dinâmica de endpoint através do SswCapabilityRegistry.
 */
export class Ssw455RequestGateway {
  private registry: SswCapabilityRegistry;
  private httpClient: SswHttpClient;

  constructor(registry: SswCapabilityRegistry, httpClient: SswHttpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }

  /**
   * Envia requisição de geração do relatório 455.
   */
  public async requestReport455(params: Ssw455FilterParams, defaultUnid = 'VGA'): Promise<Ssw455RequestResult> {
    const capability = await this.registry.get(SswCapabilityId.REPORT_455_REQUEST);
    const endpoint = capability?.currentEndpoint || '/bin/ssw0230';
    const method = capability?.httpMethod || 'POST';

    const unid = (params.unid || defaultUnid).toUpperCase().trim();
    
    // Mapeamento dos parâmetros do formulário 455
    const payload: Record<string, string> = {
      relatorio: '455',
      unid: unid,
      filial: unid,
      data_ini: params.startDate || '',
      data_fim: params.endDate || '',
      tipo_data: params.dataTipo || 'EMISSAO',
      formato: 'CSV',
      act: 'gerar'
    };

    const response = await this.httpClient.request({
      method,
      endpoint,
      payload,
      timeoutMs: 25000
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
    const errorMatch = /(?:Erro|Aten[çc][ãa]o|Inconsist[êe]ncia):\s*([^<]+)/i.exec(html);
    if (errorMatch && !html.toLowerCase().includes('solicitado com sucesso')) {
      const errorMsg = errorMatch[1].trim();
      if (errorMsg.length > 3 && errorMsg.length < 150) {
        throw new SswError(
          SswErrorCode.REQUEST_REJECTED,
          `SSW retornou mensagem de rejeição: ${errorMsg}`,
          { capabilityId: SswCapabilityId.REPORT_455_REQUEST, details: errorMsg }
        );
      }
    }

    // Extrai número de sequência se retornado explicitamente
    let sequence: string | undefined = undefined;
    const seqMatch = /(?:sequ[êe]ncia|relat[óo]rio\s+n[úu]mero|job\s*#?|id\s*[:=])\s*[:=]?\s*(\d{3,10})/i.exec(html);
    if (seqMatch) {
      sequence = seqMatch[1];
    } else {
      // Tenta extrair de links ou formulários de acompanhamento
      const linkSeqMatch = /(?:ssw0424|ssw1440)[^"']*?(?:seq|id|rel)=(\d+)/i.exec(html);
      if (linkSeqMatch) {
        sequence = linkSeqMatch[1];
      }
    }

    return {
      sequence,
      rawResponse: html,
      statusCode: response.statusCode
    };
  }
}
