# Estratégia de Testes

Este documento orienta a implementação e expansão de testes automatizados no **RotaOperational (Router)**.

---

## 1. Testes Unitários de Serviços de Domínio (Prioridade: Alta)
Validam regras de negócios puras sem dependência de DOM ou rede:
- `isActiveForRouting.ts` — disponibilidade de carga por ocorrência e setor.
- `getOcorrenciaStatus.ts` — mapeamento semântico de ocorrências.
- `kpiDashboardService.ts` — totações agregadas e métricas.

---

## 2. Testes Unitários e de Integração da Camada SSW (Prioridade: Alta para novos ciclos)
Com o início das tarefas de integração SSW (`SSW-ARCH-001`), a camada de resiliência e discovery deve ser testada com mocks isolados:
- **`SswCapabilityRegistry`**: Validar registro, busca por capability, atualização de endpoint e cálculo de confidence score.
- **`SswCircuitBreaker`**: Validar transições de estado (`CLOSED -> OPEN -> HALF_OPEN -> CLOSED`), contagem de falhas e progressão de backoff (5m, 15m, 30m, 60m).
- **`SswIncidentAggregator`**: Validar agrupamento de múltiplas falhas idênticas sob um mesmo registro com contagem de `attempts` e timestamps corretos.
- **`SswFormAnalyzer` & `SswDiscoveryEngine`**: Testar extração de `<form action>` e campos `<input>` contra fixtures de HTML do SSW.
- **`SswCapabilityValidator`**: Validar conformidade de payloads e respostas contra assinaturas funcionais.

---

## 3. Testes de Integração de Repositórios e Cache (Prioridade: Média)
- Validação de que repositórios Dexie salvam e atualizam entidades sem perda de integridade.
- `Supabase Sync Queues` emulando falhas com stubs HTTP para certificar que o registro local não se perde na fila.

---

## 4. Testes End-to-End (E2E) (Prioridade: Alta)
- Fluxo Crítico: Login -> Acessar Mesa -> Filtrar Filial -> Selecionar CTRCs -> Gerar Pré-Romaneio.
- Teste de Fallback: Desconectar rede e validar que a aplicação continua responsiva em modo Local-First.

---

## 5. Ferramentas Recomendadas
- **Unitários / Integração**: Vitest (integração nativa com Vite e TypeScript sem overhead).
- **E2E**: Playwright (excelente suporte para IndexedDB e cenários offline no browser).
