// Testes das regras do Realtime Database contra o emulador oficial do Firebase.
// Nenhuma requisicao sai da maquina: o emulador roda local e os dados sao ficticios.
//
// Rodar de dentro da pasta firebase/ (precisa de Node 20+ e Java 11+ no PATH):
//   npx firebase-tools emulators:exec --only database --project demo-bepe "node --test testes/regras.test.mjs"
//
// As contas sao tokens sem assinatura, que o emulador aceita. O "owner" e' a
// credencial de administrador do banco -- o mesmo nivel do segredo que o Apps
// Script usa: ignora as regras.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HOST  = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9000';
const NS    = 'regras-teste';
const REGRAS = readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8');

// ─── Contas ─────────────────────────────────────────────────────────────────
function conta(email, extra = {}) {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const agora = Math.floor(Date.now() / 1000);
  const uid = 'uid-' + String(email).replace(/[^a-z0-9]/gi, '');
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: 'https://securetoken.google.com/demo-bepe', aud: 'demo-bepe',
    iat: agora, exp: agora + 3600, auth_time: agora, sub: uid, user_id: uid,
    email, email_verified: true,
    firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [uid], email: [email] } },
    ...extra,
  }) + '.';
}

const OWNER         = 'owner';
const ANONIMO       = null;
const ADMIN         = conta('admin.um@example.com');
const ADMIN_CAIXA   = conta('Caixa.Alta@Example.com');              // lista guarda caixa,alta@example,com
const NAO_VERIFICADO = conta('nao.verificado@example.com', { email_verified: false });
const LEITOR        = conta('leitor.tv@example.com');
const QUALQUER      = conta('curioso@example.com');               // conta Google fora das listas

// ─── Dados ficticios ────────────────────────────────────────────────────────
const militar = (i, extra = {}) => ({
  gh: 'SD PM', rg: String(10000 + i), id: `${1000000 + i}-0`, nome: `MILITAR FICTICIO ${i}`,
  cia: 'CIA', funcao: 'TROPA', sit: 'APTO CAT A', de: '', ate: '', arma: 'SIM', colete: 'SIM',
  ferias: '', cppd: 'SIM', abono: '', obs: '', ...extra,
});

const SEMENTE = {
  efetivo:   [militar(0), militar(1), militar(2)],
  meta:      { ultimaSync: '2026-09-24T12:00:00.000Z' },
  fotos:     { rg_10000: 'data:image/jpeg;base64,/9j/AAAA' },
  historico: { '2026-09-23': { data: '2026-09-23', total: 3, aptoA: 3, operacionalidade: 100, ts: 1727000000000 } },
  logs:      { '-antigo': { tipo: 'edit', msg: 'entrada antiga', usuario: 'admin.um@example.com', ts: 1727000000000 } },
  admins:    { 'admin,um@example,com': true, 'caixa,alta@example,com': true, 'nao,verificado@example,com': true },
  leitores:  { 'leitor,tv@example,com': true },
  config:    { leituraPublica: true },
};

const retrato = (dia, extra = {}) => ({
  data: dia, total: 3, aptoA: 2, aptoB: 1, aptoC: 0, lts: 0, outros: 0, rr: 0, reforma: 0,
  fer: 0, tc: 0, abono: 0, armaSim: 3, coleteSim: 3, pronto: 2, comCppd: 3,
  operacionalidade: 66.7, ts: Date.now(), ...extra,
});

const entradaLog = (extra = {}) => ({
  tipo: 'edit', msg: '<strong>MILITAR FICTICIO 1</strong> — Observação atualizada',
  detalhes: '', usuario: 'admin.um@example.com', ts: { '.sv': 'timestamp' }, ...extra,
});

