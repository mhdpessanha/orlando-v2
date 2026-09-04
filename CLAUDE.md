# Orlando 2027 — Site da viagem (v2)

Site privado da viagem em família a Orlando (07–24/01/2027, 9 pessoas), auto-hospedado no Mac Mini M2 do Murilo e exposto em `orlando.pessanhaserver.com.br` via Cloudflare Tunnel. Reescrita do zero do site v1 (mesmo repo, código antigo descartado). Objetivo duplo: **útil** (apresentar o plano) e **hype** (animar a família até o embarque).

**Meta: MVP no ar antes de 09/11/2026** (abertura das ADRs).

## Premissas invioláveis

1. **O site não é ferramenta de planejamento.** Todo conteúdo de planejamento vem da planilha-CMS (Google Sheets) por sync de mão única. **Não construir telas de criação/edição de conteúdo** — nem admin de CRUD. A única escrita dos usuários são as interações (fase 2: votos, palpites, trivia, checklists), que vivem só no SQLite e nunca vão pra planilha.
2. **Visibilidade financeira por núcleo, aplicada no servidor.** Núcleos: `pessanha` (Murilo+Joana), `gabi` (Gabi+Gustavo+Lucas), `vitor`, `mariana`. Cada usuário só recebe do servidor os dados financeiros do próprio núcleo; `papel=admin` (Murilo) vê tudo. Nunca resolver isso escondendo no client.
3. **Mobile-first (390px), pt-BR, PWA instalável, tema escuro único** ("noite de fogos" — ver Design). Sem light mode, sem i18n.
4. **Nada sensível:** sem upload de documentos, sem dados de passaporte/visto. Localizadores de reserva podem aparecer (decisão consciente).
5. 6 logins: murilo (admin), joana, gabi, gustavo, vitor, mariana. Crianças (Olívia, Bernardo, Lucas) são perfis na Turma, sem login.

## Stack e infra

- Next.js (App Router) + TypeScript + Tailwind + Prisma/SQLite (banco em `./data/orlando.db`, volume no Docker).
- Auth própria: bcryptjs + cookie HTTP-only, sessão 30 dias, middleware protegendo tudo exceto `/login`. Script `create-user` pra definir senhas. (Igual ao v1 — o README antigo tem o passo a passo de deploy com Docker + Cloudflare Tunnel; reaproveitar o fluxo.)
- Deploy: `docker compose up -d --build` no Mac Mini; tunnel já aponta `orlando.pessanhaserver.com.br` → `http://app:3000`.
- Fonts via `next/font/google`: Fredoka (display) + Nunito Sans (texto).

## Fonte de dados: planilha-CMS

- Spreadsheet ID: `1robcUP4JwMFHiVldsJDvS13mTqIWDyD1XEN7GGilKRU` (arquivo "Site_Orlando_2027__CMS" no Drive do Murilo, pasta AI Managed Sheets).
- Acesso: service account do Google (projeto GCP já existe). Env: `GOOGLE_SHEETS_CREDENTIALS_PATH` (JSON da service account, fora do git) e `CMS_SHEET_ID`. A planilha deve ser compartilhada com o `client_email` da service account como **leitor** — se der 403, é isso que falta.
- **Sync de mão única** (planilha → SQLite): no boot, a cada 30 min (setInterval no server ou cron do container) e sob demanda via `POST /api/sync` (só admin, botão discreto no rodapé).
- Pipeline por aba: ler valores → validar com zod → **upsert por `id`** → deletar do banco linhas cujo `id` sumiu da aba. Se uma aba falhar validação, **manter os dados anteriores daquela aba**, registrar em `SyncLog` (aba, erro, timestamp) e seguir com as outras. O site SEMPRE serve do SQLite — Google fora do ar não derruba nada.
- **Convenções do parser:** datas `AAAA-MM-DD`, horas `HH:MM` (strings); células com `XX`, `XXXXXX` ou `[PREENCHER]` são tratadas como **vazias** (é a convenção do Murilo pra "falta preencher"); colunas extras desconhecidas são ignoradas sem erro; cabeçalhos são o contrato — se um cabeçalho esperado sumir, a aba falha validação.

### Contrato das abas (cabeçalhos exatos, linha 1)

| Aba | Colunas |
|---|---|
| Roteiro | id, data, dia_semana, titulo, parque_code, quem, hospedagem_noite, early_entry, destaque, notas |
| Agenda | id, roteiro_id, periodo, ordem, titulo, local, detalhe, chip |
| Voos | id, grupo, status, trecho, data, voo, origem, destino, saida, chegada, **reserva**, notas |
| Hospedagens | id, nome, tipo, checkin, checkout, quem, status, confirmacao, notas |
| Turma | id, nome, nucleo, tipo, papel, iniciais, aniversario, tagline |
| Marcos | id, data, hora, titulo, categoria, status, descricao |
| Guia | id, secao, ordem, titulo, conteudo |
| Financeiro | id, nucleo, item, moeda, valor_total, valor_pago, valor_restante, notas |
| Magia | id, ordem, tema, texto |
| Decisoes | id, ordem, pergunta, detalhe, opcoes, status, encerra_em |

