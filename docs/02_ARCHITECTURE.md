# Arquitetura do RotaOperational (Router)

## 1. Visão Geral
O **RotaOperational (Router)** é arquitetado como uma **camada operacional inteligente sobre o SSW, com funcionamento Local-First e integração resiliente com os recursos internos disponíveis ao usuário autenticado**.

A arquitetura resolve três grandes desafios:
1. **Velocidade e Continuidade Operacional**: Operação instantânea no galpão via banco local no navegador (**IndexedDB / Dexie.js**), garantindo que a Mesa de Roteirização nunca bloqueie.
2. **Sincronização e Auditoria Multi-Usuário**: Camada assíncrona baseada em **Supabase (PostgreSQL)** para deltas, presença e histórico de consolidações.
3. **Integração Resiliente e Desacoplada com o SSW**: Camada modularizada com motor de **Discovery, Registro de Capabilities, Assinaturas Funcionais e Circuit Breakers**, garantindo que mudanças em endpoints legados não quebrem a aplicação.

---

## 2. Camadas do Sistema

```text
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React 19)                      │
│     Mesa Roteirização | Pré-Romaneio | Diagnóstico SSW       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             Application / Domain Services                   │
│   (useRoteirizacaoFilters, kpiService, cargaService)        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│  Local Data / Repositories  │ │    SSW Integration Layer    │
│  (IndexedDB / Dexie.js)     │ │  Capability Registry        │
│  Single Source of Truth UI  │ │  Discovery & Signatures     │
└──────────────┬──────────────┘ │  Circuit Breakers & Cache   │
               │                └──────────────┬──────────────┘
┌──────────────▼──────────────┐                │ (HTTP / Proxy)
│   Cloud Sync (Supabase)     │ ┌──────────────▼──────────────┐
│   PostgreSQL / Audit Logs   │ │     Router Backend Proxy    │
└─────────────────────────────┘ │ (Session, RateLimit, CORS)  │
                                └──────────────┬──────────────┘
                                               │ (Cookies Autenticados)
                                ┌──────────────▼──────────────┐
                                │             SSW             │
                                └─────────────────────────────┘
```

---

## 3. Princípio de Isolamento da Integração SSW

Nenhuma View, componente React ou hook de UI conhece URLs ou rotinas internas do SSW (`/bin/sswXXXX`).

Toda comunicação segue o fluxo estrito:
```text
UI
 ↓
Application / Domain Service
 ↓
SSW Integration Layer
 ↓
Capability Registry
 ↓
Resilience / Discovery
 ↓
Gateway
 ↓
Router Backend Proxy (Sessão Autenticada)
 ↓
SSW
```

### Segurança e Isolamento de Sessão (Backend Proxy)
Credenciais, tokens e cookies de sessão autenticada do SSW **nunca** transitam desprotegidos no frontend React. O Backend Proxy do Router é responsável por:
- **Proteção de credenciais**: Manutenção segura de credenciais e cookies HTTP-only.
- **Isolamento de sessão**: Renovação, validação e controle de lifecycle de login no SSW.
- **Controle de CORS**: Eliminação de problemas de restrição cross-origin do navegador.
- **Rate Limiting e Fila**: Prevenção contra bloqueios ou sobrecarga na infraestrutura do SSW.
- **Auditoria e Observabilidade**: Registro centralizado de tempos de resposta, falhas e descobertas.

---

## 4. Endpoints Não São Contratos Estáveis (`SswCapabilityRegistry`)

URLs e scripts internos do SSW podem sofrer alterações sem aviso prévio. Nenhuma capability é identificada unicamente pela sua URL.

O **`SswCapabilityRegistry`** gerencia o mapeamento de capabilities lógicas:

| Identificador Lógico | Descrição Funcional | Endpoint Conhecido Inicial | Método |
|---|---|---|---|
| `REPORT_455_REQUEST` | Solicitação do relatório 455 de entregas | `/bin/ssw0230` | POST |
| `REPORT_QUEUE` | Acompanhamento da fila de relatórios | `/bin/ssw1440` | POST |
| `REPORT_DOWNLOAD` | Download do arquivo gerado | `/bin/ssw0424` | GET |
| `CTRC_101` | Consulta detalhada de CTRC / NF | `/bin/ssw0101` | POST / GET |
| `EMISSIONS_063` | Consulta de faturamento e emissões | `/bin/ssw0063` | POST |
| `FORECAST_029` | Cargas previstas para a unidade | `/bin/ssw0029` | POST |
| `MANIFEST_030` | Manifestos / transferências em trânsito | `/bin/ssw0030` | POST |
| `MANIFEST_DETAIL_023` | Detalhamento dos CTRCs do manifesto | `/bin/ssw0023` | POST |
| `UNLOADING_264` | Descarga e conferência na doca | `/bin/ssw0264` | POST |

