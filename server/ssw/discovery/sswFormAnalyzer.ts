import {
  ISswFormAnalyzer,
  SswFormDescriptor
} from './contracts';
import { SswCapabilitySignature } from '../../../src/integrations/ssw/types/capabilities';

/**
 * Analisador leve de formulários HTML para descoberta conservadora de endpoints SSW.
 */
export class SswFormAnalyzer implements ISswFormAnalyzer {
  /**
   * Extrai descritores de formulários a partir do HTML usando parsing estruturado por expressões regulares.
   */
  public async extractForms(htmlContent: string): Promise<SswFormDescriptor[]> {
    if (!htmlContent || typeof htmlContent !== 'string') return [];

    const forms: SswFormDescriptor[] = [];
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch: RegExpExecArray | null;

    while ((formMatch = formRegex.exec(htmlContent)) !== null) {
      const formAttributes = formMatch[1];
      const formBody = formMatch[2];

      const actionMatch = /action=["']([^"']*)["']/i.exec(formAttributes);
      const methodMatch = /method=["']([^"']*)["']/i.exec(formAttributes);
      const nameMatch = /name=["']([^"']*)["']/i.exec(formAttributes);
      const idMatch = /id=["']([^"']*)["']/i.exec(formAttributes);

      const actionUrl = actionMatch ? actionMatch[1].trim() : '';
      const method = (methodMatch ? methodMatch[1].toUpperCase() : 'GET') as 'GET' | 'POST';

      const inputFieldNames: string[] = [];
      const hiddenFields: Record<string, string> = {};
      let hasSubmitButton = false;

      // Extrai inputs
      const inputRegex = /<input\b([^>]*)>/gi;
      let inputMatch: RegExpExecArray | null;
      while ((inputMatch = inputRegex.exec(formBody)) !== null) {
        const inputAttrs = inputMatch[1];
        const nameAttr = /name=["']([^"']*)["']/i.exec(inputAttrs);
        const typeAttr = /type=["']([^"']*)["']/i.exec(inputAttrs);
        const valueAttr = /value=["']([^"']*)["']/i.exec(inputAttrs);

        const inputType = typeAttr ? typeAttr[1].toLowerCase() : 'text';
        const inputName = nameAttr ? nameAttr[1] : '';

        if (inputName) {
          inputFieldNames.push(inputName);
          if (inputType === 'hidden' && valueAttr) {
            hiddenFields[inputName] = valueAttr[1];
          }
        }

        if (inputType === 'submit' || inputType === 'button') {
          hasSubmitButton = true;
        }
      }

      // Extrai selects
      const selectRegex = /<select\b[^>]*name=["']([^"']*)["'][^>]*>/gi;
      let selectMatch: RegExpExecArray | null;
      while ((selectMatch = selectRegex.exec(formBody)) !== null) {
        if (selectMatch[1]) inputFieldNames.push(selectMatch[1]);
      }

      // Extrai botões <button type="submit">
      if (/<button\b[^>]*type=["']submit["']/i.test(formBody) || /<button\b[^>]*>/i.test(formBody)) {
        hasSubmitButton = true;
      }

      forms.push({
        actionUrl,
        method: method === 'POST' ? 'POST' : 'GET',
        formName: nameMatch ? nameMatch[1] : undefined,
        formId: idMatch ? idMatch[1] : undefined,
        inputFieldNames,
        hiddenFields,
        hasSubmitButton
      });
    }

    return forms;
  }

  /**
   * Calcula um score de compatibilidade (0.00 a 1.00) entre um formulário extraído e a assinatura da capacidade.
   */
  public scoreFormCompatibility(
    form: SswFormDescriptor,
    signature: SswCapabilitySignature
  ): number {
    let score = 0;

    // 1. Método HTTP compatível (peso 0.20)
    if (form.method === signature.expectedMethod) {
      score += 0.20;
    }

    // 2. Presença dos campos de payload obrigatórios (peso 0.60)
    if (signature.requiredPayloadFields && signature.requiredPayloadFields.length > 0) {
      const formFieldsLower = form.inputFieldNames.map(f => f.toLowerCase());
      let matchedCount = 0;

      for (const requiredField of signature.requiredPayloadFields) {
        const reqLower = requiredField.toLowerCase();
        if (formFieldsLower.some(f => f === reqLower || f.includes(reqLower))) {
          matchedCount++;
        }
      }

      const fieldCoverage = matchedCount / signature.requiredPayloadFields.length;
      score += fieldCoverage * 0.60;
    } else {
      // Se não exige campos específicos, atribui o peso base
      score += 0.40;
    }

    // 3. Botão de submit presente (peso 0.10)
    if (form.hasSubmitButton) {
      score += 0.10;
    }

    // 4. Action válida (peso 0.10)
    if (form.actionUrl && form.actionUrl.startsWith('/bin/ssw')) {
      score += 0.10;
    }

    return Math.min(1.0, Math.max(0.0, Number(score.toFixed(2))));
  }
}