Enums: `parque_code` ∈ MK, EP, AK, HS, USF, IOA, EPIC, SW, PEPPA (vazio = dia sem parque) · `periodo` ∈ manha, tarde, noite · `grupo` (voos) ∈ familia, gabi, vm · `nucleo` ∈ pessanha, gabi, vitor, mariana · `tipo` (turma) ∈ adulto, crianca · `papel` ∈ admin, membro, perfil · `status` (voos/marcos) ∈ emitido/pendente/feito etc. — validar como string curta, não travar em lista fechada.

- **Voos: a coluna `reserva` é o localizador** e deve aparecer em destaque no site, com botão de copiar — é o dado que a família vai buscar na correria do aeroporto. `notas` é contexto secundário.
- **Magia:** item do dia determinístico: `ordem = ((diasCorridosDesde(2026-09-04)) mod N) + 1`, virando à meia-noite de Brasília; datas antes do epoch mostram o #1. Mostrar "#<ordem> de <N>".
- **Decisoes (votações):** as perguntas são conteúdo (vêm da planilha); os votos são interação (só SQLite, tabela `Vote`, 1 por usuário/pergunta, pode trocar enquanto aberta). `opcoes` separadas por `\|` (mínimo 2) · `status` vazio = aberta, `fechada` = encerrada · `encerra_em` opcional (aceita votos até o fim daquele dia, Brasília). Tela `/decisoes` + card na home + link no rodapé.

## Modelo de dados (Prisma, direção)

`User` (username, passwordHash, name, nucleo, papel) · espelhos das abas (`Day`, `AgendaItem`, `Flight`, `Accommodation`, `Person`, `Milestone`, `GuideEntry`, `FinanceItem`, `MagicFact`) · `Session` · `SyncLog`. Fase 2 (criar já, usar depois): `Vote`, `Prediction`, `TriviaRound`/`TriviaAnswer`, `ChecklistTick` — todas com `userId`. `FinanceItem.nucleo` indexado; toda query financeira filtra por núcleo do usuário logado no server.

## Design — "noite de fogos"

Referência visual obrigatória: mockup aprovado em https://claude.ai/code/artifact/018dda8e-5497-4a6c-bfa9-ffd5325450c0 (3 telas: home, dia de roteiro, turma). Reproduzir o que está lá; não inventar direção nova.

Tokens (pro `tailwind.config`):

- Fundo: gradiente `#070b26 → #101641 (55%) → #1d1550`; superfícies `rgba(255,255,255,0.06)` com borda `rgba(255,255,255,0.13)`, radius 18–20px; nav em pílula flutuante.
- Texto: `#f3f1ff`; secundário `#a5a3c8`; terciário/labels `#8b89b0`; lavanda `#b7a9e8`.
- Dourado (marca): `#f6c453`, highlight `#ffd97a` (countdown, item ativo da nav, chips de destaque).
- Parques: MK `#8f7bff` · EPCOT `#57c7d8` · AK `#5fbf7a` · HS `#ff8f66` (demais parques: derivar na mesma família de saturação).
- Núcleos (avatares): pessanha dourado `#f6c453` · gabi coral `#ff8a7a` · vitor/mariana teal `#5fd0c5`.
- Tipografia: Fredoka 500–700 (títulos, números do countdown) + Nunito Sans 400–800 (texto). Labels de seção: 11px, bold, letter-spacing largo, uppercase.
- Ícones: SVG inline stroke (1.8, round), nunca emoji. Estrelinhas/brilhos com moderação (herói da home e cards especiais).

## Telas do MVP

1. **Login** — usuário + senha, erro amigável.
2. **Início** — countdown grande até 07/01/2027 21h05 (tick por segundo), chips de stats (9 viajantes · 12 dias de parque · 3 casas), card "Magia do dia", próximos marcos (da aba Marcos, ordenados por data, os sem data no fim), prévia dos 3 próximos dias do roteiro.
3. **Roteiro** — lista dos 18 dias (badge de parque colorido, quem vai, hospedagem da noite); detalhe do dia com timeline da Agenda (dot por período), banner especial em 11/01 (aniversário da Joana).
4. **Voos** — por grupo (família emitida / Gabi e V&M pendentes), localizador em destaque com copiar.
5. **Hospedagens** — linha do tempo das 4 estadias.
6. **Turma** — cards por núcleo, badge de aniversário da Joana.
7. **Guia** — seções da aba Guia.
8. **Financeiro** — rota discreta (link no rodapé, não na nav principal): pago × restante do núcleo do usuário.
9. **PWA** — manifest + ícones + installable; título "Orlando 2027".
10. **Decisões** — `/decisoes`: votação da família nas escolhas em aberto (aba Decisoes), resultado com quem votou em quê.

Modo viagem (home vira "hoje") é fase 3 — deixar o layout da home preparado, não implementar agora.

## Ordem de ataque

- **M1:** scaffold + auth + Docker + deploy no ar com home mínima (countdown real). Deploy cedo — a família já acessa.
- **M2:** schema + sync completo da planilha com validação e SyncLog.
- **M3:** telas 2–8 com dados reais.
- **M4:** PWA + polish (animações discretas, estrelas no herói).

## Não fazer

CRUD de conteúdo · financeiro cross-núcleo · upload de arquivos/documentos · light mode · i18n · Google Photos (galeria será iCloud shared album, fase 3) · Express/terceiros no backend além do Next · dependências pesadas de UI (nada de MUI/Chakra — Tailwind puro).
