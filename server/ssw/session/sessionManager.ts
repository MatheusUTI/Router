import { SswCredentials, SswSessionState } from './sessionTypes';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export type FetchFunction = typeof fetch;

/**
 * Indicadores em HTML que comprovam que uma resposta HTTP 200 é na verdade
 * uma tela de login ou notificação de sessão expirada no SSW.
 */
const LOGIN_HTML_INDICATORS = [
  /<input[^>]+name=["'](?:senha|password|pwd)["']/i,
  /<form[^>]+action=["'][^"']*ssw0010[^"']*["']/i,
  /id=["']senha["']/i,
  /Sess[ãa]o\s+expirada/i,
  /Usu[áa]rio\s+n[ãa]o\s+autenticado/i,
  /Acesso\s+n[ãa]o\s+autorizado/i,
  /Efetue\s+o\s+login/i,
  /Login\s+SSW/i
];

/**
 * Gerenciador de sessão autenticada do SSW com isolamento estrito no backend.
 */
export class SswSessionManager {
  private credentials: SswCredentials | null = null;
  private state: SswSessionState = {
    isAuthenticated: false,
    cookies: []
  };
  private fetchFn: FetchFunction;
  private readonly defaultBaseUrl = 'https://ssw.inf.br';

  constructor(options?: {
    credentials?: SswCredentials;
    fetchFn?: FetchFunction;
  }) {
    this.fetchFn = options?.fetchFn || fetch;
    if (options?.credentials) {
      this.credentials = options.credentials;
    } else {
      this.loadCredentialsFromEnv();
    }
  }

  /**
   * Carrega credenciais a partir das variáveis de ambiente do backend.
   */
  public loadCredentialsFromEnv(): void {
    const username = process.env.SSW_USER || process.env.SSW_USERNAME || '';
    const password = process.env.SSW_PASSWORD || process.env.SSW_PASS || '';
    const domain = process.env.SSW_DOMAIN || process.env.SSW_EMPRESA || '';
    const baseUrl = process.env.SSW_BASE_URL || this.defaultBaseUrl;
    const defaultUnid = process.env.SSW_DEFAULT_UNID || process.env.SSW_FILIAL || 'VGA';

    if (username && password) {
      this.credentials = {
        domain,
        username,
        password,
        baseUrl,
        defaultUnid
      };
    }
  }

  /**
   * Configura credenciais programaticamente.
   */
  public setCredentials(credentials: SswCredentials): void {
    this.credentials = credentials;
    // Invalida sessão anterior ao trocar credenciais
    this.state = {
      isAuthenticated: false,
      cookies: []
    };
  }

  /**
   * Retorna se o gerenciador possui credenciais configuradas.
   */
  public isConfigured(): boolean {
    return Boolean(this.credentials?.username && this.credentials?.password);
  }

  /**
   * Retorna a URL base do SSW.
   */
  public getBaseUrl(): string {
    return this.credentials?.baseUrl || this.defaultBaseUrl;
  }

  /**
   * Retorna a filial padrão configurada.
   */
  public getDefaultUnid(): string {
    return this.credentials?.defaultUnid || 'VGA';
  }

  /**
   * Retorna o identificador do usuário autenticado no SSW.
   */
  public getAuthenticatedUsername(): string {
    return this.credentials?.username || 'SSW_USER';
  }

  /**
   * Retorna o cabeçalho Cookie formatado para requisições HTTP.
   */
  public getCookieHeader(): string {
    return this.state.cookies.join('; ');
  }

  /**
   * Verifica se o corpo da resposta HTML corresponde a uma página de login ou sessão expirada.
   */
  public isLoginHtmlResponse(htmlText: string): boolean {
    if (!htmlText || typeof htmlText !== 'string') return false;
    return LOGIN_HTML_INDICATORS.some(pattern => pattern.test(htmlText));
  }

  /**
   * Atualiza a coleção de cookies com base nos cabeçalhos Set-Cookie da resposta.
   */
  public updateCookiesFromHeaders(headers: Headers): void {
    // Node.js fetch / undici headers.getSetCookie() ou headers.get('set-cookie')
    let setCookieHeaders: string[] = [];
    if (typeof (headers as any).getSetCookie === 'function') {
      setCookieHeaders = (headers as any).getSetCookie();
    } else {
      const single = headers.get('set-cookie');
      if (single) {
        setCookieHeaders = [single];
      }
    }

    if (setCookieHeaders.length === 0) return;

    const cookieMap = new Map<string, string>();
    // Preenche com os cookies atuais
    this.state.cookies.forEach(c => {
      const [keyVal] = c.split(';');
      const [k, v] = keyVal.split('=');
      if (k && v) cookieMap.set(k.trim(), v.trim());
    });

    // Mescla os novos
    setCookieHeaders.forEach(setCookieStr => {
      const parts = setCookieStr.split(';');
      const [k, v] = (parts[0] || '').split('=');
      if (k && v) {
        cookieMap.set(k.trim(), v.trim());
      }
    });

    this.state.cookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
  }

  /**
   * Autentica no SSW e estabelece a sessão backend.
   */
  public async authenticate(): Promise<boolean> {
    if (!this.isConfigured() || !this.credentials) {
      throw new SswError(
        SswErrorCode.NOT_CONFIGURED,
        'Credenciais do SSW (SSW_USER e SSW_PASSWORD) não configuradas no backend.'
      );
    }

    const { username, password, domain, baseUrl } = this.credentials;
    const loginUrl = `${baseUrl || this.defaultBaseUrl}/bin/ssw0010`;

    const bodyParams = new URLSearchParams();
    if (domain) bodyParams.append('empresa', domain);
    bodyParams.append('usuario', username);
    bodyParams.append('senha', password);

    try {
      const response = await this.fetchFn(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RouterOperational/1.25.0'
        },
        body: bodyParams.toString(),
        redirect: 'manual'
      });

      this.updateCookiesFromHeaders(response.headers);
      const responseText = await response.text();

      // Se a resposta contiver campos de login de volta com erro, a autenticação falhou
      if (this.isLoginHtmlResponse(responseText)) {
        this.state.isAuthenticated = false;
        throw new SswError(
          SswErrorCode.AUTH_FAILED,
          'Falha na autenticação SSW: Credenciais inválidas ou tela de login retornada.'
        );
      }

      this.state.isAuthenticated = true;
      this.state.authenticatedUser = username;
      this.state.lastAuthenticatedAt = new Date().toISOString();

      return true;
    } catch (err: any) {
      this.state.isAuthenticated = false;
      if (err instanceof SswError) throw err;
      throw new SswError(
        SswErrorCode.NETWORK_ERROR,
        `Falha de conexão com o SSW durante login: ${err.message || 'Erro de rede'}`,
        { details: err.message }
      );
    }
  }

  /**
   * Garante que existe uma sessão ativa antes de executar qualquer requisição.
   */
  public async ensureAuthenticated(): Promise<void> {
    if (!this.state.isAuthenticated || this.state.cookies.length === 0) {
      await this.authenticate();
    }
  }

  /**
   * Invalida a sessão atual (ex: após detectar expiração).
   */
  public invalidateSession(): void {
    this.state.isAuthenticated = false;
    this.state.cookies = [];
  }

  /**
   * Retorna um resumo seguro do estado da sessão (sem expor senhas ou cookies).
   */
  public getSafeStatus(): {
    isConfigured: boolean;
    isAuthenticated: boolean;
    authenticatedUser?: string;
    lastAuthenticatedAt?: string;
  } {
    return {
      isConfigured: this.isConfigured(),
      isAuthenticated: this.state.isAuthenticated,
      authenticatedUser: this.state.authenticatedUser,
      lastAuthenticatedAt: this.state.lastAuthenticatedAt
    };
  }
}
