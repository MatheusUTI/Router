import { Ctrc, CidadeRota, DeliveryOccurrence, CurvaAClient, Vehicle, DriverScore, Helper, RoteirizacaoItem, RoutePlanningItem, RoutingEligibility } from '../../../types';
import { initialDeliveryOccurrences } from '../../../data';
import { getSlaStatus } from '../helpers/getSlaStatus';
import { getPesoStatus } from '../helpers/getPesoStatus';
import { getOcorrenciaStatus } from '../helpers/getOcorrenciaStatus';
import { isClienteCurvaA } from '../helpers/isClienteCurvaA';

export interface RoutingEligibilityInfo {
  routingEligibility: RoutingEligibility;
  routingBlockReason?: string;
  routingEligibilitySource?: string;
}

export function resolveRoutingEligibility(
  ctrc: Ctrc,
  occurrence: DeliveryOccurrence | undefined
): RoutingEligibilityInfo {
  const code = (ctrc.ocorrencia || '').trim().toUpperCase();
  
  // Se código 3:
  if (code === '3' || code === '03' || code === '003') {
    return {
      routingEligibility: 'NAO_ROTEIRIZAVEL',
      routingBlockReason: 'Entrega realizada com comprovante retido',
      routingEligibilitySource: 'REGRA_CODIGO_3'
    };
  }

  if (occurrence) {
    const tratativa = (occurrence.tratativa_solucao || '').toUpperCase().trim();
    const setorOcorr = (occurrence.setor_ocorr || '').toUpperCase().trim();

    // Se Tratativa de Solução = Finalizadora:
    if (tratativa === 'FINALIZADORA') {
      return {
        routingEligibility: 'NAO_ROTEIRIZAVEL',
        routingBlockReason: `Tratativa de Solução Finalizadora [${occurrence.codigo}]: ${occurrence.descricao}`,
        routingEligibilitySource: 'TRATATIVA_FINALIZADORA'
      };
    }

    // Se Setor Ocorrencia = Em Rota:
    if (setorOcorr === 'EM ROTA') {
      return {
        routingEligibility: 'NAO_ROTEIRIZAVEL',
        routingBlockReason: `Setor de oco Em Rota [${occurrence.codigo}]: ${occurrence.descricao}`,
        routingEligibilitySource: 'SETOR_EM_ROTA'
      };
    }

    // Se Setor Ocorrencia = Disponível:
    if (setorOcorr === 'DISPONÍVEL' || setorOcorr === 'DISPONIVEL') {
      return {
        routingEligibility: 'ROTEIRIZAVEL',
        routingBlockReason: undefined,
        routingEligibilitySource: 'SETOR_DISPONIVEL'
      };
    }
  }

  // Se ocorrência não mapeada:
  if (ctrc.ocorrencia && ctrc.ocorrencia.trim() !== '' && !occurrence) {
    return {
      routingEligibility: 'REVISAR',
      routingBlockReason: `Ocorrência [${ctrc.ocorrencia}] não cadastrada`,
      routingEligibilitySource: 'OCORRENCIA_NAO_MAPEADA'
    };
  }

  // Se inconsistência
  const statusStr = (ctrc.status || '').toUpperCase().trim();
  if (statusStr === 'ENTREGUE') {
    return {
      routingEligibility: 'NAO_ROTEIRIZAVEL',
      routingBlockReason: 'Status de entrega finalizado',
      routingEligibilitySource: 'STATUS_INCONSISTENCIA_ENTREGUE'
    };
  }
  if (statusStr === 'EM ROTA' || statusStr === 'ROT') {
    return {
      routingEligibility: 'NAO_ROTEIRIZAVEL',
      routingBlockReason: 'Trânsito físico ativo (Em Rota)',
      routingEligibilitySource: 'STATUS_INCONSISTENCIA_EM_ROTA'
    };
  }

  return {
    routingEligibility: 'ROTEIRIZAVEL',
    routingBlockReason: undefined,
    routingEligibilitySource: 'PADRAO'
  };
}

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
    helpers: Helper[] = [],
    routePlanningItems: RoutePlanningItem[] = []
  ): RoteirizacaoItem[] {
    // Build maps for efficient lookup
    const occMap = new Map<string, DeliveryOccurrence>();
    // Preload system defaults so they never show as "unmapped"
    for (const o of initialDeliveryOccurrences) {
      if (o.codigo) {
        occMap.set(o.codigo.trim().toUpperCase(), o);
      }
    }
    // Overlay database records
    for (const o of occurrences) {
      if (o.codigo) {
        occMap.set(o.codigo.trim().toUpperCase(), o);
      }
    }

    return ctrcs.map((ctrc) => {
      // Helper function for normalization of legacy route label
      const normalizeRouteLabel = (setorStr: string): string => {
        const clean = setorStr.toUpperCase().trim();
        if (!clean || clean === 'SEM SETOR' || clean === 'SEM ROTA' || clean === 'PADRÃO') {
          return 'ROTA NÃO MAPEADA';
        }
        if (clean === '99') {
          return 'ROTA 99';
        }

        const rotaWordMatch = clean.match(/ROTA\s*(\d+)/i);
        if (rotaWordMatch) {
          const num = parseInt(rotaWordMatch[1], 10);
          return `ROTA ${num < 10 ? '0' + num : num}`;
        }

        const onlyNumMatch = clean.match(/(\d+)/);
        if (onlyNumMatch) {
          const num = parseInt(onlyNumMatch[1], 10);
          return `ROTA ${num < 10 ? '0' + num : num}`;
        }

        return clean;
      };

      const setorBruto = String(ctrc.setor || '').trim();
      const is99 = setorBruto === '99' || 
                   setorBruto.toUpperCase().replace(/\s/g, '').includes('ROTA99') || 
                   setorBruto.toUpperCase().trim() === 'ROTA 99';

      const cityInput = (ctrc.cidade_ent || ctrc.cidade || '').toUpperCase().trim();
      // Remove common state suffixes/prefixes (e.g. "VARGINHA - MG" -> "VARGINHA" or "ALFENAS/MG" -> "ALFENAS")
      const cleanedCityInput = cityInput.split(/[-/]/)[0].trim();

      let normCidade = cityInput;
      let normSetor = '';
      let normRota = '';
      let normPrazo: number | undefined = undefined;
      let normPriority: string | undefined = 'NORMAL';

      if (is99) {
        normCidade = cityInput || 'CIDADE NÃO INFORMADA';
        normRota = 'ROTA 99';
        normSetor = 'ROTA 99';
      } else {
        const matchRoute = cidadesRotas.find((cr) => {
          const routeCity = cr.cidade.toUpperCase().trim();
          const cleanRouteCity = routeCity.split(/[-/]/)[0].trim();
          if (routeCity === cityInput || cleanRouteCity === cleanedCityInput) return true;
          if (cr.alias) {
            const aliases = cr.alias.toUpperCase().split(',').map((s) => s.trim());
            const cleanedAliases = aliases.map(a => a.split(/[-/]/)[0].trim());
            if (aliases.includes(cityInput) || 
                aliases.includes(cleanedCityInput) || 
                cleanedAliases.includes(cleanedCityInput)) {
              return true;
            }
          }
          return false;
        });

        if (matchRoute) {
          normCidade = matchRoute.cidade.toUpperCase().trim();
          normRota = matchRoute.rota.toUpperCase().trim();
          normSetor = normalizeRouteLabel(matchRoute.setor.toUpperCase().trim());
          normPrazo = matchRoute.prazo_padrao;
          normPriority = matchRoute.prioridade_operacional;
        } else {
          normCidade = cityInput || 'CIDADE NÃO INFORMADA';
          normRota = normalizeRouteLabel(setorBruto);
          normSetor = normalizeRouteLabel(setorBruto);
        }
      }

      // 2. SLA calculations
      const sla = getSlaStatus(ctrc.prev_ent);

      // 3. Occurrence code & description
      const occurrenceCode = ctrc.ocorrencia ? ctrc.ocorrencia.trim() : undefined;
      let occurrenceDescription = 'Ocorrência não mapeada';
      let occurrenceCriticality: 'CRÍTICA' | 'MÉDIA' | 'SUAVE' | 'NENHUMA' = 'NENHUMA';
      let foundOcc: DeliveryOccurrence | undefined = undefined;

      if (occurrenceCode) {
        const codeUpper = occurrenceCode.toUpperCase();
        foundOcc = occMap.get(codeUpper);
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

      const eligibilityInfo = resolveRoutingEligibility(ctrc, foundOcc);

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

      // 10. Planning override lookup
      const planItem = routePlanningItems.find((p) => p.ctrcId === ctrc.id);
      const suggestedRoute = planItem?.suggestedRoute || normRota;
      const operationalRoute = planItem?.operationalRoute;
      const effectiveRoute = operationalRoute || suggestedRoute;
      const isManualRoute = !!(operationalRoute && operationalRoute !== suggestedRoute);
      const manualPriority = planItem?.manualPriority;
      const planningStatus = planItem?.planningStatus || 'A_PLANEJAR';
      const operationalNote = planItem?.operationalNote;

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
        suggestedRoute,
        operationalRoute,
        effectiveRoute,
        manualPriority,
        planningStatus,
        operationalNote,
        isManualRoute,
        routingEligibility: eligibilityInfo.routingEligibility,
        routingBlockReason: eligibilityInfo.routingBlockReason,
        routingEligibilitySource: eligibilityInfo.routingEligibilitySource,
      };
    });
  }
};
