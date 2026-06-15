# Golden Paths — Router

Golden Paths são caminhos obrigatórios para implementar alterações recorrentes sem quebrar a arquitetura do Router.

## 1. Novo campo importado do SSW

1. Atualizar tipo bruto em `src/types.ts`.
2. Atualizar aliases no importador.
3. Preservar valor bruto.
4. Criar campo normalizado apenas se necessário.
5. Atualizar enrichment, se o campo participar da decisão.
6. Atualizar UI apenas para exibir.
7. Atualizar checklist/teste manual.

Nunca corrigir campo importado diretamente no componente visual.

## 2. Nova regra de negócio da roteirização

1. Registrar no `SPEC.md`.
2. Verificar se viola `CONSTITUTION.md`.
3. Criar ou ajustar tipos.
4. Implementar em service/helper puro.
5. Usar no enrichment.
6. UI consome campo final.
7. Validar filtro, busca, agrupamento e pré-romaneio.

## 3. Novo banco mestre local

1. Definir modelo em `src/types.ts`.
2. Adicionar tabela Dexie em nova versão.
3. Criar repository em `src/infrastructure/localdb/repositories/`.
4. Criar seed padrão se aplicável.
5. Criar CRUD master com validação.
6. Garantir que código/chave crítica seja `string` quando necessário.
7. Atualizar SPEC/README.
8. Validar persistência após refresh.

## 4. Alteração de schema Dexie

1. Nunca alterar versão antiga destrutivamente.
2. Adicionar nova `db.version(N).stores(...)`.
3. Manter tabelas anteriores.
4. Não renomear chaves sem migração.
5. Testar banco novo e banco já existente.
6. Documentar risco.

## 5. Novo filtro da Mesa

1. Confirmar se o filtro é necessário na UI principal.
2. Preferir Setor de Ocorrência, Rota, Busca e Ordenação.
3. Filtro não pode ser invisível.
4. Hook deve aplicar o filtro de forma explícita.
5. Preferências antigas devem ser ignoradas se não aparecem mais.
6. Atualizar `useRoteirizacaoFilters`.
7. Validar contagem total/filtrada.

## 6. Nova ordenação

1. Adicionar campo no tipo `RoteirizacaoSortField`.
2. Implementar em helper puro.
3. Tratar nulos e strings.
4. Ordenar depois dos filtros.
5. Ordenar dentro de agrupamentos quando aplicável.
6. Persistir preferência se for opção da UI.

## 7. Novo agrupamento

1. Adicionar modo no tipo/hook de grouping.
2. Definir chave humana e fallback.
3. Manter ordenação dentro do grupo.
4. Evitar grupos vazios.
5. Validar totals por grupo.

## 8. Mudança visual em CargaItem

1. Não alterar dados.
2. Não alterar seleção.
3. Não alterar filtros.
4. Não alterar dropdown de planejamento, salvo pedido explícito.
5. Preservar: cidade, rota, CTRC, NF, remetente, destinatário, previsão, ocorrência, setor ocorrência, localização, peso, volumes, valor, frete.
6. Testar 1366x768 e sem scroll horizontal.

## 9. Ocorrências

1. Código sempre `string`.
2. Preservar zeros à esquerda.
3. Lookup pode ser tolerante.
4. Exibição usa código original.
5. Setor de ocorrência vem do banco de ocorrências.
6. Falhas de lookup devem gerar diagnóstico em dev.

## 10. Pré-romaneio

1. Entradas vêm de CTRCs selecionados na Mesa.
2. Agrupar por `effectiveRoute`.
3. Resolver portão via route_gate_map.
4. Não exigir veículo.
5. Persistir status.
6. Calcular totais de peso, volumes, valor e frete.
7. Romaneio final só depois.

## 11. Calendário operacional / avisos

1. Base editável por master.
2. Evento pode ser geral, por unidade, por cidade ou por rota.
3. Avisos aparecem na tela inicial.
4. Filtrar pela unidade ativa e cidades atendidas pela base.
5. Não poluir a Mesa.
6. Não bloquear CTRC automaticamente na primeira fase.

## 12. Relatórios e histórico

1. Não apagar histórico de importações.
2. Registrar mudanças relevantes por CTRC.
3. Separar estado atual de histórico.
4. Relatório deve nascer de dados persistidos, não cálculo manual frágil.
