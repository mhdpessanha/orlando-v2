# Orlando 2027 — Site da viagem (v2)

Site privado da viagem em família a Orlando (07–24/01/2027, 9 pessoas), auto-hospedado no Mac Mini M2 do Murilo e exposto em `orlando.pessanhaserver.com.br` via Cloudflare Tunnel. Reescrita do zero do site v1 (mesmo repo, código antigo descartado). Objetivo duplo: **útil** (apresentar o plano) e **hype** (animar a família até o embarque).

**Meta: MVP no ar antes de 09/11/2026** (abertura das ADRs).

## Premissas invioláveis

1. **O site não é ferramenta de planejamento.** Todo conteúdo de planejamento vem da planilha-CMS (Google Sheets) por sync de mão única. **Não construir telas de criação/edição de conteúdo** — nem admin de CRUD. A única escrita dos usuários são as interações (votos, lista de compras; fase 2: trivia, checklists), que vivem só no SQLite e nunca vão pra planilha.
2. **Visibilidade financeira por núcleo, aplicada no servidor.** Núcleos: `pessanha` (Murilo+Joana), `gabi` (Gabi+Gustavo+Lucas), `vitor`, `mariana`. Cada usuário só recebe do servidor os dados financeiros do próprio núcleo; `papel=admin` (Murilo) vê tudo. Nunca resolver isso escondendo no client.
3. **Mobile-first (390px), pt-BR, PWA instalável, tema escuro único** ("noite de fogos" — ver Design). Sem light mode, sem i18n.
4. **Nada sensível:** sem upload de documentos, sem dados de passaporte/visto. Localizadores de reserva podem aparecer (decisão consciente).
5. 6 logins: murilo (admin), joana, gabi, gustavo, vitor, mariana. Crianças (Olívia, Bernardo, Lucas) são perfis na Turma, sem login — na viagem terão 4a6m, 1a8m e 5a6m; as alturas são medidas em dez/2026 (coluna `altura_cm` da Turma).

## Stack e infra

- Next.js (App Router) + TypeScript + Tailwind + Prisma/SQLite (banco em `./data/orlando.db`, volume no Docker).
- Auth própria: bcryptjs + cookie HTTP-only, sessão 30 dias, middleware protegendo tudo exceto `/login`. Script `create-user` pra definir senhas. (Igual ao v1 — o README antigo tem o passo a passo de deploy com Docker + Cloudflare Tunnel; reaproveitar o fluxo.)
- Deploy **automático** (desde 03/11/2026): todo push no `main` vai pro ar sozinho em ~3–6 min. O launchd do Mini (`br.com.pessanhaserver.orlando-deploy`, plist em `scripts/deploy-auto.plist`) roda `scripts/deploy-auto.sh` a cada 2 min: build a partir do **commit** (`git archive` — mudança não commitada na pasta nunca vai pro ar), backup do banco em `data/backups/`, troca o container e, se o `/login` não responder em 90 s, volta sozinho pra imagem anterior (e pro backup, se o deploy mexia em `prisma/`). Histórico em `data/deploy.log`. **Não rodar `docker compose up -d --build` na mão depois do push** (faria build da pasta, com o que não foi commitado); pra repetir um deploy que falhou: `scripts/deploy-auto.sh --agora`. O tunnel (projeto `~/docker/cloudflare`) aponta `orlando.pessanhaserver.com.br` → porta 3000 do host.
- Fonts via `next/font/google`: Fredoka (display) + Nunito Sans (texto).
- Assistente "Pergunte" (tela 13): Claude Haiku (`claude-haiku-5-5`) via `@anthropic-ai/sdk`, chave em `ANTHROPIC_API_KEY` (`.env`, fora do git; cobrada à parte da assinatura). Única dependência externa de IA — nada de IA local por enquanto (o Mini tem 8 GB e já roda ~20 containers).

## Fonte de dados: planilha-CMS

