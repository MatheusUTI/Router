# Próxima Tarefa: LOCAL-DATA-001

## Objetivo
Estabelecer o motor de escrita local (Write-First) usando Dexie/IndexedDB (e preparando para SQLite no futuro) como a única fonte da verdade em tempo de execução para a Mesa Operacional. Desconectar temporariamente a orquestração síncrona obrigatória da nuvem (Supabase) do critical path de UI.

## Passo a Passo Sugerido
1. Modificar os casos de uso críticos (ex: assinar pré-romaneio) para salvar os dados com sucesso no Local DB (Write-First) sem bloquear na resposta do Supabase.
2. Adicionar o registro na "Fila de Sincronismo" interna sempre que houver modificações locais offline.
3. Testar a experiência desconectada da rede para garantir que os dados não sejam perdidos.
