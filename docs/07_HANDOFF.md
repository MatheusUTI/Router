# Documento de Handoff (Continuidade)

## Contexto para a IA / Desenvolvedor
O projeto **RotaOperational (Router)** encontra-se com sua base operacional da Mesa consolidada e estável (`v1.25.0`), operando sob o padrão Local-First (IndexedDB via Dexie) sincronizado com Supabase.

Os ciclos fundamentais de integração SSW foram concluídos com sucesso:
1. **`SSW-ARCH-001`**: Fundação arquitetural, contratos, resiliência (Circuit Breaker, Retry Policy, Incident Aggregator) e Capability Registry.
2. **`SSW-455-001`**: Pipeline completo de aquisição do Relatório SSW 455 (`0230 -> 1440 -> 0424`), adapter de parsing unificado (`importCsvAdapter.ts`), sessão autenticada isolada no backend proxy e gatilho de sincronização com fallback inabalável na UI.

---

## O Que Você Precisa Saber Antes de Codificar

1. **Estado do Código:**
   - O pipeline do SSW 455 está 100% operacional no backend (`server/ssw/services/ssw455Service.ts`) e exposto nas rotas `/api/ssw/*` em `server.ts`.
   - O frontend em `ImportacaoView.tsx` possui o botão "Sincronizar SSW (455)" e alimenta o mesmo fluxo de dados da importação manual.
   - Ambas as formas de entrada (SSW automático ou upload manual) compartilham o mesmo adapter (`src/services/importCsvAdapter.ts`).
   - O suite de testes cobre a resiliência e a integração com 100% de sucesso (`npm test`).

2. **Regras Dogmáticas:**
   - **NENHUMA View pode conhecer endpoints `/bin/sswXXXX`**.
   - Endpoints do SSW não são contratos estáveis. Todas as capabilities são tratadas via `SswCapabilityRegistry` e `SswCapabilitySignature`.
   - Credenciais e cookies autenticados do SSW nunca transitam no client React; passam unicamente pelo Backend Proxy (`server/ssw/` / `server.ts`).
   - O fallback de importação manual de arquivos deve ser preservado indefinidamente.

3. **Próximo Passo Imediato:**
   - Consulte `docs/04_NEXT_TASK.md`.
   - A próxima tarefa recomendada é **`SSW-101-001`**: implementação da consulta pontual de CTRC e Nota Fiscal (SSW 101) na Mesa de Roteirização.

4. **Validações:**
   - Execute sempre `npm test` e `npm run lint`.
