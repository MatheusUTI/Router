# 📐 RotaOperational — Modelagem de Domínio Operacional (DDD) e Guia de Consolidação Arquitetural

Este documento define a arquitetura conceitual e diretrizes práticas para a transição técnica do sistema **RotaOperational** de uma estrutura baseada estritamente em "telas conectadas no frontend" para uma arquitetura orientada a **Domínios de Capacidade Logística**. 

O objetivo é estruturar, organizar e separar responsabilidades lógicas preservando 100% da retrocompatibilidade funcional e reduzindo o acoplamento do sistema atual.

---

## 🧭 1. Diagnóstico do Domínio Atual

Atualmente, o software atende bem à operação diária de triagem física, contudo, as regras de negócio residem dispersas ao longo dos componentes React (`src/components/*View.tsx`) e do arquivo centralizador de estado `src/App.tsx`. 

*   **O que está muito funcional:** O motor de importação com mapeador de gabarito CSV, a atribuição mútua de CTRCs por placa na roteirização e a barreira regional de usuários logados (`unid` restrita).
*   **O que está acoplado:** A lógica de cálculo de sub-faturamento nos veículos e o gerenciamento transitório de despesas estão diretamente associados aos componentes de renderização, dificultando testes unitários rápidos e o escalonamento para novas filiais.
*   **Aparência e Densidade:** O sistema apresenta alta densidade visual (*Cosmic Slate*), ideal para pátios de triagem. A documentação a seguir guia o refinamento interno sem alterar ou quebrar os hábitos de uso dos conferidores.

---

## 📦 2. Domínios Operacionais Identificados

Para solidificar as fronteiras de software do sistema, mapeamos as capacidades corporativas em **Subdomínios de Domínio Rígido (Bounded Contexts)**:

```
                  ┌───────────────────────────────────────────────┐
                  │          ROTAOPERATIONAL DOMAIN               │
                  └───────────────────────┬───────────────────────┘
                                          │
       ┌───────────────────┬──────────────┴─────┬─────────────────────┐
       ▼                   ▼                    ▼                     ▼
┌──────────────┐   ┌──────────────┐     ┌──────────────┐      ┌──────────────┐
│  IMPORTAÇÃO  │   │ OPERAÇÃO DE  │     │ GESTÃO DE    │      │ GOVERNANÇA E │
│ OPERACIONAL  │   │ EXPEDIÇÃO    │     │ ATIVOS (FRO) │      │ SINCRONIA    │
└──────────────┘   └──────────────┘     └──────────────┘      └──────────────┘
```

### A. Subdomínio de Importação Operacional (Staging)
*   **Responsabilidade:** Entrada assíncrona de arquivos tabulados, identificação de anomalias (documentos repetidos, quebra de valores mínimos de frete) e salvamento de configurações de gabarito para novos ERPs.
*   **Limites de Entrada:** Recebe arquivos limpos e entrega um lote de documentos normalizados no padrão `Ctrc`.
*   **Ciclo de Vida:** Curto e de descarte rápido pós-validação.

### B. Subdomínio de Operação de Expedição (Roteirização e Finalização)
*   **Responsabilidade:** Consolidação do manifesto físico e formação de carga. Balanceia peso e volume por frota ativa, gera despesas corporativas necessárias (combustível, alimentação, ajudantes terceiros).
*   **Fronteiras:** Atua entre o inventário de veículos disponíveis e a lista pendente de CTRCs da filial.
*   **Ciclo de Vida:** Longo, persistindo o manifesto até a liberação real da viagem no pátio físico.

### C. Subdomínio de Gestão de Ativos (Frota e Motoristas)
*   **Responsabilidade:** Inventário de equipamentos terrestres e desempenho de condutores em rota activa.
*   **Fronteiras:** Fornece o estado "Livre" / "Em Trânsito" dos caminhões necessários para o fluxo de expedição.
*   **Ciclo de Vida:** Vitalício à operação da filial.

