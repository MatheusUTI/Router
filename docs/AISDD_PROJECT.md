# AISDD - AI Spec-Driven Development

## Objetivo do Projeto
O RotaOperational (ou Router) é um sistema web focado no processo logístico de roteirização, agrupamento e pré-separação de cargas (CTRCs). Ele atua como uma interface moderna e inteligente em substituição às planilhas operacionais pesadas, permitindo organizar a expedição, alocar frotas e acompanhar desempenhos.

## Filosofia AISDD
O projeto adota o AI Spec-Driven Development (AISDD). Isso significa que a documentação (os specs) direciona o desenvolvimento da IA, e o código implementado reflete a verdade atual da documentação. O código é a fonte final da verdade, e a documentação serve como mapa constante e orquestrador das tarefas.

## Stack Tecnológica
- **Frontend**: React 19 (Vite)
- **Estilização**: Tailwind CSS v4, Lucide React (ícones), Material Symbols
- **Linguagem**: TypeScript
- **Persistência Local**: IndexedDB (via Dexie.js) para funcionamento offline-first e resiliência de cache.
- **Persistência em Nuvem**: Supabase (PostgreSQL) para sincronização e colaboração multiusuário.
- **Ambiente de Build**: Node.js com esbuild (se necessário para backends no futuro).

## Arquitetura Geral
O sistema utiliza uma arquitetura "Local First" onde as interações ocorrem de forma otimizada no IndexedDB (repositórios locais) para suportar tabelas densas, enquanto uma camada de sincronização repassa as mudanças críticas para o Supabase, permitindo atualizações assíncronas.

## Organização do Projeto
- `src/components`: Componentes da interface, divididos por visões ou módulos.
- `src/infrastructure`: Módulos de conexão (IndexedDB, Supabase, Adapters, Repositories).
- `src/services`: Serviços de domínio isolado, cálculos operacionais.
- `src/types.ts`: Definições globais (o coração das entidades).

## Princípios Obrigatórios
1. **Pequenos Passos**: Implemente uma única responsabilidade funcional por ciclo.
2. **Offline-First**: A mesa de operações não pode bloquear ou travar por lentidão da nuvem.
3. **Respeito à Interface "Planilha"**: A roteirização deve manter alta densidade de informação; não adote layouts "mobile-first" que exijam rolagem infinita ou cortem dados cruciais.
4. **Tratamento Seguro de Ocorrências**: Regras de disponibilidade seguem a taxonomia exata (ex: Setores).

## Convenções de Código
- Padrão **Repository** para abstrair `IndexedDB` e `Supabase`.
- Uso de **Services** para a lógica pesada de negócios e KPIs.
- Não exporte funções genéricas diretamente nos componentes (use hooks customizados).
- Nomes precisos e em inglês para variáveis de sistema e tipagem, preferindo o nome de negócio quando inevitável (ex: `CTRC`, `PreRomaneio`).

## Estratégia de Continuidade
Sempre consulte o documento `04_NEXT_TASK.md` antes de começar a codificar, e atualize os arquivos de `docs/` ao final da sua jornada (Handoff) para que a próxima IA saiba exatamente onde continuar.
