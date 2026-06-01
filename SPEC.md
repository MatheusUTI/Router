# Especificação Técnica e Funcional (SPEC.md) — Router

Este documento estabelece a especificação completa, conceitual, técnica de modelos e comportamentos para o **Router** — cockpit operacional de decisão tática e mesa de roteirização offline-first focado na filial de Varginha.

---

## 1. Princípios de Arquitetura e Engenharia

1. **Sooberania Local (`Local-First`)**: Todo o processamento de regras logísticas, classificações, roteirização tática e rascunhos de carga é computado localmente na CPU do cliente usando IndexedDB e Dexie.js. A IU responde instantaneamente (< 5ms).
2. **Sincronização Idempotente (`Sync Queue`)**: Modificações em dados operacionais são registradas em uma fila de sincronização persistente localmente e expurgadas apenas quando a consistência remota com o banco em nuvem (Supabase) for confirmada por transação segura.
3. **Desacoplamento de Rede**: O sistema é resiliente a picos de latência ou quedas de internet de longa duração, permitindo que o faturamento de romaneios ocorra localmente sem interrupção nas expedições físicas.

---

## 2. Objetivo do Produto

O Router é uma plataforma operacional de roteirização para apoiar a montagem diária de entregas da filial de Varginha, com foco em:

- Reduzir sobras de CTRCs no fim do dia;
- Atingir meta estável de 95% de entregas realizadas no dia;
- Priorizar corretamente cargas vencidas, vencendo e clientes estratégicos;
- Controlar o uso de agregados para manter o custo recomendado dentro da meta de até 7%;
- Apoiar a decisão do supervisor operacional sem depender de planilhas manuais ou julgamento disperso.

O sistema funciona como cockpit de decisão tática: importa dados do SSW, normaliza, enriquece CTRCs, gerencia o planejamento e ajustes manuais, permite consolidação visual, sugere alocação por veículo/motorista, alerta riscos de sobra de faturas e apoia a sequência lógica de entrega.

---

## 3. Contexto Operacional Real e Fluxo de Dados

O processamento das cargas e o planejamento logístico diário obedecem a um fluxo operacional rígido e sequencial. No Router, **a roteirização tática e a consolidação de cargas acontecem primeiro**, ficando a alocação técnica de veículos e motoristas restrita exclusivamente ao momento de fechamento operacional. O veículo nunca atua como protagonista inicial no planejamento da carga.

### 3.1 O Fluxo Operacional de Dados Sequencial

```
[Importação de Cargas (ERP/CSV - SSW 455)]
                 │
                 ▼
     [Normalização de Cidades] ────────► Cruzamento com dicionário de rotas local (cidades_rotas)
                 │                      (Identifica cidade original, setor logístico, rota padrão)
                 ▼
   [Planejamento Operacional do Dia] ──► Consolida os CTRCs e cruza com dados persistidos na 
                 │                      Mesa de Roteirização ('route_planning_items')
      ┌──────────┴──────────┐
      ▼                     ▼
[Rota Sugerida]     [Ajuste Operacional Manual] ──► Sobrescreve rota sugerida, define prioridade manual,
(Automatizada)      (Por CTRC / Operador)           observações operacionais e status de planejamento
      └──────────┬──────────┘
                 ▼
    [Enriquecimento de Negócios] ───────► Classificação de pesos, cálculo de SLAs, resolução de
                 │                         criticidades de ocorrências físicas e indicador de Curva A
                 ▼
        [Consolidação de Rota] ────────► Agrupamento lógico por Rota Efetiva, revisão de volumes
                 │                         e conferência física de restrições de entrega
                 ▼
   [Escolha de Veículo e Equipe] ──────► Alocação aos veículos (Payload / Cubagem compatíveis),
                 │                         vinculando motoristas e ajudantes disponíveis na doca
                 ▼
     [Geração de Rascunho / Draft]
                 │
                 ▼
  [Emissão e Fechamento de Romaneio] ───► Gravação local de romaneio faturado e agendamento de sincronia
```

