import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface SswDownloadResult {
  csvContent: string;
  byteLength: number;
  statusCode: number;
}

/**
 * Gateway responsável por baixar o arquivo CSV do Relatório SSW 455.
 * Enforça validações de integridade, sanitização de BOM e rejeição de HTML falso.
 */
export class SswReportDownloadGateway {
  private registry: SswCapabilityRegistry;
  private httpClient: SswHttpClient;

  constructor(registry: SswCapabilityRegistry, httpClient: SswHttpClient) {
    this.registry = registry;
    this.httpClient = httpClient;
  }

  /**
   * Valida se a string de retorno parece com um CSV legítimo e não um HTML de erro/login.
   */
  public validateCsvStructure(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new SswError(
        SswErrorCode.INVALID_REPORT_CONTENT,
        'O relatório baixado do SSW retornou conteúdo vazio.'
      );
    }

    const first500 = content.substring(0, 500).trim();

    // Rejeição de páginas HTML retornadas como falso-200
    if (
      first500.startsWith('<!DOCTYPE') ||
      first500.startsWith('<html') ||
      first500.startsWith('<head') ||
      first500.startsWith('<body') ||
      first500.includes('<table') ||
      first500.includes('<form')
    ) {
      throw new SswError(
        SswErrorCode.INVALID_REPORT_CONTENT,
        'O SSW retornou uma página HTML em vez do arquivo CSV de relatório.'
      );
    }

    // Deve possuir ao menos um delimitador (; ou ,) e quebras de linha
    const hasSemicolon = content.includes(';');
    const hasComma = content.includes(',');
    const hasLineBreak = content.includes('\n');

    if ((!hasSemicolon && !hasComma) || !hasLineBreak) {
      throw new SswError(
        SswErrorCode.INVALID_REPORT_CONTENT,
        'O conteúdo retornado não possui estrutura tabular válida de CSV (delimitador ou linhas ausentes).'
      );
    }
  }

  /**
   * Baixa o relatório 455 gerado a partir do número de sequência ou URL de download.
   */
  public async downloadReport(options: {
    sequence?: string;
    downloadUrl?: string;
  }): Promise<SswDownloadResult> {
    const capability = await this.registry.get(SswCapabilityId.REPORT_DOWNLOAD);
    let endpoint = capability?.currentEndpoint || '/bin/ssw0424';

    if (options.downloadUrl) {
      endpoint = options.downloadUrl;
    } else if (options.sequence) {
      endpoint = `${endpoint}?seq=${options.sequence}&rel=455`;
    }

    const response = await this.httpClient.request({
      method: 'GET',
      endpoint,
      timeoutMs: 45000,
      expectedEncoding: 'iso-8859-1' // Relatórios legados do SSW comumente utilizam ISO-8859-1
    });

    if (response.statusCode >= 400) {
      throw new SswError(
        SswErrorCode.DOWNLOAD_FAILED,
        `Falha ao baixar o relatório no SSW (HTTP ${response.statusCode}).`,
        { capabilityId: SswCapabilityId.REPORT_DOWNLOAD }
      );
    }

    // Limpa BOM caso presente no início
    const rawContent = response.bodyText.replace(/^\uFEFF/, '');

    // Validação de estrutura
    this.validateCsvStructure(rawContent);

    return {
      csvContent: rawContent,
      byteLength: response.bodyBuffer.byteLength,
      statusCode: response.statusCode
    };
  }
}
