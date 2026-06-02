# ADR-001 — Local-First / Offline-First como princípio operacional

## Status

Aceito.

## Contexto

A operação de roteirização e expedição não pode depender da disponibilidade da internet, Supabase ou qualquer serviço remoto. A filial precisa continuar importando, consultando, roteirizando, separando e consolidando cargas mesmo em caso de instabilidade de rede.

## Decisão

O Router adota Local-First / Offline-First como princípio obrigatório.

- IndexedDB/Dexie é a fonte operacional imediata.
- Supabase é camada de sincronização e persistência remota.
- A UI deve responder localmente.
- Alterações críticas devem ser gravadas localmente antes de tentar sincronizar.
- Falha de rede não pode bloquear a operação principal.

## Consequências

### Positivas

- Operação resiliente.
- Baixa latência.
- Menos dependência da nuvem.
- Melhor uso em ambiente de doca/galpão.

### Negativas / riscos

- Exige controle de sincronização.
- Exige resolução de conflitos no futuro.
- Exige disciplina para não criar dependências diretas em APIs remotas.

## Regras derivadas

- Nenhum fluxo operacional crítico deve depender exclusivamente do Supabase.
- Preferências podem usar sync direto, desde que não bloqueiem a operação.
- Dados operacionais devem usar persistência local antes de sincronização remota.