// ─── REST do emulador ───────────────────────────────────────────────────────
// Token de usuario vai no parametro ?auth=. O cabecalho "Authorization: Bearer"
// e' credencial de administrador (OAuth de servico): o emulador aceita QUALQUER
// valor ali e ignora as regras -- com ele, todo teste de negacao passaria em falso.
async function rest(metodo, caminho, auth, corpo, consulta = {}) {
  const url = new URL(`http://${HOST}/${caminho.replace(/^\//, '')}.json`);
  url.searchParams.set('ns', NS);
  for (const [k, v] of Object.entries(consulta)) url.searchParams.set(k, v);
  const headers = { 'Content-Type': 'application/json' };
  if (auth === OWNER) headers.Authorization = 'Bearer owner';
  else if (auth) url.searchParams.set('auth', auth);
  const r = await fetch(url, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const texto = await r.text();
  return { status: r.status, corpo: texto ? JSON.parse(texto) : null };
}

const ler     = (c, a, q)    => rest('GET', c, a, undefined, q);
const gravar  = (c, a, v)    => rest('PUT', c, a, v);
const mesclar = (c, a, v)    => rest('PATCH', c, a, v);
const apagar  = (c, a)       => rest('DELETE', c, a);

async function permitido(p) { const r = await p; assert.equal(r.status, 200, `esperava 200, veio ${r.status}: ${JSON.stringify(r.corpo)}`); return r; }
async function negado(p)    { const r = await p; assert.equal(r.status, 401, `esperava 401, veio ${r.status}: ${JSON.stringify(r.corpo)}`); return r; }

// ─── Preparo ────────────────────────────────────────────────────────────────
test('as regras sobem no emulador (comentarios aceitos)', async () => {
  const r = await fetch(`http://${HOST}/.settings/rules.json?ns=${NS}`, {
    method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: REGRAS,
  });
  assert.equal(r.status, 200, await r.text());
});

beforeEach(async () => {
  const r = await gravar('/', OWNER, SEMENTE);
  assert.equal(r.status, 200);
});

const restrito = () => apagar('config', OWNER);

// ─── Leitura ────────────────────────────────────────────────────────────────
test('leitura publica ligada: anonimo le efetivo, meta, fotos e historico', async () => {
  for (const c of ['efetivo', 'meta', 'fotos', 'historico']) await permitido(ler(c, ANONIMO));
});

test('log nunca e publico, nem com a leitura publica ligada', async () => {
  await negado(ler('logs', ANONIMO));
  await negado(ler('logs', QUALQUER));
});

test('ninguem de fora le as listas, a configuracao ou a raiz', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR]) {
    for (const c of ['admins', 'leitores', 'config', '/']) await negado(ler(c, a));
  }
});

test('leitura restrita: anonimo e conta Google qualquer nao leem nada', async () => {
  await restrito();
  for (const a of [ANONIMO, QUALQUER]) {
    for (const c of ['efetivo', 'meta', 'fotos', 'historico', 'logs']) await negado(ler(c, a));
  }
});

test('leitura restrita: leitor e admin leem tudo o que o dashboard usa', async () => {
  await restrito();
  for (const a of [LEITOR, ADMIN]) {
    for (const c of ['efetivo', 'meta', 'fotos', 'historico', 'logs']) await permitido(ler(c, a));
  }
});

test('leitura restrita: e-mail nao verificado nao vale, mesmo estando na lista', async () => {
  await restrito();
  await negado(ler('efetivo', NAO_VERIFICADO));
});

test('leitura restrita: config.leituraPublica em texto ("true") nao abre a leitura', async () => {
  await gravar('config/leituraPublica', OWNER, 'true');
  await negado(ler('efetivo', ANONIMO));
});

test('cada conta consulta so a propria chave nas listas', async () => {
  await permitido(ler('admins/leitor,tv@example,com', LEITOR));      // resposta: null
  await permitido(ler('leitores/leitor,tv@example,com', LEITOR));
  await negado(ler('admins/admin,um@example,com', LEITOR));
  await negado(ler('admins/admin,um@example,com', ANONIMO));
});

// ─── Escalada de privilegio ─────────────────────────────────────────────────
test('ninguem pelo site se inclui nas listas ou mexe na configuracao', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR, ADMIN]) {
    await negado(gravar('admins/curioso@example,com', a, true));
    await negado(gravar('leitores/curioso@example,com', a, true));
    await negado(gravar('config/leituraPublica', a, true));
    await negado(gravar('/', a, {}));
  }
});

