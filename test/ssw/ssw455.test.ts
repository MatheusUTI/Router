import assert from 'node:assert/strict';
import { SswCapabilityId, SswCapabilityStatus, SswCircuitState } from '../../src/integrations/ssw/types/capabilities';
import { SswSessionManager } from '../../server/ssw/session/sessionManager';
import { SswFormAnalyzer } from '../../server/ssw/discovery/sswFormAnalyzer';
import { SswDiscoveryEngine } from '../../server/ssw/discovery/sswDiscoveryEngine';
import { SswHttpClient } from '../../server/ssw/gateways/httpClient';
import { Ssw455RequestGateway, formatToDdmmyy, buildPayload455 } from '../../server/ssw/gateways/ssw455RequestGateway';
import { SswReportQueueGateway } from '../../server/ssw/gateways/sswReportQueueGateway';
import { SswReportDownloadGateway, extractDownloadMeta455 } from '../../server/ssw/gateways/sswReportDownloadGateway';
import { Ssw455Service } from '../../server/ssw/services/ssw455Service';
import { SswCapabilityRegistry } from '../../server/ssw/registry/capabilityRegistry';
import { InMemoryRegistryStorage } from '../../server/ssw/registry/storagePort';
import { SswCircuitBreaker } from '../../server/ssw/resilience/circuitBreaker';
import { SswRetryPolicy } from '../../server/ssw/resilience/retryPolicy';
import { SswIncidentAggregator } from '../../server/ssw/resilience/incidentAggregator';
import { InMemoryIncidentStore } from '../../server/ssw/resilience/incidentStorePort';
import { InMemoryJobStore } from '../../server/ssw/services/jobStorePort';
import { SSW_SIGNATURES, DEFAULT_KNOWN_ENDPOINTS } from '../../server/ssw/signatures/sswSignatures';
import { parsePtBrFloat, cleanPrefix, processCsvToCtrcs } from '../../src/services/importCsvAdapter';

// Sample CSV mock for 455 reports
const SAMPLE_455_CSV = `0;RODOVIARIO CAMILO DOS SANTOS;RELATORIO 455 ENTREGAS;;;;;;
1;Serie/Numero CTRC;Cliente Destinatario;Praca de Destino;Cidade de Entrega;Peso Real em Kg;Quantidade de Volumes;Valor da Mercadoria;Valor do Frete;Unidade Receptora;Previsao de Entrega
2;VGA433233-4;COMPANHIA BRASILEIRA DE DISTRIBUICAO;VGAP;VARGINHA;169,58;20;26919,32;316,9;VGA;26/05/2026
2;CPQ854800-5;MIGOTO COMERCIO DE VEICULOS LTDA;VGAP;VARGINHA;6,615;5;5925,00;65,86;VGA;25/05/2026
2;BHZ907302-7;ROBERTA MACHADO VASCONCELOS;VGAP;TRES CORACOES;40,00;4;1915,74;109,18;VGA;25/05/2026`;

// Sample XML Queue format from SSW Fila 156
const SAMPLE_QUEUE_XML_WAITING = `
<r>
  <f0>78910</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 17:30</f2>
  <f3>AMATHEUS</f3>
  <f4>VGA</f4>
  <f5></f5>
  <f6>Aguardando</f6>
  <f7>00:00:02</f7>
  <f8>EXC78910</f8>
</r>
<r>
  <f0>11111</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 17:28</f2>
  <f3>OUTRO_USER</f3>
  <f4>BHZ</f4>
  <f5></f5>
  <f6>Concluído</f6>
  <f7>00:00:15</f7>
  <f8>DOW11111</f8>
</r>
`;

const SAMPLE_QUEUE_XML_COMPLETED = `
<r>
  <f0>78910</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 17:30</f2>
  <f3>AMATHEUS</f3>
  <f4>VGA</f4>
  <f5></f5>
  <f6>Concluído</f6>
  <f7>00:00:12</f7>
  <f8>DOW78910</f8>
</r>
<r>
  <f0>11111</f0>
  <f1>455 ENTREGAS REL</f1>
  <f2>24/08/26 17:28</f2>
  <f3>OUTRO_USER</f3>
  <f4>BHZ</f4>
  <f5></f5>
  <f6>Concluído</f6>
  <f7>00:00:15</f7>
  <f8>DOW11111</f8>
</r>
`;

