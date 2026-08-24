# RotaOperational (Router)

**Versão Atual:** `v1.25.0` (Documentação formalizada para `v1.26.0-doc`)

---

## Sobre o Projeto
O **RotaOperational (Router)** é uma plataforma web concebida como uma **camada operacional inteligente sobre o SSW, com funcionamento Local-First e integração resiliente com os recursos internos disponíveis ao usuário autenticado**.

Ele atua como uma interface moderna e de alta densidade em substituição às planilhas manuais de roteirização, permitindo organizar a expedição, alocar frotas, pré-separar cargas (CTRCs) e acompanhar desempenhos operacionais em tempo real.

---

## Arquitetura Resumida
- **Core Visual:** React 19 + Vite + Tailwind CSS v4 (alta densidade de UI, formato "Planilha Operacional" com suporte aos temas Dark e Light).
- **Core Local-First:** IndexedDB (via Dexie.js) como fonte primária no navegador para garantir velocidade, ordenação instantânea e continuidade operacional mesmo sem internet no galpão.
- **Sincronismo Cloud:** Supabase (PostgreSQL) para deltas assíncronos, presença e colaboração multiusuário.
- **Integração Resiliente SSW (Formalizada via AISDD):** Camada desacoplada com `Capability Registry`, `Discovery Engine`, `Assinaturas Funcionais`, `Circuit Breaker` e `Backend Proxy` para comunicação segura com o SSW.

---

## Principais Capacidades
- **Mesa de Roteirização:** Visualização de alta densidade por Filial Operacional, filtros combinados por ocorrência e setor, somatório dinâmico de totais (R$, Peso, Volumes) e alertas de Gerenciamento de Risco (GR).
- **Agrupamento e Pré-Romaneio:** Consolidação rápida de lotes com alocação de veículo/motorista e emissão de checklist de separação para o armazém.
- **Importação Manual (Fallback Permanente):** Parsing e normalização de relatórios do SSW (CSV/TXT).
- **Integração SSW Direta (Em fase de infraestrutura):** Módulos de extração automática de entregas (455), consulta de CTRC/NF (101), previsão de cargas (029), manifestos/transferências (030/023), descarga na doca (264) e faturamento (063).

---

## Como Executar
1. Instale as dependências: `npm install`
2. Configure o `.env` a partir do `.env.example` caso utilize sincronização Supabase.
3. Inicie o ambiente de desenvolvimento: `npm run dev`
4. Acesse o aplicativo (porta 3000). Credenciais locais de desenvolvimento: `master` / `123`.
5. Compilação para produção: `npm run build`

---

## Documentação do Projeto (AISDD)
O desenvolvimento é conduzido sob a metodologia **AI Spec-Driven Development (AISDD)**. Para consultar todas as especificações, regras dogmáticas, decisões arquiteturais e tarefas:

👉 **[Acesse o Índice da Documentação (docs/09_INDEX.md)](./docs/09_INDEX.md)**
