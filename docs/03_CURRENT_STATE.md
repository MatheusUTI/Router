# Estado Atual do Projeto

**Versão Consolidada Base:** `v1.25.0`
**Fase Atual:** Formalização da Integração Resiliente SSW (AISDD).

O código atual foi verificado contra a especificação AISDD. A infraestrutura base funciona sob o padrão Offline-First (Dexie IndexedDB) integrado ao Supabase. Toda a nova capacidade de integração direta ao SSW está formalizada documentalmente e aguarda implementação a partir da tarefa de infraestrutura `SSW-ARCH-001`.

---

## Tabela de Módulos e Status AISDD

| Módulo / Funcionalidade | Status AISDD | Observações e Riscos |
|---|---|---|
| **Autenticação (Login Local & Supabase)** | `[EXISTENTE NO ROUTER]` | Funciona bem usando fallback local (`master`/`anderson`). Supabase Auth em evolução. |
| **Estrutura Base (UI, Temas Dark/Light)** | `[EXISTENTE NO ROUTER]` | Tema Dark/Light e densidade aplicados via Contexto e classes do Tailwind. Menu lateral consolidado. |
| **Importação Manual de Arquivos SSW (CSV/TXT)** | `[EXISTENTE NO ROUTER]` | Normalização e persistência no banco local estão funcionais. Serve como fallback operacional definitivo. |
| **Mesa de Roteirização (Planilha Dinâmica)** | `[EXISTENTE NO ROUTER]` | Núcleo central estável; filtros dinâmicos, totações em real-time e seleções implementadas (`RoteirizacaoView.tsx`). |
| **Regras Operacionais na Mesa (Filial/Destino/GR)** | `[EXISTENTE NO ROUTER]` | Filtros por "Setor Ocorrencia" e mapeamento "Localização x Destino" ativos. Alertas de GR funcionais. |
| **Pré-Romaneio (Agrupamento e Separação)** | `[EXISTENTE NO ROUTER]` | Fluxo de consolidar selecionados em pré-romaneio e imprimir checklist funciona perfeitamente. |
| **Gestão de Frota e Configurações** | `[EXISTENTE NO ROUTER]` | Cadastros de veículos e parâmetros funcionando no IndexedDB e sync Supabase. |
| **Dashboards e KPIs** | `[EXISTENTE NO ROUTER]` | Telas desenhadas; cálculos em processo de enriquecimento com a base local. |
| **Fundação SSW (Registry, Signatures, Resilience)** | `[EXISTENTE NO ROUTER]` | Implementada no ciclo `SSW-ARCH-001` (`src/integrations/ssw/` e `server/ssw/`), com cobertura unitária completa. |
| **SSW 455 (Download Automático de Entregas & UX Sob Demanda)** | `[EXISTENTE NO ROUTER]` | Ciclo `SSW-455-UX-001` concluído: split UX ("Sincronizar Último 455" vs "Gerar Novo 455"), matching estrito de ownership (usuário/unidade), retry direcionado sem re-emissão acidental e suíte de testes 100% verde. |
| **SSW 101 (Consulta CTRC/NF Sob Demanda)** | `[EXISTENTE NO ROUTER]` | Ciclo `SSW-101-001` concluído: Gateway, parser HTML resiliente, serviço com cache TTL + Circuit Breaker + Retry Policy, DTOs de rastreamento completo e integração visual com `CtrcDetailDrawer` na Mesa de Roteirização e no Monitor SSW. |
| **SSW 029 (Previsão de Cargas)** | `[CONFIRMADO NO SSWTOOLS]` / `[ARQUITETURA APROVADA]` / `[NÃO IMPLEMENTADO]` | Confirmado no SSWTools; planejado no roadmap (`SSW-RECEIVING-001`). |
| **SSW 030 + 023 (Manifestos e CTRCs)** | `[CONFIRMADO NO SSWTOOLS]` / `[ARQUITETURA APROVADA]` / `[NÃO IMPLEMENTADO]` | Confirmado no SSWTools; planejado no roadmap (`SSW-RECEIVING-001`). |
| **SSW 264 (Descarga Física na Doca)** | `[CONFIRMADO NO SSWTOOLS]` / `[ARQUITETURA APROVADA]` / `[NÃO IMPLEMENTADO]` | Confirmado no SSWTools; planejado no roadmap (`SSW-UNLOADING-001`). |
| **Consolidação Recebimento/Descarga (R/D)** | `[CONFIRMADO NO SSWTOOLS]` / `[ARQUITETURA APROVADA]` / `[NÃO IMPLEMENTADO]` | Confirmado no SSWTools; planejado no roadmap (`SSW-RD-001`). |
| **SSW 063 (Emissões e Faturamento)** | `[CONFIRMADO NO SSWTOOLS]` / `[ARQUITETURA APROVADA]` / `[NÃO IMPLEMENTADO]` | Confirmado no SSWTools; planejado no roadmap (`SSW-063-001`). |
| **Roteirização Preditiva Multi-Estados** | `[PLANEJADO]` / `[NÃO IMPLEMENTADO]` | Visão futura pós-consolidação de todas as fontes de carga. |

---

## Dívidas Técnicas Mapeadas (Technical Debts)

As seguintes dívidas técnicas foram registradas durante a auditoria `REPO-CLEANUP-001` para resolução em ciclos futuros específicos, sem impacto na estabilidade atual:

1. **`src/supabase.ts` Monolítico**: Centralização excessiva de lógicas de autenticação, tabelas e helpers em um único arquivo legado.
2. **Sobreposição Arquitetural Supabase**: Coexistência de `src/supabase.ts` com a camada moderna de repositórios em `src/infrastructure/supabase/`.
3. **Uso de `localStorage` para Configuração do Supabase**: Armazenamento de URLs e chaves customizadas no cliente em vez de configuração unificada via variáveis de ambiente/backend.
4. **Volume do Componente `App.tsx`**: Centralização de múltiplos estados de sincronização, modais e handlers no componente raiz.
5. **Cobertura de Testes Automatizados**: Ausência de suíte de testes unitários e de integração automatizados em CI/CD.

---

## Riscos Atuais e Mitigações
1. **Volatilidade de Endpoints do SSW**: Mitigada pela arquitetura de `SswCapabilityRegistry`, `SswCapabilitySignature` e `SswDiscoveryEngine`.
2. **Exposição de Credenciais**: Mitigada pelo isolamento estrito via Backend Proxy do Router (React nunca toca credenciais do SSW).
3. **Sobrecarga no Servidor SSW**: Mitigada pelo `SswCircuitBreaker` com backoff progressivo (5m, 15m, 30m, 60m) e políticas de cache Local-First.
4. **Continuidade Operacional**: Mitigada pela manutenção permanente da importação manual de relatórios (CSV/TXT) como fallback de contingência.

