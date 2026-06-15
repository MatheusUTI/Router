import { CurvaAClient, Ctrc } from '../../../types';

export interface CurvaAInfo {
  isCurvaA: boolean;
  classification?: string; // e.g., 'A' | 'B' | 'C'
}

export function isClienteCurvaA(ctrc: Ctrc, curvaAClients: CurvaAClient[] = []): CurvaAInfo {
  const remetenteStr = (ctrc.remetente || '').toUpperCase().trim();
  const codStr = (ctrc.cod || '').toUpperCase().trim();

  if (!remetenteStr && !codStr) {
    return { isCurvaA: false };
  }

  const remCleanDigits = remetenteStr.replace(/\D/g, '');
  const codCleanDigits = codStr.replace(/\D/g, '');

  const found = curvaAClients.find((cl) => {
    const clCnpjClean = cl.cnpj_remetente.replace(/\D/g, '');
    const clNameClean = cl.cliente_remetente.toUpperCase().trim();

    // 1. Exact Name Match
    if (remetenteStr === clNameClean) return true;

    // 2. Partial Name Match
    if (remetenteStr.length >= 3 && clNameClean.length >= 3) {
      if (remetenteStr.includes(clNameClean) || clNameClean.includes(remetenteStr)) {
        return true;
      }
    }

    // 3. CNPJ Matches against clean remetente digits
    if (clCnpjClean !== '' && remCleanDigits !== '' && (remCleanDigits === clCnpjClean || remCleanDigits.includes(clCnpjClean) || clCnpjClean.includes(remCleanDigits))) {
      return true;
    }

    // 4. CNPJ Matches against clean cod
    if (clCnpjClean !== '' && codCleanDigits !== '' && (codCleanDigits === clCnpjClean || codCleanDigits.includes(clCnpjClean) || clCnpjClean.includes(codCleanDigits))) {
      return true;
    }

    return false;
  });

  if (found) {
    const classif = (found.curva_a || '').toUpperCase().trim();
    return {
      isCurvaA: classif.includes('A') || classif.includes('B'),
      classification: classif
    };
  }

  return { isCurvaA: false };
}

