# Router - Plataforma de Roteirização Operacional e Expedição Logística

> Sistema de alta performance, projetado sob a filosofia *Offline-First / Local-First*, voltado para a governança operacional, roteirização tática e expedição de cargas no transporte rodoviário de distribuição urbana e fracionada.

O **Router** foi desenvolvido para preencher uma lacuna crítica nas operações de transporte: a resiliência operacional no chão de fábrica e na doca de expedição. Diferente de soluções SaaS tradicionais puramente em nuvem, o Router foi concebido para continuar operando sem latência e sem interrupções mesmo diante de instabilidades parciais ou totais de rede.

---

## Status Estável Atual — V1.23.0

**Baseline Operacional Estável da Roteirização.**

A versão **V1.23.0** marca o primeiro ponto de estabilidade operacional validado em teste prático real. O fluxo principal do aplicativo foi comparado com a planilha operacional padrão usada atualmente e a primeira rota montada pelo Router apresentou resultado equivalente.

### Fluxo validado

```text
Importação de CTRCs
        ↓
Mesa de Roteirização
        ↓
Organização e montagem da rota
        ↓
Pré-romaneio / pré-separação imprimível
```

### Escopo considerado funcional nesta baseline

- Login operacional com usuário master.
- Importação operacional de CTRCs.
- Organização e leitura dos dados na Mesa de Roteirização.
- Seleção e montagem prática de rota.
- Geração e impressão da pré-separação, também chamada de pré-romaneio.

### Limites conhecidos desta baseline

Esta versão valida o núcleo **durante** a roteirização, mas ainda não declara como estáveis os fluxos antes da importação ou após o pré-romaneio.

Pontos já identificados para evolução incremental:

- melhorar a localização visual do CTRC na Mesa;
- melhorar a leitura e exibição de dados operacionais;
- refinar o fluxo antes da importação;
- revisar e amadurecer o fluxo posterior ao pré-romaneio;
- separar futuramente Mesa ativa, histórico, entregues, ocorrências e KPIs;
- preparar importação única do SSW com classificação automática por situação do CTRC.

### Decisão de projeto

A partir da **V1.23.0**, o fluxo **importação → mesa → montagem de rota → pré-romaneio** deve ser tratado como núcleo funcional protegido. Novas mudanças devem ser pequenas, incrementais e guiadas por testes reais, evitando refatorações amplas que possam quebrar o comportamento já validado.

---

## 1. Visão Geral do Sistema

No ecossistema de transporte de cargas e logística de distribuição (TMS/WMS), a velocidade operacional e a continuidade dos processos de expedição e montagem de cargas são imperativas. Paradas de poucos minutos na doca de carregamento causadas por lentidão de rede, indisponibilidade do banco de dados na nuvem ou quedas de conexão geram custos em cadeia (veículos ociosos, atrasos em janelas de entrega do varejo e horas extras de operadores).

O **Router** opera na ponta operacional, atuando como o elo de execução de roteirização rápida:
- **Resolução de Instabilidade de Rede**: Permite que filiais, pátios e docas trabalhem de forma ininterrupta por meio de persistência síncrona local de todos os CTRCs (*Conhecimentos de Transporte Eletrônicos*), ocorrências, cadastros de frota e dados de cidades.
- **Rápida Roteirização Tática**: Consolida dados operacionais brutos provenientes de importações de ERP ou TMS centrais, executa o enriquecimento automático (detecção de SLA, curva de importância, identificação de frete FOB e restrições de restrições de entrega) e viabiliza a alocação visual dinâmica a veículos disponíveis no pátio.
- **Conformidade de Expedição**: Garante o controle rígido de limite de capacidade técnica dos veículos (peso de payload e cubagem/volume), sugerindo de forma automatizada o veículo ideal compatível com o rascunho de carregamento construído pelo assistente expedição humana.

---

## 2. Filosofia Arquitetural

A arquitetura do Router é governada pela soberania e consistência local dos dados na interface com o usuário. A premissa central é de que **a operação nunca depende diretamente da nuvem para realizar tarefas de execução tática imediata**.

