# Checklist de QA — Canal de Ética

Sistema: `index.html` (Alpine.js) + `code.gs` (Google Apps Script, grava em Sheets/Drive).
Sem framework de teste automatizado — checklist manual para validar antes de subir pra staging/produção.

URL do backend fixa no front: `APPS_SCRIPT_URL` (index.html:488). Confirmar que aponta pro deployment correto (teste vs produção) antes de rodar os casos abaixo.

---

## 1. Setup pré-teste

- [ ] Deployment do Apps Script publicado como Web App, acesso "Qualquer pessoa" (senão `fetch` cross-origin falha)
- [ ] `PLANILHA_ID` em code.gs:2 aponta pra planilha de teste (não produção)
- [ ] Aba "Canal" existe ou sistema cria automaticamente (`salvarOcorrencia`)
- [ ] Permissões do Drive/Sheets autorizadas na conta que roda o script
- [ ] `index.html` aberto via `doGet` do Apps Script publicado como página (não só arquivo local — CORS/`fetch` pode se comportar diferente local vs hospedado)

## 2. Campos obrigatórios (validação client-side)

Testar envio com cada campo faltando isoladamente, um por vez:

- [ ] Sem "Relação com a empresa" → erro "Selecione sua relação com a empresa."
- [ ] Sem "Data do ocorrido" → erro "Informe a data do ocorrido."
- [ ] Sem "Local do ocorrido" (ou só espaços) → erro "Informe onde ocorreu."
- [ ] Sem "Alguém presenciou" (ou só espaços) → erro "Informe se alguém presenciou."
- [ ] Sem "Descreva o ocorrido" (ou só espaços) → erro "Descreva o ocorrido."
- [ ] Erro some sozinho após 5s (`setTimeout` mostrarErro)
- [ ] Erro reaparece ao tentar de novo mesmo campo

## 3. Campo "Nome" (opcional/anônimo)

- [ ] Envio com nome em branco → sucesso, linha na planilha com coluna Nome vazia
- [ ] Envio com nome preenchido → grava certo
- [ ] `maxlength="200"` respeitado (digitar acima do limite não deve exceder)

## 4. Fluxo completo feliz (happy path)

- [ ] Preencher todos os campos obrigatórios + nome + anexo, enviar
- [ ] Botão mostra spinner + "Enviando..." e fica `disabled` durante envio
- [ ] Após sucesso: tela de sucesso aparece (`concluido = true`), formulário some
- [ ] Nova linha aparece na planilha "Canal" com todos os dados corretos e timestamp
- [ ] Botão "Novo relato" reseta form, arquivo e volta pra tela inicial (`reiniciar()`)
- [ ] Repetir o fluxo 2x seguidas sem reload de página (garante que reset não deixa lixo de estado)

## 5. Upload de anexo

- [ ] Anexar imagem (jpg/png) → aceito, ícone muda pra "arquivo selecionado", nome e tamanho exibidos
- [ ] Anexar PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT → todos aceitos (`accept` do input)
- [ ] Anexar arquivo > 10MB → erro "O arquivo deve ter no máximo 10 MB.", input limpo (`event.target.value = ''`)
- [ ] Anexar arquivo exatamente no limite (~10MB) → comportamento de borda (checar `>` vs `>=` em index.html:527)
- [ ] Anexar arquivo de tipo não listado (ex. `.zip`) — testar se o seletor do SO bloqueia ou se ainda é possível forçar seleção
- [ ] Após anexar, trocar de arquivo → estado atualiza corretamente
- [ ] Enviar sem anexo → `arquivoBase64` vazio, planilha não gera arquivo no Drive, coluna "Anexo URL" vazia
- [ ] Anexo grande (perto do limite) → confirmar tempo de conversão base64 e envio não trava a UI de forma inaceitável
- [ ] Arquivo enviado aparece no Drive acessível via link salvo em "Anexo URL"
- [ ] Nome de arquivo com caracteres especiais/acentos/espaços → grava e sobe sem corromper

## 6. Erros de backend / rede

- [ ] Derrubar/alterar `APPS_SCRIPT_URL` pra URL inválida → mensagem "Não foi possível enviar o relato." exibida, spinner some, form não trava
- [ ] Simular timeout de rede (DevTools throttling "offline") → erro tratado, botão reabilita
- [ ] Backend retorna `ok: false` (forçar erro no `salvarOcorrencia`, ex. `PLANILHA_ID` errado) → mensagem de erro do backend aparece pro usuário
- [ ] Resposta HTTP não-OK (ex. 500) → cai no `throw new Error('Erro ao enviar o formulário.')`
- [ ] JSON de resposta malformado → tratado sem quebrar a página (promise rejection capturada)