### Atributos de Cada Entrada no Registry:
- **capability**: Identificador único abstrato.
- **currentEndpoint**: URL/Path atualmente associado.
- **httpMethod**: `GET` ou `POST`.
- **knownParameters**: Lista de campos obrigatórios e opcionais conhecidos.
- **signature**: Regra de validação funcional (`SswCapabilitySignature`).
- **discoveryDate**: Timestamp da última descoberta válida.
- **lastSuccess**: Timestamp da última execução bem-sucedida.
- **failureCount**: Contador de falhas consecutivas.
- **confidence**: Grau de confiança da URL (0.00 a 1.00).
- **status**: `ACTIVE`, `DEGRADED`, `DISCOVERING`, `BLOCKED`.

---

## 5. Discovery Engine e Assinaturas Funcionais

### Fluxo de Auto-Recuperação do Discovery Engine
```text
Request (Endpoint Atual)
        ↓
    Falha HTTP (404 / 302 inesperado / Resposta incompatível)
        ↓
Validar Sessão Autenticada
        ↓
Retry Controlado
        ↓
Revalidar Endpoint
        ↓
Discovery Engine (Varredura do Formulário/Página de Origem)
        ↓
Identificar Candidatos (<form>, action, inputs, scripts)
        ↓
Validar Assinatura Funcional (SswCapabilitySignature)
        ↓
Confidence Score >= Limiar Seguro
        ↓
Atualizar SswCapabilityRegistry
        ↓
Repetir Operação com Sucesso
```

### Assinatura Funcional (`SswCapabilitySignature`)
A compatibilidade de uma capability independe da URL, sendo validada por critérios estruturais:
```typescript
interface SswCapabilitySignature {
  capabilityId: string;
  expectedMethod: 'GET' | 'POST';
  expectedContentType?: string;
  requiredPayloadFields: string[]; // ex: ['act', 'dummy']
  responseValidator: (responseBody: string, headers: Headers) => boolean;
}
```

### Escala de Confiança (Confidence Score)
- **1.00**: Endpoint confirmado em execução real com dados parseados com sucesso.
- **0.90**: Descoberto automaticamente via `<form action>` e aprovado pela assinatura funcional.
- **0.60**: Parcialmente compatível (mesmos campos, formato de resposta com variações menores).
- **0.30**: Candidato em análise (presente no DOM mas sem validação de payload).
- **0.00**: Inválido ou rejeitado.

---

## 6. Classificação das Mudanças do SSW
O sistema classifica e reage às mudanças em três níveis:

- **Tipo A — Endpoint Alterado**: A URL mudou (ex: `ssw1440` -> `ssw1441`), mas o formulário, campos e resposta permanecem estruturalmente equivalentes.
  - *Ação*: **Auto-recuperável via Discovery Engine** sem impacto para o operador.
- **Tipo B — Contrato Alterado**: Nomes de campos de formulário mudaram (ex: `dummy` -> `token`).
  - *Ação*: **Descoberta assistida e validação de schema**, logando aviso de diagnóstico.
- **Tipo C — Fluxo Alterado**: A ordem de navegação ou protocolo mudou (ex: introdução de MFA ou etapa intermediária).
  - *Ação*: **Degradação segura da capability**, ativação do fallback (importação manual) e notificação de intervenção técnica.

---

## 7. Componentes de Resiliência

