import { SswFullConfigDTO, SswConnectionConfig, Ssw455Config } from '../integrations/ssw/types/config';
import { SswHealthSummaryDTO } from '../integrations/ssw/contracts/dtos';

export interface SswValidationResponse {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig: Ssw455Config;
}

export interface SswConnectionTestResult {
  success: boolean;
  message: string;
  session?: {
    isConfigured: boolean;
    isAuthenticated: boolean;
    authenticatedUser?: string;
    authenticatedEmpresa?: string;
    authenticatedUnid?: string;
    lastAuthenticatedAt?: string;
  };
  error?: string;
  code?: string;
}

/**
 * Cliente de serviço para gerenciamento da Configuração Central SSW.
 */
export const SswConfigService = {
  /**
   * Obtém a configuração completa ativa no backend (sem expor segredos).
   */
  async getConfig(): Promise<SswFullConfigDTO> {
    const res = await fetch('/api/ssw/config');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro HTTP ${res.status} ao carregar configurações SSW`);
    }
    const data = await res.json();
    return data.config;
  },

  /**
   * Salva alterações na configuração de conexão e/ou capabilities.
   */
  async saveConfig(payload: {
    connection?: Partial<SswConnectionConfig>;
    capabilities?: {
      '455'?: Partial<Ssw455Config>;
    };
  }): Promise<SswFullConfigDTO> {
    const res = await fetch('/api/ssw/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro HTTP ${res.status} ao salvar configurações SSW`);
    }

    const data = await res.json();
    return data.config;
  },

  /**
   * Restaura os parâmetros da Capability 455 para o padrão canônico do SSWTools.
   */
  async restore455Defaults(): Promise<{ config455: Ssw455Config; fullConfig: SswFullConfigDTO }> {
    const res = await fetch('/api/ssw/config/455/restore-defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao restaurar parâmetros padrão do SSWTools');
    }

    const data = await res.json();
    return {
      config455: data.config455,
      fullConfig: data.fullConfig
    };
  },

  /**
   * Valida parâmetros da Capability 455 antes da persistência.
   */
  async validate455Config(params: Partial<Ssw455Config>): Promise<SswValidationResponse> {
    const res = await fetch('/api/ssw/config/455/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao validar parâmetros do 455');
    }

    const data = await res.json();
    return data.validation;
  },

  /**
   * Executa o teste de conexão com o SSW.
   */
  async testConnection(): Promise<SswConnectionTestResult> {
    const res = await fetch('/api/ssw/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: data.error || 'Falha ao testar conexão com o SSW',
        error: data.error,
        code: data.code
      };
    }

    return {
      success: true,
      message: data.message || 'Conexão autenticada com sucesso!',
      session: data.session
    };
  },

  /**
   * Obtém o diagnóstico de telemetria e integridade das capacidades SSW.
   */
  async getHealthSummary(): Promise<{
    health: SswHealthSummaryDTO;
    session: {
      isConfigured: boolean;
      isAuthenticated: boolean;
      authenticatedUser?: string;
      authenticatedEmpresa?: string;
      authenticatedUnid?: string;
      lastAuthenticatedAt?: string;
    };
  }> {
    const res = await fetch('/api/ssw/health');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao carregar telemetria de saúde do SSW');
    }
    const data = await res.json();
    return {
      health: data.health,
      session: data.session
    };
  }
};