### Diretrizes de Projeto:
- **Offline-First / Local-First**: O estado ativo da tela de roteirização e os dados persistidos residem no banco do navegador (IndexedDB) gerenciado de forma transacional. Toda e qualquer ação de filtragem, agrupamento, rascunho, montagem de carga e pré-emissão de Romaneios gera atualizações síncronas locais instantâneas (tempo de resposta inferior a 5ms).
- **Consistência Eventual e Fila Transacional (*Sync Queue*)**: Alterações de estado que exigem consolidação no núcleo de dados centralizado (Supabase) são empilhadas em uma fila de sincronização persistente localmente. Caso o operador esteja sem rede, a fila conserva os pacotes de alteração de forma sequencial idempotente e os transmite de maneira inteligente à medida que o canal é restabelecido.
- **Decisões Desacopladas de Redes Remotas**: O carregamento inicial extrai dicionários (cidades/rotas válidas, tabela de ocorrências padronizadas, clientes especiais Curva A). Uma vez hidratado, o cálculo e a classificação são inteiramente realizados na CPU da máquina cliente, blindando a operação contra picos de latência ou gargalos em microsserviços.

---

## 3. Stack Tecnológico

O Router utiliza uma combinação de tecnologias sólidas que favorecem tempos mínimos de renderização, suporte duradouro a processamento de dados local estruturado, e sincronia segura:

### Frontend
- **React**: Biblioteca componentizável para estruturação de UI reativa e modular de estado previsível.
- **TypeScript**: Estrita tipagem estática que previne quebras nas transformações complexas de modelos de CTRC, validações operacionais de veículo e interações de romaneios.
- **Vite**: Ferramenta de build extremamente veloz que otimiza ciclos de desenvolvimento e minimiza o bundle final de entrega.
- **Tailwind CSS**: Framework utilitário de CSS que viabiliza densidade visual rica com mínima pegada de folhas de estilos e fluidez em telas de baixa resolução (notadamente notebooks operacionais).

### Persistência Local
- **IndexedDB**: API de persistência em baixo nível no browser que possibilita o armazenamento de megabytes de registros localmente sem as severas restrições de cota do LocalStorage.
- **Dexie.js**: Wrapper declarativo sobre IndexedDB que assegura controle de versões de banco de dados, índices performáticos, tratamento robusto de concorrência e transações seguras.

### Backend & Sincronização
- **Supabase**: Plataforma Backend-as-a-Service escalável, fornecendo banco de dados corporativo relacional Postgres, autenticação e suporte nativo a sincronização síncrona.

---

## 4. Estrutura de Diretórios

A distribuição de pastas reflete a arquitetura limpa de separação de conceitos do Router:

```
src/
├── components/
│   └── roteirizacao/
│       ├── helpers/                 # Algoritmos utilitários puros de tratamento operacional
│       │   ├── getOcorrenciaStatus.ts  # Decisão de status de disponibilidade da carga
│       │   ├── getPesoStatus.ts        # Classificação de peso de lotes
│       │   ├── getSlaStatus.ts         # Cálculo de vencimentos
│       │   └── isClienteCurvaA.ts      # Classificação de prioridades comerciais
│       ├── hooks/                   # Custom Hooks isolando lógica de estado de UI e filtros
│       │   ├── useCargaSelection.ts    # Seleção de CTRCs
│       │   ├── useRoteirizacaoFilters.ts # Lógica unificada de filtros com Setor de Ocorrência e ordenação Excel
│       │   ├── useRoteirizacaoGrouping.ts # Agrupadores dinâmicos (Cidade, Setor, Rota)
│       │   └── useVehicleAllocation.ts # Logística de rascunhos de carga e compatibilidade
│       ├── services/                # Camada de serviços de lógica de negócios enriquecida
│       │   └── roteirizacaoEnrichmentService.ts # Conversão de CTRC Bruto em RoteirizacaoItem
│       ├── CargaGroup.tsx           # Renderizador de sanfonas/grupos de carregamento
│       ├── CargaItem.tsx            # View unitária do CTRC enriquecido altamente compacto
│       ├── CargaList.tsx            # Driver de listagem de cargas (Normal ou Agrupado)
│       ├── FrotaPanel.tsx           # Kanban e área de gestão rápida da frota do pátio
│       ├── RoteirizacaoView.tsx     # View mestra integradora do dashboard operacional
│       └── VehicleCard.tsx          # Componente representativo do veículo, capacidades e rascunho
├── infrastructure/
│   └── localdb/
│       ├── repositories/            # Camada DAO/Repositórios encapsulando persistência local
│       │   ├── helperRepository.ts
│       │   ├── curvaAClientRepository.ts
│       │   ├── userPreferenceRepository.ts
│       │   ├── syncMetadataRepository.ts
│       │   ├── ctrcRepository.ts
│       │   ├── vehicleRepository.ts
│       │   ├── driverRepository.ts
│       │   ├── occurrenceRepository.ts
│       │   ├── syncQueueRepository.ts
│       │   └── cidadeRotaRepository.ts
│       └── db.ts                    # Declaração do Dexie de banco operacional local e esquemas
├── types.ts                         # Central de contratos de tipos estritos do ecossistema Router
└── App.tsx                          # Orquestrador de visualizações e inicialização
```

