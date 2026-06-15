# 🚚 RotaOperational — Modelo de Governança Corporativa, Arquitetura MVP e Estratégia de Refatoração Progressiva

Este documento estabelece a especificação arquitetural oficial e o plano de governança operacional para a plataforma web **RotaOperational**. Ele serve como base técnica viva e mapa de engenharia, detalhando o estado real do software, seus módulos funcionais ativos, fraquezas conhecidas (dívidas técnicas) e a estratégia de evolução sem ruptura no fluxo logístico do dia a dia.

---

## 🧭 1. Visão Geral do Produto

### O Problema Resolvido Hoje
A triagem física e o despacho rodoviário de faturamento sofrem gargalos devido à incompatibilidade de saídas brutas do ERP relativas aos documentos eletrônicos CTRCs (Conhecimentos de Transporte Eletrônico). O **RotaOperational** simplifica este gargalo centralizando a importação, o mapeamento flexível de cabeçalhos das planilhas, a roteirização física (atribuição por veículo) e a liberação documental sob uma perspectiva estrita de controle por unidade operacional (filial física).

### Quem Utiliza a Plataforma
*   **Operador de Despacho (Unidade Física - ex: SPO, VGA, ALF, PPY):** Usuário operando na ponta do pátio logístico, responsável por processar o CSV faturado e consolidar o fechamento documental de romaneio de cargas na frota designada.
*   **Superintendente de Logística / Administrador (Master):** Gestor com visão consolidada multirregional, responsável por auditar o desempenho de motoristas, cadastrar novas empresas Curva A, parametrizar tabelas de ocorrência regulamentadas e criar novas credenciais de login operacional.

### Limites Atuais do Sistema
*   **Isolamento Cliente-Servidor:** O sistema adota uma filosofia **Local-First com Nuvem Sincronizada**. Eventos e modificações na fila de carregamento ficam retidos em cache local (`localStorage` / memória de renderização) e requerem um acionamento manual de "Sincronização" no painel de configurações para persistir as tabelas remotas do Supabase corporativo.
*   **Sem Controle Temporal de Manifesto:** Não há tabelas relacionando viagens históricas consolidadas associadas a despesas fechadas. O fechamento do manifesto é de consumo pontual pelo operador (emissão de relatório PDF físico e baixa imediata no status do veículo).

---

## 🔄 2. Fluxo Operacional Principal (O Core Loop Real)

O ciclo de vida de controle diário do sistema segue o fluxo logístico real na triagem física:

```
┌─────────┐     ┌────────────┐     ┌────────────┐     ┌───────────────┐     ┌───────────────┐
│  Login  │ ──► │ IMPORTAÇÃO │ ──► │ MAPEAMENTO │ ──► │ ROTEIRIZAÇÃO  │ ──► │ FINALIZAÇÃO   │
│ Operador│     │ Arquivo ERP│     │  CSV/TXT   │     │Alocação Frota │     │Manifesto e PDF│
└─────────┘     └────────────┘     └────────────┘     └───────────────┘     └───────────────┘
                                                             │                      │
                                                             ▼                      ▼
                                                      ┌───────────────┐     ┌───────────────┐
                                                      │  Ocorrências  │ ──► │  Conclusão e  │
                                                      │    e Rua      │     │ Liberação Vgo.│
                                                      └───────────────┘     └───────────────┘
```

