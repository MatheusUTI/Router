import { SswCapabilityId } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswHttpClient } from './httpClient';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface SswDownloadMetadata {
  internalName: string;
  internalPath: string;
}

export interface SswDownloadResult {
  csvContent: string;
  byteLength: number;
  statusCode: number;
  metadata?: SswDownloadMetadata;
}

/**
 * Extrai os metadados de download (internalName e internalPath) a partir do campo web_body
 * retornado pelo SSW na ação DOW<SEQ> (/bin/ssw1440).
 * Fonte de verdade: extract_download_meta455() do SSWTools.
 */
export function extractDownloadMeta455(html: string): SswDownloadMetadata | null {
  if (!html || typeof html !== 'string') return null;

  // 1. Localiza o input web_body sem aplicar unquote na página inteira
  let webBodyRaw: string | null = null;
  
  // Suporta value="..." ou value='...' com atributos em qualquer ordem
  const matchDouble = /<input\b[^>]*?\bname="web_body"[^>]*?\bvalue="([^"]*)"/i.exec(html) ||
                      /<input\b[^>]*?\bvalue="([^"]*)"[^>]*?\bname="web_body"/i.exec(html);
  
  const matchSingle = /<input\b[^>]*?\bname='web_body'[^>]*?\bvalue='([^']*)'/i.exec(html) ||
                      /<input\b[^>]*?\bvalue='([^']*)'[^>]*?\bname='web_body'/i.exec(html);

  if (matchDouble) {
    webBodyRaw = matchDouble[1];
  } else if (matchSingle) {
    webBodyRaw = matchSingle[1];
  } else {
    // Fallback genérico para name=web_body value=...
    const matchFallback = /web_body[^>]*?value=["']?([^"'\s>]+)/i.exec(html);
    if (matchFallback) {
      webBodyRaw = matchFallback[1];
    }
  }

  // 2. Aplica unquote no valor específico do web_body ou no próprio HTML como fallback
  const targetsToSearch: string[] = [];
  if (webBodyRaw) {
    try {
      targetsToSearch.push(decodeURIComponent(webBodyRaw));
    } catch {
      // Ignora
    }
    try {
      targetsToSearch.push(unescape(webBodyRaw));
    } catch {
      // Ignora
    }
    targetsToSearch.push(webBodyRaw);
  }
  targetsToSearch.push(html);

  // 3. Extrai os parâmetros da função JavaScript abrir(...)
  // Exemplo no SSW: abrir('RCS00539427.csv', 'RCS00539427.csv', 1, 1, '/usr/aws/jobs/RCS/', 4);
  // Argumento 1: Nome do arquivo / act (ex: 'RCS00539427.csv')
  // Argumento 5 (ou último string com barra): Caminho do diretório (ex: '/usr/aws/jobs/RCS/')
  for (const text of targetsToSearch) {
    const abrirMatch = /abrir\s*\(\s*([^)]+)\)/i.exec(text);
    if (abrirMatch) {
      const argsRaw = abrirMatch[1];
      // Quebra argumentos respeitando aspas ou vírgulas
      const stringMatches = Array.from(argsRaw.matchAll(/['"]([^'"]*)['"]/g)).map(m => m[1].trim());
      
      if (stringMatches.length >= 2) {
        const internalName = stringMatches[0];
        // O path é tipicamente o elemento que contém barras '/' ou o último argumento de string
        const internalPath = stringMatches.find((s, idx) => idx > 0 && s.includes('/')) || stringMatches[stringMatches.length - 1];

        return {
          internalName,
          internalPath
        };
      }
    }
  }

  return null;
}

/**
 * Gateway responsável por baixar o arquivo CSV do Relatório SSW 455.
 * Implementa o protocolo comprovado em duas etapas do SSWTools:
 * 1. POST /bin/ssw1440 com act=DOW<SEQ> para extrair internalName e internalPath do web_body.
 * 2. GET /bin/ssw0424 com act, filename, path, down=1, nw=1 e encoding iso-8859-1.
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
    internalName?: string;
    internalPath?: string;
  }): Promise<SswDownloadResult> {
    const sequence = options.sequence?.trim();
    let meta: SswDownloadMetadata | null = null;

    if (options.internalName && options.internalPath) {
      meta = {
        internalName: options.internalName,
        internalPath: options.internalPath
      };
    }

    // ETAPA 1: Se possuímos sequência e não temos os metadados internos, executa POST DOW<SEQ> no ssw1440
    if (!meta && sequence) {
      const queueCapability = await this.registry.get(SswCapabilityId.REPORT_QUEUE);
      const queueEndpoint = queueCapability?.currentEndpoint || '/bin/ssw1440';

      const metaResponse = await this.httpClient.request({
        method: 'POST',
        endpoint: queueEndpoint,
        payload: {
          act: `DOW${sequence}`,
          dummy: String(Date.now())
        },
        headers: {
          Referer: 'https://sistema.ssw.inf.br/bin/ssw1440'
        },
        timeoutMs: 30000
      });

      if (metaResponse.statusCode === 200) {
        meta = extractDownloadMeta455(metaResponse.bodyText);
      }
    }

    // ETAPA 2: Executa GET no ssw0424 para baixar o arquivo real
    const downloadCapability = await this.registry.get(SswCapabilityId.REPORT_DOWNLOAD);
    const downloadBaseEndpoint = downloadCapability?.currentEndpoint || '/bin/ssw0424';

    let finalUrl = '';
    if (options.downloadUrl) {
      finalUrl = options.downloadUrl;
    } else if (meta) {
      const qParams = new URLSearchParams();
      qParams.append('act', meta.internalName);
      qParams.append('filename', meta.internalName);
      qParams.append('path', meta.internalPath);
      qParams.append('down', '1');
      qParams.append('nw', '1');
      finalUrl = `${downloadBaseEndpoint}?${qParams.toString()}`;
    } else if (sequence) {
      // Fallback gracioso para download por sequência direta
      finalUrl = `${downloadBaseEndpoint}?seq=${sequence}&rel=455`;
    } else {
      finalUrl = downloadBaseEndpoint;
    }

    const response = await this.httpClient.request({
      method: 'GET',
      endpoint: finalUrl,
      headers: {
        'Referer': 'https://sistema.ssw.inf.br/bin/ssw1440',
        'Accept-Encoding': 'identity'
      },
      timeoutMs: 60000,
      expectedEncoding: 'iso-8859-1'
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

    // Validação de estrutura do CSV
    this.validateCsvStructure(rawContent);

    return {
      csvContent: rawContent,
      byteLength: response.bodyBuffer.byteLength,
      statusCode: response.statusCode,
      metadata: meta || undefined
    };
  }
}

