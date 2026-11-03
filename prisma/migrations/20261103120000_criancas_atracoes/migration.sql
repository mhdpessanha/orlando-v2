-- Atrações das crianças: coluna opcional publico ("criancas" = só na lista delas) + nota de cada criança, dada pelos pais
-- AlterTable
ALTER TABLE "Attraction" ADD COLUMN "publico" TEXT;

-- CreateTable
CREATE TABLE "ChildRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "porUserId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChildRating_porUserId_fkey" FOREIGN KEY ("porUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChildRating_attractionId_idx" ON "ChildRating"("attractionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildRating_personId_attractionId_key" ON "ChildRating"("personId", "attractionId");

