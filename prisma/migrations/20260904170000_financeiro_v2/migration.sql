-- Financeiro refeito: pacote fechado por núcleo + lançamentos + gastos do admin + "quanto levar"
DROP TABLE "FinanceItem";

CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nucleo" TEXT NOT NULL,
    "descricao" TEXT,
    "moeda" TEXT,
    "valorTotal" REAL,
    "notas" TEXT
);
CREATE INDEX "Package_nucleo_idx" ON "Package"("nucleo");

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nucleo" TEXT NOT NULL,
    "data" TEXT,
    "moeda" TEXT,
    "valor" REAL,
    "descricao" TEXT
);
CREATE INDEX "Payment_nucleo_idx" ON "Payment"("nucleo");

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item" TEXT NOT NULL,
    "categoria" TEXT,
    "moeda" TEXT,
    "valorPrevisto" REAL,
    "valorPago" REAL,
    "prazo" TEXT,
    "status" TEXT,
    "notas" TEXT
);

CREATE TABLE "BudgetHint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nucleo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "moeda" TEXT,
    "valor" REAL,
    "base" TEXT,
    "notas" TEXT
);
CREATE INDEX "BudgetHint_nucleo_idx" ON "BudgetHint"("nucleo");
