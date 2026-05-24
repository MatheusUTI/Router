# 🏗️ Plano de Refatoração Incremental e Estabilização - RotaOperational

Este documento estabelece o diagnóstico arquitetural e o plano de ação pragmático para consolidar o **RotaOperational** como um terminal de operação logística maduro, enxuto e de alta confiabilidade. 

O foco absoluto está em **fortalecer o núcleo operacional**, **remover distrações ou ruídos analíticos/futuristas** e **garantir a resiliência física do operador de pátio**.

---

## 1. 🔍 DIAGNÓSTICO ATUAL

Análise fria e realista do estado do software em relação às necessidades reais do dia a dia da doca:

### Estável (Entrega valor imediato)
*   **Módulo de Login Regional:** Autenticação fiduciária vinculando o operador a uma filial de origem fixa (`unid`), garantindo o escopo correto da carga.
*   **Importação e Tratamento de CSV:** Mecanismo de drag-and-drop e de parsing em memória RAM cliente eficaz para entrada de dados sem sujeira no banco ativo.
*   **Grid de Roteirização:** Manipulação elástica semelhante ao Excel, permitindo atribuições céleres de cargas a veículos do pátio.
*   **Manifesto de Separação (Picking List) & Reimpressão:** A recém-atualizada tela de **Romaneio & Separação** (`FinalizacaoView.tsx`) resolve as dores do separador de doca com o controle de picking em tela, persistência local em histórico e formatação A4 limpa para impressão física.

### Parcial (Dívida Técnica Mitigável)
*   **Persistência de Gabaritos de CSV:** Salvar mapeamentos customizados de planilhas ainda depende estritamente de cache local, sem persistência remota no perfil no Supabase.
*   **Persistência Secundária de Romaneios Concluídos:** O histórico de romaneios salvos reside no `localStorage`. É resiliente contra interrupções de internet (Local-First), mas precisa ser enviado de forma secundária à nuvem.

### Futuro / Exposto Cedo Demais (Ruídos de UI)
*   **Painéis Analíticos e BI Complexos:** Gráficos agregados de performance e estatísticas de Curva A expõem métricas corporativas na rotina do conferente de pátio, adicionando latência e processamento redundante em lote de dados históricos.
*   **Simulador de Rotas Teóricas & Realtime Sofisticado:** Interfaces que tentam desenhar percursos ou sincronias síncronas pesadas geram fadiga em redes oscilantes de galpão.

---

## 2. 🛡️ PRESERVAR AGORA

Módulos críticos que funcionam adequadamente e **não devem sofrer alterações** ou impactos nesta etapa:

1.  **Core da Roteirização (`RoteirizacaoView.tsx`):** O grid de alocação de cargas está calibrado para navegação rápida. (*Risco de alteração: ALTO*).
2.  **Mecanismo de Carregamento Assíncrono de CSV (`ImportacaoView.tsx`):** O parser de faturamento bruto é estável e rápido. (*Risco de alteração: MÉDIO*).
3.  **Layout A4 de Impressão (`FinalizacaoView.tsx`):** A folha de picking list formatada em CSS media print possui alta nitidez e fidelidade estéril em preto-e-branco. (*Risco de alteração: BAIXO*).

---

## 3. 🙈 OCULTAR OU REBAIXAR

Prática ativa de rebaixamento visual para eliminar o "marquetismo de startup". Nenhuma linha de código útil será apagada; as funcionalidades serão encapsuladas em uma subcamada secundária de auditoria:

*   **Menu de Dashboards/Indicadores Analíticos:** Removido do menu vertical primário. A rotina do operador foca na *Importação*, *Roteirização* e na *Separação*. O Dashboard passa a ser acessível unicamente por administradores mestres (`is_master === true`) em uma guia discreta de Auditoria Comercial.
    *   *Risco: SEM RISCO.*
*   **Módulo Conceitual de Ocorrências:** Simplificado e embutido como um histórico passivo acessível apenas em caso de desvios, sem disputar espaço na árvore de navegação primária.
    *   *Risco: BAIXO RISCO.*

---

## 4. 🗺️ NOVA ESTRUTURA DE NAVEGAÇÃO

Reorganização racional da interface para priorizar a triagem física na velocidade em que os caminhões entram e saem da garagem:

```txt id="nav-hierarchy"
Navegação Principal (Operador de Pátio)
 ├── 1. Importação CSV     # Upload inicial do faturamento diário
 ├── 2. Roteirização       # Atribuição rápida de CTRCs aos veículos
 └── 3. Romaneio & Separação # Picking físico ativo, histórico e reimpressão A4

Navegação Secundária (Auditoria de Supervisão - Recolhida em Gaveta)
 ├── 4. Frota e Motoristas # Cadastro operacional de ativos terrestres
 ├── 5. Painel Analítico   # KPIs internos (acesso restrito master)
 └── 6. Ocorrências / Divergências
```

---

## 5. ⚙️ REFATORAÇÃO INCREMENTAL GENTIL

Direrizes para reestruturar as pastas e acoplamento de código sem quebras ou indisponibilidade do sistema de produção:

1.  **Declaração Precoce de Domínio (Baixo Risco):** Isolar os tipos concretos de dados em `/src/types.ts` unificando as interfaces de `Ctrc`, `Vehicle`, `DriverScore` e `RomaneioSave`.
2.  **Modularização PROGRESSIVA dos Componentes (Baixo Risco):** Continuar mantendo as telas de fluxo em arquivos separados no diretório `/src/components/`, evitando carregar logicamente o `App.tsx`.
3.  **Encapsulamento de Sincronia Secundária (Médio Risco):** Unificar chamadas Supabase em uma camada de serviço `/src/services/db.ts` utilizando try/catch estruturados para que o erro na rede nunca resulte em travamentos ou tela branca de JavaScript.

---

## 6. 🔒 SEGURANÇA MÍNIMA VIÁVEL (SMV)

Medidas práticas para assegurar a inviolabilidade operacional entre diferentes filiais sem exigir refatorações gigantes de banco de dados:

*   **Filtragem na Raiz:** Garantir que o token `user.unid` retornado na validação de login filtre preventivamente os arquivos lidos e escritos em memória, impedindo que o operador da filial **SPO** visualize romaneios criados em **VGA**.
    *   *Risco: BAIXO RISCO.*
*   **Higienização Lógica do Script Supabase:** Inclusão secundária de validações de chaves estrangeiras no backend proxy para evitar injeções ou modificações de placas de veículos de outras praças.
    *   *Risco: MÉDIO RISCO.*

---

## 7. 📅 ROADMAP POR CAMADAS

### Camada 1: Estabilização Operacional (Imediato)
*   **Persistência de Histórico:** Consolidação total do fluxo local de romaneios concluídos com opção de gravação assíncrona secundária no Supabase.
*   **Picking Checklist:** Reforçar o status estético dos itens conferidos visualmente na doca.

### Camada 2: Higienização da UI (Curto Prazo)
*   **Oculção de Dashboards:** Rebaixar painéis puramente numéricos de performance a uma guia discreta de fechamento de faturamento comercial.
*   **Filtros de Teclado:** Incluir atalho rápido de busca para que localizadores operem sem necessidade de uso minucioso de mouse nas mesas de despacho.

### Camada 3: Resiliência contra Quedas de Rede (Médio Prazo)
*   **Fila Transacional Local (Outbox Pattern):** Filtrar romaneios criados em queda e enfileirá-los de forma transparente para sincronia em lote quando o roteador do armazém reestabelecer o feixe de sinal.

---
*Plano de Engenharia Pragmático RotaOperational: Consolidando a robustez logística baseada em eficiência real de pátio.*