```text
┌─────────────────────────────────────────────────────────────┐
│                     Resilience Core                         │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  SswEndpointRegistry  │◄─────►│   SswDiscoveryEngine  │  │
│  └──────────┬────────────┘       └───────────▲───────────┘  │
│             │                                │              │
│  ┌──────────▼────────────┐       ┌───────────┴───────────┐  │
│  │   SswCircuitBreaker   │       │    SswFormAnalyzer    │  │
│  └──────────┬────────────┘       └───────────────────────┘  │
│             │                                │              │
│  ┌──────────▼────────────┐       ┌───────────▼───────────┐  │
│  │    SswRetryPolicy     │       │ SswCapabilityValidator│  │
│  └──────────┬────────────┘       └───────────────────────┘  │
│             │                                │              │
│  ┌──────────▼────────────┐       ┌───────────▼───────────┐  │
│  │ SswIncidentAggregator │◄─────►│    SswHealthMonitor   │  │
│  └───────────────────────┘       └───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **SswEndpointRegistry**: Mantém os endpoints ativos, histórico e confidence score.
- **SswDiscoveryEngine**: Realiza varreduras para encontrar novos endpoints válidos.
- **SswFormAnalyzer**: Inspeciona `<form>`, `<input>`, tags e scripts em páginas HTML do SSW.
- **SswCapabilityValidator**: Executa testes de conformidade de assinatura funcional.
- **SswRetryPolicy**: Executa retries exponenciais com jitter para erros transitórios de rede.
- **SswCircuitBreaker**: Interrompe chamadas repetidas a capabilities que estejam falhando.
- **SswHealthMonitor**: Rastreia a saúde individual e global das integrações.
- **SswIncidentAggregator**: Agrupa falhas correlatas em um único incidente consolidado.

### Política de Circuit Breaker e Backoff
Quando uma capability atinge o limiar de falhas consecutivas:
1. O circuito se abre (`OPEN`), bloqueando novas requisições externas para poupar o SSW.
2. É ativado o **Backoff Progressivo**:
   - Nível 1: **5 minutos**
   - Nível 2: **15 minutos**
   - Nível 3: **30 minutos**
   - Nível 4: **60 minutos**
3. Após o tempo de espera, o circuito entra em `HALF-OPEN`, disparando uma requisição de teste para validação.

### Agregação de Incidentes
Para não poluir o sistema com milhares de linhas de log idênticas, erros são consolidados no schema:
```typescript
interface SswIncident {
  capability: string;
  firstSeen: Date;
  lastSeen: Date;
  attempts: number;
  lastError: string;
  autoRecovery: boolean;
  previousEndpoint?: string;
  newEndpoint?: string;
  status: 'OPEN' | 'RESOLVED' | 'INVESTIGATING';
}
```

---

## 8. Experiência do Operador e Diagnóstico SSW

O operador no chão de fábrica nunca é exposto a traces ou mensagens técnicas de baixo nível. As falhas são tratadas segundo 5 níveis de severidade:

| Nível | Comportamento na UI |
|---|---|
| **Auto-recuperado** | Operação contínua e silenciosa; registrado apenas no diagnóstico técnico. |
| **Degradado** | Ícone discreto de aviso; dados em cache são apresentados com indicador de idade. |
| **Indisponível** | Alerta indicando indisponibilidade temporária do serviço externo com fallback ativo. |
| **Mudança Estrutural** | Notificação clara sugerindo uso do arquivo manual e abertura de chamado técnico. |
| **Risco de Dados** | Alerta crítico destacado com bloqueio de automações duvidosas. |

### Painel Conceitual: `Configurações > Diagnóstico SSW`
```text
Painel de Diagnóstico e Saúde do SSW
-------------------------------------------------------
Sessão Autenticada:    🟢 Ativa (Válida por 42 min)
SSW 455 (Entregas):    🟢 Operacional (Última carga: 12 min atrás)
SSW 101 (CTRC/NF):     🟢 Operacional
SSW 029 (Previsão):    🟢 Operacional
SSW 030 (Manifestos):  🟢 Operacional
SSW 023 (Detalhamento):🟢 Operacional
SSW 264 (Descarga):    🟡 Degradado (Circuit Breaker ativo - 4 min restantes)
SSW 063 (Emissões):    🟢 Operacional
-------------------------------------------------------
Fallback Manual (Upload de Arquivo): Sempre Disponível
```

---

## 9. Estratégia de Cache e Persistência

| Capability | Estratégia de Atualização / Cache | Armazenamento |
|---|---|---|
| **SSW 455** | Manual sob demanda ou programada no início do turno | IndexedDB (`ctrcs`) |
| **SSW 063** | Cache curto (15–30 min) para métricas do dia | Cache em memória / LocalStorage |
| **SSW 029** | Atualização a cada 5–15 min | IndexedDB (`ssw_forecasts`) |
| **SSW 030** | Snapshot persistido a cada rodada de busca | IndexedDB (`ssw_manifests`) |
| **SSW 023** | Correlacionado ao 030 com retry assíncrono | IndexedDB (`ssw_manifest_items`) |
| **SSW 264** | Polling curto (1–3 min) durante descarga física ativa | IndexedDB (`ssw_unloading_events`) |
| **SSW 101** | Totalmente sob demanda (ao abrir detalhes do CTRC) | Cache LRU em memória (1 hora) |

---

## 10. Estrutura de Diretórios Proposta para a Integração SSW

```text
src/
└── integrations/
    └── ssw/
        ├── session/        # Gestão e validação de sessão autenticada / cookies
        ├── registry/       # SswCapabilityRegistry e definições de capabilities
        ├── discovery/      # DiscoveryEngine, FormAnalyzer e validadores
        ├── resilience/     # CircuitBreaker, RetryPolicy, IncidentAggregator
        ├── diagnostics/    # HealthMonitor e interfaces para o painel de diagnóstico
        ├── gateways/       # Implementação dos clientes HTTP (via Backend Proxy)
        ├── parsers/        # Parsers de respostas HTML/XML/CSV do SSW
        └── domain/         # Modelos de domínio integrados (Forecast, Unloading, etc.)
```
*(Nota: Estrutura modular de referência. Componentes serão criados estritamente conforme o roadmap AISDD).*
