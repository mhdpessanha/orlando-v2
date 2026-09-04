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
- Atualização: `git pull && docker compose up -d --build`.
- Logs: `docker compose logs -f app` (ou `cloudflared`).

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
