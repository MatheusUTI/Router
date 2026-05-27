# SPEC.md — Router

## 1. Objetivo do Produto

O Router é uma plataforma operacional de roteirização para apoiar a montagem diária de entregas da filial de Varginha, com foco em:

- reduzir sobras de CTRCs no fim do dia;
- atingir meta estável de 95% de entregas realizadas no dia;
- priorizar corretamente cargas vencidas, vencendo e clientes estratégicos;
- controlar o uso de agregados para manter o custo recomendado dentro da meta de até 7%;
- apoiar a decisão do supervisor operacional sem depender de planilhas manuais ou julgamento disperso.

O sistema deve funcionar como cockpit de decisão tática: importar dados do SSW, enriquecer CTRCs, classificar prioridades, sugerir alocação por veículo/motorista, alertar riscos de sobra e apoiar a sequência lógica de entrega.

---

## 2. Contexto Operacional

### 2.1 Filial e Operação

- Operação: transporte rodoviário de carga mista/fracionada.
- Unidade principal considerada: Varginha.
- Sistema fonte: SSW.
- Rotina principal no SSW: opção 455.
- Relatório base: relatório de 31 dias em relação ao período de autorização.
- Objetivo diário: montar rotas para que as cargas críticas não sobrem e a operação alcance pelo menos 95% de entregas realizadas no dia.

### 2.2 Momento de uso

A extração do relatório geralmente ocorre antes da montagem da rota do dia seguinte, preferencialmente após a saída de todos os carros de entrega, normalmente após as 14h.

---

## 3. Fonte de Dados — SSW

### 3.1 Rotina de extração

| Item | Regra |
|---|---|
| Sistema | SSW |
| Tela/rotina | Opção 455 |
| Relatório | Relatório de 31 dias em relação ao período de autorização |
| Formato baixado | CSV |
| Filtros | Período de 31 dias, entregas pendentes, arquivo em Excel/CSV, dados complementares B com ocorrências |
| Horário típico | Após saída dos carros, geralmente depois das 14h |
| Situação atual | Importação funciona, mas o arquivo tem muitos detalhes e exige bom mapeamento |

### 3.2 Colunas indispensáveis

O importador deve tratar como campos prioritários:

- UNIDADE;
- CTRC;
- CIDADE DE ENTREGA;
- SETOR;
- PREVISÃO DE ENTREGA;
- REMETENTE;
- DESTINATÁRIO;
- PAGADOR;
- CÓDIGO DE OCORRÊNCIA;
- DESCRIÇÃO DE OCORRÊNCIA;
- DATA DE OCORRÊNCIA;
- NOTA FISCAL;
- VALOR;
- FRETE;
- QUANTIDADE DE VOLUMES;
- PESO REAL;
- LOCALIZAÇÃO.

### 3.3 Regras de importação

- O sistema deve aceitar CSV/TXT exportado do SSW.
- Deve manter suporte a delimitador `;`, vírgula e tabulação.
- Deve permitir selecionar linha de cabeçalho.
- Deve permitir remover prefixos de controle de linha, como `1;` e `2;`.
- Deve salvar o mapeamento de colunas para reutilização.
- Deve validar no mínimo: CTRC, destinatário e cidade.
- Deve preservar campos de valor, frete, peso, volume, ocorrência e localização para uso nas regras de roteirização.

---

## 4. Modelo de Priorização Operacional

A roteirização deve classificar cada CTRC em prioridade P0, P1, P2 ou P3.

### 4.1 Prioridades

| Prioridade | Definição operacional | Regra prática |
|---|---|---|
| P0 | Não pode sobrar | Cliente Curva A vencendo no dia ou carga que vencerá antes da próxima oportunidade de entrega naquela rota/cidade. Exemplo: hoje é dia 27, vence dia 28, mas a próxima entrega naquela região só será dia 29; deve sair hoje. |
| P1 | Forte prioridade | Mesmo conceito da P0, mas para clientes não Curva A, prazos perdidos ou carga já vencida. |
| P2 | Sai se couber | Endereços repetidos/destinatários repetidos que não estão vencendo no dia da rota; clientes FOB; encaixes que aumentam eficiência sem prejudicar P0/P1. |
| P3 | Pode ficar para trás | Tudo que não está vencendo no dia e não compromete a próxima janela de entrega. |

### 4.2 Regra crítica de calendário de rota

