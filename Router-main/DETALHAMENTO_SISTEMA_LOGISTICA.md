# 🛰️ Blueprint de Contexto de Arquitetura & Guia Operacional — RotaOperational TMS/WMS Control Tower

Este documento serve como o **Guia de Contexto de Ultra Alta Fidelidade** para alimentar outras Engenharia de Inteligência Artificial (AIs como Claude, ChatGPT, Gemini de grande escala) e desenvolvedores. Ele detalha minuciosamente toda a arquitetura de software, estrutura de dados, persistência Offline-First, regras de negócio táticas, fluxos integrados de frota e expedição, e detalhes de visualização pixel-perfect do sistema de logística.

---

## 🌎 1. VISÃO GERAL DA ARQUITETURA
O **RotaOperational** é um cockpit de inteligência focado na triagem e expedição regionalizada de cargas rodoviárias (TMS e WMS tático) otimizado sob o conceito de **Missão Crítica Industrial**.

* **Ergonomia e Foco Noturno:** Paleta baseada em escuro absoluto (`#080c14` e `#0d1322`), protegida contra a fadiga de operadores de galpão expostos a telas por turnos de 12 horas.
* **Layout Compacto (Notebook Doca):** Otimizado estritamente para displays comuns de expedição **`1366x768`**, eliminando rolagem horizontal e com espaçamentos condensados (`py-1`, fonte densa `text-xs/sm`).
* **Offline-First com Nuvem (Supabase):** Toda a operação fiduciária local reside no banco cliente e é sincronizada assincronamente via fila de eventos, tolerando interrupções drásticas de redes móveis (3G/4G).

---

## 🗄️ 2. MODELO DE DADOS CONCRETO (TypeScript)
As seguintes interfaces definidas no núcleo (`src/types.ts`) servem como gabarito inabalável:

```typescript
// View principal ativa do painel
export type ViewType =
  | 'login'
  | 'dashboard'
  | 'importacao'
  | 'frota'
  | 'roteirizacao'
  | 'finalizacao'
  | 'desempenho'
  | 'solucao'
  | 'clientes'
  | 'ocorrencias'
  | 'curva_a'
  | 'cidades_rotas'
  | 'configuracoes';

// Veículos da Frota
export interface Vehicle {
  id: string; // Placa Mercosul (ex: "FLT8M55")
  driverName: string;
  capacity: string; // Ex: "4.5 t", "12000", "8500 kg"
  type: string; // TOCO, TRUCK, BITREM, CARRETA, VLC, FIORINO
  status: 'Em Rota' | 'Disponível' | 'Manutenção';
}

// Conhecimento de Transporte Eletrônico (CTRC)
export interface Ctrc {
  id: string; // SPO123456
  destinatario: string;
  cidade: string;
  weight: number; // Peso bruto (kg)
  volume: number; // Quantidade de volumes / m3
  type: 'CURVA A' | 'NORMAL';
  status: 'Pendente' | 'Entregue' | 'Recusado' | 'Disponível' | 'Em Rota' | 'Transferência' | 'Agendamento';
  cidade_ent?: string; // Cidade destino canônica
  setor?: string; // Setor logístico mapeado (ex: "SUL-1")
  prev_ent?: string; // Previsão de entrega (DD/MM/AAAA)
  remetente?: string;
  ocorrencia?: string; // Código de ocorrência ativa (ex: "01", "12")
  data_ocorr?: string;
  nf?: string; // Notas fiscais separadas por vírgula
  valor?: number; // Valor declarado de carga (R$)
  frete?: number; // Frete cobrado
  unid?: string; // Unidade emissora do faturamento (ex: "SPO", "VGA")
  pagador?: string; // Responsável financeiro (se pagador === destinatario, carga é FOB)
  cod?: string; // Código do cliente
  descricao_ocorr?: string; // Descrição de tracking integrada
  peso_r?: number; // Peso redundante real em kg
  disponibilidade?: string; // Badge calculado de disponibilidade física
  localizacao?: string; // Box físico no galpão (ex: "BOX C-12")
}

// Cadastro Formal de Ocorrências Logísticas (Motivos de rampa)
export interface DeliveryOccurrence {
  codigo: string; // Código ERP/Procedimento (ex: "01", "12")
  descricao: string; // Texto (ex: "RECUSA POR FALTA DE PEDIDO")
  responsabilidade: string; // REMETENTE, DESTINATÁRIO, INTERNA
  tipo: string;
  setor_ocorr: string;
  retorno_rota: 'Sim' | 'Não';
  tratativa_solucao: string; // Resolução guiada sugerida
}

// Cadastro Formal de Praças e Autopiloto de Rotas
export interface CidadeRota {
  id?: number;
  cidade: string; // Nome exato em caixa alta (ex: "VARGINHA")
  alias: string; // Sinônimos de digitação legada (ex: "VARG, VARGINA-MG")
  setor: string; // Setorizador territorial (ex: "SUL-2")
  rota: string; // Código da Rota física (ex: "ROTA 03")
  prazo_padrao: number; // Regra de SLA (Ex: 1 = D+1, 2 = D+2)
  prioridade_operacional: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA';
}

// Carteira Estratégica Curva A (Monitoramento Estrito de SLA)
export interface CurvaAClient {
  cnpj_remetente: string;
  curva_a: string; // 'A' | 'B' | 'C'
  cliente_remetente: string;
}

// Perfis operacionais permitidos
export interface AppUser {
  username: string;
  name: string;
  role: string;
  is_master: boolean; // Se true, destrava visualização multi-origem. Se false, amarra à filial "unid"
  unid?: string; // Filial do usuário corrente
}
```