---

## 5. Módulos do Sistema

O Router expandiu seu arcabouço de persistência local para garantir governança logística total, dividindo seus domínios de escopo de forma clara.

### Módulos Já Operacionais
- **Baseline Operacional V1.23.0**: Fluxo validado de importação, organização da Mesa, montagem prática da rota e impressão do pré-romaneio.
- **Calendário Operacional (Avisos de Feriados)**: Base local semeadora contendo feriados de Minas Gerais para 2026. Parser inteligente e aviso compacto no cockpit alertando sobre suspensões e recessos iminentes nos próximos 5 dias, com link direto às rotas ativas exibidas na mesa.
- **Simplificação e Agilidade Visual**: Cabeçalho condensado extremamente limpo contendo apenas filtros de Filial, Rota, Setor de Ocorrência com múltipla escolha e Ordenação operacional sem quebras visuais sob zoom de navegador.
- **Setor de Ocorrência e Ordenação Excel**: Fluxo operacional inspirado na planilha Excel para marcar/desmarcar múltiplos setores simultaneamente e ordenar toda a carga em tempo real (Ex: por data de entrega crescente/decrescente, remetente, valor, peso etc.).
- **Elegibilidade Interna de Segurança**: O campo `routingEligibility` opera silenciosamente como guardião de risco no motor de negócios, sinalizando perigo nas listagens inferiores e interrompendo consolidações de faturas que estejam em trânsito ou finalizadas.
- **Enriquecimento Operacional**: Conversão assíncrona de CTRC bruto importado em um objeto de negócios enriquecido de dados normalizados de rotas, classes comerciais, restrições e SLAs.
- **RoteirizacaoView / Dashboard**: Vista contendo duas colunas (Cargas x Veículos), priorizando rascunhos em tempo real com controle de payload restante e sugestão automatizada de veículo.
- **Importação ERP/SSW (Mapeadores)**: Mapeador de carga flexível capaz de traduzir metadados brutos originados de sistemas ERP/TMS em payloads válidos.
- **Pré-romaneio / Pré-separação**: Impressão operacional da carga consolidada para conferência e separação física na doca.
- **Persistência Local Offline**: Bancos transacionais de cadastros, dicionários de cidades e ocorrências diretamente no IndexedDB via Dexie.
- **Gestão da Frota do Pátio**: Rastreamento rápido e preciso da ocupação de veículos por peso (kg) e volumetria (volumes) por viagem ou rascunho.
- **Base de Curva A Local**: Registro indexado de CNPJs prioritários para indicação destacada instantânea na expedição.
- **Ajudantes/Helpers Cadastrados**: Repositório operacional local focado em validar disponibilidade estrutural de auxiliares de rota.

### Módulos em Amadurecimento
- **Roteirização Automática / Sugestões Complexas**: Algoritmo que calcula agrupamento lógico de CTRCs com o veículo disponível de menor custo associado que atenda às datas de entrega.
- **Algoritmo TSP (Travelling Salesperson) de Sequenciamento**: Ordenação geográfica lógica de posições e sequências de e-commerce/varejo após a finalização e emissão do romaneio.
- **Consolidador Centralizado de Romaneios**: Processo em background que transfere pacotes assinados de romaneios locais consolidados em lotes para arquivamento no Supabase Cloud.
- **Fluxo pós-pré-romaneio**: Etapas de fechamento, finalização e integração operacional após a pré-separação ainda exigem validação real e refinamento.

### Módulos Futuros
- **Importação SSW Completa com Classificação Automática**: Entrada única contendo pendentes, entregues, ocorrências e finalizados, separando automaticamente Mesa ativa, histórico e base analítica.
- **KPIs Históricos e Performance Operacional**: Indicadores por rota, cidade, cliente, ocorrência, prazo, peso, volume e performance de entrega.
- **Mobile de Assinatura Digital e Entrega**: Extensão móvel para o motorista realizar coletas, baixar entregas em campo e atualizar reativamente o status de pátio na doca.
- **Torre de Controle de Frota**: Monitoramento georreferenciado e controle de tempos de descarregamento em tempo real.

---

## 6. Fluxo Operacional Real

O processamento das cargas e o planejamento logístico diário obedecem a um fluxo operacional rígido e sequencial. No Router, **a roteirização tática e a consolidação de cargas acontecem primeiro**, ficando a alocação técnica de veículos e motoristas restrita exclusivamente ao momento de fechamento operacional. O veículo nunca atua como protagonista inicial no planejamento da carga.

