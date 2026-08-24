# Especificação Funcional (SPEC)

Este documento descreve os módulos lógicos do sistema **RotaOperational (Router)**, detalhando funcionalidades existentes e a especificação funcional aprovada para a integração com o **SSW**.

---

## 1. Autenticação e Configurações (Login & Admin)
- **Objetivo**: Proteger o sistema e gerenciar usuários locais e sincronizados.
- **Entradas**: Usuário, Senha (ou login offline).
- **Saídas**: Token de acesso, credenciais da sessão, permissões.
- **Dependências**: Supabase Auth (híbrido) e Local Storage / IndexedDB.
- **Fluxo**: Login -> Validação -> Carga de permissões -> Redirecionamento Dashboard/Mesa.
- **Status**: `[EXISTENTE NO ROUTER]` (Funcional com suporte a credenciais locais e sync Supabase).

---

## 2. Importação e Preparação de Dados (Manual / Fallback)
- **Objetivo**: Ingerir dados de relatórios locais (CSV/TXT gerados pelo SSW 455) para alimentar a base de CTRCs.
- **Entradas**: Arquivo CSV/TXT exportado do SSW.
- **Saídas**: Entidades `CTRC` padronizadas, extração de filial destino, ocorrência, pesos e cubagens.
- **Dependências**: `useIndexedDB`, Parser CSV local, sincronizador Supabase.
- **Fluxo**: Seleção de arquivo -> Parsing -> Normalização de Filial -> Inserção massiva Local -> Sync assíncrono.
- **Status**: `[EXISTENTE NO ROUTER]` (Permanecerá como mecanismo de fallback contínuo).

---

## 3. Mesa de Roteirização (Planilha Dinâmica)
- **Objetivo**: Planejamento visual de alta densidade da distribuição local (entregas) por filial de destino.
- **Entradas**: Filial Operacional Ativa, CTRCs da base local, filtros de ocorrência e setor.
- **Saídas**: Grid compacto com paginação/virtualização, seleção de CTRCs, cálculo dinâmico de totais (R$, Peso, Volumes), alertas de GR.
- **Dependências**: `CargaList`, `useRoteirizacaoFilters`, `useCargaSelection`, Repositório Local Dexie.
- **Fluxo**: Aplicação de filtros combinados -> Cálculo reativo de seleções -> Sugestão e validação.
- **Status**: `[EXISTENTE NO ROUTER]` (Núcleo estável).

---

## 4. Agrupamento (Pré-Romaneio e Separação)
- **Objetivo**: Consolidar CTRCs selecionados em pacotes de expedição com alocação de veículo/motorista e emissão de checklist.
- **Entradas**: Array de IDs de CTRCs, placa do veículo, motorista, filial.
- **Saídas**: Registro de `PreRomaneio`, atualização de status dos CTRCs para `Agrupado`, checklist para impressão.
- **Dependências**: `PreRomaneioRepository`, IndexedDB, gerador de checklist.
- **Fluxo**: Ação de Agrupar -> Geração do Pré-Romaneio -> Atualização de status -> Enfileiramento no Sync Queue.
- **Status**: `[EXISTENTE NO ROUTER]` (Funcional).

---

## 5. Programação do Dia (Solução / Acompanhamento)
- **Objetivo**: Visão consolidada da expedição diária, veículos carregados, cubagem e cumprimento de metas.
- **Entradas**: Pré-romaneios gerados, cadastros de veículos e frotas.
- **Saídas**: Painel tático por filial com totais de ocupação de peso/capacidade.
- **Dependências**: `SolucaoView`.
- **Status**: `[EXISTENTE NO ROUTER]` (Funcional básico).

---

## 6. Configurações Logísticas (Frota, Clientes Críticos, Regras de GR)
- **Objetivo**: Gestão de parâmetros operacionais, tabelas de apoio e limites de Gerenciamento de Risco.
- **Entradas**: Formulários de CRUD de veículos, clientes Curva A e tetos de GR.
- **Saídas**: Tabelas normalizadas locais sincronizadas com o Supabase.
- **Status**: `[EXISTENTE NO ROUTER]` (Funcional parcial).

---

## 7. Dashboards e KPIs
- **Objetivo**: Monitorar SLAs, índice de entregas, ocorrências críticas e desempenho por unidade.
- **Status**: `[EXISTENTE NO ROUTER]` (Renderização estática; aguardando hidratação 100% dinâmica).

---

## 8. Módulo de Integração SSW (Camada Operacional Inteligente)

### Visão Geral
Formalização arquitetural do Router como uma **camada operacional inteligente e resiliente sobre o SSW**, com operação Local-First e acesso via proxy seguro aos recursos disponíveis ao usuário autenticado.

---

### Capabilities Conhecidas do SSW

#### 8.1 SSW 455 — Base Operacional / Relatório de Entregas
- **Finalidade**: Extração completa da relação de cargas pendentes de entrega e distribuição da unidade operacional.
- **Dados Conhecidos**: Número do CTRC, série, data emissão, destinatário, remetente, endereço, cidade, peso, valor da mercadoria, cubagem, ocorrência atual, setor da ocorrência, localização física.
- **Fluxo Confirmado no SSWTools**:
  ```text
  Solicitação do Relatório -> /bin/ssw0230
          ↓
  Acompanhamento da Fila   -> /bin/ssw1440 (com cookies autenticados)
          ↓
  Download do Arquivo      -> /bin/ssw0424
  ```