- Spreadsheet ID: `1robcUP4JwMFHiVldsJDvS13mTqIWDyD1XEN7GGilKRU` (arquivo "Site_Orlando_2027__CMS" no Drive do Murilo, pasta AI Managed Sheets).
- Acesso: service account do Google (projeto GCP já existe). Env: `GOOGLE_SHEETS_CREDENTIALS_PATH` (JSON da service account, fora do git) e `CMS_SHEET_ID`. A planilha deve ser compartilhada com o `client_email` da service account como **leitor** — se der 403, é isso que falta.
- **Sync de mão única** (planilha → SQLite): no boot, a cada 30 min (setInterval no server ou cron do container) e sob demanda via `POST /api/sync` (só admin, botão discreto no rodapé).
- Pipeline por aba: ler valores → validar com zod → **upsert por `id`** → deletar do banco linhas cujo `id` sumiu da aba. Se uma aba falhar validação, **manter os dados anteriores daquela aba**, registrar em `SyncLog` (aba, erro, timestamp) e seguir com as outras. O site SEMPRE serve do SQLite — Google fora do ar não derruba nada.
- **Convenções do parser:** datas `AAAA-MM-DD`, horas `HH:MM` (strings); células com `XX`, `XXXXXX` ou `[PREENCHER]` são tratadas como **vazias** (é a convenção do Murilo pra "falta preencher"); colunas extras desconhecidas são ignoradas sem erro; linha só com `id` (reservada, em preenchimento) é pulada; `id` repetido na mesma aba faz a aba falhar validação (senão uma linha apagaria a outra no upsert); enums aceitam acento/maiúscula (`Manhã` → `manha`, `mk` → `MK`); cabeçalhos são o contrato — se um cabeçalho esperado sumir, a aba falha validação.

### Contrato das abas (cabeçalhos exatos, linha 1)

| Aba | Colunas |
|---|---|
| Roteiro | id, data, dia_semana, titulo, parque_code, quem, hospedagem_noite, early_entry, destaque, notas |
| Agenda | id, roteiro_id, periodo, ordem, titulo, local, detalhe, chip |
| Voos | id, grupo, status, trecho, data, voo, origem, destino, saida, chegada, **reserva**, notas · opcionais: bilhete, bagagem, assentos, detalhes |
| Hospedagens | id, nome, tipo, checkin, checkout, quem, status, confirmacao, notas · opcionais: endereco, detalhes |
| Turma | id, nome, nucleo, tipo, papel, iniciais, aniversario, tagline · opcional: altura_cm |
| Marcos | id, data, hora, titulo, categoria, status, descricao |
| Guia | id, secao, ordem, titulo, conteudo · opcional: detalhes |
| Pacote | id, nucleo, descricao, moeda, valor_total, notas |
| Pagamentos | id, nucleo, data, moeda, valor, descricao |
| Gastos (só admin) | id, item, categoria, moeda, valor_previsto, valor_pago, prazo, status, notas |
| Levar | id, nucleo (ou `todos`), categoria, moeda, valor, base, notas |
| Magia | id, ordem, tema, texto |
| Decisoes | id, ordem, pergunta, detalhe, opcoes, status, encerra_em · opcional: explicacao |
| Pendencias (aba opcional) | id, titulo, categoria, responsavel, prazo, status, notas |
| Atracoes (aba opcional) | id, parque_code, ordem, nome, tipo, altura_min_cm, descricao, video_url · opcionais: foto_url, area, alertas, fila_rapida, duracao_min, detalhes |

Enums: `parque_code` ∈ MK, EP, AK, HS, USF, IOA, EPIC, SW, PEPPA (vazio = dia sem parque) · `periodo` ∈ manha, tarde, noite · `grupo` (voos) ∈ familia, gabi, vm · `nucleo` ∈ pessanha, gabi, vitor, mariana · `tipo` (turma) ∈ adulto, crianca · `papel` ∈ admin, membro, perfil · `status` (voos/marcos) ∈ emitido/pendente/feito etc. — validar como string curta, não travar em lista fechada.

