# RotaOperational (Router)

**Versão Atual:** `v1.25.0`

## Sobre o Projeto
O **RotaOperational** é um sistema web logístico desenvolvido para resolver o problema clássico das planilhas operacionais pesadas utilizadas para controle de roteirização, agrupamento de cargas e acompanhamento de frotas. 
Criado sob o modelo *Local First* (via IndexedDB), a aplicação exibe milhares de linhas de forma fluida (a Mesa de Roteirização), sincronizando informações operacionais de forma distribuída para a nuvem via Supabase.

## Arquitetura Resumida
- **Core Visual:** React 19 + Vite + Tailwind v4 (alta densidade de UI, remetendo à formatação rigorosa de planilhas de armazém, garantindo performance e clareza nos filtros e status).
- **Core de Dados:** Dexie.js manipula toda a interação crua do dia a dia no browser para impedir interrupções de internet em galpões industriais (Offline-First).
- **Sincronismo Cloud:** Classes especializadas assíncronas enviam metadados das cargas roteirizadas para o Supabase (PostgreSQL), alimentando assim integrações e bases históricas via filas em background.

## Principais Funcionalidades
- Importação rápida de manifestos e relatórios SSW (CSV/TXT).
- Motor Visual "Mesa de Roteirização" com filtragem por Filial, Status de Risco (GR), Setor de Ocorrência.
- Pré-separação Massiva (geração de pré-romaneios consolidando centenas de NFes na base do clique e arrasto em veículos sugeridos).
- Indicadores visuais diurnos/noturnos para melhor visualização em desktops administrativos (Dark/Day theme).

## Como Executar
1. Instale as dependências: `npm install` (ou bun, pnpm, yarn).
2. Clone os arquivos de `.env.example` para `.env` e preencha a chave de API (Supabase, caso precise em produção).
3. Rode em desenvolvimento: `npm run dev`.
4. Acesse (usualmente porta 3000): Use as credenciais seguras embutidas no local (ex: `master` / `123` para desenvolvimento test-driven).
5. Gerar ambiente de Produção: `npm run build` seguido de `npm run start` (ou via preview de Vite).

## Documentação do Projeto
A documentação completa é regida pela metodologia **AISDD (AI Spec-Driven Development)**, mantendo o ecossistema sempre em harmonia com o código real que roda em produção.
Para começar a explorar os detalhes, processos e limites deste software, acesse o nosso **[Índice da Documentação](./docs/09_INDEX.md)**.
