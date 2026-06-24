# Test Checklist

## Regressão da Mesa de Roteirização

- [ ] Realizar login com usuário `master` / senha `123`.
- [ ] Importar base contendo múltiplas unidades e subcontratos.
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
