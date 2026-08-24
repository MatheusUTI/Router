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
