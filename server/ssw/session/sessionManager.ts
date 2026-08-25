import { SswCredentials, SswSessionState } from './sessionTypes';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

export type FetchFunction = typeof fetch;

/**
 * Indicadores em HTML que comprovam que uma resposta HTTP 200 é na verdade
 * uma tela de login ou notificação de sessão expirada no SSW.
 */
const LOGIN_HTML_INDICATORS = [
  /<input[^>]+name=["'](?:f4|senha|password|pwd)["']/i,
  /<form[^>]+action=["'][^"']*(?:ssw0422|ssw0010)[^"']*["']/i,
  /id=["'](?:senha|f4)["']/i,
  /Sess[ãa]o\s+expirada/i,
  /Usu[áa]rio\s+n[ãa]o\s+autenticado/i,
  /Acesso\s+n[ãa]o\s+autorizado/i,
  /Efetue\s+o\s+login/i,
  /Login\s+SSW/i,
  /Usu[áa]rio\s+ou\s+senha\s+inv[áa]lidos/i
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
  private readonly defaultBaseUrl = 'https://sistema.ssw.inf.br';

  constructor(options?: {
    credentials?: SswCredentials;
    fetchFn?: FetchFunction;
  }) {
    this.fetchFn = options?.fetchFn || fetch;
    if (options?.credentials) {
      this.setCredentials(options.credentials);
    } else {
      this.loadCredentialsFromEnv();
    }
  }

  /**
   * Carrega credenciais a partir das variáveis de ambiente do backend.
   * Modelagem explícita: empresa, useri, usuario, senha, unidade.
   */
  public loadCredentialsFromEnv(): void {
    const empresa = process.env.SSW_EMPRESA || process.env.SSW_DOMAIN || '';
    const useri = process.env.SSW_USERI || process.env.SSW_USER_I || '';
    const usuario = process.env.SSW_USUARIO || process.env.SSW_USER || process.env.SSW_USERNAME || '';
    const senha = process.env.SSW_SENHA || process.env.SSW_PASSWORD || process.env.SSW_PASS || '';
    const unidade = process.env.SSW_UNIDADE || process.env.SSW_FILIAL || process.env.SSW_DEFAULT_UNID || 'VGA';
    
    // Normaliza a Base URL caso ela tenha sido configurada contendo /bin/ssw... ou barras finais
    let rawBaseUrl = process.env.SSW_BASE_URL || this.defaultBaseUrl;
    rawBaseUrl = rawBaseUrl.replace(/\/bin\/ssw\d+\/?$/i, '').replace(/\/+$/, '');
    const baseUrl = rawBaseUrl || this.defaultBaseUrl;

    if (usuario && senha) {
      this.setCredentials({
        empresa,
        useri: useri || usuario,
        usuario,
        senha,
        unidade,
        baseUrl
      });
    }
  }

  /**
   * Configura credenciais programaticamente.
   */
  public setCredentials(credentials: SswCredentials): void {
    const empresa = credentials.empresa || credentials.domain || '';
    const usuario = credentials.usuario || credentials.username || '';
    const useri = credentials.useri || usuario;
    const senha = credentials.senha || credentials.password || '';
    const unidade = credentials.unidade || credentials.defaultUnid || 'VGA';
    
    let rawBaseUrl = credentials.baseUrl || this.defaultBaseUrl;
    rawBaseUrl = rawBaseUrl.replace(/\/bin\/ssw\d+\/?$/i, '').replace(/\/+$/, '');
    const baseUrl = rawBaseUrl || this.defaultBaseUrl;

    this.credentials = {
      empresa,
      useri,
      usuario,
      senha,
      unidade,
      baseUrl
    };

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
    return Boolean(this.credentials?.usuario && this.credentials?.senha);
  }

  /**
   * Retorna a URL base do SSW.
   */
  public getBaseUrl(): string {
    return this.credentials?.baseUrl || this.defaultBaseUrl;
  }

  /**
   * Retorna a filial/unidade padrão configurada.
   */
  public getDefaultUnid(): string {
    return this.credentials?.unidade || 'VGA';
  }

  /**
   * Retorna o identificador do usuário operacional (f3) autenticado no SSW.
   */
  public getAuthenticatedUsername(): string {
    return this.credentials?.usuario || 'SSW_USER';
  }

  /**
   * Retorna o identificador useri (f2) no SSW.
   */
  public getAuthenticatedUseri(): string {
    return this.credentials?.useri || this.credentials?.usuario || '';
  }

  /**
   * Retorna a empresa/domínio configurado no SSW.
   */
  public getAuthenticatedEmpresa(): string {
    return this.credentials?.empresa || '';
  }

  /**
   * Retorna a unidade autenticada no SSW.
   */
  public getAuthenticatedUnid(): string {
    return this.credentials?.unidade || 'VGA';
  }

  /**
   * Retorna o cabeçalho Cookie formatado para requisições HTTP.
   */
  public getCookieHeader(): string {
    return this.state.cookies.join('; ');
  }

  /**
   * Retorna os cookies iniciais requeridos para o fluxo do SSW.
   */
  public getInitialCookies(): string[] {
    if (!this.credentials) return [];
    const { empresa, useri } = this.credentials;
    return [
      'remember=1',
      `useri=${useri || ''}`,
      `sigla_emp=${empresa || ''}`,
      'ssw4importa=S',
      'ssw0197_seq_cliente=',
      `ssw_dom=${empresa || ''}`
    ];
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
      const [k, v] = (keyVal || '').split('=');
      if (k && v !== undefined) cookieMap.set(k.trim(), v.trim());
    });

    // Mescla os novos
    setCookieHeaders.forEach(setCookieStr => {
      const parts = setCookieStr.split(';');
      const [k, v] = (parts[0] || '').split('=');
      if (k && v !== undefined) {
        cookieMap.set(k.trim(), v.trim());
      }
    });

    this.state.cookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);
  }

  /**
   * Autentica no SSW e estabelece a sessão backend utilizando o protocolo comprovado do SSWTools.
   */
  public async authenticate(): Promise<boolean> {
    if (!this.isConfigured() || !this.credentials) {
      throw new SswError(
        SswErrorCode.NOT_CONFIGURED,
        'Credenciais do SSW (SSW_USUARIO e SSW_SENHA) não configuradas no backend.'
      );
    }

    const { empresa, useri, usuario, senha, baseUrl, unidade } = this.credentials;
    const loginUrl = `${baseUrl || this.defaultBaseUrl}/bin/ssw0422`;

    // Inicializa cookies padrão da referência
    const initialCookies = this.getInitialCookies();
    const cookieMap = new Map<string, string>();
    initialCookies.forEach(c => {
      const [k, v] = c.split('=');
      if (k) cookieMap.set(k.trim(), (v || '').trim());
    });
    this.state.cookies = Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`);

    // Payload de login comprovado
    const bodyParams = new URLSearchParams();
    bodyParams.append('act', 'L');
    bodyParams.append('f1', empresa || '');
    bodyParams.append('f2', useri || usuario);
    bodyParams.append('f3', usuario);
    bodyParams.append('f4', senha);
    bodyParams.append('f6', 'TRUE');
    bodyParams.append('backimg', 'ssw13.jpg');
    bodyParams.append('dummy', String(Date.now()));

    try {
      const response = await this.fetchFn(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.getCookieHeader(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RouterOperational/1.26.0',
          'Referer': `${baseUrl || this.defaultBaseUrl}/bin/ssw0422`,
          'Origin': baseUrl || this.defaultBaseUrl
        },
        body: bodyParams.toString(),
        redirect: 'manual'
      });

      this.updateCookiesFromHeaders(response.headers);
      const arrayBuf = await response.arrayBuffer();
      let responseText = '';
      try {
        const decoder = new TextDecoder('iso-8859-1');
        responseText = decoder.decode(arrayBuf);
      } catch {
        responseText = new TextDecoder('utf-8').decode(arrayBuf);
      }

      // Diagnóstico seguro (sem senhas, tokens ou valores confidenciais)
      const setCookiesReceived = typeof (response.headers as any).getSetCookie === 'function' 
        ? (response.headers as any).getSetCookie() 
        : [response.headers.get('set-cookie')];
      const cookieNames = setCookiesReceived.filter(Boolean).map((c: string) => c.split(';')[0].split('=')[0].trim());
      const location = response.headers.get('location');

      console.log(`[SSW-AUTH-DIAG] POST ${loginUrl} -> Status: ${response.status}, Redirect: ${location || 'none'}, Set-Cookies: [${cookieNames.join(', ')}], BodyLength: ${responseText.length}`);

      // Se a resposta for a página de sucesso (auto-submit document.frmlogin.submit() -> /bin/menu01)
      const isSuccessAutoSubmit = responseText.includes('frmlogin') && responseText.includes('menu01');

      // Se a resposta contiver campos de login de volta com erro, a autenticação falhou
      if (!isSuccessAutoSubmit && this.isLoginHtmlResponse(responseText)) {
        this.state.isAuthenticated = false;
        console.warn('[SSW-AUTH-DIAG] Resposta classificada como formulário de login ou sessão não autorizada.');
        throw new SswError(
          SswErrorCode.AUTH_FAILED,
          'Falha na autenticação SSW: Credenciais inválidas ou tela de login retornada.'
        );
      }

      this.state.isAuthenticated = true;
      this.state.authenticatedUser = usuario;
      this.state.authenticatedUseri = useri;
      this.state.authenticatedEmpresa = empresa;
      this.state.authenticatedUnid = unidade;
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
    authenticatedEmpresa?: string;
    authenticatedUnid?: string;
    lastAuthenticatedAt?: string;
  } {
    return {
      isConfigured: this.isConfigured(),
      isAuthenticated: this.state.isAuthenticated,
      authenticatedUser: this.state.authenticatedUser,
      authenticatedEmpresa: this.state.authenticatedEmpresa,
      authenticatedUnid: this.state.authenticatedUnid,
      lastAuthenticatedAt: this.state.lastAuthenticatedAt
    };
  }
}