### D. Subdomínio de Registro de Incidentes (Ocorrências e Suporte)
*   **Responsabilidade:** Manter o acervo técnico formalizado das ocorrências logísticas nacionais de rota e renegociação imediata de carga (Tickets).
*   **Ciclo de Vida:** Histórico, permitindo auditorias sucessivas.

### E. Subdomínio de Governança de Filial (Sessão Operacional)
*   **Responsabilidade:** Alocação de limites de privilégios de visibilidade por filial (**SPO**, **PPY**, **ALF**, **VGA**).
*   **Fronteiras:** Intermeia todas as queries contra bancos no Supabase para isolamento total de filiais concorrentes.

---

## 🗄️ 3. Entidades Operacionais Reais (Estrutura de Estado)

A tabela abaixo classifica todas as entidades do sistema `src/types.ts` de acordo com seu papel dentro de seus respectivos contextos de transição técnica:

| Nome da Entidade | Tipo de Dados | Modificadores de Escrita | Tempo de Vida Útil | Destino Fiduciário da Verdade |
| :--- | :--- | :--- | :--- | :--- |
| **Lote Importado** | Transitório (Staging) | Despachante Local | Instantâneo ao parse | Memória RAM do Client |
| **CTRC (Faturado)** | Transitório / Ativo | Despachante / Sync | Semanal até Entrega | Tabela `public.ctrcs` |
| **Vehicle / Driver** | Ativo (Persistente) | Adm / Configuração | Mensal / Vitalício | Tabela `public.vehicles` |
| **Expense (Custo)** | Transitório (Sessão) | Despachante Local | Até fechar manifesto | LocalStorage / Futuro Roman. |
| **Ticket (Incidentes)**| Ativo (Persistente) | Motorista / Auditor | Dias até encerramento | Tabela `public.tickets` |
| **AppUser (Sessão)** | Persistente | Sistema / Adm | Permanente | Tabela `public.app_users` |

---

## 🚛 4. Concepção da Entidade "Viagem" (Trip Aggregate Root)

Atualmente no código, o estado de "Viagem" é mantido de forma **implícita**: associa-se individualmente o atributo `status = 'Em Rota'` no veículo e altera-se a propriedade `vehicle` de múltiplos CTRCs para a placa correspondente.

Para amadurecer a governança logística e o arquivamento histórico de fretes sem quebrar as views atuais do frontend, propõe-se a formalização incremental do **Agregado Viagem (Trip)**:

```typescript
// Formalização Incremental para src/types.ts (Risco Médio de Integração)
export interface Viagem {
  id: string;               // Identificador do Manifesto de Saída (ex: ROM-SP-2026-0034)
  unid: string;             // Unidade filiada emissora de carga (ex: SPO)
  vehicleId: string;       // Placa do Veículo utilizado
  driverId: string;        // ID do condutor designado
  ctrcList: string[];      // Lista de documentos associados no romaneio
  status: 'Preparada' | 'Em Transporte' | 'Concluída' | 'Cancelada';
  despesas: Expense[];     // Acumulado de despesas auxiliares
  pesoTotal: number;       // Peso bruto real somado (kg)
  dataPartida?: string;
  dataEncerramento?: string;
  criadoPor: string;       // Nome ou ID do operador despachante
}
```

### Como implementar sem reescrever o fluxo atual (Backward Compatibility):
1.  **Leitura Retrocompatível:** O frontend continua renderizando os veículos ocupados lendo a propriedade `Vehicle.status === 'Em Rota'` e os CTRCs através do filtro de Placa.
2.  **Escrita Sequencial:** Na tela `FinalizacaoView.tsx`, ao confirmar a saída física com a plotagem do manifesto PDF, um novo registro `Viagem` é instanciado agregando os dados locais existentes. Este objeto é enviado para persistência cloud e os registros individuais de CTRCs no computador são atualizados de forma secundária.

---

## 🔄 5. Separação de Estados Corporativos

Para otimizar o consumo de dados de rede, evitar latências nas atualizações e garantir resiliência local em pátios industriais, estabelece-se a seguinte matriz de responsabilidade estatal:

```
┌────────────────────────────────────────────────────────┐
│                   DIRETRIZ DE FLUXO                    │
├────────────────────────────────────────────────────────┤
│ INPUT CSV ──► MEMÓRIA TRANSITÓRIA ──► NUVEM (ONLINE)   │
│                 │                                      │
│                 └──────────► CACHE LOCAL (OFFLINE)     │
└────────────────────────────────────────────────────────┘
```

1.  **Estado Transitório (Staging local):** Carregou-se o CSV. A planilha está na tela sob validação visual de erros. *Finalidade:* Permitir a correção visual sem poluir as tabelas de produção com arquivos de testes ou fretes faturados incorretamente no ERP.
2.  **Estado Operacional Ativo:** O faturamento importado aceito é persistido localmente no computador do operador logístico. O caminhão é montado em tempo real na tela.
3.  **Estado Persistente Sincronizado:** O ato de acionar "Cloud Sync" exporta orquestradamente os lotes de fretes de pátio e frota ativa. A fonte de verdade é a tabela `public.ctrcs` do Supabase PostgreSQL.
4.  **Estado Histórico de Despacho (Remote Server):** Representa o arquivo morto corporativo pós-liberação física. O tráfego de cargas encerradas sairá do processamento em viewport ativa para tabelas otimizadas com índices temporais.

---

## 📂 6. Proposta de Modularização de Pastas Progressiva

A transição da arquitetura atual deve ocorrer de forma **gradual**, eliminando qualquer tipo de interrupção ou gargalo de visualização.

### Estrutura Monolítica Atual (Views Orientadas a Telas)
```
src/
 └── components/ (ClientesView, ImportacaoView, RoteirizacaoView, etc)
```

### Proposta de Estrutura Modular Orientada a Capacidades
```
src/
 ├── modules/
 │    ├── importacao/          # Mapeamento dinâmico ERP, de-para e Parser CSV
 │    │    ├── components/
 │    │    ├── hooks/
 │    │    └── services/
 │    │
 │    ├── expedicao/           # Roteirização Geral e Alocação por Frota
 │    │    ├── components/
 │    │    └── services/
 │    │
 │    ├── frota/               # Inventário de Placas, Status e Notas Técnicas
 │    │    ├── components/
 │    │    └── types.ts
 │    │
 │    ├── ocorrencias/         # Tickets Operacionais, Auditoria e Suporte
 │    │    ├── components/
 │    │    └── services/
 │    │
 │    └── sincronizacao/       # Gateway Cloud, Backups e Sementes Supabase
```

### 🗓️ Cronograma Seguro de Migração (Risco Zero e Baixo Risco)
1.  **Fase 1 (Sem Risco):** Manter a pasta `src/components/` normalizada e criar de forma limpa a pasta `src/modules/sincronizacao/` migrando as propriedades do utilitário `src/supabase.ts`.
2.  **Fase 2 (Baixo Risco):** Isolar os seletores e regras de-para lógicos de `ImportacaoView.tsx` em um subcontexto `src/modules/importacao/services/parser.ts`.
3.  **Fase 3 (Médio Risco):** Agrupar componentes satélites como `ClientesView` e `CurvaAView` em `src/modules/expedicao/`.

---

## 📉 7. Mitigação e Desacoplamento do Estado Global (`App.tsx`)

Atualmente, o arquivo `src/App.tsx` atua como o orquestrador macro que abriga dezenas de hooks e variáveis de estados operacionais compartilhados (carregamento de frotas, tabelas de incidentes, logs). 

Para contornar o risco de fadiga de tokens e retrabalhos sequenciais nas evoluções futuras, recomendam-se duas práticas arquiteturais simples:

1.  **Uso de React Contexts Especializados por Capacidade (Logistics Contexts):**
    Em vez de perfurar propriedades até os componentes (Prop Drilling), declarar um Provider descentralizado:
    ```typescript
    // Exemplo: src/modules/expedicao/context/ExpedicaoContext.tsx
    import React, { createContext, useContext, useState } from 'react';
    import { Ctrc, Vehicle } from '../../../types';

    interface ExpedicaoContextType {
      ctrcs: Ctrc[];
      vehicles: Vehicle[];
      alocarCarga: (ctrcId: string, vehicleId: string) => void;
    }

    const ExpedicaoContext = createContext<ExpedicaoContextType | undefined>(undefined);

    export function useExpedicao() {
      const context = useContext(ExpedicaoContext);
      if (!context) throw new Error('useExpedicao deve ser utilizado sob o ExpedicaoProvider');
      return context;
    }
    ```
2.  **Mudar Handlers de Eventos de Tela para Custom Hooks de Negócio:**
    Isto reduz em até 60% o peso das linhas escritas de `App.tsx`:
    ```typescript
    // Exemplo: src/modules/frota/hooks/useAssetManagement.ts
    import { useState } from 'react';
    import { Vehicle } from '../../../types';

    export function useAssetManagement(initialVehicles: Vehicle[]) {
      const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
      
      const updateStatus = (id: string, status: Vehicle['status']) => {
        setVehicles(prev => prev.map(v => v.id === id ? { ...v, status } : v));
      };

      return { vehicles, setVehicles, updateStatus };
    }
    ```

---

## 📱 8. Evolução Pragmática de Offline-First à Prova de Falhas

Embora o uso de `localStorage` seja aceitável para tabelas pequenas com dezenas de registros, ele apresenta gargalos graves: limita-se a um volume de até 5MB, bloqueia a thread principal por operações síncronas de escrita contínuas e herda vulnerabilidades em decolagens bruscas de dados do navegador.

Para garantir que operações de pátios logísticos industriais nunca fiquem congeladas se houver dezenas de planilhas ERP acumuladas no terminal local, adota-se o seguinte roadmap de persistência de-para:

```
DE: localStorage síncrono (5MB Max) ──► PARA: IndexedDB assíncrono (Velocidade e Sem Limitadores)
```

### Abstração Recomendada (Localstorage para IndexedDB via localForage):
Mantenha as assinaturas de funções de sincronização idênticas às originais em `src/supabase.ts`, mas altere incrementalmente seus mecanismos internos substituindo drivers convencionais por instâncias seguras e assíncronas do **IndexedDB** por bibliotecas de performance de-para como `localforage` ou utilizando wrappers nativos:

```typescript
// Exemplo de transição sem impactos e de baixo risco em src/supabase.ts
import localforage from 'localforage';

localforage.config({
  name: 'RotaOperational',
  storeName: 'cache_logistica'
});

export async function saveCtrcsLocally(ctrcs: Ctrc[]): Promise<void> {
  // Salva sem travar a thread de renderização da interface
  await localforage.setItem('ctrc_staging_list', ctrcs);
}
```

---

## 📈 9. Expansões Futuras (Escalabilidade de Domínio Cego)

Com essa infraestrutura orientada a domínios consolidada, o software está perfeitamente aparelhado para usufruir de evoluções avançadas de alta escala sem necessidade de retrabalhar códigos de telas correntes:

*   **Multiempresa / Multitransporte integral:** Inclusão de chaves estruturadas `tenant_id` e controle unificado nas tabelas de migrações Supabase.
*   **Controle de Feature Flags no Painel:** Ocultação ou desativação elástica de abas analíticas satélites específicas para filiais de baixa tonelagem física.
*   **Triggers de Auditoria em PostgreSQL:** Criação automática de tabelas temporais baseadas no histórico transacional das novas entidades `Viagem` descritas na seção 4.

---

## 📝 10. Conclusão da Refatoração Progressiva

A transição técnica descrita garante consistência plena ao core operável que foca no dia a dia da triagem física e faturamentos reais no galpão. Ela afasta e resolve a dispersão técnica entre tabelas e telas sem acarretar qualquer risco de lockout à aplicação operacional produtiva.

---

*RotaOperational: Excelência em Arquitetura Logística, Governança, Estabilidade e Resiliência Operacional para Despacho Terrestre Brasileiro.*
