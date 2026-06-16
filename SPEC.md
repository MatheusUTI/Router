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
   - **Tipografia Operacional Confortável**: Em vez de múltiplos modos de densidade visual ou de seletores adicionais, a Mesa de Roteirização utiliza uma escala tipográfica única, unificada e altamente legível. As letras principais foram ampliadas de 2px a 5px (ex: cidades/rotas em torno de 14-16px, CTRC/NFs e valores entre 12-13px, e badges em 10-11px). O layout foi otimizado com line-heights robustos (leading-tight/leading-snug) and truncagens inteligentes para comportar perfeitamente telas 1366x768 e zoom nativo do navegador em 100%, 110% e 125% de forma limpa e sem perdas de informações ou quebras de linha indesejadas.

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

### 13.5 Integridade de Dados da Mesa de Roteirização

Para garantir que a Mesa de Roteirização opere como uma ferramenta confiável e transparente para tomadas de decisão gerencial e logística, as seguintes diretrizes de integridade e processamento de dados foram consolidadas:

1. **Separação de Camadas (Raw -> Normalizado -> Enriquecido)**:
   - **Camada Bruta (Raw)**: Preserva os dados originais importados via arquivos CSV ou SSW sem modificações destrutivas. Informações como destinatário, remetente, cidade de destino, peso, ocorrência e número da nota fiscal são mantidas intactas.
   - **Camada Normalizada (Normalized)**: Corrige variações de sintaxe e inconsistências (ex: abreviações, sufixos de Unidade Federativa como "- MG" ou "/SP", strings vazias ou nulas) transformando campos em representações seguras (`normCidade`, `normRota`, `normSetor`).
   - **Camada de Enriquecimento (Enriched)**: Combina regras de negócios operacionais e tabelas auxiliares para gerar campos derivados necessários à tomada de decisões (ex: `effectiveRoute`, `routingEligibility`, `occurrenceSector`, `slaStatus`).

2. **Garantia de Mapeamento Direto Unidirecional (Single Source of Truth)**:
   - **Destinatário (`destinatario`)**: Mapeado exclusivamente a partir da coluna correspondente do destinatário no arquivo SSW. É terminantemente proibido preencher ou sobrescrever este campo com dados de cidade, ocorrências, ou localização.
   - **Remetente (`remetente`)**: Extraído diretamente da coluna de remetente original. Serve como o único canal de detecção de clientes VIP e Curva A.
   - **Previsão de Entrega (`prev_ent`)**: Processada com suporte total a strings de data e hora do ERP. Slices que corrompem a exibição amigável do ano ou hora de agendamento na interface de usuário são proibidos.

3. **Resolução de Ocorrências e Tratativas de Roteirização**:
   - Os status logísticos (`availabilityStatus`, `availabilityLabel`) e a elegibilidade (`routingEligibility`) são atualizados de forma reativa a partir de códigos de ocorrência normalizados internamente (removendo zeros à esquerda para ocorrências no banco de dados, sem alterar a representação exibida ao usuário final).
   - Bloqueios logísticos e restrições operacionais são gerados de forma centralizada e explicados ao operador de maneira legível, evitando redescobrir ou recalcular regras de negócio diretamente no componente de visualização.

---

## 14. Módulo de Calendário Operacional e Avisos Operacionais

Para mitigar o risco de faturamento impróprio ou falhas na montagem de cargas que coincidem com recessos, feriados regionais ou suspensões de expediente municipais na malha de atendimento da filial de Varginha, implementou-se um módulo independente para alertas do Calendário Operacional.

### 14.1 Arquitetura de Dados ("Local-First")

Este módulo expande a persistência resiliente local com o banco de dados IndexedDB e duas novas entidades tipadas:

