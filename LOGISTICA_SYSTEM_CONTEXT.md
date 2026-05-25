# 🛰️ Blueprint de Contexto de Arquitetura & Guia Operacional — TMS/WMS Control Tower

Este documento serve como o **Guia de Contexto de Alta Fidelidade** para engenheiros de software, arquitetos de UX e modelos de Linguagem Artificial (LLMs). Ele detalha todo o funcionamento, regras de negócio, modelo de dados, persistência offline-first e componentes visuais do Cockpit de Roteirização e do ecossistema do sistema de logística.

---

## 🌎 1. VISÃO GERAL DO COCKPIT OPERACIONAL
Este software é uma **Torre de Controle Logística (Control Tower)** e **Cockpit de Roteirização Inteligente** de alta densidade cognitiva. Foi planejado especificamente para:
*   **Velocidade Operacional Extrema:** Tomada de decisão sobre alocação de cargas e montagem de rotas em menos de 2 segundos.
*   **Ergonomia Noturna/Galpão:** Paleta de altíssimo contraste baseada em tom escuro absoluto (`#070c14`), reduzindo drasticamente a fadiga de controladores que operam turnos contínuos de 10 a 12 horas.
*   **Otimização de Espaço:** Projetada sob medida para notebooks de expedição (`1366x768`) sem necessidade de rolagem horizontal.
*   **Padrão Enterprise Premium:** Visual limpo, profissional, focado em tabelas e listas de alta densidade de dados (estilo *SAP Transportation Management*, *Oracle OTM* e *Manhattan WMS*), sem decorações infantis, de telemetria lúdica ou termos miliares ruidosos.

---

## 🛠️ 2. STACK TECNOLÓGICA & ARQUITETURA
A aplicação é full-stack, operando no modelo **Offline-First com Sincronização em Nuvem (Supabase)**.

*   **UI Framework:** React 19 + TypeScript + Tailwind CSS v4.
*   **Servidor Backend:** Express.js (`server.ts`) servindo de Proxy de API (com suporte nativo a TypeScript em desenvolvimento via `tsx` e compilado para Node.js CommonJS em produção via `esbuild`).
*   **Engine Banco de Dados Local (Cliente):** Dexie.js (wrapper reativo de alta performance sobre IndexedDB do navegador) com cache e sincronização persistente.
*   **Camada em Nuvem:** Supabase (PostgreSQL) para backup em tempo real, fila de sincronização assíncrona (`SyncQueue`), autenticação e compartilhamento multiusuário das operações de romaneio consolidadas nas docas.

---

## 🗄️ 3. ARQUITETURA DE ARQUIVOS (PROJECT TREE)
Os principais diretórios e arquivos que estruturam o ecossistema são:

```bash
├── package.json                   # Scripts de build (esbuild), dependências (React 19, Dexie, Supabase, Tailwind v4)
├── server.ts                      # Servidor Express com middleware para Vite no desenvolvimento e estático em produção
├── /src
│   ├── main.tsx                   # Ponto de entrada React
│   ├── App.tsx                    # Orquestrador de Telas (Dashboard, Frota, Roteirização, etc.)
│   ├── types.ts                   # Interfaces do domínio de Negócios (CTRC, Veículo, Ocorrências, etc.)
│   ├── supabase.ts                # Inicialização do cliente de nuvem Supabase
│   ├── /components                # Componentes e Visualizadores de Interface
│   │   ├── LoginView.tsx          # Tela de Login unificada de filiais
│   │   ├── Sidebar.tsx            # Navegação tática lateral
│   │   ├── DashboardView.tsx      # Métricas acumuladas, gráficos e saúde da filial
│   │   ├── RoteirizacaoView.tsx   # O CORAÇÃO da roteirização (Painel Duplo Tabela vs. Frota)
│   │   ├── FrotaView.tsx          # Gestão do cadastro local e estaleiro de motoristas
│   │   ├── OcorrenciasView.tsx    # Consulta de ocorrências de recusa, reentrega, devoluções
│   │   ├── CidadesRotasView.tsx   # Painel de normalização canônica ("Autopilot") de praças e prazos
│   │   └── ImportacaoView.tsx     # Importador universal de planilhas de CTRC/ERP legado
│   └── /infrastructure
│       └── /localdb
│           ├── db.ts              # Inicialização do Dexie localDB (tabelas e índices IndexedDB)
│           ├── schema.ts          # Definição e versionamento de schemas Dexie
│           └── /repositories      # Camada de Persistência (Padrão Repository)
│               ├── cidadeRotaRepository.ts
│               ├── ctrcRepository.ts
│               ├── driverRepository.ts
│               ├── occurrenceRepository.ts
│               ├── syncQueueRepository.ts
│               ├── tripRepository.ts
│               └── vehicleRepository.ts
```

