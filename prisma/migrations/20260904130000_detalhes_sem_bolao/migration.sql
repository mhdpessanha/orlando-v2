-- Colunas opcionais das abas (card expandido no site)
ALTER TABLE "Flight" ADD COLUMN "assentos" TEXT;
ALTER TABLE "Flight" ADD COLUMN "bagagem" TEXT;
ALTER TABLE "Flight" ADD COLUMN "bilhete" TEXT;
ALTER TABLE "Flight" ADD COLUMN "detalhes" TEXT;

ALTER TABLE "Accommodation" ADD COLUMN "detalhes" TEXT;
ALTER TABLE "Accommodation" ADD COLUMN "endereco" TEXT;

ALTER TABLE "GuideEntry" ADD COLUMN "detalhes" TEXT;

ALTER TABLE "Poll" ADD COLUMN "explicacao" TEXT;

-- Bolão descartado: a tabela nunca foi usada
DROP TABLE "Prediction";
