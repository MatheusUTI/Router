# Router Core Test Plan

Este plano define os testes manuais e automatizáveis necessários para estabilizar o core operacional do Router antes de novas features grandes.

## 1. Objetivo

Garantir que o Router execute corretamente o fluxo central:

```txt
Importação SSW
→ Normalização
→ Enrichment
→ Mesa de Roteirização
→ Planejamento Manual
→ Pré-Romaneio
→ Separação
→ Romaneio Final
→ Histórico/Relatórios
```

## 2. Escopo da estabilização

### Dentro do escopo

- Importação de CSV/SSW.
- Integridade de campos.
- Dicionário de ocorrências.
- Cidades/rotas.
- Curva A.
- Clientes especiais/diretoria.
- Localização de CTRCs.
- Filtros, busca, ordenação e agrupamentos.
- Pré-romaneio por rota/portão.
- Persistência local.
- Histórico de importações/ocorrências.

### Fora do escopo inicial

- Otimização TSP avançada.
- BI completo.
- Mapas.
- Previsão automática por IA.
- App mobile dedicado.

## 3. Massa de teste mínima

Criar ou manter um conjunto pequeno de CTRCs com variações:

- CTRC disponível sem ocorrência.
- CTRC com ocorrência código simples, exemplo `3`.
- CTRC com ocorrência com zero à esquerda, exemplo `003`.
- CTRC em rota.
- CTRC entregue/finalizador.
- CTRC com Curva A.
- CTRC com cliente diretoria.
- CTRC com FOB.
- CTRC com localização na base destino.
- CTRC em trânsito para a base.
- CTRC em unidade origem.
- CTRC sem cidade mapeada.
- CTRC ROTA 99.
- CTRC com previsão vencida.
- CTRC com previsão hoje.
- CTRC com previsão amanhã.

## 4. Testes de importação

| Teste | Resultado esperado |
|---|---|
| Importar CSV válido | CTRCs aparecem no banco/local state |
| Importar novamente mesmo CSV | Não duplicar indevidamente |
| Código ocorrência `003` | Mantém `003` como string |
| NF vazia | UI mostra `S/N` |
| Cidade vazia | UI mostra fallback controlado |
| Peso com vírgula | Converte corretamente |
| Valor monetário BR | Converte corretamente |

## 5. Testes de enrichment

| Teste | Resultado esperado |
|---|---|
| Cidade conhecida | `normCidade` e rota correta |
| Cidade com alias | Resolve para cidade normalizada |
| Setor 99 | Resolve ROTA 99 |
| Ocorrência existente | Descrição e setor corretos |
| Ocorrência com zero divergente | Lookup tolerante encontra |
| Ocorrência inexistente | Mostra não mapeada e log dev |
| Curva A | Sinalização ativa |
| Cliente diretoria | Sinalização especial acima da Curva A |

## 6. Testes da Mesa

| Teste | Resultado esperado |
|---|---|
| Abrir Mesa | Mostra apenas setores padrão |
| Selecionar todos setores | Mostra CTRCs ocultos também |
| Filtrar ROTA 01 | Mostra apenas effectiveRoute ROTA 01 |
| Buscar por CTRC | Encontra |
| Buscar por NF | Encontra |
| Buscar por remetente | Encontra |
| Buscar por destinatário | Encontra |
| Buscar por cidade | Encontra |
| Buscar por ocorrência | Encontra |
| Ordenar previsão asc | Mais antigos primeiro |
| Ordenar remetente | A-Z/Z-A correto |
| Agrupar por remetente | Grupos corretos |
| Agrupar por previsão | Grupos corretos |

## 7. Testes de planejamento manual

| Teste | Resultado esperado |
|---|---|
| Alterar rota CTRC | effectiveRoute usa rota manual |
| Limpar rota manual | Volta para sugestão |
| Marcar urgente | Badge/estado correto |
| Marcar segurar | CTRC não deve sair por padrão |
| Adicionar observação | Persistência após refresh |

## 8. Testes de pré-romaneio

| Teste | Resultado esperado |
|---|---|
| Selecionar CTRCs de uma rota | Gera um pré-romaneio |
| Selecionar várias rotas | Gera pré-romaneios por rota |
| ROTA 01 | PORTÃO 01 |
| ROTA 02 | PORTÃO 02 |
| Totais | Peso/volumes/valor/frete corretos |
| Sem veículo | Pré-romaneio ainda é válido |

## 9. Testes de bancos mestres

| Banco | Teste crítico |
|---|---|
| Ocorrências | Código string com zero à esquerda |
| Cidades/rotas | Cidade resolve rota correta |
| Curva A | Remetente é detectado |
| Diretoria | Prioridade visual especial |
| Feriados/avisos | Aparece só para base/cidades relevantes |
| Motoristas | Cadastro não quebra romaneio |
| Veículos | Capacidade e tipo preservados |

## 10. Testes visuais mínimos

- 1366x768 sem scroll horizontal.
- Zoom 100% legível.
- Zoom 110% usável.
- Zoom 125% sem quebra crítica.
- Linhas de CTRC separadas visualmente.
- Header sem excesso de filtros.

## 11. Futuro: automação Playwright

Criar testes automatizados para:

- abrir app;
- importar fixture;
- abrir Mesa;
- filtrar por setor ocorrência;
- buscar CTRC;
- ordenar previsão;
- selecionar CTRC;
- gerar pré-romaneio;
- validar screenshot baseline.

## 12. Definição de core estável

O core só será considerado estável quando:

- Importação estiver confiável.
- Mesa refletir dados corretos.
- Ocorrências mapearem corretamente.
- Filtros e ordenações funcionarem como Excel.
- Pré-romaneio funcionar por rota/portão.
- Bancos mestres críticos forem editáveis com validação.
- Checklist de regressão passar.
