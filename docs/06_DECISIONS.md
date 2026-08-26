# Registro de Decisões Arquiteturais (ADR)

Este arquivo mantém o histórico das decisões estruturais do **RotaOperational (Router)**, justificativas e impactos no sistema.

---

## ADR-001: Arquitetura Offline-First (Local First)
- **Contexto**: O sistema precisa ser ágil ao manipular milhares de cargas e resistir a oscilações da internet nos galpões.
- **Decisão**: Usar IndexedDB (via Dexie.js) como a fonte de gravação e leitura primária da interface.
- **Justificativa**: Garante fluidez, ordenação instantânea na Mesa e estabilidade caso a rede oscile.
- **Impacto**: Exigiu Fila de Sincronização (`sync_queue`) e repositórios locais fortes para sincronizar deltas com o Supabase.

---

## ADR-002: Layout em Formato "Planilha Operacional" (Alta Densidade)
- **Contexto**: Usuários logísticos operam com grandes massas de dados e rejeitam interfaces de Cards inflados que exigem rolagem excessiva.
- **Decisão**: Adotar layout compacto de alta densidade no Tailwind.
- **Justificativa**: Visibilidade de no mínimo 25 cargas simultâneas sem rolagem vertical desnecessária.
- **Impacto**: Design priorizado para desktops operacionais de armazém (1366x768+).

---

## ADR-003: Separação de "Localização Física" e "Filial de Entrega (Destino)"
- **Contexto**: Uma carga pode estar fisicamente em uma filial intermediária mas ter como destino operacional outra filial.
- **Decisão**: A Filial de agrupamento no topo da Mesa deriva da Praça Destino; a localização física atua como filtro/label informativo.
- **Justificativa**: Evita que cargas destinadas à filial X mas armazenadas fisicamente na filial Y sumam da visão do roteirizador de X.
- **Impacto**: O parser extrai e deriva a filial pelas 3 primeiras letras da Praça Destino.

---

## ADR-004: Padrão Repository
- **Contexto**: Acoplamento direto entre componentes visuais e chamadas de banco.
- **Decisão**: Criar repositórios em `src/infrastructure/localdb/repositories` e `src/infrastructure/supabase/repositories`.
- **Justificativa**: Injeção de dependências modular, facilidade de testes e desacoplamento de provedores.
- **Impacto**: Estrutura organizada com interfaces uniformes para operações de dados.

---

## ADR-005: Integração Resiliente com SSW via Assinaturas Funcionais e Capability Registry
- **Contexto**: Endpoints internos do SSW (`/bin/sswXXXX`) podem mudar sem aviso prévio. Amarrar a aplicação em URLs fixas geraria quebras críticas.
- **Decisão**: Mapear capacidades lógicas no `SswCapabilityRegistry` usando **Assinaturas Funcionais** (`SswCapabilitySignature`), **Confidence Score** e motor de auto-recuperação (`SswDiscoveryEngine`).
- **Justificativa**: Se uma URL interna mudar, o Discovery Engine analisa o `<form action>` correspondente e revalida a assinatura sem quebrar a operação.
- **Impacto**: Nenhuma View conhece URLs do SSW. Toda chamada passa pela camada de resiliência.

---

## ADR-006: Proxy Backend para Isolamento e Segurança da Sessão SSW
- **Contexto**: O SSW utiliza cookies de sessão autenticada e formulários legados sujeitos a CORS e riscos de segurança se expostos no navegador.
- **Decisão**: Toda comunicação com o SSW deve trafegar através do Backend Proxy do Router (Node.js/Express).
- **Justificativa**: Protege credenciais, isola cookies HTTP-only, controla rate limiting e permite circuit breakers centralizados.
- **Impacto**: O frontend React nunca se comunica diretamente com o domínio do SSW.

---