O sistema não deve olhar apenas a data de previsão de entrega. Ele precisa considerar a próxima oportunidade real de atendimento da cidade/rota.

Exemplo:

```text
Hoje: 27
Previsão do CTRC: 28
Próxima rota para a cidade: 29
Classificação: P0 ou P1, pois se não sair hoje, ficará vencido antes da próxima rota.
```

### 4.3 Critérios adicionais de priorização

O algoritmo deve considerar:

- cliente Curva A;
- data de previsão de entrega;
- próxima data real em que a cidade será atendida;
- existência de destinatários repetidos na mesma rota;
- FOB;
- ocorrência ativa;
- localização física da carga;
- disponibilidade real para entrega;
- cidade/rota/setor;
- restrições de agendamento.

---

## 5. Frota Operacional

### 5.1 Frota própria

| Motorista | Placa | Tipo | Capacidade | Rotas/cidades fortes | Restrições | Ajudante |
|---|---|---|---:|---|---|---|
| WAGNER | QUX7F47 | Toco | 7t | São Lourenço, Carmo de Minas, Cristina | Pode ser alocado em qualquer rota se houver ajudante que conheça a rota | Sim |
| HIAN | RUE3B11 | Toco | 7t | Lavras, Ijaci, Perdões, Campo Belo, Carmo da Cachoeira | Pode ser alocado em qualquer rota se houver ajudante que conheça a rota | Sim |
| FABRICIO | SYJ9H98 | 3/4 | 3.5t | Guaxupé, Guaranésia, Pouso Alto, Itamonte, Itanhandu, Passa Quatro | Motorista lento; pode ir para qualquer rota com ajudante conhecedor | Sim |
| SEBASTIÃO | QWS3326 | 3/4 | 4.9t | Três Corações, São Gonçalo do Sapucaí, Campanha, Lambari, Caxambu, Baependi | Pode ser alocado em qualquer rota se houver ajudante que conheça a rota | Sim |
| RODRIGO | QUX6310 | Toco | 7t | Três Pontas, Santana da Vargem, Boa Esperança, Campo do Meio, Campos Gerais, Coqueiral, Nepomuceno | Motorista mais lento; pode ir para qualquer rota com ajudante conhecedor | Sim |
| VITOR | QXN7J29 | Toco | 7t | Em treinamento | Motorista novato; pode ir para qualquer rota com ajudante conhecedor | Sim |
| ALISSON | SYK6A23 | 3/4 | 4.9t | Passos, São Sebastião do Paraíso, Guaxupé, Guaranésia | Só deve ser alocado nas cidades que costuma fazer melhor; mora em Passos e não fica alocado na base | Sim |

### 5.2 Frota agregada

| Motorista | Placa | Tipo | Capacidade | Custo fixo | Custo variável | Rotas/cidades fortes | Restrições | Ajudante |
|---|---|---|---:|---:|---:|---|---|---|
| RONALDO | BWZ4186 | 3/4 | 3.5t | R$ 650 | R$ 10 por endereço realizado | Varginha, Alfenas, Machado, Paraguaçu, Elói Mendes, Três Pontas, Santana da Vargem, Boa Esperança, Campo do Meio, Campos Gerais, Coqueiral, Nepomuceno, Três Corações, Campanha, São Gonçalo do Sapucaí, Monsenhor Paulo | Atualmente alocado somente em Varginha por preferência do agregado | Não |
| HEBERT | GUE3786 | 3/4 | 3.5t | R$ 500 | R$ 10 por endereço realizado | Varginha | Não faz outras cidades | Não |
| RODRIGO | CSF5246 | Van | 2t | R$ 400 | R$ 10 por endereço realizado | Varginha, Três Corações, Campanha, São Gonçalo do Sapucaí, Monsenhor Paulo, Alfenas, Machado, Paraguaçu, Elói Mendes, Três Pontas, Santana da Vargem, Boa Esperança, Campo do Meio, Campos Gerais, Coqueiral, Nepomuceno | Preferência para Três Corações, Campanha, São Gonçalo do Sapucaí e Monsenhor Paulo | Não |
| Não informado | GQZ3157 | Não informado | Não informado | R$ 500 | R$ 10 por endereço realizado | A definir | A definir | A definir |

### 5.3 Observações sobre agregados

