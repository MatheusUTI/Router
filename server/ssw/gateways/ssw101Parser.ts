import {
  Ssw101CtrcDetailDTO,
  Ssw101MatchItemDTO,
  Ssw101NotaFiscalDTO,
  Ssw101SearchResultDTO,
  Ssw101TrackingEventDTO
} from '../../../src/integrations/ssw/contracts/dtos';

/**
 * Converte valor numérico formatado em padrão brasileiro ("1.234,56") ou internacional para float.
 */
export function parsePtBrNumber(val?: string | number): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // Remove R$, espaços e caracteres não numéricos exceto ponto e vírgula
  const clean = str.replace(/[R$\s]/g, '');
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(clean)) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (/^\d+,\d+$/.test(clean)) {
    return parseFloat(clean.replace(',', '.')) || 0;
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}

/**
 * Normaliza e limpa texto HTML (remove tags, entidades HTML e espaços excessivos).
 */
export function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parser de HTML das respostas da Opção 101 do SSW (/bin/ssw0101 e /bin/ssw0053).
 */
export class Ssw101Parser {
  /**
   * Faz o parse completo do HTML retornado pela consulta 101.
   */
  public static parse(html: string): Ssw101SearchResultDTO {
    if (!html || typeof html !== 'string' || html.trim() === '') {
      return {
        success: false,
        found: false,
        resultsCount: 0,
        rawMessage: 'Resposta vazia retornada pelo SSW.'
      };
    }

    const plainText = stripHtml(html);

    // 1. Verifica se houve erro ou documento inexistente
    if (this.isNotFoundResponse(html, plainText)) {
      return {
        success: true,
        found: false,
        resultsCount: 0,
        rawMessage: this.extractErrorMessage(plainText) || 'Nenhum documento encontrado para os parâmetros informados.'
      };
    }

    // 2. Verifica se a resposta é uma listagem com múltiplos CTRCs (comum na busca por NF)
    if (this.isMultipleResultsTable(html)) {
      const items = this.parseMultipleResultsTable(html);
      if (items.length > 0) {
        return {
          success: true,
          found: true,
          multipleResults: true,
          resultsCount: items.length,
          items,
          rawMessage: `${items.length} documento(s) encontrado(s).`
        };
      }
    }

    // 3. Caso seja o detalhamento de um CTRC único
    const detail = this.parseSingleCtrcDetail(html);
    if (detail && (detail.ctrc || detail.numero || detail.historico.length > 0)) {
      return {
        success: true,
        found: true,
        multipleResults: false,
        resultsCount: 1,
        detail,
        rawMessage: 'CTRC localizado com sucesso.'
      };
    }

    // Fallback: se não conseguiu extrair detalhe completo, tenta extrair informações parciais
    return {
      success: true,
      found: false,
      resultsCount: 0,
      rawMessage: 'Não foi possível estruturar os dados retornados do SSW 101.'
    };
  }

  /**
   * Identifica se a resposta indica que o documento não foi localizado.
   */
  private static isNotFoundResponse(html: string, plainText: string): boolean {
    const notFoundPatterns = [
      /nenhum\s+documento\s+encontrado/i,
      /ctrc\s+n[ãa]o\s+localizado/i,
      /ctrc\s+inexistente/i,
      /nota\s+fiscal\s+n[ãa]o\s+localizada/i,
      /nenhum\s+registro\s+selecionado/i,
      /documento\s+n[ãa]o\s+encontrado/i,
      /par[âa]metros\s+inv[áa]lidos/i,
      /registro\s+inexistente/i
    ];

    return notFoundPatterns.some(pattern => pattern.test(plainText) || pattern.test(html));
  }

  /**
   * Extrai a mensagem de erro textual da tela de retorno.
   */
  private static extractErrorMessage(plainText: string): string | null {
    const errorMatch = /(?:erro|aten[çc][ãa]o|aviso)\s*:\s*([^.\n]+)/i.exec(plainText);
    if (errorMatch && errorMatch[1]) {
      return errorMatch[1].trim();
    }
    return null;
  }

