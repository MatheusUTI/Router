import { SswCapabilityId, SswCapabilityStatus, SswCircuitState } from '../../../src/integrations/ssw/types/capabilities';
import {
  SswReportJob,
  SswReportJobStatus,
  Ssw455FilterParams,
  SswAcquisitionResult,
  SswLatestReportInfo
} from '../../../src/integrations/ssw/types/jobs';
import { SswError, SswErrorCode } from '../../../src/integrations/ssw/types/errors';
import { SswHealthSummaryDTO } from '../../../src/integrations/ssw/contracts/dtos';
import { SswCapabilityRegistry } from '../registry/capabilityRegistry';
import { SswCircuitBreaker } from '../resilience/circuitBreaker';
import { SswRetryPolicy } from '../resilience/retryPolicy';
import { SswIncidentAggregator } from '../resilience/incidentAggregator';
import { SswSessionManager } from '../session/sessionManager';
import { Ssw455RequestGateway } from '../gateways/ssw455RequestGateway';
import { SswReportQueueGateway } from '../gateways/sswReportQueueGateway';
import { SswReportDownloadGateway } from '../gateways/sswReportDownloadGateway';
import { JobStorePort, InMemoryJobStore } from './jobStorePort';

export interface Ssw455ServiceOptions {
  registry: SswCapabilityRegistry;
  circuitBreaker: SswCircuitBreaker;
  retryPolicy: SswRetryPolicy;
  incidentAggregator: SswIncidentAggregator;
  sessionManager: SswSessionManager;
  requestGateway: Ssw455RequestGateway;
  queueGateway: SswReportQueueGateway;
  downloadGateway: SswReportDownloadGateway;
  jobStore?: JobStorePort;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Orquestrador de Aplicação para aquisição resiliente do Relatório SSW 455.
 * Coordena autenticação, solicitação, acompanhamento na fila 156, download e diagnósticos de saúde.
 */
export class Ssw455Service {
  private registry: SswCapabilityRegistry;
  private circuitBreaker: SswCircuitBreaker;
  private retryPolicy: SswRetryPolicy;
  private incidentAggregator: SswIncidentAggregator;
  private sessionManager: SswSessionManager;
  private requestGateway: Ssw455RequestGateway;
  private queueGateway: SswReportQueueGateway;
  private downloadGateway: SswReportDownloadGateway;
  private jobStore: JobStorePort;
  private sleepFn: (ms: number) => Promise<void>;

  constructor(options: Ssw455ServiceOptions) {
    this.registry = options.registry;
    this.circuitBreaker = options.circuitBreaker;
    this.retryPolicy = options.retryPolicy;
    this.incidentAggregator = options.incidentAggregator;
    this.sessionManager = options.sessionManager;
    this.requestGateway = options.requestGateway;
    this.queueGateway = options.queueGateway;
    this.downloadGateway = options.downloadGateway;
    this.jobStore = options.jobStore || new InMemoryJobStore();
    this.sleepFn = options.sleepFn || ((ms: number) => new Promise(res => setTimeout(res, ms)));
  }

  /**
   * Valida coerência de datas do período de solicitação.
   */
  private validatePeriod(params: Ssw455FilterParams): { startDate: string; endDate: string } {
    const today = new Date().toISOString().split('T')[0];
    const startDate = params.startDate || today;
    const endDate = params.endDate || today;

    // Se ambas as datas estiverem no formato ISO (YYYY-MM-DD), valida se startDate <= endDate
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        throw new SswError(
          SswErrorCode.REQUEST_REJECTED,
          `Data inicial (${startDate}) não pode ser posterior à data final (${endDate}).`
        );
      }
    }