1.  **Login Fiduciário:** O usuário realiza a decolagem do sistema utilizando suas credenciais de login. O sistema extrai seu nível (`is_master`) e sua unidade fixa de negócio (`unid`), aplicando restrições automáticas em todos os grids sequenciais.
2.  **Importação de Faturamento:** Upload por arrastar-e-soltar de arquivos brutos CSV ou TXT provenientes de sistemas legados de ERP.
3.  **Mapeamento de Cabeçalhos:** Utilizando uma janela reativa no frontend, o despachante associa colunas variáveis da tabela importada com os dados padronizados exigidos (Destinatário, Peso, Volume, NF, Valor de Frete).
4.  **Validação de Consistência:** Sistema depura CTRCs rejeitados e aceitos, identificando se há duplicidades locais e preenchendo as tabelas de faturamento em cache.
5.  **Roteirização e Alocação:** Operador visualiza a lista filtrada apenas com CTRCs pertencentes à sua filial regional. Através do grid elástico (com colunas estáticas de-colagem redimensionáveis), atribui pacotes operacionais para as placas ativas que aguardam no galpão.
6.  **Finalização Operacional:** Sistema agrupa CTRCs vinculados ao veículo, gera despesas corporativas estimadas de viagem (combustível, pedágios, ajudantes) e processa o fechamento, emitindo o relatório PDF (romaneio de carregamento) para impressão. O veículo é devolvido ao status "Disponível" para novas viagens.
7.  **Ocorrências de Trânsito:** Motoristas em trânsito reportam atrasos ou devoluções de frete, o auditor registra as tratativas utilizando o dicionário técnico de ocorrências regulamentadas para posterior conciliação fiscal.

---

## 🧱 3. Organização Modular do Sistema

Para facilitar manutenções incrementais e auditorias de código por terceiros replicadores, o sistema é estruturado nos seguintes módulos de responsabilidade única:

### A. Módulo de Acesso e Governança (`LoginView` & `ConfiguracoesView`)
*   **Objetivo:** Garantir a consistência de login e credenciais administrativas.
*   **Responsabilidades:** Monitorar sessão do operador, resguardar hashes de segurança locais e injetar chaves remotas de infraestrutura Supabase de forma protegida.
*   **Entidades Ativas:** `AppUser`
*   **Persistência:** Tabela física do banco de dados `public.app_users` remetida ao Supabase. Fallback local de sessão e sementes iniciais auto-provisionadas por rota do Express.

### B. Módulo de Importação e Adaptação de ERP (`ImportacaoView`)
*   **Objetivo:** Desacoplar formatos de saída dos ERPs Camilo dos Santos de forma agnóstica na interface.
*   **Responsabilidades:** Ler arquivos tabulados, memorizar configurações de de-para em cache de terminal (`localStorage`) e expor logs de processamento.
*   **Entidades Ativas:** `Ctrc` (Estado temporário pós-faturamento)
*   **Persistência:** Armazenado em memória cache (`availableCtrcs` gerenciado no `App.tsx`) e cache de formulário de cabeçalhos no `localStorage`.

### C. Módulo de Roteirização Física (`RoteirizacaoView`)
*   **Objetivo:** Gerenciar o balanceamento físico de peso e volume de carga por caminhão.
*   **Responsabilidades:** Fornecer grid redimensionável robusto com busca indexada rápida, permitir check de múltiplas linhas de-para e vincular cargas a placas.
*   **Entidades Ativas:** `Ctrc` & `Vehicle`
*   **Persistência:** Atualiza e salva chaves como `setor`, `status_ctrc`, e `vehicle` diretamente na tabela `public.ctrcs`.

### D. Módulo de Finalização e Manifesto (`FinalizacaoView`)
*   **Objetivo:** Fechar a viagem e documentar despesas fiscais diretas.
*   **Responsabilidades:** Somar peso faturado total, gerenciar input dinâmico de despesas de pedágios/diárias de ajudantes, exportar vetor PDF com layout de expedição corporativo.
*   **Entidades Ativas:** `Ctrc` & `Vehicle` (Retorno de status "Livre")
*   **Persistência:** Apenas leitura de dados locais do estado react. Atualiza localmente o status de finalização ("Em Fila" para "Roteirizado").

### E. Módulo de Gestão de Ativos (`FrotaView` / `DesempenhoView`)
*   **Objetivo:** Manter o histórico de carros, placas e motoristas disponíveis.
*   **Responsabilidades:** Cadastrar carros, gerenciar scores estatísticos de condução econômica de carretas, calcular notas de desvio de rota.
*   **Entidades Ativas:** `Vehicle` & `DriverScore`
*   **Persistência:** Sincronização em tempo real direta para `public.vehicles` e `public.drivers` remotamente.