### 3.2 Unidade, Sistema Fonte e Momento de Uso
- **Unidade considereda**: Varginha.
- **Sistema fonte**: SSW, Opção 455 (Relatório de 31 dias em relação ao período de autorização).
- **Formato baixado**: CSV (delimitadores `;`, tabulação ou vírgula).
- **Filtros do Relatório**: Período de 31 dias, entregas pendentes, arquivo em Excel/CSV, dados complementares B com ocorrências.
- **Horário típico de extração**: Geralmente após a saída dos carros de entrega, tipicamente após as 14h, preparando a expedição do dia seguinte.

---

## 4. Fonte de Dados — SSW (Campos e Tratamento)

### 4.1 Colunas Indispensáveis para Processamento

O importador e o modelo devem tratar como campos estruturados prioritários:
- `UNIDADE`
- `CTRC` / `id` (chave de identificação)
- `CIDADE DE ENTREGA` / `cidade`
- `SETOR`
- `PREVISÃO DE ENTREGA` / `prev_ent`
- `REMETENTE` / `cnpj_remetente` / `cliente_remetente`
- `DESTINATÁRIO`
- `PAGADOR`
- `CÓDIGO DE OCORRÊNCIA` / `ocorrencia`
- `DESCRIÇÃO DE OCORRÊNCIA`
- `DATA DE OCORRÊNCIA`
- `NOTA FISCAL`
- `VALOR`
- `FRETE`
- `QUANTIDADE DE VOLUMES`
- `PESO REAL`
- `LOCALIZAÇÃO`

### 4.2 Regras de Conversão e Tolerância
- O importador deve aceitar CSV do SSW com diferentes codificações e tolerar cabeçalhos com espaços ou pequenos desvios de nome.
- Preservação de formatos monetários (R$), numéricos (ex: peso e volume) e conversão resiliente de datas no padrão local da filial.

---

## 5. Planejamento Operacional do Dia (Mesa de Roteirização)

### 5.1 Objetivo da Mesa de Roteirização
A **Mesa de Roteirização** é a camada tática onde o operador ganha total controle sobre a operação: ele revisa faturas CTRCs disponíveis, altera manualmente a rota sugerida no mapa geográfico por conta de restrições de trânsito ou parcerias, marca urgências ou prioridades de expedição, segura cargas pendentes estrategicamente, define o que de fato sai hoje e revisa volumes consolidados antes de vincular frotas. 

### 5.2 Rota Sugerida vs. Rota Operacional
- **Rota Sugerida (`suggestedRoute`)**: Gerada automaticamente pelo motor de enriquecimento através do cruzamento geográfico do `CIDADE_ENT` (ou `cidade`) no dicionário de `cidades_rotas`. Caso o setor bruto mapeado possua a flag "99", a rota sugerida se torna compulsoriamente "ROTA 99".
- **Rota Operacional (`operationalRoute`)**: Rota escolhida de forma analítica e manual pelo operador que substitui e anula faticamente a sugestão automática para cálculos e agrupamentos.
- **Rota Efetiva (`effectiveRoute`)**: Resolvida matematicamente em tempo de renderização por:
  $$\text{effectiveRoute} = \text{operationalRoute} \parallel \text{suggestedRoute}$$
- **Ajuste Manual (`isManualRoute`)**: Sinalizador lógico que indica se a rota operacional destoa da sugestão calculada (`operationalRoute !== suggestedRoute`).

### 5.3 Regras de Estados de Planejamento Tático

#### Prioridade Operacional Manual (`manualPriority`)
- `NORMAL`: Segue as diretrizes automatizadas normais de SLA e entrega de doca.
- `PRIORIDADE`: Destaca faturas de forte relevância comercial que carecem de carregamento preferencial.
- `URGENTE`: Indica cargas com prazo exíguo ou pendências críticas resolvidas que precisam de vazão imediata.
- `SEGURAR`: Sinaliza faturas disponíveis no pátio físico que devem deliberadamente aguardar por decisão tática do gestor.
- `NAO_SAI_HOJE`: Cargas marcadas temporariamente para exclusão da expedição por pendência documental, fiscal ou financeira.
- `AGENDADO`: CTRCs condicionados a janelas rígidas acordadas com o destinatário final.

