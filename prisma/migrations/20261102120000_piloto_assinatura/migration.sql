-- Piloto: 90 dias sem cobrança; depois todos pagam a mesma mensalidade.
-- Quem indica um canil ganha desconto na mensalidade seguinte (1 por indicação).
ALTER TABLE "Canil" ADD COLUMN "descontosIndicacao" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Pagamento" ADD COLUMN "valorCheio" DECIMAL(10,2);
ALTER TABLE "Pagamento" ADD COLUMN "usouDescontoIndicacao" BOOLEAN NOT NULL DEFAULT false;

-- Quem já está na plataforma entra no piloto: 90 dias grátis a partir de agora.
UPDATE "Canil" SET "proGratisAte" = GREATEST(COALESCE("proGratisAte", NOW()), NOW() + INTERVAL '90 days');
