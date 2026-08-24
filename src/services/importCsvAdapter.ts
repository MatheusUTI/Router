import { Ctrc } from '../types';
import { DEFAULT_OPERATIONAL_UNIT } from '../constants/operationalUnits';
import { parseCtrcSeries, checkIsSubcontract } from '../utils/ctrcUtils';
import { classifyOperationalFlow } from './operationalFlowClassifier';

/**
 * Converte valores monetários ou numéricos formatados no padrão brasileiro (pt-BR)
 * para ponto flutuante seguro em JavaScript.
 */
export function parsePtBrFloat(val: string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  
  let clean = String(val).trim();
  if (!clean) return 0;
  
  // Remove prefixos/sufixos de moeda e espaços
  clean = clean.replace(/(?:R\$|USD|\$|\s)/gi, '');
  
  // Mantém apenas dígitos, sinais negativos, pontos e vírgulas
  clean = clean.replace(/[^0-9.,-]/g, '');
  
  if (!clean) return 0;
  
  // Identifica separadores
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // Vírgula é separador decimal (ex: 1.234,56)
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Ponto é separador decimal (ex: 1,234.56)
      clean = clean.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Apenas vírgulas presentes
    const commasCount = (clean.match(/,/g) || []).length;
    if (commasCount === 1) {
      clean = clean.replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    // Apenas pontos presentes
    const dotsCount = (clean.match(/\./g) || []).length;
    if (dotsCount === 1) {
      const parts = clean.split('.');
      const decimalPart = parts[1] || '';
      // Se tiver exatamente 3 dígitos após o ponto, trata como milhar (ex: "1.200" kg/R$)
      if (decimalPart.length === 3) {
        clean = clean.replace(/\./g, '');
      }
    } else {
      clean = clean.replace(/\./g, '');
    }
  }
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Remove prefixos de controle do formato legado SSW (ex: "1;", "2;", "0;").
 */
export function cleanPrefix(lineStr: string, removePrefix = true, delimiter = ';'): string {
  if (!removePrefix) return lineStr;
  const regex = new RegExp(`^\\d+\\s*\\${delimiter}`);
  return lineStr.replace(regex, '');
}

/**
 * Detecta delimitador de colunas (vírgula ou ponto-e-vírgula).
 */
export function autoDetectDelimiter(rawLines: string[]): string {
  if (rawLines.length === 0) return ';';
  const commas = (rawLines[0].match(/,/g) || []).length;
  const semicolons = (rawLines[0].match(/;/g) || []).length;
  return commas > semicolons ? ',' : ';';
}

/**
 * Detecta a linha do cabeçalho procurando termos típicos do relatório 455 do SSW.
 */
export function autoDetectHeaderIndex(rawLines: string[]): number {
  let bestHeaderIdx = 0;
  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const lower = rawLines[i].toLowerCase();
    if (lower.includes('ctrc') || lower.includes('numero') || lower.includes('destinatario') || lower.includes('serie/numero')) {
      bestHeaderIdx = i;
      break;
    }
  }
  return bestHeaderIdx;
}

/**
 * Detecta se as linhas possuem padrão de prefixo numérico (ex: "1;Serie/Numero").
 */
export function autoDetectPrefix(rawLines: string[]): boolean {
  if (rawLines.length > 1) {
    return rawLines.slice(0, 3).every(line => /^\d+[;,]/.test(line));
  }
  return false;
}