1. **`OperationalCalendarEvent`**:
   - Representa os feriados, padroeiros, recessos corporativos e suspensões decretadas.
   - **Campos chaves**: `id` (UUID ou hash incremental), `date` (data base `YYYY-MM-DD`), `dayMonth` (`DD/MM`), `year` (especificidade do ano para datas móveis), `city` (cidade ou `'GERAL'`), `uf` (`'MG'`), `description` (anotações textuais), `eventType` (`'HOLIDAY' | 'CULTURAL' | 'OPERATIONAL_CLOSURE'`), `recurrenceType` (`'FIXED_YEARLY' | 'YEAR_SPECIFIC'`), `active` (booleano), `severity` (`'INFO' | 'WARNING' | 'CRITICAL'`).

2. **`OperationalNotice`**:
   - Alerta gerado em tempo de execução para consumo do cockpit.
   - **Campos**: `id`, `date`, `city`, `route` (rota cruzada ativa), `title`, `message`, `severity`, `daysUntil`, `sourceEventId`.

### 14.2 Seeding e Parser Inteligente para MG 2026

- **Fonte de Entrada**: Dataset bruto de feriados municipais de Minas Gerais 2026 (`initialFeriadosMG.ts`), estruturado no padrão de leituras rápidas:
  ```text
  DATE
  Cidade - Descrição
  ```
- **Parsing Automático (Idempotente)**:
  - Preserva acentuações nativas e remove espaçamentos impróprios.
  - Normaliza as cidades mapeadas de acordo com as chaves do dicionário `cidades_rotas`.
  - Diferencia datas fixas recorrentes (como recesso do servidor público, Nossa Senhora da Conceição, aniversários municipais) de feriados móveis vinculados estritamente ao ano atual (Carnaval, Corpus Christi, Sexta-feira da Paixão).
- **Processamento de Inoculação**: Ao subir a aplicação, se a tabela `operational_calendar_events` estiver zerada, o adaptador local invoca o parser e popula as registros de forma totalmente transparente e isolada.

### 14.3 Visualização Dinâmica (Top-level Banner)

O cockpit de decisões táticas renderiza os alertas através do componente reativo `<OperationalNoticesBanner />` no topo do painel principal (posicionado logo após o cabeçalho de filtros):

1. **Horizonte de Avaliação**: O banner avalia os próximos **5 dias** de operação em relação à data selecionada no painel de planejamento (`planningDate`).
2. **Integração Cruzada de Cargas**:
   - O algoritmo cruza dados do calendário com as cidades-destino e rotas ativas atualmente exibidas na Mesa de Roteirização.
   - Se uma cidade em holiday listado possui carga na fila, o banner exibe uma badge contendo o código da rota ativa afetada (ex: `ROTA 06`).
3. **Escala de Crise**:
   - `CRITICAL` (Vermelho): Bloqueios completos, fins de expediente nacionais e feriados da sede de expedição.
   - `WARNING` (Amarelo): Feriados municipais específicos, aniversários de cidades que geram potencial atraso.
   - `INFO` (Azul/Slate): Festividades regionais de alerta consultivo.
4. **Comportamento Limpo**: Se não houver nenhum evento operacional no intervalo dos próximos 5 dias aplicável ao lote atual, o banner permanece ocultado para poupar espaço vertical absoluto. Permite expansão opcional para listar individualmente os eventos com contagem de dias restantes dinâmicos.

---

## 15. Importação segura por reprocessamento

Com o objetivo de permitir que o usuário re-importe arquivos CSV/SSW contendo correções de faturamento, pesos, valores ou novas ocorrências físicas registradas no galpão, o Router adota um mecanismo de mesclagem idempotente e não destrutiva para proteger decisões humanas tomadas localmente:

1. **Cruzamento por ID**: Os registros de CTRC importados são pareados com a base de IndexedDB através do identificador operacional único (`id`/`ctrcId`).
2. **Separação de Atributos**:
   - **Dados Brutos ERP (Atualizáveis)**: Campos vindos do SSW como peso, volumes, valor de nota fiscal, valor de frete, última ocorrência, descrição da ocorrência e localização física são atualizados com os valores mais recentes do arquivo.
   - **Campos Locais Protegidos (Imutáveis na Importação)**: Decisões tomadas diretamente na Mesa de Roteirização são preservadas e blindadas contra re-escrita indesejada. Os seguintes campos locais são mantidos intactos caso já existam:
     - `operationalRoute` (Rota de intervenção manual)
     - `manualPriority` (Prioridade em nível de carregamento)
     - `planningStatus` (Status de consolidação/fluxo da carga)
     - `operationalNote` (Anotações logísticas de doca)
     - `isManualRoute` (Sinalizador de rota operacional divergente)
     - `preRomaneioId` (Relação com ordens de carregamento prévio)
     - `romaneioId` / `convertedRomaneioId` (Relação com romaneios emitidos)
     - `routePlanningId` (Identificação de batch tático)