  /**
   * Detecta se o HTML contém uma tabela com múltiplos resultados de CTRC.
   */
  private static isMultipleResultsTable(html: string): boolean {
    const lower = html.toLowerCase();
    const hasTable = lower.includes('<table');
    const hasMultipleHeaders = (lower.includes('ctrc') || lower.includes('conhecimento')) &&
      lower.includes('remetente') &&
      lower.includes('destinat');
    const rowMatches = (html.match(/<tr[^>]*>/gi) || []).length;

    // Se tem mais de 4 linhas e menção a listagem de seleção
    return hasTable && hasMultipleHeaders && (rowMatches >= 3) && (
      lower.includes('selecione') ||
      lower.includes('relacao de ctrcs') ||
      lower.includes('rela[çc][ãa]o de documentos') ||
      lower.includes('pesquisa de documentos') ||
      (lower.includes('t_nro_ctrc') && rowMatches > 5)
    );
  }

  /**
   * Faz o parse da tabela com múltiplos resultados de CTRC.
   */
  private static parseMultipleResultsTable(html: string): Ssw101MatchItemDTO[] {
    const items: Ssw101MatchItemDTO[] = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rows) {
      const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
        .map(cell => stripHtml(cell));

      if (cells.length < 3) continue;

      // Pula linha de cabeçalho
      const firstCell = cells[0].toUpperCase();
      if (firstCell.includes('CTRC') || firstCell.includes('CONHECIMENTO') || firstCell.includes('SÉRIE') || firstCell === 'DOC') {
        continue;
      }

      // Procura formato de CTRC na primeira ou segunda célula (ex: "BCA 12345" ou "VGA-12345" ou "12345")
      let ctrcStr = '';
      let serie = '';
      let numero = '';
      let dataEmissao = '';
      let remetente = '';
      let destinatario = '';
      let cidadeDestino = '';
      let status = 'Em Trânsito';
      let valorMercadoria = 0;
      let nf = '';

      for (let i = 0; i < cells.length; i++) {
        const text = cells[i];
        const ctrcMatch = /^([A-Z]{2,5})?\s*[-/]?\s*(\d{1,10})$/i.exec(text);
        if (!ctrcStr && ctrcMatch) {
          serie = (ctrcMatch[1] || 'BCA').toUpperCase();
          numero = ctrcMatch[2];
          ctrcStr = `${serie}-${numero.padStart(6, '0')}`;
          continue;
        }

        if (!dataEmissao && /^\d{2}\/\d{2}\/(?:\d{2}|\d{4})/.test(text)) {
          dataEmissao = text;
          continue;
        }

        if (/^\d+$/.test(text) && !nf && text.length >= 3 && text.length <= 9) {
          nf = text;
        }

        if (!remetente && text.length > 3 && !/^\d+$/.test(text) && !/^\d{2}\//.test(text)) {
          remetente = text;
          continue;
        }

        if (remetente && !destinatario && text.length > 3 && !/^\d+$/.test(text) && !/^\d{2}\//.test(text)) {
          destinatario = text;
          continue;
        }

        if (destinatario && !cidadeDestino && text.length >= 2) {
          cidadeDestino = text;
          continue;
        }

        if (text.toLowerCase().includes('entreg') || text.toLowerCase().includes('trânsito') || text.toLowerCase().includes('retid')) {
          status = text;
        }

        if (text.includes('R$') || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(text)) {
          valorMercadoria = parsePtBrNumber(text);
        }
      }

      if (ctrcStr || numero) {
        items.push({
          ctrc: ctrcStr || numero,
          serie: serie || 'BCA',
          numero: numero || ctrcStr,
          dataEmissao: dataEmissao || '',
          remetente: remetente || 'N/I',
          destinatario: destinatario || 'N/I',
          cidadeDestino: cidadeDestino || '',
          status: status || 'Pendente',
          valorMercadoria,
          nf
        });
      }
    }

