-- CreateTable
CREATE TABLE "Pendencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "responsavel" TEXT,
    "prazo" TEXT,
    "status" TEXT,
    "notas" TEXT
);