---

## 🏪 3. NÚCLEO OFFLINE-FIRST (Dexie.js / IndexedDB)
O ecossistema local do navegador é gerido via **Dexie.js** (`src/infrastructure/localdb/db.ts` e `schema.ts`), garantindo persistência sem conexão.

### Mapeamento de Tabelas IndexedDB:
1. `ctrcs` (Índices: `id`, `status`, `unid`): Armazena as faturas e cargas.
2. `vehicles` (Índices: `id`, `status`): Frota ativa.
3. `drivers` (Índices: `id`, `status`): Motoristas cadastrados e score de entrega.
4. `savedRomaneios` (Índices: `id`, `vehicleId`, `date`): Lista de Romaneios consolidados localmente.
5. `occurrences` (Índices: `codigo`, `tipo`): Catálogo de ocorrências e tratativas de rampa.
6. `sync_queue` (Índices: `++id`, `entity`, `status`, `operation`): Gerenciador assíncrono de reconciliação de dados em nuvem.

*Camada de Repositório (`src/infrastructure/localdb/repositories/`)* implementa padrões canônicos assíncronos de inserção (`put`), leitura de listas (`getAll()`) e limpezas (`delete`).

---

## 📝 4. REGRAS DE NEGÓCIO DA OPERAÇÃO TÁTICA (TMS)

Para estender ou corrigir o código do painel, os seguintes algorítmos operacionais precisam ser estritamente respeitados:

### A. Conversão de Strings de Capacidade (`parseVehicleCapacity`)
Os caminhões vêm do faturamento legado com capacidades textuais (ex: `"4.5 t"`, `"12000"`, `"18 t"`, `"6.2t"`). Para cálculos matemáticos do Romaneio, utilize:
```typescript
function parseVehicleCapacity(capacityStr: string): number {
  const cleaned = capacityStr.toLowerCase().replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (capacityStr.includes('t')) return num * 1000;
  if (num < 150) return num * 1000; // Assume tonelagem se número for baixo
  return num || 4000; // Fallback padronizado
}
```

### B. SLA de Previsão de Entrega (Regra Temporal Estrita)
*   **Data de Referência Baseline:** **`25/05/2026`** (Toda comparação cronológica usa este dia como o "Hoje" corrente).
*   **Cores e Alertas Visuais para Data de Previsão (`prev_ent`):**
    *   `Data < 25/05/2026` (SLA Estourado / Atrasado): Fundo vermelho escuro (`bg-[#7f1d1d]`), texto branco bold.
    *   `Data === 25/05/2026` (Vence Hoje): Fundo vermelho vivo (`bg-[#dc2626]`), texto branco bold, com animação pulsar de opacidade (`animate-pulse`).
    *   `Data === 26/05/2026` (Vence Amanhã): Fundo amarelo escuro (`bg-[#ca8a04]`), texto preto.
    *   `Data > 26/05/2026` (No Prazo): Fundo verde escuro (`bg-[#166534]`), texto branco.
    *   **Formato Visual:** Abreviar sempre como `DD/MM` (ex: `25/05`) para evitar poluição visual.

### C. Faixas Cromáticas de Peso na Planilha
*   `< 300 kg`: Texto verde (`#22c55e`).
*   `301 a 600 kg`: Texto amarelo (`#eab308`).
*   `601 a 1500 kg`: Texto laranja (`#f97316`).
*   `> 1500 kg`: Texto vermelho vivo (`#ef4444`) e em **negrito** (indica volume prioritário pesado).

### D. Alocação Draft de Cargas e Saturação de Frotas
*   Mapeado dinamicamente via chave temporária: `draftAssignments` (`ctrcId -> vehicleId`).
*   A saturação do caminhão é recalculada reativamente baseado no peso somado das cargas draftadas em relação à sua capacidade máxima.
*   **Status de Saturação da Barra:**
    *   `< 60%`: Barra Azul (`bg-blue-500`) - Caminhão subutilizado.
    *   `60% a 85%`: Barra Verde (`bg-green-500`) - Saturação saudável de despacho.
    *   `85% a 95%`: Barra Laranja (`bg-orange-500`) - Zona ideal de rentabilidade.
    *   `> 95%`: Barra Vermelha (`bg-red-500`) - Alerta de sobrecarga de eixos/cubagem.

