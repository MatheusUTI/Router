import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';
import { Ctrc, AppUser } from '../types';
import { DEFAULT_OPERATIONAL_UNIT } from '../constants/operationalUnits';

interface ImportacaoViewProps {
  onAddCtrcs: (newCtrcs: Ctrc[]) => void;
  adminUser?: AppUser;
}

// Exact Camilo dos Santos ERP output from user prompt
const CAMILO_DOS_SANTOS_RAW = `0;RODOVIARIO CAMILO DOS SANTOS  ;CTRCs EXPEDIDOS E RECEBIDOS;PREVISAO DE ENTREGA: 22/05/26 A 27/05/26;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
1;Serie/Numero CTRC;Cliente Remetente;Cliente Pagador;Cliente Destinatario;Endereco do Destinatario;Bairro do Destinatario;Setor de Destino;Praca de Destino;Cidade do Destinatario;Cliente Recebedor;Local de Entrega;Endereco;Bairro;Cidade de Entrega;Unidade Receptora;Numero da Nota Fiscal;Peso Real em Kg;Quantidade de Volumes;Valor da Mercadoria;Valor do Frete;TDE;Agendamento;Codigo da Ultima Ocorrencia;Data de inclusao da Ultima Ocorrencia;Data da Ultima Ocorrencia;Usuario da Ultima Ocorrencia;Unidade da Ultima Ocorrencia;Descricao da Ultima Ocorrencia;Latitude da Ultima Ocorrencia;Longitude da Ultima Ocorrencia;Previsao de Entrega;Entrega Programada;Data da Entrega Realizada;Quantidade de Dias de Atraso;Localizacao Atual;Data do Cancelamento;Motivo do Cancelamento;Codigo dos Correios
2;VGA433233-4;MARELLI COFAP DO BRASIL LTDA.;MARELLI COFAP DO BRASIL LTDA.;COMPANHIA BRASILEIRA DE DISTRIBUICAO AUTOMOTIVA S.A;R HUMBERTO PIZZO 20 LETRA A;JARDIM CANAA;99;VGAP;VARGINHA;COMPANHIA BRASILEIRA DE DISTRIBUICAO AUTOMOTIVA S.A;;;;VARGINHA;VGA;368498;169,58;20;26919,32;316,9;150;0;30;22/05/2026;22/05/2026;tmoreira;RCS - MTZ;COMPANHIA BRASILEIRA;;;26/05/2026;;;0;RCS VGA-CT-e autorizado com 20 volumes e 170 Kg. Destino: MG/VARGINHA. Previsao de entrega: 26/05/26;;;
2;CPQ854800-5;HONDA AUTOMOVEIS DO BRASIL LTDA;HONDA AUTOMOVEIS DO BRASIL LTDA;MIGOTO COMERCIO DE VEICULOS LTDA;AVENIDA PRINCESA DO SUL 830 ;JARDIM ANDERE;01  ROTA 1;VGAP;VARGINHA;MIGOTO COMERCIO DE VEICULOS LTDA;;;;VARGINHA;VGA;5917913;6,615;5;5925;65,86;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ854847-1;HONDA AUTOMOVEIS DO BRASIL LTDA;HONDA AUTOMOVEIS DO BRASIL LTDA;MIGOTO COMERCIO DE VEICULOS LTDA;AVENIDA PRINCESA DO SUL 830 ;JARDIM ANDERE;01  ROTA 1;VGAP;VARGINHA;MIGOTO COMERCIO DE VEICULOS LTDA;;;;VARGINHA;VGA;5917649;19,18;2;3402,45;103,65;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ854892-7;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;UNIFENAS UNIVERS. DO ROSARIO V;ARTHUR BERNARDES 717 CENTRO;.;02  ROTA 2;VGAP;ALFENAS;UNIFENAS UNIVERS. DO ROSARIO V;UNIVERSIDADE JOSE DO ROSARIO VELLANO- UNIFENAS;R. JOAO DE CAMARGO , 520;CENTRO;ALFENAS;VGA;180985;21,2;6;2302,2;77,16;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ854901-0;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;ASSOCIACAO CULTURAL PROF. ROQUE TAMBURIN;RUA TARGINO NOGUEIRA 144 ;VILA NOGUEIRA;01  ROTA 1;VGAP;VARGINHA;ASSOCIACAO CULTURAL PROF. ROQUE TAMBURIN;;;;VARGINHA;VGA;181152;3,092;1;1134,3;41,98;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855058-1;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;MOTO STAR T C LTDA;AVENIDA REI PELE 1361 ;JARDIM NOVO HORIZONTE;05  ROTA 5;VGAP;TRES CORACOES;MOTO STAR T C LTDA;;;;TRES CORACOES;VGA;16412544;10,135;8;3115,01;65,35;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855065-4;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;GUIOMOTO LTDA;AV ANTONIO JUNQUEIRA DE SOUZA 321 ;CENTRO;07  ROTA 7;VGAP;SAO LOURENCO;GUIOMOTO LTDA;;;;SAO LOURENCO;VGA;16412523;12,35;9;4128,92;70,34;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855066-2;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;BY MOTO LAVRAS VEICULOS E PECA;AV ERNESTO MATIOLI 860 ;PLANALTO;06  ROTA 6;VGAP;LAVRAS;BY MOTO LAVRAS VEICULOS E PECA;;;;LAVRAS;VGA;16412634;15,73;10;4579,74;86,97;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855072-7;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;BRENO MOTOS LTDA;AV ARLINDO FIGUEIREDO 2029 ;SAO FRANCISCO;10  ROTA 10;VGAR;PASSOS;BRENO MOTOS LTDA;;;;PASSOS;VGA;16412806;5,7;6;1554,81;65,07;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;BHZ907302-7;CLARA COMERCIO DE COSMETICOS L;CLARA COMERCIO DE COSMETICOS L;ROBERTA MACHADO VASCONCELOS MESQUITA;R LUCIANO PEREIRA PENHA 36 LOJA 1;CENTRO;05  ROTA 5;VGAP;TRES CORACOES;ROBERTA MACHADO VASCONCELOS MESQUITA;;;;TRES CORACOES;VGA;59992;40;4;1915,74;109,18;0;0;59;22/05/2026;22/05/2026;danielk;RCS - VGA;Chegada na unidade VARGINHA em 22/05/26, 07:25h.;;;25/05/2026;;;0;RCS VGA - VARGINHA - APONTADO PARA ENTREGA - VEICULO: CSF5246;;;
2;BHZ907482-1;MAXIBRASIL INDUSTRIA DE COSMET;MAXIBRASIL INDUSTRIA DE COSMET;MAGALHAES;AVENIDA PEDRO SALES 167 ;CENTRO;06  ROTA 6;VGAP;LAVRAS;MAGALHAES;;;;LAVRAS;VGA;154360;121,447;23;6870,76;321,34;0;0;60;23/05/2026;23/05/2026;danielk;RCS - VGA;Saida para entrega na cidade de LAVRAS.;;;25/05/2026;;;0;RCS VGA - EM ENTREGA;;;
9;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;`;

