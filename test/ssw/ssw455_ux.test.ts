import assert from 'node:assert/strict';
import { SswCapabilityId, SswCapabilityStatus } from '../../src/integrations/ssw/types/capabilities';
import { SswSessionManager } from '../../server/ssw/session/sessionManager';
import { SswHttpClient } from '../../server/ssw/gateways/httpClient';
import { Ssw455RequestGateway } from '../../server/ssw/gateways/ssw455RequestGateway';
import { SswReportQueueGateway } from '../../server/ssw/gateways/sswReportQueueGateway';
import { SswReportDownloadGateway } from '../../server/ssw/gateways/sswReportDownloadGateway';
import { Ssw455Service } from '../../server/ssw/services/ssw455Service';
import { SswCapabilityRegistry } from '../../server/ssw/registry/capabilityRegistry';
import { InMemoryRegistryStorage } from '../../server/ssw/registry/storagePort';
import { SswCircuitBreaker } from '../../server/ssw/resilience/circuitBreaker';
import { SswRetryPolicy } from '../../server/ssw/resilience/retryPolicy';
import { SswIncidentAggregator } from '../../server/ssw/resilience/incidentAggregator';
import { InMemoryIncidentStore } from '../../server/ssw/resilience/incidentStorePort';
import { InMemoryJobStore } from '../../server/ssw/services/jobStorePort';
import { SSW_SIGNATURES } from '../../server/ssw/signatures/sswSignatures';

const SAMPLE_455_CSV = `0;RODOVIARIO CAMILO DOS SANTOS;RELATORIO 455 ENTREGAS;;;;;;
1;Serie/Numero CTRC;Cliente Destinatario;Praca de Destino;Cidade de Entrega;Peso Real em Kg;Quantidade de Volumes;Valor da Mercadoria;Valor do Frete;Unidade Receptora;Previsao de Entrega
2;VGA433233-4;COMPANHIA BRASILEIRA DE DISTRIBUICAO;VGAP;VARGINHA;169,58;20;26919,32;316,9;VGA;26/05/2026
2;CPQ854800-5;MIGOTO COMERCIO DE VEICULOS LTDA;VGAP;VARGINHA;6,615;5;5925,00;65,86;VGA;25/05/2026`;

const QUEUE_XML_MULTIPLE_USERS = `
<r>
  <f0>99999</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 18:00</f2>
  <f3>OUTRO_USER</f3>
  <f4>BHZ</f4>
  <f5></f5>
  <f6>Concluído</f6>
  <f7>00:00:10</f7>
  <f8>DOW99999</f8>
</r>
<r>
  <f0>541009</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 17:45</f2>
  <f3>AMATHEUS</f3>
  <f4>VGA</f4>
  <f5></f5>
  <f6>Concluído</f6>
  <f7>00:00:08</f7>
  <f8>DOW541009</f8>
</r>
<r>
  <f0>540900</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 16:30</f2>
  <f3>AMATHEUS</f3>
  <f4>VGA</f4>
  <f5></f5>
  <f6>Concluído</f6>
  <f7>00:00:12</f7>
  <f8>DOW540900</f8>
</r>
`;

const SAMPLE_DOW_RESPONSE_HTML = `
<html>
<body>
  <form name="form1">
    <input type="hidden" name="web_body" value="%0A%09%09abrir('rel455_541009.csv'%2C%20'%2Frelatorios%2F'%2C%20'width%3D800%2Cheight%3D600')%3B%0A%09">
  </form>
</body>
</html>
`;