#### Status do Planejamento Tático (`planningStatus`)
Define o estado de preparação da fatura na mesa de decisões:
- `A_PLANEJAR`: Aguarda triagem do supervisor para início de programação de rota.
- `PLANEJADO`: Carga perfeitamente validada e integrada a uma das rotas vigentes da planilha diária, pronta para romaneio.
- `URGENTE`: Integrada ao lote com status crítico de expedição.
- `PRIORIDADE`: Integrada com status tático preferencial.
- `SEGURAR`: Mantida retida preventivamente no cockpit.
- `NAO_SAI_HOJE`: Excluída do lote com justificativa registrada.
- `AGENDADO`: Programada em janelas em data diferida.
- `CONSOLIDADO`: Carga já faturada e enviada para trânsito físico associada a um romaneio final.

#### Observação Operacional (`operationalNote`)
Permite ao operador registrar anotações textuais fundamentais para instruir o carregador na doca e o motorista parceiro, como:
- *"Cliente fecha às 15h"*
- *"Juntar ao lote da Rota 05"*
- *"Segurar para faturamento amanhã"*
- *"Entregar em veículo de pequeno porte"*

---

## 6. Modelo de Priorização Operacional Científico

A roteirização tática classifica automaticamente cada CTRC disponível em quatro níveis de prioridade lógica de faturamento:

### 6.1 Matriz de Prioridade

| Prioridade | Conceito Técnico | Critério Operacional Prático |
|---|---|---|
| **P0** | Crítico / Não Pode Sobrar | Cliente Curva A vencendo hoje ou carga com risco iminente de vencimento antes da próxima oportunidade logística mapeada para aquela cidade/rota. |
| **P1** | Alta Prioridade | Mesmo conceito do P0, porém destinado a clientes normais (Não Curva A), prazos vencidos ou faturas vencendo no dia. |
| **P2** | Operacional / Eficiência | Agrupamento de destinatários repetidos (múltiplas faturas para mesmo endereço), cargas FOB relevantes que complementam rotas sem gerar desvios analíticos. |
| **P3** | Baixa Prioridade | Cargas sem vencimento imediato no horizonte operacional e que não impactam negativamente o SLA caso permaneçam retidas. |

### 6.2 Regra Crítica de Janela Calendária
O algoritmo de prioridades não deve se restringir estritamente à data de previsão em si, mas considerar a **Próxima Oportunidade Real de Equipe**:
Se hoje é dia 27, a carga prevê entrega para dia 28, mas de acordo com a tabela operacional (`cidades_rotas`) a próxima saída para aquela cidade é somente no dia 29, a carga passará a ter prioridade máxima **P0/P1** hoje, pois segurá-la resultará em estouro inevitável de SLA operacional.

---

## 7. Frota Operacional e Regras de Alocação

A frota de Varginha está distribuída entre veículos próprios e parceiros agregados. O algoritmo de recomendação de frota deve equilibrar conhecimentos específicos de rotas, velocidades relativas dos motoristas, custos associados e limites físicos das carrocerias.

### 7.1 Frota Própria Estável
- **WAGNER (QUX7F47 / Toco 7t)**: Forte em São Lourenço, Carmo de Minas e Cristina. Excelente desempenho com ajudante conhecedor de rota.
- **HIAN (RUE3B11 / Toco 7t)**: Forte em Lavras, Ijaci, Perdões, Campo Belo, Carmo da Cachoeira.
- **FABRICIO (SYJ9H98 / 3/4 3.5t)**: Guaxupé, Guaranésia, Pouso Alto, Itamonte, Itamonte, Passa Quatro. Motorista cauteloso/lento, performa melhor acompanhado de ajudante especialista.
- **SEBASTIÃO (QWS3326 / 3/4 4.9t)**: Três Corações, São Gonçalo do Sapucaí, Campanha, Lambari, Caxambu, Baependi.
- **RODRIGO (QUX6310 / Toco 7t)**: Três Pontas, Santana da Vargem, Boa Esperança, Campo do Meio, Campos Gerais, Coqueiral, Nepomuceno.
- **VITOR (QXN7J29 / Toco 7t)**: Em treinamento tático. Novato, deve operar preferencialmente com ajudantes seniores que conheçam a rota recomendada.
- **ALISSON (SYK6A23 / 3/4 4.9t)**: Passos, São Sebastião do Paraíso, Guaxupé, Guaranésia. Mora em Passos, não fica com permanência física na sede central de Varginha.

