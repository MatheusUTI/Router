# Documento de Handoff (Continuidade)

## Contexto para a IA / Desenvolvedor
O projeto **RotaOperational (Router)** encontra-se com sua base operacional da Mesa consolidada e estável (`v1.25.0`), operando sob o padrão Local-First (IndexedDB via Dexie) sincronizado com Supabase.

A auditoria estrutural e limpeza de snapshots legados (**`REPO-CLEANUP-001`**) foi concluída com êxito, eliminando qualquer ambiguidade de código ou documentação paralela.

---

## O Que Você Precisa Saber Antes de Codificar

1. **Estado do Código:**
   - O Router está 100% funcional com importação manual de relatórios SSW (CSV/TXT).
   - **NENHUMA integração de rede direta com o SSW foi implementada no Router ainda.**
   - O projeto SSWTools serve como fonte da verdade técnica para os fluxos e endpoints já descobertos.

2. **Regras Dogmáticas:**
   - **NENHUMA View pode conhecer endpoints `/bin/sswXXXX`**.
   - Endpoints do SSW não são contratos estáveis. Todas as capabilities são tratadas via `SswCapabilityRegistry` e `SswCapabilitySignature`.
   - Credenciais e cookies autenticados do SSW nunca transitam no client React; passam unicamente pelo Backend Proxy (`server/ssw/` / `server.ts`).
   - O fallback de importação manual de arquivos deve ser preservado indefinidamente.

3. **Próximo Passo Imediato:**
   - Consulte `docs/04_NEXT_TASK.md`.
   - A tarefa imediata é **`SSW-ARCH-001`**: construção da infraestrutura isolada (types/contracts em `src/integrations/ssw/` e componentes backend em `server/ssw/`).
   - Não toque nas Views nem inicie chamadas de rede reais durante a tarefa `SSW-ARCH-001`.

4. **Validações:**
   - Execute sempre `npm run lint` ou `tsc --noEmit` para assegurar que nenhum erro de tipagem foi introduzido.

