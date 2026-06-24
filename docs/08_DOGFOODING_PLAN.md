# Dogfooding Plan

## 1. Objetivo
Usar o Router no fluxo real de roteirização diária para validar o produto na prática e validar o método AISDD de desenvolvimento.

## 2. Cenários de Teste
- Importar base real completa.
- Verificar filiais (se a listagem e contagem batem).
- Verificar subcontratos (preservação de VGS/VGA, etc).
- Filtrar por filial (unidade responsável pela entrega).
- Filtrar por cidade/rota.
- Filtrar por ocorrência.
- Filtrar por Setor de Ocorrência.
- Selecionar múltiplos CTRCs.
- Realizar a pré-separação de cargas.
- Cancelar pré-separação em andamento.
- Abrir e validar a tela de Programação do Dia.
- Testar links externos (como SSW).
- Alternar tema Day/Dark e validar consistência.
- Alterar escala da Mesa (85%, 100%, 110%, etc).
- Testar layout em resolução mínima 1366x768 (zoom 100%).

## 3. Critérios de Sucesso
- Mesa consegue substituir ou reduzir drasticamente a dependência da planilha manual.
- O operador encontra as cargas de sua responsabilidade rapidamente.
- A regra de filial operacional correta é respeitada.
- A disponibilidade bate perfeitamente com o Setor Ocorrencia.
- O processo de pré-separação não perde ou corrompe CTRCs selecionados.
- Vercel reflete o commit operacional corretamente.

## 4. Métricas Manuais
- Tempo para encontrar uma carga específica.
- Tempo para montar um pré-romaneio consolidado.
- Quantidade de erros visuais encontrados na tela.
- Quantidade de divergências de dados contra a planilha oficial (Excel).
- Divergências de Filial.
- Divergências de Ocorrência.
- Divergências de Disponibilidade.

## 5. Registro de Bugs
| Data | Versão | Cenário | Erro Observado | Impacto | Status | Commit de Correção |
|---|---|---|---|---|---|---|
| | | | | | | |
