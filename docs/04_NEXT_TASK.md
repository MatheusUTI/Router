# Próxima Tarefa Recomendada

**ID da Tarefa:** REF-001
**Título:** Desacoplar `supabase.ts` monolítico e migrar fluxo para Repositórios Supabase Específicos.

## Contexto
O projeto RotaOperational passou por uma organização de arquitetura que introduziu repositórios orientados a domínio na pasta `src/infrastructure/supabase/repositories/` (e.g., `preRomaneioSupabaseRepository.ts`, `shipmentSupabaseRepository.ts`).
Entretanto, o arquivo `src/supabase.ts` continua atuando como um "God Object" contendo centenas de linhas com consultas diretas (queries de update, insert e delete massivo) repetindo as funcionalidades dos repositórios ou silenciando erros.

## Problema
Isso gera duplicidade de lógica, dificulta testes automatizados de integração, aumenta o risco de dados assíncronos quebrarem no futuro, e confunde a manutenção.

## Objetivo
Refatorar a aplicação para que as funções de sincronismo parem de usar os métodos sujos do arquivo `src/supabase.ts` e passem a instanciar/usar unicamente as classes em `infrastructure/supabase/repositories/`. O arquivo `supabase.ts` deve apenas inicializar a conexão do cliente (exportar o `client`).

## Escopo
- Limpar `src/supabase.ts`, deixando apenas a inicialização do client Supabase (`createClient`).
- Transferir lógicas restantes de Sync não-cobertas (se houver) para seus respectivos Repositórios.
- Atualizar importações em `App.tsx` e `SolucaoView` para usarem as dependências novas injetadas.
- Preservar o fallback para Offline-first perfeitamente.

## Fora do Escopo
- Alterar o banco local `Dexie`.
- Criar regras RLS (Políticas) no ambiente do Supabase na nuvem.
- Implementar novas telas.

## Arquivos Candidatos
- `src/supabase.ts`
- `src/App.tsx` (que chama funções de sync no boot)
- Qualquer componente (`SolucaoView`, `LoginView`) que possua imports importando funções espúrias de `supabase.ts`.

## Critérios de Aceite
- `src/supabase.ts` exporta apenas a inicialização do Supabase Client e nenhuma lógica de negócio (CRUD).
- Todos os processos de Sincronismo da inicialização do `App.tsx` continuam lendo os dados, sem travar (se online).
- Sem erros de build (verificar rodando `npm run lint` ou `npm run build`).

## Commit Sugerido
`refactor: replace monolithic supabase.ts calls with specific repository implementations`

## Checklist
- [ ] Mapear todas as funções exportadas em `supabase.ts`.
- [ ] Transferir o que falta para `src/infrastructure/supabase/repositories`.
- [ ] Mudar os imports no frontend (`App.tsx`, `components/*`).
- [ ] Excluir lógicas do `supabase.ts`.
- [ ] Executar Build e Lint.
- [ ] Atualizar `03_CURRENT_STATE.md`.
