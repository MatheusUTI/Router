import assert from 'node:assert/strict';
import { SswCapabilityId, SswCapabilityStatus, SswCircuitState } from '../../src/integrations/ssw/types/capabilities';
import { SswSessionManager } from '../../server/ssw/session/sessionManager';
import { SswFormAnalyzer } from '../../server/ssw/discovery/sswFormAnalyzer';
import { SswDiscoveryEngine } from '../../server/ssw/discovery/sswDiscoveryEngine';
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
import { SSW_SIGNATURES, DEFAULT_KNOWN_ENDPOINTS } from '../../server/ssw/signatures/sswSignatures';
import { parsePtBrFloat, cleanPrefix, processCsvToCtrcs } from '../../src/services/importCsvAdapter';

// Sample CSV mock for 455 reports
const SAMPLE_455_CSV = `0;RODOVIARIO CAMILO DOS SANTOS;RELATORIO 455 ENTREGAS;;;;;;
1;Serie/Numero CTRC;Cliente Destinatario;Praca de Destino;Cidade de Entrega;Peso Real em Kg;Quantidade de Volumes;Valor da Mercadoria;Valor do Frete;Unidade Receptora;Previsao de Entrega
2;VGA433233-4;COMPANHIA BRASILEIRA DE DISTRIBUICAO;VGAP;VARGINHA;169,58;20;26919,32;316,9;VGA;26/05/2026
2;CPQ854800-5;MIGOTO COMERCIO DE VEICULOS LTDA;VGAP;VARGINHA;6,615;5;5925,00;65,86;VGA;25/05/2026
2;BHZ907302-7;ROBERTA MACHADO VASCONCELOS;VGAP;TRES CORACOES;40,00;4;1915,74;109,18;VGA;25/05/2026`;