    return items;
  }

  /**
   * Faz o parse analítico dos blocos de dados de um CTRC individual no SSW 101.
   */
  public static parseSingleCtrcDetail(html: string): Ssw101CtrcDetailDTO {
    const plain = stripHtml(html);

    // 1. Extração de Identificação do CTRC / Série / Número
    let ctrc = '';
    let serie = '';
    let numero = '';

    const ctrcMatch = /(?:ctrc|conhecimento|cte|ct-e)\s*(?:n[º°o]?)?\s*:?\s*([a-z]{2,5})?\s*[-/]?\s*(\d{1,10})/i.exec(plain);
    if (ctrcMatch) {
      serie = (ctrcMatch[1] || '').toUpperCase();
      numero = ctrcMatch[2];
      ctrc = serie ? `${serie}-${numero.padStart(6, '0')}` : numero;
    } else {
      const docMatch = /(?:documento|nro)\s*:?\s*(\d{4,10})/i.exec(plain);
      if (docMatch) {
        numero = docMatch[1];
        ctrc = numero;
      }
    }

    // Chave do CT-e (44 dígitos)
    let chaveCte: string | undefined = undefined;
    const chaveMatch = /(?:chave\s+(?:cte|ct-e|acesso)|cte\s*chave)\s*:?\s*(\d{44})/i.exec(plain) ||
      /(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/i.exec(plain);
    if (chaveMatch) {
      chaveCte = chaveMatch[1].replace(/\s+/g, '');
    }

    // Datas (Emissão / Previsão)
    let dataEmissao = '';
    let dataPrevisao: string | undefined = undefined;

    const dtEmissaoMatch = /(?:emiss[ãa]o|data\s+emiss[ãa]o|emitido\s+em)\s*:?\s*(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i.exec(plain);
    if (dtEmissaoMatch) {
      dataEmissao = dtEmissaoMatch[1].trim();
    } else {
      const anyDateMatch = /(\d{2}\/\d{2}\/\d{4})/i.exec(plain);
      if (anyDateMatch) {
        dataEmissao = anyDateMatch[1];
      }
    }

    const dtPrevMatch = /(?:previs[ãa]o|prev\.?\s*ent\.?|previs[ãa]o\s+entrega)\s*:?\s*(\d{2}\/\d{2}\/(?:\d{2}|\d{4}))/i.exec(plain);
    if (dtPrevMatch) {
      dataPrevisao = dtPrevMatch[1].trim();
    }

    // Unidades (Emissora / Destino)
    let unidadeEmissora = '';
    let unidadeDestino = '';
    let cidadeDestino = '';
    let ufDestino = '';

    const origMatch = /(?:origem|unid(?:ade)?\s+origem|emissora)\s*:?\s*([A-Z]{3})/i.exec(plain);
    if (origMatch) unidadeEmissora = origMatch[1].toUpperCase();

    const destUnidMatch = /(?:destino|unid(?:ade)?\s+destino|pra[çc]a)\s*:?\s*([A-Z]{3})/i.exec(plain);
    if (destUnidMatch) unidadeDestino = destUnidMatch[1].toUpperCase();

    const cidDestMatch = /(?:cidade\s+destino|munic[íi]pio\s+destino|destino\s+final)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[-/]\s*([A-Z]{2}))?/i.exec(plain);
    if (cidDestMatch) {
      cidadeDestino = cidDestMatch[1].trim();
      if (cidDestMatch[2]) ufDestino = cidDestMatch[2].trim().toUpperCase();
    }

    // Remetente
    const remetente: Ssw101CtrcDetailDTO['remetente'] = {};
    const remNomeMatch = /(?:remetente|remte|expedidor)\s*:?\s*([^-\n\r]+?)(?=(?:cnpj|cgc|end|destinat|dest|\d{2}\.\d{3}|$))/i.exec(plain);
    if (remNomeMatch) remetente.razaoSocial = remNomeMatch[1].replace(/CNPJ.*/i, '').trim();

    const remCnpjMatch = /(?:remetente|remte|expedidor)[\s\S]*?(?:cnpj|cgc)\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/i.exec(plain) ||
      /(?:cnpj|cgc)\s*(?:remetente)?\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i.exec(plain);
    if (remCnpjMatch) remetente.cnpj = remCnpjMatch[1].trim();

    const remEndMatch = /(?:end(?:ere[çc]o)?\s*rem(?:etente)?)\s*:?\s*([^\n\r]+)/i.exec(plain);
    if (remEndMatch) remetente.endereco = remEndMatch[1].trim();

    const remCidMatch = /(?:cidade\s*rem(?:etente)?)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[-/]\s*([A-Z]{2}))?/i.exec(plain);
    if (remCidMatch) {
      remetente.cidade = remCidMatch[1].trim();
      if (remCidMatch[2]) remetente.uf = remCidMatch[2].trim().toUpperCase();
    }

    // Destinatário
    const destinatario: Ssw101CtrcDetailDTO['destinatario'] = {};
    const destNomeMatch = /(?:destinat[áa]rio|destte|recebedor)\s*:?\s*([^-\n\r]+?)(?=(?:cnpj|cgc|end|fone|tel|\d{2}\.\d{3}|$))/i.exec(plain);
    if (destNomeMatch) destinatario.razaoSocial = destNomeMatch[1].replace(/CNPJ.*/i, '').trim();

    const destCnpjMatch = /(?:destinat[áa]rio|destte)[\s\S]*?(?:cnpj|cgc)\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/i.exec(plain) ||
      /(?:cnpj|cgc)\s*(?:destinat[áa]rio)?\s*:?\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i.exec(plain);
    if (destCnpjMatch) destinatario.cnpj = destCnpjMatch[1].trim();

    const destEndMatch = /(?:end(?:ere[çc]o)?\s*dest(?:inat[áa]rio)?)\s*:?\s*([^\n\r]+)/i.exec(plain);
    if (destEndMatch) destinatario.endereco = destEndMatch[1].trim();

    const destBairroMatch = /(?:bairro\s*dest(?:inat[áa]rio)?)\s*:?\s*([^\n\r]+)/i.exec(plain);
    if (destBairroMatch) destinatario.bairro = destBairroMatch[1].trim();

    const destCidMatch = /(?:cidade\s*dest(?:inat[áa]rio)?)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:[-/]\s*([A-Z]{2}))?/i.exec(plain);
    if (destCidMatch) {
      destinatario.cidade = destCidMatch[1].trim();
      if (destCidMatch[2]) destinatario.uf = destCidMatch[2].trim().toUpperCase();
    }

    const destCepMatch = /(?:cep\s*dest(?:inat[áa]rio)?|cep)\s*:?\s*(\d{5}-\d{3}|\d{8})/i.exec(plain);
    if (destCepMatch) destinatario.cep = destCepMatch[1].trim();

    const destFoneMatch = /(?:fone|telefone|celular|tel)\s*:?\s*(\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4})/i.exec(plain);
    if (destFoneMatch) destinatario.fone = destFoneMatch[1].trim();

    // Valores e Medidas
    let pesoBruto = 0;
    let pesoCubado: number | undefined = undefined;
    let volumes = 1;
    let valorMercadoria = 0;
    let valorFrete = 0;
    let especie = 'VOLUMES';
    let m3: number | undefined = undefined;
    let tipoFrete = 'CIF';
    let natureza = 'TRANSPORTE DE CARGA';
    let cfop = '';

    const pesoMatch = /(?:peso\s*(?:real|bruto|kg)?)\s*:?\s*([\d.,]+)\s*k?g?/i.exec(plain);
    if (pesoMatch) pesoBruto = parsePtBrNumber(pesoMatch[1]);

    const cubadoMatch = /(?:peso\s*cubado|cubado)\s*:?\s*([\d.,]+)\s*k?g?/i.exec(plain);
    if (cubadoMatch) pesoCubado = parsePtBrNumber(cubadoMatch[1]);

    const volMatch = /(?:volumes?|qtde\s*vol(?:umes?)?|qtd\.?\s*vol)\s*:?\s*(\d+)/i.exec(plain);
    if (volMatch) volumes = parseInt(volMatch[1], 10) || 1;

    const valMercMatch = /(?:valor\s*(?:da\s*)?mercadoria|vlr\s*merc|val\s*merc|total\s*merc)\s*:?\s*(?:R\$\s*)?([\d.,]+)/i.exec(plain);
    if (valMercMatch) valorMercadoria = parsePtBrNumber(valMercMatch[1]);

    const valFreteMatch = /(?:valor\s*(?:do\s*)?frete|vlr\s*frete|total\s*frete|frete\s*total)\s*:?\s*(?:R\$\s*)?([\d.,]+)/i.exec(plain);
    if (valFreteMatch) valorFrete = parsePtBrNumber(valFreteMatch[1]);

    if (/fob/i.test(plain) && !/cif/i.test(plain)) {
      tipoFrete = 'FOB';
    }

    const cfopMatch = /(?:cfop)\s*:?\s*(\d{4})/i.exec(plain);
    if (cfopMatch) cfop = cfopMatch[1];

    const natMatch = /(?:natureza|tipo\s*op(?:era[çc][ãa]o)?)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i.exec(plain);
    if (natMatch) natureza = natMatch[1].trim();

    // Notas Fiscais vinculadas
    const notasFiscais = this.extractNotasFiscais(html, plain);

    // Histórico de Rastreamento / Ocorrências
    const historico = this.extractTrackingEvents(html, plain);

    // Comprovante de Entrega
    const comprovanteEntrega = this.extractComprovanteEntrega(html, plain);

    // Status Consolidado
    let status = 'Em Trânsito';
    let situacaoAtual = historico.length > 0 ? historico[0].descricao : undefined;

    if (comprovanteEntrega?.dataEntrega || /entregue|entrega\s+realizada/i.test(plain)) {
      status = 'Entregue';
    } else if (/sa[íi]da\s+para\s+entrega|em\s+rota/i.test(plain)) {
      status = 'Em Rota';
    } else if (/retid[ao]|ocorr[êe]ncia\s+3|pend[êe]ncia/i.test(plain)) {
      status = 'Retido';
    } else if (/cancelad[ao]/i.test(plain)) {
      status = 'Cancelado';
    }

    return {
      ctrc: ctrc || 'CTRC',
      serie: serie || (ctrc.includes('-') ? ctrc.split('-')[0] : 'BCA'),
      numero: numero || ctrc,
      chaveCte,
      dataEmissao: dataEmissao || new Date().toLocaleDateString('pt-BR'),
      dataPrevisao,
      unidadeEmissora,
      unidadeDestino: unidadeDestino || (cidadeDestino ? cidadeDestino.substring(0, 3).toUpperCase() : undefined),
      cidadeDestino,
      ufDestino,
      remetente,
      destinatario,
      pesoBruto: pesoBruto || 1,
      pesoCubado,
      volumes: volumes || 1,
      especie,
      m3,
      valorMercadoria,
      valorFrete,
      tipoFrete,
      natureza,
      cfop,
      status,
      situacaoAtual,
      notasFiscais,
      historico,
      comprovanteEntrega,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Extrai a tabela de Notas Fiscais associadas ao CTRC.
   */
  private static extractNotasFiscais(html: string, plain: string): Ssw101NotaFiscalDTO[] {
    const nfs: Ssw101NotaFiscalDTO[] = [];

    // Procura por tabela de NF no HTML
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    let isNfSection = false;

    for (const row of rows) {
      const rowText = stripHtml(row);
      if (/notas?\s*fiscais?|dados\s*das?\s*nfs?|nfe|nro\s*nf/i.test(rowText)) {
        isNfSection = true;
      }

      if (isNfSection) {
        const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
          .map(c => stripHtml(c));

        if (cells.length >= 2) {
          const nfMatch = /^(\d{1,9})$/.exec(cells[0]) || /(?:nf|nota)\s*:?\s*(\d+)/i.exec(cells[0]);
          if (nfMatch) {
            const numero = nfMatch[1];
            let serie = '1';
            let valor = 0;
            let peso = 0;
            let volumes = 1;
            let chaveNfe: string | undefined = undefined;

            for (let i = 1; i < cells.length; i++) {
              const val = cells[i];
              if (val.length === 44 && /^\d+$/.test(val)) {
                chaveNfe = val;
              } else if (val.includes('R$') || /^\d{1,3}(\.\d{3})*,\d{2}$/.test(val)) {
                valor = parsePtBrNumber(val);
              } else if (/^\d{1,6}(?:,\d+)?$/.test(val) && peso === 0 && !val.includes('/')) {
                peso = parsePtBrNumber(val);
              }
            }

            nfs.push({
              numero,
              serie,
              valor,
              peso,
              volumes,
              chaveNfe
            });
          }
        }
      }
    }

    // Se não achou em tabelas, busca via regex direto no texto simples
    if (nfs.length === 0) {
      const nfMatches = plain.matchAll(/(?:nf|nota\s*fiscal|nro\s*nf)\s*(?:n[º°o]?)?\s*:?\s*(\d{1,9})/gi);
      for (const m of nfMatches) {
        if (!nfs.some(n => n.numero === m[1])) {
          nfs.push({
            numero: m[1],
            serie: '1',
            volumes: 1
          });
        }
      }
    }

    return nfs;
  }

  /**
   * Extrai os eventos da timeline de rastreamento / histórico de ocorrências.
   */
  private static extractTrackingEvents(html: string, plain: string): Ssw101TrackingEventDTO[] {
    const events: Ssw101TrackingEventDTO[] = [];

    // Procura linhas contendo datas no formato DD/MM/AAAA e horários HH:MM
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rows) {
      const cells = (row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
        .map(c => stripHtml(c));

      if (cells.length < 2) continue;

      let dataHora = '';
      let codigo = '';
      let descricao = '';
      let unidade = '';
      let observacao = '';
      let manifesto = '';

      for (let i = 0; i < cells.length; i++) {
        const text = cells[i];

        // Data / Hora
        const dtMatch = /^(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?)$/.exec(text);
        if (dtMatch && !dataHora) {
          dataHora = dtMatch[1];
          continue;
        }

        // Código de ocorrência (00 a 99 ou string até 4 dígitos)
        const codMatch = /^(\d{1,4})$/.exec(text);
        if (codMatch && !codigo && dataHora) {
          codigo = codMatch[1].padStart(2, '0');
          continue;
        }

        // Unidade (3 letras maiúsculas: VGA, SPO, BHZ, etc.)
        if (/^[A-Z]{3}$/.test(text) && !unidade) {
          unidade = text;
          continue;
        }

        // Manifesto (número com MAN ou 5-8 dígitos)
        const manMatch = /(?:man(?:ifesto)?\s*:?\s*)?(\d{5,8})/i.exec(text);
        if (manMatch && !manifesto && (text.toLowerCase().includes('man') || text.toLowerCase().includes('viagem'))) {
          manifesto = manMatch[1];
        }

        // Descrição do evento
        if (text.length >= 3 && !descricao && !/^\d+$/.test(text) && !/^\d{2}\//.test(text) && !/^[A-Z]{3}$/.test(text)) {
          descricao = text;
          continue;
        }

        // Observação adicional
        if (descricao && text.length > 2 && text !== descricao && !/^\d{2}\//.test(text)) {
          observacao = observacao ? `${observacao} | ${text}` : text;
        }
      }

      if (dataHora && (descricao || codigo)) {
        events.push({
          dataHora,
          codigo: codigo || '00',
          descricao: descricao || 'EVENTO REGISTRADO',
          unidade: unidade || 'VGA',
          observacao: observacao || undefined,
          manifesto: manifesto || undefined
        });
      }
    }

    // Se nenhuma tabela foi encontrada, tenta capturar por regex no texto corrido
    if (events.length === 0) {
      const eventMatches = plain.matchAll(/(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2})?)\s*[-:]?\s*(?:(?:OC|OCORR[ÊE]NCIA)\s*(\d{1,4}))?\s*[-:]?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?=(?:\d{2}\/\d{2}\/|$))/gi);
      for (const m of eventMatches) {
        events.push({
          dataHora: m[1].trim(),
          codigo: (m[2] || '00').padStart(2, '0'),
          descricao: m[3].trim(),
          unidade: 'VGA'
        });
      }
    }

    return events;
  }

  /**
   * Extrai dados do comprovante de entrega / canhoto.
   */
  private static extractComprovanteEntrega(html: string, plain: string): Ssw101CtrcDetailDTO['comprovanteEntrega'] {
    let recebedor: string | undefined = undefined;
    let documento: string | undefined = undefined;
    let dataEntrega: string | undefined = undefined;
    let temCanhoto = false;
    let urlCanhoto: string | undefined = undefined;

    const recMatch = /(?:recebedor|recebido\s+por|entregue\s+a)\s*:?\s*([^-\n\r,]+)/i.exec(plain);
    if (recMatch) recebedor = recMatch[1].trim();

    const docMatch = /(?:doc(?:umento)?|rg|cpf)\s*(?:recebedor)?\s*:?\s*([\d.-]+)/i.exec(plain);
    if (docMatch) documento = docMatch[1].trim();

    const dtEntMatch = /(?:data\s+entrega|entregue\s+em)\s*:?\s*(\d{2}\/\d{2}\/(?:\d{2}|\d{4})(?:\s+\d{2}:\d{2})?)/i.exec(plain);
    if (dtEntMatch) dataEntrega = dtEntMatch[1].trim();

    if (html.toLowerCase().includes('canhoto') || html.toLowerCase().includes('comprovante') || html.toLowerCase().includes('ssw0424') || html.toLowerCase().includes('.jpg')) {
      temCanhoto = true;
      const imgMatch = /<img[^>]+src=["']([^"']*(?:canhoto|comprovante|ssw)[^"']*)["']/i.exec(html);
      if (imgMatch) {
        urlCanhoto = imgMatch[1];
      }
    }

    if (recebedor || dataEntrega || temCanhoto) {
      return {
        recebedor,
        documento,
        dataEntrega,
        temCanhoto,
        urlCanhoto
      };
    }

    return undefined;
  }
}