---

## 📊 4. MODELOS DE DADOS DE HIGIDEZ (TypeScript Interfaces)

Definido centralizadamente em `/src/types.ts`:

### A. CTRC (Conhecimento de Transporte / Cargas)
```typescript
export interface Ctrc {
  id: string;              // Identificador Único do CTRC (ex: "SPO123456")
  unid?: string;           // Filial emissora do CTRC (ex: "SPO") - Usada para filtrar visualização do operador
  cidade: string;          // Descrição textual da cidade do ERP
  cidade_ent?: string;     // Cidade normalizada da entrega (destinatário)
  setor?: string;          // Micro-setor logístico atribuído (ex: "SUL-1")
  remetente?: string;      // Nome do Remetente (ex: "Samsung Corp")
  destinatario: string;    // Destinatário da carga (ex: "Lojas Americanas")
  pagador?: string;        // CNPJ/Nome do pagador. Importante: Se pagador === destinatario, carga é FOB.
  volume: number;          // Quantidade física de volumes (unidades)
  weight: number;          // Peso declarado (kg) (Obs: no banco é tratado por peso_r ou weight)
  peso_r?: number;         // Campo redundante de peso real em kg
  valor?: number;          // Valor declarado na NF (R$)
  frete?: number;          // Frete cobrado
  nf?: string;             // Notas fiscais vinculadas (separadas por vírgula)
  prev_ent?: string;       // Previsão física de entrega (formato "DD/MM/AAAA")
  ocorrencia?: string;     // Código da ocorrência (ex: "01", "12", "99")
  localizacao?: string;    // Localização física dentro das docas/box (ex: "BOX A-3", "CORREDOR B")
  status: 'Pendente' | 'Entregue' | 'Recusado' | 'Disponível' | 'Em Rota' | 'Transferência' | 'Agendamento';
}
```

### B. VEÍCULO (Vehicle)
```typescript
export interface Vehicle {
  id: string;              // Placa do veículo (padrão Mercosul, ex: "FLT8M55")
  driverName: string;      // Nome completo do motorista alocado
  capacity: string;        // Capacidade nominal de peso (ex: "4.5 t", "12000", "8500 kg")
  type: string;            // Tipo físico do veículo (VLC, Fiorino, Toco, Truck, Carreta, Bitrem)
  status: 'Em Rota' | 'Disponível' | 'Manutenção';
}
```

### C. CADASTRO DE CLIENTES CURVA A (CurvaAClient)
Determina os clientes e CNPJs prioritários cujo monitoramento de SLA é cirúrgico.
```typescript
export interface CurvaAClient {
  cnpj_remetente: string;  // CNPJ chave sem pontos
  curva_a: string;         // 'A', 'B' ou 'C'
  cliente_remetente: string; // Nome ou Razão Social
}
```

