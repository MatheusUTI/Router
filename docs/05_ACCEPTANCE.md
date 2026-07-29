# Critérios Gerais de Aceite (Definition of Done)

Para qualquer tarefa finalizada no projeto RotaOperational, os itens abaixo são mandatórios antes do fechamento do ciclo.

## 1. Checklist Operacional
- [ ] A funcionalidade offline continua preservada (desligar rede, testar inserção Dexie, religar rede e ver Sync).
- [ ] O fluxo da Mesa de Roteirização (Planilha) não sofreu quebras e carrega milhares de linhas fluidamente.
- [ ] Nenhuma das regras operacionais principais descritas em `00_RULES.md` foi ignorada ou sobrescrita (ex: Ocorrência vs. Setor).

## 2. Checklist Técnico
- [ ] A aplicação compila sem erros TypeScript (rodar `npm run lint`).
- [ ] Build concluído perfeitamente (rodar `npm run build`).
- [ ] Códigos inúteis e logs de console (`console.log`) genéricos foram removidos ou migrados para `systemLogService`.
- [ ] Novas dependências ou variáveis de ambiente foram documentadas.

## 3. Checklist Visual
- [ ] Não há quebras ou sobreposições anormais de flexbox em layouts 1366x768 (zoom 100%).
- [ ] O contraste e o tema suportam bem a alternância Light / Dark sem componentes ilegíveis.
- [ ] A densidade do grid na Mesa foi respeitada (nada de cards gigantes substituindo a linha fina da planilha).

## 4. Regressão Rápida
Todo novo desenvolvimento deve ser provado contra estes fluxos, mesmo que a tarefa pareça isolada:
1. Conseguir logar como `master`.
2. A tela de importação aceita arquivo sem travar (se aplicável).
3. A Mesa de Roteirização filtra a Filial com sucesso.
