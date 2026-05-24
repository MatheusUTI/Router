# 🚚 RotaOperational — Plataforma de Inteligência e Governança Logística

Plataforma corporativa de controle logístico de alta performance concebida para unificar a gestão de frotas, orquestrar a roteirização de cargas a partir de arquivos brutos de faturamento (ERP Camilo dos Santos), apoiar a tomada de decisões de clientes críticos (Curva A) e auditar ocorrências de trânsito em tempo real.

O projeto opera sob uma arquitetura de vanguarda **Local-First com Sincronização em Nuvem (Cloud Sync)**, garantindo que as operações de carregamento não parem mesmo sem conexão estável de internet no pátio, permitindo exportações/importações sob demanda e conexões resilientes via Supabase PostgreSQL.

---

## 🎯 Objetivo do Software
Resolver a fragmentação do despacho de mercadorias entre múltiplas filiais de logística (ex: São Paulo - **SPO**, Pouso Alegre - **PPY**, Alfenas - **ALF**, Varginha - **VGA**). Ele possibilita que:
1. **Operadores de Despacho** carreguem arquivos brutos de faturamento (CSV/TXT do ERP corporativo) por arrastar-e-soltar e modelem-os através de um assistente de de-para inteligente e reusável.
2. **Superintendentes (Master)** visualizem fluxos de entrega em formato consolidados, controlem permissões e analisem dashboards de conformidade física em tempo real.
3. **Auditores de Contrato** gerenciem ocorrências críticas e resoluções de tickets de deserviço baseados nos códigos oficiais de divergência logística.

---

## 🏗️ Arquitetura Técnica Detalhada

O **RotaOperational** foi concebido em uma estrutura full-stack moderna:

```
                      ┌───────────────────────────────────────────────────┐
                      │                 Navegador/IFrame                  │
                      │  ┌───────────────────────┐ ┌───────────────────┐  │
                      │  │   Direct Web Client   │ │   React Router/   │  │
                      │  │  (SupaWeb Direct DB)  │ │   Motion State    │  │
                      │  └───────────┬───────────┘ └───────────────────┘  │
                      └──────────────┼────────────────────────────────────┘
                                     │ (Consultas SQL Web)
                                     ▼
┌───────────────────┐        ┌────────────────────────────────────────────┐
│  Express Server   │ ◄──────┤      Proxy Corporativo / API (Port 3000)   │
│  (Auth Provision) │        │ (Intermedeia login e provisiona usuários)  │
└─────────┬─────────┘        └────────────────────┬───────────────────────┘
          │                                       │
          └──────────────────┬────────────────────┘
                             ▼
              ┌───────────────────────────────┐
              │     Supabase Cloud Service    │
              │  ┌───────────────┐┌─────────┐ │
              │  │ PostgreSQL DB ││ Go Auth │ │
              │  └───────────────┘└─────────┘ │
              └───────────────────────────────┘
```

1. **Frontend (SPA)**:
   - **React 19** & **Vite**: Bootstrap ultrarrápido com Hot Module Replacement controlado.
   - **TypeScript 5.8**: Garantia rígida de tipos de dados durante manipulações de matrizes de fretes.
   - **Tailwind CSS V4**: Renderização visual customizada com o tema escuro de alta densidade *Cosmic Slate*.
   - **Motion**: Animações fluidas entre telas corporativas.
   - **Lucide React**: Biblioteca unificada para consistência iconográfica de ativos faturados.

2. **Backend (Node.js)**:
   - **Express**: Gateway de API seguro para isolamento de dados de configuração e intermediação de chamadas críticas.
   - **TSX**: Executor nativo de TypeScript de desenvolvimento que dispensa transpiladores pesados e intermediários.
   - **Esbuild**: Empacotador integrado de produção que converte o servidor monolítico em um único arquivo compacto `dist/server.cjs` CJS com suporte nativo a sourcemaps.

3. **Banco de Dados & Autenticação (Supabase)**:
   - **PostgreSQL**: Sólido armazenamento relacional com tabelas estruturadas para operações e auditoria corporativa.
   - **Supabase Auth**: Sistema de controle de acessos que isola credenciais, acoplado a um provisionador inteligente do Express que cria automaticamente contas operacionais padrão via API de administração.

---

## 📊 Mapeamento Técnico de Funcionalidades (Grid de Sincronização e Gaps)

O software fornece uma interface rica de **12 views operacionais** integradas a estados offline autônomos persistidos em `localStorage`. A tabela a seguir especifica detalhadamente quais propriedades estão sincronizadas nas tabelas em nuvem do Supabase e quais residem puramente em memória/cache de visualização para futura expansão:

| View do Frontend | Nome do Componente | Entidade de Dados (`/src/types.ts`) | Status no Banco Supabase | Tabela Associada (`public.*`) | Descrição dos Gaps Tecnológicos para Futura Implementação no Backend |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Login** | `LoginView` | `AppUser` | **Totalmente Sincronizado** | `app_users` & `auth.users` | Permite login tanto local (fallback offline) quanto remoto em nuvem. Possui provisionamento de sementes automático se o banco iniciar do zero. |
| **Dashboard** | `DashboardView` | Métricas Agregadas de CTRC / Veículos | **Cálculo em Tempo Real** | Leitura das tabelas `ctrcs` e `vehicles` | As métricas de kpis e gráficos de barra são gerados por agregações locais na memória do client. **No futuro:** Criar views de banco de dados (`CREATE VIEW`) ou triggers de agregação em tabelas de sumário para ganho de performance com milhões de CTRCs. |
| **Importação** | `ImportacaoView` | `Ctrc` | **Parcialmente Sincronizado** | Carga em tela salva em mem-state; exportada em lote para `ctrcs` | Processa layouts CSV/TXT do ERP corporativo de forma agnóstica na tela. **No futuro:** Salvar o mapeamento de cabeçalhos de-para no banco de dados por usuário (atualmente salvo no `localStorage` sob a chave `rota_operational_saved_layout_mapping`). |
| **Frota** | `FrotaView` | `Vehicle` & `DriverScore` | **Totalmente Sincronizado** | `vehicles` & `drivers` | Operações imediatas de cadastro, alteração e deleção de veículos e motoristas são propagadas no ato para os esquemas de produção. |
| **Roteirização** | `RoteirizacaoView` | Listas de `Ctrc` filtradas por `unid` | **Totalmente Sincronizado** | `ctrcs` (Atributos: `setor`, `status`, `vehicles`) | O grid permite o redimensionamento elástico de colunas (estilo Excel) e atribuição de carga para placas da frota. **No futuro:** Criar uma tabela de histórico relacional para registrar o momento exato e quem ordenou o carregamento da gaiola física do depto. |
| **Finalização** | `FinalizacaoView` | Romaneios de Carga Formados | **Apenas Frontend (Memória Local)** | Nenhuma (atualiza registros em `ctrcs` individualmente) | Exibe o manifesto de saída completo configurado para assinatura e entrega. **No futuro:** Criar a tabela `public.romaneios` para persistir o cabeçalho consolidado (Placa, Peso Total, Valor Total, Motorista, Data de Saída e Status do Manifesto) em vez de persistir apenas chaves individuais no CTRC. |
| **Desempenho** | `DesempenhoView` | Métricas de KPI de Motoristas | **Totalmente Sincronizado** | `drivers` | O painel lê as métricas de tempo médio, notas de score de eficiência e taxas de rejeição diretamente das tabelas remotas. |
| **Solução** | `SolucaoView` | `Ticket` (Chamados críticos de motoristas) | **Totalmente Sincronizado** | `tickets` | Gerenciamento centralizado de incidentes operacionais de rua (Ex: "Destinatário Ausente", "Troca de Motorista urgente", etc.). |
| **Clientes** | `ClientesView` | `CriticClient` | **Totalmente Sincronizado** | `clients` | Alertas de recorrência sobre faturamentos de compradores prioritários auditados. **No futuro:** Converter o campo `recurrentIssues` que armazena um array de objetos JSON em uma tabela relacional independente de históricos de reclamações `public.client_issues`. |
| **Ocorrências** | `OcorrenciasView` | `DeliveryOccurrence` | **Totalmente Sincronizado** | `occurrences` (Dicionário Técnico) | Tela de cadastro de soluções normatizadas e tabelas corporativas de ocorrência com tratativas de retornos pré-definidas. |
| **Curva A** | `CurvaAView` | `CurvaAClient` | **Totalmente Sincronizado** | `curva_a_clients` | Dashboard estratégico para acompanhar a base estatística dos clientes classificados como prioritários em volume físico. |
| **Configurações**| `ConfiguracoesView` | `AppUser` & Setup de Migrações | **Totalmente Sincronizado** | `app_users` | Gerencia chaves personalizadas e opera as cargas de semente (Exportar/Importar do Supabase) que alimentam as tabelas e unificam estados locais e na nuvem. |

---

## 🛠️ Guia de Instalação, Réplica e Execução (Passo a Passo)

Siga os passos técnicos abaixo para clonar, implantar e rodar localmente ou replicar este software em outro container/provedor:

### 1. Pré-Requisitos
- **Node.js** v18 ou superior instalado.
- **NPM** v9 ou superior.

### 2. Clonagem do Repositório e Instalação de Dependências
Abra o seu terminal operacional e execute os comandos:

```bash
# Entre na pasta raiz onde o projeto foi descompactado ou clonado
cd rotaoperational

# Instale todas as dependências especificadas no manifest do package.json
npm install
```

---

### 3. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do seu projeto a partir do modelo contido em `.env.example`:

```bash
# Copia o template de variáveis de ambiente
cp .env.example .env
```

Abra o arquivo `.env` gerado e preencha as credenciais. Se você estiver integrando com o Supabase, as seguintes variáveis são mandatórias:

```env
# Chave mestra do Gemini API (para integrações inteligentes futuras)
GEMINI_API_KEY="AI_STUDIO_INJECTED_OR_YOUR_OWN_KEY"

# URL Base de fomento de Aplicação
APP_URL="http://localhost:3000"

# CONFIGURAÇÕES DA INSTÂNCIA DO SUPABASE (Substitua pelas suas)
SUPABASE_URL="https://sua-instancia-projeto.supabase.co"
SUPABASE_KEY="sua-chave-anon-key-ou-service-role-key"

# VARIÁVEIS EXPOSTAS AO CLIENTE VITE (Mesmos valores para conexões diretas de tela)
VITE_SUPABASE_URL="https://sua-instancia-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-key"
```

---

### 4. Inicializando o Software em Ambiente de Desenvolvimento

Para rodar com recompilação contínua (hot reloading):

```bash
npm run dev
```

O servidor Express e o middleware do Vite iniciarão juntos na porta **3000** garantindo que todos os links operem no host `http://localhost:3000`.

---

### 5. Compilação e Start para Produção (Deployment para Clientes / Replicadores)

Se você estiver preparando o software para implantar em um servidor web de produção (ex: Docker, Heroku, Cloud Run, AWS):

```bash
# 1. Compila o frontend estático para a pasta /dist
# 2. Recompila o backend TypeScript e agrupa-o no arquivo otimizado /dist/server.cjs
npm run build

# 3. Inicia o servidor node de produção a partir do código transpilado e empacotado
npm start
```

---

## 💾 Modelagem de Banco de Dados: Script de Migração SQL (Copiar para o Supabase)

Para preparar as tabelas e garantir compatibilidade instantânea com RotaOperational sem restrições de escrita ou leitura, copie o script de semente de tabelas relativas abaixo e execute-o diretamente no **SQL Editor** do Console Administrativo do seu Supabase:

```sql
-- =========================================================================
-- SCRIPT DE ENGENHARIA DE BANCO DE DADOS: ROTAOPERATIONAL (PRODUÇÃO / TESTES)
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE PARA ATIVAR O SOFTWARE IMEDIATAMENTE
-- =========================================================================

-- 1. Tabela de Veículos de Frota
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY, -- Placa do Veículo
  driver_name TEXT NOT NULL,
  capacity TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Motoristas (Desempenho e Histórico)
CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  best_route TEXT NOT NULL,
  status TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  avg_time INTEGER NOT NULL,
  error_rate NUMERIC NOT NULL,
  success_rate NUMERIC NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documentos Operacionais Faturados / CTRCs
CREATE TABLE IF NOT EXISTS public.ctrcs (
  id TEXT PRIMARY KEY, -- Número do CTRC (ex: VGA433233-4)
  destinatario TEXT NOT NULL,
  cidade TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  volume INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  cidade_ent TEXT,
  setor TEXT,
  prev_ent TEXT,
  remetente TEXT,
  ocorrencia TEXT,
  data_ocorr TEXT,
  nf TEXT,
  valor NUMERIC,
  frete NUMERIC,
  unid TEXT, -- Unidade Operacional Filtro (ex: SPO / VGA / ALF / PPY)
  pagador TEXT,
  cod TEXT,
  descricao_ocorr TEXT,
  data_ocorrencia TEXT,
  peso_r NUMERIC,
  obs TEXT,
  disponibilidade TEXT,
  localizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ocorrências Ativas / Incidentes Críticos de Rua
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY, -- #TRK-xxxxx
  title TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  address TEXT NOT NULL,
  age_minutes INTEGER NOT NULL,
  priority TEXT,
  status TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clientes Críticos e Auditoria de Recorrência
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  rejections_30d INTEGER NOT NULL,
  avg_queue_time TEXT NOT NULL,
  address TEXT NOT NULL,
  recurrent_issues_json TEXT NOT NULL, -- Dados Estruturados de Problemas Recorrentes
  audit_user TEXT,
  audit_avatar TEXT,
  audit_time TEXT,
  audit_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Gestão Corporativa de Usuários (Login e Níveis de Acesso)
CREATE TABLE IF NOT EXISTS public.app_users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_master BOOLEAN DEFAULT FALSE,
  unid TEXT, -- Unidade Relacionada Travada (ex: SPO / VGA / ALF / PPY)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Dicionário Operacional de Ocorrências e Tratativas
CREATE TABLE IF NOT EXISTS public.occurrences (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  responsabilidade TEXT NOT NULL,
  tipo TEXT NOT NULL,
  setor_ocorr TEXT NOT NULL,
  retorno_rota TEXT NOT NULL,
  tratativa_solucao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Clientes Classificados - Curva A
CREATE TABLE IF NOT EXISTS public.curva_a_clients (
  cnpj_remetente TEXT PRIMARY KEY,
  curva_a TEXT NOT NULL,
  cliente_remetente TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- CONFIGURAÇOES DE SEGURANÇA E ACESSIBILIDADE RLS (ROW LEVEL SECURITY)
-- Para uso corporativo ágil e sincronização de pátio sem impedimentos,
-- desativamos o RLS provisoriamente. Se desejar, configure políticas de e-mail específicas.
-- =========================================================================
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctrcs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.curva_a_clients DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- POPUP DE SEED OPERACIONAL PADRÃO (PREVENT LOCKOUT)
-- =========================================================================
INSERT INTO public.app_users (username, password, name, role, is_master, unid)
VALUES 
  ('master', '123', 'Anderson M. (Master)', 'Superintendente de Logística', TRUE, 'TODAS'),
  ('operador', '123', 'João Silva', 'Operador de Despacho', FALSE, 'SPO'),
  ('auditor', '123', 'Maria Costa', 'Auditor de Contratos', FALSE, 'VGA')
ON CONFLICT (username) DO NOTHING;
```

