# ADR-004 — Pré-Romaneio antes da frota

## Status

Aceito.

## Contexto

Na operação real da filial, o veículo não é escolhido no início da roteirização. Primeiro a operação define quais CTRCs vão para cada rota. Depois ocorre a separação física por rota/portão. Somente após essa etapa a frota, motorista e ajudante entram no fluxo.

## Decisão

O Router deve tratar o Pré-Romaneio como etapa intermediária obrigatória entre Mesa de Roteirização e Romaneio Final.

Fluxo correto:

```txt
Mesa de Roteirização
→ Planejamento/Consolidação por rota
→ Pré-Romaneio de Separação
→ Separação física por portão
→ Alocação de veículo/motorista/ajudante
→ Romaneio Final
```

## Consequências

### Positivas

- O sistema reflete a operação real.
- Evita que o painel de frota atrapalhe a montagem da rota.
- Facilita separação física pela expedição.
- Permite carregar veículos após a separação, com base mais confiável.

### Riscos

- Exige controle de status do pré-romaneio.
- Exige conversão posterior para romaneio final.

## Regras derivadas

- Pré-romaneio não exige veículo.
- Pré-romaneio é agrupado por `effectiveRoute`.
- Pré-romaneio resolve portão via mapa rota/portão.
- ROTA 01 → PORTÃO 01, ROTA 02 → PORTÃO 02, salvo parametrização.
