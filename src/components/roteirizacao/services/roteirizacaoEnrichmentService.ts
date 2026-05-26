import { Ctrc, CidadeRota, DeliveryOccurrence, CurvaAClient, Vehicle, DriverScore, Helper, RoteirizacaoItem } from '../../../types';
import { getSlaStatus } from '../helpers/getSlaStatus';
import { getPesoStatus } from '../helpers/getPesoStatus';
import { getOcorrenciaStatus } from '../helpers/getOcorrenciaStatus';
import { isClienteCurvaA } from '../helpers/isClienteCurvaA';

export const getFormattedLocation = (loc: string | undefined, statusStr?: string): string => {
  if (!loc || loc.trim() === '') {
    return statusStr && statusStr.toLowerCase() === 'em rota' ? '🚛 Em Rota' : '📍 SEM BOX';
  }
  let clean = loc.trim();
  // Transform technical jargon into clean operational text
  if (clean.toUpperCase().includes('APONTADO PARA ENTREGA')) {
    clean = clean.replace(/APONTADO PARA ENTREGA/gi, '→ Entrega');
  }
  if (clean.toUpperCase().includes('APONTADO PARA')) {
    clean = clean.replace(/APONTADO PARA/gi, '→');
  }
  if (clean.toUpperCase().includes('RCS ') || clean.toUpperCase().includes('FILIAL ')) {
    clean = clean.replace(/RCS /gi, '').replace(/FILIAL /gi, '');
  }
  return `📍 ${clean}`;
};

export const RoteirizacaoEnrichmentService = {
  enrichCargas(
    ctrcs: Ctrc[],
    cidadesRotas: CidadeRota[] = [],
    occurrences: DeliveryOccurrence[] = [],
    curvaAClients: CurvaAClient[] = [],
    vehicles: Vehicle[] = [],
    drivers: DriverScore[] = [],
    helpers: Helper[] = []
  ): RoteirizacaoItem[] {
    // Build maps for efficient lookup
    const occMap = new Map<string, DeliveryOccurrence>();
    for (const o of occurrences) {
      if (o.codigo) {
        occMap.set(o.codigo.trim().toUpperCase(), o);
      }
    }

    return ctrcs.map((ctrc) => {
      // 1. Normalize city, sector & route
      const cityInput = (ctrc.cidade_ent || ctrc.cidade || '').toUpperCase().trim();
      let normCidade = cityInput;
      let normSetor = (ctrc.setor || 'PADRÃO').toUpperCase().trim();
      let normRota = 'ROT-PADRÃO';
      let normPrazo: number | undefined = undefined;
      let normPriority: string | undefined = 'NORMAL';

      const matchRoute = cidadesRotas.find((cr) => {
        const routeCity = cr.cidade.toUpperCase().trim();
        if (routeCity === cityInput) return true;
        if (cr.alias) {
          const aliases = cr.alias.toUpperCase().split(',').map((s) => s.trim());
          if (aliases.includes(cityInput)) return true;
        }
        return false;
      });

      if (matchRoute) {
        normCidade = matchRoute.cidade.toUpperCase().trim();
        normSetor = matchRoute.setor.toUpperCase().trim();
        normRota = matchRoute.rota.toUpperCase().trim();
        normPrazo = matchRoute.prazo_padrao;
        normPriority = matchRoute.prioridade_operacional;
      } else {
        normCidade = 'ROTA NÃO MAPEADA';
        normSetor = 'SEM SETOR';
        normRota = 'SEM ROTA';
      }

      // 2. SLA calculations
      const sla = getSlaStatus(ctrc.prev_ent);

      // 3. Occurrence code & description
      const occurrenceCode = ctrc.ocorrencia ? ctrc.ocorrencia.trim() : undefined;
      let occurrenceDescription = 'Ocorrência não mapeada';
      let occurrenceCriticality: 'CRÍTICA' | 'MÉDIA' | 'SUAVE' | 'NENHUMA' = 'NENHUMA';

      if (occurrenceCode) {
        const codeUpper = occurrenceCode.toUpperCase();
        const foundOcc = occMap.get(codeUpper);
        if (foundOcc) {
          occurrenceDescription = foundOcc.descricao;
        }

        // Determine criticality
        if (['01', '12', '03', '04', '05', '14', 'RECUSA', 'AVARIA'].includes(codeUpper)) {
          occurrenceCriticality = 'CRÍTICA';
        } else if (['REENTREGA', 'DEVOLUÇÃO', 'EXTRAVIADO', 'OCORRÊNCIA'].includes(codeUpper)) {
          occurrenceCriticality = 'MÉDIA';
        } else {
          occurrenceCriticality = 'SUAVE';
        }
      }

      // 4. Availability Status
      const ocoStatus = getOcorrenciaStatus(ctrc.ocorrencia, ctrc.status, ctrc.localizacao);
      const availabilityStatus = ocoStatus.status;
      const availabilityLabel = ocoStatus.label;

      // 5. Weight Classification
      const peso = getPesoStatus(ctrc.peso_r || ctrc.weight || 0);

      // 6. Location Label
      const locationLabel = getFormattedLocation(ctrc.localizacao, ctrc.status);

      // 7. Curve A Detection
      const curvaInfo = isClienteCurvaA(ctrc, curvaAClients);
      const isCurvaA = curvaInfo.isCurvaA;
      const curvaAClass = curvaInfo.classification;

      // 8. FOB Detection
      const isFob = !!(ctrc.pagador && ctrc.pagador.toUpperCase().trim() === ctrc.destinatario.toUpperCase().trim());

      // 9. Generate styled visual flags & CSS groups
      let statusClass = ocoStatus.badgeClass;
      let rowClass = 'border-l-[3px] border-l-transparent';
      
      if (isCurvaA) {
        rowClass = 'border-l-[3px] border-l-red-500/65 shadow-[0_0_6px_rgba(239,68,68,0.03)] bg-red-950/[0.01]';
      } else if (isFob) {
        rowClass = 'border-l-[3px] border-l-amber-500/50 bg-amber-950/[0.01]';
      }

      return {
        ...ctrc,
        normCidade,
        normSetor,
        normRota,
        normPrazo,
        normPriority,
        slaStatus: {
          label: sla.label,
          bgClass: sla.bgClass,
          textClass: sla.textClass,
          daysDiff: sla.daysDiff,
          isToday: sla.isToday,
          isDelayed: sla.isDelayed,
        },
        pesoStatus: {
          textClass: peso.textClass,
          badgeClass: peso.badgeClass,
          category: peso.category,
          label: peso.label,
        },
        occurrenceCode,
        occurrenceDescription,
        occurrenceCriticality,
        availabilityStatus,
        availabilityLabel,
        locationLabel,
        isCurvaA,
        curvaAClass,
        isFob,
        visualFlags: {
          isCurvaA,
          isFob,
          isDelayed: sla.isDelayed,
          statusClass,
          rowClass,
        },
      };
    });
  }
};