/**
 * Executa mapeamento automático por correspondência de palavras-chave.
 */
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {
    id: '',
    destinatario: '',
    cidade: '',
    pracaDestino: '',
    weight: '',
    volume: '',
    remetente: '',
    pagador: '',
    nf: '',
    valor: '',
    frete: '',
    setor: '',
    prev_ent: '',
    unid: '',
    ocorrencia: '',
    descricao_ocorr: '',
    localizacao: '',
    realDeliveryDate: '',
    recipientAddress: '',
    recipientNeighborhood: '',
    deliveryPlace: '',
    localDeliveryAddress: '',
    localDeliveryNeighborhood: '',
    deliveryCity: '',
  };

  headers.forEach((h) => {
    const lower = h.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');

    // PRAÇA DE DESTINO
    if (
      lower === 'praca de destino' ||
      lower === 'praça de destino' ||
      lower === 'praca destino' ||
      lower === 'praça destino' ||
      lower === 'praca_destino' ||
      lower === 'praça_destino' ||
      lower === 'destino praca' ||
      lower === 'destino_praça' ||
      (lower.includes('praca') && lower.includes('destino')) ||
      (lower.includes('praça') && lower.includes('destino'))
    ) {
      mappings.pracaDestino = h;
    }
    // CÓDIGO OCORRÊNCIA
    else if (
      lower === 'cod ocorr' || 
      lower === 'codigo ocorrencia' || 
      lower === 'código de ocorrência' || 
      lower === 'ocorrencia' || 
      lower === 'ocorrência' || 
      lower.includes('cod ocorr') || 
      lower.includes('codigo da ultima ocorrencia')
    ) {
      mappings.ocorrencia = h;
    }
    // DESCRIÇÃO OCORRÊNCIA
    else if (
      lower === 'descricao ocorrencia' || 
      lower === 'descrição de ocorrência' || 
      lower === 'motivo' || 
      lower.includes('descricao da ultima ocorrencia') || 
      lower.includes('descricao oco') || 
      lower.includes('descrição')
    ) {
      mappings.descricao_ocorr = h;
    }
    // PREVISÃO ENTREGA
    else if (
      lower === 'prev entrega' || 
      lower === 'previsão entrega' || 
      lower === 'previsao entrega' || 
      lower === 'prev ent' || 
      lower === 'prev_entrega' || 
      lower === 'previsao_entrega' || 
      lower.includes('previsao') || 
      lower.includes('previsão') || 
      lower.includes('entrega programada')
    ) {
      mappings.prev_ent = h;
    }
    // CIDADE DE ENTREGA
    else if (
      lower === 'cidade entrega' || 
      lower === 'cidade_entrega' || 
      lower === 'cidade de entrega' || 
      lower === 'cidade_de_entrega' || 
      lower === 'cidade ent' || 
      lower === 'cidade_ent' || 
      lower === 'cidade destino' || 
      lower === 'cidade_destino' ||
      lower === 'cidade do destinatario' ||
      lower === 'cidade_do_destinatario'
    ) {
      mappings.cidade = h;
    }
    // DESTINATÁRIO
    else if (
      lower === 'destinatario' || 
      lower === 'destinatário' || 
      lower === 'destinatario nome' || 
      lower === 'destinatario_nome' || 
      lower === 'cliente destinatario' || 
      lower === 'cliente_destinatario' || 
      lower === 'nome destinatario' || 
      lower === 'nome_destinatario' || 
      lower === 'destinatário final' || 
      lower === 'destinatario_final'
    ) {
      mappings.destinatario = h;
    }
    // CTRC / DOCUMENTO / CTE
    else if (
      lower === 'ctrc' || 
      lower === 'cte' || 
      lower === 'documento' || 
      lower === 'serie/numero ctrc' ||
      lower.includes('ctrc') || 
      lower.includes('numero') || 
      lower.includes('número')
    ) {
      mappings.id = h;
    }
    // REMETENTE
    else if (
      lower === 'remetente' || 
      lower === 'cliente remetente' || 
      lower === 'cliente_remetente' || 
      lower === 'nome remetente' || 
      lower === 'nome_remetente'
    ) {
      mappings.remetente = h;
    }
    // SETOR / ROTA
    else if (
      lower === 'setor' || 
      lower === 'setor destino' || 
      lower === 'setor de destino' ||
      lower === 'rota' || 
      lower.includes('setor') || 
      lower.includes('rota')
    ) {
      mappings.setor = h;
    }
    // PESO
    else if (
      lower === 'peso' || 
      lower === 'peso real' || 
      lower === 'peso real em kg' ||
      lower === 'peso_r' || 
      lower.includes('peso') || 
      lower.includes('weight') || 
      lower.includes('kg')
    ) {
      mappings.weight = h;
    }
    // VOLUMES
    else if (
      lower === 'volumes' || 
      lower === 'qtde volumes' || 
      lower === 'quantidade de volumes' || 
      lower.includes('volume') || 
      lower.includes('qtde')
    ) {
      mappings.volume = h;
    }
    // VALOR
    else if (
      lower === 'valor' || 
      lower === 'valor mercadoria' || 
      lower === 'valor da mercadoria' ||
      lower === 'valor_mercadoria' || 
      lower.includes('valor da mercadoria') || 
      lower.includes('valor mercadoria')
    ) {
      mappings.valor = h;
    }
    // FRETE
    else if (
      lower === 'frete' || 
      lower === 'valor frete' || 
      lower === 'valor do frete' ||
      lower.includes('valor do frete') || 
      lower.includes('frete')
    ) {
      mappings.frete = h;
    }
    // LOCALIZAÇÃO
    else if (
      lower === 'localizacao' || 
      lower === 'localização' || 
      lower === 'localizacao atual' ||
      lower === 'posicao' || 
      lower === 'posição' || 
      lower.includes('localizacao') || 
      lower.includes('localização') || 
      lower.includes('posicao') || 
      lower.includes('posição')
    ) {
      mappings.localizacao = h;
    }
    // PAGADOR
    else if (
      lower === 'pagador' || 
      lower === 'cliente pagador' || 
      lower.includes('pagador')
    ) {
      mappings.pagador = h;
    }
    // UNIDADE
    else if (
      lower === 'unidade' || 
      lower === 'unid' || 
      lower === 'unidade receptora' ||
      lower === 'unid entrega' || 
      lower === 'unid_entrega' || 
      lower.includes('unidade') || 
      lower.includes('unid')
    ) {
      mappings.unid = h;
    }
    // DATA ENTREGA REALIZADA
    else if (
      lower === 'data da entrega realizada' ||
      lower === 'entrega realizada' ||
      lower === 'data entrega realizada' ||
      lower === 'data da entrega' ||
      lower === 'data entrega' ||
      lower.includes('entrega realizada') ||
      lower.includes('data entrega')
    ) {
      mappings.realDeliveryDate = h;
    }
    // NOTA FISCAL
    else if (
      lower === 'numero da nota fiscal' ||
      lower === 'nota fiscal' ||
      lower === 'nf' ||
      lower.includes('nota fiscal') ||
      lower.includes('nf')
    ) {
      mappings.nf = h;
    }
    // ADDRESS FIELDS
    else if (lower === 'endereco do destinatario' || lower === 'endereço do destinatario') {
      mappings.recipientAddress = h;
    } else if (lower === 'bairro do destinatario') {
      mappings.recipientNeighborhood = h;
    } else if (lower === 'local de entrega') {
      mappings.deliveryPlace = h;
    } else if (lower === 'endereco' || lower === 'endereço') {
      mappings.localDeliveryAddress = h;
    } else if (lower === 'bairro') {
      mappings.localDeliveryNeighborhood = h;
    } else if (lower === 'cidade de entrega') {
      mappings.deliveryCity = h;
    }
  });

  return mappings;
}

