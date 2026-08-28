# Próxima Tarefa: SYNC-ARCH-001

## Objetivo
A autenticação offline segura foi implementada. O próximo passo vital é o SYNC-ARCH-001 para extrair o enfileiramento de processamento em background Web Worker, aliviando o main thread.

## Passo a Passo Sugerido
1. Implementar Web Worker para sincronização em background.
2. Migrar o SyncQueueRepository para operar através de mensagens com o Web Worker.
3. Garantir que a UI não sofra stuttering/bloqueios durante a sincronização em massa com o Supabase.
