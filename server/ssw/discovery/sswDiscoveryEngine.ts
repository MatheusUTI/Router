import {
  ISswDiscoveryEngine,
  SswDiscoveryResult
} from './contracts';
import {
  SswCapabilityId,
  SswCapabilitySignature,
  SswEndpointCandidate
} from '../../../src/integrations/ssw/types/capabilities';
import { SswFormAnalyzer } from './sswFormAnalyzer';

/**
 * Motor de descoberta conservadora de endpoints SSW.
 * Apenas sugere promoção de endpoints se o score de confiança for estritamente >= 0.85.
 */
export class SswDiscoveryEngine implements ISswDiscoveryEngine {
  private formAnalyzer: SswFormAnalyzer;
  private readonly confidenceThreshold = 0.85;

  constructor(formAnalyzer?: SswFormAnalyzer) {
    this.formAnalyzer = formAnalyzer || new SswFormAnalyzer();
  }

  public async discoverCapability(
    capabilityId: SswCapabilityId,
    signature: SswCapabilitySignature,
    sourceHtml: string
  ): Promise<SswDiscoveryResult> {
    const forms = await this.formAnalyzer.extractForms(sourceHtml);
    const candidates: SswEndpointCandidate[] = [];
    const nowIso = new Date().toISOString();

    for (const form of forms) {
      if (!form.actionUrl) continue;

      const score = this.formAnalyzer.scoreFormCompatibility(form, signature);

      if (score >= this.confidenceThreshold) {
        candidates.push({
          capabilityId,
          endpoint: form.actionUrl,
          method: form.method,
          confidence: score,
          matchedFields: form.inputFieldNames,
          discoveredAt: nowIso
        });
      }
    }

    // Ordena do maior para o menor score
    candidates.sort((a, b) => b.confidence - a.confidence);

    return {
      capabilityId,
      candidates,
      analyzedFormsCount: forms.length,
      discoveryTimestamp: nowIso
    };
  }
}
