# Regression Checklist — Router Core

Este checklist deve ser usado antes de declarar qualquer alteração como concluída. Ele protege o core operacional do Router contra regressões geradas por mudanças humanas ou por IA.

## 1. Checklist obrigatório geral

- [ ] Li `CONSTITUTION.md`.
- [ ] Li `SPEC.md`.
- [ ] Li `AI_HARNESS.md`.
- [ ] A alteração respeita o escopo solicitado.
- [ ] Não houve refatoração ampla não solicitada.
- [ ] Não houve mudança de schema sem versionamento.
- [ ] Não houve dependência cloud para operação local.
- [ ] TypeScript passou.
- [ ] Build passou.
- [ ] Pendências reais foram documentadas.

## 2. Importação SSW/CSV

- [ ] CTRC é importado no campo correto.
- [ ] NF é importada no campo correto.
- [ ] Remetente é importado no campo correto.
- [ ] Destinatário é importado no campo correto.
- [ ] Cidade de entrega é importada no campo correto.
- [ ] Previsão de entrega é importada no campo correto.
- [ ] Código de ocorrência é string.
- [ ] Código de ocorrência preserva zeros à esquerda.
- [ ] Peso, volume, valor e frete são parseados corretamente.
- [ ] Localização atual é importada corretamente.
- [ ] Unidade/base é importada corretamente.
- [ ] CTRC não duplica indevidamente.
- [ ] Histórico de ocorrência não perde dados anteriores.

## 3. Enrichment da roteirização

- [ ] `normCidade` vem da cidade de entrega.
- [ ] `normRota` vem do BD cidades/rotas ou regra documentada.
- [ ] `effectiveRoute = operationalRoute || suggestedRoute`.
- [ ] Setor de ocorrência vem do Dicionário de Ocorrências.
- [ ] Código de ocorrência exibido é o original do SSW.
- [ ] Descrição de ocorrência vem da base correta.
- [ ] Ocorrência não mapeada aparece apenas quando realmente não encontrada.
- [ ] Curva A é calculada pelo remetente.
- [ ] Cliente especial/diretoria, quando existir, tem prioridade visual maior.
- [ ] SLA usa previsão de entrega.
- [ ] Localização não sobrescreve status, rota ou cidade.

## 4. Mesa de Roteirização

- [ ] Abre com setores de ocorrência padrão.
- [ ] Permite selecionar todos os setores manualmente.
- [ ] Filtro de rota usa `effectiveRoute`.
- [ ] Filtro de setor ocorrência usa `occurrenceSector`.
- [ ] Busca funciona por CTRC.
- [ ] Busca funciona por NF.
- [ ] Busca funciona por remetente.
- [ ] Busca funciona por destinatário.
- [ ] Busca funciona por cidade.
- [ ] Busca funciona por rota.
- [ ] Busca funciona por ocorrência.
- [ ] Busca funciona por localização.
- [ ] Ordenação por previsão funciona.
- [ ] Ordenação por remetente funciona.
- [ ] Ordenação por destinatário funciona.
- [ ] Ordenação por cidade funciona.
- [ ] Ordenação por peso funciona.
- [ ] Ordenação por volumes funciona.
- [ ] Ordenação por valor/frete funciona.
- [ ] Agrupamento por rota funciona.
- [ ] Agrupamento por cidade funciona.
- [ ] Agrupamento por remetente funciona.
- [ ] Agrupamento por destinatário funciona.
- [ ] Agrupamento por previsão funciona.
- [ ] Não há scroll horizontal indesejado.
- [ ] Layout é utilizável em 1366x768.

## 5. Seleção e planejamento manual

- [ ] Selecionar CTRC funciona.
- [ ] Limpar seleção funciona.
- [ ] Alterar rota manual funciona.
- [ ] Rota manual prevalece sobre sugestão.
- [ ] Marcar urgente/prioridade/segurar/não sai hoje funciona.
- [ ] Observação operacional é persistida.
- [ ] Alteração manual não altera dados brutos.
- [ ] CTRC consolidado não é selecionado indevidamente.

## 6. Ocorrências

- [ ] CRUD master salva código como string.
- [ ] Código aceita até 5 dígitos.
- [ ] Zeros à esquerda são preservados.
- [ ] Descrição/motivo é obrigatória.
- [ ] Responsabilidade é mantida.
- [ ] Setor responsável/setor ocorrência é mantido.
- [ ] Gera retorno à base é mantido.
- [ ] Tratativa de solução proposta é mantida.
- [ ] Tipo de classificação não é obrigatório para roteirização.

## 7. Bancos mestres

- [ ] Cidades/rotas têm CRUD master validado.
- [ ] Dias de entrega por cidade são preservados.
- [ ] Rota não aceita valor vazio quando cidade ativa.
- [ ] Curva A tem CRUD master.
- [ ] Clientes especiais/diretoria têm CRUD master ou estão planejados.
- [ ] Feriados/avisos têm CRUD master ou estão planejados.
- [ ] Veículos/motoristas/ajudantes/agregados têm CRUD master ou estão planejados.

## 8. Pré-romaneio

- [ ] Pré-romaneio é gerado por rota efetiva.
- [ ] Portão é resolvido pelo mapa rota/portão.
- [ ] Veículo não é obrigatório no pré-romaneio.
- [ ] CTRCs permanecem vinculados.
- [ ] Totais de peso, volumes, valor e frete batem com selecionados.
- [ ] Status do pré-romaneio é persistido.
- [ ] Pré-romaneio não substitui romaneio final.

## 9. Calendário operacional e avisos

- [ ] Feriados/avisos são salvos em banco editável.
- [ ] Avisos aparecem na tela inicial, não poluem a Mesa.
- [ ] Avisos são filtrados pela unidade/base ativa.
- [ ] Eventos nacionais/gerais aparecem para todas as bases.
- [ ] Cidades fora da base não aparecem para a operação atual.
- [ ] Antecedência padrão de 5 dias é respeitada.

## 10. Histórico e relatórios futuros

- [ ] Importações de 31 dias não apagam histórico útil.
- [ ] Ocorrência atual é atualizada.
- [ ] Histórico de mudanças por CTRC é preservado.
- [ ] Dados futuros de KPI não são destruídos por limpeza indevida.

## 11. Critério final

Se qualquer item crítico falhar, a alteração não está pronta.

Itens críticos:

- Importação troca campos.
- Ocorrência perde zeros.
- Mesa oculta CTRCs de forma invisível.
- Rota usa campo errado.
- Pré-romaneio exige veículo antes da hora.
- Build falha.
