# Registro de Decisões Arquiteturais (ADR)

Este arquivo mantém o histórico das decisões estruturais, porque foram tomadas e quais impactos elas possuem.

## ADR-001: Arquitetura Offline-First (Local First)
**Contexto**: O sistema precisava ser ágil ao manipular milhares de cargas e resistir a oscilações da internet nos galpões.
**Decisão**: Usar IndexedDB (via Dexie.js) como o "Master Node" para leitura e escrita na visão do usuário ativo do navegador.
**Justificativa**: Garante fluidez, ordenação instantânea na Mesa e estabilidade se o servidor falhar.
**Impacto**: Exigiu a criação de um "Sync Queue" e repositórios locais fortes, adicionando complexidade em como o Supabase re-alimenta os dados (exigindo controle de conflitos de Timestamp ou Upsert simples).

## ADR-002: Layout em formato "Planilha" (Densidade Alta)
**Contexto**: Usuários logísticos operam com planilhas Excel massivas e rejeitam interfaces de Cards que desperdiçam espaço (Mobile-first).
**Decisão**: Impor `density-compact` no Tailwind, forçando linhas de tabela enxutas (padding mínimo).
**Justificativa**: Aceitação rápida do usuário e visualização de no mínimo 25 cargas sem rolagem vertical.
**Impacto**: O design não é responsivo para dispositivos móveis de tela pequena (smartphones); exige monitores Desktop operacionais.

## ADR-003: Separação de "Localização" e "Filial de Entrega (Destino)"
**Contexto**: A mesma carga tem uma localização física (onde está o pacote agora) e uma Filial/Praça que deve entregar.
**Decisão**: A Filial de agrupamento no Topo da Mesa deriva da Praça Destino; a localização física vira apenas um Filtro/Label secundário na tabela.
**Justificativa**: Evitar que cargas destinadas à filial X mas armazenadas fisicamente na filial Y sumissem do radar do planejador da filial X.
**Impacto**: O pipeline de Parsing do arquivo (na Importação SSW) precisa fazer um fallback inteligente lendo as 3 primeiras letras da Praça Destino.

## ADR-004: Padrão Repository
**Contexto**: Existia acoplamento perigoso onde o componente chamava o Dexie diretamente.
**Decisão**: Criar a pasta `src/infrastructure/localdb/repositories` e `src/infrastructure/supabase/repositories`.
**Justificativa**: Injeção de dependências modular, testes fáceis e segurança para trocar o client de banco caso Supabase seja preterido.
**Impacto**: Um leve boilerplate (repetição estrutural) foi adicionado para envolver CRUDs simples.
