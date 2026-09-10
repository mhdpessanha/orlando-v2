-- Lista de compras: item de desejo por usuário (público/privado), preço estimado no Brasil
CREATE TABLE "WishItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "onde" TEXT,
    "paraPersonId" TEXT,
    "precoBrasil" REAL,
    "link" TEXT,
    "notas" TEXT,
    "publico" BOOLEAN NOT NULL DEFAULT true,
    "comprado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WishItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WishItem_userId_idx" ON "WishItem"("userId");
