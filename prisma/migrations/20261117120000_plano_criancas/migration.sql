-- Plano das crianças: espelho da aba opcional PlanoCriancas (o dia hora a hora)
-- CreateTable
CREATE TABLE "KidsPlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roteiroId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "bloco" TEXT,
    "tipo" TEXT NOT NULL,
    "plano" TEXT,
    "titulo" TEXT NOT NULL,
    "quem" TEXT,
    "local" TEXT,
    "atracaoIds" TEXT,
    "detalhe" TEXT,
    "videoUrl" TEXT,
    "status" TEXT
);

-- CreateIndex
CREATE INDEX "KidsPlanItem_roteiroId_idx" ON "KidsPlanItem"("roteiroId");