async function runSsw455UxTests() {
  console.log('--- Iniciando Testes Unitários de SSW-455-UX-001 ---');

  let requestReportCallCount = 0;

  const mockHttpFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);

    if (urlStr.includes('/bin/ssw0422')) {
      const headers = new Headers();
      headers.set('set-cookie', 'SSWSESSION=token999; Path=/');
      return new Response('OK', { status: 200, headers });
    }

    if (urlStr.includes('/bin/ssw0230')) {
      requestReportCallCount++;
      return new Response('<html>OK Solicitado 455</html>', { status: 200 });
    }

    if (urlStr.includes('/bin/ssw1440')) {
      const bodyStr = String(init?.body || '');
      if (bodyStr.includes('act=DOW')) {
        return new Response(SAMPLE_DOW_RESPONSE_HTML, { status: 200 });
      }
      return new Response(QUEUE_XML_MULTIPLE_USERS, { status: 200 });
    }

    if (urlStr.includes('/bin/ssw0424')) {
      return new Response(SAMPLE_455_CSV, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=iso-8859-1' }
      });
    }

    return new Response('Not Found', { status: 404 });
  };

  const sessionManager = new SswSessionManager({
    credentials: {
      empresa: 'camilo',
      useri: '12345',
      usuario: 'AMATHEUS',
      senha: 'pwd',
      unidade: 'VGA'
    },
    fetchFn: mockHttpFetch
  });

  await sessionManager.ensureAuthenticated();

  const httpClient = new SswHttpClient(sessionManager, mockHttpFetch);

  const registryStorage = new InMemoryRegistryStorage();
  const registry = new SswCapabilityRegistry(registryStorage);

  await registry.register({
    capabilityId: SswCapabilityId.REPORT_455_REQUEST,
    currentEndpoint: '/bin/ssw0230',
    httpMethod: 'POST',
    signature: SSW_SIGNATURES[SswCapabilityId.REPORT_455_REQUEST],
    confidence: 0.95,
    status: SswCapabilityStatus.ACTIVE,
    failureCount: 0
  });

  await registry.register({
    capabilityId: SswCapabilityId.REPORT_QUEUE,
    currentEndpoint: '/bin/ssw1440',
    httpMethod: 'POST',
    signature: SSW_SIGNATURES[SswCapabilityId.REPORT_QUEUE],
    confidence: 0.95,
    status: SswCapabilityStatus.ACTIVE,
    failureCount: 0
  });

  await registry.register({
    capabilityId: SswCapabilityId.REPORT_DOWNLOAD,
    currentEndpoint: '/bin/ssw0424',
    httpMethod: 'GET',
    signature: SSW_SIGNATURES[SswCapabilityId.REPORT_DOWNLOAD],
    confidence: 0.95,
    status: SswCapabilityStatus.ACTIVE,
    failureCount: 0
  });

  const circuitBreaker = new SswCircuitBreaker();
  const retryPolicy = new SswRetryPolicy();
  const incidentAggregator = new SswIncidentAggregator(new InMemoryIncidentStore());
  const jobStore = new InMemoryJobStore();

  const requestGateway = new Ssw455RequestGateway(registry, httpClient);
  const queueGateway = new SswReportQueueGateway(registry, httpClient);
  const downloadGateway = new SswReportDownloadGateway(registry, httpClient);

  const service = new Ssw455Service({
    registry,
    circuitBreaker,
    retryPolicy,
    incidentAggregator,
    sessionManager,
    requestGateway,
    queueGateway,
    downloadGateway,
    jobStore
  });

  // 1. Testar findLatestCompletedReport com filtragem de usuário
  console.log('1. Testando findLatestCompletedReport (Ownership & Maior Sequência)...');
  const latestInfo = await service.findLatestCompletedReport('VGA');

  assert.equal(latestInfo.found, true, 'Deve encontrar relatório do usuário');
  assert.equal(latestInfo.sequence, '541009', 'Deve selecionar maior sequência do próprio usuário (541009), ignorando a sequência 99999 de outro usuário');
  assert.equal(latestInfo.username, 'AMATHEUS');
  assert.equal(latestInfo.unidade, 'VGA');
  assert.equal(latestInfo.downloadAvailable, true, 'Deve indicar downloadAvailable = true para relatório Concluído com DOW');
  console.log('   ✓ findLatestCompletedReport: Filtrou ownership corretamente e selecionou maior sequência.');

  // 2. Testar syncLatestReport sem gerar novo relatório
  console.log('2. Testando syncLatestReport (Sincronização sem emissão no SSW)...');
  requestReportCallCount = 0;
  const syncResult = await service.syncLatestReport('VGA', 'amatheus');

  assert.equal(syncResult.success, true, 'Sincronização do último relatório deve ser bem-sucedida');
  assert.equal(syncResult.job.sequence, '541009', 'Deve ter baixado a sequência 541009');
  assert.equal(syncResult.rowCount, 3, 'Deve conter 3 linhas no CSV');
  assert.equal(requestReportCallCount, 0, 'NÃO deve ter feito chamada para gerar novo relatório no SSW (0230)!');
  console.log('   ✓ syncLatestReport: Baixou último relatório concluído sem disparar geração no SSW.');

  // 3. Testar retryReport
  console.log('3. Testando retryReport com sequência específica...');
  requestReportCallCount = 0;
  const retryResult = await service.retryReport('541009', 'amatheus', 'VGA');

  assert.equal(retryResult.success, true, 'Retry deve ser bem-sucedido');
  assert.equal(retryResult.job.sequence, '541009', 'Deve tentar a mesma sequência informada');
  assert.equal(requestReportCallCount, 0, 'NÃO deve disparar geração no SSW durante o retry!');
  console.log('   ✓ retryReport: Executou retry na mesma sequência sem gerar novo relatório.');

  console.log('======================================================');
  console.log('TODOS OS TESTES DE SSW-455-UX-001 PASSARAM COM SUCESSO! 🎯');
  console.log('======================================================');
}

runSsw455UxTests().catch(err => {
  console.error('Falha nos testes de UX SSW 455:', err);
  process.exit(1);
});
