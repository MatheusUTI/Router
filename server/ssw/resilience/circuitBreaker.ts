import { SswCapabilityId, SswCircuitState } from '../../../src/integrations/ssw/types/capabilities';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  backoffStepsMs: number[];
  now: () => number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  successThreshold: 2,
  // 5 min, 15 min, 30 min, 60 min
  backoffStepsMs: [
    5 * 60 * 1000,
    15 * 60 * 1000,
    30 * 60 * 1000,
    60 * 60 * 1000
  ],
  now: () => Date.now()
};

interface CapabilityCircuitInfo {
  state: SswCircuitState;
  failureCount: number;
  consecutiveSuccesses: number;
  backoffLevel: number;
  blockedUntil: number;
}

export class SswCircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private readonly circuits = new Map<SswCapabilityId, CapabilityCircuitInfo>();

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config
    };
  }

  private getOrCreateCircuit(capabilityId: SswCapabilityId): CapabilityCircuitInfo {
    let circuit = this.circuits.get(capabilityId);
    if (!circuit) {
      circuit = {
        state: SswCircuitState.CLOSED,
        failureCount: 0,
        consecutiveSuccesses: 0,
        backoffLevel: 0,
        blockedUntil: 0
      };
      this.circuits.set(capabilityId, circuit);
    }
    return circuit;
  }

  /**
   * Obtém o estado atual do circuito para a capability, recalculando transições temporais (OPEN -> HALF_OPEN).
   */
  getState(capabilityId: SswCapabilityId): SswCircuitState {
    const circuit = this.getOrCreateCircuit(capabilityId);
    const now = this.config.now();

    if (circuit.state === SswCircuitState.OPEN) {
      if (now >= circuit.blockedUntil) {
        circuit.state = SswCircuitState.HALF_OPEN;
        circuit.consecutiveSuccesses = 0;
      }
    }

    return circuit.state;
  }

  /**
   * Avalia se a capability pode ser executada no momento.
   */
  canExecute(capabilityId: SswCapabilityId): boolean {
    const state = this.getState(capabilityId);
    return state === SswCircuitState.CLOSED || state === SswCircuitState.HALF_OPEN;
  }

  /**
   * Registra sucesso na execução.
   */
  recordSuccess(capabilityId: SswCapabilityId): void {
    const circuit = this.getOrCreateCircuit(capabilityId);
    const currentState = this.getState(capabilityId);

    if (currentState === SswCircuitState.HALF_OPEN) {
      circuit.consecutiveSuccesses += 1;
      if (circuit.consecutiveSuccesses >= this.config.successThreshold) {
        circuit.state = SswCircuitState.CLOSED;
        circuit.failureCount = 0;
        circuit.backoffLevel = 0;
        circuit.consecutiveSuccesses = 0;
        circuit.blockedUntil = 0;
      }
    } else if (currentState === SswCircuitState.CLOSED) {
      circuit.failureCount = 0;
    }
  }

  /**
   * Registra falha na execução.
   */
  recordFailure(capabilityId: SswCapabilityId): void {
    const circuit = this.getOrCreateCircuit(capabilityId);
    const currentState = this.getState(capabilityId);
    const now = this.config.now();

    if (currentState === SswCircuitState.HALF_OPEN) {
      // Falha durante teste piloto: reabre circuito com avanço de backoff
      circuit.state = SswCircuitState.OPEN;
      circuit.backoffLevel = Math.min(
        circuit.backoffLevel + 1,
        this.config.backoffStepsMs.length - 1
      );
      const delay = this.config.backoffStepsMs[circuit.backoffLevel];
      circuit.blockedUntil = now + delay;
      circuit.consecutiveSuccesses = 0;
    } else if (currentState === SswCircuitState.CLOSED) {
      circuit.failureCount += 1;
      if (circuit.failureCount >= this.config.failureThreshold) {
        circuit.state = SswCircuitState.OPEN;
        const delay = this.config.backoffStepsMs[circuit.backoffLevel];
        circuit.blockedUntil = now + delay;
        circuit.consecutiveSuccesses = 0;
      }
    }
  }

  /**
   * Retorna o tempo restante de bloqueio em milissegundos (0 se não bloqueado).
   */
  getRemainingBlockTimeMs(capabilityId: SswCapabilityId): number {
    const circuit = this.getOrCreateCircuit(capabilityId);
    if (this.getState(capabilityId) !== SswCircuitState.OPEN) {
      return 0;
    }
    const remaining = circuit.blockedUntil - this.config.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Reseta manualmente o circuito de uma capability para CLOSED.
   */
  reset(capabilityId: SswCapabilityId): void {
    const circuit = this.getOrCreateCircuit(capabilityId);
    circuit.state = SswCircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.consecutiveSuccesses = 0;
    circuit.backoffLevel = 0;
    circuit.blockedUntil = 0;
  }
}
