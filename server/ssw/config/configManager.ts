import {
  SswConnectionConfig,
  Ssw455Config,
  SswFullConfigDTO,
  DEFAULT_SSW_455_CONFIG,
  FUTURE_SSW_CAPABILITIES
} from '../../../src/integrations/ssw/types/config';
import { SswSessionManager } from '../session/sessionManager';

export interface Ssw455ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig: Ssw455Config;
}

/**
 * Gerenciador de Configuração Centralizada da Integração SSW.
 * Obedece ao princípio arquitetural:
 * Configuração SSW -> Capability Configuration -> Application Service -> Gateway -> SSW
 * 
 * Segredos (senhas, tokens) são mantidos isolados no backend e nunca expostos na UI.
 */
export class SswConfigManager {
  private connection: SswConnectionConfig;
  private ssw455Config: Ssw455Config;
  private sessionManager: SswSessionManager | null = null;
  private lastSavedAt: string;

  constructor(sessionManager?: SswSessionManager) {
    this.sessionManager = sessionManager || null;
    this.ssw455Config = { ...DEFAULT_SSW_455_CONFIG };
    this.lastSavedAt = new Date().toISOString();

    // Inicializa a partir das variáveis de ambiente e defaults seguros
    const empresa = process.env.SSW_EMPRESA || process.env.SSW_DOMAIN || '';
    const useri = process.env.SSW_USERI || process.env.SSW_USER_I || '';
    const usuario = process.env.SSW_USUARIO || process.env.SSW_USER || process.env.SSW_USERNAME || '';
    const senha = process.env.SSW_SENHA || process.env.SSW_PASSWORD || process.env.SSW_PASS || '';
    const unidade = process.env.SSW_UNIDADE || process.env.SSW_FILIAL || process.env.SSW_DEFAULT_UNID || 'VGA';
    const baseUrl = process.env.SSW_BASE_URL || 'https://sistema.ssw.inf.br';

    this.connection = {
      empresa,
      useri: useri || usuario,
      usuario,
      senha,
      unidade,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      hasPassword: Boolean(senha),
      lastUpdated: new Date().toISOString()
    };
  }

  public setSessionManager(sessionManager: SswSessionManager): void {
    this.sessionManager = sessionManager;
    // Sincroniza credenciais
    if (this.connection.usuario && this.connection.senha) {
      this.sessionManager.setCredentials({
        empresa: this.connection.empresa,
        useri: this.connection.useri || this.connection.usuario,
        usuario: this.connection.usuario,
        senha: this.connection.senha,
        unidade: this.connection.unidade,
        baseUrl: this.connection.baseUrl
      });
    }
  }

  /**
   * Retorna a configuração completa segura para exposição na API/Frontend (senha mascarada/removida).
   */
  public getPublicConfig(): SswFullConfigDTO {
    return {
      connection: {
        empresa: this.connection.empresa,
        useri: this.connection.useri,
        usuario: this.connection.usuario,
        unidade: this.connection.unidade,
        baseUrl: this.connection.baseUrl,
        hasPassword: Boolean(this.connection.senha && this.connection.senha.trim().length > 0),
        lastUpdated: this.connection.lastUpdated
      },
      capabilities: {
        '455': { ...this.ssw455Config },
        '101': FUTURE_SSW_CAPABILITIES['101'],
        '063': FUTURE_SSW_CAPABILITIES['063'],
        '029': FUTURE_SSW_CAPABILITIES['029'],
        '030': FUTURE_SSW_CAPABILITIES['030'],
        '023': FUTURE_SSW_CAPABILITIES['023'],
        '264': FUTURE_SSW_CAPABILITIES['264']
      },
      lastSavedAt: this.lastSavedAt
    };
  }

  /**
   * Retorna a configuração de conexão ativa (com senha interna).
   */
  public getConnectionConfig(): SswConnectionConfig {
    return { ...this.connection };
  }

  /**
   * Retorna os parâmetros atuais da Capability 455.
   */
  public get455Config(): Ssw455Config {
    return { ...this.ssw455Config };
  }

