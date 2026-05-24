# 🚚 RotaOperational

Plataforma operacional web para logística rodoviária de alto rendimento, dedicada à triagem física, importação de documentos operacionais (CTRCs) e roteirização rápida de cargas. O sistema é concebido sob o modelo **Local-First com Sincronização em Nuvem (Supabase)**, garantindo resiliência operacional contínua mesmo em galpões industriais com conectividade intermitente ou ausência de sinal de internet.

O RotaOperational não é um ERP genérico ou uma plataforma analítica de BI; ele atua estritamente como um **terminal operacional pragmático** focado na agilidade diária de pátio e conformidade de despacho físico.

---

## 🌎 1. Visão Geral

O sistema integra o controle logístico de filiais descentralizadas, resolvendo a fragmentação na conversão de planilhas de faturamento de ERPs corporativos em cargas físicas consolidadas. O operador local manipula e valida informações em um ambiente de alta velocidade livre de oscilações de rede.

A governança do fluxo é baseada na filial de origem do operador logístico (`unid`), bloqueando visualizações ou edições não autorizadas entre diferentes bases regionais (ex: São Paulo - **SPO**, Varginha - **VGA**).

---

## ⚙️ 2. Princípios Operacionais

A engenharia e desenvolvimento da plataforma seguem premissas reais de operação industrial:

*   **Operação antes de Analytics:** Prioridade máxima na fluidez da triagem física e faturamento por placa. Telas de indicadores e relatórios analíticos são tratados como satélites.
*   **Offline antes de Realtime:** A tolerância a falhas locais é mandatória. O sistema processa importações e monta cargas em memória/cache local, exigindo internet ativa apenas para sincronizações planejadas.
*   **Fluxo Operacional antes de Complexidade Visual:** Foco em tabelas densas, buscas rápidas por teclado e inputs numéricos diretos (*Cosmic Slate Theme* de baixa fadiga para ambientes logísticos).
*   **Evolução Incremental sem Ruptura:** Rejeição à reescrita completa. Novos recursos e refatorações são aplicados progressivamente, resguardando módulos funcionais estáveis.
*   **Governança por Unidade Operacional:** Trancas físicas de dados impostas na raiz do login com base na filial fiduciária.

---

## 🔄 3. Fluxo Operacional Principal

O fluxo de decolagem de mercadorias no RotaOperational simula a sequência de triagem de um pátio real:

```txt id="u20r6k"
Login
→ Importação CSV/TXT
→ Mapeamento
→ Validação
→ Roteirização
→ Alocação em veículos
→ Expedição
→ Finalização da viagem
→ Ocorrências
→ Encerramento operacional
```

1.  **Login Regional:** Validação de login com leitura das permissões (`is_master`) e correspondente unidade de retenção fixa (`unid`).
2.  **Importação de Faturamento:** Upload por drag-and-drop de arquivos de frete tabulados provenientes do ERP de faturamento.
3.  **Mapeamento de Cabeçalho:** Ajuste flutuante opcional para associar cabeçalhos de novos layouts do ERP sem quebrar o banco.
4.  **Validação de Registro:** Identificação local de erros matemáticos de volume ou CTRCs já despachados.
5.  **Roteirização e Alocação:** Operadores examinam apenas os fretes destinados à sua filial ativa e alocam-nos às placas correspondentes.
6.  **Expedição e Finalização:** Consolidação financeira das movimentações (lançamento de custos de viagem) e emissão de romaneio PDF.
7.  **Encerramento:** Feedback de conclusão e liberação das placas para reuso, fechando-se o loop do pátio.

---

## 📦 4. Módulos Principais

### A. Núcleo Operacional (Alta Prioridade)
*   **Módulo de Importação:** Interface e parser de planilhas CSV com salvamento reusável de mapeamento de colunas em cookies/gabaritos locais.
*   **Módulo de Roteirização:** Grid elástico estilo planilha Excel com redimensionamento responsivo de células para listagem, ordenação e atribuição em lote de fretes.
*   **Módulo de Expedição e Finalização:** Emissor de relatórios logísticos em PDF com input flutuante de despesas operacionais da rota.
*   **Módulo de Ativos Terrestres (Frota):** CRUD ativo de caminhões e cadastro qualitativo de scores econômicos de motoristas.
*   **Módulo de Sincronização Cloud:** Gateway central de backups que unifica as alterações locais e as consolida de forma segura no Supabase.

### B. Recursos Secundários (Acessos de Auditoria - Gaveta Adicional)
*   **Painel Central (Dashboard):** KPIs consolidados e totalizações simplificadas baseadas no cache de terminal.
*   **Clientes Críticos e Curva A:** Classificador conceitual de compradores prioritários para apoio a auditorias financeiras.
*   **Ocorrências de Rota:** Catálogo passivo de divergências padrão (CBR) para orientação técnica de anomalias logísticas.

---

## 🛠️ 5. Arquitetura Atual

O sistema adota uma estrutura homogênea full-stack de baixo atrito:

*   **Frontend SPA:** Construído em **React + TypeScript + Vite**, estilizado horizontalmente através do **Tailwind CSS** e animado via **Motion**.
*   **Retaguarda Proxy Express:** Servidor back-end em Node.js configurado para executar na porta única ingressadora **3000** garantindo provisionamento transparente de usuários e seeds na inicialização inicial do container.
*   **Banco PostgreSQL Supabase:** Repositório estável das tabelas operacionais em nuvem (`ctrcs`, `vehicles`, `drivers`, `tickets`, `app_users`).
*   **Mecanismo Local-First:** Os fluxos utilizam o `localStorage` do navegador para staging, prevenindo perda de triagem corrente em quedas de sinal de roteadores industriais.

---

