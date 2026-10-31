-- Busca/desejo detalhados: cor base, marcação, diluição, merle, faixa mínima e cidade.
ALTER TABLE "DesejoComprador"
  ADD COLUMN "corBase" TEXT,
  ADD COLUMN "marcacao" TEXT,
  ADD COLUMN "diluicao" TEXT,
  ADD COLUMN "merle" TEXT,
  ADD COLUMN "precoMin" DECIMAL(10,2),
  ADD COLUMN "cidade" TEXT;

ALTER TABLE "DesejoHistorico"
  ADD COLUMN "corBase" TEXT,
  ADD COLUMN "marcacao" TEXT,
  ADD COLUMN "diluicao" TEXT,
  ADD COLUMN "merle" TEXT,
  ADD COLUMN "precoMin" DECIMAL(10,2),
  ADD COLUMN "cidade" TEXT;
