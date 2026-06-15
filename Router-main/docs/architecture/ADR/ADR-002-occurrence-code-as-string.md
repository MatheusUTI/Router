# ADR-002 — Código de ocorrência como string preservando zeros

## Status

Aceito.

## Contexto

O SSW e os bancos de ocorrências podem representar códigos com zeros à esquerda ou até 5 dígitos. Converter esses códigos para número remove zeros e pode quebrar o mapeamento da ocorrência, setor de ocorrência e elegibilidade operacional.

## Decisão

Código de ocorrência será sempre tratado como `string`.

- A exibição deve preservar o código original vindo do SSW.
- O cadastro de ocorrências deve aceitar até 5 dígitos.
- O lookup pode usar variações tolerantes, mas nunca alterar o valor exibido.
- É proibido usar conversão numérica permanente para código de ocorrência.

## Consequências

### Positivas

- Evita perda de zeros à esquerda.
- Aumenta compatibilidade entre SSW e Dicionário de Ocorrências.
- Reduz casos de “ocorrência não mapeada”.

### Riscos

- Requer helpers específicos para lookup tolerante.
- Requer validação em CRUD master.

## Regras derivadas

- `OccurrenceRepository` deve persistir `codigo` como string.
- Enrichment deve procurar por código com estratégia tolerante.
- UI deve mostrar código original.
