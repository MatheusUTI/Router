# AI Harness — Router

Este documento define como qualquer IA/coding agent deve atuar no Router. Ele existe para reduzir regressões, impedir drift arquitetural e preservar a lógica operacional da transportadora.

## 1. Objetivo

Toda alteração feita com IA deve ser pequena, rastreável, validável e aderente ao domínio logístico real.

O agente não deve apenas “fazer código”. Ele deve operar dentro de um ciclo obrigatório:

```txt
Ler regras -> entender escopo -> identificar risco -> alterar pouco -> validar -> relatar
```

## 2. Ordem obrigatória de leitura

Antes de alterar qualquer arquivo, o agente deve ler:

1. `docs/architecture/CONSTITUTION.md`
2. `SPEC.md`
3. `docs/architecture/AI_HARNESS.md`
4. `docs/architecture/REGRESSION_CHECKLIST.md`
5. ADRs relacionados em `docs/architecture/ADR/`
6. Arquivos diretamente afetados

## 3. Modo de trabalho obrigatório

Para cada solicitação:

1. Identificar o objetivo funcional.
2. Identificar quais módulos podem ser afetados.
3. Declarar o risco: baixo, médio ou alto.
4. Listar arquivos que pretende alterar.
5. Implementar a menor alteração segura.
6. Não misturar feature, refatoração e redesign na mesma alteração.
7. Rodar validações disponíveis.
8. Atualizar documentação quando houver mudança de regra.
9. Reportar pendências reais.

## 4. Escopos proibidos sem autorização explícita

- Alterar schema Dexie sem versionamento.
- Apagar tabela, banco, dados ou seed.
- Alterar Supabase/sync sem solicitação.
- Transformar código de ocorrência em número.
- Criar filtro invisível que afeta resultado.
- Corrigir dado dentro de componente visual.
- Substituir fluxo de pré-romaneio por fluxo direto de veículo.
- Redesenhar tela inteira quando o pedido for correção pontual.
- Remover compatibilidade com dados já persistidos.
- Adicionar dependência externa sem justificar.

## 5. Regras de alteração por tipo

### 5.1 Correção de dados

Deve atuar nesta ordem:

1. Importador.
2. Tipo/modelo.
3. Repository.
4. Enrichment/service.
5. Hook/filtro.
6. UI.

UI nunca deve mascarar erro de dados.

### 5.2 Correção visual

Deve preservar:

- dados exibidos;
- filtros;
- agrupamentos;
- seleção;
- consolidação;
- responsividade sem scroll horizontal.

### 5.3 Novo banco mestre

Deve seguir Golden Path:

1. Tipo em `src/types.ts`.
2. Tabela Dexie versionada.
3. Repository.
4. Seed, se aplicável.
5. CRUD master, se aplicável.
6. Validação.
7. SPEC/README.

### 5.4 Nova regra operacional

Deve seguir Golden Path:

1. Registrar no SPEC.
2. Criar tipo/contrato.
3. Implementar em service/helper.
4. UI apenas consome.
5. Criar validação ou checklist.

## 6. Critérios mínimos de validação

Toda resposta final do agente deve incluir:

1. Estado atual identificado.
2. Alterações realizadas.
3. Arquivos modificados.
4. Como validar manualmente.
5. Resultado de TypeScript/build.
6. Pendências reais.

Se não rodou build, deve dizer explicitamente.

## 7. Classificação de risco

### Baixo risco

- Texto/documentação.
- Ajuste visual pequeno.
- Ajuste de label.
- Helper puro sem alterar fluxo.

### Médio risco

- Hook de filtros.
- Enrichment.
- Importação.
- Repository.
- Mudança de fluxo de UI.

### Alto risco

- Schema Dexie.
- Sync/Supabase.
- Migração de dados.
- Consolidação/romaneio.
- Exclusão/limpeza de dados.
- Alteração ampla de tipos.

## 8. Saída final padrão

O agente deve responder sempre neste formato:

```txt
1. Estado atual identificado
2. Alterações realizadas
3. Arquivos modificados
4. Validação executada
5. Como testar manualmente
6. Pendências reais
```

## 9. Regra de parada

Se o agente encontrar ambiguidade que possa quebrar regra operacional, deve parar e reportar a dúvida em vez de inventar comportamento.

Exemplos:

- Campo de cidade ambíguo.
- Código de ocorrência divergente.
- Rota sem correspondência.
- Mudança de schema sem migração clara.
- Filtro que poderia ocultar CTRCs indevidamente.
