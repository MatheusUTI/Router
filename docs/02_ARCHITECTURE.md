# Arquitetura do RotaOperational

## Visão Geral
O projeto segue uma arquitetura **Local First**, priorizando o navegador do usuário (IndexedDB) como a principal camada de dados em tempo real, enquanto um provedor de nuvem (Supabase) atua como camada de sincronização em segundo plano, auditoria e colaboração multiusuário.

## Camadas

### 1. UI Layer (View)
- Construída em **React 19** com **Vite** e estilizada com **Tailwind CSS**.
- Totalmente componentizada baseada no "Design System" de **Planilha Operacional** (Alta densidade).
- Evita uso massivo de Redux; estado global simples usando o React Context (se necessário) ou custom hooks acoplados ao DB local.

### 2. State & Hooks Layer (Logic)
- Hooks customizados (e.g., `useRoteirizacaoFilters`, `useCargaSelection`) injetam e reagem aos dados.
- Serviços Puros (e.g., `dashboardMetricsService`) atuam processando cálculos isolados (Pesos, Capacidades, SLAs) sem se acoplarem diretamente ao componente visual.

### 3. Local Data Layer (IndexedDB / Dexie)
- A principal camada de gravação (Single Source of Truth na visão do usuário ativo).
- O arquivo `src/infrastructure/localdb/db.ts` contém o esquema estruturado de tabelas: `ctrcs`, `vehicles`, `occurrences`, `pre_romaneios`, `audit_logs`, etc.
- Permite ordenação rápida (mesmo em 50.000 linhas) e evita "spinners" ao alternar abas da UI.

### 4. Cloud Sync Layer (Supabase)
- Camada PostgreSQL gerenciada via Supabase Client (`src/supabase.ts`).
- Atua silenciosamente enviando e puxando deltas (Diferenciais) quando há conexão à internet.
- Implementa Fila de Sincronização (`sync_queue`) no IndexedDB para tratar resiliência (Retry em quedas de rede).

## Fluxo de Dados (Data Flow)

1. **Importação**: Arquivo SSW lido no Browser -> Parsing -> Geração de objetos CTRCs -> Gravação no `IndexedDB.ctrcs` em lote (Mass Insert).
2. **Exibição (Roteirização)**: Componente lê via LiveQuery (ou queries de Dexie hook) os CTRCs do IndexedDB filtrando pela Praça Destino (Filial).
3. **Agrupamento (Pré-Romaneio)**: Usuário seleciona CTRCs -> Salva no `IndexedDB.pre_romaneios` e atualiza CTRCs -> Aciona `syncQueueRepository` para marcar as entidades para subida à nuvem.
4. **Sincronização Assíncrona**: O Worker/Interval interno lê a fila `sync_queue`, aciona a `supabase.ts` (ou Repositories do Supabase equivalentes), tenta o Upsert. Sucesso = apaga da fila; Falha = incrementa retry.

## Detalhamento de Repositórios (`src/infrastructure/localdb/repositories`)
Cada domínio (CTRC, Vehicle, AuditLog, PreRomaneio) possui uma classe repository exportada que padroniza as assinaturas (CRUD) escondendo os detalhes da Dexie.

## Detalhamento de Sincronização e Supabase (`src/infrastructure/supabase/repositories`)
Mesma assinatura das interfaces locais, mas injetando/lendo o banco online. Se o Supabase cair, os métodos retornam erros amigáveis, não travando a aplicação, pois a UI lê do repositório local.