### F. Módulo Auxiliar de Soluções (`OcorrenciasView` & `SolucaoView`)
*   **Objetivo:** Centralizar a tradução técnica de incidentes logísticos.
*   **Responsabilidades:** Manter cadastro legível de ocorrências de transporte padronizadas (Causas de recusa e rotinas de rua) e tickets urgentes abertos.
*   **Entidades Ativas:** `DeliveryOccurrence` & `Ticket`
*   **Persistência:** Sincronia de tabelas `public.occurrences` e `public.tickets` para o Supabase PostgreSQL.

---

## 📊 4. Classificação de Maturidade dos Módulos

Classificação estrita sobre o nível de integridade técnica e de entrega operacional de cada subsistema ativo:

| Módulo | Arquivos de Código | Nível de Maturidade | Persistência Predominante | Visibilidade Recomendada | Prioridade de Refob |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Login e Sessão** | `LoginView.tsx` | **Estável** (Alta Maturidade) | Supabase (`app_users`) | **Total** (Tela Pública) | Baixa |
| **Grid Roteirização** | `RoteirizacaoView.tsx` | **Estável** (Alta Maturidade) | Supabase (`ctrcs` em nuvem) | **Total** (Fluxo Principal) | Média (Otimizar performance) |
| **Importação de CSV** | `ImportacaoView.tsx` | **Parcial** (Funcional) | Cache Local + Supabase | **Total** (Fluxo Principal) | Média |
| **Finalização Carga** | `FinalizacaoView.tsx` | **Parcial** (Em Evolução) | Memória local temporária | **Total** (Fluxo Principal) | Alta (Implementar tabela remota) |
| **Frota/Veículos** | `FrotaView.tsx` | **Estável** | Supabase (`vehicles`) | **Total** (Ativos de Apoio) | Baixa |
| **Tickets / Ocorrência**| `OcorrenciasView.tsx` | **Experimental** | Supabase (`occurrences`) | **Secundária** (Admin/Auditoria)| Baixa |
| **Clientes Curva A** | `CurvaAView.tsx` | **Experimental** | Supabase (`curva_a_clients`)| **Secundária** (Auditoria) | Baixa |
| **Dashboard Histórico** | `DashboardView.tsx` | **Roadmap Interno / Futuro** | Agregados dinâmicos JS | **Oculto / Minimizado** | Alta (Substituir por SQL views) |

---

## 🔒 5. Núcleo Operacional Próximo (As Áreas Protegidas)

As seguintes áreas representam o faturamento corrente do pátio e são classificadas como **Protegidos contra Alterações Agressivas ou Destrutivas**:

1.  **Engine de Mapeamento Flexível (`ImportacaoView.tsx`):** O seletor de de-para para ler planilhas que contém dados misturados não deve sofrer alterações em sua árvore XML para não inutilizar as importações salvas pelos operadores.
2.  **Sincronia Estrita de Placas (`FrotaView.tsx`):** Cadastro de placas físicas, restrições e scores devem ser mantidos pois geram referências diretas de banco de dados SQL (`CREATE TABLE public.vehicles` dependências diretas de rotas).
3.  **Travamento de Perfil regional (`unid`):** O sistema de visualização restrita por unidade regional. Operadores locais de SPO não podem em nenhuma circunstância ter canais cruzados visualizando dados de ALF ou VGA.

---

## 🗃️ 6. Funcionalidades Secundárias e Roadmap Desprivilegiadas da UX

Para manter o operador focado na ação de despacho sem poluição visual ou dispersão de gráficos estatísticos conceituais, as seguintes telas foram **deslocadas das posições macros na barra lateral (`Sidebar.tsx`)** e reclassificadas de forma limpa na seção colapsável corporativa **"Auditoria & Supabase"** ou protegidas de excessos visuais:

*   **Desempenho Estatístico de Kpis (`DesempenhoView`)**
*   **Problemas de Entrega Críticos (`SolucaoView`)**
*   **Telas de Clientes Curva A e Análise de Risco (`ClientesView` / `CurvaAView`)**
*   **Banco De Referências Acadêmicas de Ocorrências (`OcorrenciasView`)**

Esses itens continuam totalmente implementados e funcionais no código, mas não concorrem pela atenção de faturamento em tempo real do despachante operacional no fluxo de decolagem de caminhão.

---

## 🛠️ 7. Estrutura Técnica de Dados e Sincronia

O gerenciamento de dados segue a arquitetura dual:

```
┌───────────────────────────────────────────────────────────────┐
│                    Terminal do Operador                      │
│                                                               │
│    ┌───────────────┐                  ┌──────────────────┐    │
│    │  Local State  │ ◄─(Export/Sync)─► │   Storage Local  │    │
│    │ (Memória RAM) │                  │  (localStorage)  │    │
│    └───────┬───────┘                  └──────────────────┘    │
└────────────┼──────────────────────────────────────────────────┘
             │
             │ (Manual Sincronização Cloud)
             ▼
┌───────────────────────────────────────────────────────────────┐
│                    Supabase Cloud Database                    │
│                                                               │
│                     [ PostgreSQL Tables ]                     │
└───────────────────────────────────────────────────────────────┘
```

1.  **LocalStorage / Memória RAM do Browser:** Serve como sandbox ultra-veloz de preparação. CTRCs são importados e alocados nos caminhões localmente para que erros de internet do pátio de triagem física não façam o operador perder o trabalho de roteirização corrente de 80 CTRCs em uma tarde de expediente.
2.  **Sincronização em Nuvem (Cloud Sinc):** Realizada sob demanda no menu de **Configurações**. No ato do clique, as frotas e CTRCs são validados, unificados e exportados à tabela do Supabase. Da mesma forma, operadores de outras filiais importam e agregam esses dados à sua visão operacional.

---

## ⚠️ 8. Dívidas Técnicas Conhecidas (Transparência de Arquitetura)

Identificamos os seguintes gargalos de infraestrutura no MVP para correção planejada:

1.  **Row Level Security (RLS) Desativado provisoriamente:** Para garantir facilidade de bootstrap instantâneo em qualquer container, as tabelas SQL da migração operam com RLS desativado por padrão.
2.  **Agregações Custosas em Memória Direct Frontend (`DashboardView.tsx`):** KPIs, totais de tonelagem, médias de desvio e faturamento acumulado são calculados em tempo de renderização utilizando loops em Arrays JavaScript. Caso a base cresça para dezenas de milhares de CTRCs por filial por semana, o navegador do terminal apresentará perda perceptível de responsividade.
3.  **Persistência Volátil de Despesas de Manifesto (`FinalizacaoView.tsx`):** Despesas adicionais de pedágio registradas antes da decolagem do romaneio não possuem tabela temporária própria na nuvem, residindo puramente na estruturação do componente até a emissão do PDF de despesa consolidada.

---

## 🛡️ 9. Estratégia de Refatoração Incremental e Níveis de Risco

Plano pragmático para evolução do RotaOperational com baixo custo operacional:

### 🟢 Sem Risco (Ações Cosméticas / UX):
*   *Atividade:* Manter e polir a hierarquia do menu enxuto que prioriza a ordem exata do expediente físico do conferidor no pátio logístico.
*   *Foco:* Densidade e espaçamento nos painéis de-para de CSV.

### 🟡 Baixo Risco (Refatoração de Sincronia local):
*   *Atividade:* Migrar a chave de-para salva do layout do ERP configurada em `localStorage` para a tabela persistente de usuários em banco.
*   *Segurança:* Se o operador trocar de navegador, o de-para do layout de recebimento restará intacto em nuvem.

