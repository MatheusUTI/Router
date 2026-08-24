import { SswSessionManager, FetchFunction } from '../session/sessionManager';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export interface SswHttpRequestOptions {
  method?: 'GET' | 'POST';
  endpoint: string;
  payload?: Record<string, string | number | boolean | undefined> | string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuthCheck?: boolean;
  expectedEncoding?: 'utf-8' | 'iso-8859-1';
}

export interface SswHttpResponse {
  statusCode: number;
  headers: Headers;
  bodyText: string;
  bodyBuffer: ArrayBuffer;
  latencyMs: number;
  contentType: string;
}

/**
 * Cliente HTTP seguro para comunicação do backend do Router com o SSW.
 */
export class SswHttpClient {
  private sessionManager: SswSessionManager;
  private fetchFn: FetchFunction;

  constructor(sessionManager: SswSessionManager, fetchFn?: FetchFunction) {
    this.sessionManager = sessionManager;
    this.fetchFn = fetchFn || fetch;
  }

  /**
   * Executa uma requisição HTTP para o SSW com injeção automática de cookies de sessão.
   */
  public async request(options: SswHttpRequestOptions): Promise<SswHttpResponse> {
    if (!options.skipAuthCheck) {
      await this.sessionManager.ensureAuthenticated();
    }

    const baseUrl = this.sessionManager.getBaseUrl();
    const cleanEndpoint = options.endpoint.startsWith('/') ? options.endpoint : `/${options.endpoint}`;
    const targetUrl = `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RouterOperational/1.25.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/csv,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      ...options.headers
    };

    const cookieHeader = this.sessionManager.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    let requestBody: string | undefined = undefined;
    const method = options.method || 'GET';

    if (method === 'POST') {
      if (typeof options.payload === 'string') {
        requestBody = options.payload;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else if (options.payload && typeof options.payload === 'object') {
        const formParams = new URLSearchParams();
        Object.entries(options.payload).forEach(([k, v]) => {
          if (v !== undefined) {
            formParams.append(k, String(v));
          }
        });
        requestBody = formParams.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 30000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startMs = Date.now();

    try {
      const response = await this.fetchFn(targetUrl, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
        redirect: 'follow'
      });

      const latencyMs = Date.now() - startMs;
      clearTimeout(timer);

      // Atualiza cookies retornados pelo servidor
      this.sessionManager.updateCookiesFromHeaders(response.headers);

      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || '';

      // Decodificação inteligente de caracteres (suporte a ISO-8859-1 típico do SSW legado)
      let bodyText = '';
      const encoding = options.expectedEncoding || (contentType.toLowerCase().includes('iso-8859') ? 'iso-8859-1' : 'utf-8');
      
      try {
        const decoder = new TextDecoder(encoding);
        bodyText = decoder.decode(arrayBuffer);
      } catch {
        const fallbackDecoder = new TextDecoder('utf-8');
        bodyText = fallbackDecoder.decode(arrayBuffer);
      }

      // Verificação anti-falso-200 (se o SSW retornou página de login em vez do conteúdo esperado)
      if (this.sessionManager.isLoginHtmlResponse(bodyText)) {
        this.sessionManager.invalidateSession();
        throw new SswError(
          SswErrorCode.SESSION_EXPIRED,
          'A sessão com o SSW expirou durante a operação. Reautenticação necessária.',
          { isRetryable: true }
        );
      }

      return {
        statusCode: response.status,
        headers: response.headers,
        bodyText,
        bodyBuffer: arrayBuffer,
        latencyMs,
        contentType
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof SswError) throw err;

      if (err.name === 'AbortError') {
        throw new SswError(
          SswErrorCode.JOB_TIMEOUT,
          `Tempo limite esgotado (${timeoutMs}ms) na comunicação com o SSW em ${options.endpoint}.`,
          { isRetryable: true }
        );
      }

      throw new SswError(
        SswErrorCode.NETWORK_ERROR,
        `Erro de rede na comunicação com o SSW (${options.endpoint}): ${err.message || 'Falha de conexão'}`,
        { details: err.message, isRetryable: true }
      );
    }
  }
}