### E. Normalização de Cidades "Autopilot"
*   Se acionado no topo do painel, as cidades escritas incorretamente ou sem padrão no ERP (ex: `"S. PAULO"`, `"SAO PAULO - CAPITAL"`) são correlacionadas no repositório `CidadeRotaRepository` usando regras canônicas para determinar a Cidade exata, seu micro-setor de distribuição (ZONA SUL, SUL-1) e SLA formal.

---

## 🏛️ 5. ARQUITETURA DE ARQUIVOS (PROJECT TREE)
```bash
├── package.json                   # Scripts de empacotamento, dependências (React 19, Dexie, Tailwind v4)
├── server.ts                      # Servidor Express Full Stack com Proxy de API e middleware Vite / Estático
├── /src
│   ├── main.tsx                   # Ponto de entrada do renderizador React
│   ├── App.tsx                    # Orquestrador global e distribuidor de views
│   ├── types.ts                   # Interfaces representativas do modelo de domínio TMS/WMS
│   ├── supabase.ts                # Inicializador de sessão e queries de syncing do Supabase SaaS
│   ├── /components                # Visões operacionais encapsuladas
│   │   ├── LoginView.tsx          # Autenticação e travamento fiduciário de filial (unid)
│   │   ├── Sidebar.tsx            # Menu lateral tático e de ferramentas secundárias
│   │   ├── DashboardView.tsx      # Centralizador analítico acumulado de entregas
│   │   ├── RoteirizacaoView.tsx   # Painel tático principal (Planilha de CTRCs vs Cards de Frota)
│   │   ├── FrotaView.tsx          # Cadastro e estaleiro de motoristas e chapas
│   │   ├── CidadesRotasView.tsx   # Gerenciador de dicionários canônicos de de-para para despachos
│   │   └── ImportacaoView.tsx     # Capturador reativo de arquivos do faturamento
│   └── /infrastructure
│       └── /localdb
│           ├── db.ts              # Inicializador Dexie DB local
│           ├── schema.ts          # Estruturação e indexadores do localDB (IndexedDB de-para)
│           └── /repositories      # Abstrações de gravação (pattern repository)
```

---

## 🦾 6. INJETOR DE CONTEXTO COLO-COLE PARA IA (PROMPT TEMPLATE)
Sempre que for carregar uma nova inteligência artificial para codificar, estender ou debugar partes deste sistema, **copie e passe o texto abaixo** como instrução inicial do chat. 

```text
Você é um Engenheiro de Software Sênior especializado em sistemas logísticos de missão crítica (TMS/WMS), design de alta performance do pátio de carregamento terrestre e interfaces ergonômicas de alta densidade cognitiva.

Estamos atuando na evolução e suporte do sistema RotaOperational.

INSTRUÇÕES DE PREMISSA TÉCNICA OBRIGATÓRIAS:
1. ARQUITETURA OFFLINE-FIRST: Não gere chamadas diretas de escrita as síncronas que dependam exclusivamente de nuvem sem persistir primeiro localmente. Nós usamos Dexie.js (tabelas: 'ctrcs', 'vehicles', 'drivers', 'savedRomaneios', 'occurrences') integrado por meio dos repositórios canônicos em '/src/infrastructure/localdb/repositories/'.
2. PADRÕES DE SLA: Toda comparação cronológica para classificar entregas atrasadas, no dia ou futuras tem como DATA BASELINE DE REFERÊNCIA CORRENTE o dia '25/05/2026'. As regras de cores associadas à data da previsão ('prev_ent') devem ser rigidamente seguidas conforme nosso manual operacional.
3. CONVERSÃO DE CAPACIDADE VEHICULAR: Use 'parseVehicleCapacity' para lidar de modo tolerante com placas registradas com capacidades textuais como '6.8 t' ou '12500' kg antes de realizar consolidações e barras de saturação.
4. ERGONOMIA VISUAL: Toda interface desenvolvida deve manter o padrão 'Cosmic Slate' (tema escuro de baixo contraste ocular de galpão, com fundos '#080c14' e '#0d1322', bordas suaves '#1a2440' e texto de alta legibilidade). Não use grades lúdicas, efeitos de brilho néon ou interfaces tipo hud de jogos eletrônicos. Busque sempre a robustez das tabelas compactas e limpas do SAP TM ou Oracle OTM escaladas exclusivamente para notebook 1366x768.
5. CADASTRO CANÔNICO: O recurso 'Autopilot' permite corrigir a grafia incorreta do ERP cruzando strings contra 'CidadeRotaRepository'. Se habilitado pelo usuário, use esta base para normalizar cidades das cargas triadas no grid.

Mantenha a tipagem unificada de '/src/types.ts' e forneça códigos prontos, funcionais e totalmente com tipagem rígida TypeScript.
```

---
*Este documento consolida as diretrizes corporativas da infraestrutura do projeto RotaOperational. Mantenha os mapeamentos atualizados sempre que adicionar novas tabelas Dexie no Indexer.*
