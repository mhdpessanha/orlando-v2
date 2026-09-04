-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordem" INTEGER NOT NULL,
    "pergunta" TEXT NOT NULL,
    "detalhe" TEXT,
    "opcoes" TEXT NOT NULL,
    "status" TEXT,
    "encerraEm" TEXT
);