3. **Preservação de Trânsito / Status Operacional**: O estado geral da carga no cockpit (Ex: `'Disponível'`, `'Em Rota'`, `'Entregue'`, `'Recusado'`, `'Agendamento'`, `'Transferência'`) é preservado para blindar faturas em andamento contra regressões ao estado inicial pendente.
4. **Particionamento em Memória Estável**: Na re-importação reativa, os records mesclados são distribuídos adequadamente entre a fila de pendências (`availableCtrcs`) e as listas de faturamento em trânsito/fechamento (`linkedCtrcs`) para prevenir duplicidade visual na IU.

---

## 16. SLA baseado na data ativa de planejamento

Com o objetivo de sincronizar o monitoramento visual de atrasos e prazos de faturamento com a agenda operacional ativa planejada, o Router calcula o status de SLA do CTRC utilizando a própria data de planejamento da Mesa:

1. **Definição da Referência**: O status de SLA (D+0, D+1, Atrasado, etc.) é computado comparando a data de previsão de entrega (`prev_ent` do CTRC) com a Data Operacional Ativa selecionada pelo planejador no cockpit (`planningDate`).
2. **Eliminação de Referências Fixas**: A dependência de datas estáticas (como o fallback legado de '2026-05-25') é superada por completo. Fica garantido o fallback dinâmico baseado na data atual do sistema (`YYYY-MM-DD`) para casos de faturamento disperso ou chamadas retrocompatíveis de segundo plano.
3. **Propagação Reativa**: Quando o operador logística altera a data ativa no painel da Mesa de Roteirização, o `RoteirizacaoEnrichmentService` re-computa e recalcula o SLA de faturamento de todas as faturas visíveis em tempo real (< 5ms).

---

## 17. Clientes Diretoria / Especiais

Com a finalidade de blindar a operação contra atrasos e fricções de atendimento críticos, a Mesa de Roteirização destaca de forma proeminente todos os CTRCs associados a clientes VIP monitorados:

1. **Reconhecimento Flexível**: Os destinatários, remetentes ou pagadores dos CTRCs importados são correlacionados com a base de `CriticClient` de forma resiliente, empregando normalização de texto (remoção de acentos, pontuações e espaçamento vago) e correspondência de sub-strings.
2. **Priorização e Destaque Visual**:
   - Os registros ganham uma borda nobre de destaque em cor violeta (`border-l-violet-500`) com background tonalizado sutil.
   - Um badge visual pulsante (`👑 DIRETORIA` ou `👑 ESPECIAL`, baseado no prefixo `CD` ou outro respectivamente) é exibido diretamente ao lado dos dados identificadores do CTRC.
   - Esta formatação visual se sobrepõe à estilização de Curva A e faturas FOB, destacando que os prazos e tratativas desses clientes são de alta prioridade.
   - Informações complementares e o motivo do alerta (como janelas de entrega ou restrições de descarga) ficam disponíveis em tooltips responsivas.

---

## 18. Parser numérico resiliente na importação

Com o objetivo de evitar a inflação acidental ou perda de valores críticos nas planilhas importadas de diferentes sistemas de ERP e transportadoras brasileiras / norte-americanas (como formato SSW CSV, Excel exports), o Router emprega um parser numérico universal unificado:

1. **Separação Decimal Inteligente**: Identifica de forma proativa o separador decimal correto (seja vírgula `,` ou ponto `.`) medindo as quantidades e posições relativas dos caracteres de separação.
2. **Saneamento e Formatação**:
   - Descarta símbolos monetários (`R$`, `$`, `USD`) e espaçamentos redundantes automaticamente antes da conversão.
   - Trata adequadamente números com formato misto (ex: milhar em ponto e decimal em vírgula, ou apenas vírgula como decimal).
   - Suporta fallbacks amigáveis para campos vazios, nulos ou indefinidos, garantindo o valor padrão `0` com robusta tolerância a falhas (NaN safety).