- **Colunas opcionais** (marcadas acima): se o cabeçalho não existe na aba, a coluna é lida como vazia e a aba NÃO falha. São o conteúdo do "card expandido" (folha de detalhe que abre ao tocar no card em Guia, Voos, Hospedagens e no título da pergunta em Decisões). Texto longo com quebras de linha é respeitado.
- **Financeiro (refeito em 04/09/2026; a aba `Financeiro` antiga não existe mais):** `Pacote` = valor fechado que cada núcleo deve ao Murilo (pacote completo: voos + ingressos + hospedagem). `Pagamentos` = lançamentos recebidos; o site soma e calcula pago/falta (nunca há campo "valor_pago" acumulado). `Gastos` = o que ainda sai do bolso do Murilo (só admin; `status` feito/pago = concluído; gasto com saldo entra no radar de Pendências). `Levar` = "quanto levar" por categoria (`nucleo` = `todos` ou específico; `base` texto livre: "por dia por adulto"). As 4 abas são opcionais no sync. Visibilidade: núcleo vê só o próprio Pacote, os próprios Pagamentos e Levar (todos + o seu); admin vê tudo — filtrado no server.
- **Pendencias (só admin):** aba opcional — se não existir na planilha, o sync marca `ausente` e segue sem erro. `status` vazio = aberta; feito/feita/ok/concluída = feita. Tela `/pendencias` (redirect pra home se não for admin; link no rodapé só pro admin) mostra a lista da aba + um "radar" automático: voos não emitidos, hospedagens sem confirmação, marcos com data passada sem "feito", itens do Guia sem conteúdo, financeiro com restante > 0.
- **Voos: a coluna `reserva` é o localizador** e deve aparecer em destaque no site, com botão de copiar — é o dado que a família vai buscar na correria do aeroporto. `notas` é contexto secundário.
- **Magia:** item do dia determinístico: `ordem = ((diasCorridosDesde(2026-09-04)) mod N) + 1`, virando à meia-noite de Brasília; datas antes do epoch mostram o #1. Mostrar "#<ordem> de <N>".
- **Decisoes (votações):** as perguntas são conteúdo (vêm da planilha); os votos são interação (só SQLite, tabela `Vote`, 1 por usuário/pergunta, pode trocar enquanto aberta). `opcoes` separadas por `\|` (mínimo 2) · `status` vazio = aberta, `fechada` = encerrada · `encerra_em` opcional (aceita votos até o fim daquele dia, Brasília). Tela `/decisoes` + card na home + ícone na nav (badge com nº de decisões em aberto; dourado enquanto falta o voto de quem está logado).
- **Atracoes (tier list, desde 29/09/2026):** as atrações são conteúdo (planilha); as notas são interação (só SQLite, `AttractionRating`, 1 por usuário/atração, salva a cada toque). Notas: 3 Imperdível · 2 Quero muito · 1 Se der · 0 Passo; ranking da família = maior média → mais "imperdível" → `ordem`. `tipo` ∈ montanha-russa, dark ride, simulador, água, passeio, show, noturno, parada, personagens, trilha (normalizado: `dark-ride`, `agua`); `altura_min_cm` inteiro (vazio = sem altura mínima; aceita "102 cm"); `alertas` separados por `\|` (molha, escuro, pode assustar, enjoo, radical…); `video_url` do YouTube (embutido na folha via youtube-nocookie). **Fotos:** `foto_url` ou, sem ela, a miniatura do vídeo — o sync baixa pra `data/atracoes/<id>.<ext>` (só o que mudou; `Attraction.fotoOrigem` guarda a origem baixada) e o site serve por `/api/atracoes/[id]/foto`. **Fator criança:** `altura_min_cm` × `altura_cm` das crianças da Turma → quem pode/não pode; criança de fora = Rider Switch (Disney) / Child Swap (Universal/Epic); quem deu "Passo" aparece como candidato a ficar com as crianças.

## Modelo de dados (Prisma, direção)

`User` (username, passwordHash, name, nucleo, papel) · espelhos das abas (`Day`, `AgendaItem`, `Flight`, `Accommodation`, `Person`, `Milestone`, `GuideEntry`, `MagicFact`, `Poll`, `Pendencia`) · `Session` · `SyncLog`. Fase 2 (criar já, usar depois): `Vote`, `TriviaRound`/`TriviaAnswer`, `ChecklistTick` — todas com `userId`. (Bolão/`Prediction` foi descartado em 04/09/2026 — não recriar.) `Package`/`Payment`/`BudgetHint` (índice em `nucleo`) + `Expense` (só admin); toda query financeira filtra por núcleo do usuário logado no server. `Attraction` (espelho da aba Atracoes) + `AttractionRating` (`userId`, `attractionId` sem FK, `nota` 0–3); `Person.alturaCm`. `WishItem` (lista de compras, ver tela 11): `userId`, nome, onde, `paraPersonId` (Person da Turma, sem FK), `precoBrasil`, link, notas, `publico`, `comprado`.

## Design — "noite de fogos"

Referência visual obrigatória: mockup aprovado em https://claude.ai/code/artifact/018dda8e-5497-4a6c-bfa9-ffd5325450c0 (3 telas: home, dia de roteiro, turma). Reproduzir o que está lá; não inventar direção nova.

Tokens (pro `tailwind.config`):