  /**
   * Atualiza a configuração de conexão e sincroniza com o SessionManager.
   */
  public updateConnectionConfig(newConn: Partial<SswConnectionConfig>): SswConnectionConfig {
    const existingPassword = this.connection.senha || '';
    const updatedPassword = (newConn.senha !== undefined && newConn.senha.trim() !== '')
      ? newConn.senha.trim()
      : existingPassword;

    this.connection = {
      empresa: newConn.empresa !== undefined ? newConn.empresa.trim() : this.connection.empresa,
      useri: newConn.useri !== undefined ? newConn.useri.trim() : this.connection.useri,
      usuario: newConn.usuario !== undefined ? newConn.usuario.trim() : this.connection.usuario,
      senha: updatedPassword,
      unidade: newConn.unidade !== undefined ? newConn.unidade.trim().toUpperCase() : this.connection.unidade,
      baseUrl: (newConn.baseUrl !== undefined ? newConn.baseUrl.trim() : this.connection.baseUrl).replace(/\/+$/, ''),
      hasPassword: Boolean(updatedPassword && updatedPassword.length > 0),
      lastUpdated: new Date().toISOString()
    };

    this.lastSavedAt = new Date().toISOString();

    if (this.sessionManager) {
      this.sessionManager.setCredentials({
        empresa: this.connection.empresa,
        useri: this.connection.useri || this.connection.usuario,
        usuario: this.connection.usuario,
        senha: this.connection.senha || '',
        unidade: this.connection.unidade,
        baseUrl: this.connection.baseUrl
      });
    }

    return this.getConnectionConfig();
  }

  /**
   * Atualiza os parâmetros configuráveis da Capability 455.
   */
  public update455Config(newConfig: Partial<Ssw455Config>): Ssw455Config {
    const validation = this.validate455Config(newConfig);
    if (!validation.isValid) {
      throw new Error(`Configuração 455 inválida: ${validation.errors.join(', ')}`);
    }

    this.ssw455Config = {
      ...this.ssw455Config,
      ...validation.normalizedConfig
    };

    this.lastSavedAt = new Date().toISOString();
    return { ...this.ssw455Config };
  }

  /**
   * Restaura os parâmetros da Capability 455 para os defaults exatos do SSWTools.
   */
  public restore455Defaults(): Ssw455Config {
    this.ssw455Config = { ...DEFAULT_SSW_455_CONFIG };
    this.lastSavedAt = new Date().toISOString();
    return { ...this.ssw455Config };
  }

  /**
   * Valida um conjunto de parâmetros da Capability 455 contra o protocolo SSWTools.
   */
  public validate455Config(params: Partial<Ssw455Config>): Ssw455ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const merged: Ssw455Config = {
      ...this.ssw455Config,
      ...params
    };

    const validPeriodos = ['AUTORIZACAO', 'EMISSAO', 'PREVISAO', 'ENTREGA'];
    if (merged.tipoPeriodo && !validPeriodos.includes(merged.tipoPeriodo.toUpperCase())) {
      errors.push(`Tipo de período '${merged.tipoPeriodo}' inválido. Valores aceitos: ${validPeriodos.join(', ')}`);
    }

    if (merged.arquivo !== 'e') {
      warnings.push(`Formato de arquivo configurado como '${merged.arquivo}'. O parser automático exige formato Excel/CSV ('e').`);
    }

    if (merged.dadosComplementares !== 'B') {
      warnings.push(`Dados complementares configurado como '${merged.dadosComplementares}'. O parser padrão requer 'B' (Bloco completo).`);
    }

    if (merged.entrega !== 'p') {
      warnings.push(`Status de entrega configurado como '${merged.entrega}'. O padrão operacional para novas cargas em rota é 'p' (Pendentes).`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      normalizedConfig: {
        ...merged,
        tipoPeriodo: (merged.tipoPeriodo || 'AUTORIZACAO').toUpperCase() as any
      }
    };
  }
}

let globalConfigManager: SswConfigManager | null = null;

export function getSswConfigManager(sessionManager?: SswSessionManager): SswConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new SswConfigManager(sessionManager);
  } else if (sessionManager) {
    globalConfigManager.setSessionManager(sessionManager);
  }
  return globalConfigManager;
}