    return { startDate, endDate };
  }

  /**
   * Solicita a geração do Relatório 455 no SSW.
   */
  public async requestReport(
    params: Ssw455FilterParams,
    requestedBy = 'operador'
  ): Promise<SswReportJob> {
    const period = this.validatePeriod(params);
    const capId = SswCapabilityId.REPORT_455_REQUEST;

    if (!this.circuitBreaker.canExecute(capId)) {
      throw new SswError(
        SswErrorCode.CAPABILITY_DEGRADED,
        'Circuito temporariamente aberto para solicitação do relatório 455 devido a falhas anteriores.',
        { capabilityId: capId }
      );
    }

    const defaultUnid = this.sessionManager.getDefaultUnid();
    const effectiveUnid = params.unid || defaultUnid;
    const empresa = this.sessionManager.getAuthenticatedEmpresa();
    const sswUser = this.sessionManager.getAuthenticatedUsername();

    // 1. Obtém a maior sequência prévia do usuário na fila 156 (oldSeq)
    let oldSeq = 0;
    try {
      const preQueue = await this.queueGateway.checkQueue({
        username: sswUser,
        unidade: effectiveUnid
      });
      oldSeq = preQueue.userMaxSequence || this.queueGateway.getMaxSequence(preQueue.records);
    } catch {
      // Falha não-bloqueante na verificação prévia
      oldSeq = 0;
    }

    try {
      const result = await this.retryPolicy.execute(
        async () => {
          return await this.requestGateway.requestReport455(
            { ...params, startDate: period.startDate, endDate: period.endDate, unid: effectiveUnid },
            defaultUnid,
            empresa
          );
        }
      );

      // Sucesso na solicitação
      await this.registry.recordSuccess(capId);
      this.circuitBreaker.recordSuccess(capId);
      await this.incidentAggregator.resolveIncident(capId);

      const jobId = `job_455_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const job: SswReportJob = {
        id: jobId,
        sequence: result.sequence,
        requestedBy: sswUser || requestedBy,
        requestedAt: new Date().toISOString(),
        status: 'REQUESTED',
        period,
        reportType: '455',
        unid: effectiveUnid,
        lastCheckedAt: new Date().toISOString(),
        downloadAvailable: false,
        metadata: {
          minSequence: oldSeq,
          empresa,
          operator: requestedBy
        }
      };

      await this.jobStore.saveJob(job);
      return job;
    } catch (err: any) {
      await this.registry.recordFailure(capId);
      this.circuitBreaker.recordFailure(capId);
      await this.incidentAggregator.recordIncident(
        capId,
        err.message || 'Falha na solicitação do relatório 455'
      );
      throw err;
    }
  }

  /**
   * Consulta o status de um Job na Fila 156 do SSW.
   */
  public async checkJobStatus(jobId: string): Promise<SswReportJob> {
    const job = await this.jobStore.getJob(jobId);
    if (!job) {
      throw new SswError(
        SswErrorCode.JOB_NOT_FOUND,
        `Job de relatório com ID '${jobId}' não encontrado.`
      );
    }

    const capId = SswCapabilityId.REPORT_QUEUE;
    if (!this.circuitBreaker.canExecute(capId)) {
      throw new SswError(
        SswErrorCode.CAPABILITY_DEGRADED,
        'Circuito da Fila 156 do SSW temporariamente aberto devido a instabilidades.',
        { capabilityId: capId }
      );
    }

    try {
      const minSeq = typeof job.metadata?.minSequence === 'number' ? job.metadata.minSequence : undefined;
      const sswUser = this.sessionManager.getAuthenticatedUsername() || job.requestedBy;

      const queueCheck = await this.queueGateway.checkQueue({
        sequence: job.sequence,
        username: sswUser,
        unidade: job.unid,
        minSequence: minSeq
      });

      await this.registry.recordSuccess(capId);
      this.circuitBreaker.recordSuccess(capId);
      await this.incidentAggregator.resolveIncident(capId);

      if (queueCheck.matchedRecord) {
        const item = queueCheck.matchedRecord;
        job.status = item.status;
        if (!job.sequence && item.sequence) {
          job.sequence = item.sequence;
        }
        if (item.isReady || item.status === 'COMPLETED') {
          job.status = 'COMPLETED';
          job.downloadAvailable = true;
        }
      } else if (job.status === 'REQUESTED') {
        // Ainda não apareceu na lista, transita para aguardando
        job.status = 'WAITING';
      }

      job.lastCheckedAt = new Date().toISOString();
      await this.jobStore.saveJob(job);
      return job;
    } catch (err: any) {
      await this.registry.recordFailure(capId);
      this.circuitBreaker.recordFailure(capId);
      await this.incidentAggregator.recordIncident(
        capId,
        err.message || 'Falha ao consultar fila 156 do SSW'
      );
      throw err;
    }
  }

  /**
   * Executa polling controlado até que o relatório seja concluído ou o timeout seja atingido.
   */
  public async pollUntilComplete(
    job: SswReportJob,
    options?: {
      pollIntervalMs?: number;
      maxWaitTimeMs?: number;
      onProgress?: (job: SswReportJob) => void;
      signal?: AbortSignal;
    }
  ): Promise<SswReportJob> {
    const pollIntervalMs = options?.pollIntervalMs || 5000;
    const maxWaitTimeMs = options?.maxWaitTimeMs || 300000; // 5 minutos padrão
    const startTime = Date.now();

    let currentJob = { ...job };

    while (Date.now() - startTime < maxWaitTimeMs) {
      if (options?.signal?.aborted) {
        throw new SswError(
          SswErrorCode.JOB_TIMEOUT,
          'A operação de acompanhamento do relatório foi cancelada pelo usuário.'
        );
      }

      currentJob = await this.checkJobStatus(currentJob.id);
      if (options?.onProgress) {
        options.onProgress(currentJob);
      }

      if (currentJob.status === 'COMPLETED') {
        return currentJob;
      }

      if (currentJob.status === 'FAILED') {
        throw new SswError(
          SswErrorCode.REQUEST_REJECTED,
          'O relatório falhou durante a geração na Fila 156 do SSW.',
          { details: currentJob.error }
        );
      }

      await this.sleepFn(pollIntervalMs);
    }

    throw new SswError(
      SswErrorCode.JOB_TIMEOUT,
      `Tempo limite de espera (${maxWaitTimeMs / 1000}s) esgotado aguardando o relatório 455 na fila do SSW.`
    );
  }

  /**
   * Realiza o download do arquivo CSV do relatório concluído.
   */
  public async downloadReport(job: SswReportJob): Promise<{ csvContent: string; rowCount: number }> {
    const capId = SswCapabilityId.REPORT_DOWNLOAD;

    if (!this.circuitBreaker.canExecute(capId)) {
      throw new SswError(
        SswErrorCode.CAPABILITY_DEGRADED,
        'Circuito de download do SSW temporariamente aberto.',
        { capabilityId: capId }
      );
    }

    try {
      const downloadResult = await this.retryPolicy.execute(
        async () => {
          return await this.downloadGateway.downloadReport({
            sequence: job.sequence
          });
        }
      );

      await this.registry.recordSuccess(capId);
      this.circuitBreaker.recordSuccess(capId);
      await this.incidentAggregator.resolveIncident(capId);

      const lines = downloadResult.csvContent.split('\n').filter(l => l.trim().length > 0);
      const rowCount = Math.max(0, lines.length - 1);

      return {
        csvContent: downloadResult.csvContent,
        rowCount
      };
    } catch (err: any) {
      await this.registry.recordFailure(capId);
      this.circuitBreaker.recordFailure(capId);
      await this.incidentAggregator.recordIncident(
        capId,
        err.message || 'Falha no download do relatório 455'
      );
      throw err;
    }
  }

  /**
   * Fluxo consolidado: Solicitação -> Polling de Fila -> Download.
   */
  public async acquireReport(
    params: Ssw455FilterParams,
    requestedBy = 'operador',
    options?: {
      pollIntervalMs?: number;
      maxWaitTimeMs?: number;
      onProgress?: (statusText: string) => void;
    }
  ): Promise<SswAcquisitionResult> {
    const nowIso = new Date().toISOString();

    try {
      if (options?.onProgress) options.onProgress('Solicitando relatório 455 no SSW...');
      const initialJob = await this.requestReport(params, requestedBy);

      if (options?.onProgress) options.onProgress('Aguardando processamento na Fila 156 do SSW...');
      const completedJob = await this.pollUntilComplete(initialJob, {
        pollIntervalMs: options?.pollIntervalMs,
        maxWaitTimeMs: options?.maxWaitTimeMs,
        onProgress: (j) => {
          if (options?.onProgress) {
            options.onProgress(`Status SSW: ${j.status}...`);
          }
        }
      });

      if (options?.onProgress) options.onProgress('Baixando arquivo CSV de entregas...');
      const { csvContent, rowCount } = await this.downloadReport(completedJob);

      return {
        success: true,
        job: completedJob,
        csvContent,
        rowCount,
        acquisitionTimestamp: nowIso
      };
    } catch (err: any) {
      return {
        success: false,
        job: {
          id: `failed_${Date.now()}`,
          requestedBy,
          requestedAt: nowIso,
          status: 'FAILED',
          period: { startDate: params.startDate || '', endDate: params.endDate || '' },
          reportType: '455',
          downloadAvailable: false,
          error: err.message
        },
        acquisitionTimestamp: nowIso,
        error: err.message || 'Erro durante a aquisição do relatório SSW 455',
        errorCode: err instanceof SswError ? err.code : SswErrorCode.NETWORK_ERROR
      };
    }
  }

  /**
   * Localiza o último relatório 455 na Fila 156 pertencente ao usuário e unidade autenticados.
   * Aplica estritamente as regras de ownership (tipo 455, usuário, unidade) e validação de status.
   */
  public async findLatestCompletedReport(unid?: string): Promise<SswLatestReportInfo> {
    const sswUser = this.sessionManager.getAuthenticatedUsername();
    const defaultUnid = this.sessionManager.getDefaultUnid();
    const effectiveUnid = unid || defaultUnid;

    const queueResult = await this.queueGateway.checkQueue({
      username: sswUser,
      unidade: effectiveUnid
    });

    const uUpper = (sswUser || '').trim().toUpperCase();
    const unidUpper = (effectiveUnid || '').trim().toUpperCase();

    // Filtra estritamente relatórios 455 pertencentes ao usuário e unidade autenticados
    const own455Records = queueResult.records.filter(r => {
      const rep = (r.reportType || '').trim().toUpperCase();
      const is455 = rep.startsWith('455') || rep.includes('455');
      if (!is455) return false;

      if (uUpper && r.username) {
        const rUser = r.username.trim().toUpperCase();
        if (rUser !== uUpper && !rUser.includes(uUpper) && !uUpper.includes(rUser)) {
          return false;
        }
      }

      if (unidUpper && r.unidade) {
        const rUnid = r.unidade.trim().toUpperCase();
        if (rUnid !== unidUpper) {
          return false;
        }
      }

      return true;
    });

    if (own455Records.length === 0) {
      return {
        found: false,
        downloadAvailable: false,
        message: 'Nenhum relatório 455 encontrado na fila para o seu usuário e unidade.'
      };
    }

    // Ordena por número de sequência decrescente (maior/mais recente primeiro)
    const sorted = own455Records.sort((a, b) => {
      const numA = parseInt(a.sequence, 10) || 0;
      const numB = parseInt(b.sequence, 10) || 0;
      return numB - numA;
    });

    const latest = sorted[0];
    const isCompleted = latest.status === 'COMPLETED' || /conclu/i.test(latest.statusRaw);
    const hasDow = latest.isReady && /DOW\d+/i.test(latest.action);

    return {
      found: true,
      sequence: latest.sequence,
      reportType: latest.reportType,
      dateTime: latest.dateTime,
      username: latest.username,
      unidade: latest.unidade,
      status: latest.status,
      statusRaw: latest.statusRaw,
      downloadAvailable: isCompleted && hasDow,
      action: latest.action
    };
  }

  /**
   * Sincroniza o último relatório 455 concluído da Fila 156 pertencente ao usuário.
   * Não gera um novo relatório no SSW.
   */
  public async syncLatestReport(
    unid?: string,
    requestedBy = 'operador'
  ): Promise<SswAcquisitionResult> {
    const nowIso = new Date().toISOString();
    const effectiveUnid = unid || this.sessionManager.getDefaultUnid();
    const sswUser = this.sessionManager.getAuthenticatedUsername();

    try {
      const latestInfo = await this.findLatestCompletedReport(effectiveUnid);

      if (!latestInfo.found || !latestInfo.sequence) {
        throw new SswError(
          SswErrorCode.JOB_NOT_FOUND,
          'Nenhum relatório 455 foi encontrado na fila para o seu usuário/unidade. Utilize a opção "Gerar novo 455" para solicitar uma emissão.'
        );
      }

      if (!latestInfo.downloadAvailable) {
        throw new SswError(
          SswErrorCode.QUEUE_UNAVAILABLE,
          `O último relatório 455 encontrado (Seq. ${latestInfo.sequence}) ainda não está concluído (Status: ${latestInfo.statusRaw || latestInfo.status}). Aguarde a conclusão ou tente novamente.`
        );
      }

      const job: SswReportJob = {
        id: `sync_latest_${latestInfo.sequence}_${Date.now()}`,
        sequence: latestInfo.sequence,
        requestedBy: latestInfo.username || sswUser || requestedBy,
        requestedAt: nowIso,
        status: 'COMPLETED',
        period: { startDate: '', endDate: '' },
        reportType: latestInfo.reportType || '455',
        unid: latestInfo.unidade || effectiveUnid,
        lastCheckedAt: nowIso,
        downloadAvailable: true
      };

      await this.jobStore.saveJob(job);

      // Baixa diretamente pelo fluxo de 2 etapas existente
      const { csvContent, rowCount } = await this.downloadReport(job);

      return {
        success: true,
        job,
        csvContent,
        rowCount,
        acquisitionTimestamp: nowIso
      };
    } catch (err: any) {
      return {
        success: false,
        job: {
          id: `failed_sync_${Date.now()}`,
          requestedBy: sswUser || requestedBy,
          requestedAt: nowIso,
          status: 'FAILED',
          period: { startDate: '', endDate: '' },
          reportType: '455',
          downloadAvailable: false,
          error: err.message
        },
        acquisitionTimestamp: nowIso,
        error: err.message || 'Erro ao sincronizar o último relatório SSW 455',
        errorCode: err instanceof SswError ? err.code : SswErrorCode.NETWORK_ERROR
      };
    }
  }

  /**
   * Tenta novamente o download de um relatório específico pela sequência já conhecida.
   * Não gera um novo relatório no SSW.
   */
  public async retryReport(
    sequence?: string,
    requestedBy = 'operador',
    unid?: string
  ): Promise<SswAcquisitionResult> {
    const nowIso = new Date().toISOString();
    const effectiveUnid = unid || this.sessionManager.getDefaultUnid();
    const sswUser = this.sessionManager.getAuthenticatedUsername();

    if (!sequence || typeof sequence !== 'string' || !sequence.trim()) {
      return this.syncLatestReport(effectiveUnid, requestedBy);
    }

    const cleanSeq = sequence.trim();

    try {
      const job: SswReportJob = {
        id: `retry_${cleanSeq}_${Date.now()}`,
        sequence: cleanSeq,
        requestedBy: sswUser || requestedBy,
        requestedAt: nowIso,
        status: 'COMPLETED',
        period: { startDate: '', endDate: '' },
        reportType: '455',
        unid: effectiveUnid,
        lastCheckedAt: nowIso,
        downloadAvailable: true
      };

      const { csvContent, rowCount } = await this.downloadReport(job);
      await this.jobStore.saveJob(job);

      return {
        success: true,
        job,
        csvContent,
        rowCount,
        acquisitionTimestamp: nowIso
      };
    } catch (err: any) {
      return {
        success: false,
        job: {
          id: `failed_retry_${cleanSeq}_${Date.now()}`,
          sequence: cleanSeq,
          requestedBy: sswUser || requestedBy,
          requestedAt: nowIso,
          status: 'FAILED',
          period: { startDate: '', endDate: '' },
          reportType: '455',
          downloadAvailable: false,
          error: err.message
        },
        acquisitionTimestamp: nowIso,
        error: err.message || `Erro ao tentar novamente o download da sequência ${cleanSeq}`,
        errorCode: err instanceof SswError ? err.code : SswErrorCode.NETWORK_ERROR
      };
    }
  }


  /**
   * Compila o resumo consolidado de saúde da integração SSW para visualização e telemetria.
   */
  public async getHealthSummary(): Promise<SswHealthSummaryDTO> {
    const allCaps = await this.registry.getAll();
    const incidents = await this.incidentAggregator.getActiveIncidents();

    let openCircuits = 0;
    let activeCapabilities = 0;

    const capabilitiesSummary = allCaps.map(c => {
      const state = this.circuitBreaker.getState(c.capabilityId);
      if (state === SswCircuitState.OPEN) openCircuits++;
      if (c.status === SswCapabilityStatus.ACTIVE) activeCapabilities++;

      return {
        id: c.capabilityId,
        status: c.status,
        confidence: c.confidence,
        circuitState: state,
        failureCount: c.failureCount,
        lastSuccess: c.lastSuccess,
        lastFailure: c.lastFailure
      };
    });

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE' = 'HEALTHY';
    if (!this.sessionManager.isConfigured()) {
      overallStatus = 'OFFLINE';
    } else if (openCircuits > 0) {
      overallStatus = openCircuits >= 2 ? 'CRITICAL' : 'DEGRADED';
    } else if (incidents.length > 0) {
      overallStatus = 'DEGRADED';
    }

    return {
      overallStatus,
      activeCapabilities,
      totalCapabilities: allCaps.length,
      openCircuits,
      activeIncidentsCount: incidents.length,
      capabilities: capabilitiesSummary,
      recentIncidents: incidents,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Retorna a porta de armazenamento de jobs.
   */
  public getJobStore(): JobStorePort {
    return this.jobStore;
  }
}