async function runSsw455Tests() {
  console.log('--- Iniciando Testes Unitários e de Integração SSW-455-001 ---');

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
  
  // Criar mock de fetch para testar login e expiração
  let loginRequestsCount = 0;
  const mockFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);
    
    if (urlStr.includes('/bin/ssw0010')) {
      loginRequestsCount++;
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
      username: 'test_user',
      password: 'test_password',
      baseUrl: 'https://ssw.inf.br',
      defaultUnid: 'VGA'
    },
    fetchFn: mockFetch
  });

  assert.equal(sessionManager.isConfigured(), true);
  assert.equal(sessionManager.getBaseUrl(), 'https://ssw.inf.br');
  assert.equal(sessionManager.getDefaultUnid(), 'VGA');

  // Detecção de HTML de login falso-200
  assert.equal(sessionManager.isLoginHtmlResponse('<form action="ssw0010"><input name="senha"></form>'), true);
  assert.equal(sessionManager.isLoginHtmlResponse('<html><body>Sessão expirada. Efetue login.</body></html>'), true);
  assert.equal(sessionManager.isLoginHtmlResponse('<html><body>Tabela de relatórios gerados</body></html>'), false);

  // Autenticação
  await sessionManager.authenticate();
  assert.equal(sessionManager.getCookieHeader(), 'SSWSESSION=abc123xyz');
  assert.equal(loginRequestsCount, 1);

  const safeStatus = sessionManager.getSafeStatus();
  assert.equal(safeStatus.isConfigured, true);
  assert.equal(safeStatus.isAuthenticated, true);
  assert.equal(safeStatus.authenticatedUser, 'test_user');
  console.log('   ✓ SswSessionManager: Todos os casos de teste passaram.');

  // ==========================================
  // 3. TESTES DE FORM ANALYZER & DISCOVERY
  // ==========================================
  console.log('3. Testando SswFormAnalyzer e SswDiscoveryEngine...');
  const sampleHtmlWithForms = `
    <html>
      <body>
        <form action="/bin/ssw0230" method="POST">
          <input type="text" name="unid" value="VGA">
          <input type="text" name="data_ini">
          <input type="text" name="data_fim">
          <input type="hidden" name="relatorio" value="455">
          <input type="submit" value="Gerar Relatório">
        </form>
        <form action="/bin/ssw9999" method="GET">
          <input type="text" name="search">
        </form>
      </body>
    </html>
  `;

  const formAnalyzer = new SswFormAnalyzer();
  const forms = await formAnalyzer.extractForms(sampleHtmlWithForms);
  assert.equal(forms.length, 2);
  assert.equal(forms[0].actionUrl, '/bin/ssw0230');
  assert.equal(forms[0].method, 'POST');
  assert.equal(forms[0].hasSubmitButton, true);

  const score455 = formAnalyzer.scoreFormCompatibility(forms[0], SSW_SIGNATURES[SswCapabilityId.REPORT_455_REQUEST]);
  assert.ok(score455 >= 0.85, `Score ${score455} deve ser >= 0.85`);

  const discoveryEngine = new SswDiscoveryEngine(formAnalyzer);
  const discoveryResult = await discoveryEngine.discoverCapability(
    SswCapabilityId.REPORT_455_REQUEST,
    SSW_SIGNATURES[SswCapabilityId.REPORT_455_REQUEST],
    sampleHtmlWithForms
  );
  assert.equal(discoveryResult.candidates.length, 1);
  assert.equal(discoveryResult.candidates[0].endpoint, '/bin/ssw0230');
  console.log('   ✓ Form Analyzer & Discovery: Todos os casos de teste passaram.');

  // ==========================================
  // 4. TESTES DOS GATEWAYS (Request, Queue, Download)
  // ==========================================
  console.log('4. Testando Gateways SSW com HTTP Mock...');
  
  let queuePollCount = 0;
  const mockHttpFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = String(input);

    // Login
    if (urlStr.includes('/bin/ssw0010')) {
      const headers = new Headers();
      headers.set('set-cookie', 'SSWSESSION=token999; Path=/');
      return new Response('OK', { status: 200, headers });
    }

    // 455 Request
    if (urlStr.includes('/bin/ssw0230')) {
      return new Response(`
        <html><body>
          <h2>Relatório solicitado com sucesso!</h2>
          <p>Sequência: 78910</p>
          <a href="/bin/ssw1440?act=&seq=78910">Ver Fila 156</a>
        </body></html>
      `, { status: 200 });
    }

    // Queue 156 Polling
    if (urlStr.includes('/bin/ssw1440')) {
      queuePollCount++;
      // Na primeira consulta: AGUARDANDO. Na segunda: CONCLUÍDO
      const statusText = queuePollCount === 1 ? 'AGUARDANDO' : 'CONCLUÍDO';
      return new Response(`
        <html><body>
          <table>
            <tr><td>Sequência</td><td>Relatório</td><td>Usuário</td><td>Status</td></tr>
            <tr>
              <td>78910</td>
              <td>455</td>
              <td>test_user</td>
              <td><a href="/bin/ssw0424?seq=78910&rel=455">${statusText}</a></td>
            </tr>
            <tr>
              <td>11111</td>
              <td>455</td>
              <td>outro_usuario</td>
              <td>CONCLUÍDO</td>
            </tr>
          </table>
        </body></html>
      `, { status: 200 });
    }

    // Download CSV
    if (urlStr.includes('/bin/ssw0424')) {
      return new Response(SAMPLE_455_CSV, {
        status: 200,
        headers: { 'Content-Type': 'text/csv; charset=iso-8859-1' }
      });
    }

    return new Response('Not Found', { status: 404 });
  };

  const testSession = new SswSessionManager({
    credentials: { username: 'test_user', password: 'pwd' },
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
  const reqResult = await requestGateway.requestReport455({ unid: 'VGA' });
  assert.equal(reqResult.sequence, '78910');

  // 2. Queue test - Strict ownership
  const queue1 = await queueGateway.checkQueue({ sequence: '78910', username: 'test_user' });
  assert.ok(queue1.matchedItem, 'Item 78910 deve ser encontrado');
  assert.equal(queue1.matchedItem?.sequence, '78910');
  assert.equal(queue1.matchedItem?.status, 'WAITING');

  // Consulta 2: status concluído
  const queue2 = await queueGateway.checkQueue({ sequence: '78910', username: 'test_user' });
  assert.equal(queue2.matchedItem?.status, 'COMPLETED');

  // Teste de rejeição de propriedade (não confundir com relatório de outro usuário)
  const queueOther = await queueGateway.checkQueue({ sequence: '99999', username: 'test_user' });
  assert.equal(queueOther.matchedItem, undefined);

  // 3. Download test
  const downloadResult = await downloadGateway.downloadReport({ sequence: '78910' });
  assert.ok(downloadResult.csvContent.includes('RODOVIARIO CAMILO DOS SANTOS'));
  assert.ok(downloadResult.byteLength > 100);

  // 4. Teste de rejeição de falso-200 HTML no download
  assert.throws(
    () => downloadGateway.validateCsvStructure('<html><body>Erro no SSW</body></html>'),
    /retornou uma página HTML/
  );
  assert.throws(
    () => downloadGateway.validateCsvStructure(''),
    /conteúdo vazio/
  );
  console.log('   ✓ Gateways & Ownership: Todos os casos de teste passaram.');

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
    'test_user'
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
  console.log('TODOS OS TESTES DO SSW-455-001 PASSARAM COM SUCESSO! 🚀');
  console.log('======================================================\n');
}

runSsw455Tests().catch((err) => {
  console.error('\n❌ ERRO NOS TESTES DO SSW-455-001:', err);
  process.exit(1);
});