- BWZ4186 é extremamente eficiente e não retorna com CTRCs.
- GUE3786 é extremamente eficiente em Varginha e não deve ser usado fora de Varginha.
- CSF5246 é extremamente eficiente e tem preferência regional para Três Corações, Campanha, São Gonçalo do Sapucaí e Monsenhor Paulo.
- O sistema deve evitar classificar agregado apenas por capacidade. O custo e a aderência à cidade são decisivos.

---

## 6. Regra de Custo dos Agregados

### 6.1 Base da meta de 7%

A meta recomendada de custo de agregados é calculada sobre:

```text
Base de receita impactada = 50% do frete expedido no dia
Meta recomendada de agregado = Base de receita impactada * 7%
```

O frete considerado é o frete dos CTRCs emitidos no dia em que a filial é diretamente impactada, incluindo recebimentos futuros e coletados no dia.

### 6.2 Fórmula de custo do agregado

```text
Custo do agregado = diária fixa + (R$ 10 * quantidade de endereços realizados)
```

### 6.3 Custos fixos conhecidos

| Placa | Custo fixo |
|---|---:|
| BWZ4186 | R$ 650 |
| CSF5246 | R$ 400 |
| GUE3786 | R$ 500 |
| GQZ3157 | R$ 500 |

### 6.4 Política de trava

- Não existe trava absoluta para estourar os 7%.
- O sistema deve atuar com recomendações, alertas e indicadores.
- Quando ultrapassar a meta, deve exibir impacto financeiro e motivo operacional.
- A decisão final continua sendo do supervisor.

### 6.5 Indicadores necessários

O cockpit deve mostrar:

- frete total considerado no dia;
- base de cálculo de 50%;
- teto recomendado de agregado em 7%;
- custo projetado por agregado;
- custo total projetado;
- percentual consumido da meta;
- excedente em R$ e em %;
- justificativa operacional do uso do agregado.

---

## 7. Causas Atuais de Sobra

Segundo diagnóstico operacional atual, as principais causas reais de sobra são:

| Causa | Acontece? | Implicação no sistema |
|---|---:|---|
| Rota montada com cidade demais | Não | Não é prioridade inicial do algoritmo |
| Peso/cubagem mal distribuído | Não | Capacidade continua sendo validação, mas não é a causa principal |
| Motorista errado para a região | Não | Preferências devem existir, mas não explicam a sobra principal |
| Agregado caro usado cedo demais | Não | O custo deve ser controlado, mas não é a falha central atual |
| Carga prioritária escondida no meio | Não | O filtro de prioridade ajuda, mas não é a causa principal relatada |
| Carga em outra base/transferência entrou como disponível | Não | Ainda deve ser validada para evitar erro futuro |
| Cidade/rota do SSW errada ou incompleta | Não | Mapeamento atual é aceitável |
| Falta sequência lógica de entrega dentro da rota | Sim | Prioridade alta de evolução |
| Janela de entrega/agendamento atrapalha | Sim | Prioridade alta de evolução |

### 7.1 Diagnóstico principal

A falha mais importante não está na escolha macro da rota, mas na execução fina:

1. ordem lógica das entregas dentro da rota;
2. tratamento de agendamento/janela de entrega;
3. compatibilidade entre sequência, cidade, destinatário e tempo disponível do motorista.

---

## 8. Regras de Roteirização Esperadas

### 8.1 Regras obrigatórias

O sistema deve:

- importar CTRCs pendentes do SSW;
- classificar cada CTRC em P0, P1, P2 ou P3;
- agrupar por cidade, rota, setor e destinatário;
- detectar destinatários repetidos;
- detectar FOB;
- destacar Curva A;
- calcular risco de vencimento com base na próxima oportunidade real de rota;
- considerar disponibilidade física/localização;
- considerar ocorrência;
- montar sugestão por veículo/motorista;
- respeitar capacidade de peso;
- futuramente considerar cubagem real quando os dados estiverem disponíveis;
- calcular custo de agregado;
- alertar quando o custo projetado ultrapassar a meta recomendada;
- gerar rascunho de romaneio;
- apoiar finalização e acompanhamento de entregas realizadas.

### 8.2 Regras de prioridade na montagem

Ordem recomendada:

1. P0 — obrigatório sair;
2. P1 — forte prioridade;
3. agrupamento de destinatários repetidos;
4. encaixe de FOB;
5. P2 por proximidade/eficiência;
6. P3 somente se não comprometer capacidade, custo ou janela.

