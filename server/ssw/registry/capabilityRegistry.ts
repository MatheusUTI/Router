import {
  SswCapabilityId,
  SswCapabilityStatus,
  SswCapabilityEntry
} from '../../../src/integrations/ssw/types/capabilities';
import { RegistryStoragePort, InMemoryRegistryStorage } from './storagePort';

/**
 * Valida que o score de confiança esteja rigorosamente no intervalo [0.00, 1.00].
 */
export function validateConfidenceScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new Error(`Score de confiança inválido: valor numérico obrigatório, recebido ${score}`);
  }
  if (score < 0.0 || score > 1.0) {
    throw new Error(`Score de confiança fora do intervalo permitido [0.00, 1.00]: ${score}`);
  }
  // Arredonda para 2 casas decimais
  return Math.round(score * 100) / 100;
}

export class SswCapabilityRegistry {
  private readonly storage: RegistryStoragePort;
  private readonly nowProvider: () => string;

  constructor(
    storage: RegistryStoragePort = new InMemoryRegistryStorage(),
    nowProvider: () => string = () => new Date().toISOString()
  ) {
    this.storage = storage;
    this.nowProvider = nowProvider;
  }

  /**
   * Registra ou sobrescreve uma entrada no catálogo de capacidades.
   */
  async register(entry: SswCapabilityEntry): Promise<void> {
    const validatedConfidence = validateConfidenceScore(entry.confidence);
    await this.storage.save({
      ...entry,
      confidence: validatedConfidence
    });
  }

  /**
   * Recupera a definição de uma capacidade por seu identificador lógico.
   */
  async get(capabilityId: SswCapabilityId): Promise<SswCapabilityEntry | null> {
    return this.storage.get(capabilityId);
  }

  /**
   * Lista todas as capacidades cadastradas no Registry.
   */
  async list(): Promise<SswCapabilityEntry[]> {
    const map = await this.storage.load();
    return Array.from(map.values());
  }

  /**
   * Atualiza o endpoint associado a uma capacidade, opcionalmente ajustando o confidence score.
   */
  async updateEndpoint(
    capabilityId: SswCapabilityId,
    endpoint: string,
    confidence?: number
  ): Promise<SswCapabilityEntry> {
    const entry = await this.get(capabilityId);
    if (!entry) {
      throw new Error(`Capacidade não encontrada no Registry: ${capabilityId}`);
    }

    const updatedConfidence = confidence !== undefined
      ? validateConfidenceScore(confidence)
      : entry.confidence;

    const updated: SswCapabilityEntry = {
      ...entry,
      currentEndpoint: endpoint,
      confidence: updatedConfidence,
      discoveryDate: this.nowProvider()
    };

    await this.storage.save(updated);
    return updated;
  }

  /**
   * Atualiza isoladamente o score de confiança de uma capacidade.
   */
  async updateConfidence(
    capabilityId: SswCapabilityId,
    confidence: number
  ): Promise<SswCapabilityEntry> {
    const entry = await this.get(capabilityId);
    if (!entry) {
      throw new Error(`Capacidade não encontrada no Registry: ${capabilityId}`);
    }

    const validatedConfidence = validateConfidenceScore(confidence);
    const updated: SswCapabilityEntry = {
      ...entry,
      confidence: validatedConfidence
    };

    await this.storage.save(updated);
    return updated;
  }

  /**
   * Registra uma execução bem-sucedida da capacidade, resetando a contagem de falhas.
   */
  async recordSuccess(capabilityId: SswCapabilityId): Promise<void> {
    const entry = await this.get(capabilityId);
    if (!entry) return;

    const updated: SswCapabilityEntry = {
      ...entry,
      failureCount: 0,
      lastSuccess: this.nowProvider(),
      status: entry.status === SswCapabilityStatus.DEGRADED ? SswCapabilityStatus.ACTIVE : entry.status
    };

    await this.storage.save(updated);
  }

  /**
   * Registra uma falha de execução, incrementando o contador e atualizando timestamp.
   */
  async recordFailure(capabilityId: SswCapabilityId): Promise<void> {
    const entry = await this.get(capabilityId);
    if (!entry) return;

    const newFailureCount = (entry.failureCount || 0) + 1;
    const updated: SswCapabilityEntry = {
      ...entry,
      failureCount: newFailureCount,
      lastFailure: this.nowProvider(),
      status: newFailureCount >= 3 ? SswCapabilityStatus.DEGRADED : entry.status
    };

    await this.storage.save(updated);
  }

  /**
   * Altera explicitamente o status operacional de uma capacidade.
   */
  async setStatus(
    capabilityId: SswCapabilityId,
    status: SswCapabilityStatus
  ): Promise<void> {
    const entry = await this.get(capabilityId);
    if (!entry) {
      throw new Error(`Capacidade não encontrada no Registry: ${capabilityId}`);
    }

    const updated: SswCapabilityEntry = {
      ...entry,
      status
    };

    await this.storage.save(updated);
  }
}