/**
 * Converte linhas de texto CSV brutas em array estruturado de CTRCs normalizados.
 */
export function parseCsvRows(
  lines: string[],
  headerLineIndex: number,
  delimiter: string,
  removePrefix: boolean,
  mappings: Record<string, string>,
  userUnid = DEFAULT_OPERATIONAL_UNIT
): Ctrc[] {
  if (headerLineIndex === -1 || lines.length <= headerLineIndex + 1) return [];

  const rawHeaderLine = cleanPrefix(lines[headerLineIndex], removePrefix, delimiter);
  const columnHeaders = rawHeaderLine.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));

  const idIdx = columnHeaders.indexOf(mappings.id);
  const destIdx = columnHeaders.indexOf(mappings.destinatario);
  const cityIdx = columnHeaders.indexOf(mappings.cidade);
  
  const pracaDestinoIdx = mappings.pracaDestino ? columnHeaders.indexOf(mappings.pracaDestino) : -1;
  const weightIdx = mappings.weight ? columnHeaders.indexOf(mappings.weight) : -1;
  const volIdx = mappings.volume ? columnHeaders.indexOf(mappings.volume) : -1;
  const setorIdx = mappings.setor ? columnHeaders.indexOf(mappings.setor) : -1;
  const prevIdx = mappings.prev_ent ? columnHeaders.indexOf(mappings.prev_ent) : -1;
  const remIdx = mappings.remetente ? columnHeaders.indexOf(mappings.remetente) : -1;
  const pagIdx = mappings.pagador ? columnHeaders.indexOf(mappings.pagador) : -1;
  const nfIdx = mappings.nf ? columnHeaders.indexOf(mappings.nf) : -1;
  const valIdx = mappings.valor ? columnHeaders.indexOf(mappings.valor) : -1;
  const freIdx = mappings.frete ? columnHeaders.indexOf(mappings.frete) : -1;
  const uniIdx = mappings.unid ? columnHeaders.indexOf(mappings.unid) : -1;
  const ocoIdx = mappings.ocorrencia ? columnHeaders.indexOf(mappings.ocorrencia) : -1;
  const descOcoIdx = mappings.descricao_ocorr ? columnHeaders.indexOf(mappings.descricao_ocorr) : -1;
  const locIdx = mappings.localizacao ? columnHeaders.indexOf(mappings.localizacao) : -1;
  const realDelIdx = mappings.realDeliveryDate ? columnHeaders.indexOf(mappings.realDeliveryDate) : -1;
  
  // Address Fields Indices
  const recAddrIdx = mappings.recipientAddress ? columnHeaders.indexOf(mappings.recipientAddress) : -1;
  const recNeighIdx = mappings.recipientNeighborhood ? columnHeaders.indexOf(mappings.recipientNeighborhood) : -1;
  const delPlaceIdx = mappings.deliveryPlace ? columnHeaders.indexOf(mappings.deliveryPlace) : -1;
  const locDelAddrIdx = mappings.localDeliveryAddress ? columnHeaders.indexOf(mappings.localDeliveryAddress) : -1;
  const locDelNeighIdx = mappings.localDeliveryNeighborhood ? columnHeaders.indexOf(mappings.localDeliveryNeighborhood) : -1;
  const delCityIdx = mappings.deliveryCity ? columnHeaders.indexOf(mappings.deliveryCity) : -1;

  const dataLines = lines.slice(headerLineIndex + 1);
  const results: Ctrc[] = [];

  dataLines.forEach((rawLine, idx) => {
    const cleaned = cleanPrefix(rawLine, removePrefix, delimiter);
    const cells = cleaned.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    if (cells.length < 2 || cells.every(c => c === '')) return;

    const idVal = idIdx !== -1 ? cells[idIdx] : '';
    const destVal = destIdx !== -1 ? cells[destIdx] : '';
    const cityVal = cityIdx !== -1 ? cells[cityIdx] : '';

    if (!idVal && !destVal) return;

    const pracaDestinoVal = pracaDestinoIdx !== -1 ? cells[pracaDestinoIdx] : '';
    const weightVal = weightIdx !== -1 && cells[weightIdx] ? parsePtBrFloat(cells[weightIdx]) : 180;
    const volumesVal = volIdx !== -1 && cells[volIdx] ? parsePtBrFloat(cells[volIdx]) : 4;
    const setorVal = setorIdx !== -1 ? cells[setorIdx] : '';
    const prevVal = prevIdx !== -1 ? cells[prevIdx] : '';
    const remVal = remIdx !== -1 ? cells[remIdx] : '';
    const pagVal = pagIdx !== -1 ? cells[pagIdx] : '';
    const nfVal = nfIdx !== -1 ? cells[nfIdx] : '';
    const valVal = valIdx !== -1 && cells[valIdx] ? parsePtBrFloat(cells[valIdx]) : 0;
    const freVal = freIdx !== -1 && cells[freIdx] ? parsePtBrFloat(cells[freIdx]) : 0;
    const uniVal = uniIdx !== -1 ? cells[uniIdx] : '';
    const ocoVal = ocoIdx !== -1 ? cells[ocoIdx] : '';
    const descOcoVal = descOcoIdx !== -1 ? cells[descOcoIdx] : '';
    const locVal = locIdx !== -1 ? cells[locIdx] : '';
    const realDelVal = realDelIdx !== -1 ? cells[realDelIdx] : '';

    // Address Fields
    const recAddrVal = recAddrIdx !== -1 ? cells[recAddrIdx] : '';
    const recNeighVal = recNeighIdx !== -1 ? cells[recNeighIdx] : '';
    const delPlaceVal = delPlaceIdx !== -1 ? cells[delPlaceIdx] : '';
    const locDelAddrVal = locDelAddrIdx !== -1 ? cells[locDelAddrIdx] : '';
    const locDelNeighVal = locDelNeighIdx !== -1 ? cells[locDelNeighIdx] : '';
    const delCityVal = delCityIdx !== -1 ? cells[delCityIdx] : '';

    const deliveryAddress = locDelAddrVal || recAddrVal || undefined;
    const deliveryNeighborhood = locDelNeighVal || recNeighVal || undefined;
    const finalDeliveryCity = delCityVal || cityVal || 'Ponto de Distribuição';

    const cleanRealDel = (realDelVal && realDelVal !== '-' && realDelVal !== '0') ? realDelVal : undefined;

    const originSeries = parseCtrcSeries(idVal);
    const isSubcontract = checkIsSubcontract(originSeries);
    const countsForDeliveryPerformance = !isSubcontract;

    const ctrcItem: Ctrc = {
      id: idVal ? idVal : `CTRC #${90400 + idx}`,
      destinatario: destVal || 'Destinatário Desconhecido',
      cidade: finalDeliveryCity,
      cidade_ent: finalDeliveryCity,
      pracaDestino: pracaDestinoVal || undefined,
      weight: weightVal || 150,
      volume: volumesVal || 2,
      type: (weightVal > 1000) ? 'CURVA A' : 'NORMAL',
      status: cleanRealDel ? 'Entregue' : 'Pendente',
      setor: setorVal || undefined,
      prev_ent: prevVal || undefined,
      remetente: remVal || undefined,
      pagador: pagVal || undefined,
      nf: nfVal || undefined,
      valor: valVal || undefined,
      frete: freVal || undefined,
      unid: uniVal || userUnid,
      ocorrencia: ocoVal || undefined,
      descricao_ocorr: descOcoVal || undefined,
      localizacao: locVal || undefined,
      realDeliveryDate: cleanRealDel,
      dataEntregaRealizada: cleanRealDel,
      deliveryDate: cleanRealDel,
      delivery_date: cleanRealDel,
      isActiveForRouting: !cleanRealDel,
      originSeries,
      isSubcontract,
      countsForDeliveryPerformance,
      recipientAddress: recAddrVal || undefined,
      recipientNeighborhood: recNeighVal || undefined,
      deliveryPlace: delPlaceVal || undefined,
      localDeliveryAddress: locDelAddrVal || undefined,
      localDeliveryNeighborhood: locDelNeighVal || undefined,
      deliveryAddress,
      deliveryNeighborhood,
      deliveryCity: delCityVal || undefined,
      bairro: deliveryNeighborhood,
    };

    results.push(ctrcItem);
  });

  return results;
}

