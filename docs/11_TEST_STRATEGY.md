# Estratégia de Testes (Plano Futuro)

Nesta versão `v1.25.0`, não há cobertura massiva de testes unitários ou E2E (via Jest/Cypress/Playwright) configurados automaticamente no CI/CD. Este documento prescreve como implementá-los no futuro próximo, mantendo o ecossistema AISDD íntegro.

## 1. Testes Unitários de Serviços (Prioridade: Alta)
Os testes unitários devem envolver as funções puros e services que definem regras de negócios, e que hoje correm risco silencioso.
**O que testar:**
- `isActiveForRouting.ts`
- `getOcorrenciaStatus.ts`
- `kpiDashboardService.ts`
**Ferramentas Recomendadas:** Vitest (dado que usamos Vite) para máxima compatibilidade sem transpilação adicional pesada.

## 2. Testes de Integração de Repositórios (Prioridade: Média)
A validação de que o repositório salva de forma correta, não destrói registros em updates e trata bem as promessas (promises).
**O que testar:**
- Dexie Initialization vs. Hydration (Teste se inicializar o DB realmente cria tabelas).
- `Supabase Sync Queues` emulando falhas via stubs HTTP para certificar que o registro local não se perde na "fila morta".

## 3. Testes End-to-End (E2E) (Prioridade: Alta)
Crucial para uma UI tão densa. A Mesa de Roteirização possui filtros combinados cujo estado React se amarra ao Dexie em tempo real.
**O que testar:**
- Fluxo Crítico Completo: Fazer Login -> Acessar Roteirizacao -> Clicar num Checkbox de CTRC -> Clicar "Separar".
- Testes visuais (Visual Regression) em modo Light e Dark para coibir quebras acidentais do CSS Grid.
**Ferramentas Recomendadas:** Playwright ou Cypress. (O Playwright lida excelentemente bem com IndexedDB em contextos isolados de browser virtual).

## 4. Testes de Performance (Prioridade: Baixa para Agora, Alta a Longo Prazo)
A Mesa está feita para tolerar altas densidades de render.
- Como o DOM reage ao exibir 5.000 CTRCs listados na tela? (Atualmente virtualizamos e fatiamos, mas deve ser testado).
