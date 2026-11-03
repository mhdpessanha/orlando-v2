# Orlando 2027 — site da viagem (v2)

Site privado da família pra viagem a Orlando (07–24/01/2027), servido do Mac Mini M2 em
`orlando.pessanhaserver.com.br` via Cloudflare Tunnel. Contexto completo do projeto: [CLAUDE.md](CLAUDE.md).

## Desenvolvimento local

```bash
npm install                # roda prisma generate no postinstall
npm run db:migrate         # cria/migra ./data/orlando.db
npm run create-user -- murilo   # define a senha (pede no terminal)
npx tsx scripts/seed-dev.ts     # (opcional) dados de exemplo pra dev sem o sync real
npm run dev                # http://localhost:3000
```

## Deploy no Mac Mini

Pré-requisitos: Docker (Docker Desktop ou OrbStack) e o repositório clonado.

1. Criar o `.env` na raiz (não vai pro git) a partir do `.env.example`, com o
   `TUNNEL_TOKEN` do Cloudflare Tunnel — o tunnel já está configurado no painel do
   Cloudflare apontando `orlando.pessanhaserver.com.br` → `http://app:3000`.

2. Subir:

   ```bash
   docker compose up -d --build
   ```

   O entrypoint roda `prisma migrate deploy` antes de iniciar o Next, então o banco
   (`./data/orlando.db`, montado como volume) é criado/migrado sozinho.

3. Criar os logins (uma vez, ou sempre que quiser trocar uma senha):

   ```bash
   docker compose exec app node scripts/create-user.mjs murilo
   docker compose exec app node scripts/create-user.mjs joana
   # idem: gabi, gustavo, vitor, mariana
   ```

4. Conferir: `https://orlando.pessanhaserver.com.br` deve abrir o login.

### Observações

- O cookie de sessão é `Secure` em produção — o login só funciona via HTTPS
  (pelo domínio). O acesso direto `http://<ip-do-mini>:3000` na rede local não
  mantém login; é só pra debug.
- Atualização: automática a cada push no `main` (ver abaixo).
- Logs: `docker compose logs -f app` (ou `cloudflared`).

### Deploy automático

Todo push no `main` vai pro ar sozinho em ~3–6 min: um agente do launchd roda
`scripts/deploy-auto.sh` a cada 2 min. Quando o `main` do GitHub andou, ele:

1. constrói a imagem a partir do commit (`git archive`), não da pasta, então o que
   não foi commitado nunca vai pro ar. Se o build quebrar, o site segue na versão
   anterior;
2. faz backup do banco em `data/backups/` (guarda os 30 últimos);
3. troca o container e espera o `/login` responder;
4. se não responder em 90 s, volta pra imagem anterior (e pro backup do banco, se o
   deploy mexia em `prisma/`).

Commit que falhou não é tentado de novo sozinho: o próximo push tenta, ou
`scripts/deploy-auto.sh --agora`. Commit que só mexe em `*.md` da raiz não reconstrói.
Histórico em `data/deploy.log` (saída completa do último build em `data/deploy/build.log`).

```bash
# instalar (uma vez)
cp scripts/deploy-auto.plist ~/Library/LaunchAgents/br.com.pessanhaserver.orlando-deploy.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/br.com.pessanhaserver.orlando-deploy.plist

tail -f data/deploy.log                                               # acompanhar
launchctl bootout gui/$(id -u)/br.com.pessanhaserver.orlando-deploy  # pausar
```

## Assistente "Pergunte"

Chat em `/perguntar` (botão no topo) que responde sobre a viagem com o Claude Haiku
pela API. A chave vai no `.env` (`ANTHROPIC_API_KEY`) e o `docker-compose.yml` passa
pro container; sem ela o resto do site segue normal. Pra gravar a chave sem ela
aparecer na tela nem no histórico do shell:

```bash
read -s "k?Chave da API: " && echo "ANTHROPIC_API_KEY=$k" >> .env && unset k
docker compose up -d   # recria o container com a variável nova
```

Cada pergunta aparece em `docker compose logs -f app` como `[chat] usuário: entrada …
cache lido … saída …` (tokens). Vale pôr um limite de gasto mensal no Console da
Anthropic; o site também limita 40 perguntas por hora por pessoa.

## Sync da planilha-CMS

O conteúdo vem da planilha "Site_Orlando_2027__CMS" (Google Sheets) por sync de mão
única → SQLite. O site sempre serve do banco; Google fora do ar não derruba nada.

**Setup (uma vez, local e no Mini):** salvar o JSON da service account em
`./credentials/service-account.json` (a pasta é gitignored; no Docker ela é montada
read-only). A planilha precisa estar compartilhada como **leitor** com o
`client_email` da service account — se o sync reclamar de 403, é isso.

**Quando roda:** no boot do server, a cada 30 min, e sob demanda pelo botão "sync"
no rodapé (só aparece pro admin) ou `POST /api/sync`. Cada aba é validada (zod,
cabeçalho da linha 1 como contrato); aba inválida mantém os dados anteriores e fica
registrada na tabela `SyncLog` com o erro e a linha problemática.

**Teste do pipeline sem Google:** `npx tsx scripts/test-sync.ts` (fetcher fake,
roda contra o banco local).

## Estrutura

- `src/app/login` — tela de login (auth própria: bcrypt + cookie HTTP-only, sessão 30 dias).
- `src/app/(app)` — tudo que exige login (middleware redireciona pra `/login` sem cookie).
- `prisma/schema.prisma` — User/Session/SyncLog + espelhos das 9 abas + tabelas de interação da fase 2.
- `src/lib/sync` — pipeline do sync (fetch por aba, validação zod, espelho upsert/delete, SyncLog).
- `scripts/create-user.mjs` — define senha dos 6 logins conhecidos.
