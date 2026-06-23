# RotaOperational - Registro de Versão

## [v1.24.0] — 2026-06-23
### Auditoria de Regressão Operacional e Consolidação

Esta versão consolida os fluxos implementados nas versões V1.23.x (Mesa compacta, Pré-romaneio integrado à Programação do Dia, Cadastro de Frota/GR e Tema Dark/Day) através de uma auditoria técnica de regressão sem adição de novas funcionalidades.

#### 📦 Fluxos Validados e Consolidados
1. **Login & Acesso**: Login `master/123` e `anderson/123` com fallback local funcional e seguro.
2. **Importação**: Preservação da fila ativa e de CTRCs vinculados aos pré-romaneios.
3. **Mesa de Roteirização**: Filtros no cabeçalho (Cidade, Rota, Destinatário, Remetente, Previsão, Status, Localização), suporte à alta densidade e pré-separação em massa.
4. **Pré-Romaneios**: Modificação ágil de dados e status do veículo/motorista. Impressão limpa do checklist de separação física (sem dados sensíveis).
5. **Programação do Dia**: Matriz operacional densa operando em sincronia em tempo real com a frota alocada. Totações corretas (CTRCs, NFs, Peso, Volumes) sem vazar valores sensíveis na impressão padrão.
6. **Cadastro de Frota e GR**: Motor de limites sugeridos (Próprio = 500k, demais = 300k). Alertas de GR mantidos apenas como indicadores visuais sem gerar bloqueios indevidos na operação.
7. **Integração de Temas**: Suporte a Dark/Day persistente (via localStorage) sem comprometer os modais de impressão (que são forçados em background branco para economia de toner/tinta).
8. **Build & Typecheck**: Aplicação totalmente compatível com a suite do compilador Vite TypeScript.

#### ⚠️ Pendências Conhecidas para a Próxima Fase
1. Separar definitivamente Mesa ativa de Catálogo/Histórico.
2. Melhorar importação SSW completa com classificação interna.
3. Criar políticas Supabase mais seguras para produção.
4. Evoluir GR para liberação manual oficial (desbloqueio via token de risco).
5. Migrar o tema por completo em telas críticas que ainda possuam cores fixas ou invertidas.
6. Aumentar cobertura de testes automatizados e-2-e.

## [v1.23.0] — 2026-06-22
### Baseline Operacional Estável da Roteirização

Esta versão estabelece o marco de estabilidade para o núcleo do motor de roteirização do sistema RotaOperational. O fluxo principal foi validado através de simulação e teste real de montagem de rota, apresentando resultado equivalente à planilha operacional padrão.

#### 📦 Fluxos Considerados Estáveis
1. **Autenticação e Acesso**: Login operacional seguro utilizando as credenciais operacionais (`master` / `123`).
2. **Importação do Arquivo SSW**: Importação de CTRCs a partir dos dados do arquivo operacional com substituição automática e preservação adequada do banco de dados relacional simulado e real.
3. **Mesa de Roteirização**: Organização visual completa dos CTRCs disponíveis com suporte a alta densidade de informação e tempo real.
4. **Montagem e Roteirização**: Seleção otimizada de CTRCs, cálculo dinâmico de pesos/volumes, verificação de compatibilidade, SLAs e distribuição por veículos.
5. **Pré-Romaneio (Pré-Separação)**: Geração estável da ficha de separação/impressão física da carga necessária para suporte operacional em solo.

#### ⚠️ Limitações Conhecidas & Hardening
- **Próximas melhorias de Entrada**: Otimização no refinamento de arquivos "antes" da importação padrão.
- **Próximas melhorias de Saída**: O fluxo definitivo posterior ao pré-romaneio (manifesto final, rotas completas de entrega em tempo real, KPIs históricos e catálogo de entregas) será desenhado de forma incremental e segura nas próximas versões.
- **Identificação de CTRC**: Visualização avançada de localização do CTRC e de exibição densa de dados segue sob refatoração pontual.

#### 🎯 Diretriz de Governança
A partir desta baseline, o núcleo do roteirizador está protegido contra alterações estruturais profundas ou refatorações desnecessárias. Modificações futuras devem ocorrer de forma cirúrgica e incremental baseadas em testes reais no ecossistema logístico.