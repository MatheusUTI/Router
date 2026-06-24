# Handoff para Novos Agentes / Desenvolvedores

## Estado Atual
O projeto Router chegou à **Baseline V1.25.0**.
A Mesa de Roteirização estabilizou seu layout de Planilha Operacional, filtros principais, comportamento dinâmico de filial e tema Day/Dark.

## O Que Não Pode Ser Quebrado
- Estrutura em Planilha Operacional.
- Regra de filtragem de Filial Operacional (destino) vs. Localização.
- Subcontratos sendo roteirizáveis.
- Setor Ocorrencia direcionando a disponibilidade.
- Escala de zoom (85%, 100%, 110%, etc).
- Suporte mínimo a telas de 1366x768.

## Como Testar
- Logar com `master` / `123`.
- Importar uma base real.
- Realizar validação dos filtros, seleção e montagem de pré-separação.
- Alternar temas e escalas de Mesa.

## Fluxo de Validação
1. Validar e formatar: `npm run lint`
2. Checar build: `npm run build`
3. Commit
4. Testar resultado em Vercel no ambiente correspondente

## Arquivos Principais a Observar
- `src/components/roteirizacao/RoteirizacaoView.tsx` (Mesa)
- `src/components/roteirizacao/CargaList.tsx`
- `src/components/roteirizacao/CargaItem.tsx`
- `src/components/roteirizacao/hooks/useRoteirizacaoFilters.ts` (Core Rules)

## Instrução Crucial
Antes de alterar ou evoluir a Mesa de Roteirização, **obrigatório** ler:
- `docs/11_ROUTER_DESIGN_SYSTEM.md`
- `docs/12_OPERATIONAL_RULES.md`
