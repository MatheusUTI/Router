# Router Engineering Constitution

Este documento é a lei operacional e técnica do Router. Toda alteração feita por humano ou IA deve obedecer a estas regras antes de alterar código, telas, bancos ou documentação.

## 1. Hierarquia de verdade

1. `CONSTITUTION.md` define regras imutáveis do projeto.
2. `SPEC.md` define comportamento funcional e técnico esperado.
3. ADRs explicam decisões arquiteturais permanentes.
4. Código implementa o que foi especificado.
5. README explica uso, instalação e visão geral, mas não substitui o SPEC.

Se houver conflito entre documentos, seguir esta ordem e registrar a divergência antes de implementar.

## 2. Princípios fundamentais

- O Router é **local-first/offline-first**.
- A operação logística nunca deve depender diretamente da nuvem para roteirizar, separar, consolidar ou consultar dados críticos.
- IndexedDB/Dexie é a fonte local primária para operação imediata.
- Supabase é camada de sincronização, backup, multi-dispositivo e governança remota, não bloqueio operacional.
- Toda escrita operacional deve funcionar offline e sincronizar depois, quando aplicável.
- O sistema deve refletir a operação real da filial, não uma abstração genérica de TMS.

## 3. Regras de dados brutos, normalizados e derivados

- Dados brutos importados do SSW devem ser preservados.
- Dados derivados devem ser criados por services/helpers, especialmente no enrichment.
- UI não corrige dados; UI apenas exibe dados já resolvidos.
- Importador não deve inventar significado operacional.
- Enrichment transforma CTRC bruto em item operacional para decisão.
- Dados normalizados devem manter rastreabilidade para o campo bruto original.

## 4. Regras críticas de CTRC

- CTRC é chave operacional central.
- NF nunca deve ser confundida com CTRC.
- Destinatário nunca deve ser cidade.
- Cidade de entrega nunca deve ser destinatário.
- Remetente é crítico para Curva A e clientes especiais.
- Pagador não deve aparecer como campo principal da Mesa, mas pode alimentar regra FOB.
- Previsão de entrega deve vir da previsão do SSW, não da data de ocorrência, importação ou emissão.

## 5. Ocorrências

- Código de ocorrência é sempre `string`.
- Código de ocorrência pode ter até 5 dígitos.
- Zeros à esquerda devem ser preservados.
- É proibido converter código de ocorrência com `parseInt`, `Number` ou equivalente para persistência/exibição.
- Lookup pode ser tolerante, mas o código exibido deve ser o original do SSW.
- Setor de ocorrência vem do Dicionário de Ocorrências.
- Setor de ocorrência não é rota.
- Ocorrência não mapeada deve ser diagnosticável.

## 6. Rotas, cidades e setor operacional

- Rota da Mesa deve ser `effectiveRoute`.
- `effectiveRoute = operationalRoute || suggestedRoute`.
- `operationalRoute` é ajuste manual e prevalece sobre sugestão.
- `suggestedRoute` vem do BD de cidades/rotas ou regra especial documentada.
- Nome de cidade não deve aparecer como rota.
- Setor de ocorrência não deve ser usado como rota.
- Alterações manuais de rota devem ser persistidas e auditáveis.

## 7. Mesa de Roteirização

- A Mesa deve abrir com setores de ocorrência operacionais padrão.
- Todas as ocorrências devem continuar consultáveis via filtro manual.
- Filtro principal visível: Setor de Ocorrência.
- Filtros devem funcionar com lógica semelhante ao Excel: filtrar, ordenar e agrupar sem alterar dados.
- Ordenação padrão: previsão de entrega mais antiga primeiro.
- Agrupamentos obrigatórios planejados: rota, cidade, remetente, destinatário e previsão de entrega.
- Curva A deve ser sinalizada claramente.
- Clientes especiais/diretoria devem ter sinalização própria, superior à Curva A quando aplicável.
- Previsão de entrega deve ser sinalizada de forma simples e rápida.
- Localização atual do CTRC é crítica para decisão de roteirização.

## 8. Elegibilidade operacional

- Elegibilidade é regra interna de segurança, não filtro principal da UI.
- CTRC não roteirizável não deve aparecer por padrão na Mesa, salvo quando incluído por setor/filtro manual.
- Cargas em rota, entregues, finalizadoras ou sem mercadoria física disponível devem ser protegidas contra seleção indevida.
- O sistema deve permitir consulta ampla sem poluir a operação principal.

## 9. Pré-romaneio e romaneio

- Pré-romaneio vem antes de veículo/frota.
- Pré-romaneio serve para separação física por rota/portão.
- ROTA 01 -> PORTÃO 01, ROTA 02 -> PORTÃO 02, e assim por diante, salvo parametrização.
- Romaneio final vem depois da separação e da alocação de veículo/motorista/ajudante.
- Veículo não é protagonista na primeira etapa de roteirização.

## 10. Bancos mestres

Bancos mestres devem ser editáveis por usuário master, com validação e proteção contra cadastro inválido:

- Ocorrências de entrega.
- Cidades, rotas, dias de entrega e portões.
- Curva A.
- Clientes especiais/diretoria.
- Feriados e avisos operacionais.
- Veículos.
- Motoristas.
- Ajudantes.
- Agregados/frota própria.

Alteração errada nesses bancos pode quebrar roteirização; portanto toda edição deve preservar tipos, chaves e validações.

## 11. Calendário operacional e avisos

- Feriados são parte do Calendário Operacional.
- Avisos devem aparecer na tela inicial, filtrados pela unidade/base ativa.
- Avisos devem considerar cidades atendidas pela base, eventos gerais e avisos internos da unidade.
- Mesa de Roteirização não deve ser poluída por avisos irrelevantes.
- Avisos não bloqueiam CTRCs automaticamente na primeira fase.

## 12. Histórico e inteligência operacional

O Router deve evoluir para memória operacional:

- Reter histórico de importações.
- Atualizar ocorrências e status de CTRCs recorrentes.
- Registrar quando saiu, quando entregou, por que atrasou e qual ocorrência segurou.
- Permitir análises futuras de rota, cliente, remetente, destinatário, ocorrência, motorista, veículo e custo.
- Relatórios devem nascer dos dados históricos, não de retrabalho manual.

## 13. Regras para IA/coding agents

Toda IA deve:

1. Ler esta Constituição antes de alterar código.
2. Ler `SPEC.md`.
3. Ler `docs/architecture/AI_HARNESS.md`.
4. Declarar arquivos que serão alterados.
5. Respeitar escopo.
6. Alterar o mínimo necessário.
7. Rodar validações disponíveis.
8. Reportar pendências reais.

É proibido:

- Fazer refatoração ampla não solicitada.
- Corrigir visual alterando regra de domínio.
- Alterar schema sem migration/versionamento.
- Apagar dados ou tabelas sem autorização explícita.
- Substituir lógica local-first por dependência cloud.
- Criar filtros invisíveis que afetam resultado sem UI correspondente.
- Remover compatibilidade de dados existentes sem migração.

## 14. Definição de pronto

Uma alteração só pode ser considerada pronta quando:

- Cumpre o SPEC.
- Não viola esta Constituição.
- Passa TypeScript/build.
- Não quebra importação, Mesa, filtros, agrupamentos, ocorrências ou pré-romaneio.
- Documenta mudanças relevantes.
- Lista pendências reais.
