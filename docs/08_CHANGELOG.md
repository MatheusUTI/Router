# RotaOperational - Registro de Versão (Changelog)

Este arquivo utiliza a filosofia do Conventional Commits para registrar o histórico de evolução do projeto.

---

## [v1.26.0] — 2026-08-24
### Alinhamento Estrito dos Parâmetros de Geração SSW 455 com SSWTools
- **fix(ssw)**: Alinhamento exato de todos os parâmetros e defaults do payload de geração do relatório 455 (`POST /bin/ssw0230`) com a implementação do SSWTools:
  - `tipo_periodo`: padrão "autorizacao", mapeado exclusivamente em `f11`/`f12` (mantendo `f9`/`f10`/`f13`/`f14`/`f15`/`f16` vazios).
  - `f22` (entrega): ajustado para `"p"` minúsculo.
  - `f35` (arquivo): ajustado para `"e"` minúsculo.
  - `f37` (dados complementares): ajustado para `"B"`.
  - Remoção de chaves não conformes (`reg_sigla`).
- **test(ssw)**: Criação do teste unitário de conformidade e comparação chave-a-chave com fixture oficial (`test/ssw/ssw455_payload.test.ts`), garantindo zero discrepâncias de case, campos ausentes ou extras.

### Sincronização Sob Demanda e Split UX do SSW 455 (SSW-455-UX-001)
- **feat(ssw)**: Implementação dos métodos de recuperação e reutilização em `Ssw455Service` (`findLatestCompletedReport`, `syncLatestReport` e `retryReport`), eliminando re-emissões acidentais na fila do SSW.
- **feat(api)**: Novos endpoints no backend proxy: `GET /api/ssw/455/latest`, `POST /api/ssw/455/latest/sync`, `POST /api/ssw/455/retry`, `POST /api/ssw/455/:sequence/retry` e `POST /api/ssw/455/generate`.
- **feat(ui)**: Divisão explícita das ações na tela de Importação (`ImportacaoView.tsx`):
  - Botão principal: `Sincronizar Último 455` (reutiliza o último relatório já emitido e concluído para o usuário/unidade).
  - Botão secundário: `Gerar Novo 455` (solicita nova emissão explícita no SSW).
  - Botão contextual: `Tentar novamente` no banner de erro (re-executa o download sem solicitar novo relatório).
  - Banner informativo com exibição da sequência mais recente disponível, status de conclusão e timestamp de atualização.
- **test(ssw)**: Suíte de testes dedicada `test/ssw/ssw455_ux.test.ts` cobrindo regras de ownership, sincronização sem emissão e retries direcionados (100% de aprovação).

### Integração Resiliente do Relatório SSW 455 (SSW-455-001)
- **feat(ssw)**: Implementação do serviço orquestrador `Ssw455Service` (`server/ssw/services/ssw455Service.ts`) gerenciando o ciclo de vida completo da aquisição: Solicitação (`0230`) -> Polling na Fila 156 (`1440`) -> Download do CSV (`0424`).
- **feat(ssw)**: Implementação do gerenciador de sessão isolado no backend `SswSessionManager` (`server/ssw/session/sessionManager.ts`) com autenticação automática, persistência de cookies HTTP, detecção de falso-200 (HTML de login) e renovação de credenciais.
- **feat(ssw)**: Implementação dos gateways especializados: `Ssw455RequestGateway`, `SswReportQueueGateway` (com matching estrito de sequência/propriedade de usuário) e `SswReportDownloadGateway`.
- **feat(ssw)**: Implementação do `SswFormAnalyzer` e `SswDiscoveryEngine` para análise estruturada de formulários e matching conservador de assinaturas (threshold >= 0.85).
- **feat(ssw)**: Criação do adapter unificado `importCsvAdapter.ts` (`src/services/importCsvAdapter.ts`), assegurando que tanto a aquisição automática SSW 455 quanto o upload manual compartilhem exatamente as mesmas regras de parsing, sanitização, detecção de delimitador e classificação de fluxo operacional.
- **feat(api)**: Exposição dos endpoints REST no backend proxy (`/api/ssw/health`, `/api/ssw/test-connection`, `/api/ssw/455/request`, `/api/ssw/455/jobs/:id`, `/api/ssw/455/jobs/:id/download`, `/api/ssw/455/acquire`).
- **feat(ui)**: Adição do botão "Sincronizar SSW (455)" com animação de progresso, banner de status e contingência transparente no componente `ImportacaoView.tsx`.
- **test(ssw)**: Suíte de testes automatizados completa em `test/ssw/ssw455.test.ts` cobrindo SessionManager, FormAnalyzer, DiscoveryEngine, Gateways (com mock HTTP e validação de falso-200), JobStore e orquestração ponta a ponta (100% de aprovação).
- **docs(adr)**: Registro da decisão arquitetural ADR-013 sobre unificação do parser e ingestão operacional.

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

## [1.26.1] - 2026-08-25
### Fixed
- **VERCEL-RUNTIME-FIX-001**: Removida a configuração `"type": "module"` do `package.json` para evitar que a Vercel Serverless Function tente gerar um output ESM nativo. Em ESM, dependências do Express causavam fatal crash (`Error: Dynamic require of "path" is not supported`) e erros `ERR_MODULE_NOT_FOUND` nos imports relativos sem extensão `.js`. A compilação Vercel agora processa as APIs em CommonJS nativo.