- **Dependências**: Sessão web autenticada do operador no SSW.
- **Relacionamento**: Alimenta a tabela central de CTRCs da Mesa de Roteirização.
- **Uso no Router**: Aquisição automatizada periódica ou sob demanda, substituindo a necessidade de download/upload manual de arquivos CSV.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.2 SSW 101 — Consulta Individual de CTRC / NF
- **Finalidade**: Obtenção de histórico detalhado, comprovantes de entrega, localização precisa e tracking individual de um CTRC ou Nota Fiscal.
- **Dados Conhecidos**: Eventos de rastreamento com data/hora, motorista atribuído, imagens de canhoto, dados fiscais completos.
- **Dependências**: Número do CTRC ou chave da NF-e; sessão autenticada.
- **Relacionamento**: Enriquece o CTRC na Mesa de Roteirização quando o operador clica para inspecionar detalhes.
- **Uso no Router**: Drawer/modal de inteligência individual de CTRC sob demanda (lazy-loading).
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.3 SSW 063 — Emissões e Faturamento
- **Finalidade**: Consulta aos volumes e receitas faturadas no dia/período por filial ou cliente.
- **Dados Conhecidos**: CTRCs emitidos, valores de frete, peso faturado, tomadores de serviço.
- **Dependências**: Sessão autenticada e parâmetros de período/filial.
- **Relacionamento**: Alimenta os painéis de KPIs e metas da Programação do Dia.
- **Uso no Router**: Cards e indicadores de faturamento operacional e volume expedido.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.4 SSW 029 — Cargas Previstas para a Unidade
- **Finalidade**: Mapeamento de cargas que foram expedidas por outras unidades e possuem a filial local como destino ou ponto de transbordo.
- **Dados Conhecidos**: Previsão de chegada, peso total previsto, volumes, unidade emissora.
- **Dependências**: Sessão autenticada.
- **Relacionamento**: Cruzamento com 030 (Manifestos) para antecipação de capacidade da frota.
- **Uso no Router**: Classificação de cargas em estado `PREVISTO` no planejamento de capacidade de veículos.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.5 SSW 030 — Manifestos, Veículos e Transferências
- **Finalidade**: Relação de veículos em transferência rodoviária com destino à unidade (manifestos abertos/em trânsito).
- **Dados Conhecidos**: Número do manifesto, placa do cavalo/carreta, motorista, unidade de origem, unidade de destino, data de saída, previsão de chegada.
- **Dependências**: Sessão autenticada.
- **Relacionamento**: Chave mestra para o detalhamento dos CTRCs (023) e da descarga (264).
- **Uso no Router**: Identificação de veículos `EM TRÂNSITO` e `CHEGANDO`.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.6 SSW 023 — Detalhamento dos CTRCs do Manifesto
- **Finalidade**: Lista individual dos CTRCs embarcados dentro de um manifesto de transferência específico (030).
- **Dados Conhecidos**: Relação de CTRCs, destinatários, praças de entrega final, peso por documento.
- **Dependências**: Número do manifesto (obtido via 030); sessão autenticada.
- **Relacionamento**: Detalha o conteúdo do veículo vinculado à transferência 030.
- **Regra de Domínio**: A indisponibilidade momentânea do detalhamento 023 **NÃO** invalida a existência do manifesto 030.
- **Uso no Router**: Pré-roteirização antecipada de cargas ainda em viagem.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.7 SSW 264 — Descarga e Captura Física no Armazém
- **Finalidade**: Acompanhamento em tempo real da leitura física/código de barras dos volumes sendo descarregados na doca.
- **Dados Conhecidos**: Volumes bipados/capturados, volumes faltantes, avarias apontadas, status do veículo na doca.
- **Dependências**: Manifesto/Transferência vinculada; sessão autenticada.
- **Relacionamento**: Consolida o processo de Recebimento/Descarga (R/D) junto com 030 e 023.
- **Regra de Domínio (Princípio de Carga Destino)**: A conclusão da descarga é avaliada pela carga destinada à unidade operacional local, não sendo retida por volumes em transbordo.
- **Uso no Router**: Classificação de cargas em estado `EM DESCARGA` para priorização imediata na separação.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

#### 8.8 Consolidação R/D (Recebimento e Descarga)
- **Finalidade**: Correlação harmônica dos dados de `030 + 023 + 264` para fornecer visão unificada do fluxo de entrada de mercadorias no galpão.
- **Status**: `[ARQUITETURA APROVADA]` | `[CONFIRMADO NO SSWTOOLS]` | `[NÃO IMPLEMENTADO NO ROUTER]`.

---

### Fluxo Operacional Futuro de Classificação de Cargas

A correlação contínua das capabilities permitirá ao Router classificar os lotes de mercadorias nos seguintes estados dinâmicos:

```text
455 (Base de Entregas)      ───> [DISPONÍVEL AGORA] (Liberado no armazém)
264 (Captura na Doca)       ───> [EM DESCARGA] (Sendo conferido na doca)
030 + 023 (Manifestos)      ───> [CHEGANDO / EM TRÂNSITO] (Veículo em viagem confirmado)
029 (Previsão Geral)        ───> [PREVISTO] (Emitido na origem, sem manifesto confirmado)
Validações de Inconsistência───> [INCONSISTENTE] (Divergência de praça, retenção ou saldo)
101 (Consulta CTRC/NF)      ───> [INTELIGÊNCIA INDIVIDUAL] (Tracking e histórico sob demanda)
```

---

### Visão Futura: Evolução da Roteirização Preditiva
*(Planejado como evolução posterior, não a ser implementado no ciclo atual)*

```text
Disponível Agora + Em Descarga + Chegada Confirmada + Previsto
                          ↓
              Carga Potencial Operacional
                          ↓
  [Sugestão de Veículo | Ocupação Futura | Alocação de Rotas Antecipada]
```