### 7.2 Frota de Apoio Agregada
- **RONALDO (BWZ4186 / 3/4 3.5t)**: Custo Fixo de R$ 650 + R$ 10 assistencial por endereço realizado. Altíssima eficiência analítica, zero devolução e alto raio de atendimento.
- **HEBERT (GUE3786 / 3/4 3.5t)**: Custo Fixo de R$ 500 + R$ 10 por endereço. Extremamente blindado a entregas na cidade de Varginha. **Forte restrição operacional**: Não atende fora da grande Varginha.
- **RODRIGO CSF5246 (Van 2t)**: Custo Fixo de R$ 400 + R$ 10 por endereço. Preferência para Três Corações, Campanha, São Gonçalo do Sapucaí e Monsenhor Paulo.
- **AGREGADO GQZ3157 (Não Informado)**: Custo Fixo R$ 500 + R$ 10 por endereço realizado.

---

## 8. Governança Financeira do Custo de Agregados

### 8.1 Indicadores e Método de Apuração (Meta 7%)
A governança orçamentária para contratação de frotas agregadas é calculada nos termos operacionais da filial:
$$\text{Base de Receita Impactada} = 50\% \times \text{Frete Total Expedido no Ciclo}$$
$$\text{Meta Máxima de Custo do Agregado} = 7\% \times \text{Base de Receita Impactada}$$

### 8.2 Fórmula de Custo Operacional de Frete Agregado
$$\text{Custo Projetado do Agregado} = \text{Diária Fixa} + (10.00 \times \text{Número de Endereços Únicos de Entrega})$$

### 8.3 Política de Governança
- Não deve haver bloqueio físico de digitação. O sistema emite alertas preventivos de desvio financeiro e solicita preenchimento de justificativa operacional quando há risco de estouro da meta de 7%.

---

## 9. Modelo de Dados de Planejamento Técnico

O domínio do Router adiciona suporte a transações locais resilientes expressas no modelo TypeScript abaixo:

```typescript
export type PlanningPriority =
  | 'NORMAL'
  | 'PRIORIDADE'
  | 'URGENTE'
  | 'SEGURAR'
  | 'NAO_SAI_HOJE'
  | 'AGENDADO';

export type PlanningStatus =
  | 'A_PLANEJAR'
  | 'PLANEJADO'
  | 'URGENTE'
  | 'PRIORIDADE'
  | 'SEGURAR'
  | 'NAO_SAI_HOJE'
  | 'AGENDADO'
  | 'CONSOLIDADO';

export interface RoutePlanningItem {
  id: string;               // identificador composto único: `${planningDate}_${ctrcId}`
  ctrcId: string;           // referencia ao CTRC original
  planningDate: string;     // exercicio do planejamento operacional (YYYY-MM-DD)
  suggestedRoute: string;   // sugestao automatizada geografica
  operationalRoute?: string;// rota customizada manualmente do operador
  manualPriority?: PlanningPriority; // priorizacao manual
  planningStatus: PlanningStatus;    // nivel de preparo da carga
  operationalNote?: string; // notas para doca e expedição
  lockedByUser?: boolean;   // trava de processamento automatico
  updatedBy?: string;       // usuario auditoria
  updatedAt: string;        // registro temporal de atualizacao
  createdAt: string;        // registro temporal de criacao
}
```

E expande os registros da listagem visual consolidada:
```typescript
export interface RoteirizacaoItem extends Ctrc {
  // ... Dados estruturados de enriquecimento ...
  suggestedRoute?: string;
  operationalRoute?: string;
  effectiveRoute?: string;
  manualPriority?: PlanningPriority;
  planningStatus?: PlanningStatus;
  operationalNote?: string;
  isManualRoute?: boolean;
}
```

---

## 10. Persistência de Dados Local (IndexedDB)

Para salvaguardar o histórico da mesa de planejamento garantindo isolamento tático e modularidade de desvios, criamos a tabela local independente no Dexie:

- **Tabela**: `route_planning_items`
- **Índices de Lookup Rápido**: `id, ctrcId, planningDate, suggestedRoute, operationalRoute, manualPriority, planningStatus, updatedAt`

A integração ao motor reativo é fornecida pelo `RoteirizacaoEnrichmentService` recebendo uma fatia combinada de `routePlanningItems` e costurando estes dados aos CTRCs durante a montagem da tabela antes que ela seja renderizada pela UI.

---

