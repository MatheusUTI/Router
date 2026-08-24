export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
  jitter: boolean;
  isRetryable: (error: unknown) => boolean;
  sleepFn: (ms: number) => Promise<void>;
}

export const DEFAULT_RETRY_CONFIG: RetryPolicyConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 30000,
  jitter: false,
  isRetryable: () => true,
  sleepFn: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
};

export class SswRetryPolicy {
  private readonly config: RetryPolicyConfig;

  constructor(config?: Partial<RetryPolicyConfig>) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    };
  }

  /**
   * Calcula o atraso em milissegundos para a tentativa informada (attempt baseada em 1).
   */
  calculateDelay(attempt: number): number {
    const rawDelay = this.config.baseDelayMs * Math.pow(this.config.backoffFactor, attempt - 1);
    const cappedDelay = Math.min(rawDelay, this.config.maxDelayMs);

    if (this.config.jitter) {
      // Jitter uniforme entre 50% e 100% do tempo calculado
      const jitterFactor = 0.5 + Math.random() * 0.5;
      return Math.round(cappedDelay * jitterFactor);
    }

    return cappedDelay;
  }

  /**
   * Executa a operação fornecida aplicando as políticas de retry, backoff e avaliação de erros.
   */
  async execute<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation(attempt);
      } catch (err) {
        lastError = err;

        const isLastAttempt = attempt >= this.config.maxAttempts;
        const canRetry = this.config.isRetryable(err);

        if (isLastAttempt || !canRetry) {
          throw err;
        }

        const delay = this.calculateDelay(attempt);
        await this.config.sleepFn(delay);
      }
    }

    throw lastError;
  }
}
