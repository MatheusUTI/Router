# 📐 Plano de Governança, Arquitetura de MVP e Refatoração Progressiva

Este documento consolida o diagnóstico técnico completo da plataforma **RotaOperational**, estabelecendo as diretrizes de design, fluxo operacional enxuto, classificação de maturidade dos módulos, e estratégias de refatoração incremental de baixo impacto para conversão segura do sistema em um MVP de alta maturidade corporativa.

---

## 1. Visão Geral do Produto

O **RotaOperational** é uma solução de inteligência e controle de fluxo logístico focada em apoiar a triagem física regionalizada e o despacho de mercadorias no transporte rodoviário.

*   **Problema Logístico Principal:** Desacoplar os relatórios de faturamento em arquivo bruto CSV de ERPs do despacho diário nas filiais físicas de pátio (São Paulo, Pouso Alegre, Alfenas, Varginha).
*   **Aparência e Filosofia Visual:** O sistema é estruturado sob o conceito de **Missão Crítica Industrial** (Tema *Cosmic Slate*), adotando visual escuro de baixa fadiga para conferidores, despachantes e motoristas operando em pátios físicos. Ele prioriza a densidade visual e tabelas compactas inspiradas no Excel para agilizar a leitura concomitante.
*   **Limites Atuais de Operação:** Ele opera sob uma arquitetura de sincronização remota sob demanda para o Supabase PostgreSQL. Toda a movimentação de carga corrente de faturamento inicial reside em estados locais fiduciários de renderização no frontend para evitar que instabilidades de rede móvel (3G/4G) interrompam a conferência de carregamento física.

---

## 2. Fluxo Operacional Principal Real (MVP Loop)

O mapeamento cronológico real do expediente operacional do despachante é estruturado a seguir, onde destacamos o nível de maturidade de cada etapa:

```
[1] Login regional ──► [2] Importação CSV ──► [3] Mapeamento De-Para ──► [4] Roteirização Grid ──► [5] Manifesto & PDF
```

1.  **Acesso e Governança:** O operador realiza a identificação fiduciária. O sistema extrai suas permissões (`is_master`) e sua filial operacional padrão (`unid`). Se o usuário não for superintendente corporativo, o sistema bloqueia e esconde seletores de outras unidades regionais. *(Status: Estável)*
2.  **Carga e Leitura de Fretes:** Upload por arrastar-e-soltar de arquivos brutos CSV emitidos pelos depto de faturamento no ERP Camilo dos Santos. *(Status: Estável)*
3.  **Configuração do Gabarito (Manejo De-Para):** Tela em modal onde cabeçalhos desconhecidos são amarrados com os atributos padrões exigidos (Destinatário, Peso, Volume, Frete). *(Status: Parcialmente Maduro, salvando definições no cache do browser)*
4.  **Triagem e Formação de Carga:** Operadores de despacho visualizam em tempo real apenas os CTRCs importados pertencentes à sua filial regional fiduciária. Os fretes selecionados são alocados em placas de veículos ativas. *(Status: Estável, integrado ao Supabase via tabelas centralizadas de `ctrcs` e `vehicles`)*
5.  **Manifestação e Fechamento:** Tela consolidando peso, volumes, custos brutos estimados da rota (diárias, pedágios, combustível) e permitindo a exportação de rotina para PDF de expedição física. O fechamento libera o veículo para o pátio e conclui o loop. *(Status: Funcional na interface com persistência local)*

---

## 3. Organização Modular do Sistema

Para organizar a visão de engenharia e afastar dependências cruzadas, dividimos o RotaOperational em macro-responsabilidades lógicas:

### A. Módulo de Acesso e Perfil Regional
*   **Objetivo:** Isolar o acesso a informações por filial.
*   **Responsabilidades:** Monitorar autenticação, extrair perfil administrativo de usuário do Supabase e persistir de forma única a unidade ativa travada (**SPO**, **PPY**, **ALF**, **VGA**).
*   **Entidades principais:** `AppUser`
*   **Sincronização:** Banco de dados remoto `public.app_users`.

### B. Módulo de Preparação e Parser de CSV
*   **Objetivo:** Normalizar múltiplos layouts de exportação brasileiras de transportete em tempo de execução frontend.
*   **Responsabilidades:** Processar linhas de planilhas locais, depurar erros de formatação (ponto vs vírgula de peso), estimar volumes aceitos e rejeitados.
*   **Entidades principais:** `Ctrc` (Estado transiente)
*   **Sincronização:** Transição em memória RAM (`availableCtrcs`) e cache local de layout no `localStorage` sob chave `rota_operational_saved_layout_mapping`.

### C. Módulo de Grid e Roteirização Geral
*   **Objetivo:** Roteirizar cargas em canais físicos de expedição rápida.
*   **Responsabilidades:** Fornecer planilha do Excel customizável de alta velocidade de-para, redimensionar colunas de visualização estaticamente contornando sandbox de IFrame, e alocar cargas a caminhões.
*   **Entidades principais:** `Ctrc` & `Vehicle`
*   **Sincronização:** Escrita em tempo real no banco remoto sob a tabela centralizada `public.ctrcs`.

