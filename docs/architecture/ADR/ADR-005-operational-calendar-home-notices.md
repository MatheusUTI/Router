# ADR-005 — Calendário Operacional e avisos na tela inicial

## Status

Aceito.

## Contexto

Feriados, eventos municipais, restrições operacionais e avisos internos afetam a decisão logística. Porém, exibir muitos avisos dentro da Mesa de Roteirização polui o fluxo e reduz a velocidade de decisão.

Além disso, a filial só deve ver avisos relacionados à sua operação: cidades atendidas pela base, eventos gerais e avisos internos aplicáveis.

## Decisão

O Router terá um Calendário Operacional editável por usuário master, e os avisos relevantes serão exibidos na tela inicial do app.

A Mesa de Roteirização não deve ser poluída por avisos gerais.

## Regras

- Avisos aparecem na tela principal/inicial.
- Avisos são filtrados por unidade/base ativa.
- Eventos nacionais/gerais aparecem para todas as bases.
- Eventos municipais aparecem apenas se a cidade fizer parte da base/rota da unidade.
- Antecedência padrão: 5 dias.
- Eventos podem ser recorrentes ou específicos por ano.
- O banco deve permitir edição manual por master.

## Consequências

### Positivas

- A Mesa fica limpa.
- O supervisor vê alertas ao abrir o app.
- O calendário vira ferramenta operacional ampla, não apenas feriado.

### Riscos

- Exige mapa confiável cidade/base.
- Exige CRUD para correção manual.

## Regras derivadas

- O módulo deve se chamar Calendário Operacional, não apenas Feriados.
- Avisos não bloqueiam CTRCs automaticamente na fase inicial.
