/**
 * Helper to translate occurrence codes, locations and status to delivery availability badges
 */
export interface OcorrenciaStatus {
  status: 'disponivel' | 'em rota' | 'retido' | 'transferência' | 'aguardando' | 'problema';
  label: string;
  badgeClass: string;
}

export function getOcorrenciaStatus(
  codigo: string | undefined, 
  statusArg?: string, 
  localizacao?: string
): OcorrenciaStatus {
  const normStatus = (statusArg || '').toLowerCase().trim();
  const normLoc = (localizacao || '').toLowerCase().trim();

  if (normStatus === 'em rota') {
    return {
      status: 'em rota',
      label: 'EM ROTA',
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9.5px]'
    };
  }

  if (normStatus === 'transferência') {
    return {
      status: 'transferência',
      label: 'TRANSFERÊNCIA',
      badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9.5px]'
    };
  }

  if (normStatus === 'agendamento') {
    return {
      status: 'aguardando',
      label: 'AGENDANDO',
      badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9.5px]'
    };
  }

  if (codigo && codigo.trim() !== '') {
    const code = codigo.trim().toUpperCase();
    
    // Specific restricted codes representing retention or refusal
    if (['01', '12', '03', '04', '05', '14', 'RECUSA', 'AVARIA'].includes(code)) {
      return {
        status: 'retido',
        label: 'RETIDO',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20 text-[9.5px]'
      };
    }

    // Problematic occurrences
    if (['REENTREGA', 'DEVOLUÇÃO', 'EXTRAVIADO', 'OCORRÊNCIA'].includes(code)) {
      return {
        status: 'problema',
        label: 'PROBLEMA',
        badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[9.5px]'
      };
    }

    // Default waiting or generic occurrences
    return {
      status: 'aguardando',
      label: 'AGUARDANDO',
      badgeClass: 'bg-amber-550/10 text-amber-400 border border-amber-500/20 text-[9.5px]'
    };
  }

  // Location-based wait
  if (normLoc === '' || normLoc.includes('sem box') || normLoc.includes('não definido') || normLoc.includes('pendente')) {
    return {
      status: 'aguardando',
      label: 'SEM BOX',
      badgeClass: 'bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[9.5px]'
    };
  }

  // Purely available
  return {
    status: 'disponivel',
    label: 'DISPONÍVEL',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9.5px]'
  };
}
