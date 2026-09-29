-- Atrações: espelho da aba Atracoes + nota de cada adulto; altura das crianças na Turma
-- AlterTable
ALTER TABLE "Person" ADD COLUMN "alturaCm" INTEGER;

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parqueCode" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "alturaMinCm" INTEGER,
    "descricao" TEXT,
    "videoUrl" TEXT,
    "fotoUrl" TEXT,
    "area" TEXT,
    "alertas" TEXT,
    "filaRapida" TEXT,
    "duracaoMin" INTEGER,
    "detalhes" TEXT,
    "fotoOrigem" TEXT
);

-- CreateTable
CREATE TABLE "AttractionRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttractionRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Attraction_parqueCode_idx" ON "Attraction"("parqueCode");

-- CreateIndex
CREATE INDEX "AttractionRating_attractionId_idx" ON "AttractionRating"("attractionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttractionRating_userId_attractionId_key" ON "AttractionRating"("userId", "attractionId");
