import { RoteirizacaoItem } from '../../../types';

export interface ContractValidationResult {
  success: boolean;
  warnings: string[];
  stats: {
    total: number;
    validCities: number;
    validRoutes: number;
    validDests: number;
    validSenders: number;
    validForecasts: number;
  };
}

/**
 * Validates a batch of RoteirizacaoItem objects against the established Field Contract.
 * Specifically checks for correct field mapping, non-contamination, and forecast safe-parsing.
 * Acts as an active runtime test harness to guarantee integrity.
 */
export function validateFieldContract(items: RoteirizacaoItem[], verbose: boolean = false): ContractValidationResult {
  const warnings: string[] = [];
  const stats = {
    total: items.length,
    validCities: 0,
    validRoutes: 0,
    validDests: 0,
    validSenders: 0,
    validForecasts: 0,
  };

  if (items.length === 0) {
    return { success: true, warnings, stats };
  }

  // To count deviations per field/scenario
  const deviationCounts: Record<string, number> = {
    id: 0,
    cidade: 0,
    destinatario: 0,
    prev_ent: 0,
    status: 0,
    ocorrencia: 0,
    weight: 0,
    volume: 0,
    effectiveRoute: 0,
    bairro: 0,
    localizacao: 0,
    obs: 0,
    frete: 0,
    valor: 0,
    pagador: 0,
    cod: 0,
    descricao_ocorr: 0,
  };

  let criticalDeviationsCount = 0;
  let optionalDeviationsCount = 0;

  items.forEach((item, index) => {
    const prefix = `[CTRC: ${item.id || '#' + index}]`;

    // --- CRITICAL FIELDS ---

    // 1. id
    const isIdValid = typeof item.id === 'string' && item.id.trim().length > 0;
    if (!isIdValid) {
      deviationCounts.id++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de ID quebrado: campo id está ausente ou vazio.`);
    }

    // 2. cidade (using normCidade, cidade, cidade_ent)
    const resolvedCity = item.normCidade || item.cidade || item.cidade_ent;
    const isCityValid = typeof resolvedCity === 'string' && resolvedCity.trim().length > 0;
    if (!isCityValid) {
      deviationCounts.cidade++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de CIDADE quebrado: campo normCidade/cidade/cidade_ent está ausente ou vazio.`);
    } else {
      stats.validCities++;
      const cityUpper = resolvedCity.toUpperCase();
      // Check for contaminated keywords in city field
      if (
        cityUpper.includes('ROTA') ||
        cityUpper.includes('SETOR') ||
        /^\d+$/.test(cityUpper) ||
        cityUpper === 'SEM ROTA' ||
        cityUpper === 'SEM SETOR'
      ) {
        deviationCounts.cidade++;
        criticalDeviationsCount++;
        warnings.push(`${prefix} Contrato de CIDADE suspeito: valor "${resolvedCity}" contém poluentes (Rota/Setor/Inteiro).`);
      }
    }

    // 3. destinatario
    const resolvedDest = item.destinatario;
    const isDestValid = typeof resolvedDest === 'string' && resolvedDest.trim().length > 0;
    if (!isDestValid) {
      deviationCounts.destinatario++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de DESTINATÁRIO ausente.`);
    } else {
      stats.validDests++;
      // Check if recipient is contaminated with city name
      if (resolvedCity && resolvedDest.toUpperCase().trim() === resolvedCity.toUpperCase().trim()) {
        deviationCounts.destinatario++;
        criticalDeviationsCount++;
        if (resolvedCity.trim().length > 3 && resolvedDest.trim().length > 3) {
          warnings.push(`${prefix} [CRÍTICO] Contaminação crítica detectada: Destinatário possui exatamente o mesmo valor da Cidade ("${resolvedCity}").`);
        } else {
          warnings.push(`${prefix} Contaminação cruzada: Destinatário possui exatamente o mesmo valor da Cidade ("${resolvedCity}").`);
        }
      }
    }

    // 4. prev_ent
    const rawPrev = item.prev_ent;
    stats.validForecasts++;
    if (!rawPrev) {
      deviationCounts.prev_ent++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de PREVISÃO (prev_ent) ausente.`);
    } else {
      const cleanPrev = rawPrev.toUpperCase().trim();
      const isSPFormat =
        cleanPrev === 'SEM PREVISÃO' ||
        cleanPrev === 'SEM PREVISAO' ||
        cleanPrev === 'S/P' ||
        cleanPrev === 'SP' ||
        cleanPrev === 'S/PRAZO' ||
        cleanPrev === 'SEM PREV';
      
      if (isSPFormat && item.slaStatus?.isDelayed) {
        deviationCounts.prev_ent++;
        criticalDeviationsCount++;
        warnings.push(`${prefix} Contrato de PREVISÃO quebrado: Item marcado como atrasado possuindo status sem previsão.`);
      }
    }

    // 5. status
    const isStatusValid = typeof item.status === 'string' && item.status.trim().length > 0;
    if (!isStatusValid) {
      deviationCounts.status++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de STATUS ausente.`);
    }

    // 6. ocorrencia
    const isOcorrenciaValid = typeof item.ocorrencia === 'string' && item.ocorrencia.trim().length > 0;
    if (!isOcorrenciaValid) {
      deviationCounts.ocorrencia++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de OCORRÊNCIA ausente.`);
    }

    // 7. weight
    const isWeightValid = typeof item.weight === 'number' && item.weight > 0;
    if (!isWeightValid) {
      deviationCounts.weight++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de PESO (weight) inválido ou zero.`);
    }

    // 8. volume
    const isVolumeValid = typeof item.volume === 'number' && item.volume > 0;
    if (!isVolumeValid) {
      deviationCounts.volume++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de VOLUME inválido ou zero.`);
    }

    // 9. effectiveRoute / normRota
    const resolvedRoute = item.effectiveRoute || item.normRota || item.operationalRoute || 'SEM ROTA';
    const isRouteValid = typeof resolvedRoute === 'string' && resolvedRoute.trim().length > 0 && resolvedRoute !== 'SEM ROTA';
    if (isRouteValid) {
      stats.validRoutes++;
    } else {
      deviationCounts.effectiveRoute++;
      criticalDeviationsCount++;
      warnings.push(`${prefix} Contrato de ROTA quebrado: nenhum mapeamento de rota retornado.`);
    }

    // --- OPTIONAL FIELDS ---

    // 10. bairro
    const isBairroValid = typeof item.bairro === 'string' && item.bairro.trim().length > 0;
    if (!isBairroValid) {
      deviationCounts.bairro++;
      optionalDeviationsCount++;
    }

    // 11. localizacao
    const isLocalizacaoValid = typeof item.localizacao === 'string' && item.localizacao.trim().length > 0;
    if (!isLocalizacaoValid) {
      deviationCounts.localizacao++;
      optionalDeviationsCount++;
    }

    // 12. obs
    const isObsValid = typeof item.obs === 'string' && item.obs.trim().length > 0;
    if (!isObsValid) {
      deviationCounts.obs++;
      optionalDeviationsCount++;
    }

    // 13. frete
    const isFreteValid = typeof item.frete === 'number' && item.frete >= 0;
    if (!isFreteValid) {
      deviationCounts.frete++;
      optionalDeviationsCount++;
    }

    // 14. valor
    const isValorValid = typeof item.valor === 'number' && item.valor >= 0;
    if (!isValorValid) {
      deviationCounts.valor++;
      optionalDeviationsCount++;
    }

    // 15. pagador
    const isPagadorValid = typeof item.pagador === 'string' && item.pagador.trim().length > 0;
    if (!isPagadorValid) {
      deviationCounts.pagador++;
      optionalDeviationsCount++;
    }

    // 16. cod
    const isCodValid = typeof item.cod === 'string' && item.cod.trim().length > 0;
    if (!isCodValid) {
      deviationCounts.cod++;
      optionalDeviationsCount++;
    }

    // 17. descricao_ocorr
    const isDescOcorrValid = typeof item.descricao_ocorr === 'string' && item.descricao_ocorr.trim().length > 0;
    if (!isDescOcorrValid) {
      deviationCounts.descricao_ocorr++;
      optionalDeviationsCount++;
    }

    // Senders verification
    const resolvedSender = item.remetente;
    const isSenderValid = typeof resolvedSender === 'string' && resolvedSender.trim().length > 0;
    if (isSenderValid) {
      stats.validSenders++;
    } else {
      stats.validSenders++;
    }
  });

  const success = criticalDeviationsCount === 0;
  const totalDeviations = criticalDeviationsCount + optionalDeviationsCount;

  // We group logs in a single collapsed log group to clean up the console.
  if (totalDeviations > 0) {
    const sortedDeviations = Object.entries(deviationCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const topFieldsStr = sortedDeviations
      .slice(0, 5)
      .map(([field, count]) => `${field} (${count})`)
      .join(', ');

    console.groupCollapsed(`[Field Contract Validator] Resumo: Encontrados ${totalDeviations} desvios de contrato de dados em ${items.length} itens.`);
    console.log(`Itens Analisados: ${items.length}`);
    console.log(`Total Desvios: ${totalDeviations}`);
    console.log(`Desvios Críticos: ${criticalDeviationsCount}`);
    console.log(`Desvios Opcionais: ${optionalDeviationsCount}`);
    console.log(`Top campos/cenários afetados: ${topFieldsStr}`);
    
    if (criticalDeviationsCount > 0) {
      console.warn(`[Field Contract Validator] ALERTA CRÍTICO: Detectados ${criticalDeviationsCount} desvios em campos essenciais! Recomendável revisão do mapeamento de importação.`);
    } else {
      console.log(`[Field Contract Validator] Aviso: Detectados apenas desvios em campos opcionais.`);
    }
    console.groupEnd();
  } else if (verbose) {
    console.log(`[Field Contract Validator] Todos os ${items.length} itens da mesa cumprem as regras do contrato.`);
  }

  return { success, warnings, stats };
}
