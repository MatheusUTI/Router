# Próxima Tarefa: LOCAL-DB-001

## Objetivo
Criar a fundação de banco de dados durável local (avaliação/implementação de base SQLite ou consolidação Dexie) garantindo a durabilidade do Local-First, sem depender da nuvem para o armazenamento mestre.

## Passo a Passo Sugerido
1. Adicionar adaptadores (ports/adapters) abstraindo a persistência.
2. Garantir que as Views não importem bibliotecas de infraestrutura de banco de dados diretamente.
3. Parametrizar a infra de Local DB (ex. Dexie wrapper unificado e testes) sem destruir a camada web, preparando terreno para uso offline/desktop.
