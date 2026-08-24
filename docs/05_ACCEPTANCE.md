# Critérios Gerais de Aceite (Definition of Done)

Para qualquer tarefa finalizada no projeto **RotaOperational (Router)**, os itens abaixo são mandatórios antes do encerramento de um ciclo AISDD.

---

## 1. Checklist Operacional e Local-First
- [ ] A funcionalidade Local-First continua preservada (desligar a rede, operar com Dexie, religar a rede e verificar integridade).
- [ ] O fluxo da Mesa de Roteirização (Planilha Densa) não sofreu quebras e renderiza com fluidez.
- [ ] Nenhuma regra operacional de `00_RULES.md` foi violada (Filial Operacional por Praça Destino, separação entre Ocorrência e Setor, limites de GR).
- [ ] O fallback de importação manual de arquivos CSV/TXT continua 100% funcional.

---

## 2. Checklist de Integração SSW e Resiliência
- [ ] **Isolamento Total**: Nenhuma View ou hook de UI faz chamadas HTTP diretas ou contém URLs do tipo `/bin/sswXXXX`.
- [ ] **Segurança de Sessão**: Nenhuma credencial ou cookie de sessão do SSW trafega exposto no client React (apenas via proxy backend).
- [ ] **Capabilities e Assinaturas**: Novas integrações com o SSW utilizam o `SswCapabilityRegistry` com `SswCapabilitySignature` e respectivo `Confidence Score`.
- [ ] **Resiliência e Circuit Breaker**: O `SswCircuitBreaker` é acionado em falhas consecutivas, ativando backoff progressivo sem bombardear o SSW.
- [ ] **Agregação de Incidentes**: Erros e falhas de discovery são consolidados em `SswIncident` sem poluir logs do usuário.

---

## 3. Checklist Técnico de Código
- [ ] A aplicação compila sem erros TypeScript (executar `npm run lint` ou `tsc --noEmit`).
- [ ] Build de produção executado com sucesso (`npm run build`).
- [ ] Logs técnicos padronizados e sem `console.log` disperso no código de produção.
- [ ] Todas as novas tipagens e interfaces foram documentadas.

---

## 4. Checklist Visual e de Densidade
- [ ] Layouts responsivos testados para monitores de armazém / logística (1366x768 e superiores).
- [ ] Alternância entre temas Dark e Light validada com contraste legível.
- [ ] Densidade de informação no padrão "Planilha Operacional" preservada.

---

## 5. Regressão Rápida Obrigatória
1. Login offline e online validado (`master`/`123`).
2. Importação manual de arquivo funcionando normalmente.
3. Mesa de Roteirização filtrando por Filial e calculando totais de peso, volume e valor.
4. Pré-romaneio consolidando selecionados e gerando checklist de impressão.