// ─── /efetivo ───────────────────────────────────────────────────────────────
test('anonimo, conta qualquer e leitor nao gravam abono/obs', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR, NAO_VERIFICADO]) {
    await negado(gravar('efetivo/1/obs', a, 'x'));
    await negado(gravar('efetivo/1', a, militar(1, { obs: 'x' })));
  }
});

test('ninguem pelo site substitui ou apaga o efetivo inteiro', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR, ADMIN]) {
    await negado(gravar('efetivo', a, [militar(0)]));
    await negado(apagar('efetivo', a));
  }
});

test('admin grava o registro inteiro mudando so abono e obs (transacao do dashboard)', async () => {
  await permitido(gravar('efetivo/1', ADMIN, militar(1, { abono: '2024-03-01', obs: 'Em curso' })));
  const r = await ler('efetivo/1', OWNER);
  assert.equal(r.corpo.abono, '2024-03-01');
  assert.equal(r.corpo.obs, 'Em curso');
});

test('admin grava abono e obs direto no campo', async () => {
  await permitido(gravar('efetivo/1/abono', ADMIN, '2024-03-01'));
  await permitido(gravar('efetivo/1/obs', ADMIN, 'Observacao'));
  await permitido(gravar('efetivo/1/abono', ADMIN, ''));
});

test('admin grava abono/obs de varios militares numa atualizacao so', async () => {
  await permitido(mesclar('efetivo', ADMIN, { '1/abono': '2024-03-01', '2/obs': 'ok' }));
});

test('admin nao altera campo da planilha, nem de carona numa gravacao valida', async () => {
  await negado(gravar('efetivo/1', ADMIN, militar(1, { nome: 'OUTRO NOME', obs: 'x' })));
  await negado(mesclar('efetivo/1', ADMIN, { sit: 'LTS' }));
  await negado(gravar('efetivo/1/rg', ADMIN, '99999'));
  await negado(mesclar('efetivo', ADMIN, { '1/abono': '2024-03-01', '2/nome': 'OUTRO' }));
  const r = await ler('efetivo/1', OWNER);
  assert.equal(r.corpo.abono, '', 'a atualizacao recusada nao pode ter gravado pela metade');
});

test('admin nao apaga campo da planilha', async () => {
  await negado(apagar('efetivo/1/sit', ADMIN));
  const semSit = militar(1); delete semSit.sit;
  await negado(gravar('efetivo/1', ADMIN, semSit));
});

test('admin nao acrescenta campo nem militar, e nao apaga militar', async () => {
  await negado(mesclar('efetivo/1', ADMIN, { telefone: '21999999999' }));
  await negado(gravar('efetivo/99', ADMIN, militar(99)));
  await negado(apagar('efetivo/1', ADMIN));
});

test('abono so em data AAAA-MM-DD; obs ate 1000 caracteres', async () => {
  await negado(gravar('efetivo/1/abono', ADMIN, 'desde marco'));
  await negado(gravar('efetivo/1/abono', ADMIN, 20240301));
  await negado(gravar('efetivo/1/obs', ADMIN, 'x'.repeat(1001)));
  await permitido(gravar('efetivo/1/obs', ADMIN, 'x'.repeat(1000)));
});

test('e-mail com maiusculas no token casa com a chave minuscula da lista', async () => {
  await permitido(gravar('efetivo/1/obs', ADMIN_CAIXA, 'ok'));
});

// ─── /meta e sincronizador ──────────────────────────────────────────────────
test('ninguem pelo site grava /meta', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR, ADMIN]) await negado(gravar('meta/ultimaSync', a, 'x'));
});

test('o sincronizador (credencial de administrador do banco) ignora as regras', async () => {
  await restrito();
  await permitido(ler('efetivo', OWNER));
  await permitido(gravar('efetivo', OWNER, [militar(5), militar(6)]));
  await permitido(gravar('meta/ultimaSync', OWNER, new Date().toISOString()));
});

// ─── /fotos ─────────────────────────────────────────────────────────────────
test('admin grava e apaga foto', async () => {
  await permitido(gravar('fotos/rg_10001', ADMIN, 'data:image/jpeg;base64,/9j/BBBB'));
  await permitido(apagar('fotos/rg_10001', ADMIN));
});