### 8.3 Regras de frota

- Priorizar frota própria quando atender a necessidade.
- Usar agregado quando:
  - evitar sobra crítica P0/P1;
  - proteger meta de 95%;
  - houver alta concentração em cidade adequada ao agregado;
  - o custo projetado for aceitável dentro da meta recomendada.
- Motorista lento deve receber rota menos sensível a janela apertada.
- Motorista novato deve ser alocado com ajudante que conheça a rota.
- ALISSON deve ficar restrito às cidades onde já atua melhor.
- Agregado de Varginha não deve ser sugerido para outras cidades quando houver restrição operacional.

---

## 9. Sequenciamento Interno da Rota

### 9.1 Problema a resolver

A sobra atual ocorre principalmente por falta de sequência lógica e por interferência de janela/agendamento.

### 9.2 Regras futuras de sequenciamento

O sistema deve ordenar entregas considerando:

- cidade;
- bairro/endereço;
- destinatário repetido;
- janela de entrega;
- agendamento;
- prioridade P0/P1;
- distância aproximada entre pontos;
- conhecimento do motorista/ajudante;
- possibilidade de descarregar agrupamentos próximos;
- evitar zigue-zague operacional.

### 9.3 Saída esperada

Mesmo sem mapa visual inicialmente, o sistema deve produzir uma sequência interna sugerida:

```text
Rota X / Veículo Y
1. Entrega A
2. Entrega B
3. Entrega C
...
```

O mapa pode ficar em segundo plano. A primeira entrega de valor é uma sequência textual/lógica confiável.

---

## 10. Meta de 95% Entregas no Dia

### 10.1 Definição

A meta operacional é atingir pelo menos 95% de entregas realizadas no dia, considerando os CTRCs que deveriam sair conforme prioridade e calendário real de rota.

### 10.2 Indicadores necessários

O sistema deve calcular:

- total de CTRCs pendentes importados;
- total P0;
- total P1;
- total P2;
- total P3;
- total roteirizado;
- total não roteirizado;
- percentual projetado de execução;
- risco de não bater 95%;
- cargas que impedem a meta;
- sugestão mínima para bater a meta.

### 10.3 Alerta de risco

Se o rascunho atual deixar cargas P0 ou P1 fora de rota, o sistema deve alertar:

```text
Risco operacional: existem cargas críticas fora do romaneio.
Meta de 95% ameaçada.
```

---

## 11. Entidades de Domínio Necessárias

### 11.1 CTRC

Campos mínimos:

- id;
- unidade;
- destinatário;
- remetente;
- pagador;
- cidade de entrega;
- setor;
- previsão de entrega;
- nota fiscal;
- valor;
- frete;
- volumes;
- peso real;
- ocorrência;
- descrição da ocorrência;
- data da ocorrência;
- localização;
- status de disponibilidade;
- prioridade calculada;
- risco de vencimento;
- agrupamento de destinatário repetido.

### 11.2 Veículo/Motorista

Campos mínimos:

- placa;
- motorista;
- tipo;
- próprio/agregado;
- capacidade de peso;
- capacidade de volume, quando disponível;
- custo fixo;
- custo por endereço;
- cidades fortes;
- cidades restritas;
- exige ajudante;
- observações operacionais;
- nível de velocidade/eficiência;
- status.

### 11.3 Rota/Cidade

Campos mínimos:

- cidade;
- aliases;
- setor;
- rota;
- dias de atendimento;
- próxima data de atendimento;
- prioridade operacional;
- restrições.

### 11.4 Romaneio/Rascunho

Campos mínimos:

- id;
- data;
- veículo;
- motorista;
- ajudante;
- CTRCs;
- peso total;
- volumes totais;
- frete total;
- valor total;
- quantidade de endereços;
- custo agregado, se houver;
- percentual da meta de agregado consumida;
- prioridade atendida;
- sequência sugerida;
- observações.

---

## 12. Backlog Técnico por Fases

### Fase 1 — Consolidação da base operacional

- Formalizar `Vehicle` com campos de custo, tipo de vínculo e restrições.
- Formalizar prioridade calculada no `RoteirizacaoItem`.
- Adicionar cálculo de P0/P1/P2/P3.
- Adicionar cadastro de dias reais de atendimento por cidade/rota.
- Adicionar cálculo da próxima oportunidade de entrega.
- Adicionar painel de custo de agregado.

