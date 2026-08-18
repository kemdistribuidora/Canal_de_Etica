const CANAL_SHEET_NAME = 'Canal';
const PLANILHA_ID = '1CquuKsOwCPWNTWFss-DjAaTMjZ9bqQKVvor_mMUIL2s';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'Backend do Canal de Ética ativo.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getCanalSpreadsheet() {
  return SpreadsheetApp.openById(PLANILHA_ID);
}

function ensureSheetHeaders(sheet) {
  const headers = [
    'Data do envio',
    'Relação com a empresa',
    'Nome',
    'Data do ocorrido',
    'Onde ocorreu',
    'Alguém presenciou',
    'Descreva o ocorrido',
    'Anexo URL'
  ];

  const lastRow = sheet.getLastRow();
  const firstRowValues = lastRow > 0 ? sheet.getRange(1, 1, 1, headers.length).getValues()[0] : [];

  if (lastRow === 0 || !firstRowValues.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function salvarOcorrencia(dados, nomeArquivo, base64Conteudo, mimeType) {
  const spreadsheet = getCanalSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CANAL_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CANAL_SHEET_NAME);
  }

  ensureSheetHeaders(sheet);

  let anexoUrl = '';

  if (base64Conteudo && base64Conteudo.length > 0) {
    const bytes = Utilities.base64Decode(base64Conteudo);
    const blob = Utilities.newBlob(bytes, mimeType || MimeType.BINARY, nomeArquivo || 'anexo');
    const uploadedFile = DriveApp.createFile(blob);
    anexoUrl = uploadedFile.getUrl();
  }

  const row = [
    new Date(),
    dados && dados.relacao ? dados.relacao : '',
    dados && dados.nome ? dados.nome : '',
    dados && dados.dataOcorrido ? dados.dataOcorrido : '',
    dados && dados.ondeOcorrido ? dados.ondeOcorrido : '',
    dados && dados.presenciou ? dados.presenciou : '',
    dados && dados.descricao ? dados.descricao : '',
    anexoUrl
  ];

  sheet.appendRow(row);

  return {
    ok: true,
    message: 'Relato enviado com sucesso. Obrigado por contribuir.'
  };
}

function doPost(e) {
  try {
    let payload = {};

    if (e && e.postData && e.postData.contents) {
      const contentType = e.postData.type || '';

      if (contentType.indexOf('application/json') !== -1) {
        payload = JSON.parse(e.postData.contents);
      } else if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
        payload = e.parameter || {};
      }
    }

    if (!payload || Object.keys(payload).length === 0) {
      payload = e && e.parameter ? e.parameter : {};
    }

    const result = salvarOcorrencia(
      payload,
      payload.arquivoNome || '',
      payload.arquivoBase64 || '',
      payload.arquivoTipo || ''
    );

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, message: error && error.message ? error.message : 'Erro ao salvar o relato.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
