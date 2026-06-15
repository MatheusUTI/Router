import { CurvaAClient, Ctrc } from '../../../types';

export interface CurvaAInfo {
  isCurvaA: boolean;
  classification?: string; // e.g., 'A' | 'B' | 'C'
}

export function isClienteCurvaA(ctrc: Ctrc, curvaAClients: CurvaAClient[] = []): CurvaAInfo {
  if (!ctrc.remetente && !ctrc.cod) {
    return { isCurvaA: false };
  }

  const senderUpper = (ctrc.remetente || '').toUpperCase().trim();
  const found = curvaAClients.find((cl) => {
    const isNameMatch = cl.cliente_remetente.toUpperCase().trim() === senderUpper;
    const isCnpjMatch = !!ctrc.cod && cl.cnpj_remetente.replace(/\D/g, '').includes(ctrc.cod.replace(/\D/g, ''));
    return isNameMatch || isCnpjMatch;
  });

  if (found) {
    return {
      isCurvaA: found.curva_a === 'A' || found.curva_a === 'B', // default active vip curva A/B
      classification: found.curva_a
    };
  }

  return { isCurvaA: false };
}
