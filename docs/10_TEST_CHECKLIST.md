# Checklist de Testes e Regressão Operacional

Sempre que a aplicação for considerada pronta para deploy ou encerramento de um grande bloco de melhorias (ex. Sincronismo, Layout), percorra manualmente (ou automatize no futuro) estes itens vitais.

## 1. Módulo de Autenticação
- [ ] O login aceita `master` com senha `123`.
- [ ] Com a rede DESLIGADA, o login `master` (ou caches locais) entra usando os dados salvos em localStorage/IndexedDB.
- [ ] Comportamento após logout: Apaga sessões corretas mas não apaga o banco offline (para não re-sincronizar Gigabytes de cargas amanhã sem necessidade extrema).

## 2. Importação e Parser (SSW)
- [ ] Importar um arquivo válido não deve travar a tela principal, usando fluxos transacionais.
- [ ] Inserções em lote (`ctrcs`, `occurrences`) refletem no IndexedDB imediatamente.
- [ ] Logar no `SystemLogsPanel` confirma que o parsing terminou e quantas linhas foram tratadas ou ignoradas.
- [ ] Campos-chave de negócio ("Filial" e "Setor Ocorrencia") derivaram com precisão.

## 3. Mesa de Roteirização (Núcleo)
- [ ] Filtro de "Filial Operacional" (Cabeçalho) não pode trazer localização física diferente de seu destino planejado (veja `00_RULES.md`).
- [ ] A rolagem e mudança visual do tema (Light/Dark) obedece à densidade predefinida sem engasgos.
- [ ] Somatório do rodapé reflete EXATAMENTE as linhas (Cargas) selecionadas pelos checkboxes (Valores R$, Volumes e Peso Bruto).
- [ ] Cargas em Ocorrências de Bloqueio (ex: Retidas, Devolvidas) não podem ser marcadas.

## 4. Pré-Romaneio (Embarque)
- [ ] Ao clicar "Consolidar Selecionados" ou "Gerar Romaneio", a placa (ou simulada) é aceita.
- [ ] A carga migra de 'A Planejar' para 'Agrupado' (ou 'Em Viagem').
- [ ] O Checklist do armazém gerado em Popup não esconde linhas. Suporta impressão PDF (Ctrl+P) sem quebrar design dark na folha de papel.

## 5. Configurações Logísticas (CRUDs de Frota/Risco)
- [ ] Cadastrar Novo Veículo insere localmente e empurra via Sync_Queue ao Supabase.
- [ ] Alterar o limite financeiro GR reflete num alerta real ao somar cargas perigosas na Mesa (Teste: adicionar 10 NFs caras num veículo próprio limite 500k; o sistema avisa).

## 6. Supabase e Sincronismo
- [ ] A `sync_queue` do IndexedDB se esvazia espontaneamente caso tenha internet ativa (Worker Background em app.tsx).
- [ ] Desligar a rede e operar (Ex: gerar Pré-romaneio offline) enfileira tarefas na `sync_queue` que não morrem no recarregamento (F5) da página.