---

## 🔒 Governança de Usuários e Regras de Negócio de Visibilidade (UNID)

O sistema segue padrões rígidos de controle operacional baseado no perfil de privilégio do usuário logado:

1. **Perfil Superintendente (`is_master: true` ou usuário `master`)**:
   - Possui acesso completo e ilimitado de leitura e escrita a todas as abas.
   - Pode alterar a Unidade Ativa no seletor do cabeçalho da "Roteirização" para auditar o fluxo de filiais individuais (**SPO**, **PPY**, **ALF**, **VGA**) ou selecionar `TODAS` simultaneamente para uma visão corporativa agregada.
   - Pode criar, alterar e excluir operadores na tabela administrativa em "Configurações".

2. **Perfil Operador Padrão (`is_master: false` exemplo `operador`)**:
   - É estritamente **bloqueado e travado** na Unidade Física vinculada a seu cadastro (atribuído no campo `unid` da tabela de usuários).
   - O seletor de unidade fica oculto no cabeçalho ou desativado, forçando o grid de roteirização a mostrar apenas os CTRCs pertencentes à sua filial (ex: Operadores de São Paulo visualizam e geram romaneios apenas de SPO).
   - Não pode auditar ou visualizar listas corporativas de outras filiais, reduzindo o risco de erros operacionais e de misturas de cargas físicas em gaiolas e rotas distintas.

---

## 🚀 Como Integrar Novas Funcionalidades no Futuro (Roteiro)

Caso queira estender o backend para apoiar 100% os fluxos parciais do frontend, implemente as seguintes APIs no arquivo `/server.ts` e no banco de dados:

1. **Logística Multiusuário Real-time**:
   Substitua as chamadas do frontend em `src/components/` que atualizam dados locais e faça subscrições nos canais WebSockets do Supabase para refletir visualizações de caminhões em rota instantaneamente:
   ```javascript
   supabase
     .channel('schema-db-changes')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'ctrcs' }, payload => {
        // Recarregar lista em tela automaticamente
     })
     .subscribe();
   ```

2. **Tabela de Arquivos de Manifesto (`romaneios`)**:
   Crie uma tabela `public.romaneios` e implemente a persistência da assinatura física e fechamento do veículo. Desta forma, o operador poderá consultar romaneios gerados no passado e reimprimir relatórios de viagem antigos.

---

## 📝 Licença e Propósito de Modificação
Desenvolvido em conformidade para uso em operações logísticas terrestres brasileiras. Sinta-se livre para clonar, customizar e implantar em novos pátios de triagem. Para suporte técnico e configurações de faturamento robustas, consulte o time de infraestrutura corporativa do seu terminal.
