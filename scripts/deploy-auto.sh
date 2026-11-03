#!/bin/bash
# Deploy automático do orlando-v2 — o launchd do Mac Mini roda a cada 2 min
# (scripts/deploy-auto.plist).
#
# Confere o GitHub; se o main andou desde o último deploy:
#   1. constrói a imagem a partir do COMMIT (git archive), nunca da pasta — mudança
#      não commitada aqui nunca vai pro ar. Build quebrado = site segue na versão
#      anterior;
#   2. faz backup do banco (data/backups/, guarda os 30 últimos);
#   3. troca o container e espera o /login responder;
#   4. se não responder em 90 s, volta pra imagem anterior (e pro backup do banco,
#      se o deploy mexia em prisma/).
# Commit que falhou não é tentado de novo sozinho (o próximo push tenta).
# Commit que só mexe em *.md da raiz ou .claude/ não reconstrói nada.
#
# Uso:  scripts/deploy-auto.sh          (o launchd chama assim)
#       scripts/deploy-auto.sh --agora  (deploy do origin/main mesmo sem mudança
#                                        ou depois de falhar)
#
# Arquivos (em data/, fora do git):
#   data/deploy.log          histórico
#   data/deploy/ultimo       commit no ar
#   data/deploy/falhou       commit que falhou
#   data/deploy/build.log    saída completa do último deploy

set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 1

PROJETO=orlando-v2
IMAGEM=orlando-v2-app
ESTADO="$REPO/data/deploy"
LOG="$REPO/data/deploy.log"
BACKUPS="$REPO/data/backups"
BANCO="$REPO/data/orlando.db"
URL_SAUDE="http://localhost:3000/login"
ESPERA=90   # segundos pro site responder depois de trocar o container
mkdir -p "$ESTADO" "$BACKUPS"

CURTO="·······"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$CURTO] $*" >> "$LOG"; }

# um por vez: o launchd não sobrepõe execuções, mas uma chamada manual pode
TRAVA="$ESTADO/trava"
if ! mkdir "$TRAVA" 2>/dev/null; then
  # trava de processo morto (> 30 min) é descartada
  [ -n "$(find "$TRAVA" -maxdepth 0 -mmin +30 2>/dev/null)" ] || exit 0
  rmdir "$TRAVA" && mkdir "$TRAVA" || exit 0
fi
trap 'rmdir "$TRAVA" 2>/dev/null' EXIT

AGORA=0
[ "${1:-}" = "--agora" ] && AGORA=1

git fetch --quiet origin main 2>/dev/null || exit 0   # sem rede: tenta na próxima
SHA="$(git rev-parse origin/main)"
CURTO="${SHA:0:7}"
ULTIMO="$(cat "$ESTADO/ultimo" 2>/dev/null || true)"

# Conveniência: se a pasta está no main, limpa e só atrás do GitHub (push feito de
# outro lugar), acompanha. O deploy não depende disso.
atualiza_pasta() {
  [ "$(git symbolic-ref --short -q HEAD)" = main ] || return 0
  [ "$(git rev-parse HEAD)" = "$SHA" ] && return 0
  git merge-base --is-ancestor HEAD "$SHA" || return 0              # commit local não enviado
  [ -z "$(git status --porcelain --untracked-files=no)" ] || return 0  # edição em andamento
  git merge --ff-only --quiet "$SHA" 2>/dev/null && log "pasta local atualizada pro GitHub"
}

if [ $AGORA = 0 ]; then
  [ "$SHA" = "$ULTIMO" ] && { atualiza_pasta; exit 0; }
  [ "$SHA" = "$(cat "$ESTADO/falhou" 2>/dev/null)" ] && exit 0
fi

# Docker Desktop fora (boot, travado): avisa uma vez por commit e tenta na próxima
if ! docker info >/dev/null 2>&1; then
  if [ "$(cat "$ESTADO/sem-docker" 2>/dev/null)" != "$SHA" ]; then
    log "Docker fora do ar — deploy pendente, tento de novo a cada 2 min"
    echo "$SHA" > "$ESTADO/sem-docker"
  fi
  exit 0
fi
rm -f "$ESTADO/sem-docker"

# o que mudou desde o que está no ar (desconhecido = trata como se mexesse em tudo)
CONHECIDO=0
if [ -n "$ULTIMO" ] && git merge-base --is-ancestor "$ULTIMO" "$SHA" 2>/dev/null; then
  CONHECIDO=1
fi

if [ $AGORA = 0 ] && [ $CONHECIDO = 1 ] &&
   ! git diff --name-only "$ULTIMO" "$SHA" | grep -qvE '^([^/]+\.md|\.claude/.*)$'; then
  log "só documentação mudou — nada pra reconstruir"
  echo "$SHA" > "$ESTADO/ultimo"
  atualiza_pasta
  exit 0
fi

