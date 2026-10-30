-- Origem do cão (plantel próprio x outro canil) e número de registro
ALTER TABLE "Cao" ADD COLUMN "externo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cao" ADD COLUMN "registro" TEXT;
ALTER TABLE "Cao" ADD COLUMN "canilOrigem" TEXT;
CREATE INDEX "Cao_registro_idx" ON "Cao"("registro");