### 🟠 Médio Risco (Tratamento de Despesas e Manifestos):
*   *Atividade:* Implementação da tabela em nuvem `public.romaneios` para salvar a listagem fechada de viagens.
*   *Estrutura:* Deixa de processar resets puros em memória de fila e passa a guardar no histórico remoto seletivo do Supabase.

### 🔴 Alto Risco (Remodelação SQL / Ativação de RLS Dinâmico):
*   *Atividade:* Ativar Row Level Security no Supabase restringindo operações baseado estritamente na credencial regional `unid`.
*   *Atenção:* Exige testes de regressão exaustivos para evitar o bloqueio acidental de despachantes em rota durante instabilidades de internet.

---

## 🧭 10. Diretrizes de Design e UX Operacional para Motoristas e Operadores

O design corporativo do software adota estética de **Interface de Missão Crítica (Dashboard de Alta Densidade)** baseado nestas regras de ouro:

*   **Paleta Escura de Baixa Fadiga Visual (Cosmic Slate):** Ideal para terminais em ambientes industriais, galpões e balanças de pesagem com baixa ou alta incidência de luz de pátios.
*   **Densidade de Dados Excel-Style:** Tabelas devem dispor de espaçamentos enxutos para leitura simultânea de múltiplos CTRCs e mercadorias sem excesso de rolagem na viewport.
*   **Feedback Imediato de Estado:** Alertas de cor discretos (ex: `#3ecf8e` para sincronismo ok/nuvem e `error` para cargas divergentes ou veículos pendentes de documentação).
*   **Foco Práctico Imprinting:** Utilização de fontes modernas monoespecíadas (`JetBrains Mono`) para destaque exato de Placas de caminhões, identificador único de CTRCs, CNPJ e valores faturados em moeda real.

---

## 📅 11. Roadmap em Camadas (Faseamento Prático)

```
CAMADA 1 ──► [Estabilização]    (Garantir o fluxo diário sem oscilações)
CAMADA 2 ──► [Desacoplamento]   (Feature Flags e redução de dispersões)
CAMADA 3 ──► [Segurança]        (Consolidar RLS e login por filial físico)
CAMADA 4 ──► [Histórico Nuvem]  (Persistência remota de romaneio fechado)
```

### 🗓️ Camada 1: Estabilização do Core Loop
*   Garantir integridade do editor Excel dinâmico na planilha elástica de roteirização.
*   Tratativas de erros de parse em uploads de arquivos mal-formados.

### 🗓️ Camada 2: Ocultação do Futuro e Modularização (Concluída nesta fase)
*   Redução cognitiva do menu de navegação agrupando telas estatísticas longes do operacional cotidiano.
*   Inserção de tags indicativas `Ref` (Roadmap) para transparência de governança de equipe.

### 🗓️ Camada 3: Governança de Perfil Ativo por Filial
*   Blindagem no frontend para impedir que operadores limitem filtros regionais ativos caso não possuam permissão verdadeira `is_master`.

### 🗓️ Camada 4: Transição de Banco (Fase Histórica)
*   Implementar a tabela de banco remoto `public.romaneios_hist` substituindo resets totais por logs definitivos na infraestrutura da transportadora.

---

## 🛠️ 12. Diretrizes Arquiteturais Futuras de Replicação

Ao replicar a instância do **RotaOperational** para novas filiais parceiras ou novos clientes logísticos, siga sempre esta sequência sanitária:

1.  **Executar o script DDL SQL completo** contido no banco de sementes centralizado nas migrações do Supabase para garantir a herança de tabelas e desativação inicial de RLS.
2.  **Injetar via painel administrativo** o usuário semente MASTER inicial para provisionamento correto do despachante regulador.
3.  **Evitar modificações na stack central** preservando o middleware Express que intermedia as autenticações fiduciárias contra as APIs de nuvem.

---

*RotaOperational: Engenharia, Despacho e Governança Logística de Alta Performance para o transporte rodoviário nacional.*
