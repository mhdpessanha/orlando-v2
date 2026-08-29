# Orlando 2027 — site da viagem (v2)

Site privado da família pra viagem a Orlando (07–24/01/2027), servido do Mac Mini M2 em
`orlando.pessanhaserver.com.br` via Cloudflare Tunnel. Contexto completo do projeto: [CLAUDE.md](CLAUDE.md).

## Desenvolvimento local

```bash
npm install                # roda prisma generate no postinstall
npm run db:migrate         # cria/migra ./data/orlando.db
npm run create-user -- murilo   # define a senha (pede no terminal)
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

## Estrutura

- `src/app/login` — tela de login (auth própria: bcrypt + cookie HTTP-only, sessão 30 dias).
- `src/app/(app)` — tudo que exige login (middleware redireciona pra `/login` sem cookie).
- `prisma/schema.prisma` — User/Session/SyncLog; espelhos da planilha entram no M2.
- `scripts/create-user.mjs` — define senha dos 6 logins conhecidos.