MEXE_NO_BANCO=1
if [ $CONHECIDO = 1 ] && [ -z "$(git diff --name-only "$ULTIMO" "$SHA" -- prisma/)" ]; then
  MEXE_NO_BANCO=0
fi

limpa_imagens() {   # só imagens deste projeto sem tag e sem container (label do Dockerfile)
  docker image prune -f --filter "label=br.com.pessanhaserver.app=orlando-v2" >/dev/null 2>&1
}

falhou() {
  log "FALHOU: $*"
  echo "$SHA" > "$ESTADO/falhou"
  limpa_imagens
  exit 1
}

espera_site() {
  local fim=$(( $(date +%s) + $1 ))
  while [ "$(date +%s)" -lt "$fim" ]; do
    [ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$URL_SAUDE")" = 200 ] && return 0
    sleep 2
  done
  return 1
}

INICIO=$(date +%s)
log "deploy começou: $(git log -1 --format=%s "$SHA")"
: > "$ESTADO/build.log"

# compose do próprio commit; .env e caminhos relativos (./data, ./credentials) da pasta
git show "$SHA:docker-compose.yml" > "$ESTADO/docker-compose.yml"
compose() {
  local arquivo="$1"; shift
  local extra=()   # bash 3.2 do macOS: array vazio + set -u precisa do ${...+...}
  [ -f "$REPO/.env" ] && extra=(--env-file "$REPO/.env")
  docker compose -p "$PROJETO" --project-directory "$REPO" ${extra[@]+"${extra[@]}"} -f "$arquivo" "$@"
}

# imagem que está rodando agora = pra onde voltar se der errado
CONTAINER="$(compose "$ESTADO/docker-compose.yml" ps -q app 2>/dev/null | head -1)"
ANTERIOR=""
[ -n "$CONTAINER" ] && ANTERIOR="$(docker inspect -f '{{.Image}}' "$CONTAINER" 2>/dev/null || true)"

# 1. build a partir do commit
if ! git archive --format=tar "$SHA" |
     docker build --progress=plain --label "org.opencontainers.image.revision=$SHA" \
       -t "$IMAGEM:latest" - >> "$ESTADO/build.log" 2>&1; then
  tail -n 25 "$ESTADO/build.log" | sed 's/^/    | /' >> "$LOG"
  falhou "build quebrou em $(( $(date +%s) - INICIO )) s — o site segue na versão anterior"
fi
[ -n "$ANTERIOR" ] && docker tag "$ANTERIOR" "$IMAGEM:anterior"

# 2. backup do banco (o .backup do sqlite é consistente mesmo com o site no ar)
BACKUP=""
if [ -f "$BANCO" ]; then
  BACKUP="$BACKUPS/orlando-$(date +%Y%m%d-%H%M%S)-$CURTO.db"
  sqlite3 "$BANCO" ".backup '$BACKUP'" || falhou "backup do banco falhou — deploy cancelado, site na versão anterior"
  ls -t "$BACKUPS"/orlando-*.db 2>/dev/null | tail -n +31 | while read -r velho; do rm -f "$velho"; done
fi

# 3. troca o container
compose "$ESTADO/docker-compose.yml" up -d --no-build --force-recreate app >> "$ESTADO/build.log" 2>&1
if espera_site $ESPERA; then
  echo "$SHA" > "$ESTADO/ultimo"
  rm -f "$ESTADO/falhou"
  cp "$ESTADO/docker-compose.yml" "$ESTADO/docker-compose.ok.yml"
  limpa_imagens
  log "no ar em $(( $(date +%s) - INICIO )) s"
  atualiza_pasta
  exit 0
fi

# 4. não subiu: volta
log "site não respondeu em $ESPERA s — voltando pra versão anterior"
NOVO="$(compose "$ESTADO/docker-compose.yml" ps -aq app 2>/dev/null | head -1)"
[ -n "$NOVO" ] && docker logs --tail 25 "$NOVO" 2>&1 | sed 's/^/    | /' >> "$LOG"
[ -n "$ANTERIOR" ] || falhou "não havia versão anterior pra voltar — SITE FORA DO AR"

COMPOSE_OK="$ESTADO/docker-compose.ok.yml"
[ -f "$COMPOSE_OK" ] || COMPOSE_OK="$REPO/docker-compose.yml"
compose "$COMPOSE_OK" stop app >> "$ESTADO/build.log" 2>&1
if [ $MEXE_NO_BANCO = 1 ] && [ -n "$BACKUP" ]; then
  cp "$BACKUP" "$BANCO" && log "banco restaurado do backup de antes do deploy"
fi
docker tag "$ANTERIOR" "$IMAGEM:latest"
compose "$COMPOSE_OK" up -d --no-build --force-recreate app >> "$ESTADO/build.log" 2>&1
if espera_site $ESPERA; then
  falhou "voltou pra versão anterior — site no ar"
fi
falhou "nem a versão anterior respondeu — SITE FORA DO AR, ver 'docker compose logs app'"
