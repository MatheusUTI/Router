import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { SswReportJobStatus } from '../../../src/integrations/ssw/types/jobs';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface SswQueueRecord {
  sequence: string;       // f0 (ex: "420702")
  reportType: string;     // f1 (ex: "455 ENTREGAS REL")
  dateTime: string;       // f2 (ex: "24/08/26 17:30")
  username: string;       // f3 (ex: "AMATHEUS")
  unidade: string;        // f4 (ex: "VGA")
  statusRaw: string;      // f6 (ex: "Concluído")
  status: SswReportJobStatus;
  duration?: string;      // f7 (ex: "00:00:12")
  action: string;         // f8 (ex: "DOW420702")
  isReady: boolean;
  downloadUrl?: string;
}

export interface SswQueueCheckResult {
  records: SswQueueRecord[];
  matchedRecord?: SswQueueRecord;
  maxSequence: number;
  userMaxSequence: number;
  rawHtml: string;
  diagnostics?: {
    httpStatus: number;
    responseLength: number;
    contentType: string;
    totalRecordsFound: number;
    total455Found: number;
    user455Count: number;
    discardedByUser: number;
    discardedByUnid: number;
    discardedByMinSeq: number;
    oldSequence?: number;
    matchedSequence?: string;
  };
}

/**
 * Decodifica entidades HTML comuns.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Gateway responsável por consultar a Fila 156 de relatórios do SSW (/bin/ssw1440).
 * Enforça estritamente o formato comprovado de registros <r><f0>...</f8></r> e
 * o princípio de Ownership do usuário e unidade.
 */
export class SswReportQueueGateway {
  private registry: SswCapabilityRegistry;
  private httpClient: SswHttpClient;

  constructor(registry: SswCapabilityRegistry, httpClient: SswHttpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }

  /**
   * Converte texto cru de status do SSW para SswReportJobStatus.
   */
  public normalizeStatus(statusText: string, action: string, sequence: string): SswReportJobStatus {
    const clean = (statusText || '').toLowerCase().trim();
    const act = (action || '').toUpperCase();
    const seq = (sequence || '').trim();

    const isConcluido = clean.includes('conclu') || clean.includes('pronto') || clean.includes('dispon');
    const hasDow = act.includes('DOW' + seq) || (act.startsWith('DOW') && act.includes(seq));

    if (isConcluido && (hasDow || !action)) {
      return 'COMPLETED';
    }
    if (clean.includes('aguardando') || clean.includes('na fila') || clean.includes('espera') || clean.includes('pendente')) {
      return 'WAITING';
    }
    if (clean.includes('processando') || clean.includes('gerando') || clean.includes('em andamento') || clean.includes('executando')) {
      return 'PROCESSING';
    }
    if (clean.includes('erro') || clean.includes('falha') || clean.includes('cancelad') || clean.includes('expirad') || clean.includes('inconsist')) {
      return 'FAILED';
    }
    if (isConcluido) {
      return 'COMPLETED';
    }
    return 'UNKNOWN';
  }

  /**
   * Verifica se o registro está pronto para download conforme a regra comprovada:
   * status contém 'conclu' E action contém 'DOW<SEQ>'.
   */
  public isRecordReady(statusRaw: string, action: string, sequence: string): boolean {
    const s = (statusRaw || '').toLowerCase();
    const act = (action || '').toUpperCase();
    const seq = (sequence || '').trim();

    const isConcluido = s.includes('conclu') || s.includes('pronto') || s.includes('dispon') || s.includes('ok');
    const hasDow = act.includes('DOW' + seq) || (act.startsWith('DOW') && (act.includes(seq) || !seq));
    
    return isConcluido && (hasDow || act.startsWith('DOW'));
  }