## 11. Diagnósticos e Evolução Contínua

As causas reais das sobras residem no sequenciamento lógico de docas e falta de previsibilidade de restrições de trânsito em agendamentos específicos. A Mesa de Roteirização pavimenta este terreno de dados isolando as rotas da contratação imediata da frota, eliminando planilhas fragmentadas nas docas de Varginha.

---

## 12. Gestão de Preferências de Usuário Multi-Dispositivo

As preferências estéticas e comportamentais do usuário (ex: modo de densidade visual, setor selecionado, etc.) são geridas sob as seguintes premissas técnicas:

- **Armazenamento Local Autoritativo**: As preferências são persistidas localmente no IndexedDB via `UserPreferenceRepository`, mantendo a reatividade instantânea no carregamento da tela. Evita-se o uso de `localStorage` como fonte ou cache principal.
- **Sincronização Direta de Nuvem**: Realiza-se a leitura das preferências do usuário vinculadas ao seu `username` diretamente do Supabase e sincronização reversa em background não-bloqueante no carregamento ou atualização.
- **Isolamento Tático de Dados Operacionais**: Preferências usam este fluxo otimizado de sincronização direta enquanto faturas e planejamentos de CTRC operacionais continuam estritamente protegidos pelo motor de transação idempotent local/offline-first (`sync_queue`). Futuramente, o fluxo de preferências do usuário também poderá ser integrado à `sync_queue` de forma unificada se houver necessidade de manter controle transacional estrito de auditoria corporativa.
- **Resiliência Offline**: Se em modo offline, o sistema consome e edita os valores salvos sob o IndexedDB local. Ao restabelecer conexão (ou novo login em outro dispositivo), as preferências são mescladas com a nuvem, garantindo a continuidade da experiência visual de forma transparente.

---

## 13. Governança de CTRCs, Elegibilidade e Central de Ocorrências

Para evitar poluição visual e mitigar riscos operacionais provocados pela importação diária de relatórios SSW que cobrem janelas de até 31 dias, o sistema separa rigidamente a visualização imediata de cargas elegíveis das informações de interesse histórico.

### 13.1 Elegibilidade de Roteirização e Filtro de Setor de Ocorrência

O sistema diferencia a classificação interna de segurança da visualização operacional do usuário:

1. **Elegibilidade Interna (`routingEligibility`)**:
   - Classificação estrita de segurança e risco operacional (`ROTEIRIZAVEL`, `REVISAR`, `NAO_ROTEIRIZAVEL`).
   - Usada internamente para emitir alertas fortes e impedir consolidações perigosas em segundo plano, mesmo que o usuário visualize cargas pertencentes a setores passivos.

2. **Filtro de Visualização Principal: Setor de Ocorrência**:
   - Substitui o filtro técnico de Elegibilidade no painel visual principal.
   - Fornece seleção múltipla tipo planilha do Excel para maior afinidade operacional.
   - Apresenta as opções "Todos", "Limpar" e "Padrão Roteirização".
   - **Visão Padrão**: Seleciona automaticamente apenas os setores úteis para Roteirização: `['Agendamento', 'Disponível', 'Disponível Cobrança', 'Disponível Pendência', 'Disponível Transferência', 'Solução']`.
   - **Setores Não Roteirizáveis**: Setores como `['Em Rota', 'Retidos', 'Transferência']` ficam ocultos inicialmente, mas podem ser ativados livremente pelo operador. Nesse caso, as regras de `routingEligibility` emitem alertas fortes de segurança no painel inferior.

### 13.2 Regras de Classificação Científica e Códigos do ERP

O motor de classificação analítica do `RoteirizacaoEnrichmentService` resolve o status de elegibilidade obedecendo aos seguintes critérios sistêmicos:

1. **Classificação Não Roteirizável (`NAO_ROTEIRIZAVEL`)**:
   - CTRCs com status explícito `"ENTREGUE"` ou `"EM ROTA"` ou `"TRANSFERÊNCIA"`.
   - Códigos de Ocorrência do SSW considerados finalizadores ou impeditivos definitivos:
     - **Código 01 / 81 / 82**: Comprovantes de entrega retidos ou cargas definitivamente entregues.
     - **Código 03**: Força a não roteirização automática por desvio severo ou cancelamento.
   - Presença de qualquer ocorrência registrada cuja flag interna no cadastro (`DeliveryOccurrence`) esteja marcada como finalizadora de ciclo.

