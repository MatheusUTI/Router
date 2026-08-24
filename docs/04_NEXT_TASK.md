# Próxima Tarefa Recomendada

**ID da Tarefa:** `SSW-ARCH-001`  
**Título:** Fundação da Integração SSW Resiliente e Isolada (Architecture Foundation)  
**Status:** `[ARQUITETURA APROVADA]` / `[PRONTO PARA EXECUÇÃO]`

---

## 1. Contexto
O projeto Router inicia a nova fase de integração direta e resiliente com o SSW, tendo como referência técnica a lógica descoberta e validada no projeto SSWTools. Para respeitar o princípio de isolamento e a regra de que endpoints não são contratos estáveis, é mandatório criar a infraestrutura base de capacidades, assinaturas funcionais, circuit breaker e gateway antes de qualquer chamada operacional.

---

## 2. Problema
Espalhar requisições HTTP diretas ao SSW pelas telas ou hooks geraria acoplamento crítico, vulnerabilidade a quebras quando URLs mudarem e exposição indevida de cookies/credenciais no frontend React.

---

## 3. Objetivo
> **Construir a fundação isolada, segura e resiliente da integração SSW sem ainda alterar o comportamento das Views operacionais.**

---

## 4. Escopo
- **Definição de Tipos e Modelos de Integração (`src/integrations/ssw/types.ts`)**:
  - Enums de capabilities (`REPORT_455_REQUEST`, `REPORT_QUEUE`, `REPORT_DOWNLOAD`, `CTRC_101`, `EMISSIONS_063`, `FORECAST_029`, `MANIFEST_030`, `MANIFEST_DETAIL_023`, `UNLOADING_264`).
  - Interface `SswCapabilityEntry` (endpoint, método, confidence score, status, failureCount, lastSuccess).
  - Interface `SswCapabilitySignature` (critérios semânticos de validação).
  - Interface `SswIncident` (agregação de incidentes).
- **Capability Registry (`src/integrations/ssw/registry/`)**:
  - Implementação do `SswCapabilityRegistry` inicializado com as capabilities conhecidas e suas assinaturas funcionais base.
- **Resilience Core (`src/integrations/ssw/resilience/`)**:
  - `SswCircuitBreaker` com estados (`CLOSED`, `OPEN`, `HALF_OPEN`) e backoff progressivo (5m, 15m, 30m, 60m).
  - `SswRetryPolicy` com backoff exponencial e jitter.
  - `SswIncidentAggregator` para consolidação de falhas repetidas.
- **Contratos do Discovery Engine & Gateway (`src/integrations/ssw/discovery/` & `gateways/`)**:
  - Interfaces para `SswDiscoveryEngine`, `SswFormAnalyzer` e `SswGatewayClient`.
- **Configuração do Proxy Gateway**:
  - Definição dos contratos de comunicação segura entre React e o Backend Proxy.

---

## 5. Fora do Escopo (Não Fazer Neste Ciclo)
- **NÃO** disparar consultas ou requisições ativas reais ao SSW.
- **NÃO** alterar `RoteirizacaoView.tsx`, `App.tsx`, `DashboardView.tsx` ou qualquer outra View.
- **NÃO** substituir o pipeline de importação manual de arquivos CSV/TXT.
- **NÃO** construir telas ou componentes visuais de diagnóstico neste ciclo.
- **NÃO** refatorar os repositórios locais existentes do Dexie.

---

## 6. Arquivos Candidatos para Criação
- `src/integrations/ssw/types.ts`
- `src/integrations/ssw/registry/capabilityRegistry.ts`
- `src/integrations/ssw/resilience/circuitBreaker.ts`
- `src/integrations/ssw/resilience/retryPolicy.ts`
- `src/integrations/ssw/resilience/incidentAggregator.ts`
- `src/integrations/ssw/discovery/types.ts`
- `src/integrations/ssw/gateways/types.ts`

---

## 7. Contratos Principais
```typescript
export interface SswCapabilityEntry {
  capabilityId: string;
  currentEndpoint: string;
  httpMethod: 'GET' | 'POST';
  knownParameters: string[];
  signature: SswCapabilitySignature;
  confidence: number; // 0.00 a 1.00
  status: 'ACTIVE' | 'DEGRADED' | 'DISCOVERING' | 'BLOCKED';
  failureCount: number;
  lastSuccess?: Date;
  discoveryDate: Date;
}
```

---

## 8. Riscos e Mitigações
- **Risco:** Incompatibilidade de tipagem com o restante do projeto.  
  **Mitigação:** Tipos 100% isolados na pasta `src/integrations/ssw/` sem dependência circular com `src/types.ts`.
- **Risco:** Impacto no comportamento das Views.  
  **Mitigação:** Nenhuma View importará código da pasta de integração neste primeiro ciclo de infraestrutura.

---

## 9. Critérios de Aceite
- [ ] Todas as interfaces e types de capabilities, registry, resilience e discovery criados.
- [ ] `SswCapabilityRegistry` instancia e registra as 9 capabilities conhecidas com seus scores de confiança iniciais.
- [ ] `SswCircuitBreaker` gerencia estados (`CLOSED`, `OPEN`, `HALF_OPEN`) com progressão de backoff configurada.
- [ ] `SswIncidentAggregator` agrupa erros idênticos por capability com timestamps e contadores.
- [ ] Zero impacto ou modificação em Views operacionais existentes.
- [ ] Suíte de verificação de tipos e lint executando limpa (`npm run lint` ou `tsc --noEmit`).

---

## 10. Plano de Testes
- Testes unitários para:
  1. Registro e recuperação de capabilities no `SswCapabilityRegistry`.
  2. Transições de estado e backoff do `SswCircuitBreaker`.
  3. Agregação correta de incidentes no `SswIncidentAggregator`.

---

## 11. Rollback
Exclusão do diretório `src/integrations/ssw/` sem nenhum impacto colateral no restante da base de código do Router.

---

## 12. Documentação Afetada
- `docs/03_CURRENT_STATE.md`
- `docs/04_NEXT_TASK.md`
- `docs/08_CHANGELOG.md`

---

## 13. Commit Sugerido
`feat(ssw): implement foundation for resilient SSW capability integration`