---

## 19. Programação do Dia

Com o objetivo de reproduzir fielmente o fluxo operacional diário utilizado pela filial de Varginha e eliminar o uso de planilhas paralelas de expedição, o sistema integra o painel de fechamento unificado "Programação do Dia":

1. **Base de Dados Unificada (V1)**:
   - A Programação do Dia é gerada de forma 100% reativa a partir dos Pré-Romaneios cadastrados que possuem Placa (`vehiclePlate`) ou Motorista (`driverName`) devidamente informados.
2. **Agrupamento Automático e Estrutural**:
   - Classifica e divide as faturas consolidadas desses Pré-Romaneios ativos em dois grandes blocos:
     - **FROTA**: Veículos estáveis da própria frota operacional.
     - **AGREGADOS**: Veículos de apoio contratados (identificados programaticamente através do padrão de placas `BWZ4186`, `GUE3786`, `CSF5246`, `GQZ3157` ou nomenclatura descritiva).
3. **Campos Operacionais Críticos**:
   - **PLACA**: Veículo de designação.
   - **MOTORISTA** / **AJUDANTE**: Pessoal operacional vinculado no próprio registro do Pré-Romaneio.
   - **SETOR**: Rota técnica operacional integrada (derivação cumulativa).
   - **CIDADES**: Cidades atendidas saneadas sem redundâncias.
   - **QT NF** (CTRCs), **PESO** (kg) e **QT VOL**: Indicadores volumétricos unificados por veículo calculados em tempo real de forma idempotente.
4. **Controle Físico e Exportabilidade**:
   - **Impressão A4 Horizontal**: Formata as tabelas com folhas landscape de alto contraste para pátio e docas.
   - **Excel Direct Exporting**: Gera arquivos do tipo planilha perfeitamente modelados legíveis por Microsoft Excel ou Google Planilhas.

---

## 20. Impressão e Gestão de Pré-Romaneios de Separação

Com o objetivo de criar uma área operacional robusta para que a equipe de galpão separe e carregue as cargas de forma física organizada por portão e doca, o Router disponibiliza o painel unificado de Pré-Romaneios na V1:

1. **Localização e Fluxo Principal**:
   - Integrado diretamente à tela `FinalizacaoView` como a aba **Pré-Romaneios**, sendo a rota de redirecionamento automático pós-Mesa de Roteirização.
   - O operador logística seleciona CTRCs, clica em "Pré-Separar" e vai diretamente para esta aba.
2. **Atribuição Operacional Descentralizada**:
   - A Placa do Veículo, Nome do Motorista, Nome do Ajudante e Observações de expedição são configurados e editados diretamente em inputs embutidos no próprio cartão de cada Pré-Romaneio.
   - Cada alteração é persistida reativamente no IndexedDB local de forma imediata via `updateAssignment`.
3. **Dados e Métricas em Tela**:
   - Cada Pré-Romaneio exibe seu respectivo portão/doca, rota de faturamento, status de separação, campos de atribuição, contagem consolidada de CTRCs/Notas Fiscais vinculadas, peso total (kg), cubagem/volumes e um seletor de status para controle do pátio.
4. **Impressão Operacional Limpa**:
   - Permite a impressão individual ou em lote de múltiplos pré-romaneios.
   - O documento impresso exibe as atribuições de veículo, motorista, ajudante e observações, além de colunas de conferência física (CHK, CTRC ID, Nota Fiscal, destinatário, remetente, cidade, volumes e localização de pátio).
   - Incorpora uma ficha de controle de rodapé para preenchimento de horários e assinaturas dos operadores de pátio.

---

## 21. Login e Unidade Operacional

Com o objetivo de disciplinar as operações e garantir que cada operador atue de forma segura e contextualizada na sua filial, o sistema implementa as seguintes regras de governança para login e controle de Unidades Operacionais (V1):