### Fase 2 — Motor de sugestão de rotas

- Gerar sugestão automática inicial de alocação por veículo.
- Priorizar P0/P1 antes de qualquer encaixe.
- Agrupar destinatários repetidos.
- Sugerir agregado somente quando justificar custo/meta.
- Exibir motivo de cada sugestão.

### Fase 3 — Sequenciamento interno

- Criar algoritmo de ordenação lógica por cidade/bairro/endereço.
- Considerar janelas e agendamentos.
- Gerar sequência de entrega textual.
- Medir risco de sobra por rota.

### Fase 4 — Indicadores operacionais

- Projetar percentual de entregas do dia.
- Projetar custo de agregado.
- Mostrar risco de não bater 95%.
- Mostrar cargas críticas não roteirizadas.
- Mostrar recomendação mínima para corrigir o rascunho.

### Fase 5 — Otimização avançada

- Geocodificação/endereço em segundo plano.
- Sequência geográfica aproximada.
- Histórico de performance por motorista/cidade.
- Aprendizado com entregas realizadas e retornos.
- Sugestões cada vez mais precisas.

---

## 13. Critérios de Aceite

### 13.1 Importação

- Dado um CSV da rotina 455 do SSW, o sistema deve importar todos os CTRCs válidos.
- O sistema deve manter campos críticos de frete, valor, peso, volumes, ocorrência e localização.
- O sistema não deve duplicar CTRCs já importados sem regra explícita.

### 13.2 Priorização

- Carga Curva A que vencerá antes da próxima rota deve ser P0.
- Carga não Curva A vencida ou prestes a perder a próxima janela deve ser P1.
- Destinatário repetido sem vencimento deve ser P2.
- Carga sem vencimento no dia e sem risco deve ser P3.

### 13.3 Frota

- O sistema deve respeitar capacidade de peso.
- O sistema deve respeitar restrições fortes, como GUE3786 somente Varginha e ALISSON apenas cidades onde atua melhor.
- O sistema deve permitir alocação em qualquer rota para motoristas próprios quando houver ajudante conhecedor, exceto restrições específicas.

### 13.4 Custo

- O sistema deve calcular custo fixo + R$ 10 por endereço para agregados.
- O sistema deve calcular meta recomendada de 7% sobre 50% do frete expedido no dia.
- O sistema deve alertar quando a sugestão ultrapassar a meta.
- O sistema não deve bloquear a decisão do usuário por custo, apenas recomendar e justificar.

### 13.5 Meta de entrega

- O sistema deve alertar quando P0/P1 ficar fora do rascunho.
- O sistema deve indicar risco de não atingir 95%.
- O sistema deve sugerir quais cargas/rotas corrigir primeiro.

---

## 14. Decisões Arquiteturais

- Manter filosofia offline-first/local-first.
- Processar classificação e sugestão no cliente quando possível.
- Persistir dados operacionais no IndexedDB via Dexie.
- Usar Supabase como consolidação/sincronização, não como dependência crítica da operação em tempo real.
- Evitar dependência inicial de mapa visual.
- Implementar sequência lógica em segundo plano antes de exibir mapa.
- Priorizar explicabilidade: toda sugestão deve informar o motivo.

---

## 15. Pontos em Aberto

- Capacidade volumétrica aproximada de cada veículo.
- Dados completos do agregado GQZ3157.
- Lista final de dias de atendimento por cidade/rota.
- Regras específicas de agendamento por cliente.
- Definição de como o sistema receberá dados de entregas realizadas para medir os 95%.
- Se a meta de 95% será calculada por CTRC, por entrega/endereço, por volume ou por peso.

---

## 16. Próximo Passo Recomendado

Antes de escrever código, o próximo passo é transformar esta SPEC em tarefas técnicas pequenas:

1. atualizar contratos de tipos (`Vehicle`, `RoteirizacaoItem`, `CidadeRota`);
2. criar motor de prioridade P0/P1/P2/P3;
3. criar motor de custo de agregado;
4. criar motor de sugestão de frota;
5. criar motor de risco de sobra;
6. criar sequenciamento lógico inicial sem mapa.

O primeiro incremento de maior impacto deve ser o motor de prioridade + risco de próxima oportunidade de entrega, pois ele ataca diretamente o problema de sobras críticas.
