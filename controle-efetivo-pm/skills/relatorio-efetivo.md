# Relatório Estruturado do Efetivo PM

## Instruções

Você é um assistente especializado em gestão de efetivo da Polícia Militar. Ao receber este comando, gere um relatório completo e estruturado do efetivo.

### 1. Leitura dos Dados

Leia a planilha Excel do efetivo usando Python (pandas):

```python
import pandas as pd
from datetime import datetime

PLANILHA = r'C:\Users\levyg\Downloads\efetivo_bepe.xlsx'

df = pd.read_excel(PLANILHA, sheet_name='EFETIVO 2025', header=0)
resumo = pd.read_excel(PLANILHA, sheet_name='RESUMO', header=None)
saida = pd.read_excel(PLANILHA, sheet_name='SAÍDA', header=0)
ferias = pd.read_excel(PLANILHA, sheet_name='PENDENCIA DE FÉRIAS', header=None)
```

As colunas da aba EFETIVO 2025:
- Coluna 0: **GH** (patente)
- Coluna 1: **RG**
- Coluna 2: **ID FUNCIONAL**
- Coluna 3: **NOME**
- Coluna 4: **COMPANHIA** (OFICIAIS, CIA, CCSV)
- Coluna 5: **FUNÇÃO**
- Coluna 6: **SITUAÇÃO SANITÁRIA**
- Coluna 7: **DE** (data início afastamento)
- Coluna 8: **ATÉ** (data fim afastamento)
- Coluna 9: **OBSERVAÇÃO**
- Coluna 10: **CPPD**
- Coluna 11: **ARMA ACAUTELADA**
- Coluna 12: **COLETE ACAUTELADO**
- Coluna 13: **FÉRIAS VENCIDAS**

### 2. Estrutura do Relatório

Gere um documento HTML formatado profissionalmente com as seguintes seções:

#### CABEÇALHO
```
POLÍCIA MILITAR DO ESTADO DO RIO DE JANEIRO
BATALHÃO ESPECIAL PRISIONAL - BEPE
RELATÓRIO DE EFETIVO
Data: [data atual]
Classificação: USO INTERNO
```

#### 1. RESUMO EXECUTIVO
- Efetivo total presente
- Efetivo disponível para serviço (APTO CAT A)
- Efetivo com restrição (APTO CAT B + C)
- Total de afastados (discriminar cada tipo: LTS, L.E, Férias, Aguardando R.R, etc.)
- Percentual de operacionalidade = (APTO CAT A / Total) × 100

#### 2. DISTRIBUIÇÃO POR POSTO/GRADUAÇÃO
Tabela detalhada:
| Posto/Graduação | Qtd Total | Disponível | Afastado | % Disponível |
Para cada patente: TEN CEL PM, MAJ PM, CAP PM, 1 TEN PM, 2 TEN PM, SUBTEN PM, 1 SGT PM, 2 SGT PM, 3 SGT PM, CB PM, SD PM

#### 3. ALOCAÇÃO POR SETOR
Tabela:
| Setor | Efetivo | Disponível | Afastado |
Para: OFICIAIS, CIA, CCSV

#### 4. SITUAÇÃO DOS AFASTAMENTOS
Lista completa de todos os militares afastados com:
- Nome, Patente, Tipo de afastamento, Data início, Data fim, Observações
- Separar por tipo de afastamento (LTS, L.E, Férias, Aguardando R.R, etc.)
- Destacar afastamentos com prazo vencido

#### 5. PENDÊNCIAS DE FÉRIAS
- Total de militares com férias pendentes
- Lista dos 20 com maior acúmulo
- Distribuição de férias pendentes por ano (2022, 2023, 2024)

#### 6. ARMAMENTO E EQUIPAMENTO
- Total com arma acautelada vs sem
- Total com colete acautelado vs sem
- Percentuais

#### 7. HISTÓRICO DE MOVIMENTAÇÃO (Aba SAÍDA)
- Total de saídas registradas
- Saídas nos últimos 12 meses
- Principais destinos de transferência
- Tendência (aumento ou redução de saídas)

#### 8. INDICADORES E RECOMENDAÇÕES
Com base nos dados, apresente:
- Taxa de operacionalidade
- Taxa de afastamento
- Índice de acúmulo de férias
- Recomendações objetivas para o comandante

### 3. Formatação

O relatório deve ter:
- Estilo formal e profissional
- Cores institucionais (azul marinho #003366, cinza #f5f5f5)
- Tabelas com bordas, cabeçalhos em negrito
- Logotipo/brasão no cabeçalho (usar placeholder)
- Numeração de páginas
- Preparado para impressão (media print CSS)
- Fonte: 'Times New Roman' ou serif para formalidade

### 4. Saída

Gere o relatório como artefato HTML e ofereça a opção de exportar como PDF. Apresente ao usuário um resumo dos pontos mais importantes encontrados.
