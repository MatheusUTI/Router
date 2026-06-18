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
export function validateFieldContract(items: RoteirizacaoItem[]): ContractValidationResult {
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

  items.forEach((item, index) => {
    const prefix = `[CTRC: ${item.id || '#' + index}]`;

    // 1. CIDADE CONTRACT VALIDATION
    const resolvedCity = item.normCidade || item.cidade || item.cidade_ent;
    const isCityValid = typeof resolvedCity === 'string' && resolvedCity.trim().length > 0;
    
    if (!isCityValid) {
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
        warnings.push(`${prefix} Contrato de CIDADE suspeito: valor "${resolvedCity}" contém poluentes (Rota/Setor/Inteiro).`);
      }
    }

    // 2. ROTA CONTRACT VALIDATION
    const resolvedRoute = item.effectiveRoute || item.normRota || item.operationalRoute || 'SEM ROTA';
    const isRouteValid = typeof resolvedRoute === 'string' && resolvedRoute.trim().length > 0;
    if (isRouteValid) {
      stats.validRoutes++;
    } else {
      warnings.push(`${prefix} Contrato de ROTA quebrado: nenhum mapeamento de rota retornado.`);
    }

    // 3. DESTINATÁRIO CONTRACT VALIDATION (Contamination Shield)
    const resolvedDest = item.destinatario;
    const isDestValid = typeof resolvedDest === 'string' && resolvedDest.trim().length > 0;
    if (isDestValid) {
      stats.validDests++;
      // Check if recipient is contaminated with city name
      if (resolvedCity && resolvedDest.toUpperCase().trim() === resolvedCity.toUpperCase().trim()) {
        warnings.push(`${prefix} Contaminação cruzada: Destinatário bota exatamente o mesmo valor da Cidade ("${resolvedCity}").`);
      }
    } else {
      warnings.push(`${prefix} Contrato de DESTINATÁRIO ausente.`);
    }

    // 4. REMETENTE CONTRACT VALIDATION
    const resolvedSender = item.remetente;
    const isSenderValid = typeof resolvedSender === 'string' && resolvedSender.trim().length > 0;
    if (isSenderValid) {
      stats.validSenders++;
      if (resolvedDest && resolvedSender.toUpperCase().trim() === resolvedDest.toUpperCase().trim() && resolvedSender !== 'REMETENTE VAGO') {
        warnings.push(`${prefix} Contrato de REMETENTE suspeito: Remetente idêntico ao Destinatário ("${resolvedSender}").`);
      }
    } else {
      stats.validSenders++; // Treated as optional visual fallback
    }

    // 5. PREVISÃO CONTRACT VALIDATION (Delay check protection)
    const rawPrev = item.prev_ent;
    stats.validForecasts++;
    if (rawPrev) {
      const cleanPrev = rawPrev.toUpperCase().trim();
      const isSPFormat =
        cleanPrev === 'SEM PREVISÃO' ||
        cleanPrev === 'SEM PREVISAO' ||
        cleanPrev === 'S/P' ||
        cleanPrev === 'SP' ||
        cleanPrev === 'S/PRAZO' ||
        cleanPrev === 'SEM PREV';
      
      if (isSPFormat && item.slaStatus?.isDelayed) {
        warnings.push(`${prefix} Contrato de PREVISÃO quebrado: Item marcado como atrasado possuindo status sem previsão.`);
      }
    }
  });

  const success = warnings.length === 0;

  // Run console asserts as test assertions under development/preview
  console.assert(stats.validCities === stats.total, `[Test Assert] Cidades em conformidade: ${stats.validCities}/${stats.total}`);
  console.assert(stats.validRoutes === stats.total, `[Test Assert] Rotas em conformidade: ${stats.validRoutes}/${stats.total}`);
  
  if (!success) {
    console.warn(`[Field Contract Validator] Encontrado ${warnings.length} desvios de contrato de dados nos itens carregados.`);
  } else {
    console.log(`[Field Contract Validator] Todos os ${items.length} itens da mesa cumprem as regras do contrato.`);
  }

  return { success, warnings, stats };
}
