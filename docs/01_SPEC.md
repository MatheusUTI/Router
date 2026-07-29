# Especificação Funcional (SPEC)

Este documento descreve os principais módulos lógicos do sistema RotaOperational.

## 1. Autenticação e Configurações (Login & Admin)
- **Objetivo**: Proteger o sistema e gerenciar usuários.
- **Entradas**: Usuário, Senha (ou login anônimo).
- **Saídas**: Token de acesso, permissões de leitura/escrita.
- **Dependências**: Supabase Auth (simulado/híbrido) e Local Storage.
- **Fluxo**: Login -> Validação -> Carga de permissões -> Redirecionamento Dashboard.
- **Status**: Implementado (básico, suporte a `master/123` via repositório de usuários local).

## 2. Importação e Preparação de Dados
- **Objetivo**: Ingerir dados de sistemas legados (ex: SSW, planilhas CSV) para carregar CTRCs.
- **Entradas**: Arquivo CSV/TXT (Padrão SSW modificado/relatório).
- **Saídas**: Entidades `CTRC` padronizadas, extração de filial destino, ocorrência, pesos.
- **Dependências**: `useIndexedDB`, Parsing local de CSV, Supabase (envio em lote assíncrono).
- **Fluxo**: Seleção de arquivo -> Parsing -> Normalização (aplicação de regras operacionais de Filial) -> Inserção massiva Local -> Sync Nuvem.
- **Status**: Implementado e Funcional.

## 3. Mesa de Roteirização (Planilha Dinâmica)
- **Objetivo**: Visão de planejamento da distribuição local (entregas) com base na disponibilidade de cargas da unidade.
- **Entradas**: Seleção de Filial Ativa, Cargas (CTRCs) do DB, Preferências de visão.
- **Saídas**: Exibição em grid de alta densidade, seleção de CTRCs a carregar, alertas de GR e SLA.
- **Dependências**: `CargaList`, `useRoteirizacaoFilters`, `useCargaSelection`, Repositório Local.
- **Fluxo**: Aplicação de filtros combinados -> Cálculo em tempo real de seleções (Totações) -> Sugestões.
- **Status**: Implementado e Funcional (núcleo central do sistema).

## 4. Agrupamento (Pré-Romaneio e Separação)
- **Objetivo**: Agrupar cargas selecionadas em um pacote preparatório antes da validação final de manifesto.
- **Entradas**: Array de IDs de CTRCs selecionados, Placa do veículo, nome do motorista.
- **Saídas**: Identificador de `PreRomaneio`, Relatório de Separação (Checklist) simplificado para armazém.
- **Dependências**: `PreRomaneioRepository`, IndexedDB.
- **Fluxo**: Ação de Agrupar -> Geração de Objeto de PreRomaneio -> Modificação dos CTRCs para status 'Agrupado' -> Atualização de Visão da Mesa.
- **Status**: Implementado e Funcional.

## 5. Programação do Dia (Solução / Acompanhamento)
- **Objetivo**: Acompanhamento macro das operações do dia (Veículos alocados, ocupação de capacidade, GR, Romaneios emitidos).
- **Entradas**: Pré-romaneios, Cadastros de Veículos (tipos de implementos).
- **Saídas**: Dashboards táticos por filial, relatórios gerenciais e de auditoria simplificada.
- **Dependências**: `SolucaoView`.
- **Fluxo**: Leitura agregada do DB -> Exibição consolidada (Totações de Peso x Capacidade do Veículo).
- **Status**: Implementado (Necessita evolução para despachos reais, mas o fluxo de pré-romaneio está ali).

## 6. Configurações Logísticas (Clientes Críticos, Curva A, Frota, Regras de GR)
- **Objetivo**: Manter os metadados e parâmetros que afetam o motor de regras da roteirização.
- **Entradas**: Ações de CRUD por gestores.
- **Saídas**: Tabelas normalizadas (ex: `vehicles`, `curva_a_clients`).
- **Dependências**: Telas CRUD em `components/configuracoes/` ou Telas Isoladas (FrotaView, ClientesView).
- **Fluxo**: Lista, Edita, Adiciona -> DB.
- **Status**: Parcialmente implementado. CRUDs existem, mas as integrações profundas e sincronismo podem estar com bugs residuais ou dados estáticos acoplados.

## 7. Dashboards e KPIs
- **Objetivo**: Monitorar o desempenho da operação no dia ou período (Nível de Serviço, Ocorrências Críticas).
- **Entradas**: Eventos e base atualizada.
- **Saídas**: Gráficos e indicadores.
- **Dependências**: `kpiDashboardService`, `DashboardView`.
- **Fluxo**: Cálculo estático reativo a mudanças do IndexedDB.
- **Status**: Implementado com Mock/Calculos estáticos que precisam ser hidratados perfeitamente com a base importada.
