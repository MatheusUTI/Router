# RotaOperational - Registro de Versão (Changelog)

Este arquivo utiliza a filosofia do Conventional Commits para registrar o histórico de evolução do projeto.

---

## [v1.26.0-doc] — 2026-08-24
### Fundação da Integração SSW Resiliente e Isolada (SSW-ARCH-001)
- **feat(ssw)**: Criação dos tipos compartilhados e contratos frontend-safe em `src/integrations/ssw/` (`SswCapabilityId`, `SswCapabilityStatus`, `SswCircuitState`, `SswIncidentStatus`, `SswCapabilitySignature`, `SswCapabilityEntry`, `SswHealthSummaryDTO`).
- **feat(ssw)**: Implementação do `SswCapabilityRegistry` com porta de persistência desacoplada `RegistryStoragePort` e `InMemoryRegistryStorage`.
- **feat(ssw)**: Implementação do `SswCircuitBreaker` com controle de estados (`CLOSED`, `OPEN`, `HALF_OPEN`), backoff progressivo (5m, 15m, 30m, 60m) e injeção de clock para testes determinísticos.
- **feat(ssw)**: Implementação do `SswRetryPolicy` com backoff exponencial, jitter configurável, predicado de erros retryable e injeção de temporizador.
- **feat(ssw)**: Implementação do `SswIncidentAggregator` e `IncidentStorePort` com agregação de erros equivalentes, contadores de tentativas e resolução de incidentes.
- **feat(ssw)**: Criação dos contratos declarativos para `SswDiscoveryEngine`, `SswFormAnalyzer`, `SswCapabilityValidator` e `SswGatewayClient`.
- **test(ssw)**: Criação de suíte de testes unitários determinísticos em `test/ssw/resilience.test.ts` cobrindo Registry, Circuit Breaker, Retry Policy e Incident Aggregator (100% verde).
- **security(ssw)**: Verificação de bundle garantindo isolamento total dos módulos backend fora do bundle do cliente.

### Auditoria Estrutural e Regularização de Repositório (REPO-CLEANUP-001)
- **chore(repo)**: Auditoria comparativa completa entre a raiz e o diretório legado `Router-main/`.
- **chore(repo)**: Consolidação das decisões arquiteturais históricas (ADR-009 a ADR-012) e remoção segura do snapshot obsoleto `Router-main/`.
- **chore(version)**: Alinhamento das fontes de versão do projeto (`package.json` e `src/constants/appVersion.ts` fixados em `v1.25.0`).
- **docs(architecture)**: Definição clara da fronteira entre Shared/Frontend-Safe (`src/integrations/ssw/`) e Backend-Only (`server/ssw/`).
- **docs(state)**: Mapeamento formal das dívidas técnicas no documento de estado atual.

### Formalização Arquitetural da Integração Resiliente SSW (AISDD)
- **docs(ssw)**: Formalização do Router como camada operacional inteligente sobre o SSW com arquitetura Local-First.
- **docs(ssw)**: Definição do princípio de isolamento estrito de endpoints (`/bin/sswXXXX`) fora das Views e serviços gerais.
- **docs(ssw)**: Especificação formal das capabilities: SSW 455, SSW 101, SSW 063, SSW 029, SSW 030, SSW 023, SSW 264 e R/D.
- **docs(ssw)**: Modelagem do `SswCapabilityRegistry`, `SswCapabilitySignature`, `Confidence Score` e motor de `Discovery Engine`.
- **docs(ssw)**: Definição dos componentes de resiliência: `SswCircuitBreaker` com backoff progressivo (5, 15, 30, 60 min), `SswRetryPolicy` e `SswIncidentAggregator`.
- **docs(ssw)**: Registro das decisões de domínio: Princípio de Carga Destino (ADR-007) e Existência de Manifesto independente de detalhamento (ADR-008).
- **docs(ssw)**: Definição do roadmap AISDD e da próxima tarefa de infraestrutura: `SSW-ARCH-001`.

---

## [v1.25.0] — 2026-07-29
### Estabilização Geral da Mesa e Limpeza Documental AISDD
- **docs**: Refatoração completa da estrutura documental implementando as especificações rígidas de orquestração AISDD.
- **refactor**: Consolidação da estrutura de Sincronismo (Local First).
- **feat**: Validações pontuais da filial operacional corrigidas e validadas (Praca Destino).
- **style**: Escala de zoom compacta consolidada para monitores logísticos (1366x768).

---

## [v1.24.0] — 2026-06-23
### Auditoria de Regressão Operacional e Consolidação
- **feat**: Fallback local aprimorado (auth local) com base de usuários estáticos seguros.
- **feat**: Integração segura de Temas Dark/Light preservando relatórios impressos na cor branca para economia de toner.
- **feat**: Criação do módulo "Cadastro de Frota e Regras GR" sem introdução de quebras duras, operando como alertas visuais de risco financeiro.
- **fix**: Correção de sincronização na Mesa (Cargas vinculadas a pré-romaneios continuam visíveis em históricos mas bloqueadas para novas seleções).
- **chore**: Suíte de compilação Typecheck rodando lisa (zero erros impeditivos de CI/CD).

---

## [v1.23.0] — 2026-06-22
### Baseline Operacional Estável da Roteirização
- **feat**: Estabelecido o marco 1.0 da "Mesa de Roteirização" em formato Planilha Densa.
- **feat**: Cálculo dinâmico avançado de totais e cubagens em tempo real, independentemente da paginação.
- **feat**: Lançamento funcional do módulo "Pré-Romaneio" para impressão operacional no solo (armazém).
- **perf**: Utilização primária do Dexie Local para anular demoras inerentes ao carregamento Cloud, com Background Sync Worker acoplado.
