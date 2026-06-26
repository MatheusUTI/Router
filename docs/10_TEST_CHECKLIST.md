# Test Checklist

## Regressão da Mesa de Roteirização

- [ ] Realizar login com usuário `master` / senha `123`.
- [ ] Importar base contendo múltiplas unidades e subcontratos.
- [ ] Confirmar que o mapeamento automático detectou "Praça de Destino".
- [ ] Confirmar que o CTRC importado possui a propriedade `pracaDestino` preservada na tabela.
- [ ] Testar Filial TODAS (deve exibir visão geral de todas as filiais).
- [ ] Testar Filial VGA (deve listar CTRCs de operação/destino VGA).
- [ ] Testar Filial BHZ (deve listar CTRCs de operação/destino BHZ).
- [ ] Confirmar que Filial filtra por Destino Operacional, e não localização.
- [ ] Confirmar que o filtro por "Localização" funciona separadamente em sua respectiva coluna.
- [ ] Testar que VGS e subcontratos são mantidos como roteirizáveis, preservando suas filiais.
- [ ] Testar ocorrências específicas como OC 57, 59 e 70 para verificação de regras.
- [ ] Testar o filtro de Setor (separado da Ocorrência).
- [ ] Testar o filtro de Ocorrência propriamente dito.
- [ ] Confirmar que a coluna OBS / DISP exibe a disponibilidade corretamente.
- [ ] Testar seleção de CTRCs (múltiplas linhas).
- [ ] Testar a criação de Pré-separação para veículos.
- [ ] Testar Link externo SSW num CTRC para confirmar se abre corretamente.
- [ ] Testar visualização em resolução de tela `1366x768` (100% de zoom de navegador).
- [ ] Testar funcionalidade de Escala da Mesa (85%, 100%, 120%).
- [ ] Alternar entre modo Day e Dark, verificando se a Mesa permanece coerente (sem fundo ou bordas híbridas).

## Validação Manual: Sincronização e Resiliência (CR-MESA-COLABORATIVA-01)

### Cenário 1: Sincronia Multi-Navegador e Filtros de Filial
- [ ] **Ação**: Usuário "Anderson" faz login, seleciona a filial **VGA** e faz a importação do BI SSW.
- [ ] **Ação**: Outro usuário "Operador" abre o app em outro navegador (ou janela anônima) e seleciona a mesma filial e data de planejamento.
- [ ] **Validação**: O Operador vê exatamente as mesmas cargas e o mesmo plano na Mesa que Anderson importou, sincronizados via Supabase.

### Cenário 2: Preservação de Estado Local (Sticky Filters)
- [ ] **Ação**: Anderson filtra a Mesa pela **Rota 04**.
- [ ] **Ação**: Anderson navega para outra tela (ex: Finalização ou Configurações).
- [ ] **Ação**: Anderson retorna para a tela da Mesa.
- [ ] **Validação**: O filtro de Rota continua ativo e pré-selecionado na **Rota 04** sem redefinir o estado.

### Cenário 3: Atualização em Tempo Real de Roteirização
- [ ] **Ação**: Anderson altera a rota de um CTRC para a **Rota 04** (ou adiciona uma observação operacional).
- [ ] **Ação**: Operador recarrega ou aguarda sincronização na mesma tela.
- [ ] **Validação**: A alteração de rota aparece na tela do Operador, sincronizada de forma transparente e gravada no Supabase.

### Cenário 4: Criação de Pré-Romaneio e Vinculação de CTRCs
- [ ] **Ação**: Anderson seleciona cargas e clica em "Gerar Pré-Romaneio" para a rota designada.
- [ ] **Ação**: O Operador acessa a aba de "Finalização" ou "Pré-Romaneios Ativos".
- [ ] **Validação**: O Operador visualiza o pré-romaneio recém-criado e consegue conferir todos os CTRCs vinculados a ele, com status inicial correto e totais calculados (peso, volumes, valor).

### Cenário 5: Resiliência Offline (Fallbacks Robustos)
- [ ] **Ação**: Simular desconexão de rede ou Supabase offline (ex: alterando chave ou desconectando rede local).
- [ ] **Ação**: Realizar uma nova importação de arquivo ou alteração local de CTRC.
- [ ] **Validação**: O aplicativo continua operando normalmente, exibindo um `console.warn` de falha de rede sem travar a interface e salvando com sucesso localmente via IndexedDB.
- [ ] **Ação**: Voltar a rede / Supabase para o estado online.
- [ ] **Validação**: O aplicativo restabelece a conectividade e não perde dados operacionais no IndexedDB.

---

## Critérios de Qualidade e Segurança Operacional

- [ ] **Build TypeScript**: O projeto compila com sucesso (`npm run build`) sem erros de tipo.
- [ ] **Sem Duplicidade de Dados**: A chave única composta no Supabase e IndexedDB (`company_code` + `ctrc_id`) garante que reinserir dados não crie registros duplicados.
- [ ] **Sem DELETE Físico**: Nenhuma operação de deleção física é executada em dados operacionais. Cancelamentos de pré-romaneios mudam o status para `CANCELADO` de forma lógica, retornando os CTRCs associados para a Mesa.
- [ ] **Segurança de Secrets**: Nenhuma chave privada ou `service_role` foi exposta no código frontend. Todas as conexões utilizam autenticação cliente segura de nível de usuário.
- [ ] **Modo Demo/Offline Integrado**: Se as credenciais do Supabase não estiverem configuradas ou se o backend estiver instável, o app opera localmente em IndexedDB de forma perfeita, sem crashar ou travar a experiência do usuário.

