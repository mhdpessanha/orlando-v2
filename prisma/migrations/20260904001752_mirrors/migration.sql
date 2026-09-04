-- CreateTable
CREATE TABLE "Day" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "diaSemana" TEXT,
    "titulo" TEXT NOT NULL,
    "parqueCode" TEXT,
    "quem" TEXT,
    "hospedagemNoite" TEXT,
    "earlyEntry" TEXT,
    "destaque" TEXT,
    "notas" TEXT
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roteiroId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "local" TEXT,
    "detalhe" TEXT,
    "chip" TEXT
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grupo" TEXT NOT NULL,
    "status" TEXT,
    "trecho" TEXT,
    "data" TEXT,
    "voo" TEXT,
    "origem" TEXT,
    "destino" TEXT,
    "saida" TEXT,
    "chegada" TEXT,
    "reserva" TEXT,
    "notas" TEXT
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "checkin" TEXT,
    "checkout" TEXT,
    "quem" TEXT,
    "status" TEXT,
    "confirmacao" TEXT,
    "notas" TEXT
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "nucleo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "iniciais" TEXT,
    "aniversario" TEXT,
    "tagline" TEXT
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT,
    "hora" TEXT,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "status" TEXT,
    "descricao" TEXT
);

-- CreateTable
CREATE TABLE "GuideEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT
);

-- CreateTable
CREATE TABLE "FinanceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nucleo" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "moeda" TEXT,
    "valorTotal" REAL,
    "valorPago" REAL,
    "valorRestante" REAL,
    "notas" TEXT
);

-- CreateTable
CREATE TABLE "MagicFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordem" INTEGER NOT NULL,
    "tema" TEXT,
    "texto" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TriviaRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordem" INTEGER NOT NULL,
    "pergunta" TEXT NOT NULL,
    "opcoes" TEXT NOT NULL,
    "correta" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TriviaAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TriviaAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TriviaAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "TriviaRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistTick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChecklistTick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgendaItem_roteiroId_idx" ON "AgendaItem"("roteiroId");

-- CreateIndex
CREATE INDEX "FinanceItem_nucleo_idx" ON "FinanceItem"("nucleo");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_pollId_key" ON "Vote"("userId", "pollId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_key_key" ON "Prediction"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TriviaAnswer_userId_roundId_key" ON "TriviaAnswer"("userId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTick_userId_itemKey_key" ON "ChecklistTick"("userId", "itemKey");
