import { SswCapabilityId, SswCapabilityStatus } from '../../../src/integrations/ssw/types/capabilities';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswCircuitBreaker } from '../resilience/circuitBreaker';
import { SswRetryPolicy } from '../resilience/retryPolicy';
import { SswIncidentAggregator } from '../resilience/incidentAggregator';
import { SswSessionManager } from '../session/sessionManager';
import { Ssw101QueryGateway, parseSswCtrcCode } from '../gateways/ssw101QueryGateway';
import { Ssw101QueryRequestDTO, Ssw101SearchResultDTO } from '../../../src/integrations/ssw/contracts/dtos';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';

interface CacheEntry {
  result: Ssw101SearchResultDTO;
  cachedAt: number;
  expiresAt: number;
}

export interface Ssw101ServiceOptions {
  registry: SswCapabilityRegistry;
  circuitBreaker: SswCircuitBreaker;
  retryPolicy: SswRetryPolicy;
  incidentAggregator: SswIncidentAggregator;
  sessionManager: SswSessionManager;
  queryGateway: Ssw101QueryGateway;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
}

/**
 * Serviço orquestrador de consultas sob demanda na Opção SSW 101.
 * Provê cache LRU, circuit breaker, auto-recuperação de falhas e agregação de incidentes.
 */
export class Ssw101Service {
  private registry: SswCapabilityRegistry;
  private circuitBreaker: SswCircuitBreaker;
  private retryPolicy: SswRetryPolicy;
  private incidentAggregator: SswIncidentAggregator;
  private sessionManager: SswSessionManager;
  private queryGateway: Ssw101QueryGateway;

  private cache: Map<string, CacheEntry> = new Map();
  private cacheTtlMs: number;
  private maxCacheEntries: number;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(options: Ssw101ServiceOptions) {
    this.registry = options.registry;
    this.circuitBreaker = options.circuitBreaker;
    this.retryPolicy = options.retryPolicy;
    this.incidentAggregator = options.incidentAggregator;
    this.sessionManager = options.sessionManager;
    this.queryGateway = options.queryGateway;
    this.cacheTtlMs = options.cacheTtlMs || 60 * 60 * 1000; // 1 hora de TTL padrão
    this.maxCacheEntries = options.maxCacheEntries || 500;
  }

  /**
   * Gera a chave de cache para a requisição de consulta.
   */
  private generateCacheKey(query: Ssw101QueryRequestDTO): string {
    if (query.tipoConsulta === 'CTRC') {
      const parsed = parseSswCtrcCode(query.numero || '');
      const s = (query.serie || parsed.series || 'BCA').toUpperCase();
      const n = (parsed.number || query.numero || '').replace(/^0+/, '');
      return `CTRC:${s}:${n}`;
    }
    if (query.tipoConsulta === 'NF') {
      const nf = (query.numeroNf || '').trim();
      const cnpj = (query.cnpjRemetente || '').replace(/\D/g, '');
      return `NF:${nf}:${cnpj}`;
    }
    if (query.tipoConsulta === 'CHAVE') {
      const ch = (query.chave || '').replace(/\D/g, '');
      return `CHAVE:${ch}`;
    }
    return `UNKNOWN:${JSON.stringify(query)}`;
  }

  /**
   * Executa a consulta com proteção resiliente e cache.
   */
  public async query(request: Ssw101QueryRequestDTO): Promise<Ssw101SearchResultDTO> {
    const cacheKey = this.generateCacheKey(request);

    // 1. Verifica cache em memória se não for requisição forçada
    if (!request.forceFresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        this.cacheHits++;
        return {
          ...cached.result,
          fromCache: true,
          detail: cached.result.detail ? { ...cached.result.detail, fromCache: true } : undefined
        };
      }
    }

    this.cacheMisses++;

