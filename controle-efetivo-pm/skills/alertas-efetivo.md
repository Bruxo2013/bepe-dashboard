# Alertas Automáticos do Efetivo PM

## Instruções

Você é um assistente especializado em gestão de efetivo da Polícia Militar. Ao receber este comando, analise os dados do efetivo e gere alertas categorizados por severidade.

### 1. Leitura dos Dados

```python
import pandas as pd
from datetime import datetime, timedelta

PLANILHA = r'C:\Users\levyg\Downloads\efetivo_bepe.xlsx'

df = pd.read_excel(PLANILHA, sheet_name='EFETIVO 2025', header=0)
resumo = pd.read_excel(PLANILHA, sheet_name='RESUMO', header=None)
saida = pd.read_excel(PLANILHA, sheet_name='SAÍDA', header=0)
ferias = pd.read_excel(PLANILHA, sheet_name='PENDENCIA DE FÉRIAS', header=None)

hoje = datetime.now()
```

As colunas da aba EFETIVO 2025:
- Coluna 0: **GH** (patente)
- Coluna 3: **NOME**
- Coluna 4: **COMPANHIA** (OFICIAIS, CIA, CCSV)
- Coluna 5: **FUNÇÃO**
- Coluna 6: **SITUAÇÃO SANITÁRIA**
- Coluna 7: **DE** (data início afastamento)
- Coluna 8: **ATÉ** (data fim afastamento)
- Coluna 11: **ARMA ACAUTELADA**
- Coluna 12: **COLETE ACAUTELADO**
- Coluna 13: **FÉRIAS VENCIDAS**

### 2. Regras de Alertas

Analise os dados e gere alertas nas seguintes categorias:

#### 🔴 CRÍTICO (Ação imediata necessária)

1. **Afastamento vencido**: Militar com data ATÉ < hoje e sem registro de retorno
   - Verificar se a coluna ATÉ tem data no passado
   - Listar nome, patente, data fim, dias em atraso

2. **Operacionalidade abaixo de 70%**: Se (APTO CAT A / Total) < 0.70
   - Indicar percentual atual e déficit

3. **Setor com menos de 50% do efetivo disponível**
   - Verificar cada COMPANHIA separadamente
   - Alertar se alguma está abaixo do limiar

4. **Militar sem arma ou colete acautelado sendo APTO CAT A**
   - Listar quem está disponível para serviço mas sem equipamento

#### 🟡 AVISO (Atenção necessária em breve)

5. **Afastamento vencendo em 30 dias**: ATÉ está nos próximos 30 dias
   - Listar nome, patente, data fim, dias restantes

6. **Acúmulo excessivo de férias**: Militar com férias pendentes de 2+ anos
   - Ler coluna FÉRIAS VENCIDAS e aba PENDENCIA DE FÉRIAS
   - Listar os mais críticos

7. **Alta rotatividade**: Se aba SAÍDA mostra muitas saídas recentes (últimos 6 meses)
   - Calcular média mensal e comparar com histórico

#### 🟠 ATENÇÃO (Monitorar)

8. **Concentração de afastamentos**: Muitos afastamentos no mesmo período
   - Verificar se há picos

9. **Militares APTO CAT B/C há muito tempo**: Sem atualização de situação sanitária
   - Listar quem está restrito

10. **Aguardando R.R prolongado**: Militares aguardando reserva remunerada
    - Listar com tempo de espera

#### ℹ️ INFO (Informativo)

11. **Estatísticas gerais**: Resumo do estado atual
12. **Tendências**: Comparar com dados anteriores se disponíveis
13. **Próximos eventos**: Retornos previstos, fins de afastamento

### 3. Formato de Saída

Gere um artefato HTML com o painel de alertas:

#### Layout
- Cards organizados por severidade (CRÍTICO > AVISO > ATENÇÃO > INFO)
- Cada card com:
  - Ícone de severidade e cor correspondente
  - Título do alerta
  - Descrição detalhada
  - Lista de militares afetados (se aplicável)
  - Ação recomendada
  - Data/hora da análise

#### Cores
- CRÍTICO: fundo #fee2e2, borda #ef4444
- AVISO: fundo #fef3c7, borda #f59e0b
- ATENÇÃO: fundo #ffedd5, borda #f97316
- INFO: fundo #dbeafe, borda #3b82f6

#### Cabeçalho
- "PAINEL DE ALERTAS - EFETIVO BEPE"
- Contadores: X Críticos | Y Avisos | Z Atenções | W Info
- Data/hora da análise

#### Estilo
- Design limpo e profissional
- Font: 'Segoe UI', system-ui
- Cards com sombra suave
- Animação sutil nos cards críticos (pulso na borda)
- Responsivo

### 4. Resumo

Após gerar o painel, apresente um resumo textual dos alertas mais importantes e as ações recomendadas prioritárias.
