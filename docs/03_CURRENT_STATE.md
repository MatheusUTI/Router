# Estado Atual do Projeto

**Versão Consolidada Base:** `v1.25.0`
**Fase:** Operação Estável da Mesa de Roteirização.

O código atual foi inspecionado de acordo com a documentação AISDD. A infraestrutura base funciona sob o padrão Offline-First (Dexie IndexedDB) integrado ao Supabase.

## Módulos e Funcionalidades

| Funcionalidade | Status | Observações e Riscos (Pendências) |
|---|---|---|
| Autenticação (Login) | 🟡 Parcial | Funciona bem usando fallback local para `master`/`anderson`. O Supabase Auth real ainda possui trechos de código com `if(false)` ou catch silenciosos na integração nativa. |
| Estrutura Base (UI, Temas) | ✅ Completo | Tema Dark/Light e densidade aplicados via Contexto e classes do Tailwind. Menu lateral consolidado. |
| Importação (SSW) | ✅ Completo | Normalização e persistência no banco local estão funcionais. Falhas de parse no roteamento da Praça de Destino (VGA vs BHZ) parecem já estar tratadas via rules, mas demandam cobertura de testes. |
| Mesa de Roteirização | ✅ Completo | O coração do app, filtros dinâmicos, totações em real-time e seleções estão implementados. A interface "Planilha" densa está funcional. (Base: `RoteirizacaoView.tsx`) |
| Regras Operacionais na Mesa | 🟡 Parcial | Filtros por "Setor Ocorrencia" e mapeamento "Localização x Destino" estão ativos. Porém a tratativa robusta de exceções de string na extração pode exigir manutenções caso o formato SSW altere. |
| Pré-Romaneio (Pré-Separação) | ✅ Completo | O fluxo de consolidar selecionados em um pré-romaneio e imprimir funciona perfeitamente, salvando na base local e marcando para sync. |
| Gestão de Frota e GR | 🟡 Parcial | Cadastros funcionam. O cálculo de bloqueio de GR emite alerta vermelho na Mesa, mas a lógica de liberação (Token, etc.) ainda não impede a impressão. |
| Dashboards e KPIs | ⚪ Não Iniciado / Mock | A tela `DashboardView` contém código renderizando componentes bonitos, mas as métricas de `kpiDashboardService.ts` ainda dependem de muitos dados falsos ou dados estáticos, não conectando 100% com a base real importada em alguns pontos. |
| Sincronismo Supabase | 🟡 Parcial | Classes de Repositórios Supabase existem (`userPresence`, `shipments`, `preRomaneio`), mas a transição total de funções legadas dento do `src/supabase.ts` genérico para as classes orientadas a domínio ainda está incompleta. Muitos blocos `try/catch` silenciosos ao falhar comunicação. |

## Qualidade e Erros Identificados
- Existem funções legadas (ou duplicadas) de sync no arquivo raiz `src/supabase.ts` e novos Repositories na pasta `infrastructure/supabase`. 
- Há instâncias de logs perdidos ou dependentes do `console.warn` em falhas graves do IndexedDB/Supabase que poderiam prejudicar a auditoria.
- Códigos `TODO:` foram identificados em arquivos como `useRoteirizacaoFilters.ts` referenciando fases futuras (ex: base dinâmica de Cidades/Rotas).

## Riscos Atuais
- **Perda de Dados Silenciosa**: O sincronismo se falhar repetidas vezes pode lotar o `sync_queue` do Dexie sem avisar criticamente o usuário final.
- **Inconsistência de Supabase Rules**: RLS e Políticas no banco de produção (PostgreSQL) podem não estar perfeitamente alinhadas com as consultas front-end feitas pelos `repositories`.
