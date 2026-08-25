import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { Ssw101QueryRequestDTO, Ssw101SearchResultDTO } from '../../../src/integrations/ssw/contracts/dtos';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';
import { formatToDdmmyy } from './ssw455RequestGateway';
import { Ssw101Parser } from './ssw101Parser';

/**
 * Normaliza e extrai número e série de código de CTRC informado pelo usuário.
 */
export function parseSswCtrcCode(rawId: string): { series: string | null; number: string | null } {
  const value = String(rawId ?? '').trim().toUpperCase();
  if (!value) return { series: null, number: null };

  const fullMatch = value.match(/^([A-Z]{2,5})[-\s]?(\d+)(?:-\d+)?$/);
  if (fullMatch) {
    return {
      series: fullMatch[1],
      number: fullMatch[2]
    };
  }

  const digitsOnly = value.replace(/\D/g, '');
  return {
    series: null,
    number: digitsOnly || null
  };
}

/**
 * Gateway para execução de consultas analíticas na Opção SSW 101 (/bin/ssw0101 ou /bin/ssw0053).
 */
export class Ssw101QueryGateway {
  private registry: SswCapabilityRegistry;
  private httpClient: SswHttpClient;

  constructor(registry: SswCapabilityRegistry, httpClient: SswHttpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }

  /**
   * Constrói o payload padronizado para a consulta SSW 101.
   */
  public buildPayload(query: Ssw101QueryRequestDTO, empresa?: string): Record<string, string> {
    const payload: Record<string, string> = {
      act: 'P1',
      dummy: String(Date.now())
    };

    if (empresa) {
      payload.f1 = empresa;
    }

    // Período de busca (default de segurança: 2 anos para cobrir histórico completo)
    if (query.dataIni) {
      payload.t_data_ini = formatToDdmmyy(query.dataIni);
    } else {
      const today = new Date();
      const start = new Date(today);
      start.setMonth(start.getMonth() - 23);
      start.setDate(1);
      const d = String(start.getDate()).padStart(2, '0');
      const m = String(start.getMonth() + 1).padStart(2, '0');
      const y = String(start.getFullYear()).slice(-2);
      payload.t_data_ini = `${d}${m}${y}`;
    }

    if (query.dataFin) {
      payload.t_data_fin = formatToDdmmyy(query.dataFin);
    } else {
      const today = new Date();
      const d = String(today.getDate()).padStart(2, '0');
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const y = String(today.getFullYear()).slice(-2);
      payload.t_data_fin = `${d}${m}${y}`;
    }

    if (query.tipoConsulta === 'CTRC') {
      let series = query.serie || '';
      let number = query.numero || '';

      if (!series && number) {
        const parsed = parseSswCtrcCode(number);
        if (parsed.series) series = parsed.series;
        if (parsed.number) number = parsed.number;
      }

      if (!series) {
        series = query.unidade === 'SPO' ? 'SPO' : 'BCA';
      }

      payload.t_ser_ctrc = series.toUpperCase().trim();
      payload.t_nro_ctrc = number.trim();
    } else if (query.tipoConsulta === 'NF') {
      payload.t_nro_nf = (query.numeroNf || '').trim();
      if (query.cnpjRemetente) {
        payload.t_cgc_rem = query.cnpjRemetente.replace(/\D/g, '');
      }
      if (query.cnpjDestinatario) {
        payload.t_cgc_des = query.cnpjDestinatario.replace(/\D/g, '');
      }
    } else if (query.tipoConsulta === 'CHAVE') {
      const cleanKey = (query.chave || '').replace(/\D/g, '');
      payload.t_chave_cte = cleanKey;
      payload.t_chave_nfe = cleanKey;
      payload.t_chave = cleanKey;
    }

    return payload;
  }

  /**
   * Executa a requisição de consulta no SSW e retorna o DTO processado.
   */
  public async executeQuery(query: Ssw101QueryRequestDTO): Promise<Ssw101SearchResultDTO> {
    const capability = await this.registry.get(SswCapabilityId.CTRC_101);
    const endpoint = capability?.currentEndpoint || '/bin/ssw0101';
    const payload = this.buildPayload(query);

    try {
      const response = await this.httpClient.request({
        endpoint,
        method: 'POST',
        payload,
        expectedEncoding: 'iso-8859-1',
        timeoutMs: 25000
      });

      if (response.statusCode >= 400) {
        throw new SswError(
          SswErrorCode.REQUEST_REJECTED,
          `SSW retornou HTTP ${response.statusCode} na consulta 101 (${endpoint}).`,
          { details: response.bodyText, isRetryable: response.statusCode >= 500 }
        );
      }

      // Parser inteligente de HTML
      const result = Ssw101Parser.parse(response.bodyText);
      result.latencyMs = response.latencyMs;
      result.queryParamUsed = payload;

      return result;
    } catch (err: any) {
      if (err instanceof SswError) throw err;
      throw new SswError(
        SswErrorCode.NETWORK_ERROR,
        `Falha na comunicação com o SSW 101: ${err.message || 'Erro de rede'}`,
        { details: err.message, isRetryable: true }
      );
    }
  }
}
