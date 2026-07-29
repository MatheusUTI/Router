# Documento de Handoff (Continuidade)

## Contexto para a IA/Dev
O projeto RotaOperational (Router) é uma ferramenta crítica de logística que já se encontra estável em sua versão Operacional da Mesa (`v1.25.0`). O núcleo pesado do sistema - Importação -> Filtragem Dinâmica -> Pré-Separação - funciona em arquitetura offline-first (Dexie IndexedDB) sincronizando com Supabase.

## Fluxo Principal a Compreender
1. **Dados em Entrada:** O componente de Importação puxa planilhas ou TXTs (SSW), processa as Praças (Filiais), normaliza status (via Services) e injeta no `IndexedDB.ctrcs`.
2. **Uso Contínuo (Mesa):** Em `RoteirizacaoView.tsx`, filtros massivos ocorrem consumindo as tabelas de Dexie.
3. **Uso em Saída:** Cargas selecionadas geram instâncias de `pre_romaneios`, alterando o status das cargas e criando rotinas de subida ao Supabase (sync queue).

## Riscos Operacionais Presentes
- A aplicação possui um arquivo legado gigantesco: `src/supabase.ts` onde, antes do padrão Repository ser totalmente abraçado, faziam-se upserts diretos para a nuvem. Isso precisa ser purgado e migrado 100% para os Repositories.
- O cálculo de "Disponibilidade" e "Setor" é volátil e depende da integridade do string parsing da importação.

## O Que Está Pendente
Os Dashboards Táticos e indicadores KPIs exibem muitos números falsos ou fixos na UI e não reagem às métricas extraídas puramente do IndexedDB de forma completa. Algumas tabelas do Supabase podem estar com políticas de RLS muito soltas ou muito rígidas (causando falhas pontuais de sync perdoadas silenciosamente).

## Como Continuar
1. Verifique `04_NEXT_TASK.md` para entender exatamente o que precisa ser feito agora.
2. Em todo início de ciclo, leia `00_RULES.md` e não execute comandos de deleção ou refatoração global que modifiquem componentes visuais estáveis.
3. Não presuma que "algo está no backend"; não há Node Backend, toda a lógica processa no Client Browser e bate no Supabase Postgres via PostgREST/Client.
4. Após sua implementação, valide com `npm run lint` e reescreva o `04_NEXT_TASK.md` para a próxima iteração.
