# Segurança do banco: regras e login

O dashboard deixou de confiar no `?acesso=admin` da URL. Quem edita agora entra com
uma **conta Google**, e o próprio banco confere, a cada gravação, se essa conta está
autorizada. As regras ficam em [`database.rules.json`](database.rules.json).

| | Antes | Depois |
|---|---|---|
| Quem grava `/efetivo` | qualquer pessoa, sem login | só o Apps Script; admin grava apenas `abono` e `obs` |
| Quem grava fotos e log | qualquer pessoa | só admin; o log sai assinado com o e-mail real e a hora do servidor |
| Quem grava `/historico` | qualquer visitante | admin e leitor; visitante anônimo não grava |
| Quem apaga o efetivo, o histórico ou o log | qualquer pessoa | ninguém pelo site |
| Leitura | pública | pública **ou** restrita, conforme o comando decidir (`config/leituraPublica`) |
| Log de alterações | público | só admin e leitor (traz o e-mail de quem editou) |

## Papéis

- **admin**: edita abono, observação e fotos. Não altera nenhum dado que vem da
  planilha, não apaga militar nem histórico, não altera nem apaga o log.
- **leitor**: só consulta. Grava o retrato diário da Tendência, o que é útil na TV do quartel.
- **visitante**: sem login, ou com conta Google fora das listas. Consulta só se a leitura
  for pública.
- **Apps Script** (sincronizador): usa o segredo do banco, que passa por cima das regras.
  Nada mudou para ele.

A lista de quem é admin ou leitor fica **no próprio banco**, nos nós `admins` e
`leitores`. Incluir ou tirar alguém não exige mexer nas regras.

A chave de cada conta é o e-mail em minúsculas, com cada **ponto trocado por vírgula**,
porque o Firebase não aceita ponto em chave:

    fulano.de.tal@gmail.com   →   fulano,de,tal@gmail,com

O botão **Compartilhar** do dashboard (visível para admin) faz essa conversão: digite o
e-mail e copie a chave pronta.

---

## Passo a passo no console do Firebase

Console: <https://console.firebase.google.com> → projeto **bepe-dashboard**.
Faça na ordem.

### 0. Guarde as regras atuais (plano de volta)

**Realtime Database → Regras.** Copie tudo o que está lá e salve num arquivo de texto.
Se algo der errado, basta colar de volta e clicar em **Publicar**.

### 1. Ative o login com Google

**Authentication → Sign-in method → Adicionar novo provedor → Google → Ativar.**
Escolha o e-mail de suporte do projeto e **Salve**.

### 2. Autorize o endereço do GitHub Pages

**Authentication → Settings → Domínios autorizados → Adicionar domínio:**

    bruxo2013.github.io

Sem isso, a janela de login recusa o site com o erro `auth/unauthorized-domain`.

### 3. Cadastre quem entra e decida a leitura

**Realtime Database → Dados.** Na raiz, clique em **+** e crie:

| Nó | Chave | Valor |
|---|---|---|
| `admins` | chave de cada administrador (ex.: `fulano,de,tal@gmail,com`) | `true` |
| `leitores` | chave de cada conta que só consulta | `true` |
| `config` | `leituraPublica` | `true` para manter a leitura aberta como hoje; `false` (ou nada) para restringir |

- Digite `true` **sem aspas**. Com aspas vira texto, e o texto `"true"` não vale.
- Se `config/leituraPublica` não for exatamente `true`, a leitura fica **restrita**. Em
  caso de dúvida, o banco fecha em vez de abrir.
- Cada pessoa com a própria conta. É isso que torna o log confiável.
- Para a TV do quartel, crie uma **conta Google só para ela** e cadastre-a em `leitores`.
  Não use a conta dona da planilha: quem sentasse na TV teria acesso à planilha e ao
  Apps Script, que guarda o segredo do banco.

### 4. Publique o dashboard novo e teste o login

Faça o merge da mudança no `master`. O GitHub Pages publica em cerca de um minuto.
Abra o dashboard, clique em **Entrar com Google** e entre com uma conta de `admins`.
O selo do cabeçalho deve mudar para **ADMIN**.

Até o passo 5, o banco continua aberto como antes. O dashboard novo funciona com as
regras antigas.

### 5. Publique as regras

**Realtime Database → Regras.** Apague o conteúdo, cole o arquivo
[`database.rules.json`](database.rules.json) **inteiro** (os comentários `//` podem ficar)
e clique em **Publicar**.

Para conferir antes de publicar, use o **Simulador de regras** da mesma tela. Por
exemplo: tipo *set*, local `/efetivo/0/nome`, sem autenticação. O resultado esperado é
**negado**.

### 6. Confira

- [ ] **Sem login** (janela anônima): o dashboard abre se a leitura for pública e mostra
      o cadeado se for restrita. Não aparece botão de edição.
- [ ] **Gravação sem credencial é recusada.** No terminal:
      `curl -X PUT -d "\"teste\"" https://bepe-dashboard-default-rtdb.firebaseio.com/meta/teste.json`
      deve responder `Permission denied`.