## ADR-007: Princípio de Carga Destino na Descarga (SSW 264 / R-D)
- **Contexto**: Veículos de linha longa chegam aos galpões com cargas destinadas à unidade local somadas a cargas de transbordo/passagem para outras filiais.
- **Decisão**: A conclusão da descarga de um veículo na unidade é atingida assim que **todos os volumes destinados à filial local forem conferidos/capturados**.
- **Justificativa**: Volumes que continuam no veículo para transbordo não podem reter artificialmente a liberação operacional da carga local.
- **Impacto**: O motor de correlação de recebimento e descarga (R/D) avalia o saldo local independentemente do saldo global do veículo.

---

## ADR-008: Independência de Existência de Manifesto em Relação ao Detalhamento de CTRCs (SSW 030 vs 023)
- **Contexto**: Ao consultar manifestos de transferência em trânsito (030), pode haver atraso temporário ou falha na obtenção da lista de CTRCs detalhados (023).
- **Decisão**: A existência e status de um manifesto em viagem são determinados pela fonte 030, mesmo que os itens 023 ainda estejam em fila de retry.
- **Justificativa**: Evita falsos negativos operacionais onde veículos em viagem sumiriam do radar do galpão por falhas pontuais de detalhamento.
- **Impacto**: O sistema suporta manifestos em estado `EM_TRANSITO_SEM_DETALHAMENTO` até a resolução assíncrona dos itens.

---

## ADR-009: Código de Ocorrência como String Preservando Zeros à Esquerda
- **Contexto**: O SSW e os bancos de ocorrências representam códigos com zeros à esquerda ou até 5 dígitos. Converter esses códigos para número remove zeros e quebra o mapeamento da ocorrência, setor de ocorrência e elegibilidade operacional.
- **Decisão**: Código de ocorrência será sempre tratado e armazenado como `string`.
- **Justificativa**: Evita perda de dígitos significativos, aumenta compatibilidade com o Dicionário de Ocorrências e elimina falsos "ocorrência não mapeada".
- **Impacto**: Persistência, enriquecimento e exibição na UI preservam o código original como string formatada.

---

## ADR-010: Elegibilidade de Roteirização como Regra Interna de Segurança Operacional
- **Contexto**: Nem todo CTRC importado do SSW representa mercadoria física pronta para entrega (já entregues, em rota, retidos administrativamente). Exibir todos por padrão na Mesa aumenta risco de erro de triagem física.
- **Decisão**: A elegibilidade (`ROTEIRIZAVEL`, `REVISAR`, `NAO_ROTEIRIZAVEL`) opera como regra interna de segurança; o filtro principal da Mesa de Roteirização é o "Setor de Ocorrência".
- **Justificativa**: Aproxima a interface do fluxo do operador de galpão mantendo proteção ativa contra seleção indevida de cargas retidas.
- **Impacto**: Setores úteis abrem por padrão; setores não roteirizáveis ficam acessíveis por filtro manual ou geram aviso de segurança ao operador.

---

## ADR-011: Pré-Romaneio como Etapa Obrigatória Prévia à Alocação de Frota
- **Contexto**: Na operação física de galpão, a rota e a separação por portão são definidas antes da convocação e amarração final do veículo, motorista e ajudante.
- **Decisão**: O Pré-Romaneio é etapa intermediária obrigatória entre a Mesa de Roteirização e o Romaneio Final de Viagem.
- **Justificativa**: Permite emitir checklist de separação física por portão de doca antes de definir a frota final, refletindo o fluxo real do armazém.
- **Impacto**: O pré-romaneio agrupa por rota/portão e não exige veículo obrigatório no ato da pré-separação.

---

## ADR-012: Calendário Operacional e Avisos na Tela Inicial
- **Contexto**: Feriados municipais/nacionais e avisos de tráfego afetam a entrega regional, mas poluir a Mesa de Roteirização com avisos gerais reduz a velocidade de triagem.
- **Decisão**: Avisos operacionais e eventos de calendário aparecem centralizados na tela inicial/Dashboard, filtrados pela Unidade Operacional ativa do operador.
- **Justificativa**: Mantém a Mesa limpa e focada exclusivamente na carga, enquanto o supervisor recebe alertas contextuais logo ao iniciar a sessão.
- **Impacto**: Módulo de Calendário Operacional com filtro por praça/filial e CRUD de edição master.

