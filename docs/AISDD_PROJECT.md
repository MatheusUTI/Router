# AISDD - AI Spec-Driven Development

## Objetivo do Projeto
O **RotaOperational** (ou **Router**) é uma plataforma web concebida como:
> **Uma camada operacional inteligente sobre o SSW, com funcionamento Local-First e integração resiliente com os recursos internos disponíveis ao usuário autenticado.**

O SSW continuará sendo o sistema transacional de origem (Single Source of Truth transacional). O Router assume a responsabilidade de:
- **Aquisição controlada dos dados**: extração automática ou manual de relatórios e consultas pontuais.
- **Normalização e Consolidação**: mapeamento semântico de praças, filiais, ocorrências e subcontratos.
- **Cache Local-First**: velocidade e fluidez na visualização e operação contínua mesmo sob oscilações de rede.
- **Enriquecimento e Correlação**: vinculação entre previsões (029), transferências/manifestos (030/023), descargas (264) e disponibilidade real (455).
- **Planejamento Operacional e Apoio à Decisão**: mesa de roteirização de alta densidade, sugestão de veículos, validação de capacidade e alertas de Gerenciamento de Risco (GR).
- **Sincronização Interna e Apresentação Operacional**: interface dinâmica e colaborativa para equipes de expedição e transporte.

---

## Filosofia AISDD
O projeto adota o **AI Spec-Driven Development (AISDD)**.
1. **O Código é a Fonte da Verdade** do que está atualmente implementado e funcional.
2. **As Especificações (Specs) direcionam o desenvolvimento da IA**, estabelecendo contratos, regras de domínio e arquiteturas aprovadas.
3. **Distinção Rígida de Status**:
   - `[EXISTENTE NO ROUTER]`: Código real, implementado, testável no repositório do Router.
   - `[CONFIRMADO NO SSWTOOLS]`: Fluxo, parâmetros ou endpoints descobertos e validados experimentalmente no projeto de referência SSWTools.
   - `[ARQUITETURA APROVADA]`: Desenho arquitetural e contratos formalizados, prontos para receber implementação.
   - `[PLANEJADO]`: Funcionalidade no roadmap futuro.
   - `[NÃO IMPLEMENTADO]`: Nenhuma linha de código produzida ainda no Router.
4. **Nenhum código antes da especificação**: Toda nova capability ou alteração de fluxo deve estar documentada antes da implementação.

---

## Stack Tecnológica
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Material Symbols.
- **Linguagem**: TypeScript (Type-safe em todas as camadas).
- **Persistência Local**: IndexedDB (via Dexie.js) para armazenamento Local-First e queries em memória de alta densidade.
- **Persistência em Nuvem**: Supabase (PostgreSQL) para sincronização multiusuário, presença e auditoria.
- **Backend / Proxy Gateway**: Node.js / Express (necessário para isolamento de sessão SSW, rate-limiting, CORS e circuit-breaker).

---

## Princípios Obrigatórios
1. **Pequenos Passos (Uma tarefa por ciclo)**: Desenvolvimento estritamente incremental e modular.
2. **Offline-First e Resiliência**: A Mesa de Operações nunca trava por lentidão ou indisponibilidade de serviços externos (SSW ou Supabase).
3. **Isolamento Total do SSW**: Nenhuma View ou hook de UI pode conhecer URLs ou endpoints do SSW (`/bin/sswXXXX`). Toda integração é encapsulada na camada `src/integrations/ssw`.
4. **Endpoints Não São Contratos Estáveis**: Capacidades SSW são identificadas por **Assinaturas Funcionais** no `SswCapabilityRegistry`, e não por URLs fixas, operando sob um motor de **Discovery e Resiliência**.
5. **Respeito ao Layout "Planilha Operacional"**: Densidade compacta de informação, sem cards inflados ou rolagem excessiva.

---

## Roadmap Geral AISDD
1. `SSW-ARCH-001` — Fundação da integração SSW (Registry, Signatures, Proxy, Circuit Breaker, Types).
2. `SSW-455-001` — Automatização da aquisição do 455 mantendo importação manual como fallback.
3. `SSW-101-001` — Inteligência individual CTRC/NF sob demanda.
4. `SSW-RECEIVING-001` — Integração 029 + 030 + 023 (Previsão e Transferências).
5. `SSW-UNLOADING-001` — Integração 264 (Descarga física).
6. `SSW-RD-001` — Correlação Recebimento / Descarga e Carga Destino.
7. `SSW-063-001` — Indicadores de emissão e faturamento.
8. `SSW-PLANNING-001` — Uso de dados futuros na decisão de roteirização.
