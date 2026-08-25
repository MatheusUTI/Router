# Próxima Tarefa Recomendada

**ID da Tarefa:** `SSW-RECEIVING-001`  
**Título:** Integração Resiliente dos Módulos SSW 029 (Previsão de Cargas) e SSW 030 + 023 (Manifestos e CTRCs de Transferência)  
**Status:** `[ARQUITETURA APROVADA]` / `[PRONTO PARA EXECUÇÃO]`

---

## 1. Contexto
Com a conclusão do ciclo `SSW-101-001` (Consulta analítica sob demanda de CTRC/NF com drawer de rastreamento e cache resiliente) e `SSW-455-UX-001` (Download e sincronização de relatório de entregas), a próxima fronteira é a ingestão automatizada de previsões de transferência e manifestos em trânsito para a filial.

---

## 2. Objetivo
> **Implementar as capabilities de Previsão de Cargas (`FORECAST_029`), Manifestos (`MANIFEST_030`) e Detalhamento de Manifestos (`MANIFEST_DETAIL_023`) para alimentar a visão prévia de recebimento e descarregamento na esteira logística.**

---

## 4. Escopo
- **Capability Envolvida**:
  - `CTRC_101_QUERY` (consulta parametrizada por número/série ou chave de CT-e/NF).
- **Backend Proxy (`server/ssw/gateways/`)**:
  - Gateway de consulta `Ssw101QueryGateway` com parsing de tela estruturada do 101.
  - Envolvimento com `SswCircuitBreaker` e `SswRetryPolicy`.
- **Serviço & Cache (`server/ssw/services/`)**:
  - `Ssw101Service` com cache inteligente para evitar sobrecarga repetitiva de requisições ao SSW.
- **UI / Frontend**:
  - Modal/gaveta de detalhes rápidos de CTRC na Mesa de Roteirização acionável por clique no número do CTRC.
  - Tratamento de status offline / fallback visual caso o SSW não responda.

---

## 5. Critérios de Aceite
- [ ] `Ssw101QueryGateway` consulta e extrai com precisão os campos do CTRC/NF.
- [ ] Ocorrências mais recentes e dados fiscais enriquecem o CTRC sem corromper os dados preexistentes.
- [ ] Resiliência com Circuit Breaker e Retry Policy ativa.
- [ ] Suíte de testes unitários validando parsing e tratamento de erros.

---

## 6. Commit Sugerido
`feat(ssw): implement automated SSW 101 single CTRC query capability`
