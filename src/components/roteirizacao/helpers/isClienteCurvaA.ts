import { CurvaAClient, Ctrc } from '../../../types';

export interface CurvaAInfo {
  isCurvaA: boolean;
  classification?: string; // e.g., 'A' | 'B' | 'C'
  isRemetenteCurvaA?: boolean;
  isDestinatarioCurvaA?: boolean;
}

function checkMatch(nameStr: string, codeStr: string, cl: CurvaAClient): boolean {
  const clCnpjClean = (cl.cnpj_remetente || '').replace(/\D/g, '');
  const clNameClean = (cl.cliente_remetente || '').toUpperCase().trim();
  const nameUpper = nameStr.toUpperCase().trim();
  const codeUpper = codeStr.toUpperCase().trim();
  const nameCleanDigits = nameUpper.replace(/\D/g, '');
  const codeCleanDigits = codeUpper.replace(/\D/g, '');

  // 1. Exact Name Match
  if (nameUpper === clNameClean) return true;

  // 2. Partial Name Match
  if (nameUpper.length >= 3 && clNameClean.length >= 3) {
    if (nameUpper.includes(clNameClean) || clNameClean.includes(nameUpper)) {
      return true;
    }
  }

  // 3. CNPJ Matches against clean name digits
  if (clCnpjClean !== '' && nameCleanDigits !== '' && (nameCleanDigits === clCnpjClean || nameCleanDigits.includes(clCnpjClean) || clCnpjClean.includes(nameCleanDigits))) {
    return true;
  }

  // 4. CNPJ Matches against clean code
  if (clCnpjClean !== '' && codeCleanDigits !== '' && (codeCleanDigits === clCnpjClean || codeCleanDigits.includes(clCnpjClean) || clCnpjClean.includes(codeCleanDigits))) {
    return true;
  }

  return false;
}

export function isClienteCurvaA(ctrc: Ctrc, curvaAClients: CurvaAClient[] = []): CurvaAInfo {
  const remetenteStr = (ctrc.remetente || '').toUpperCase().trim();
  const codStr = (ctrc.cod || '').toUpperCase().trim();
  const destinatarioStr = (ctrc.destinatario || '').toUpperCase().trim();

  let isRemetenteCurvaA = false;
  let isDestinatarioCurvaA = false;
  let classification: string | undefined = undefined;

  if (remetenteStr || codStr) {
    const foundRem = curvaAClients.find((cl) => checkMatch(remetenteStr, codStr, cl));
    if (foundRem) {
      const classif = (foundRem.curva_a || '').toUpperCase().trim();
      if (classif.includes('A') || classif.includes('B')) {
        isRemetenteCurvaA = true;
        classification = classif;
      }
    }
  }

  if (destinatarioStr) {
    const foundDest = curvaAClients.find((cl) => checkMatch(destinatarioStr, '', cl));
    if (foundDest) {
      const classif = (foundDest.curva_a || '').toUpperCase().trim();
      if (classif.includes('A') || classif.includes('B')) {
        isDestinatarioCurvaA = true;
        if (!classification) {
          classification = classif;
        }
      }
    }
  }

  const isCurvaA = isRemetenteCurvaA || isDestinatarioCurvaA;

  return {
    isCurvaA,
    classification,
    isRemetenteCurvaA,
    isDestinatarioCurvaA,
  };
}

