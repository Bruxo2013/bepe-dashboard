// Service worker do Dashboard Efetivo BEPE.
//
// Estrategia deliberada:
//   - HTML e efetivo_data.js  -> REDE PRIMEIRO, cache so' como rede de seguranca.
//     Codigo velho preso em cache ja' causou problema aqui (o CEL AGUIAR nao
//     aparecia porque o navegador servia a versao antiga). Online sempre pega
//     o mais novo; offline cai no ultimo que funcionou.
//   - vendor/ e icones      -> CACHE PRIMEIRO. Sao arquivos versionados que
//     so' mudam quando trocamos a versao da biblioteca.
//   - Firebase              -> NAO intercepta. O tempo real usa WebSocket e
//     qualquer interferencia aqui quebraria a sincronizacao.

const VERSAO = 'bepe-v2';

const ESSENCIAIS = [
  './dashboard_efetivo.html',
  './efetivo_data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './vendor/chart.umd.min.js',
  './vendor/xlsx.full.min.js',
  './vendor/firebase-app-compat.js',
  './vendor/firebase-database-compat.js',
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(VERSAO)
      // Dois cuidados aqui:
      // 1) cache:'reload' obriga a buscar da REDE. Sem isso o cache.add pega o
      //    que estiver no cache HTTP do navegador, e o app instalado nasce com
      //    uma versao velha congelada -- foi o que aconteceu no primeiro teste.
      // 2) allSettled em vez de addAll, que falharia inteiro por um so' arquivo.
      .then(cache => Promise.allSettled(
        ESSENCIAIS.map(u => cache.add(new Request(u, { cache: 'reload' })))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase e afins passam direto

  const imutavel = url.pathname.includes('/vendor/') || /icon-\d+\.png$/.test(url.pathname);

  if (imutavel) {
    evento.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
        return resp;
      }))
    );
    return;
  }

  // Rede primeiro para tudo o que pode mudar
  evento.respondWith(
    fetch(req)
      .then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./dashboard_efetivo.html')))
  );
});
