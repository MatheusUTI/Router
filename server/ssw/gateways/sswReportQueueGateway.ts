import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { SswReportJobStatus } from '../../../src/integrations/ssw/types/jobs';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface SswQueueItem {
  sequence: string;
  reportType: string;
  status: SswReportJobStatus;
  rawStatusText: string;
  user?: string;
  requestedAt?: string;
  downloadUrl?: string;
}

export interface SswQueueCheckResult {
  matchedItem?: SswQueueItem;
  allItemsCount: number;
  rawHtml: string;
}

/**
 * Gateway responsável por consultar a Fila 156 de relatórios do SSW.
 * Enforça estritamente o princípio de Ownership (nunca baixa relatórios de terceiros).
 */
export class SswReportQueueGateway {
  private registry: SswCapabilityRegistry;
  private httpClient: SswHttpClient;

  constructor(registry: SswCapabilityRegistry, httpClient: SswHttpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }

  /**
   * Converte texto cru da coluna de status do SSW para o enum padronizado SswReportJobStatus.
   */
  public normalizeStatus(statusText: string): SswReportJobStatus {
    const clean = (statusText || '').toLowerCase().trim();

    if (clean.includes('aguardando') || clean.includes('na fila') || clean.includes('espera') || clean.includes('pendente')) {
      return 'WAITING';
    }
    if (clean.includes('processando') || clean.includes('gerando') || clean.includes('em andamento') || clean.includes('executando')) {
      return 'PROCESSING';
    }
    if (clean.includes('conclu') || clean.includes('dispon') || clean.includes('download') || clean.includes('pronto') || clean.includes('ok')) {
      return 'COMPLETED';
    }
    if (clean.includes('erro') || clean.includes('falha') || clean.includes('cancelad') || clean.includes('expirad') || clean.includes('inconsist')) {
      return 'FAILED';
    }
    return 'UNKNOWN';
  }

  /**
   * Extrai itens da tabela HTML da Fila 156 do SSW.
   */
  public parseQueueHtml(html: string): SswQueueItem[] {
    if (!html || typeof html !== 'string') return [];

    const items: SswQueueItem[] = [];

    // Expressão regular para encontrar linhas de tabela <tr>...</tr>
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const rowContent = rowMatch[1];
      
      // Extrai todas as células <td>...</td>
      const cellRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        // Limpa tags HTML internas
        const plainText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
        cells.push(plainText);
      }

      if (cells.length >= 3) {
        // Tenta identificar se a linha representa um relatório (normalmente possui sequência numérica e tipo de relatório)
        const sequenceCandidate = cells.find(c => /^\d{3,10}$/.test(c));
        const reportTypeCandidate = cells.find(c => /\b455\b|relat[óo]rio\s*455/i.test(c)) || (cells.length > 1 ? cells[1] : '455');
        
        // Procura status nas células
        const statusCell = cells.find(c => {
          const l = c.toLowerCase();
          return l.includes('aguardando') || l.includes('processando') || l.includes('conclui') || l.includes('concluído') || l.includes('erro') || l.includes('pronto');
        }) || cells[cells.length - 1];

        // Verifica se há link de download específico
        const downloadMatch = /href=["']([^"']*(?:ssw0424|download)[^"']*)["']/i.exec(rowContent);
        const downloadUrl = downloadMatch ? downloadMatch[1] : undefined;

        if (sequenceCandidate || downloadUrl || reportTypeCandidate.includes('455')) {
          items.push({
            sequence: sequenceCandidate || '',
            reportType: reportTypeCandidate.includes('455') ? '455' : reportTypeCandidate,
            status: this.normalizeStatus(statusCell || ''),
            rawStatusText: statusCell || '',
            user: cells.length > 2 ? cells[2] : undefined,
            downloadUrl
          });
        }
      }
    }

    return items;
  }

  /**
   * Consulta a Fila 156 e busca o item pertencente ao usuário/sequência atual.
   */
  public async checkQueue(options: {
    sequence?: string;
    expectedReportType?: string;
    username?: string;
  }): Promise<SswQueueCheckResult> {
    const capability = await this.registry.get(SswCapabilityId.REPORT_QUEUE);
    const endpoint = capability?.currentEndpoint || '/bin/ssw1440';
    const method = capability?.httpMethod || 'POST';

    const payload = {
      act: '',
      dummy: String(Date.now())
    };

    const response = await this.httpClient.request({
      method,
      endpoint,
      payload,
      timeoutMs: 15000
    });

    if (response.statusCode >= 400) {
      throw new SswError(
        SswErrorCode.QUEUE_UNAVAILABLE,
        `Fila 156 do SSW indisponível (HTTP ${response.statusCode}).`,
        { capabilityId: SswCapabilityId.REPORT_QUEUE }
      );
    }

    const items = this.parseQueueHtml(response.bodyText);
    const reportType = options.expectedReportType || '455';

    let matchedItem: SswQueueItem | undefined = undefined;

    // 1. Se possuímos a sequência exata, ela é o critério mandatário e exclusivo de correspondência
    if (options.sequence) {
      matchedItem = items.find(item => item.sequence === options.sequence);
    } else if (items.length > 0) {
      // 2. Se não possuímos sequência inicial, busca o item do mesmo relatório (455) pertencente ao usuário logado
      const userMatches = items.filter(item => {
        const matchesType = item.reportType === reportType || item.reportType.includes(reportType);
        if (!matchesType) return false;

        if (options.username && item.user) {
          const uClean = item.user.toLowerCase();
          const targetClean = options.username.toLowerCase();
          return uClean.includes(targetClean) || targetClean.includes(uClean);
        }
        return true;
      });

      if (userMatches.length > 0) {
        // Seleciona o item mais recente do usuário correspondente
        matchedItem = userMatches[0];
      }
    }

    return {
      matchedItem,
      allItemsCount: items.length,
      rawHtml: response.bodyText
    };
  }
}
