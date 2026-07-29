# Regras Operacionais e de Desenvolvimento

Estas regras são imutáveis e devem orientar todo o ciclo de manutenção e evolução do RotaOperational.

## Regras de Desenvolvimento (Workflow)

1. **Uma tarefa por ciclo**: Foque em resolver um problema bem isolado (exemplo: criar um filtro) por iteração.
2. **Mudanças pequenas**: Evite refatorações globais (Big Bang) que afetem múltiplos módulos simultaneamente sem um amplo plano de testes.
3. **Sem refatorações desnecessárias**: Não altere código que está funcionando apenas por preferência de estilo, a menos que haja gargalos reais.
4. **Código é a fonte da verdade**: A documentação descreve o que o código faz. Se o código for alterado, atualize a documentação imediatamente.
5. **Documentação sempre atualizada**: Arquivos como `03_CURRENT_STATE.md` e `04_NEXT_TASK.md` devem ser mantidos vivos.
6. **Commits seguindo Conventional Commits**: Use prefixos (feat, fix, docs, refactor, chore) e descrições curtas e claras no modo imperativo.
7. **Sempre preservar funcionalidades existentes**: Não quebre fluxos ou remova componentes que estão sendo utilizados.
8. **Não remover código sem justificativa**: Comente por que algo foi depreciado ou marque como obsoleto antes da deleção final.
9. **Respeitar restrições visuais e de infraestrutura**: Mantenha o padrão Visual "Planilha/Mesa Densidade", modo Dark/Light e persistência Dual (IndexedDB + Supabase).

## Regras de Domínio Logístico (Operacional)

1. **Filial Operacional vs. Localização**
   - A filial selecionada no cabeçalho da roteirização representa a **unidade responsável pela entrega/destino** da carga.
   - Não representa a localização física atual.
   - Exemplo: Uma carga fisicamente parada em BHZ, mas com destino operacional VGA, deve aparecer ao selecionar VGA, e não ao selecionar BHZ.
   - O fallback da Filial de Roteirização é derivado das **3 primeiras letras da Praça Destino**.

2. **Ocorrência e Localização**
   - Linha 1: Código e descrição da ocorrência.
   - Linha 2: Localização física real.
   - O "Setor Ocorrencia" não deve se misturar à string da localização.

3. **Disponibilidade e Setores**
   - A disponibilidade da carga para ser embarcada deriva do "Setor Ocorrencia".
   - Setores aceitáveis de embarque: 'Disponível', 'Disponível Pendência'.
   - Ocorrências como retenção (OC 3), pendência financeira (OC 70) geram bloqueio visual.

4. **Regras de GR (Gerenciamento de Risco)**
   - Valores padrão de alarme: Próprio (500k), Agregado/Terceiro (300k).
   - O alarme de GR não bloqueia a interface duramente, mas exibe alertas severos em vermelho na Mesa.

5. **Subcontratos**
   - São tratados como documentos operacionais equivalentes a CTRCs. Podem ser roteirizados.

6. **Identificadores (IDs)**
   - O ID central dos CTRCs/Notas geralmente é seu próprio número ou chave, não dependa de auto-incrementos sequenciais que desincronizem a base (use UUID ou chave natural composta).