export default function ImportacaoView({ onAddCtrcs, adminUser }: ImportacaoViewProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>('');
  
  // Custom header selection state
  const [lines, setLines] = useState<string[]>([]);
  const [headerLineIndex, setHeaderLineIndex] = useState<number>(-1); // -1 = unselected
  const [delimiter, setDelimiter] = useState<string>(';');
  const [removePrefix, setRemovePrefix] = useState<boolean>(true);

  // Field mappings state (associated column headers) initialized from localStorage
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('rota_operational_saved_layout_mapping');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Falha ao ler layout salvo:', e);
    }
    return {
      id: '',
      destinatario: '',
      cidade: '',
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
    };
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const loadCsvContent = (text: string) => {
    setCsvRawText(text);
    // Split into individual non-empty lines
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    setLines(rawLines);

    // Auto-detect Semicolon vs Comma
    let detectedDelimiter = ';';
    if (rawLines.length > 0) {
      const commas = (rawLines[0].match(/,/g) || []).length;
      const semicolons = (rawLines[0].match(/;/g) || []).length;
      if (commas > semicolons) {
        detectedDelimiter = ',';
      }
    }
    setDelimiter(detectedDelimiter);

    // Auto-detect header row line: Find the row containing 'ctrc' or 'cliente'
    let bestHeaderIdx = 0; // Default to line 1
    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
      const lower = rawLines[i].toLowerCase();
      if (lower.includes('ctrc') || lower.includes('numero') || lower.includes('destinatario')) {
        bestHeaderIdx = i;
        break;
      }
    }
    setHeaderLineIndex(bestHeaderIdx);

    // Auto-detect prefix pattern (e.g. "1;Serie/Numero" or "2;VGA")
    let hasPrefixes = false;
    if (rawLines.length > 1) {
      hasPrefixes = rawLines.slice(0, 3).every(line => /^\d+[;,]/.test(line));
    }
    setRemovePrefix(hasPrefixes);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        loadCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        loadCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadDemo = () => {
    setFileName("sistema_camilosantos_export.csv");
    loadCsvContent(CAMILO_DOS_SANTOS_RAW);
    setSuccessMsg(null);
  };

  const cleanPrefix = (lineStr: string) => {
    if (!removePrefix) return lineStr;
    const regex = new RegExp(`^\\d+\\s*\\${delimiter}`);
    return lineStr.replace(regex, '');
  };

  const getExtractedHeaders = (): string[] => {
    if (headerLineIndex === -1 || !lines[headerLineIndex]) return [];
    const lineWithCleanedPrefix = cleanPrefix(lines[headerLineIndex]);
    return lineWithCleanedPrefix.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
  };

  const extractedHeaders = getExtractedHeaders();

  // Save changes directly in state and persists inside local storage
  const handleMapChange = (field: string, csvHeader: string) => {
    setMappings(prev => {
      const next = { ...prev, [field]: csvHeader };
      localStorage.setItem('rota_operational_saved_layout_mapping', JSON.stringify(next));
      return next;
    });
  };

  // Run auto-mapping logic based on keywords
  const triggerAutoMapping = () => {
    const newMappings = {
      id: '',
      destinatario: '',
      cidade: '',
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
    };

    extractedHeaders.forEach((h) => {
      const lower = h.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');

      // 1. CÓDIGO OCORRÊNCIA
      if (
        lower === 'cod ocorr' || 
        lower === 'codigo ocorrencia' || 
        lower === 'código de ocorrência' || 
        lower === 'ocorrencia' || 
        lower === 'ocorrência' || 
        lower.includes('cod ocorr') || 
        lower.includes('codigo da ultima ocorrencia')
      ) {
        newMappings.ocorrencia = h;
      }
      // 2. DESCRIÇÃO OCORRÊNCIA
      else if (
        lower === 'descricao ocorrencia' || 
        lower === 'descrição de ocorrência' || 
        lower === 'motivo' || 
        lower.includes('descricao da ultima ocorrencia') || 
        lower.includes('descricao oco') || 
        lower.includes('descrição')
      ) {
        newMappings.descricao_ocorr = h;
      }
      // 3. PREVISÃO ENTREGA
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
        newMappings.prev_ent = h;
      }
      // 4. CIDADE DE ENTREGA
      else if (
        lower === 'cidade entrega' || 
        lower === 'cidade de entrega' || 
        lower === 'cidade ent' || 
        lower === 'cidade_ent' || 
        lower === 'cidade destino' || 
        lower === 'cidade do destinatario' || 
        lower === 'cidade_entrega' || 
        lower.includes('cidade') || 
        lower.includes('municipio') || 
        lower.includes('município') || 
        lower.includes('praca') || 
        lower.includes('praça') ||
        lower.includes('localidade')
      ) {
        newMappings.cidade = h;
      }
      // 5. DESTINATÁRIO
      else if (
        lower === 'destinatario' || 
        lower === 'destinatário' || 
        lower === 'dst' || 
        lower === 'dest' || 
        lower === 'cliente destino' || 
        lower === 'cliente destinatario' || 
        lower === 'dest_nome' || 
        lower === 'nome dest' || 
        lower.includes('destinatario') || 
        lower.includes('destinatário') || 
        lower.includes('recebedor') ||
        lower.includes('cliente')
      ) {
        newMappings.destinatario = h;
      }
      // 6. CTRC / DOCUMENTO / CTE
      else if (
        lower === 'ctrc' || 
        lower === 'cte' || 
        lower === 'documento' || 
        lower.includes('ctrc') || 
        lower.includes('numero') || 
        lower.includes('número')
      ) {
        newMappings.id = h;
      }
      // 7. REMETENTE
      else if (
        lower === 'remetente' || 
        lower === 'cliente remetente' || 
        lower.includes('remetente')
      ) {
        newMappings.remetente = h;
      }
      // 8. SETOR / ROTA
      else if (
        lower === 'setor' || 
        lower === 'setor destino' || 
        lower === 'rota' || 
        lower.includes('setor') || 
        lower.includes('rota')
      ) {
        newMappings.setor = h;
      }
      // 9. PESO
      else if (
        lower === 'peso' || 
        lower === 'peso real' || 
        lower === 'peso_r' || 
        lower.includes('peso') || 
        lower.includes('weight') || 
        lower.includes('kg')
      ) {
        newMappings.weight = h;
      }
      // 10. VOLUMES
      else if (
        lower === 'volumes' || 
        lower === 'qtde volumes' || 
        lower === 'quantidade de volumes' || 
        lower.includes('volume') || 
        lower.includes('qtde')
      ) {
        newMappings.volume = h;
      }
      // 11. VALOR
      else if (
        lower === 'valor' || 
        lower === 'valor mercadoria' || 
        lower === 'valor_mercadoria' || 
        lower.includes('valor da mercadoria') || 
        lower.includes('valor mercadoria')
      ) {
        newMappings.valor = h;
      }
      // 12. FRETE
      else if (
        lower === 'frete' || 
        lower === 'valor frete' || 
        lower.includes('valor do frete') || 
        lower.includes('frete')
      ) {
        newMappings.frete = h;
      }
      // 13. LOCALIZAÇÃO
      else if (
        lower === 'localizacao' || 
        lower === 'localização' || 
        lower === 'posicao' || 
        lower === 'posição' || 
        lower.includes('localizacao') || 
        lower.includes('localização') || 
        lower.includes('posicao') || 
        lower.includes('posição')
      ) {
        newMappings.localizacao = h;
      }
      // 14. PAGADOR
      else if (
        lower === 'pagador' || 
        lower === 'cliente pagador' || 
        lower.includes('pagador')
      ) {
        newMappings.pagador = h;
      }
      // 15. UNIDADE
      else if (
        lower === 'unidade' || 
        lower === 'unid' || 
        lower === 'unid entrega' || 
        lower === 'unid_entrega' || 
        lower.includes('unidade') || 
        lower.includes('unid')
      ) {
        newMappings.unid = h;
      }
    });

    setMappings(newMappings);
    localStorage.setItem('rota_operational_saved_layout_mapping', JSON.stringify(newMappings));
  };

  const handleResetMappings = () => {
    const cleared = {
      id: '',
      destinatario: '',
      cidade: '',
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
    };
    setMappings(cleared);
    localStorage.removeItem('rota_operational_saved_layout_mapping');
  };

  const parsePtBrFloat = (val: string | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    
    let clean = String(val).trim();
    if (!clean) return 0;
    
    // Remove currency prefixes/suffixes and spaces
    clean = clean.replace(/(?:R\$|USD|\$|\s)/gi, '');
    
    // Keep only digits, negative signs, dots, and commas
    clean = clean.replace(/[^0-9.,-]/g, '');
    
    if (!clean) return 0;
    
    // Identify separators
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        // Comma is decimal separator (e.g., 1.234,56)
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // Dot is decimal separator (e.g., 1,234.56)
        clean = clean.replace(/,/g, '');
      }
    } else if (lastComma !== -1) {
      // Single/multiple commas only
      const commasCount = (clean.match(/,/g) || []).length;
      if (commasCount === 1) {
        clean = clean.replace(',', '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    } else if (lastDot !== -1) {
      // Single/multiple dots only
      const dotsCount = (clean.match(/\./g) || []).length;
      if (dotsCount === 1) {
        const parts = clean.split('.');
        const decimalPart = parts[1] || '';
        // If exactly 3 digits after dot, treat as thousands separator (e.g., "1.200" kg/R$)
        if (decimalPart.length === 3) {
          clean = clean.replace(/\./g, '');
        }
      } else {
        clean = clean.replace(/\./g, '');
      }
    }
    
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Generate parsed records for live feedback / database saving
  const parseRows = (): Ctrc[] => {
    if (headerLineIndex === -1 || lines.length <= headerLineIndex + 1) return [];

    const columnHeaders = extractedHeaders;
    const idIdx = columnHeaders.indexOf(mappings.id);
    const destIdx = columnHeaders.indexOf(mappings.destinatario);
    const cityIdx = columnHeaders.indexOf(mappings.cidade);
    
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

    // We collect data rows lying strictly BELOW the selected header row line
    const dataLines = lines.slice(headerLineIndex + 1);
    const results: Ctrc[] = [];

    dataLines.forEach((rawLine, idx) => {
      const cleaned = cleanPrefix(rawLine);
      const cells = cleaned.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      
      // If the row cells are mostly empty or shorter than critical index, skip it
      if (cells.length < 2 || cells.every(c => c === '')) return;

      const idVal = idIdx !== -1 ? cells[idIdx] : '';
      const destVal = destIdx !== -1 ? cells[destIdx] : '';
      const cityVal = cityIdx !== -1 ? cells[cityIdx] : '';

      // Skip invalid or trailer rows
      if (!idVal && !destVal) return;

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

      results.push({
        id: idVal ? idVal : `CTRC #${90400 + idx}`,
        destinatario: destVal || 'Destinatário Desconhecido',
        cidade: cityVal || 'Ponto de Distribuição',
        cidade_ent: cityVal || undefined,
        weight: weightVal || 150,
        volume: volumesVal || 2,
        type: (weightVal > 1000) ? 'CURVA A' : 'NORMAL',
        status: 'Pendente',
        setor: setorVal || undefined,
        prev_ent: prevVal || undefined,
        remetente: remVal || undefined,
        pagador: pagVal || undefined,
        nf: nfVal || undefined,
        valor: valVal || undefined,
        frete: freVal || undefined,
        unid: uniVal || adminUser?.unid || DEFAULT_OPERATIONAL_UNIT,
        ocorrencia: ocoVal || undefined,
        descricao_ocorr: descOcoVal || undefined,
        localizacao: locVal || undefined,
      });
    });

    return results;
  };

  const parsedRecords = parseRows();
  const previewCollection = parsedRecords.slice(0, 5); // display first 5

  const handleApplyMapping = () => {
    if (!mappings.id || !mappings.destinatario || !mappings.cidade) {
      alert("Por favor, preencha ao menos as associações obrigatórias: ID CTRC, Destinatário e Cidade de Destino.");
      return;
    }

    if (parsedRecords.length === 0) {
      alert("Nenhum registro de CTRC válido pôde ser extraído com a configuração atual. Altere a linha do cabeçalho.");
      return;
    }

    onAddCtrcs(parsedRecords);
    setSuccessMsg(`Importação realizada com sucesso de ${parsedRecords.length} CTRCs vindos do arquivo local! Eles acabaram de ser anexados ao painel operacional e estão prontos para a formulação do seu Romaneio.`);
    
    // reset file states only while retaining mappings layout on local storage
    setFileName(null);
    setLines([]);
    setHeaderLineIndex(-1);
    setCsvRawText('');
  };

  const isMappingSaved = Object.values(mappings).some(v => v !== '');

  const MAPPABLE_FIELDS = [
    { key: 'id', label: 'ID ou Número do CTRC / Manifesto', required: true },
    { key: 'destinatario', label: 'Cliente Recebedor / Destinatário', required: true },
    { key: 'cidade', label: 'Cidade de Entrega', required: true },
    { key: 'weight', label: 'Peso Real em Kg', required: false },
    { key: 'volume', label: 'Quantidade de Volumes', required: false },
    { key: 'remetente', label: 'Cliente Remetente (CNPJ/Parceiro)', required: false },
    { key: 'pagador', label: 'Cliente Pagador', required: false },
    { key: 'nf', label: 'Número da Nota Fiscal (NF)', required: false },
    { key: 'valor', label: 'Valor da Mercadoria (R$)', required: false },
    { key: 'frete', label: 'Valor do Frete (R$)', required: false },
    { key: 'setor', label: 'Setor de Rota / Setorização', required: false },
    { key: 'prev_ent', label: 'Previsão de Entrega (Data)', required: false },
    { key: 'unid', label: 'Unidade Receptora', required: false },
    { key: 'ocorrencia', label: 'Código da Última Ocorrência', required: false },
    { key: 'descricao_ocorr', label: 'Descrição da Ocorrência', required: false },
    { key: 'localizacao', label: 'Localização Física Atual', required: false },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-3xl font-extrabold text-[#dae2fd] tracking-tight">Importação & Governança de Manifestos</h2>
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
          <p className="text-sm text-[#9cb4e4] leading-relaxed max-w-2xl">
            Mapeie as colunas na primeira vez e o layout continuará salvo! Use qualquer ERP corporativo de mercadoria (formato CSV/TXT), localize a linha de cabeçalhos e realize a harmonização de-para com o nosso banco relacional de forma imediata.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101524] border border-primary/20 text-xs font-semibold text-primary shadow-inner">
            <span className="material-symbols-outlined text-[16px] animate-pulse">pin_drop</span>
            <span>Unidade Operativa:</span> 
            <span className="font-mono bg-primary text-on-primary px-2 py-0.5 rounded text-xs font-bold shadow-sm">{adminUser?.unid || DEFAULT_OPERATIONAL_UNIT}</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-primary/10 border border-primary/20 text-on-surface p-4 rounded-xl flex items-start gap-3 relative overflow-hidden backdrop-blur-sm animate-scale-up">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-primary" />
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified_user
          </span>
          <div>
            <p className="text-xs font-bold text-white">Banco de Dados Complementado</p>
            <p className="text-[11px] text-[#9cb4e4] mt-0.5 leading-normal">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Main step grid flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* STEP 1 & 2: Load File & Choose Header Row */}
        <div className="lg:col-span-7 bg-[#161d30] border border-outline-variant rounded-2xl p-6 shadow-xl space-y-6">
          
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded bg-primary-container text-on-primary-container text-[11px] flex items-center justify-center font-bold">1</span>
              Carregar Arquivo Sistema ERP
            </h3>
            <p className="text-[11px] text-[#9cb4e4] mb-4">
              Arraste seu arquivo de faturamento operacional ou use o botão para carregar.
            </p>

            {/* Drag & Drop Frame */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? 'border-primary bg-primary-container/10 scale-[0.99]'
                  : 'border-outline-variant hover:border-[#4d8eff]/50 hover:bg-[#1f2945]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.txt"
                onChange={handleFileChange}
              />
              
              <div className="w-12 h-12 rounded-full bg-[#1b2540] flex items-center justify-center border border-outline-variant mb-3 text-primary shadow-inner">
                <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  upload_file
                </span>
              </div>
              
              <p className="text-[11px] font-semibold text-white">Solte o arquivo do manifesto bruto aqui</p>
              <p className="text-[10px] text-[#9cb4e4] mt-1 font-mono">Formato CSV ou TXT (Separadores comuns carregados automaticamente)</p>

              <div className="flex gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary hover:bg-[#3d7edf] text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-[0.98]"
                >
                  Procurar Arquivo
                </button>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#dae2fd] border border-slate-700 text-xs font-semibold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px] text-primary">cloud_download</span>
                  Usar Arquivo de Exemplo (Camilo)
                </button>
              </div>
            </div>

            {fileName && (
              <div className="mt-3 bg-[#111624] p-3 rounded-xl border border-outline-variant/60 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">lab_profile</span>
                  <span className="text-xs font-mono text-white truncate font-semibold">{fileName}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-primary bg-[#4d8eff]/10 px-2 py-0.5 rounded-full font-mono">
                  {lines.length} linhas
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Line selection as header */}
          {lines.length > 0 && (
            <div className="pt-4 border-t border-outline-variant/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded bg-primary-container text-on-primary-container text-[11px] flex items-center justify-center font-bold">2</span>
                  Selecione a Linha de Cabeçalho do Arquivo
                </h3>
                <p className="text-[11px] text-[#9cb4e4] leading-relaxed">
                  Toque na linha do documento que discrimina os nomes das colunas físicas.
                </p>
              </div>

              {/* Parsing global settings config */}
              <div className="bg-[#111624] p-3 rounded-lg border border-outline-variant/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#dae2fd] block mb-1">Separador de Colunas</label>
                  <select
                    value={delimiter}
                    onChange={(e) => {
                      setDelimiter(e.target.value);
                    }}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 rounded px-2.5 py-1 text-xs text-[#dae2fd] focus:outline-none"
                  >
                    <option value=";">Ponto-e-vírgula ( ; )</option>
                    <option value=",">Vírgula ( , )</option>
                    <option value="\t">Tabulação ( TAB )</option>
                  </select>
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[#dae2fd] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removePrefix}
                      onChange={(e) => setRemovePrefix(e.target.checked)}
                      className="w-4 h-4 bg-[#1b2540] border border-outline-variant/60 rounded accent-primary cursor-pointer"
                    />
                    <span>Remover ID de controle de Linha (ex: \'1;\', \'2;\')</span>
                  </label>
                </div>
              </div>

              {/* Rows List Selector */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 select-none border border-outline-variant/40 rounded-xl p-2.5 bg-[#121828]">
                {lines.slice(0, 10).map((line, idx) => {
                  const isSelected = headerLineIndex === idx;
                  const displayLine = line.length > 100 ? `${line.substring(0, 100)}...` : line;
                  return (
                    <div
                      key={idx}
                      onClick={() => setHeaderLineIndex(idx)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center md:items-start gap-3 justify-between ${
                        isSelected
                          ? 'bg-[#1b2b4d] border-primary text-white shadow-md'
                          : 'bg-[#181f33] border-outline-variant/30 hover:border-outline-variant text-[#9cb4e4] hover:bg-[#1a233b]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-primary' : 'border-outline-variant/60'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </span>
                        <div className="space-y-0.5 text-left">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-90">Linha {idx + 1}</p>
                          <p className="text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] md:max-w-xl">{displayLine}</p>
                        </div>
                      </div>
                      {idx === 1 && (
                        <span className="text-[9px] bg-emerald-500/25 text-emerald-300 font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-widest hidden md:block">
                          Cabeçalho Comum
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* STEP 3: Attribute De-Para Column Pairing Map */}
        <div className="lg:col-span-5 bg-[#161d30] border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col justify-between self-stretch">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary-container text-on-primary-container text-[11px] flex items-center justify-center font-bold">3</span>
                De-Para de Atributos do Schema
              </h3>
            </div>
            
            {isMappingSaved && (
              <div className="mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-[10.5px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  Layout anterior carregado automaticamente.
                </span>
                <button
                  onClick={handleResetMappings}
                  className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded text-[9.5px] font-bold hover:bg-rose-500/35 transition-colors"
                >
                  Remapear do Zero
                </button>
              </div>
            )}

            <p className="text-[11px] text-[#9cb4e4] mb-4">
              Associe as colunas físicas mapeadas aos campos correspondentes do sistema. Os dados preenchidos facilitam cálculos avançados.
            </p>

            {extractedHeaders.length === 0 ? (
              <div className="py-24 text-center text-[#9cb4e4] bg-[#111624] border border-outline-variant/50 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                <span className="material-symbols-outlined text-[36px] text-slate-600 animate-pulse">border_all</span>
                <span className="text-xs font-semibold text-white">De-Para Desativado</span>
                <span className="text-[10px] text-[#9cb4e4]/70 max-w-[220px]">Indique acima qual linha representa o cabeçalho para carregar as colunas.</span>
              </div>
            ) : (
              <div className="space-y-3.5 text-left max-h-[380px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    onClick={triggerAutoMapping}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-primary text-xs font-bold rounded-lg flex items-center justify-center gap-1 border border-primary/25"
                  >
                    <span className="material-symbols-outlined text-[14px]">magic_button</span>
                    Auto-Configurar
                  </button>
                  <button
                    onClick={handleResetMappings}
                    className="py-1.5 bg-slate-900 hover:bg-slate-850 text-rose-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 border border-outline-variant/40"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Limpar Tudo
                  </button>
                </div>

                {MAPPABLE_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1 bg-[#111624]/60 p-2.5 rounded-lg border border-outline-variant/35">
                    <label className="text-[11.5px] font-bold text-[#dae2fd] flex items-center gap-1">
                      {field.label} {field.required && <span className="text-rose-500 font-mono">*</span>}
                    </label>
                    <select
                      value={mappings[field.key] || ''}
                      onChange={(e) => handleMapChange(field.key, e.target.value)}
                      className="w-full bg-[#1b2540] border border-outline-variant/60 hover:border-slate-500 rounded px-2 py-1 text-xs text-[#dae2fd] focus:outline-none focus:border-primary"
                    >
                      <option value="">{field.required ? '-- Campo Obrigatório --' : '-- Ignorar este campo --'}</option>
                      {extractedHeaders.map((h, i) => (
                        <option key={i} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-outline-variant/30 flex justify-between items-center gap-4">
            <span className="text-[10px] text-[#9cb4e4] font-mono leading-tight">
              {parsedRecords.length > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  {parsedRecords.length} registros prontos
                </span>
              ) : (
                '0 registros carregados'
              )}
            </span>
            <button
              disabled={extractedHeaders.length === 0 || !mappings.id || !mappings.destinatario || !mappings.cidade}
              onClick={handleApplyMapping}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow ${
                extractedHeaders.length === 0 || !mappings.id || !mappings.destinatario || !mappings.cidade
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-primary hover:bg-[#4d8eff] text-white shadow-lg'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Confirmar e Carregar para Rota
            </button>
          </div>
        </div>

      </div>

      {/* STEP 4: Live Simulated CTRC database Preview */}
      {previewCollection.length > 0 && (
        <div className="bg-[#161d30] border border-outline-variant rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">quick_reference_all</span>
                Visualização de Amostra Operacional (Primeiros 5 Linhas Extraídas)
              </h3>
              <p className="text-[11px] text-[#9cb4e4] mt-0.5">
                Valide os de-paras aplicados visualizando os atributos brutos extraídos do seu ERP.
              </p>
            </div>
            <div className="text-[10px] font-mono bg-[#111624] border border-outline-variant px-3 py-1 rounded-xl text-[#dae2fd]">
              UTF-8 CSV Decoder
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-outline-variant/50 bg-[#111624]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#12192a] border-b border-outline-variant/60 text-[#dae2fd]/70 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-4 py-3">Código CTRC</th>
                  <th className="px-4 py-3">Cliente Destinatário</th>
                  <th className="px-4 py-3">Cidade de Entrega</th>
                  <th className="px-4 py-3 text-right">Peso Real</th>
                  <th className="px-4 py-3 text-right">Volumes</th>
                  <th className="px-4 py-3 text-center">Setor</th>
                  <th className="px-4 py-3 text-center">NF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 leading-normal font-mono text-[11px]">
                {previewCollection.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-[#4d8eff] font-bold">{row.id}</td>
                    <td className="px-4 py-3 text-white truncate max-w-[220px] font-sans font-medium">{row.destinatario}</td>
                    <td className="px-4 py-3 text-[#dae2fd] font-sans">{row.cidade}</td>
                    <td className="px-4 py-3 text-right text-amber-200 font-bold">{row.weight.toLocaleString('pt-BR')} Kg</td>
                    <td className="px-4 py-3 text-right text-sky-200">{row.volume} vol</td>
                    <td className="px-4 py-3 text-center font-sans text-neutral-300">{row.setor || '-'}</td>
                    <td className="px-4 py-3 text-center text-xs text-neutral-400">{row.nf || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
