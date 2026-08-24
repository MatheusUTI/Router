# Próxima Tarefa Recomendada

**ID da Tarefa:** `SSW-455-001`  
**Título:** Integração Resiliente do Relatório SSW 455 (Download Automático de Entregas)  
**Status:** `[ARQUITETURA APROVADA]` / `[PRONTO PARA EXECUÇÃO]`

---

## 1. Contexto
Com a fundação arquitetural da integração SSW concluída (`SSW-ARCH-001`) — contendo `SswCapabilityRegistry`, `SswCircuitBreaker`, `SswRetryPolicy`, `SswIncidentAggregator` e contratos seguros de Discovery/Gateway —, o projeto está pronto para a primeira integração de capability real: a aquisição automatizada do Relatório SSW 455 (cargas em trânsito e entregas da filial).

---

## 2. Problema
Atualmente, o operador precisa acessar manualmente o sistema SSW legado, solicitar o relatório 455, aguardar a fila de processamento, realizar o download do arquivo CSV/TXT e importá-lo manualmente no Router. Esse processo manual consome tempo e atrasa o início da triagem física e montagem da Mesa de Roteirização.

---

## 3. Objetivo
> **Integrar a aquisição automatizada do relatório SSW 455 utilizando a nova fundação de capabilities e o proxy backend, convertendo o resultado diretamente no formato normalizado do Router e mantendo a importação manual como fallback permanente.**

---

## 4. Escopo
- **Capabilities Envolvidas**:
  - `REPORT_455_REQUEST` (solicitação de geração do relatório 455 por filial).
  - `REPORT_QUEUE` (verificação de status na fila de relatórios do SSW).
  - `REPORT_DOWNLOAD` (download do CSV/TXT gerado).
- **Backend Proxy (`server/ssw/`)**:
  - Implementação do client HTTP com sessão autenticada isolada no backend.
  - Orquestração do pipeline: Solicitação -> Polling de Fila -> Download -> Parser -> Payload normalizado.
- **Normalização e Ingestão**:
  - Reutilização do parser/normalizador existente do Router para persistência direta no IndexedDB/Dexie.
- **Resiliência e Fallback**:
  - Envolvimento de todas as chamadas pelo `SswCircuitBreaker` e `SswRetryPolicy`.
  - Notificação de incidentes via `SswIncidentAggregator` caso o formulário/endpoint do 455 seja alterado.
  - Manutenção integral do botão e modal de "Importação Manual (CSV/TXT)" como via de contingência inabalável.
- **UI / Frontend**:
  - Adição de gatilho "Sincronizar SSW 455" com feedback de progresso e tratamento visual de fallback.

---

## 5. Fora do Escopo (Não Fazer Neste Ciclo)
- **NÃO** alterar as capabilities de CTRC 101, Manifesto 030, Previsão 029 ou Descarga 264.
- **NÃO** remover a tela ou a funcionalidade de upload manual de arquivos CSV.
- **NÃO** expor credenciais ou cookies de sessão do SSW no frontend React.

---

## 6. Critérios de Aceite
- [ ] Pipeline 455 (`REPORT_455_REQUEST` -> `REPORT_QUEUE` -> `REPORT_DOWNLOAD`) opera de forma autônoma via backend proxy.
- [ ] Falhas transitórias no SSW acionam retry e circuit breaker sem travar a interface do operador.
- [ ] Dados obtidos do 455 são salvos no banco local (`ctrcs`) com o mesmo esquema e integridade da importação manual.
- [ ] A importação manual de CSV/TXT continua 100% funcional.
- [ ] Testes unitários e de integração do pipeline 455 executando com sucesso.

---

## 7. Documentação Afetada
- `docs/03_CURRENT_STATE.md`
- `docs/04_NEXT_TASK.md`
- `docs/07_HANDOFF.md`
- `docs/08_CHANGELOG.md`

---

## 8. Commit Sugerido
`feat(ssw): implement automated SSW 455 report acquisition pipeline`

