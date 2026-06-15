# Governança de Arquitetura do Router

Esta pasta contém os documentos oficiais para desenvolvimento seguro do Router.

## Ordem de leitura obrigatória

1. `CONSTITUTION.md`
2. `../../SPEC.md`
3. `AI_HARNESS.md`
4. `REGRESSION_CHECKLIST.md`
5. `GOLDEN_PATHS.md`
6. Arquivos em `ADR/`
7. `../testing/ROUTER_TEST_PLAN.md`

## Documentos

| Documento | Função |
|---|---|
| `CONSTITUTION.md` | Lei suprema técnica e operacional do Router |
| `AI_HARNESS.md` | Processo seguro para alterações assistidas por IA |
| `REGRESSION_CHECKLIST.md` | Checklist obrigatório antes de considerar uma alteração pronta |
| `GOLDEN_PATHS.md` | Caminhos corretos para implementar mudanças recorrentes |
| `ADR/` | Registros de decisões arquiteturais |
| `../testing/ROUTER_TEST_PLAN.md` | Plano de testes do core operacional |

## Regra de evolução

Antes de novas funcionalidades grandes, o core deve ser validado contra o checklist:

1. Importação.
2. Enrichment.
3. Ocorrências.
4. Mesa de Roteirização.
5. Filtros, ordenação e agrupamentos.
6. Pré-romaneio.
7. Bancos mestres.
8. Histórico.

## Próxima etapa recomendada

Executar uma auditoria do core atual sem alterar código funcional, listando divergências, riscos e ordem de correção.