    // 2. Proteção de Circuit Breaker para a capability CTRC_101
    if (!this.circuitBreaker.canExecute(SswCapabilityId.CTRC_101)) {
      const remainingMs = this.circuitBreaker.getRemainingBlockTimeMs(SswCapabilityId.CTRC_101);
      const stale = this.cache.get(cacheKey);
      if (stale) {
        return {
          ...stale.result,
          fromCache: true,
          rawMessage: `Circuito degradado (bloqueio restante: ${Math.ceil(remainingMs / 1000)}s). Exibindo dados salvos em cache offline.`
        };
      }
      throw new SswError(
        SswErrorCode.CAPABILITY_DEGRADED,
        `Capacidade CTRC_101 temporariamente bloqueada pelo Circuit Breaker (${Math.ceil(remainingMs / 1000)}s restantes).`,
        { capabilityId: SswCapabilityId.CTRC_101, isRetryable: false }
      );
    }

    // 3. Execução com política de retry
    try {
      const result = await this.retryPolicy.execute(async () => {
        return await this.queryGateway.executeQuery(request);
      });

      // Sucesso na consulta: notifica Circuit Breaker
      this.circuitBreaker.recordSuccess(SswCapabilityId.CTRC_101);
      await this.registry.recordSuccess(SswCapabilityId.CTRC_101);

      // Armazena no cache se encontrou dados válidos
      if (result.found) {
        if (this.cache.size >= this.maxCacheEntries) {
          const oldestKey = this.cache.keys().next().value;
          if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(cacheKey, {
          result,
          cachedAt: Date.now(),
          expiresAt: Date.now() + this.cacheTtlMs
        });
      }

      return result;
    } catch (err: any) {
      this.circuitBreaker.recordFailure(SswCapabilityId.CTRC_101);
      await this.registry.recordFailure(SswCapabilityId.CTRC_101);

      // Registra incidente se for erro crítico ou repetido
      await this.incidentAggregator.recordIncident(
        SswCapabilityId.CTRC_101,
        err.message || 'Falha na consulta analítica SSW 101'
      );

      // Se houver fallback em cache expirado, serve os dados antigos com aviso
      const stale = this.cache.get(cacheKey);
      if (stale) {
        return {
          ...stale.result,
          fromCache: true,
          rawMessage: `Falha na consulta ao vivo (${err.message}). Exibindo último registro em cache.`
        };
      }

      if (err instanceof SswError) throw err;
      throw new SswError(
        SswErrorCode.REQUEST_REJECTED,
        `Erro na execução da consulta SSW 101: ${err.message || 'Falha desconhecida'}`,
        { details: err.message }
      );
    }
  }

  /**
   * Consulta direta por CTRC.
   */
  public async queryCtrc(serieOrId: string, number?: string, forceFresh?: boolean): Promise<Ssw101SearchResultDTO> {
    let serie = '';
    let num = number || '';

    if (!num) {
      const parsed = parseSswCtrcCode(serieOrId);
      serie = parsed.series || 'BCA';
      num = parsed.number || serieOrId;
    } else {
      serie = serieOrId;
    }

    return this.query({
      tipoConsulta: 'CTRC',
      serie,
      numero: num,
      forceFresh
    });
  }

  /**
   * Consulta direta por Nota Fiscal.
   */
  public async queryNf(numeroNf: string, cnpjRemetente?: string, forceFresh?: boolean): Promise<Ssw101SearchResultDTO> {
    return this.query({
      tipoConsulta: 'NF',
      numeroNf,
      cnpjRemetente,
      forceFresh
    });
  }

  /**
   * Consulta direta por Chave de Acesso (CT-e ou NF-e de 44 dígitos).
   */
  public async queryChave(chave: string, forceFresh?: boolean): Promise<Ssw101SearchResultDTO> {
    return this.query({
      tipoConsulta: 'CHAVE',
      chave,
      forceFresh
    });
  }

  /**
   * Limpa todo o cache em memória da 101.
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Retorna estatísticas de uso do cache.
   */
  public getCacheStats(): { size: number; hits: number; misses: number; maxEntries: number } {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      maxEntries: this.maxCacheEntries
    };
  }
}