### D. Módulo de Liberação e Manifesto de Despesa
*   **Objetivo:** Fechar a rota física e auditar financeiramente despesas sob demandas operacionais de frota.
*   **Responsabilidades:** Somar peso bruto real transportado, registrar estimativas de custos variáveis de rota do motorista (combustível, alimentação) e gerar layout PDF legível em impressoras térmicas de despacho corporativo.
*   **Entidades principais:** `Ctrc` & `Vehicle`
*   **Sincronização:** Local e transiente no frontend React.

### E. Módulo de Controle de Ativos Terrestres
*   **Objetivo:** Fornecer inventário ativo de frotas e condutores.
*   **Responsabilidades:** Ativar/remover caminhões operacionais, gerenciar as placas qualificadoras ativas, registrar as notas de score de eficiência de motoristas e médias de devolução.
*   **Entidades principais:** `Vehicle` & `DriverScore`
*   **Sincronização:** Sincronia contínua direta nas tabelas remotas `public.vehicles` e `public.drivers`.

---

## 4. Classificação de Maturidade dos Módulos

Especificamos o mapeamento técnico sincero de estabilidade das áreas do sistema para orientar priorização e refatorações futuras:

| Módulo Logístico | Status Atual | Uso Operacional Corrente | Prioridade de Evolução |
| :--- | :--- | :--- | :--- |
| **Login e Autenticação** | **Estável** | Seguro, com provisionamento automático remoto no Supabase. | Baixa |
| **Importação e Colunas**| **Parcial** | Funcional no terminal local. O mapeamento De-Para exige nova configuração se houver limpeza de cookies. | Média |
| **Roteirização Grid** | **Estável** | Fornece planilha elástica dinâmica Excel integrada ao Supabase remotamente por placa. | Baixa (Monitoramento) |
| **Finalização Carga** | **Parcial** | Geração e impressão de PDF estável executada na tela. Custos no romaneio não migram para banco remoto. | Alta |
| **Gestão de Frota** | **Estável** | CRUD completo de caminhões e scores de condução faturáveis integrado à nuvem. | Baixa |
| **Ocorrências / Tickets**| **Experimental** | Tabelas remotas prontas e povoadas. Fluxo segregado no menu secundário de auditoria. | Baixa |
| **Curva A Clientes** | **Experimental** | Estratégia de priorização funcional para superintendentes no console corporativo. | Baixa |
| **Desempenho Kpis** | **Roadmap** | Os relatórios agregam dados no frontend utilizando CPU cliente. Requer views SQL Postgres no futuro.| Média |

---

## 5. Núcleo Operacional Próximo (As Áreas Protegidas)

As seguintes sub-rotinas são críticas para a sobrevivência do despacho logístico cotidiano nas filiais e são classificadas como **Protegidos contra Alterações Agressivas ou Destrutivas**:

1.  **Regra de Trava Regional (`AppUser.unid`):** O validador que extrai a filial vinculada ao operador logístico no login (`operador.unid === 'SPO'`) e remove ou silencia de forma coerciva os seletores multidirecionais no cabeçalho do grid. Esta consistência previne que uma unidade de São Paulo altere acidentalmente a triagem de Varginha.
2.  **Mapeador Dinâmico de CSV de-para:** O algoritmo reativo que normaliza arquivos Excel faturados. Modificar este parse quebra retrospectivamente os layouts de importação salvos pelos motoristas terceiros e operadores operacionais na ponta terrestre.

---

## 6. Funcionalidades Secundárias e Módulos Ocultados

Para manter o terminal corporativo limpo, funcional de modo focado no despacho faturável rápido do operador, sem distrações com telas experimentais de desenvolvimento, as seguintes abas do sistema continuam legadas e escritas, mas foram **removidas das posições macros na barra lateral (`Sidebar.tsx`)**, integrando a seção retrátil secundária **"Auditoria & Supabase"**:

*   **Desempenho Kpi (`DesempenhoView`)** — Módulo analítico-estatístico.
*   **Problemas de Rua (`SolucaoView`)** — Sistema técnico de abertura de chamados.
*   **Clientes Críticos (`ClientesView`)** — Histórico documental e auditorias de desvios.
*   **Ocorrências Ref (`OcorrenciasView`)** — Acervo de consulta de resoluções de anomalias logísticas.
*   **Clientes Curva A (`CurvaAView`)** — Gestão estratégica de faturamento de grandes compradores.

---

## 7. Estrutura Técnica Atual do Sistema

*   **Frontend (Single View Driven):** O aplicativo rege-se na tela `src/App.tsx`, delegando os estados operacionais de roteirização transitórios no próprio client antes do disparo manual "Cloud Sync".
*   **Vite Server Express (Proxy):** A engrenagem `server.ts` monitora a porta `3000` (porta corporativa obrigatória do Cloud de decolagem) e serve como orquestradora que une o gateway unificado na porta segura corporativa e os middlewares auxiliares do SPA.
*   **Database (PostgreSQL Supabase):** Esquema relacional semente configurado na inicialização SQL remota executando sem RLS para agilizar o bootstrap local-first das carretas no pátio interno da transportadora.