- Fundo: gradiente `#070b26 → #101641 (55%) → #1d1550`; superfícies `rgba(255,255,255,0.06)` com borda `rgba(255,255,255,0.13)`, radius 18–20px; nav em pílula flutuante.
- Texto: `#f3f1ff`; secundário `#a5a3c8`; terciário/labels `#8b89b0`; lavanda `#b7a9e8`.
- Dourado (marca): `#f6c453`, highlight `#ffd97a` (countdown, item ativo da nav, chips de destaque).
- Parques: MK `#8f7bff` · EPCOT `#57c7d8` · AK `#5fbf7a` · HS `#ff8f66` (demais parques: derivar na mesma família de saturação).
- Núcleos (avatares): pessanha dourado `#f6c453` · gabi coral `#ff8a7a` · vitor/mariana teal `#5fd0c5`.
- **Avatares = caricaturas** (desde 29/09/2026): cada pessoa da Turma tem caricatura em `data/avatars/<primeiro-nome>.webp` (rosto, recorte quadrado 384 px) e `<primeiro-nome>-busto.webp` (busto, Turma). **Fora do git** (o repo no GitHub é público e tem as crianças); servidas só pra logado por `/api/avatar/[chave]`. Gerar/trocar com `scripts/caricaturas.py <pasta com os PNGs>` (Pillow; originais em ~/Desktop/Removed BG). Sempre usar `<Avatar>` (`src/components/Avatar.tsx`): caricatura sobre a cor do núcleo, ou a inicial se não houver arquivo. Usuário → pessoa casa pelo nome (`getAvatares()` em queries).
- Tipografia: Fredoka 500–700 (títulos, números do countdown) + Nunito Sans 400–800 (texto). Labels de seção: 11px, bold, letter-spacing largo, uppercase.
- Ícones: SVG inline stroke (1.8, round), nunca emoji. Estrelinhas/brilhos com moderação (herói da home e cards especiais).
- Nav (pílula): Início · Roteiro · Financeiro · Decisões · Compras · Guia. Sem Bolão. Turma fica na fileira de rostos da home e no rodapé; Voos e Hospedagens nos atalhos do topo do Guia (e no chip do voo / "casas" da home).
- **Cards expansíveis:** `CardExpansivel` (card inteiro abre) e `TituloExpansivel` (só o título abre) em `src/components/Detalhe.tsx` abrem uma folha (bottom sheet, portal no body) com o "card maior". Blocos de conteúdo da folha em `src/components/Campo.tsx`. Botões dentro de um card expansível precisam de `stopPropagation` (CopyButton já faz).

## Telas do MVP

1. **Login** — usuário + senha, erro amigável.
2. **Início** — countdown grande até 07/01/2027 21h05 (tick por segundo), chips de stats (9 viajantes · 12 dias de parque · 3 casas), card "Magia do dia", próximos marcos (da aba Marcos, ordenados por data, os sem data no fim; marcos com status feito/concluído/ok não aparecem), prévia dos 3 próximos dias do roteiro.
3. **Roteiro** — lista dos 18 dias (badge de parque colorido, quem vai, hospedagem da noite); detalhe do dia com timeline da Agenda (dot por período), banner especial em 11/01 (aniversário da Joana).
4. **Voos** — por grupo, com o grupo de quem está logado primeiro ("Seus voos"; núcleo → grupo em `GRUPO_DO_NUCLEO`), localizador em destaque com copiar e bagagem no card ("não inclusa" em coral). O chip da home mostra a ida do grupo de quem está logado (`getIdaDoGrupo` junta conexões).
5. **Hospedagens** — linha do tempo das 4 estadias.
6. **Turma** — cards por núcleo com o busto da caricatura saindo do círculo na cor do núcleo, badge de aniversário da Joana.
7. **Guia** — atalhos "Na mão durante a viagem" (Voos com a minha ida, Hospedagens) + seções da aba Guia.
8b. **Pendências** — `/pendencias`, só admin (ver aba Pendencias acima).
8. **Financeiro** — na nav principal (desde 04/09/2026). Núcleo: card do próprio pacote (total, pago, falta), lista de pagamentos, "Quanto levar". Admin: consolidado a receber, card por núcleo (toque abre os pagamentos), seção Gastos (previsto × pago × falta), Levar completo.
9. **PWA** — manifest + ícones + installable; título "Orlando 2027".
10. **Decisões** — `/decisoes`: votação da família nas escolhas em aberto (aba Decisoes), resultado com quem votou em quê. Tocar na pergunta abre a folha com `detalhe` + `explicacao`.

