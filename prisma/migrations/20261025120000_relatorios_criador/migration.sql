-- Lote A: relatórios para o criador.
ALTER TABLE "LancamentoFinanceiro" ADD COLUMN "ninhadaId" TEXT;
CREATE INDEX "LancamentoFinanceiro_ninhadaId_idx" ON "LancamentoFinanceiro"("ninhadaId");
ALTER TABLE "LancamentoFinanceiro"
  ADD CONSTRAINT "LancamentoFinanceiro_ninhadaId_fkey" FOREIGN KEY ("ninhadaId") REFERENCES "Ninhada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendaRegistro"
  ADD COLUMN "compradorNome" TEXT,
  ADD COLUMN "compradorEmail" TEXT,
  ADD COLUMN "origemComprador" TEXT,
  ADD COLUMN "estadoComprador" TEXT,
  ADD COLUMN "cidadeComprador" TEXT;

ALTER TABLE "EventoMercado" ADD COLUMN "origem" TEXT;

ALTER TABLE "Canil" ADD COLUMN "avisoSemanal" BOOLEAN NOT NULL DEFAULT true;
