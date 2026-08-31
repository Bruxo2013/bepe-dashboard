// ============================================================
//  SINCRONIZADOR BEPE DASHBOARD — Google Apps Script
//  Instalar: Extensões > Apps Script > colar este código
//  Depois executar UMA VEZ a função: configurarGatilhos()
// ============================================================

const FIREBASE_URL = 'https://bepe-dashboard-default-rtdb.firebaseio.com';
const NOME_ABA     = 'EFETIVO 2025'; // nome exato da aba (sem sensibilidade a maiúsculas)

// Cabeçalho autenticado: o script se identifica como o dono do projeto.
// Não existe token guardado em lugar nenhum — o Google emite na hora.
function cabecalhoAuth() {
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
}

// Avisa por e-mail quando a sincronização falha. Sem isso a falha é silenciosa:
// o gatilho roda sozinho e ninguém lê o Logger.
function avisarFalha(assunto, detalhe) {
  try {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      '[BEPE Dashboard] ' + assunto,
      ['A sincronizacao da planilha com o dashboard falhou.', '', detalhe, '',
       'O dashboard esta exibindo dados desatualizados.'].join('\n')
    );
  } catch (e) {
    Logger.log('Não consegui enviar o e-mail de alerta: ' + e.message);
  }
}

// ------------------------------------------------------------
//  FUNÇÃO PRINCIPAL
// ------------------------------------------------------------
function sincronizarComFirebase() {
  try {
    // 1. Encontrar a aba "EFETIVO 2025" pelo nome
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = null;

    for (const s of ss.getSheets()) {
      if (s.getName().trim().toUpperCase() === NOME_ABA.toUpperCase()) {
        sheet = s; break;
      }
    }
    if (!sheet) {
      Logger.log('❌ Aba "' + NOME_ABA + '" não encontrada.');
      Logger.log('Abas disponíveis: ' + ss.getSheets().map(s => s.getName()).join(', '));
      return;
    }
    Logger.log('✅ Aba encontrada: "' + sheet.getName() + '" (gid=' + sheet.getSheetId() + ')');

    // 2. Ler todos os dados
    const dados = sheet.getDataRange().getValues();
    if (dados.length < 2) { Logger.log('Planilha sem dados.'); return; }

    // 3. Detectar colunas pelo cabeçalho (sem acento, sem caractere especial)
    const normalizar = (s) => String(s).trim().toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
      .replace(/[^A-Z0-9 ]/g, ' ')                        // remove especiais
      .replace(/\s+/g, ' ').trim();

    const cabecalho = dados[0].map(normalizar);
    const col       = (nome) => cabecalho.indexOf(normalizar(nome));

    const C = {
      gh:     col('GH'),
      rg:     col('RG'),
      id:     col('ID FUNCIONAL'),
      nome:   col('NOME'),
      cia:    col('COMPANHIA'),
      funcao: col('FUNCAO'),
      sit:    col('SITUACAO SANITARIA'),
      de:     col('DE'),
      ate:    col('ATE'),
      arma:   col('ARMA ACAUTELADA'),
      colete: col('COLETE ACAUTELADO'),
      ferias: col('FERIAS VENCIDAS'),
    };
    Logger.log('Colunas detectadas: ' + JSON.stringify(C));

    // 4. Buscar dados atuais do Firebase para preservar abono e obs
    const fbResp = UrlFetchApp.fetch(FIREBASE_URL + '/efetivo.json', {
      method: 'get', headers: cabecalhoAuth(), muteHttpExceptions: true
    });
    const mapaFB = {};
    if (fbResp.getResponseCode() === 200) {
      const parsed = JSON.parse(fbResp.getContentText());
      if (parsed) {
        const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);
        arr.forEach(m => {
          if (m && m.rg) mapaFB[String(m.rg).replace(/[.\-\s]/g, '').trim()] = m;
        });
        Logger.log('Firebase: ' + arr.length + ' registros carregados para preservar abono/obs.');
      }
    }

    // 5. Montar array de militares com filtros
    const pegaValor = (row, idx, fallback) =>
      idx >= 0 ? String(row[idx]).trim() : (fallback || '');

    const militares = [];
    const rgsVistos = new Set();
    let pulados     = 0;

    for (let i = 1; i < dados.length; i++) {
      const r    = dados[i];
      const gh   = C.gh   >= 0 ? String(r[C.gh]).trim()  : '';
      const nome = C.nome >= 0 ? String(r[C.nome]).trim() : '';
      const rg   = C.rg   >= 0 ? String(r[C.rg]).replace(/[.\-\s]/g, '').trim() : '';

      // ── FILTROS ──────────────────────────────────────────────
      if (!gh)   { pulados++; continue; }  // linha vazia
      if (!nome) { pulados++; continue; }  // sem nome (subtotais)
      if (!rg || rg.length < 3)    { pulados++; continue; }  // RG inválido/subtotal
      if (nome.toUpperCase().startsWith('BOL')) { pulados++; continue; } // registro de boletim
      if (nome.toUpperCase() === 'CIVIL')        { pulados++; continue; }
      if (rgsVistos.has(rg))       { pulados++; continue; }  // duplicado
      // ─────────────────────────────────────────────────────────

      rgsVistos.add(rg);
      const ex = mapaFB[rg] || {};

      militares.push({
        gh:     pegaValor(r, C.gh,     ex.gh),
        rg:     rg,
        id:     pegaValor(r, C.id,     ex.id),
        nome:   nome,
        cia:    pegaValor(r, C.cia,    ex.cia),
        funcao: pegaValor(r, C.funcao, ex.funcao),
        sit:    pegaValor(r, C.sit,    ex.sit),
        de:     pegaValor(r, C.de,     ex.de),
        ate:    pegaValor(r, C.ate,    ex.ate),
        arma:   pegaValor(r, C.arma,   ex.arma),
        colete: pegaValor(r, C.colete, ex.colete),
        ferias: pegaValor(r, C.ferias, ex.ferias),
        abono:  ex.abono || '',   // preservado do Firebase
        obs:    ex.obs   || '',   // preservado do Firebase
      });
    }

    Logger.log('Militares válidos: ' + militares.length + ' | Linhas ignoradas: ' + pulados);

    if (militares.length === 0) {
      Logger.log('❌ Nenhum militar encontrado. Sincronização cancelada.');
      return;
    }

    // 6. Enviar para o Firebase
    const putResp = UrlFetchApp.fetch(FIREBASE_URL + '/efetivo.json', {
      method:      'put',
      contentType: 'application/json',
      headers:     cabecalhoAuth(),
      payload:     JSON.stringify(militares),
      muteHttpExceptions: true
    });

    if (putResp.getResponseCode() === 200) {
      // Carimbo da sincronização REAL. O dashboard passa a exibir esta hora
      // em vez do relógio do próprio navegador, que mentia quando a sync parava.
      UrlFetchApp.fetch(FIREBASE_URL + '/meta/ultimaSync.json', {
        method:      'put',
        contentType: 'application/json',
        headers:     cabecalhoAuth(),
        payload:     JSON.stringify(new Date().toISOString()),
        muteHttpExceptions: true
      });
      Logger.log('✅ Sincronização concluída: ' + militares.length + ' militares enviados ao Firebase.');
    } else {
      const erro = putResp.getResponseCode() + ' — ' + putResp.getContentText().substring(0, 300);
      Logger.log('❌ Erro Firebase: ' + erro);
      avisarFalha('Falha ao gravar no Firebase', erro);
    }

  } catch (e) {
    Logger.log('❌ Exceção: ' + e.message + '\n' + e.stack);
  }
}

// ------------------------------------------------------------
//  CONFIGURAR GATILHOS — executar UMA ÚNICA VEZ após instalar
// ------------------------------------------------------------
function configurarGatilhos() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('sincronizarComFirebase')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit().create();

  ScriptApp.newTrigger('sincronizarComFirebase')
    .timeBased().everyMinutes(10).create();

  Logger.log('✅ Gatilhos criados: ao editar + a cada 10 minutos.');
}

// ------------------------------------------------------------
//  TESTAR — rodar manualmente para verificar
// ------------------------------------------------------------
function testarSincronizacao() {
  Logger.log('=== TESTE DE SINCRONIZAÇÃO ===');
  sincronizarComFirebase();
  Logger.log('=== FIM DO TESTE ===');
}
