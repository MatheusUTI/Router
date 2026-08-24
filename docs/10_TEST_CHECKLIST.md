# Checklist de Testes e Regressão Operacional

Sempre que a aplicação for considerada pronta para deploy ou encerramento de um ciclo de desenvolvimento, percorra estes itens vitais.

---

## 1. Módulo de Autenticação
- [ ] O login aceita `master` com senha `123`.
- [ ] Com a rede DESLIGADA, o login `master` (ou caches locais) entra usando os dados salvos em localStorage/IndexedDB.
- [ ] Comportamento após logout: Apaga sessões corretas mas não apaga o banco offline (para não forçar recarga desnecessária de milhares de registros).

---

## 2. Importação e Parser Manual (SSW 455 Fallback)
- [ ] Importar um arquivo válido não trava a tela principal.
- [ ] Inserções em lote (`ctrcs`, `occurrences`) refletem no IndexedDB imediatamente.
- [ ] Logar no `SystemLogsPanel` confirma que o parsing terminou e quantas linhas foram tratadas ou ignoradas.
- [ ] Campos-chave de negócio ("Filial" e "Setor Ocorrencia") derivaram com precisão.

---

## 3. Mesa de Roteirização (Núcleo)
- [ ] Filtro de "Filial Operacional" (Cabeçalho) não traz localização física diferente de seu destino planejado (veja `00_RULES.md`).
- [ ] A rolagem e mudança visual do tema (Light/Dark) obedece à densidade predefinida sem engasgos.
- [ ] Somatório do rodapé reflete EXATAMENTE as linhas selecionadas (Valores R$, Volumes e Peso Bruto).
- [ ] Cargas em Ocorrências de Bloqueio (ex: Retidas, Pendência Financeira) não podem ser marcadas ou emitem alerta de autorização.

---

## 4. Pré-Romaneio (Embarque)
- [ ] Ao clicar "Consolidar Selecionados" ou "Gerar Romaneio", a placa (ou simulada) é aceita.
- [ ] A carga migra de 'A Planejar' para 'Agrupado' (ou 'Em Viagem').
- [ ] O Checklist do armazém gerado em Popup não esconde linhas e suporta impressão PDF (Ctrl+P) sem quebrar visual em folha de papel.

---

## 5. Configurações Logísticas (CRUDs de Frota/Risco)
- [ ] Cadastrar Novo Veículo insere localmente e empurra via `sync_queue` ao Supabase.
- [ ] Alterar o limite financeiro GR reflete num alerta real ao somar cargas perigosas na Mesa.

---

## 6. Supabase e Sincronismo
- [ ] A `sync_queue` do IndexedDB se esvazia espontaneamente caso tenha internet ativa.
- [ ] Desligar a rede e operar (ex: gerar Pré-romaneio offline) enfileira tarefas na `sync_queue` que não morrem no F5 da página.

---

## 7. Integração SSW e Resiliência (Para Ciclos Futuros com Código SSW Ativo)
- [ ] Nenhuma chamada HTTP direta ao domínio do SSW é feita pelo navegador (apenas via proxy backend).
- [ ] Quando o backend do SSW simula retorno de erro, o `SswCircuitBreaker` passa para `OPEN` e não repete chamadas antes do tempo de backoff.
- [ ] A indisponibilidade da integração SSW não quebra a visualização da Mesa nem impede a importação manual via arquivo.
- [ ] Erros de discovery ou de capabilities aparecem no painel de Diagnóstico sem travar o operador.
