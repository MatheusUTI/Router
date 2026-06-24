import { Ctrc, CidadeRota, DeliveryOccurrence, CurvaAClient, Vehicle, DriverScore, Helper, RoteirizacaoItem, RoutePlanningItem, RoutingEligibility, CriticClient, CidadeAtendidaSSW } from '../../../types';
import { initialDeliveryOccurrences } from '../../../data';
import { getSlaStatus } from '../helpers/getSlaStatus';
import { getPesoStatus } from '../helpers/getPesoStatus';
import { getOcorrenciaStatus } from '../helpers/getOcorrenciaStatus';
import { isClienteCurvaA } from '../helpers/isClienteCurvaA';
import { isClienteCritico } from '../helpers/isClienteCritico';
import { normalizeOccurrenceCodeForLookup } from '../helpers/normalizeOccurrenceCodeForLookup';

export interface RoutingEligibilityInfo {
  routingEligibility: RoutingEligibility;
  routingBlockReason?: string;
  routingEligibilitySource?: string;
}

export function resolveRoutingEligibility(
  ctrc: Ctrc,
  occurrence: DeliveryOccurrence | undefined
): RoutingEligibilityInfo {
  const lookupCodes = normalizeOccurrenceCodeForLookup(ctrc.ocorrencia);
  const isFinalizerCode = lookupCodes.some(c => ['1', '01', '81', '82', '3', '03'].includes(c));
  
  if (isFinalizerCode) {
    const isCode3 = lookupCodes.some(c => c === '3' || c === '03');
    return {
      routingEligibility: 'NAO_ROTEIRIZAVEL',
      routingBlockReason: isCode3 
        ? 'Desvio severo ou cancelamento (Código 03)' 
        : `Comprovante retido ou entrega definitiva (Código ${ctrc.ocorrencia || 'comprovante'})`,
      routingEligibilitySource: isCode3 ? 'REGRA_CODIGO_3' : 'REGRA_CODIGO_FINALIZADOR'
    };
  }

  const statusStr = (ctrc.status || '').toUpperCase().trim();
  if (statusStr === 'TRANSFERÊNCIA' || statusStr === 'TRANSFERENCIA') {
    return {
      routingEligibility: 'NAO_ROTEIRIZAVEL',
      routingBlockReason: 'Status de transferência ativo',
      routingEligibilitySource: 'STATUS_INCONSISTENCIA_TRANSFERENCIA'
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
    routePlanningItems: RoutePlanningItem[] = [],
    planningDate?: string,
    criticClients: CriticClient[] = [],
    sswCidades: CidadeAtendidaSSW[] = []
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

        return 'ROTA NÃO MAPEADA';
      };

      const setorBruto = String(ctrc.setor || '').trim();
      const is99 = setorBruto === '99' || 
                   setorBruto.toUpperCase().replace(/\s/g, '').includes('ROTA99') || 
                   setorBruto.toUpperCase().trim() === 'ROTA 99';

      // Determine cityInput using the priority of origins
      let cityInput = '';
      if (ctrc.cidade_ent && ctrc.cidade_ent.trim() !== '') {
        cityInput = ctrc.cidade_ent.trim();
      } else if (ctrc.cidade && ctrc.cidade.trim() !== '') {
        cityInput = ctrc.cidade.trim();
      } else {
        cityInput = 'CIDADE NÃO INFORMADA';
      }

      // Safeguard against invalid cities containing route or numeric or status noise
      const cityInputUpper = cityInput.toUpperCase().trim();
      let validCity = cityInputUpper;
      if (
        validCity.includes('ROTA') || 
        validCity.includes('SETOR') || 
        /^\d+$/.test(validCity) || 
        validCity === 'SEM ROTA' || 
        validCity === 'SEM SETOR'
      ) {
        validCity = 'CIDADE NÃO INFORMADA';
      }

      // Remove common state suffixes/prefixes (e.g. "VARGINHA - MG" -> "VARGINHA" or "ALFENAS/MG" -> "ALFENAS")
      const cleanedCityInput = validCity.split(/[-/]/)[0].trim();

      let normCidade = validCity;
      let normSetor = '';
      let normRota = '';
      let normPrazo: number | undefined = undefined;
      let normPriority: string | undefined = 'NORMAL';

      // Determine decision logic variables
      let matchedSource: 'CTRC' | 'EXCECAO' | 'SSW' | 'NENHUM' = 'NENHUM';
      let pracaHubVal: string | undefined = undefined;
      let pracaDestinoVal: string | undefined = undefined;
      let ufDestinoVal: string | undefined = undefined;
      let frequenciaVal: string | undefined = undefined;

      const hasValidSetorBruto = setorBruto && 
        setorBruto.toUpperCase().trim() !== 'SEM SETOR' && 
        setorBruto.toUpperCase().trim() !== 'SEM ROTA' && 
        setorBruto.toUpperCase().trim() !== 'PADRÃO' && 
        setorBruto.trim() !== '' && 
        setorBruto !== '0' && 
        setorBruto !== '00';

      // Find Exception Match (Step 3)
      const matchException = cidadesRotas.find((cr) => {
        const routeCity = cr.cidade.toUpperCase().trim();
        const cleanRouteCity = routeCity.split(/[-/]/)[0].trim();
        if (routeCity === validCity || cleanRouteCity === cleanedCityInput) return true;
        if (cr.alias) {
          const aliases = cr.alias.toUpperCase().split(',').map((s) => s.trim());
          const cleanedAliases = aliases.map(a => a.split(/[-/]/)[0].trim());
          if (aliases.includes(validCity) || 
              aliases.includes(cleanedCityInput) || 
              cleanedAliases.includes(cleanedCityInput)) {
            return true;
          }
        }
        return false;
      });

      // Find SSW Match (Step 4)
      const matchSsw = sswCidades.find((sc) => {
        if (!sc.cidadeDestino) return false;
        const destCity = sc.cidadeDestino.toUpperCase().trim();
        const cleanDestCity = destCity.split(/[-/]/)[0].trim();
        return destCity === validCity || cleanDestCity === cleanedCityInput;
      });

      if (matchSsw) {
        pracaHubVal = matchSsw.pracaHub || matchSsw.pracaDestinoNormalizada || undefined;
        pracaDestinoVal = matchSsw.pracaDestinoOriginal || matchSsw.pracaDestino || undefined;
        ufDestinoVal = matchSsw.ufDestino;
        frequenciaVal = matchSsw.frequencia;
      }

      // Execute Hierarchical Check
      if (is99) {
        normCidade = validCity;
        normRota = 'ROTA 99';
        normSetor = 'ROTA 99';
        matchedSource = 'CTRC';
        normPrazo = matchException?.prazo_padrao || matchSsw?.prazo || undefined;
        normPriority = matchException?.prioridade_operacional || 'NORMAL';
      } else if (hasValidSetorBruto) {
        // Step 2: Setor informado no CTRC importado
        normCidade = validCity;
        normRota = normalizeRouteLabel(setorBruto);
        normSetor = setorBruto.toUpperCase().trim();
        matchedSource = 'CTRC';
        normPrazo = matchException?.prazo_padrao || matchSsw?.prazo || undefined;
        normPriority = matchException?.prioridade_operacional || 'NORMAL';
      } else if (matchException) {
        // Step 3: Exceção operacional cadastrada (Ajustes Operacionais / antiga Cidades e Rotas)
        normCidade = matchException.cidade.toUpperCase().trim();
        normRota = matchException.rota.toUpperCase().trim();
        normSetor = normalizeRouteLabel(matchException.setor.toUpperCase().trim());
        normPrazo = matchException.prazo_padrao;
        normPriority = matchException.prioridade_operacional;
        matchedSource = 'EXCECAO';
      } else if (matchSsw) {
        // Step 4: Cobertura encontrada no BD SSW (Cidades Atendidas SSW)
        // A praça do SSW serve como fonte corporativa de cobertura, prazo, frequência etc.
        // Contudo, pracaHub e pracaDestino NÃO devem preencher indevidamente a rota operacional 
        // ou o setor operacional, os quais devem ser mapeados via Exceção Operacional ou manual.
        normCidade = matchSsw.cidadeDestino.toUpperCase().trim();
        normPrazo = matchSsw.prazo;
        normPriority = 'NORMAL';
        matchedSource = 'SSW';
        
        normRota = 'ROTA NÃO MAPEADA';
        normSetor = 'ROTA NÃO MAPEADA';
      } else {
        // Step 5: Sem definição
        normCidade = validCity;
        normRota = 'ROTA NÃO MAPEADA';
        normSetor = 'ROTA NÃO MAPEADA';
        normPrazo = undefined;
        normPriority = 'NORMAL';
        matchedSource = 'NENHUM';
      }

      // 2. SLA calculations
      const sla = getSlaStatus(ctrc.prev_ent, planningDate);

      // 3. Occurrence code & description
      const occurrenceCode = ctrc.ocorrencia ? ctrc.ocorrencia.trim() : undefined;
      let occurrenceDescription = 'Ocorrência não mapeada';
      let occurrenceCriticality: 'CRÍTICA' | 'MÉDIA' | 'SUAVE' | 'NENHUMA' = 'NENHUMA';
      let foundOcc: DeliveryOccurrence | undefined = undefined;

      if (occurrenceCode) {
        const lookupCandidates = normalizeOccurrenceCodeForLookup(occurrenceCode);
        for (const candidate of lookupCandidates) {
          const match = occMap.get(candidate.toUpperCase());
          if (match) {
            foundOcc = match;
            break;
          }
        }
        if (foundOcc) {
          occurrenceDescription = foundOcc.descricao;
        }

        // Determine criticality using lookup candidates
        const lookupUpper = lookupCandidates.map(c => c.toUpperCase());
        const criticalBases = ['01', '1', '12', '03', '3', '04', '4', '05', '5', '14', 'RECUSA', 'AVARIA'];
        const isCritical = lookupUpper.some(c => criticalBases.includes(c));

        const mediumBases = ['REENTREGA', 'DEVOLUÇÃO', 'EXTRAVIADO', 'OCORRÊNCIA'];
        const isMedium = lookupUpper.some(c => mediumBases.includes(c));

        if (isCritical) {
          occurrenceCriticality = 'CRÍTICA';
        } else if (isMedium) {
          occurrenceCriticality = 'MÉDIA';
        } else {
          occurrenceCriticality = 'SUAVE';
        }
      }

      const eligibilityInfo = resolveRoutingEligibility(ctrc, foundOcc);

      let occurrenceSector = 'Indefinido';
      if (foundOcc) {
        const rawSector = foundOcc.setor_ocorr.trim();
        if (rawSector === 'Disponível Cobranca') {
          occurrenceSector = 'Disponível Cobrança';
        } else if (rawSector === 'Disponível Transferencia') {
          occurrenceSector = 'Disponível Transferência';
        } else if (rawSector === 'Disponível Pendência' || rawSector === 'Disponível Pendencia') {
          occurrenceSector = 'Disponível Pendência';
        } else if (rawSector === 'Disponível') {
          occurrenceSector = 'Disponível';
        } else if (rawSector === 'Agendamento') {
          occurrenceSector = 'Agendamento';
        } else if (rawSector === 'Em Rota') {
          occurrenceSector = 'Em Rota';
        } else if (rawSector === 'Retidos') {
          occurrenceSector = 'Retidos';
        } else if (rawSector === 'Solução' || rawSector === 'Solucao') {
          occurrenceSector = 'Solução';
        } else if (rawSector === 'Transferência' || rawSector === 'Transferencia') {
          occurrenceSector = 'Transferência';
        } else if (rawSector === 'Cobrança' || rawSector === 'Cobranca') {
          occurrenceSector = 'Cobrança';
        } else if (rawSector === 'Frete') {
          occurrenceSector = 'Frete';
        } else {
          occurrenceSector = rawSector;
        }
      } else {
        const codeUpper = occurrenceCode ? occurrenceCode.toUpperCase() : '';
        if (!codeUpper || codeUpper === '0' || codeUpper === '00' || codeUpper === 'PENDENTE') {
          occurrenceSector = 'Disponível';
        } else {
          occurrenceSector = 'Indefinido';
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

      // 7.5. Critic Client Detection
      const criticInfo = isClienteCritico(ctrc, criticClients);
      const isCritic = criticInfo.isCriticClient;

      // 8. FOB Detection
      const isFob = !!(ctrc.pagador && ctrc.pagador.toUpperCase().trim() === ctrc.destinatario.toUpperCase().trim());

      // 9. Generate styled visual flags & CSS groups
      let statusClass = ocoStatus.badgeClass;
      let rowClass = 'border-l-[3px] border-l-transparent';
      
      if (isCritic) {
        rowClass = 'border-l-[4px] border-l-violet-500 bg-violet-950/[0.015] shadow-[0_0_8px_rgba(139,92,246,0.04)]';
      } else if (isCurvaA) {
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
        isCriticClient: isCritic,
        criticClientName: criticInfo.criticClientName,
        criticClientPrefix: criticInfo.criticClientPrefix,
        criticClientScore: criticInfo.criticClientScore,
        criticClientReason: criticInfo.criticClientReason,
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
        occurrenceSector,
        pracaHub: pracaHubVal || ctrc.pracaHub,
        pracaDestino: pracaDestinoVal || ctrc.pracaDestino,
        ufDestino: ufDestinoVal,
        frequencia: frequenciaVal,
        matchedSource,
      };
    });
  }
};