## 7. Backend isolado (Apps Script)

Testar direto via `doGet`/`doPost` (ex. Postman, curl, ou execução manual no editor):

- [ ] `doGet()` retorna `{ ok: true, message: 'Backend do Canal de Ética ativo.' }`
- [ ] `doPost` com `Content-Type: application/json` → parseia `postData.contents` corretamente
- [ ] `doPost` com `application/x-www-form-urlencoded` → usa `e.parameter`
- [ ] `doPost` sem payload nenhum → não quebra, cai no fallback `e.parameter`
- [ ] `ensureSheetHeaders` cria cabeçalho só na primeira vez (não duplica em envios seguintes)
- [ ] Se aba "Canal" não existe, é criada automaticamente (`insertSheet`)
- [ ] `salvarOcorrencia` com `dados` undefined/null em algum campo não quebra (usa fallback `''`)
- [ ] Testar exception dentro de `doPost` (ex. ID de planilha inválido) → captura no `catch`, retorna `ok: false` com mensagem, não expõe stack trace sensível

## 8. Segurança / sanitização

- [ ] Injetar HTML/script no campo "Descrição" (ex. `<script>alert(1)</script>`) → confirmar que não executa no client (Alpine usa `x-text`, seguro) e é gravado como texto puro na planilha
- [ ] Testar caracteres especiais em todos os campos texto (aspas, `&`, emojis, quebras de linha)
- [ ] Confirmar que não há CORS liberado além do necessário, e que URL do Apps Script não expõe endpoint administrativo
- [ ] Confirmar que arquivo enviado ao Drive não fica com permissão pública indevida (checar padrão de compartilhamento do `DriveApp.createFile`)
- [ ] Descrição no limite de `maxlength="5000"` → não trunca de forma inesperada nem quebra envio

## 9. Responsividade / cross-device

- [ ] Desktop largo (>1080px) → layout 2 colunas (intro + card)
- [ ] Entre 560–900px → colunas empilham (`grid-template-columns: 1fr`)
- [ ] Abaixo de 560px → `header p` some, `.grid-2`/`.choice-group` viram 1 coluna
- [ ] Mobile real (Android/iOS, Chrome/Safari) → upload de arquivo funciona (câmera/galeria)
- [ ] Botões e campos com área de toque adequada em mobile

## 10. Cross-browser

- [ ] Chrome
- [ ] Firefox
- [ ] Safari (atenção a `FileReader`, `fetch`, backdrop-filter)
- [ ] Edge

## 11. Acessibilidade básica

- [ ] Navegação por teclado (Tab) percorre todos os campos e botão em ordem lógica
- [ ] `choice-item` (Colaborador/Fornecedor/Terceiros) é clicável só com mouse — não tem `role="radio"`/`tabindex`, avaliar se precisa suporte a teclado
- [ ] Labels associados corretamente aos inputs
- [ ] Ícones lucide carregam mesmo com JS lento (`renderIcons` via `setTimeout`)

## 12. Dados sensíveis / privacidade

- [ ] Confirmar que somente comitê de ética (conforme texto da página) tem acesso à planilha/Drive de destino
- [ ] Confirmar que link do Apps Script não permite listar relatos anteriores (só grava, não lê)
- [ ] Revisar se ID da planilha (`PLANILHA_ID`) exposto no `code.gs` do repositório é aceitável (repo público vs privado)

## 13. Regressão de assets

- [ ] `imagens/icone.png` carrega como favicon
- [ ] `imagens/Distribuidora_KEM.png` carrega no header
- [ ] Fontes Google (Inter) e libs externas (lucide, Alpine via CDN) carregam sem bloqueio; testar comportamento com CDN lento/bloqueado (ex. rede corporativa)

---

## Bugs/pontos de atenção já identificados na leitura do código

1. **index.html:527** — limite de anexo usa `file.size > 10 * 1024 * 1024`; confirmar comportamento exato no limite exato (edge case, baixa prioridade).
2. **code.gs:488 / index.html:488** — `APPS_SCRIPT_URL` hardcoded no front; trocar de ambiente (teste↔produção) exige editar e republicar o HTML.
3. **code.gs** — nenhuma validação server-side dos campos obrigatórios; front confia só em client-side. Envio direto via API (bypass do form) grava linha com campos vazios sem erro.
4. **code.gs:49** — `DriveApp.createFile(blob)` não define pasta destino nem permissão explícita — verificar padrão de compartilhamento gerado.