---

## 8. Dívidas Técnicas Reais (Pontos Frágeis Aceitáveis)

1.  **Row Level Security (RLS) Inativo provisoriamente:** O Supabase opera sem políticas ativas de RLS para evitar o lockout de novos provedores operando de forma elástica, delegando o filtro de visualização por filial regional ao frontend React através do Atributo corporativo `user.unid`.
2.  **Cálculo Agregado Client-Side:** Dashboard agrega e soma milhares de faturamentos usando memória RAM Javascript cliente, o que pode causar travamento se a listagem ultrapassar dezenas de milhares de CTRC ativos no operador.
3.  **Persistência Volátil de Romaneios:** As despesas cadastradas antes da emissão do PDF de manifesto residem puramente na memória das views correntes e não são registradas de forma persistente em tabela remota SQL.

---

## 9. Estratégia de Refatoração Incremental e Níveis de Risco

### 🟢 Nível 1: Sem Risco (Ações Estéticas e Alinhamento Visual)
*   *Implementação:* Reorganização espacial do menu lateral de forma recolhível (Concluída).
*   *Impacto:* Zero de quebra funcional sobre o faturamento de caminhões na frota.

### 🟡 Nível 2: Baixo Risco (Desacoplamento e Cache de Layout)
*   *Implementação:* Criar chave específica no Supabase (`gabarito_csv`) associada à conta do operador para sincronizar a fita de-para das planilhas, eliminando dependência estrita do `localStorage`.
*   *Impacto:* Baixo. Fallback configurável automático em caso de falha de conexão.

### 🟠 Nível 3: Médio Risco (Criação da Tabela `public.romaneios`)
*   *Implementação:* Criar tabela relacional mantendo peso faturado total, placa utilizada e custos da viagem estruturados na nuvem, encerrando o descarte instantâneo após a plotagem do relatório PDF.
*   *Impacto:* Moderado. Exige inclusão de novos tipos de dados no arquivo de regras de interfaces `/src/types.ts`.

### 🔴 Nível 4: Alto Risco (Ativação e Restrição Física RLS Supabase)
*   *Implementação:* Aplicar regras rígidas `ALTER TABLE public.ctrcs ENABLE ROW LEVEL SECURITY` baseado dinamicamente no cabeçalho JWT do usuário para isolamento físico em nuvem.
*   *Impacto:* Elevado. Erros de mapeamento causarão interrupção fatal ("Missing permissions") caso canais de internet móvel apresentem intermitências de entrega.

---

## 10. Estrutura de Navegação Consolidada (Novo Layout do Menu Enxuto)

```
===================================================================
                       MENU ATIVO (CORE MVP)
===================================================================
[1] 📊 Painel Central         - KPIs operacionais simplificados locais
[2] 📥 Importação CSV          - Processador flexível de faturamento ERP
[3] 🗺️ Roteirização            - Planilha Excel de-para e alocação frota
[4] 🧾 Finalização Carga       - Emissor técnico de romaneio PDF e custos
───────────────────────────────────────────────────────────────────
                       ATIVOS DO PÁTIO (APOIO)
───────────────────────────────────────────────────────────────────
[5] 🚚 Frota & Motoristas      - Cadastro e monitoramento de carretas
[6] ⚙️ Sincronia / Cloud        - Configurações Supabase, backup e seeds
───────────────────────────────────────────────────────────────────
                       AUDITORIA E SISTEMAS (ROADMAP)
───────────────────────────────────────────────────────────────────
[7] 🦺 Desempenho Kpi (Ref)
[8] ⚠️ Problemas de Rua (Ref)
[9] 🎯 Clientes Críticos (Ref)
[10] 📖 Ocorrências Ref (Ref)
[11] 🏅 Clientes Curva A (Ref)
===================================================================
```

---

## 📅 11. Roadmap Técnico de Progresso em Camadas

### 🎯 Camada 1: Consolidação da Fila Física (Em andamento)
*   Polimento dos inputs dinâmicos de faturamento da planilha Roteirizacao.
*   Validador integrado de placas nulas ou duplicadas no pátio físico do terminal.

### 🎯 Camada 2: Descongestionamento Visual (Concluída nesta fase)
*   Agrupamento focado de telas experimentais analíticas na barra retrátil de auditoria.
*   Identificação visual clara das telas experimentais utilizando o selo de Roadmap técnico `Ref`.

### 🎯 Camada 3: Segurança Ativa Baseada em Filial
*   Tranca de consistência de views utilizando a propriedade `AppUser.unid` para assegurar conformidade operacional cega na ponta do despachante terrestre.

### 🎯 Camada 4: Persistência Permanente de Viagens
*   Escrita segura do log de romaneios concluídos na infraestrutura remota do operador.

---

*Documentação oficial de vanguarda de engenharia fiduciária da plataforma RotaOperational. Desenvolvido para estabilizar, persistir e acelerar o despacho rodoviário brasileiro.*
