import { SswReportJob, SswReportJobStatus } from '../../../src/integrations/ssw/types/jobs';

/**
 * Porta de persistência de Jobs de relatórios do SSW.
 */
export interface JobStorePort {
  saveJob(job: SswReportJob): Promise<void>;
  getJob(id: string): Promise<SswReportJob | null>;
  getJobBySequence(sequence: string): Promise<SswReportJob | null>;
  getRecentJobs(limit?: number): Promise<SswReportJob[]>;
  updateJobStatus(id: string, status: SswReportJobStatus, error?: string): Promise<void>;
}

/**
 * Implementação em memória da porta de armazenamento de jobs.
 */
export class InMemoryJobStore implements JobStorePort {
  private jobs = new Map<string, SswReportJob>();

  public async saveJob(job: SswReportJob): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  public async getJob(id: string): Promise<SswReportJob | null> {
    const item = this.jobs.get(id);
    return item ? { ...item } : null;
  }

  public async getJobBySequence(sequence: string): Promise<SswReportJob | null> {
    for (const job of this.jobs.values()) {
      if (job.sequence === sequence) {
        return { ...job };
      }
    }
    return null;
  }

  public async getRecentJobs(limit = 20): Promise<SswReportJob[]> {
    const list = Array.from(this.jobs.values());
    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return list.slice(0, limit);
  }

  public async updateJobStatus(id: string, status: SswReportJobStatus, error?: string): Promise<void> {
    const existing = this.jobs.get(id);
    if (existing) {
      existing.status = status;
      existing.lastCheckedAt = new Date().toISOString();
      if (error !== undefined) {
        existing.error = error;
      }
      if (status === 'COMPLETED') {
        existing.downloadAvailable = true;
      }
      this.jobs.set(id, existing);
    }
  }
}