1. **Unidade Operacional Padrão**:
   - A unidade operacional prioritária definida como padrão do sistema é **VGA** (com a nomenclatura "VGA - Varginha").
   - O login do operador por padrão se inicia selecionando a unidade VGA.

2. **Permissões, Cadastro e Edição Dinâmica**:
   - **Controle Total pelo Master**: O usuário master administrador possui acesso completo à seção de **Gestão de Unidades Operacionais (Filiais)** localizada em Configurações. Através dela é possível listar todas as filiais configuradas, cadastrar novas unidades e/ou desativar e reativar unidades existentes.
   - **Segurança e Fallback**: O sistema impede a exclusão ou desativação da filial padrão **VGA** caso ela seja a única unidade habilitada no momento.
   - **Acesso Visual do Operador Comum**: Operadores comuns não possuem poder para criar ou editar as unidades. Seus formulários e filtros de filial ficam em modo leitura, exibindo e travando as escolhas de acordo com a governança outorgada.
   - **Administrador Padrão**: O usuário master principal do cockpit é o **anderson** (senha **123**), atuando como "Supervisor Operacional" (Anderson Matheus). O usuário master antigo atua como conta técnica de suporte secundário em caso de perda de credenciais locais.

---

## 22. Modo Produção e Dados de Demonstração

Para preparar o RotaOperational para sua primeira operação em ambiente real e garantir que nenhuma massa de dados transacionais fictícia polua as faturas e romaneios legítimos, o sistema implementa as seguintes regras de controle de ciclo de vida de dados:

1. **Flag Central de Modo de Dados**:
   - O arquivo central de ambiente `src/constants/runtimeMode.ts` expõe duas chaves: `IS_DEMO_MODE` e `ALLOW_DEMO_TRANSACTIONAL_SEEDS`.
   - Em produção puro, ambos são definidos como `false`.

2. **Diferenciação entre Dados Mestres e Transacionais**:
   - **Dados Transacionais (Iniciam vazios em Produção)**: Veículos (`vehicles`), Motoristas (`drivers`), CTRCs (`ctrcs` e `linkedCtrcs`), Romaneios salvos (`savedRomaneios`), despesas e faturas/tickets de ocorrências iniciais. Esses dados devem originar exclusivamente de cadastros legítimos locais ou importações oficiais de arquivos.
   - **Dados Mestres Parameterizados (Semeados em Produção)**: Tabelas regulatórias vitais, como Ocorrências de Entrega (`occurrences`), Cidades e Rotas (`cidades_rotas`), Cadastro de Clientes de Curva A (`curva_a_clients`), Feriados e Calendário Operacional (`operational_calendar_events`) e Gates de Roteirização. Estes bancos de referência continuam sendo semeadas se encontrados vazios.

3. **Utilitário Seguro de Purga Manual para o Master**:
   - Na visão de Configurações, o usuário **Master** tem acesso ao painel de **Ambiente de Produção e Limpeza do Mock**.
   - O painel exibe estatísticas em tempo real sobre a quantidade de itens fictícios residuais instalados.
   - Para executar o expurgo seguro, o administrador deve digitar exatamente a frase confirmatória **LIMPAR DEMO**. Ele remove apenas os registros correspondentes às chaves primárias e objetos do pacote demo (`initialVehicles`, `initialDrivers`, etc.), resguardando dados importados ou inseridos manualmente.
   - Caso o banco já tenha sido purgado ou não contenha registros reconhecidos do mock de demonstração, o sistema emite um alerta seguro informando que não foi possível identificar dados de demonstração adicionais.

---

## 23. Sincronização Operacional Supabase V1 (Multi-PC)

Para apoiar a colaboração e permitir que múltiplos computadores continuem a roteirização de cargas a partir do estado em que outras máquinas pararam, o RotaOperational estende a integração Supabase para incluir as tabelas transacionais e planejamentos operacionais em sua versão 1:

