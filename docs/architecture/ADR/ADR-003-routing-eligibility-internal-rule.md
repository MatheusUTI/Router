# ADR-003 — Elegibilidade de roteirização como regra interna de segurança

## Status

Aceito.

## Contexto

Nem todo CTRC importado do SSW representa mercadoria física disponível para entrega. Há CTRCs já entregues, em rota, finalizados, retidos administrativamente ou sem mercadoria física no galpão. Exibir todos por padrão na Mesa aumenta risco de erro operacional.

Ao mesmo tempo, todos os CTRCs devem continuar consultáveis para histórico, análise e relatórios.

## Decisão

`routingEligibility` será mantida como regra interna de segurança operacional.

Valores:

- `ROTEIRIZAVEL`
- `REVISAR`
- `NAO_ROTEIRIZAVEL`

A UI principal não deve usar elegibilidade como filtro protagonista. O filtro operacional principal da Mesa é Setor de Ocorrência.

## Consequências

### Positivas

- Mesa fica mais próxima da lógica do Excel.
- Operador enxerga categorias conhecidas da operação.
- Sistema continua protegendo contra CTRCs indevidos.
- Todas as ocorrências continuam consultáveis.

### Riscos

- A proteção precisa continuar ativa em seleção/consolidação.
- Alterações no Dicionário de Ocorrências podem afetar elegibilidade.

## Regras derivadas

- Setores úteis devem abrir por padrão.
- Setores não roteirizáveis ficam acessíveis por filtro manual.
- Seleção de CTRC não roteirizável deve gerar alerta ou bloqueio conforme regra vigente.