### Arquitetura de Camadas de Dados (Integridade de Fluxo)

Para blindar o sistema contra inconsistências comuns originadas em bancos de dados legados ou ERPs externos, dividimos o ciclo de vida dos dados na Mesa de Roteirização em três camadas independentes:

1. **Dados Brutos (Raw Layers)**: Preservados totalmente intocados na importação de arquivos CSV ou SSW. Guardam as informações exatas recebidas do faturamento do ERP (como o destinatário original, remetente, cidade declarada na nota fiscal fiscalmente, peso e código numérico da última ocorrência).
2. **Dados Normalizados (Normalized Layers)**: Eliminam ruídos sintáticos e variações das strings (como abreviações de cidades, prefixos ou sufixos de estado como `/SP` ou `- MG`, e setores com nomes vazios) convertendo-os em chaves unificadas e padronizadas (`normCidade`, `normRota`, `normSetor`) baseadas nos dicionários de rotas oficiais da operação.
3. **Dados Enriquecidos (Enriched Layers)**: Camada que calcula regras e metas operacionais reativas (como `effectiveRoute`, `routingEligibility` para retenção automática de faturas inconsistentes ou retidas, SLA calculado do prazo em dias `slaStatus`, classificação por faixas de peso, setores de ocorrências de transporte `occurrenceSector`, e indicador de cliente VIP Curva A).

```
[Importação de Cargas do ERP / CSV (Raw Data)]
                     │
                     ▼
     [Camada de Normalização (Normalized Data)] ──► Busca no dicionário local 'cidades_rotas'
                     │                              (Corrige e limpa Cidade, Setor Comercial, Rota e Prazos)
                     ▼
     [Camada de Enriquecimento (Enriched Data)] ──► Avalia e classifica: Peso Status, SLA da Carga,
                     │                              Curva VIP, Portifólio FOB e Elegibilidade de Roteirização
                     ▼
          [Planejamento do Dia] ──────────────────► Exibição em tempo de execução na Mesa de Roteirização
                     │
                     ▼
      [Ajustes de Rota / Prioridade] ─────────────► Correções manuais do Operador na Mesa de Roteirização
                     │                              (Muda rota tática, define prioridades manuais, retém faturas)
                     ▼
         [Consolidação de Rota] ──────────────────► Agrupamentos por rota, conferência de lotes e volumes totais
                     │
                     ▼
      [Pré-romaneio / Pré-separação] ─────────────► Impressão operacional para conferência e separação física
                     │
                     ▼
       [Escolha de Veículo & Equipe] ─────────────► Distribui equipes (ajudantes e motoristas) e sugere frotas
                     │                              adequadas por limite técnico de peso e cubagem de payload
                     ▼
      [Faturando Romaneios / Draft]
                     │
                     ▼
    [Gravação síncrona em IndexedDB] ─────────────► Persistência na planilha local ('savedRomaneios') e
                     │                              enfileiramento sequencial de eventos na 'sync_queue'
                     ▼
   [Sync Queue / Provedor Cloud] ─────────────────► Sincronização em lotes assíncronos junto ao Supabase Cloud
```

---

## 7. Interfaces do Modelo de Dados

O núcleo de tipos estritos modela as entidades para garantir segurança em conversões e cálculos de transporte:

```typescript
// Helper: Cadastro de Ajudantes locais disponíveis para viagem
export interface Helper {
  id: string;
  name: string;
  status: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

// CurvaAClientLocal: Cadastros locais persistidos de clientes prioritários (Curva A)
export interface CurvaAClientLocal {
  id: string;
  cnpj_remetente: string;
  cliente_remetente: string;
  curva_a: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// UserPreference: Opções ergonômicas persistidas de cada operador logístico
export interface UserPreference {
  id: string; // ID estrutural baseado no usuário logado
  username: string;
  view: string;
  preferences: any;
  updated_at: string;
}

// SyncMetadata: Rastreamento do ciclo de vida de sincronia de tabelas com cloud
export interface SyncMetadata {
  entity: string;
  last_pull_at: string;
  last_push_at: string;
  last_success_at: string;
}

// RoteirizacaoItem: Objeto operacional rico do CTRC pronto para exibição e tomada de decisão
export interface RoteirizacaoItem extends Ctrc {
  normCidade: string;
  normSetor: string;
  normRota: string;
  normPrazo?: number;
  normPriority?: string;
  slaStatus: {
    label: string;
    bgClass: string;
    textClass: string;
    daysDiff: number;
    isToday: boolean;
    isDelayed: boolean;
  };
  pesoStatus: {
    textClass: string;
    badgeClass: string;
    category: 'LEVE' | 'MÉDIO' | 'PESADO' | 'CRÍTICO';
    label: string;
  };
  occurrenceCode?: string;
  occurrenceDescription?: string;
  occurrenceCriticality: 'CRÍTICA' | 'MÉDIA' | 'SUAVE' | 'NENHUMA';
  availabilityStatus: 'disponivel' | 'em rota' | 'retido' | 'transferência' | 'aguardando' | 'problema';
  availabilityLabel: string;
  locationLabel: string;
  isCurvaA: boolean;
  curvaAClass?: string;
  isFob: boolean;
  visualFlags: {
    isCurvaA: boolean;
    isFob: boolean;
    isDelayed: boolean;
    statusClass: string;
    rowClass: string;
  };
}
```

