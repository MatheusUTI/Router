# Regras Operacionais, de Arquitetura e de Desenvolvimento

Estas regras são imutáveis e devem orientar todo o ciclo de manutenção e evolução do RotaOperational (Router).

---

## 1. Regras de Desenvolvimento (Workflow AISDD)

1. **Uma tarefa por ciclo**: Foque em resolver um problema bem isolado (exemplo: criar a fundação de um registry) por iteração.
2. **Mudanças pequenas**: Evite refatorações globais (Big Bang) que afetem múltiplos módulos simultaneamente sem um amplo plano de testes.
3. **Sem refatorações desnecessárias**: Não altere código que está funcionando apenas por preferência de estilo, a menos que haja gargalos reais.
4. **Código é a fonte da verdade**: A documentação descreve o que o código faz. Se o código for alterado, atualize a documentação imediatamente.
5. **Documentação sempre atualizada**: Arquivos como `03_CURRENT_STATE.md` e `04_NEXT_TASK.md` devem ser mantidos sincronizados com o estado real.
6. **Commits seguindo Conventional Commits**: Use prefixos (`feat`, `fix`, `docs`, `refactor`, `chore`) e descrições curtas e claras no modo imperativo.
7. **Sempre preservar funcionalidades existentes**: Não quebre fluxos ou remova componentes que estão sendo utilizados. O fallback de importação manual de arquivos deve sempre continuar operacional.
8. **Não remover código sem justificativa**: Comente por que algo foi depreciado ou marque como obsoleto antes da deleção final.
9. **Respeitar restrições visuais e de infraestrutura**: Mantenha o padrão Visual "Planilha/Mesa Densidade", modo Dark/Light e persistência Dual (IndexedDB + Supabase).

---

## 2. Regras de Domínio Logístico (Operacional)

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
   - Setores aceitáveis de embarque: `Disponível`, `Disponível Pendência`.
   - Ocorrências como retenção (OC 3) ou pendência financeira (OC 70) geram bloqueio visual ou exigem autorização.

4. **Regras de GR (Gerenciamento de Risco)**
   - Valores padrão de alarme: Próprio (500k), Agregado/Terceiro (300k).
   - O alarme de GR não bloqueia a interface duramente, mas exibe alertas severos em vermelho na Mesa.

5. **Subcontratos**
   - São tratados como documentos operacionais equivalentes a CTRCs. Podem ser roteirizados normalmente.

6. **Identificadores (IDs)**
   - O ID central dos CTRCs/Notas geralmente é seu próprio número ou chave, não dependa de auto-incrementos sequenciais que desincronizem a base (use chave natural ou UUID).

---

## 3. Regras de Integração com o SSW

1. **Princípio do Isolamento Total de URLs**
   - Nenhuma View, componente React ou service de domínio geral pode conter chamadas literais como `/bin/sswXXXX`.
   - É estritamente proibido espalhar referências a endpoints internos em `App.tsx`, `RoteirizacaoView.tsx`, `DashboardView.tsx`, etc.
   - Todo acesso deve passar pela cadeia padronizada:
     ```text
     UI -> Application/Domain Service -> SSW Integration Layer -> Capability Registry -> Discovery/Resilience -> Gateway -> SSW
     ```

2. **Endpoints Não São Contratos Estáveis**
   - URLs internas do SSW podem sofrer alterações a qualquer momento.
   - Nenhuma funcionalidade deve ser indexada exclusivamente por sua URL atual.
   - Toda capability é identificada por uma **Assinatura Funcional** (`SswCapabilitySignature`) dentro do `SswCapabilityRegistry`.

3. **Segurança e Isolamento de Sessão**
   - Credenciais e cookies autenticados do SSW **NUNCA** devem ser expostos diretamente no frontend React.
   - Toda comunicação que exija cookies autenticados, tokens ou bypass de CORS deve trafegar exclusivamente através do backend/proxy seguro do Router.

4. **Princípio de Carga Destino (Descarga 264 / R-D)**
   - A conclusão da descarga de um veículo/transferência deve ser avaliada com base na **carga destinada à unidade operacional local**.
   - Volumes de transbordo / passagem que continuam no veículo não devem impedir a conclusão operacional da descarga da filial.

5. **Princípio de Existência de Manifesto (030 vs 023)**
   - A existência de um manifesto de transferência é determinada pela fonte de manifestos (030).
   - A ausência temporária do detalhamento individual de CTRCs (023) não autoriza desconsiderar o manifesto como existente.

6. **Circuit Breaker e Política de Incidências**
   - Uma capability do SSW que falhar consecutivamente deve entrar em estado degradado/aberto, ativando backoff progressivo (ex: 5 min, 15 min, 30 min, 60 min), sem bombardear os servidores do SSW.
   - Falhas repetidas devem ser agregadas em incidentes consolidados, evitando poluição de logs e alarmes desnecessários ao operador.
