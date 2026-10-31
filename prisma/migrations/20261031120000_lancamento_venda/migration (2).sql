-- Receita lançada automaticamente ao registrar uma venda
ALTER TABLE "LancamentoFinanceiro" ADD COLUMN "vendaId" TEXT;
CREATE UNIQUE INDEX "LancamentoFinanceiro_vendaId_key" ON "LancamentoFinanceiro"("vendaId");