### D. CADASTRO DE OCORRÊNCIAS DE ENTREGA (DeliveryOccurrence)
Armazena a codificação dos motivos de atraso, averiguação, devolução ou retenção.
```typescript
export interface DeliveryOccurrence {
  codigo: string;          // Código ERP (ex: "01", "12")
  descricao: string;       // Motivo textual amigável (ex: "AVARIA EM TRANSPORTE", "AGUARDANDO BOX")
  responsabilidade: string; // "REMETENTE", "DESTINATÁRIO" ou "INTERNA"
  tipo: string;
  setor_ocorr: string;
  retorno_rota: 'Sim' | 'Não';
  tratativa_solucao: string; // Instrução recomendada para tratamento
}
```

### E. MATRIZ CANÔNICA DE CIDADES E ROTAS (CidadeRota)
Dicionário utilizado pelo motor de **Normalização Automática (Autopilot)** para corrigir erros cometidos por digitadores de faturas no ERP legado.
```typescript
export interface CidadeRota {
  id?: number;
  cidade: string;                 // Nome correto (ex: "ALFENAS")
  alias: string;                  // String de busca fuzzy separada por vírgula (ex: "ALFENAS-MG, ALFENA, RTA-ALFENAS")
  setor: string;                  // Setor logístico canônico (ex: "SUL-1")
  rota: string;                   // Rota e sequência (ex: "ROTA 06")
  prazo_padrao: number;           // Dias de trânsito regulamentados pelo SLA (D+0, D+1, D+2, etc.)
  prioridade_operacional: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA';
}
```

---

## 🧠 5. REGRAS DE NEGÓCIO DA OPERAÇÃO LOGÍSTICA
Para que qualquer IA gere código perfeito sem quebrar as regras operacionais reais estabelecidas no terminal de cargas da transportadora, siga rigorosamente essas determinações algorítmicas:

### A. Conversão de Capacidade Nominal para Kg (`parseVehicleCapacity`)
Os veículos cadastrados no ERP guardam a capacidade em string (ex: `"4.5 t"`, `"12000"`, `"6 t"`). Para calcular o peso acumulado dos romaneios de expedição, converta-as dinamicamente para número usando a função:
```typescript
function parseVehicleCapacity(capacityStr: string): number {
  const cleaned = capacityStr.toLowerCase().replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (capacityStr.includes('t')) return num * 1000;
  // Se for um número pequeno menor que 150, assume-se toneladas e converte para kg
  if (num < 150) return num * 1000;
  return num || 4000; // Fallback se inconsistente
}
```

### B. SLA Dinâmico e Contraste Ocular de Cores
A data base padrão usada para cálculos cronológicos relativos na aplicação é **`25/05/2026`** (representando o *tempo operacional vigente*).
O cálculo dos dias de atraso (`prev_ent` vs data-base `25/05/2026`) gera status cromáticos e comportamentais instantâneos:
*   🟢 **Futura (Prazo D+2 ou mais):** Texto ou badge verde `#166534`. Prazo seguro.
*   🟡 **Amanhã (Vence Amanhã D+1):** Fundo amarelo escuro `#ca8a04` com texto preto. Sinal de consolidação urgente para expedição matinal.
*   🔴 **Entrega Hoje (D+0):** Fundo vermelho `#dc2626` text-white em negrito, integrado com animação pulsar sutil de opacidade (sinaliza que a carga deve embarcar IMEDATAMENTE nas próximas horas).
*   🚨 **SLA Estourado (Atrasada D-X):** Fundo vermelho de altíssimo aviso `#7f1d1d` e texto branco com dias negativos em destaque.

### C. Alocação Temporária ("Draft") de Carga para Veículos e Recalculo em Tempo Real
Para dar a velocidade e o dinamismo à doca, a alocação de cargas nos veículos funciona em estado dinâmico ("Draft Assignment") mantendo um estado reativo:
```typescript
const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({}); // { [ctrcId]: vehicleId }
```
1.  **Doca Reativa:** O expedidor monta e desenha as rotas no painel marcando os CTRCs de interesse ou utilizando o recurso Drag and Drop (arrastar CTRC para o card do Veículo).
2.  **Saturação do Veículo:** Conforme novos itens entram no "Draft", a barra de progresso do veículo recalcula na hora seu peso acumulado e indica faixas de sobrecarga:
    *   **Até 60%:** Barra Azul (Sub-utilizado)
    *   **60% a 85%:** Barra Verde (Saturação Saudável)
    *   **85% a 95%:** Barra Laranja (Saturação Ideal / Ponto de Embarque)
    *   **Mais de 95%:** Barra Vermelha (Saturação de Alerta / Risco de Excesso de Eixo)