2. **Classificação A Revisar (`REVISAR`)**:
   - CTRCs com status `"Aguardando"` ou `"Problema"`.
   - Presença de ocorrências ativas caracterizadas por trancamento temporário (ex: recusa parcial, reentrega agendada, endereço não localizado em processo de confirmação).

3. **Classificação Roteirizável (`ROTEIRIZAVEL`)**:
   - CTRC sem ocorrências finalizadoras impedindo trânsito, com mercadoria fisicamente presente ou em processo de recebimento na doca local e que não se encaixa nas regras de bloqueio anteriores.

### 13.3 Rastreamento Histórico de Eventos (`ctrc_occurrence_history`)

Cada importação de arquivo SSW preserva a integridade cronológica de movimentação de cada CTRC localmente. O sistema monitora alterações de Ocorrência, Status e Localização física do CTRC. Caso ocorra uma movimentação (state displacement), um novo evento incremental é registrado na tabela IndexedDB `ctrc_occurrence_history` com os seguintes campos tipados:

- `id`: Identificador lógico único (ID composto).
- `ctrcId`: ID do CTRC fonte.
- `importDate`: Data YYYY-MM-DD em que a importação capturou o evento.
- `occurrenceCode`: Código da ocorrência extraído.
- `occurrenceDescription`: Descrição literal da ocorrência do ERP.
- `locationLabel`: Localização ou Box físico no galpão.
- `status`: Situação do CTRC no ERP.
- `createdAt`: Carimbo temporal em milissegundos ou ISO UTC.

Essa arquitetura garante que nenhum CTRC histórico seja deletado ou descartado, mantendo a Central de CTRCs/Ocorrências perfeitamente munida de registros validados de devoluções, sinistros, reentregas e atrasos para auditorias gerenciais de SLA.

### 13.4 Simplificação do Cabeçalho e Ordenação Excel Operacional

A interface principal da Mesa de Roteirização foi simplificada de forma pragmática para priorizar a eficiência operacional do usuário:

1. **Simplificação Visual Reduzida**:
   - Foram ocultados/removidos do cabeçalho principal os controles redundantes de densidade visual, de eligibility técnica e de ocupação/localização física.
   - O foco rápido com excesso de chips foi unificado no fluxo operacional, removendo poluição visual e garantindo um layout limpo ideal para operar com zoom do navegador (100%, 110%, 125%) sem scroll horizontal ou quebra de layout.
   - **Tipografia Operacional Confortável**: Em vez de múltiplos modos de densidade visual ou de seletores adicionais, a Mesa de Roteirização utiliza uma escala tipográfica única, unificada e altamente legível. As letras principais foram ampliadas de 2px a 5px (ex: cidades/rotas em torno de 14-16px, CTRC/NFs e valores entre 12-13px, e badges em 10-11px). O layout foi otimizado com line-heights robustos (leading-tight/leading-snug) e truncagens inteligentes para comportar perfeitamente telas 1366x768 e zoom nativo do navegador em 100%, 110% e 125% de forma limpa e sem perdas de informações ou quebras de linha indesejadas.

2. **Ordenação Uniformizada Estilo Excel**:
   - Introdução de seletor compacto de ordenação operacional. Os CTRCs filtrados podem ser ordenados instantaneamente de forma crescente ou decrescente usando critérios chaves:
     - **Previsão de entrega mais antiga** (padrão de abertura da mesa);
     - **Previsão de entrega mais nova**;
     - **Remetente** (A-Z ou Z-A);
     - **Destinatário** (A-Z ou Z-A);
     - **Cidade** (A-Z ou Z-A);
     - **Peso** (Mais pesado ou mais leve);
     - **Volumes** (Mais volumes ou menos volumes);
     - **Valor de faturamento** (Mais valorizado ou menos valorizado);
     - **Frete** (Mais caro ou mais barato).
   - A ordenação é aplicada dinamicamente no resultado filtrado de forma limpa, persistindo as preferências selecionadas do usuário no banco local e na cloud para sessões futuras. Se houver agrupamento ativo por cidade ou rota, as cargas em cada grupo são ordenadas individualmente conforme a regra ativa.