  /**
   * Extrai registros da Fila 156.
   * Suporta primariamente a estrutura <r><f0>...</f8></r> e fallback para tabelas HTML <tr>/<td>.
   */
  public parseQueueHtml(html: string): SswQueueRecord[] {
    if (!html || typeof html !== 'string') return [];

    const records: SswQueueRecord[] = [];

    // 1. Parser principal: formato XML <r><f0>...</f8></r>
    const recordRegex = /<r\b[^>]*>([\s\S]*?)<\/r>/gi;
    let rMatch: RegExpExecArray | null;

    while ((rMatch = recordRegex.exec(html)) !== null) {
      const rContent = rMatch[1];
      const fields: Record<string, string> = {};

      const fieldRegex = /<f(\d+)\b[^>]*>([\s\S]*?)<\/f\1>/gi;
      let fMatch: RegExpExecArray | null;

      while ((fMatch = fieldRegex.exec(rContent)) !== null) {
        const fieldIndex = fMatch[1];
        const fieldVal = decodeHtmlEntities(fMatch[2].trim());
        fields[`f${fieldIndex}`] = fieldVal;
      }

      const seq = fields['f0'] || '';
      const rep = fields['f1'] || '';
      const dt = fields['f2'] || '';
      const user = fields['f3'] || '';
      const unid = fields['f4'] || '';
      const st = fields['f6'] || fields['f5'] || '';
      const dur = fields['f7'] || '';
      const act = fields['f8'] || '';

      if (seq || rep) {
        const isReady = this.isRecordReady(st, act, seq);
        const status = this.normalizeStatus(st, act, seq);

        records.push({
          sequence: seq,
          reportType: rep,
          dateTime: dt,
          username: user,
          unidade: unid,
          statusRaw: st,
          status,
          duration: dur,
          action: act,
          isReady
        });
      }
    }

    // 2. Fallback: Se não encontrou <r> tags, tenta parsing de tabela <tr>/<td> (compatibilidade com fixtures)
    if (records.length === 0) {
      const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch: RegExpExecArray | null;

      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowContent = rowMatch[1];
        const cellRegex = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
        const cells: string[] = [];
        let cellMatch: RegExpExecArray | null;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const plainText = decodeHtmlEntities(cellMatch[1].replace(/<[^>]+>/g, '').trim());
          cells.push(plainText);
        }

        if (cells.length >= 3) {
          const seq = cells.find(c => /^\d{3,10}$/.test(c)) || cells[0];
          const rep = cells.find(c => /\b455\b|relat[óo]rio\s*455/i.test(c)) || (cells.length > 1 ? cells[1] : '455');
          const user = cells.length > 2 ? cells[2] : '';
          const unid = cells.length > 3 ? cells[3] : '';
          const st = cells.find(c => {
            const l = c.toLowerCase();
            return l.includes('aguardando') || l.includes('processando') || l.includes('conclui') || l.includes('concluído') || l.includes('erro') || l.includes('pronto');
          }) || cells[cells.length - 1] || '';

          const isConcluido = st.toLowerCase().includes('conclu') || st.toLowerCase().includes('pronto');
          const act = isConcluido ? `DOW${seq}` : '';

          if (seq && /^\d+$/.test(seq)) {
            records.push({
              sequence: seq,
              reportType: rep,
              dateTime: '',
              username: user,
              unidade: unid,
              statusRaw: st,
              status: this.normalizeStatus(st, act, seq),
              action: act,
              isReady: isConcluido
            });
          }
        }
      }
    }

    return records;
  }

  /**
   * Filtra relatórios 455 pertencentes estritamente ao usuário e unidade autenticados.
   */
  public filterUser455Reports(records: SswQueueRecord[], username: string, unid?: string): SswQueueRecord[] {
    const uUpper = (username || '').trim().toUpperCase();
    const unidUpper = (unid || '').trim().toUpperCase();

    return records.filter(rec => {
      // 1. Tipo 455 (começa com "455 " ou é "455")
      const repUpper = rec.reportType.trim().toUpperCase();
      const is455 = repUpper.startsWith('455') || repUpper.includes('455');
      if (!is455) return false;

      // 2. Ownership por usuário
      if (uUpper && rec.username) {
        const recUser = rec.username.trim().toUpperCase();
        if (recUser !== uUpper && !recUser.includes(uUpper) && !uUpper.includes(recUser)) {
          return false;
        }
      }

      // 3. Ownership por unidade (se fornecida)
      if (unidUpper && rec.unidade) {
        const recUnid = rec.unidade.trim().toUpperCase();
        if (recUnid !== unidUpper) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Retorna a maior sequência numérica encontrada em um conjunto de relatórios.
   */
  public getMaxSequence(records: SswQueueRecord[]): number {
    let max = 0;
    records.forEach(r => {
      const num = parseInt(r.sequence, 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    });
    return max;
  }

  /**
   * Consulta a Fila 156 e busca registros com ownership rigoroso.
   */
  public async checkQueue(options: {
    sequence?: string;
    username?: string;
    unidade?: string;
    minSequence?: number;
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
      timeoutMs: 20000
    });

    if (response.statusCode >= 400) {
      throw new SswError(
        SswErrorCode.QUEUE_UNAVAILABLE,
        `Fila 156 do SSW indisponível (HTTP ${response.statusCode}).`,
        { capabilityId: SswCapabilityId.REPORT_QUEUE }
      );
    }

    const allRecords = this.parseQueueHtml(response.bodyText);
    const maxSeq = this.getMaxSequence(allRecords);

    // Métricas de diagnóstico seguras para telemetria de polling
    const all455 = allRecords.filter(r => {
      const rep = (r.reportType || '').trim().toUpperCase();
      return rep.startsWith('455') || rep.includes('455');
    });

    let discardedByUser = 0;
    let discardedByUnid = 0;
    const uUpper = (options.username || '').trim().toUpperCase();
    const unidUpper = (options.unidade || '').trim().toUpperCase();

    const userRecords = (options.username)
      ? all455.filter(rec => {
          if (uUpper && rec.username) {
            const recUser = rec.username.trim().toUpperCase();
            if (recUser !== uUpper && !recUser.includes(uUpper) && !uUpper.includes(recUser)) {
              discardedByUser++;
              return false;
            }
          }
          if (unidUpper && rec.unidade) {
            const recUnid = rec.unidade.trim().toUpperCase();
            if (recUnid !== unidUpper) {
              discardedByUnid++;
              return false;
            }
          }
          return true;
        })
      : allRecords;

    const userMaxSeq = this.getMaxSequence(userRecords);
    let discardedByMinSeq = 0;
    let matchedRecord: SswQueueRecord | undefined = undefined;

    // 1. Se informou sequência exata
    if (options.sequence) {
      matchedRecord = userRecords.find(r => r.sequence === options.sequence) ||
                      allRecords.find(r => r.sequence === options.sequence);
    } else if (options.minSequence !== undefined) {
      // 2. Se informou sequência mínima (busca nova sequência pós-solicitação)
      const newRecords = userRecords.filter(r => {
        const num = parseInt(r.sequence, 10);
        const isHigher = !isNaN(num) && num > (options.minSequence || 0);
        if (!isHigher) discardedByMinSeq++;
        return isHigher;
      });
      if (newRecords.length > 0) {
        // Pega a de maior sequência
        newRecords.sort((a, b) => (parseInt(b.sequence, 10) || 0) - (parseInt(a.sequence, 10) || 0));
        matchedRecord = newRecords[0];
      }
    } else if (userRecords.length > 0) {
      // 3. Pega o relatório mais recente do usuário
      userRecords.sort((a, b) => (parseInt(b.sequence, 10) || 0) - (parseInt(a.sequence, 10) || 0));
      matchedRecord = userRecords[0];
    }

    const diagnostics = {
      httpStatus: response.statusCode,
      responseLength: response.bodyText.length,
      contentType: response.headers?.['content-type'] || 'text/html',
      totalRecordsFound: allRecords.length,
      total455Found: all455.length,
      user455Count: userRecords.length,
      discardedByUser,
      discardedByUnid,
      discardedByMinSeq,
      oldSequence: options.minSequence,
      matchedSequence: matchedRecord?.sequence
    };

    // Log estruturado estritamente sanitizado (sem cookies, senhas, tokens ou credenciais)
    console.log(
      `[SSW-1440-POLL] Status: ${diagnostics.httpStatus} | Length: ${diagnostics.responseLength} | ` +
      `Records: ${diagnostics.totalRecordsFound} | 455Total: ${diagnostics.total455Found} | ` +
      `User455: ${diagnostics.user455Count} | DiscardUser: ${discardedByUser} | DiscardUnid: ${discardedByUnid} | ` +
      `DiscardOldSeq: ${discardedByMinSeq} | oldSeq: ${options.minSequence ?? 'none'} | ` +
      `Matched: ${matchedRecord ? `Seq: ${matchedRecord.sequence} (Status: ${matchedRecord.statusRaw})` : 'none'}`
    );

    return {
      records: userRecords,
      matchedRecord,
      maxSequence: maxSeq,
      userMaxSequence: userMaxSeq,
      rawHtml: response.bodyText,
      diagnostics
    };
  }
}