---

## 8. UX Operacional do Cockpit de Roteirização

Diferente de interfaces corporativas baseadas em grids excessivos inspirados em planilhas sem propósito de fluxo, a UX do Router foi desenhada com foco em **ergonomia cognitiva para expedição sob alta pressão**:
1. **Redução de Ruído**: Cores de alta constraste cinza-escuro/azul-marinho profundo protegem a visão do operador durante longos turnos noturnos na doca.
2. **Zero Scroll Horizontal**: Todas as informações relevantes de um lote estão empacotadas de forma concisa. Dimensões críticas (peso, volume, vencimento) utilizam contrastes agressivos e tipografias de rápida identificação visual.
3. **Indicador de Recomendação Inteligente (Sugestão Ativa)**: Ao selecionar cargas pendentes, o painel de veículos reordenará instantaneamente os caminhões no topo, inserindo um badge dourado de destaque (`⭐ RECOMENDADO`) no veículo que oferece o melhor aproveitamento físico da capacidade de carga sem ultrapassar o limite estabelecido de peso restante.
4. **Visibilidade do Fluxo (*Disabled Mode*)**: Cargas de peso superior ao limite restante de determinado veículo forçam uma opacidade reduzida (`opacity-40 pointer-events-none`) em seu card correspondente, instruindo o operador visualmente de forma instantânea onde as cargas não podem caber fisicamente.

---

## 9. Como Rodar o Projeto

Para executar o Router em seu ambiente local, certifique-se de possuir o Node.js v18+ instalado.

### 1. Clonar o Repositório e Instalar Dependências
```bash
# Navegue até a raiz do projeto e instale as dependências
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com base no arquivo `.env.example`:
```env
# Configurações do Banco de Dados Cloud (Supabase)
VITE_SUPABASE_URL=sua-url-do-supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

### 3. Rodar em Modo de Desenvolvimento
O banco de dados IndexedDB local inicializará e será povoado automaticamente. Para subir o servidor de desenvolvimento:
```bash
npm run dev
```
O servidor de desenvolvimento estará disponível em `http://localhost:3000`.

### 4. Executar Compilação de Produção
```bash
# Transpila e empacota os ativos para distribuição otimizada na pasta dist/
npm run build
```

---

## 10. Status Atual do Projeto e Maturidade

- 🟩 **Baseline Operacional Estável — V1.23.0**: Núcleo validado em teste real até o pré-romaneio. Inclui importação de CTRCs, organização da Mesa, montagem de rota e impressão da pré-separação.
- 🟩 **Instalado e Consolidado**: Persistência local multi-tabelas IndexedDB transacional; motor de enriquecimento automático de CTRCs brutos em lote; interface modular do cockpit de roteirização rápida e dinâmica com feedback tátil e bloqueaduras de payload.
- 🟡 **Em Hardening Operacional**: Refinamento da localização visual do CTRC, clareza de leitura dos dados na Mesa, ajustes no fluxo anterior à importação e validação do fluxo posterior ao pré-romaneio.
- 🟡 **Em Amadurecimento**: Sincronização assíncrona do histórico de romaneios assinados da `sync_queue` com a nuvem centralizada no Supabase e conciliação remota periódica.
- 💤 **Planejado**: Importação SSW completa com classificação automática entre Mesa ativa, histórico, entregues, ocorrências e base futura de KPIs; automatização completa de arranjos bidimensionais de caixas em baú de carregamento logístico.

---

> **Filosofia do Produto**: "O Router não foi projetado meramente para conectar dados de transporte à nuvem, mas para garantir robustez implacável e processamento de decisão na doca logística. Operações rodoviárias não param por causa de pacotes de dados perdidos; o Router garante que a sua expedição continue rodando de forma soberana."
