# Operational Rules

## 1. Filial Operacional
- A filial selecionada no cabeçalho representa a **unidade responsável pela entrega/destino** da carga.
- **Não** representa a localização atual ou armazém atual.
- Exemplo: Uma carga fisicamente parada em BHZ, mas com destino operacional VGA, deve aparecer ao selecionar VGA, e não ao selecionar BHZ.
- Localização atual continua sendo um filtro em separado.

## 2. Subcontratos
- Subcontratos são documentos operacionais equivalentes a CTRCs.
- Exemplo: VGA (CTRC) e VGS (Subcontrato).
- Não descartar subcontrato devido à série ser diferente.
- Ambos devem ser roteirizáveis se representam carga operacional.

## 3. Ocorrência e Localização
- Na coluna Ocorrência / Localização:
  - **Linha 1:** Código e descrição da ocorrência.
  - **Linha 2:** Localização pura.
- O Setor Ocorrencia não deve aparecer concatenado na localização.

## 4. Setor Ocorrência
- A coluna OBS / DISP exibe o Setor ou Disponibilidade.
- O filtro de Setor deve ser separado do filtro de Ocorrência.
- A **Disponibilidade** deriva diretamente do Setor Ocorrencia.

## 5. Mapeamento de Setor Ocorrencia
A disponibilidade é mapeada para os seguintes valores de Setor:
- Disponível
- Transferência
- Em Rota
- Agendamento
- Solução
- Retidos
- Cobrança
- Frete
- Disponível Transferencia
- Disponível Cobranca
- Disponível Pendência
- Indefinido

## 6. Exemplos de Ocorrências
- **OC 57** -> Disponível
- **OC 59** -> Disponível
- **OC 70** -> Cobrança
- **OC 14/15/30** -> Agendamento
- **OC 60** -> Em Rota
- **OC 61/69** -> Transferência
- **OC 3** -> Retidos
- **OC 90** -> Disponível Cobranca
- **OC 98** -> Disponível Pendência

## 7. Regra de Fallback
- Não usar "Aguardar" como fallback geral.
- Ocorrência não mapeada deve aparecer como "Indefinido" ou "Sem Ocorrência".

## 8. Errata e Correções (Atualização da Mesa)
- A filial operacional (unidade) deve ser resolvida obrigatoriamente pelas **3 primeiras letras de Praça Destino** (ou variações como `pracaDestino`, `destino_praca`, etc).
  - Exemplos: `VGAP` -> `VGA`, `VGAR` -> `VGA`, `BHZP` -> `BHZ`, `BHZR` -> `BHZ`.
- O importador deve auto-mapear e persistir a coluna "Praça de Destino" do CSV/TXT.
- O enriquecimento logístico não pode sobrescrever ou apagar a `pracaDestino` importada.
- O fallback para cidade/rota só ocorre se a Praça Destino não for fornecida.
- `pracaHub` **não** deve ser usado como primeira fonte se representar localização atual.
- Localização física (armazém atual) ou textos como `RCS VGA - NO ARMAZEM...` são sempre filtros ou exibições separadas e não definem a filial da Mesa.