1. **Escopo de Tabelas Sincronizadas**:
   - **CTRCs** (`ctrcs`): Registro expandido de fretes e notas fiscais com status corrente na nuvem.
   - **Roteirização e Priorizações** (`route_planning_items`): Registro sob-demanda contendo as rotas sugeridas versus as operacionais definidas manualmente pelo planejador, tags de status de planejamento e de bloqueio.
   - **Pré-romaneios** (`pre_romaneios`): Os portões físicos, status de separações e listas de CTRCs designadas ao galpão para carregamento de pátio física.
   - **Histórico e Romaneios Salvos** (`saved_romaneios`): Romaneios consolidados de expedições já com motoristas, ajudantes, CTRCs faturados e observações integradas à auditoria.

2. **Diretrizes e Algoritmos de Conflito ("Safe Merge")**:
   - **Last Write Wins (LWW)**: Para todas as tabelas operacionais que dispõem de carimbos de tempo de modificação (`updatedAt` ou `updated_at`), registros que colidem com correspondentes locais e remotos são comparados de forma individualizadora. A versão que contiver o timestamp cronológico mais recente é preservada, garantindo conformidade.
   - **Registro por Registro**: Registros que existem apenas na nuvem são baixados de forma automática. Registros que residem exclusivamente na máquina local são mantidos intocados.
   - **Sem Exclusão Destrutiva**: Em concordância com os princípios de resiliência, o sincronizador operacional nunca executa ações de delete físico na máquina local simplesmente por ausência de dados na nuvem, garantindo tolerância máxima contra perdas acidentais de internet ou erros de banco de dados.

3. **Painel de Interface e Ações do Operador**:
   - Localizado em Configurações, o painel de **Sync Operacional Supabase V1** exibe logs de console informando as etapas processadas no banco, o total de registros mesclados e o horário de finalização do sync mais recente.
   - **Enviar operação para nuvem (Export)**: Coleta todo o estado dinâmico local corrente do IndexedDB e realiza um upsert na infraestrutura remota do Supabase.
   - **Baixar operação da nuvem (Pull/Import)**: Consulta as tabelas remotas, mescla-as de forma segura com o IndexedDB e executa o disparo do trigger de reidratação em tempo de execução para os componentes visuais reagirem.
   - **Sincronizar operação agora (Bidirecional)**: Realiza uma mesclagem de duas vias segura (baixando o que há de mais atual para a máquina local e disparando o estado integrado finalizado resultante de volta para o Supabase).

---

## 24. Controle de Versão Pós-Deploy e Reset Seguro de Filtros

Com o fim de evitar inconsistências de cache no Vercel ou preferências persistidas antigas ocultando novos CTRCs importados e apresentando o grid da Mesa de Roteirização vazio, o sistema implementa um controle ativo de reidratação e versão:

1. **Gestão de Versão no Browser (`APP_VERSION = "1.0.1"`)**:
   - A constante centralizada de versão reside em `src/constants/appVersion.ts`.
   - Ao iniciar a aplicação, se o valor lido em `localStorage.getItem("router_app_version")` for diferente da versão do pacote atual (`APP_VERSION`), o sistema realiza um expurgo estratégico automático das preferências de views do operador (`UserPreferenceRepository.clearAll()`).
   - Isso garante que filtros, sorting e groupings de visualizações voláteis voltem aos padrões de fábrica, desobstruindo todas as possíveis regras de visibilidade restritivas sem jamais tocar ou apagar os dados do usuário (CTRCs, Romaneios, rotas e motoristas permanecem 100% intocados).

2. **Reidratação de Estados pós-Importação de CTRC**:
   - Logo após o processamento e salvamento bem-sucedido de novos CTRCs importados (via arquivo SSW CSV) nas coleções offline do IndexedDB, o sistema força dinamicamente um reload síncrono integral e re-hidratação direta dos estados em memória (`setAvailableCtrcs`). Isso evita quaisquer atrasos de atualização ou problemas de concorrência reativa no pátio.

