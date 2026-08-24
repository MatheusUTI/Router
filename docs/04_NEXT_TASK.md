# Próxima Tarefa Recomendada

**ID da Tarefa:** `SSW-101-001`  
**Título:** Integração Resiliente do Módulo SSW 101 (Consulta Individual de CTRC e Nota Fiscal)  
**Status:** `[ARQUITETURA APROVADA]` / `[PRONTO PARA EXECUÇÃO]`

---

## 1. Contexto
Com a conclusão bem-sucedida do ciclo `SSW-455-001` — que viabilizou a aquisição automatizada e o download em lote do relatório de entregas da filial —, o Router agora necessita da capability de consulta pontual de CTRC e Nota Fiscal (SSW 101). Essa funcionalidade permite detalhar ocorrências, validar dados de faturamento em tempo real na Mesa de Roteirização e auditar CTRCs individuais sem demandar novo download massivo de relatório.

---

## 2. Problema
Quando o operador identifica divergências em um CTRC (ex: falta de nota fiscal, endereço incompleto ou ocorrência de cliente), ele precisa sair do Router, abrir o terminal SSW, digitar a opção `101`, buscar a chave ou número e consultar manualmente. Isso fragmenta a operação de triagem.

---

## 3. Objetivo
> **Implementar a capability `CTRC_101_QUERY` no backend proxy do Router para consulta pontual de CTRCs/Notas Fiscais no SSW, enriquecendo o registro em cache local com ocorrências atualizadas, detalhes de remetente/destinatário e histórico de pesagem, integrando a interface de detalhes na Mesa de Roteirização.**

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