11. **Compras** — `/compras` (desde 10/09/2026): lista de desejos de cada usuário (interação, só SQLite — não é conteúdo da planilha). Item tem nome, onde, "pra quem" (select da Turma; vazio = pra mim), **preço estimado no Brasil** (R$, base pra comparar lá), link, notas, e é **público ou privado por item** (privado só sai do servidor pro dono; nem o admin vê). Tela: formulário de novo item no topo, "Minha lista" (toque abre folha de edição; círculo marca `comprado`, que vira checklist no modo viagem) e "Da família" agrupada por usuário com total estimado. Card na home com contagem e último item publicado. Server actions em `src/app/(app)/compras/actions.ts`, sempre com `userId` da sessão no where.
12. **Atrações** — `/roteiro/atracoes` (aba "Atrações" dentro do Roteiro; a nav não ganhou item): progresso geral, trilha de parques (`TrilhaParques`: todos lado a lado sem rolar, anel de progresso, ordem do roteiro), "Minha lista" (agrupada por nota) e "Família" (ranking com avatares por nota; admin tem "copiar ranking"). Toque abre a folha com vídeo, detalhes, crianças e a minha nota. Modo rápido em `/roteiro/atracoes/classificar` (uma por vez, 4 botões grandes, cada toque salva e pula pra próxima sem nota; sem `?parque=` abre o primeiro parque com nota faltando). A mesma trilha fica no topo do modo rápido (troca de parque a qualquer hora, com o total geral); "pular" não volta no giro — no fim do parque o card puxa pro próximo parque, lista os que faltam e oferece "voltar nas que pulei". Dia de parque no roteiro mostra o top 5 "Imperdíveis da família"; card na home com o progresso.

13. **Pergunte** — `/perguntar` (desde 26/10/2026; botão "Pergunte" no topo, ao lado do avatar; a nav não ganhou item): chat com o Claude Haiku que responde sobre a viagem. Sem RAG nem tools: o prompt leva tudo (~88 mil tokens em out/2026 — português gasta mais token; acima de 100 mil o preço do Haiku dobra, e o primeiro corte seria o `detalhes` das atrações, ~29 mil) em 3 blocos de `system` montados em `src/lib/assistente.ts` — instruções fixas → `contextoViagem()` (o que todo logado vê: roteiro+agenda, voos, hospedagens, turma, marcos pendentes — dos feitos só o título, porque a descrição às vezes traz valor de Gastos —, guia, decisões com votos, atrações com notas; igual pra todos, com `cache_control`) → `contextoUsuario()` (quem pergunta, hoje, financeiro e compras). **Premissa 2 vale aqui:** o bloco do usuário sai das mesmas queries filtradas das telas (`getFinanceiro`, `getCompras`, `getPendencias` só pro admin) — dado de outro núcleo ou item privado nunca entra no prompt; não confiar em instrução pro modelo "não contar". Rota `POST /api/chat` (sessão obrigatória, zod, 40 perguntas/hora por usuário em memória, stream de texto puro, loga tokens no stdout). A conversa fica só no `sessionStorage` do navegador — nada no banco. Conteúdo novo numa aba entra no assistente formatando-o em `contextoViagem()`; manter a saída determinística (mesma ordem) senão o cache de prompt não pega.

Modo viagem (home vira "hoje") é fase 3 — deixar o layout da home preparado, não implementar agora.

## Ordem de ataque

- **M1:** scaffold + auth + Docker + deploy no ar com home mínima (countdown real). Deploy cedo — a família já acessa.
- **M2:** schema + sync completo da planilha com validação e SyncLog.
- **M3:** telas 2–8 com dados reais.
- **M4:** PWA + polish (animações discretas, estrelas no herói).

## Roadmap pós-MVP

- **Fase 2 — Hype (nov–dez/2026):** ~~wishlist de atrações~~ (feita em 29/09/2026: tela 12) · trivia dos parques com ranking entre os 6 adultos · clima de janeiro + crowd calendar (API queue-times).
- **Fase 3 — Modo viagem (jan/2027):** a partir de 07/01 a home vira "hoje" (parque do dia, horários, reservas do dia, quem vai aonde) · galeria do álbum compartilhado do iCloud organizada por dia · wishlist vira checklist de "feito!".
- **Fotos:** iCloud Shared Album via webstream (API não oficial; lib `ICloud-Shared-Album` no npm). Google Photos descartado: desde 31/03/2025 a Library API não lê mais álbuns do usuário. Validar com um álbum de teste antes da Fase 3; fallback: Immich no server ou upload simples.
- **Fora de escopo (reavaliar pós-MVP):** notificações push/Telegram · rateio detalhado de despesas (fica na planilha).

## Não fazer

CRUD de conteúdo · financeiro cross-núcleo · upload de arquivos/documentos · light mode · i18n · Google Photos (galeria será iCloud shared album, fase 3) · Express/terceiros no backend além do Next · dependências pesadas de UI (nada de MUI/Chakra — Tailwind puro).