/**
 * Adapter comum que recebe texto bruto CSV e entrega CTRCs devidamente classificados.
 * Utilizado de forma unificada tanto pelo fluxo manual quanto pela aquisição automatizada SSW 455.
 */
export function processCsvToCtrcs(
  rawText: string,
  userUnid = DEFAULT_OPERATIONAL_UNIT,
  customMappings?: Record<string, string>
): {
  ctrcs: Ctrc[];
  stats: {
    totalLines: number;
    parsedCount: number;
    delimiter: string;
    headers: string[];
  };
} {
  // Limpeza de BOM caso presente
  const cleanText = rawText.replace(/^\uFEFF/, '');
  const rawLines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  if (rawLines.length === 0) {
    return {
      ctrcs: [],
      stats: { totalLines: 0, parsedCount: 0, delimiter: ';', headers: [] }
    };
  }

  const delimiter = autoDetectDelimiter(rawLines);
  const headerIdx = autoDetectHeaderIndex(rawLines);
  const removePrefix = autoDetectPrefix(rawLines);

  const rawHeaderLine = cleanPrefix(rawLines[headerIdx] || '', removePrefix, delimiter);
  const headers = rawHeaderLine.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));

  const mappings = customMappings || autoMapHeaders(headers);
  const rawParsed = parseCsvRows(rawLines, headerIdx, delimiter, removePrefix, mappings, userUnid);

  // Classifica fluxo operacional (Distribuição vs Rota)
  const classifiedCtrcs = rawParsed.map(ctrc => classifyOperationalFlow(ctrc, userUnid));

  return {
    ctrcs: classifiedCtrcs,
    stats: {
      totalLines: rawLines.length,
      parsedCount: classifiedCtrcs.length,
      delimiter,
      headers
    }
  };
}
