# RotaOperational - Registro de Versão

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