## 📂 6. Estrutura do Projeto

Organização madura baseada na direção evolutiva de componentes puros para modularização modular por capacidades lógicas:

```txt id="ihb6l3"
src/
 ├── components/       # Componentes de UI e views operacionais acopladas
 │    ├── LoginView.tsx        # Controle de decolagem de sessão corporativa
 │    ├── ImportacaoView.tsx   # Parser local de CSV e templates de-para
 │    ├── RoteirizacaoView.tsx # Grid de arranjo físico Excel elástico
 │    ├── FinalizacaoView.tsx  # Manifesto e custos adicionais
 │    ├── FrotaView.tsx        # CRUD de caminhões e perfis de controle
 │    ├── Sidebar.tsx          # Menu reativo separando core de áreas de roadmap
 │    └── ... (outras views de auditoria secundárias)
 ├── types/            # Modelagem de interfaces e enums do domínio logístico
 ├── utils/            # Ferramentas auxiliares de processamento matemático e formatters
 └── supabase.ts       # Hub de API remota REST direta contra tabelas Cloud
```

---

## 🧭 7. Domínio Operacional (Visão Semântica)

A semântica de código do RotaOperational abstrai termos de telas para focar em regras de negócio fiduciárias:

*   **Importação & Staging:** Controle isolado em memória RAM do processamento de faturamento bruto sem expor dados inconsistentes às tabelas ativas.
*   **Viagem & Manifesto:** O agregado logístico (placa + rota + custos + lista de CTRCs) que valida se a cubagem e o peso nominal estequiométrico limite do caminhão não foram ultrapassados no carregamento.
*   **Sessão Operacional:** Amarração restritiva baseada no token `user.unid` que delimita o escopo físico visível de leitura e gravação no pátio.

---

## 🚦 8. Estado Atual do Projeto

Identificação clara de integridade e usabilidade atual das engrenagens do sistema:

*   **Funcionalidades Estáveis:** Autenticação regional fiduciária, CRUD de frotas e motoristas, grid elástico e alocação de cargas no pátio, emissão e exportação de relatórios romaneios em PDF.
*   **Áreas Parciais:** O mapeador flexível de arquivos CSV funciona e salva o layout, mas necessita de persistência no banco Supabase para eliminar dependência estrita do cache do navegador.
*   **Áreas em Evolução:** Os custos de viagem adicionais introduzidos na Finalização não se convertem em histórico relacional permanente nas tabelas, sendo descartados pós-fechamento do veículo.

---

## ⚠️ 9. Dívidas Técnicas Conhecidas

*   **Persistência Volátil de Romaneios:** Ausência de uma tabela permanente de histórico de manifestos (`public.romaneios_hist`), dependendo de persistências pontuais locais.
*   **RLS Simplificado:** A restrição por filial é imposta via filtros estritos lógica de frontend no React, necessitando de Row Level Security direto no PostgreSQL para auditorias rigorosas em grandes equipes.
*   **Cálculos em RAM Client-Side:** Dashboard agrega e indexa milhares de faturamentos usando a CPU do navegador cliente, gerando latências no pátio caso o banco local de CTRCs exceda dezenas de milhares de linhas ativas.

---

## 📅 10. Roadmap Resumido

### Curto Prazo (Estabilização)
*   Persistência de gabaritos flexíveis de CSV no Supabase associados à conta ativa.
*   Refinamento do buffer de carregamento das planilhas em conexões de alta oscilação.

### Médio Prazo (Consolidação de Domínio)
*   Criação de tabelas de histórico relacional para armazenar e auditar romaneios encerrados.
*   Migrar agregações custosas para Views nativas PostgreSQL no Supabase.

### Longo Prazo (Segurança & Alta Escala)
*   Ativação homogênea de políticas RLS em banco e liberação de logs de auditoria temporal.

---

## 🚀 11. Execução do Projeto

### Pré-requisitos
*   Node.js v18 ou superior.
*   NPM v9 ou superior.

### Instalação
```bash
# Entre na pasta e instale os pacotes npm do manifesto
npm install
```

### Variáveis de Ambiente (`.env`)
Monte seu arquivo locais com as credenciais remotas do Supabase:
```env
GEMINI_API_KEY="CHAVE_DE_APOIO_AI"
SUPABASE_URL="https://seu-appid.supabase.co"
SUPABASE_KEY="sua-chave-anon-key"
VITE_SUPABASE_URL="https://seu-appid.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-key"
```

### Inicializando o Sistema

Para rodar em ambiente de desenvolvimento (Porta obrigatória 3000):
```bash
npm run dev
```

Para compilação fechada (Production Build) e start direto do servidorExpress:
```bash
# Compila frontend e encapsula o backend em dist/server.cjs
npm run build

# Executa o servidor fechado
npm start
```

---

## 📐 12. Diretrizes de Desenvolvimento e Filosofia de Evolução

O projeto evolui exclusivamente sob os preceitos de **estabilidade operacional**, **reforço de domínio** e **modularização progressiva** sem reescrever ou comprometer compatibilidades:

1.  **Não quebrar fluxos em uso:** Telas operacionais de faturamento diário nunca devem sofrer reestruturações destrutivas na UI.
2.  **Desacoplar Lógica de Exibição:** Regras fiscais e cálculos de balanceamento de caminhões devem residir em hooks isolados ou contexts, e nunca mesclados às tags de renderização do componente React.
3.  **Auditoria Estática Obrigatória:** Antes de submeter ou atualizar códigos, certifique-se de que a transpilação não apresenta furos de tipagem efetuando a validação integrada: `npm run lint`.

---

*RotaOperational: Engenharia, Robustez e Estabilidade para o Despacho Rodoviário Terrestre Nacional.*