test('so admin grava ou apaga foto', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR]) {
    await negado(gravar('fotos/rg_10001', a, 'data:image/jpeg;base64,/9j/BBBB'));
    await negado(apagar('fotos/rg_10000', a));
  }
});

test('foto so como imagem embutida, com chave rg_ e tamanho limitado', async () => {
  await negado(gravar('fotos/rg_10001', ADMIN, 'https://exemplo.com/rastreio.gif'));
  await negado(gravar('fotos/outra_chave', ADMIN, 'data:image/jpeg;base64,/9j/BBBB'));
  await negado(gravar('fotos/rg_10001', ADMIN, 'data:image/jpeg;base64,' + 'A'.repeat(150000)));
  await negado(gravar('fotos', ADMIN, {}));
});

// ─── /historico ─────────────────────────────────────────────────────────────
test('visitante anonimo e conta qualquer nao gravam retrato', async () => {
  await negado(gravar('historico/2026-09-24', ANONIMO, retrato('2026-09-24')));
  await negado(gravar('historico/2026-09-24', QUALQUER, retrato('2026-09-24')));
});

test('leitor e admin gravam o retrato do dia', async () => {
  await permitido(gravar('historico/2026-09-24', LEITOR, retrato('2026-09-24')));
  await permitido(gravar('historico/2026-09-24', ADMIN, retrato('2026-09-24', { total: 4 })));
});

test('retrato com formato errado e recusado', async () => {
  await negado(gravar('historico/24-09-2026', LEITOR, retrato('24-09-2026')));
  await negado(gravar('historico/2026-09-24', LEITOR, retrato('2026-09-25')));
  await negado(gravar('historico/2026-09-24', LEITOR, retrato('2026-09-24', { total: '999' })));
  await negado(gravar('historico/2026-09-24', LEITOR, retrato('2026-09-24', { lts: -1 })));
  await negado(gravar('historico/2026-09-24', LEITOR, retrato('2026-09-24', { operacionalidade: 150 })));
  await negado(gravar('historico/2026-09-24', LEITOR, retrato('2026-09-24', { html: '<img src=x onerror=alert(1)>' })));
  const semTotal = retrato('2026-09-24'); delete semTotal.total;
  await negado(gravar('historico/2026-09-24', LEITOR, semTotal));
});

test('ninguem pelo site apaga o historico', async () => {
  for (const a of [ANONIMO, LEITOR, ADMIN]) {
    await negado(apagar('historico/2026-09-23', a));
    await negado(gravar('historico', a, {}));
  }
});

// ─── /logs ──────────────────────────────────────────────────────────────────
test('admin acrescenta log com o proprio e-mail e a hora do servidor', async () => {
  const r = await permitido(rest('POST', 'logs', ADMIN, entradaLog()));
  const salvo = await ler('logs/' + r.corpo.name, OWNER);
  assert.equal(typeof salvo.corpo.ts, 'number');
});

test('admin nao assina log com o e-mail de outra pessoa nem escolhe a hora', async () => {
  await negado(rest('POST', 'logs', ADMIN, entradaLog({ usuario: 'outro@example.com' })));
  await negado(rest('POST', 'logs', ADMIN, entradaLog({ ts: Date.now() - 86400000 })));
});

test('log so acrescenta: ninguem altera nem apaga entrada antiga', async () => {
  await negado(gravar('logs/-antigo', ADMIN, entradaLog()));
  await negado(apagar('logs/-antigo', ADMIN));
  await negado(gravar('logs', ADMIN, {}));
});

test('log com campo extra ou tipo desconhecido e recusado', async () => {
  await negado(rest('POST', 'logs', ADMIN, entradaLog({ extra: 'x' })));
  await negado(rest('POST', 'logs', ADMIN, entradaLog({ tipo: 'hack' })));
});

test('so admin grava log', async () => {
  for (const a of [ANONIMO, QUALQUER, LEITOR]) {
    const email = a === LEITOR ? 'leitor.tv@example.com' : 'curioso@example.com';
    await negado(rest('POST', 'logs', a, entradaLog({ usuario: email })));
  }
});

test('a consulta do painel de log (ordem por ts, ultimos 100) tem indice', async () => {
  await permitido(ler('logs', LEITOR, { orderBy: '"ts"', limitToLast: '100' }));
});
