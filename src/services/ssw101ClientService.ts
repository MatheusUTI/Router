import {
  Ssw101CtrcDetailDTO,
  Ssw101QueryRequestDTO,
  Ssw101SearchResultDTO
} from '../integrations/ssw/contracts/dtos';

/**
 * Cliente frontend para consultas analíticas sob demanda na Opção SSW 101.
 */
export class Ssw101ClientService {
  /**
   * Executa uma consulta customizada via POST /api/ssw/101/query.
   */
  public static async query(request: Ssw101QueryRequestDTO): Promise<Ssw101SearchResultDTO> {
    try {
      const response = await fetch('/api/ssw/101/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      if (!response.ok && !data.found) {
        return {
          success: false,
          found: false,
          resultsCount: 0,
          rawMessage: data.error || `Erro HTTP ${response.status} na consulta SSW 101`
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        found: false,
        resultsCount: 0,
        rawMessage: err.message || 'Falha de comunicação com o servidor'
      };
    }
  }

  /**
   * Consulta detalhada de um CTRC pelo seu código ou número.
   */
  public static async queryCtrc(ctrcId: string, forceFresh: boolean = false): Promise<Ssw101SearchResultDTO> {
    try {
      const encodedId = encodeURIComponent(ctrcId.trim());
      const queryParam = forceFresh ? '?fresh=true' : '';
      const response = await fetch(`/api/ssw/101/ctrc/${encodedId}${queryParam}`);

      const data = await response.json();
      if (!response.ok && !data.found) {
        return {
          success: false,
          found: false,
          resultsCount: 0,
          rawMessage: data.error || `Erro ao consultar CTRC ${ctrcId}`
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        found: false,
        resultsCount: 0,
        rawMessage: err.message || 'Falha ao consultar CTRC no servidor'
      };
    }
  }

  /**
   * Consulta de Notas Fiscais pelo número e opcionalmente CNPJ do remetente.
   */
  public static async queryNf(numeroNf: string, cnpjRemetente?: string, forceFresh: boolean = false): Promise<Ssw101SearchResultDTO> {
    try {
      const encodedNf = encodeURIComponent(numeroNf.trim());
      const params = new URLSearchParams();
      if (cnpjRemetente) params.append('cnpj', cnpjRemetente.trim());
      if (forceFresh) params.append('fresh', 'true');
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const response = await fetch(`/api/ssw/101/nf/${encodedNf}${queryString}`);
      const data = await response.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        found: false,
        resultsCount: 0,
        rawMessage: err.message || 'Falha ao consultar NF no servidor'
      };
    }
  }

  /**
   * Limpa o cache SSW 101 do backend.
   */
  public static async clearCache(): Promise<boolean> {
    try {
      const res = await fetch('/api/ssw/101/clear-cache', { method: 'POST' });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  /**
   * Obtém métricas de uso e hits do cache.
   */
  public static async getCacheStats(): Promise<{ size: number; hits: number; misses: number; maxEntries: number } | null> {
    try {
      const res = await fetch('/api/ssw/101/cache-stats');
      const data = await res.json();
      return data.stats || null;
    } catch {
      return null;
    }
  }
}
