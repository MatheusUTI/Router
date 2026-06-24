# Router Design System

## 1. Princípio Visual
- **Material You** como inspiração visual.
- **Planilha Operacional** como referência de densidade.
- Tailwind / tokens próprios como implementação.
- Não usar Material Web agora.

## 2. Baseline Visual da Mesa
- Planilha Operacional.
- Colunas fixas.
- Cabeçalho compacto.
- Escala da Mesa ajustável.
- **1366x768** como resolução mínima suportada (em zoom 100%).

## 3. Estrutura de Colunas
- Seleção
- Cidade / Rota
- Destinatário / Remetente
- CTRC / NF
- Previsão
- Ocorrência / Localização
- Valor / Frete
- Peso / Vol
- OBS / DISP

## 4. Semântica de Cores
- **Azul:** rota, link, informação operacional neutra, chegada.
- **Verde:** disponível, ok, conferência.
- **Amarelo:** atenção leve, FOB, previsão futura.
- **Laranja:** atenção operacional real.
- **Rosa/Vermelho:** Curva A, retido, atraso, risco.
- **Cinza:** neutro, sem dado, informação secundária.
- **Índigo:** agendamento.

## 5. Regras Visuais
- Evitar microbadges excessivas.
- Não repetir disponibilidade sem necessidade.
- Não misturar setor com localização.
- Não usar laranja como fallback geral.
- Não usar cor forte em peso/valor normais.
- Preservar leitura focada em formato de planilha.

## 6. Popovers/Filtros
- Usar padrão `mesa-popover`.
- Bordas suaves.
- Suporte a Day/Dark mode.
- Usar `alignRight` para colunas próximas da direita.
- Não estourar (sair) da viewport.

## 7. Modo Day
- Fundo claro coerente.
- Sem moldura preta ao redor da Mesa.
- Sidebar e entorno não devem parecer dark ou híbridos.

## 8. Modo Dark
- Dark intencional.
- Sem efeitos "neon" excessivos.
- Evitar preto chapado excessivo; preferir tons de charcoal/slate escuro.
