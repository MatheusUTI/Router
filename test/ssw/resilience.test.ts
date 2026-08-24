import assert from 'node:assert/strict';
import {
  SswCapabilityId,
  SswCapabilityStatus,
  SswCircuitState,
  SswIncidentStatus
} from '../../src/integrations/ssw/types/capabilities';
import {
  SswCapabilityRegistry,
  validateConfidenceScore
} from '../../server/ssw/registry/capabilityRegistry';
import { SswCircuitBreaker } from '../../server/ssw/resilience/circuitBreaker';
import { SswRetryPolicy } from '../../server/ssw/resilience/retryPolicy';
import { SswIncidentAggregator } from '../../server/ssw/resilience/incidentAggregator';
import { InMemoryRegistryStorage } from '../../server/ssw/registry/storagePort';
import { InMemoryIncidentStore } from '../../server/ssw/resilience/incidentStorePort';

async function runTests() {
  console.log('--- Iniciando Testes Unitários de Fundação SSW ---');

  // ==========================================
  // 1. TESTES DO REGISTRY
  // ==========================================
  console.log('1. Testando SswCapabilityRegistry...');
  const storage = new InMemoryRegistryStorage();
  let fakeTime = '2026-08-24T12:00:00.000Z';
  const registry = new SswCapabilityRegistry(storage, () => fakeTime);

  // Registrar capability
  await registry.register({
    capabilityId: SswCapabilityId.REPORT_455_REQUEST,
    httpMethod: 'POST',
    signature: {
      capabilityId: SswCapabilityId.REPORT_455_REQUEST,
      expectedMethod: 'POST',
      requiredPayloadFields: ['unid', 'relatorio']
    },
    confidence: 0.9,
    status: SswCapabilityStatus.ACTIVE,
    failureCount: 0
  });

  // Recuperar capability
  const cap455 = await registry.get(SswCapabilityId.REPORT_455_REQUEST);
  assert.ok(cap455, 'Capability REPORT_455_REQUEST deve existir');
  assert.equal(cap455.confidence, 0.9);
  assert.equal(cap455.status, SswCapabilityStatus.ACTIVE);

  // Atualizar endpoint
  fakeTime = '2026-08-24T12:05:00.000Z';
  await registry.updateEndpoint(SswCapabilityId.REPORT_455_REQUEST, '/bin/ssw0455', 0.95);
  const updatedCap = await registry.get(SswCapabilityId.REPORT_455_REQUEST);
  assert.equal(updatedCap?.currentEndpoint, '/bin/ssw0455');
  assert.equal(updatedCap?.confidence, 0.95);
  assert.equal(updatedCap?.discoveryDate, '2026-08-24T12:05:00.000Z');

  // Atualizar confidence isolado
  await registry.updateConfidence(SswCapabilityId.REPORT_455_REQUEST, 1.0);
  const capConf = await registry.get(SswCapabilityId.REPORT_455_REQUEST);
  assert.equal(capConf?.confidence, 1.0);

  // Impedir confidence inválido (> 1.00 ou < 0.00)
  assert.throws(() => validateConfidenceScore(1.5), /fora do intervalo/);
  assert.throws(() => validateConfidenceScore(-0.1), /fora do intervalo/);
  assert.throws(() => validateConfidenceScore(NaN), /valor numérico obrigatório/);

  // Registrar falha e degradação
  await registry.recordFailure(SswCapabilityId.REPORT_455_REQUEST);
  await registry.recordFailure(SswCapabilityId.REPORT_455_REQUEST);
  await registry.recordFailure(SswCapabilityId.REPORT_455_REQUEST);
  const failedCap = await registry.get(SswCapabilityId.REPORT_455_REQUEST);
  assert.equal(failedCap?.failureCount, 3);
  assert.equal(failedCap?.status, SswCapabilityStatus.DEGRADED);

  // Registrar sucesso e recuperação
  await registry.recordSuccess(SswCapabilityId.REPORT_455_REQUEST);
  const recoveredCap = await registry.get(SswCapabilityId.REPORT_455_REQUEST);
  assert.equal(recoveredCap?.failureCount, 0);
  assert.equal(recoveredCap?.status, SswCapabilityStatus.ACTIVE);
  console.log('   ✓ Registry: Todos os casos de teste passaram.');

  // ==========================================
  // 2. TESTES DO CIRCUIT BREAKER
  // ==========================================
  console.log('2. Testando SswCircuitBreaker...');
  let mockedCurrentTime = 1000000;
  const breaker = new SswCircuitBreaker({
    failureThreshold: 3,
    successThreshold: 2,
    backoffStepsMs: [300000, 900000], // 5 min, 15 min
    now: () => mockedCurrentTime
  });

  const cap101 = SswCapabilityId.CTRC_101;

  // Inicial: CLOSED
  assert.equal(breaker.getState(cap101), SswCircuitState.CLOSED);
  assert.equal(breaker.canExecute(cap101), true);

  // Falha 1 e 2: permanece CLOSED
  breaker.recordFailure(cap101);
  breaker.recordFailure(cap101);
  assert.equal(breaker.getState(cap101), SswCircuitState.CLOSED);

  // Falha 3: atinge threshold -> transição para OPEN
  breaker.recordFailure(cap101);
  assert.equal(breaker.getState(cap101), SswCircuitState.OPEN);
  assert.equal(breaker.canExecute(cap101), false, 'Circuito OPEN deve bloquear execução');
  assert.equal(breaker.getRemainingBlockTimeMs(cap101), 300000);

  // Avançar tempo antes do término do backoff: continua OPEN
  mockedCurrentTime += 100000; // +100s
  assert.equal(breaker.getState(cap101), SswCircuitState.OPEN);
  assert.equal(breaker.canExecute(cap101), false);

  // Avançar tempo além do backoff: transição para HALF_OPEN
  mockedCurrentTime += 250000; // total +350s > 300s
  assert.equal(breaker.getState(cap101), SswCircuitState.HALF_OPEN);
  assert.equal(breaker.canExecute(cap101), true, 'HALF_OPEN permite teste piloto');

  // Sucesso 1 em HALF_OPEN: ainda HALF_OPEN (precisa de 2 sucessos)
  breaker.recordSuccess(cap101);
  assert.equal(breaker.getState(cap101), SswCircuitState.HALF_OPEN);

  // Sucesso 2 em HALF_OPEN: fecha o circuito -> CLOSED
  breaker.recordSuccess(cap101);
  assert.equal(breaker.getState(cap101), SswCircuitState.CLOSED);
  assert.equal(breaker.canExecute(cap101), true);

  // Testar HALF_OPEN -> falha piloto -> reabre com backoff de nível superior
  breaker.recordFailure(cap101);
  breaker.recordFailure(cap101);
  breaker.recordFailure(cap101); // OPEN no nível 0 (300s)
  mockedCurrentTime += 300000; // Vira HALF_OPEN
  assert.equal(breaker.getState(cap101), SswCircuitState.HALF_OPEN);

  breaker.recordFailure(cap101); // Falha piloto -> Reabre no nível 1 (900s)
  assert.equal(breaker.getState(cap101), SswCircuitState.OPEN);
  assert.equal(breaker.getRemainingBlockTimeMs(cap101), 900000);
  console.log('   ✓ Circuit Breaker: Todas as transições de estado passaram.');

  // ==========================================
  // 3. TESTES DA RETRY POLICY
  // ==========================================
  console.log('3. Testando SswRetryPolicy...');
  const recordedDelays: number[] = [];
  const retryPolicy = new SswRetryPolicy({
    maxAttempts: 3,
    baseDelayMs: 100,
    backoffFactor: 2,
    jitter: false,
    sleepFn: async (ms) => {
      recordedDelays.push(ms);
    }
  });

  // Teste de sucesso na 1ª tentativa
  const res1 = await retryPolicy.execute(async () => 'OK');
  assert.equal(res1, 'OK');
  assert.equal(recordedDelays.length, 0);

  // Teste de recuperação na 3ª tentativa
  let attemptCounter = 0;
  const res2 = await retryPolicy.execute(async (attempt) => {
    attemptCounter++;
    if (attempt < 3) {
      throw new Error('Falha temporária de rede');
    }
    return 'RECOVERED';
  });
  assert.equal(res2, 'RECOVERED');
  assert.equal(attemptCounter, 3);
  assert.deepEqual(recordedDelays, [100, 200]); // 100 * 2^0, 100 * 2^1

  // Teste de esgotamento de tentativas
  let failAttempts = 0;
  await assert.rejects(
    async () => {
      await retryPolicy.execute(async () => {
        failAttempts++;
        throw new Error('Erro persistente');
      });
    },
    /Erro persistente/
  );
  assert.equal(failAttempts, 3);

  // Teste de erro não retryable
  const nonRetryPolicy = new SswRetryPolicy({
    maxAttempts: 3,
    isRetryable: (err: any) => err?.message !== 'UNAUTHORIZED',
    sleepFn: async () => {}
  });

  let nonRetryCount = 0;
  await assert.rejects(
    async () => {
      await nonRetryPolicy.execute(async () => {
        nonRetryCount++;
        throw new Error('UNAUTHORIZED');
      });
    },
    /UNAUTHORIZED/
  );
  assert.equal(nonRetryCount, 1, 'Erro não retryable deve abortar imediatamente');
  console.log('   ✓ Retry Policy: Todos os cenários passaram.');

  // ==========================================
  // 4. TESTES DO INCIDENT AGGREGATOR
  // ==========================================
  console.log('4. Testando SswIncidentAggregator...');
  const incidentStore = new InMemoryIncidentStore();
  let incidentTime = '2026-08-24T14:00:00.000Z';
  const aggregator = new SswIncidentAggregator(incidentStore, () => incidentTime);

  // Criar primeiro incidente
  const inc1 = await aggregator.recordIncident(
    SswCapabilityId.UNLOADING_264,
    'HTTP 404 Form Not Found',
    { previousEndpoint: '/bin/ssw0264' }
  );
  assert.equal(inc1.capability, SswCapabilityId.UNLOADING_264);
  assert.equal(inc1.attempts, 1);
  assert.equal(inc1.status, SswIncidentStatus.OPEN);
  assert.equal(inc1.previousEndpoint, '/bin/ssw0264');

  // Agregar erro equivalente
  incidentTime = '2026-08-24T14:05:00.000Z';
  const inc2 = await aggregator.recordIncident(
    SswCapabilityId.UNLOADING_264,
    'HTTP 404 Form Not Found'
  );
  assert.equal(inc2.id, inc1.id, 'Mesmo erro deve reutilizar o mesmo ID de incidente');
  assert.equal(inc2.attempts, 2);
  assert.equal(inc2.lastSeen, '2026-08-24T14:05:00.000Z');

  // Listar ativos
  const activeList = await aggregator.listActiveIncidents();
  assert.equal(activeList.length, 1);

  // Resolver incidente
  incidentTime = '2026-08-24T14:10:00.000Z';
  const resolved = await aggregator.resolveIncident(inc1.id, '/bin/ssw0265');
  assert.equal(resolved?.status, SswIncidentStatus.RESOLVED);
  assert.equal(resolved?.newEndpoint, '/bin/ssw0265');

  const emptyActive = await aggregator.listActiveIncidents();
  assert.equal(emptyActive.length, 0, 'Incidente resolvido não deve constar na lista ativa');
  console.log('   ✓ Incident Aggregator: Todos os testes passaram.');

  console.log('\n✅ TODOS OS TESTES DA FUNDAÇÃO SSW FORAM EXECUTADOS COM SUCESSO!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
