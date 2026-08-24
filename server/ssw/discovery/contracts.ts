import {
  SswCapabilityId,
  SswCapabilitySignature,
  SswEndpointCandidate
} from '../../../src/integrations/ssw/types/capabilities';

/**
 * Descritor declarativo de um formulário extraído de páginas do SSW.
 */
export interface SswFormDescriptor {
  actionUrl: string;
  method: 'GET' | 'POST';
  formName?: string;
  formId?: string;
  inputFieldNames: string[];
  hiddenFields: Record<string, string>;
  hasSubmitButton: boolean;
}

/**
 * Resultado da análise de formulários e matching com capabilities.
 */
export interface SswDiscoveryResult {
  capabilityId: SswCapabilityId;
  candidates: SswEndpointCandidate[];
  analyzedFormsCount: number;
  discoveryTimestamp: string;
}

/**
 * Contrato abstrato para analisadores de formulários HTML.
 * (A implementação de parsing com cheirinho de DOM/HTML fica isolada no backend para ciclos futuros).
 */
export interface ISswFormAnalyzer {
  extractForms(htmlContent: string): Promise<SswFormDescriptor[]>;
  scoreFormCompatibility(
    form: SswFormDescriptor,
    signature: SswCapabilitySignature
  ): number;
}

/**
 * Contrato para validação de capacidades contra candidatos a endpoint.
 */
export interface SswCapabilityValidator {
  validateCandidate(
    candidate: SswEndpointCandidate,
    signature: SswCapabilitySignature
  ): Promise<{ isValid: boolean; adjustedConfidence: number; validationReason: string }>;
}

/**
 * Contrato abstrato do motor de Discovery.
 */
export interface ISswDiscoveryEngine {
  discoverCapability(
    capabilityId: SswCapabilityId,
    signature: SswCapabilitySignature,
    sourceHtml: string
  ): Promise<SswDiscoveryResult>;
}