3.  **Fechamento de Romaneio:** Somente ao clicar no botão "EMITIR ROMANEIO" do veículo as trocas são enviadas para o repositório principal e o status do CTRC atualiza oficialmente para `'Consolidado' / 'Em Rota'` no banco local IndexedDB e é agendado no `SyncQueue` para subir para a nuvem.

### D. Autopiloto ("Autopilot") de Normalização de Praças
Quando ativado no topo do painel esquerdo, o sistema ignora a grafia de destino original digitada no cadastro do ERP (muitas vezes incorreta ou sem padrão, ex: `"SÃO PAULO - CENTRO"`, `"S.P. - PERDIZES"`) e cruza os termos no repositório `CidadeRotaRepository`. Ele obtém:
*   A cidade canônica no cadastro formal (ex: `"SÃO PAULO"`).
*   O micro-setor preenchido no banco de roteiros (ex: `"ZONA OESTE"`).
*   A prioridade e prazo padrão das regiões (ex: `"ALTA"`, `"D+1"`).

---

## 🦾 6. GUIA DE PROMPTS E INSTALADORES DE CONTEXTO PARA IAs
Quando for dar comandos a outra IA para estender, corrigir bugs ou redefinir funções nesse projeto, **copie o prompt abaixo** para garantir que ela opere sob as premissas certas do sistema de frotas e docas.

### Copie e Cole este Comando no Core da Nova IA:
```text
Você é um desenvolvedor de software sênior com vasta experiência em sistemas de grande porte para TMS (Transportation Management System) e WMS (Warehouse Management System).

Fomos contratados para trabalhar na manutenção e extensão do Cockpit de Roteirização de uma transportadora líder em operações rodoviárias e consolidação de cargas no Brasil.

COMPORTAMENTO TÉCNICO OBRIGATÓRIO:
1. Nós utilizamos uma arquitetura Offline-First robusta operando com Dexie.js (banco local IndexedDB) e Supabase (para reconciliação asfáltica em nuvem pós-expedição). Seus códigos e queries de banco de dados devem usar os repositórios oficiais definidos em 'src/infrastructure/localdb/repositories/'.
2. Mantenha os tipos estritos definidos no arquivo 'src/types.ts'. Não crie novas definições de Ctrc ou Vehicle que causem quebra de tipos com outros visualizadores da aplicação.
3. Não use bibliotecas de icons externas. Todos os ícones visuais devem ser gerados puramente usando os glyphs de fontes padrão 'lucide-react' ou Material Icons instalados.
4. Nossas lógicas de SLA calculam as previsões de entrega com a data de referência '25/05/2026' como baseline corrente da expedição.
5. Em todas as telas, mantenha o visual do layout rigorosamente compacto do monitor do galpão (1366x768), optando por tabelas de baixa altura de linhas (py-1), texto de altíssima legibilidade e cores focadas no conforto visual de turnos exaustivos de 12 horas.
6. Sempre trate a capacidade nominal dos veículos de forma tolerante a string manipulando 'parseVehicleCapacity' antes de realizar agregações matemáticas de faturamento.

Aqui está o código do componente RoteirizacaoView.tsx que precisamos alterar ou do qual precisamos herdar funções:
[COLAR O CÓDIGO DA SUA VIEW OPERACIONAL DO ARQUIVO ROTEIRIZACAOVIEW.TSX]
```

---
*Este guia operacional garante a governança e higidez das decisões do arquiteto de software. Mantenha-o sempre atualizado mediante novas inclusões de tabelas na modelagem no repositório de infraestrutura.*