3. **Diagnóstico Seguro de Visibilidade na Mesa**:
   - Caso o pátio operacional contenha CTRCs pendentes no IndexedDB (ou carregados em memória local) mas o grid da Mesa de Roteirização permaneça completamente vazio devido ao conjunto de filtros e termos de pesquisa ativos no pátio, um banner sutil de diagnóstico é embutido no centro do cartão informando a existência de registros ocultos: "**Há CTRCs carregados, mas poucos aparecem na Mesa. Verifique filtros, unidade, ocorrência ou compatibilidade logística.**".
   - Um botão interativo integrado de **Limpar filtros** é fornecido para o operador resetar todos os filtros de ocorrências correntes, devolvendo a legibilidade total das faturas do depósito instantaneamente.

4. **Painel de Diagnóstico de Gargalos (Homologação e Suporte)**:

5. **Classificação `availableCtrcs` vs `linkedCtrcs`**:
   - **`availableCtrcs`**: Representa os CTRCs candidatos ativos à Mesa de Roteirização.
   - **`linkedCtrcs`**: Representa os CTRCs já planejados ou vinculados a um pré-romaneio/romaneio/fase posterior.
   - **Importação Bruta**: A simples importação do faturamento bruto no IndexedDB (com status inicial 'Pendente') **não** torna o CTRC vinculado; ele deve figurar como candidato na Mesa de Roteirização (`availableCtrcs`).
   - **Critérios de Vínculo**: O CTRC vai para `linkedCtrcs` apenas se estiver em fases de execução: `"Separando"`, `"Programado"`, `"Romaneio"`, `"Em Rota"`, `"Entregue"`, `"Finalizado"`, `"Cancelado"`, possuir campos `preRomaneioId`/`romaneioId` ativos, ou se o seu ID estiver associado a algum Pré-Romaneio ativo não-cancelado. Any other status (`"Pendente"`, `"Aguardando"`, ausente) permanece em `availableCtrcs`.

6. **Painel de Diagnóstico de Gargalos (Homologação e Suporte)**:
   - Um painel lateral especializado e seguro chamado **Painel de Diagnósticos da Mesa** (`RoteirizacaoDiagnosticsPanel`) serve como ferramenta de suporte técnico e homologação para diagnosticar em qual etapa do fluxo de filtragem sequencial as faturas "somem".
   - **Garantia de Não-Destrutividade**: O painel **nunca altera nenhum dado transacional ou mestre** do banco IndexedDB ou do Supabase. Ele realiza um cálculo puramente dedutivo e em tempo real sobre os vetores de faturas carregados.
   - **Pipeline de Filtragem Rastreável**: Mostra a evolução quantitativa das faturas de ponta a ponta:
     1. Total gravado no IndexedDB
     2. Total disponível para roteirização em memória (`availableCtrcs`)
     3. Total rejeitado por status de vinculação/planejamentos ativos
     4. Quantidade de entrada no Enriquecimento
     5. Quantidade após regras síncronas de geolocalização e malha
     6. Quantidade após filtro operacional de Filial (Unidade corrente)
     7. Quantidade após filtro geográfico da Rota principal
     8. Quantidade após filtro do Setor de Ocorrência corrente
     9. Quantidade após busca por texto de NF/Contrato/Emitente
     10. Quantidade após regra de Compatibilidade Logística de filiais secundárias
     11. Quantidade após filtro de status operacional específico
     12. Total final visível na Mesa
   - **Identificação do Principal Gargalo (Bottleneck)**: Identifica automaticamente qual das etapas de filtragem foi responsável pela maior retenção de registros (maior perda percentual ou absoluta).
   - **Distribuição Detalhada de Metadados**: Apresenta contagens e agrupamentos com base no lote inicial de faturas para Filiais, Status Operacional, Setor de Ocorrência SSW e Elegibilidade de Roteiro.
   - **Exportação de Logs**: Provê um botão para copiar o relatório técnico formatado de diagnóstico em formato Markdown/JSON para a área de transferência do operador, otimizando o suporte administrativo de homologação.
   - **Logs de Engenharia**: Ao abrir o painel de diagnósticos na Mesa, o sistema imprime tabelas completas (`console.table`) com os contadores de cada etapa de transição, a fim de agilizar testes por desenvolvedores no ambiente de homologação.