---

## ADR-013: Unificação de Parser e Ingestão Operacional via Adapter Comum (SSW 455 e Manual)
- **Contexto**: O sistema passa a adquirir o Relatório 455 de duas formas: download automático via backend proxy ou upload manual de arquivo CSV/TXT pelo operador. Duplicar o código de parsing, conversão de tipos (Pt-Br float) e classificação de fluxo operacional criaria divergências de dados entre os dois métodos.
- **Decisão**: Criar um adapter centralizado (`src/services/importCsvAdapter.ts`) que atua como a única fonte da verdade para transformação de CSV bruto em entidades `Ctrc`.
- **Justificativa**: Garante que tanto a importação automática do SSW quanto a importação manual passem exatamente pelos mesmos passos de normalização, classificação de fluxo operacional (`LOCAL_DELIVERY`, `TRANSFER_OUT`, `TRANSFER_IN_DELIVERY`) e persistência.
- **Impacto**: Elimina duplicação de regras de negócio, assegura integridade idêntica independente do canal de entrada e simplifica os testes automatizados.

---
## ADR-014: Runtime Dual Local/Vercel (Backend API)
- **Contexto**: O projeto é executado localmente via AI Studio usando um processo Express persistente (`tsx server.ts`), mas é deployado em produção na Vercel usando funções Serverless (`api/index.ts`). A Vercel não aceita chamadas a `app.listen()` em funções Serverless e requer arquivos de configuração específicos para gerenciar roteamento.
- **Decisão**: Extrair toda a configuração e rotas do Express para um factory compartilhado (`server/createApp.ts`), que retorna a instância HTTP configurada. 
- **Justificativa**: Garante que o mesmo código de regra de negócio, rotas e APIs funcione de forma transparente tanto como Servidor Local persistente (`server.ts`) quanto como Função Serverless Vercel (`api/index.ts`). O estado de execução (Session, Cache, Circuit Breaker) é preservado em memória apenas como otimização, sem quebrar as integrações vitais em caso de cold start da Função.
- **Impacto**: Compatibilidade nativa Vercel Edge/Serverless Functions (eliminando erros 404 para rotas `/api/*`), persistência em memória mapeada como efêmera segura, separação limpa de endpoints backend vs frontend Vite em produção.
## [DECISION-011] Arquitetura de Deploy Desacoplada (Frontend/Backend)
**Contexto**: O uso de Serverless Functions (Vercel) para a camada backend do Router, que precisa gerenciar estados de sessão legados do SSW (cookies), long-polling, requisições lentas e isolamento de dependências.
**Decisão**: Mover a camada do Express (API + Integração SSW) para uma infraestrutura persistente e autônoma Node.js (ex: Render) e utilizar a Vercel exclusivamente para o Frontend (React SPA + estáticos).
**Justificativa**: Simplifica imensamente o CI/CD; o SSW depende intrinsecamente de sessões estaduais (HTTP-only cookies na borda do servidor) e long polling, incompatíveis com os curtos timeouts e cold starts nativos de Serverless; evita refatorações extremas de CommonJS/ESM requeridas pela plataforma serverless.

## [DECISION-012] Local-First Operational Source of Truth
**Contexto**: O sistema atualmente depende primariamente da Vercel para frontend e Render (Node.js) para integrações e backend, com uso extensivo do IndexedDB/Dexie no navegador. Algumas integrações cloud-only (Supabase) causam impacto na continuidade das operações caso haja falha de internet.
**Decisão**: RotaOperational será um sistema LOCAL-FIRST. A base de dados local (atualmente IndexedDB, com futura migração avaliada para SQLite em ambiente desktop/Node) passa a ser a **única fonte da verdade** para a operação. A nuvem (Supabase) passará a ser estritamente uma camada de sincronização, colaboração e backup.
**Justificativa**: A logística não pode parar por falta de conectividade externa se a frota, a carga e os operadores estão fisicamente presentes na unidade operacional.
