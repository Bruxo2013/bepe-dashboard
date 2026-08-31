# Dashboard Visual do Efetivo PM

## Instruções

Você é um assistente especializado em gestão de efetivo da Polícia Militar. Ao receber este comando, execute os seguintes passos:

### 1. Leitura dos Dados

Leia a planilha Excel do efetivo usando Python (pandas):

```python
import pandas as pd

PLANILHA = r'C:\Users\levyg\Downloads\efetivo_bepe.xlsx'

# Ler aba principal
df = pd.read_excel(PLANILHA, sheet_name='EFETIVO 2025', header=0)

# Ler aba de resumo
resumo = pd.read_excel(PLANILHA, sheet_name='RESUMO', header=None)

# Ler aba de saída
saida = pd.read_excel(PLANILHA, sheet_name='SAÍDA', header=0)

# Ler aba de férias
ferias = pd.read_excel(PLANILHA, sheet_name='PENDENCIA DE FÉRIAS', header=None)
```

As colunas principais da aba EFETIVO 2025 são:
- Coluna 0: **GH** (Graduação/Hierarquia - patente)
- Coluna 1: **RG**
- Coluna 2: **ID FUNCIONAL**
- Coluna 3: **NOME**
- Coluna 4: **COMPANHIA** (OFICIAIS, CIA, CCSV)
- Coluna 5: **FUNÇÃO** (cargo ou situação atual)
- Coluna 6: **SITUAÇÃO SANITÁRIA** (APTO CAT A, APTO CAT B, APTO CAT C, LTS, AGUARDANDO R.R)
- Coluna 7: **DE** (data início afastamento)
- Coluna 8: **ATÉ** (data fim afastamento)
- Coluna 9: **OBSERVAÇÃO**
- Coluna 10: **CPPD** (SIM/NÃO)
- Coluna 11: **ARMA ACAUTELADA** (SIM/NÃO)
- Coluna 12: **COLETE ACAUTELADO** (SIM/NÃO)
- Coluna 13: **FÉRIAS VENCIDAS**

### 2. Processamento

Calcule as seguintes métricas a partir dos dados reais da planilha:

**Totais:**
- Efetivo total (linhas válidas com nome preenchido)
- Disponíveis (SITUAÇÃO SANITÁRIA = "APTO CAT A")
- Afastados (LTS, L.E, AGUARDANDO R.R, FÉRIAS, CURSO, PRESO, LTIP, LTSPF, LIC MATERNIDADE, LIC PATERNIDADE, AGREGADO, BAIXADO, COVID)
- Oficiais vs Praças (baseado na coluna GH/patente)

**Distribuição por Patente (GH):**
- TEN CEL PM, MAJ PM, CAP PM, 1 TEN PM, 2 TEN PM, ASP OF PM
- SUBTEN PM, 1 SGT PM, 2 SGT PM, 3 SGT PM, CB PM, SD PM

**Alocação por Setor (COMPANHIA):**
- OFICIAIS, CIA, CCSV

**Situação Sanitária:**
- APTO CAT A, APTO CAT B, APTO CAT C, LTS, outros

**Afastamentos ativos** (onde DE e ATÉ estão preenchidos):
- Listar com nome, tipo de afastamento e datas

### 3. Geração do Dashboard

Gere um artefato HTML interativo com as seguintes seções:

#### Cabeçalho
- Título: "DASHBOARD DO EFETIVO - BEPE"
- Data/hora da consulta
- Indicador de última atualização

#### Cards Principais (números grandes, coloridos)
- 🟢 **Efetivo Total**: número total
- 🔵 **Disponíveis**: APTO CAT A
- 🟡 **Restritos**: APTO CAT B + APTO CAT C
- 🔴 **Afastados**: total de afastados (LTS + L.E + Férias + etc.)
- 🟣 **Pendência Férias**: quantidade com férias vencidas

#### Gráfico de Distribuição por Patente
- Gráfico de barras horizontais mostrando quantidade por cada patente
- Cores diferenciadas para oficiais e praças

#### Alocação por Setor
- Gráfico de pizza/donut: OFICIAIS vs CIA vs CCSV

#### Situação Sanitária
- Gráfico de barras: APTO A, APTO B, APTO C, LTS, outros

#### Lista de Afastados
- Tabela com: Nome, Patente, Tipo de Afastamento, Data Início, Data Fim
- Destacar em vermelho os que estão com afastamento vencido (ATÉ < data atual)

#### Estilo Visual
- Fundo escuro (#1a1a2e) com cards em cores vibrantes
- Font: 'Segoe UI', system-ui, sans-serif
- Cards com sombra e bordas arredondadas
- Responsivo para diferentes tamanhos de tela
- Use Chart.js via CDN para os gráficos

### 4. Apresentação

Após gerar o dashboard, apresente um resumo textual curto com os números principais e ofereça ao usuário a possibilidade de filtrar por setor, patente ou status.