- [ ] **Admin:** editar o abono ou a observação de alguém funciona, e o painel **Log**
      mostra o seu e-mail na alteração.
- [ ] **Sincronizador:** no Apps Script da planilha, execute `testarSincronizacao`. O
      registro deve terminar com `✅ Sincronização concluída` e o cabeçalho do dashboard
      mostrar a hora nova.

---

## Incluir ou tirar alguém

Em **Realtime Database → Dados**, crie ou apague a chave da pessoa em `admins` ou
`leitores`. Vale na hora:

- quem entra na lista precisa recarregar a página;
- quem sai perde a gravação imediatamente, e a leitura também, se ela for restrita.

## Leitura pública ou restrita: a decisão do comando

Com a leitura **pública**, qualquer pessoa que abra o código da página encontra o
endereço do banco e baixa o efetivo **atual e completo**. Isso inclui nome, RG, ID
funcional, função, situação de saúde (LTS, restrições, aguardando reforma), datas de
afastamento, férias, armamento e colete acautelados, observações livres e as fotos. Em
outras palavras: quem são os policiais do BEPE, quem está afastado e quem está armado.
Situação de saúde é **dado pessoal sensível** na LGPD (art. 5º, II, e art. 11).

Com a leitura **restrita**, só contas cadastradas veem. O custo:

- cada pessoa entra uma vez com a conta Google, e a sessão fica salva no aparelho;
- a TV precisa de uma conta de leitor e de um navegador que abra a janela de login;
- no **iPhone, pelo app instalado na tela inicial**, a janela de login pode não voltar
  para o app. Entre pelo Safari. No Android, entrar pelo Chrome já vale para o app
  instalado.

**Recomendação: restringir.** Retirar o `efetivo_data.js` do site sem restringir a
leitura adianta pouco, porque o banco entrega para qualquer um uma versão mais nova e
mais completa do mesmo dado.

Para mudar depois, basta trocar `config/leituraPublica` no console. Não é preciso mexer
nas regras.

## O sincronizador (Apps Script)

Não mudou e continua funcionando. O segredo do banco (`FIREBASE_SECRET`, em
Propriedades do Script) ignora as regras. Cuidados:

- se o segredo for trocado no console, atualize `FIREBASE_SECRET`, ou a sincronização
  para (o e-mail de falha avisa);
- quem pode editar o Apps Script consegue ler o segredo, e isso equivale a acesso total
  ao banco. Mantenha a lista de editores da planilha curta.

## Dados pessoais no site

| Onde | Situação |
|---|---|
| `/efetivo` e `/fotos` no banco | fecham quando o comando restringir a leitura |
| `efetivo_data.js` (cópia antiga do efetivo) | **retirado do site** |
| `relatorios/` (relatórios gerados pelas skills, com nomes e situação de saúde) | **retirados do site**; os próximos ficam só no computador (`.gitignore`) |

O que **não** chega ao Firebase: CPF, telefone, e-mail e endereço. O sincronizador só
envia as colunas de que o dashboard precisa.

Tudo o que já esteve no repositório continua no **histórico do git**, e o repositório
é público. Para tirar de lá também, há duas saídas:

- **tornar o repositório privado.** O GitHub Pages de repositório privado exige o plano
  GitHub Pro, e o site continua público, mas o histórico some da vista;
- **reescrever o histórico** (`git filter-repo`) e forçar o push. Isso muda o
  identificador de todos os commits, obriga a refazer os branches abertos e exige pedir
  ao suporte do GitHub a limpeza das cópias em cache. Cópias que alguém já baixou não
  voltam.

Ao atualizar a pasta local com `git pull` depois do merge, os arquivos retirados também
saem do disco. Se precisar de algum, ele continua recuperável pelo histórico.

## Limites conhecidos

- **Login por janela (popup).** O site está no GitHub Pages, fora do domínio do Firebase,
  e os navegadores atuais bloqueiam o método por redirecionamento nesse caso. Se o
  navegador bloquear a janela, libere pop-ups para o site.
- **Admin é de confiança.** Ele pode escrever abono, observação, fotos e entradas de log
  em nome próprio. Não consegue alterar os dados da planilha, apagar nada, nem assinar
  como outra pessoa.
- **Leitor grava o retrato diário.** Um leitor mal-intencionado poderia gravar números
  falsos no retrato do dia. Visitante anônimo não pode.

## Testar as regras (para quem for mudar este arquivo)

Os testes rodam no emulador oficial do Firebase, na própria máquina, com dados fictícios.
Precisam de Node 20+ e Java 11+. Dentro desta pasta:

    npx firebase-tools emulators:exec --only database --project demo-bepe "node --test testes/regras.test.mjs"

São 35 casos: leitura pública e restrita, tentativas de se promover a admin, cada campo
travado do efetivo, formato de foto, histórico e log, e o sincronizador. Qualquer
mudança nas regras deve manter todos passando.
