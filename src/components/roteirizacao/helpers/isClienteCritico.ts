import { CriticClient, Ctrc } from '../../../types';

function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD') // splits accents into combination characters
    .replace(/[\u0300-\u036f]/g, '') // removes accent characters
    .replace(/[.\-\/]/g, ' ') // replaces common punctuation with space
    .replace(/\s+/g, ' ') // removes redundant spaces
    .trim();
}

export interface CriticInfo {
  isCriticClient: boolean;
  criticClientName?: string;
  criticClientPrefix?: string;
  criticClientScore?: number;
  criticClientReason?: string;
}

export function isClienteCritico(ctrc: Ctrc, criticClients: CriticClient[] = []): CriticInfo {
  if (!criticClients || criticClients.length === 0) {
    return { isCriticClient: false };
  }

  const remStr = normalizeName(ctrc.remetente || '');
  const destStr = normalizeName(ctrc.destinatario || '');
  const pagStr = normalizeName(ctrc.pagador || '');

  for (const client of criticClients) {
    const clientNameNorm = normalizeName(client.name);
    if (!clientNameNorm || clientNameNorm.length < 3) continue;

    const isRemetenteMatch = remStr && (remStr === clientNameNorm || remStr.includes(clientNameNorm) || (remStr.length >= 4 && clientNameNorm.includes(remStr)));
    const isDestinatarioMatch = destStr && (destStr === clientNameNorm || destStr.includes(clientNameNorm) || (destStr.length >= 4 && clientNameNorm.includes(destStr)));
    const isPagadorMatch = pagStr && (pagStr === clientNameNorm || pagStr.includes(clientNameNorm) || (pagStr.length >= 4 && clientNameNorm.includes(pagStr)));

    if (isRemetenteMatch || isDestinatarioMatch || isPagadorMatch) {
      const reason = client.recurrentIssues?.[0]?.title || 'Atendimento com monitoramento especial pela diretoria';
      return {
        isCriticClient: true,
        criticClientName: client.name,
        criticClientPrefix: client.prefix,
        criticClientScore: client.score,
        criticClientReason: reason,
      };
    }
  }

  return { isCriticClient: false };
}
