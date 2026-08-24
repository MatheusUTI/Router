# Documento de Handoff (Continuidade)

## Contexto para a IA / Desenvolvedor
O projeto **RotaOperational (Router)** encontra-se com sua base operacional da Mesa consolidada e estável (`v1.25.0`), operando sob o padrão Local-First (IndexedDB via Dexie) sincronizado com Supabase.

A fundação arquitetural da integração SSW (**`SSW-ARCH-001`**) foi implementada com sucesso, estabelecendo os tipos compartilhados frontend-safe (`src/integrations/ssw/`), o núcleo de resiliência e registro backend-only (`server/ssw/`) e cobertura unitária com testes determinísticos (`npm test`).

---

## O Que Você Precisa Saber Antes de Codificar

1. **Estado do Código:**
   - A fundação resiliente SSW está pronta: `SswCapabilityRegistry`, `SswCircuitBreaker`, `SswRetryPolicy`, `SswIncidentAggregator` e contratos do Discovery/Gateway.
   - Nenhuma chamada de rede real ao SSW foi disparada ainda.
   - O projeto SSWTools serve como referência técnica para a implementação dos fluxos.

2. **Regras Dogmáticas:**
   - **NENHUMA View pode conhecer endpoints `/bin/sswXXXX`**.
   - Endpoints do SSW não são contratos estáveis. Todas as capabilities são tratadas via `SswCapabilityRegistry` e `SswCapabilitySignature`.
   - Credenciais e cookies autenticados do SSW nunca transitam no client React; passam unicamente pelo Backend Proxy (`server/ssw/` / `server.ts`).
   - O fallback de importação manual de arquivos deve ser preservado indefinidamente.

3. **Próximo Passo Imediato:**
   - Consulte `docs/04_NEXT_TASK.md`.
   - A tarefa imediata é **`SSW-455-001`**: implementação da aquisição automatizada do Relatório SSW 455 através da fundação de capabilities recém-construída.

4. **Validações:**
   - Execute sempre `npm test`, `npm run lint` e `npm run build`.