// Sample HTML response for DOW<SEQ> containing web_body
const SAMPLE_DOW_RESPONSE_HTML = `
<html>
<body>
  <form name="form1">
    <input type="hidden" name="web_body" value="%0A%09%09abrir('rel455_78910.csv'%2C%20'%2Frelatorios%2F'%2C%20'width%3D800%2Cheight%3D600')%3B%0A%09">
  </form>
</body>
</html>
`;

async function runSsw455Tests() {
  console.log('--- Iniciando Testes Unitários e de Integração SSW-455-FIX-001 ---');

  // ==========================================
  // 1. TESTES DO PARSER ADAPTER COMUM
  // ==========================================
  console.log('1. Testando importCsvAdapter...');
  assert.equal(parsePtBrFloat('1.234,56'), 1234.56);
  assert.equal(parsePtBrFloat('169,58'), 169.58);
  assert.equal(parsePtBrFloat('6,615'), 6.615);
  assert.equal(parsePtBrFloat('R$ 26.919,32'), 26919.32);
  assert.equal(parsePtBrFloat(''), 0);
  assert.equal(parsePtBrFloat(null), 0);

  assert.equal(cleanPrefix('1;Serie/Numero;Destino', true, ';'), 'Serie/Numero;Destino');
  assert.equal(cleanPrefix('2;VGA433233-4;MARELLI', true, ';'), 'VGA433233-4;MARELLI');
  assert.equal(cleanPrefix('VGA433233-4;MARELLI', true, ';'), 'VGA433233-4;MARELLI');

  const parsed = processCsvToCtrcs(SAMPLE_455_CSV, 'VGA');
  assert.equal(parsed.stats.totalLines, 5);
  assert.equal(parsed.stats.parsedCount, 3);
  assert.equal(parsed.ctrcs.length, 3);
  assert.equal(parsed.ctrcs[0].id, 'VGA433233-4');
  assert.equal(parsed.ctrcs[0].cidade, 'VARGINHA');
  assert.equal(parsed.ctrcs[0].weight, 169.58);
  assert.equal(parsed.ctrcs[0].originUnit, 'VGA');
  assert.equal(parsed.ctrcs[0].destinationUnit, 'VGA');
  assert.equal(parsed.ctrcs[0].isLocalDelivery, true);
  console.log('   ✓ importCsvAdapter: Todos os casos de teste passaram.');

  // ==========================================
  // 2. TESTES DE SESSÃO SSW (SessionManager)
  // ==========================================
  console.log('2. Testando SswSessionManager...');
  
  let loginRequestsCount = 0;
  let loginPayloadReceived = '';
  const mockFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    
    if (urlStr.includes('/bin/ssw0422')) {
      loginRequestsCount++;
      loginPayloadReceived = String(init?.body || '');
      const headers = new Headers();
      headers.set('set-cookie', 'SSWSESSION=abc123xyz; Path=/; HttpOnly');
      return new Response('<html><body>Login efetuado com sucesso</body></html>', {
        status: 200,
        headers
      });
    }

    return new Response('Not Found', { status: 404 });
  };

  const sessionManager = new SswSessionManager({
    credentials: {
      empresa: 'camilo',
      useri: '12345',
      usuario: 'AMATHEUS',
      senha: 'test_password',
      baseUrl: 'https://sistema.ssw.inf.br',
      unidade: 'VGA'
    },
    fetchFn: mockFetch
  });

  assert.equal(sessionManager.isConfigured(), true);
  assert.equal(sessionManager.getBaseUrl(), 'https://sistema.ssw.inf.br');
  assert.equal(sessionManager.getDefaultUnid(), 'VGA');
  assert.equal(sessionManager.getAuthenticatedUsername(), 'AMATHEUS');
  assert.equal(sessionManager.getAuthenticatedUseri(), '12345');
  assert.equal(sessionManager.getAuthenticatedEmpresa(), 'camilo');

  // Detecção de HTML de login falso-200
  assert.equal(sessionManager.isLoginHtmlResponse('<form action="ssw0422"><input name="f4"></form>'), true);
  assert.equal(sessionManager.isLoginHtmlResponse('<html><body>Sessão expirada. Efetue login.</body></html>'), true);
  assert.equal(sessionManager.isLoginHtmlResponse('<html><body>Tabela de relatórios gerados</body></html>'), false);

  // Autenticação comprovada
  await sessionManager.authenticate();
  assert.equal(loginRequestsCount, 1);
  assert.ok(loginPayloadReceived.includes('act=L'));
  assert.ok(loginPayloadReceived.includes('f1=camilo'));
  assert.ok(loginPayloadReceived.includes('f2=12345'));
  assert.ok(loginPayloadReceived.includes('f3=AMATHEUS'));
  assert.ok(loginPayloadReceived.includes('f4=test_password'));
  assert.ok(loginPayloadReceived.includes('f6=TRUE'));
  assert.ok(loginPayloadReceived.includes('backimg=ssw13.jpg'));
  assert.ok(sessionManager.getCookieHeader().includes('SSWSESSION=abc123xyz'));

  const safeStatus = sessionManager.getSafeStatus();
  assert.equal(safeStatus.isConfigured, true);
  assert.equal(safeStatus.isAuthenticated, true);
  assert.equal(safeStatus.authenticatedUser, 'AMATHEUS');
  console.log('   ✓ SswSessionManager: Todos os casos de teste passaram.');

  // ==========================================
  // 3. TESTES DO CONSTRUTOR DE PAYLOAD 455 E FORMATADOR DE DATA
  // ==========================================
  console.log('3. Testando Payload 455 e Formatador de Data...');
  assert.equal(formatToDdmmyy('2026-08-24'), '240826');
  assert.equal(formatToDdmmyy('24/08/2026'), '240826');
  assert.equal(formatToDdmmyy('240826'), '240826');

  const payload455 = buildPayload455({
    unid: 'VGA',
    startDate: '2026-05-22',
    endDate: '2026-05-27',
    dataTipo: 'EMISSAO',
    empresa: 'camilo'
  });
  assert.equal(payload455.act, 'E1');
  assert.equal(payload455.f2, 'VGA');
  assert.equal(payload455.f3, 'A');
  assert.equal(payload455.f9, '220526');
  assert.equal(payload455.f10, '270526');
  assert.equal(payload455.f11, '');
  assert.equal(payload455.f12, '');
  assert.equal(payload455.f22, 'p');
  assert.equal(payload455.f35, 'e');
  assert.equal(payload455.f37, 'B');
  assert.equal(payload455.reg_tipo, 'E');
  assert.equal(payload455.ibscbs, 'A');
  assert.equal(payload455.basico, 'N');
  assert.ok(payload455.dummy);

  // Default AUTORIZACAO (f11/f12)
  const defaultPayload = buildPayload455({
    unid: 'VGA',
    startDate: '2026-08-24',
    endDate: '2026-08-24'
  });
  assert.equal(defaultPayload.f11, '240826');
  assert.equal(defaultPayload.f12, '240826');
  assert.equal(defaultPayload.f9, '');
  assert.equal(defaultPayload.f10, '');
  assert.equal(defaultPayload.f13, '');
  assert.equal(defaultPayload.f14, '');
  assert.equal(defaultPayload.f15, '');
  assert.equal(defaultPayload.f16, '');
  assert.equal(defaultPayload.f22, 'p');
  assert.equal(defaultPayload.f35, 'e');
  assert.equal(defaultPayload.f37, 'B');
  console.log('   ✓ Payload 455 & Date Formatter: Todos os casos de teste passaram.');

  // ==========================================
  // 4. TESTES DOS GATEWAYS (Request, Queue XML, Download 2-step)
  // ==========================================
  console.log('4. Testando Gateways SSW com HTTP Mock (Protocolo SSWTools)...');
  
  let queuePollCount = 0;
  let dowReceivedSeq = '';
  let getCsvParams: URLSearchParams | null = null;

  const mockHttpFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);

    // Login
    if (urlStr.includes('/bin/ssw0422')) {
      const headers = new Headers();
      headers.set('set-cookie', 'SSWSESSION=token999; Path=/');
      return new Response('OK', { status: 200, headers });
    }

    // 455 Request (ssw0230)
    if (urlStr.includes('/bin/ssw0230')) {
      return new Response(`
        <html><body>
          <h2>Relatório solicitado para processamento!</h2>
          <p>Sequência: 78910</p>
          <a href="/bin/ssw1440?act=&seq=78910">Ver Fila 156</a>
        </body></html>
      `, { status: 200 });
    }

    // Queue 156 Polling e Download Step 1 (ssw1440)
    if (urlStr.includes('/bin/ssw1440')) {
      const bodyStr = String(init?.body || '');
      
      // Se for a ação DOW<SEQ> (Download Etapa 1)
      if (bodyStr.includes('act=DOW')) {
        const match = /act=DOW(\d+)/.exec(bodyStr);
        dowReceivedSeq = match ? match[1] : '';
        return new Response(SAMPLE_DOW_RESPONSE_HTML, { status: 200 });
      }

      // Consulta de Fila normal
      queuePollCount++;
      const xml = queuePollCount === 1 ? SAMPLE_QUEUE_XML_WAITING : SAMPLE_QUEUE_XML_COMPLETED;
      return new Response(xml, { status: 200 });
    }

    // Download CSV Step 2 (ssw0424)
    if (urlStr.includes('/bin/ssw0424')) {
      const parsedUrl = new URL(urlStr, 'https://sistema.ssw.inf.br');
      getCsvParams = parsedUrl.searchParams;
      return new Response(SAMPLE_455_CSV, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=iso-8859-1' }
      });
    }

    return new Response('Not Found', { status: 404 });
  };

  const testSession = new SswSessionManager({
    credentials: {
      empresa: 'camilo',
      useri: '12345',
      usuario: 'AMATHEUS',
      senha: 'pwd',
      unidade: 'VGA'
    },
    fetchFn: mockHttpFetch
  });
  const httpClient = new SswHttpClient(testSession, mockHttpFetch);

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

  const requestGateway = new Ssw455RequestGateway(registry, httpClient);
  const queueGateway = new SswReportQueueGateway(registry, httpClient);
  const downloadGateway = new SswReportDownloadGateway(registry, httpClient);

  // 1. Request test
  const reqResult = await requestGateway.requestReport455({ unid: 'VGA' }, 'VGA', 'camilo');
  assert.equal(reqResult.sequence, '78910');
  assert.equal(reqResult.isAccepted, true);

  // 2. Queue test - XML Parsing & Strict Ownership
  const queue1 = await queueGateway.checkQueue({ sequence: '78910', username: 'AMATHEUS', unidade: 'VGA' });
  assert.ok(queue1.matchedRecord, 'Item 78910 deve ser encontrado');
  assert.equal(queue1.matchedRecord?.sequence, '78910');
  assert.equal(queue1.matchedRecord?.status, 'WAITING');
  assert.equal(queue1.matchedRecord?.isReady, false);

  // Consulta 2: status concluído e DOW78910 pronto
  const queue2 = await queueGateway.checkQueue({ sequence: '78910', username: 'AMATHEUS', unidade: 'VGA' });
  assert.equal(queue2.matchedRecord?.status, 'COMPLETED');
  assert.equal(queue2.matchedRecord?.isReady, true);
  assert.equal(queue2.matchedRecord?.action, 'DOW78910');

  // Teste de rejeição de propriedade: outro usuário não deve acessar item de terceiro
  const queueOther = await queueGateway.checkQueue({ username: 'OUTRO_USER', unidade: 'BHZ' });
  assert.equal(queueOther.matchedRecord?.sequence, '11111');
  assert.equal(queueOther.records.length, 1);

  // 3. Teste de extração de metadados web_body
  const meta = extractDownloadMeta455(SAMPLE_DOW_RESPONSE_HTML);
  assert.ok(meta);
  assert.equal(meta?.internalName, 'rel455_78910.csv');
  assert.equal(meta?.internalPath, '/relatorios/');

  // 4. Download test - 2-step flow (POST DOW78910 -> GET ssw0424)
  const downloadResult = await downloadGateway.downloadReport({ sequence: '78910' });
  assert.equal(dowReceivedSeq, '78910');
  assert.ok(getCsvParams);
  assert.equal(getCsvParams?.get('act'), 'rel455_78910.csv');
  assert.equal(getCsvParams?.get('filename'), 'rel455_78910.csv');
  assert.equal(getCsvParams?.get('path'), '/relatorios/');
  assert.equal(getCsvParams?.get('down'), '1');
  assert.ok(downloadResult.csvContent.includes('RODOVIARIO CAMILO DOS SANTOS'));
  assert.ok(downloadResult.byteLength > 100);

  // 5. Teste de rejeição de falso-200 HTML no download
  assert.throws(
    () => downloadGateway.validateCsvStructure('<html><body>Erro no SSW</body></html>'),
    /retornou uma página HTML/
  );
  assert.throws(
    () => downloadGateway.validateCsvStructure(''),
    /conteúdo vazio/
  );
  console.log('   ✓ Gateways, XML Queue, Ownership & 2-Step Download: Todos os casos de teste passaram.');

  // ==========================================
  // 5. TESTE END-TO-END DO ORQUESTRADOR Ssw455Service
  // ==========================================
  console.log('5. Testando Orquestrador Ssw455Service (End-to-End)...');
  
  queuePollCount = 0; // Reinicia contador de polling
  const circuitBreaker = new SswCircuitBreaker({
    failureThreshold: 3,
    successThreshold: 2,
    backoffStepsMs: [1000, 2000]
  });
  const retryPolicy = new SswRetryPolicy({ maxAttempts: 2, baseDelayMs: 10 });
  const incidentStore = new InMemoryIncidentStore();
  const incidentAggregator = new SswIncidentAggregator(incidentStore);
  const jobStore = new InMemoryJobStore();

  const sswService = new Ssw455Service({
    registry,
    circuitBreaker,
    retryPolicy,
    incidentAggregator,
    sessionManager: testSession,
    requestGateway,
    queueGateway,
    downloadGateway,
    jobStore,
    sleepFn: async () => {} // Instantâneo para os testes
  });

  const acquisitionResult = await sswService.acquireReport(
    { startDate: '2026-05-22', endDate: '2026-05-27', unid: 'VGA' },
    'AMATHEUS'
  );

  assert.equal(acquisitionResult.success, true);
  assert.ok(acquisitionResult.job);
  assert.equal(acquisitionResult.job.status, 'COMPLETED');
  assert.equal(acquisitionResult.job.sequence, '78910');
  assert.ok(acquisitionResult.csvContent);
  assert.equal(acquisitionResult.rowCount, 4);

  // Verificação de persistência do job
  const persistedJob = await jobStore.getJob(acquisitionResult.job.id);
  assert.ok(persistedJob);
  assert.equal(persistedJob?.status, 'COMPLETED');

  // Verificação de telemetria de saúde
  const health = await sswService.getHealthSummary();
  assert.equal(health.overallStatus, 'HEALTHY');
  assert.equal(health.openCircuits, 0);
  assert.equal(health.activeIncidentsCount, 0);
  console.log('   ✓ Ssw455Service End-to-End: Todos os casos de teste passaram.');

  console.log('\n======================================================');
  console.log('TODOS OS TESTES DO SSW-455-FIX-001 PASSARAM COM SUCESSO! 🚀');
  console.log('======================================================\n');
}

runSsw455Tests().catch((err) => {
  console.error('\n❌ ERRO NOS TESTES DO SSW-455-FIX-001:', err);
  process.exit(1);
});
