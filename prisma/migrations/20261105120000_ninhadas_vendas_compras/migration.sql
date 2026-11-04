-- Filhotes ligados à ninhada de origem, venda e compra de cães, lançamentos automáticos.
ALTER TABLE "Cao" ADD COLUMN "ninhadaId" TEXT;
ALTER TABLE "Cao" ADD COLUMN "vendidoEm" TIMESTAMP(3);
ALTER TABLE "Cao" ADD COLUMN "valorVenda" DECIMAL(10,2);
ALTER TABLE "Cao" ADD COLUMN "compradorNome" TEXT;
ALTER TABLE "Cao" ADD COLUMN "compradorContato" TEXT;
ALTER TABLE "Cao" ADD COLUMN "valorCompra" DECIMAL(10,2);
ALTER TABLE "Cao" ADD COLUMN "dataCompra" TIMESTAMP(3);
ALTER TABLE "Cao" ADD COLUMN "compradoDe" TEXT;

ALTER TABLE "Ninhada" ADD COLUMN "coberturaEstimada" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LancamentoFinanceiro" ADD COLUMN "chaveAuto" TEXT;

CREATE UNIQUE INDEX "LancamentoFinanceiro_chaveAuto_key" ON "LancamentoFinanceiro"("chaveAuto");
CREATE INDEX "Cao_ninhadaId_idx" ON "Cao"("ninhadaId");
ALTER TABLE "Cao" ADD CONSTRAINT "Cao_ninhadaId_fkey" FOREIGN KEY ("ninhadaId") REFERENCES "Ninhada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Liga os filhotes já cadastrados à ninhada: mesma mãe e nascimento até 7 dias do parto registrado.
UPDATE "Cao" c
SET "ninhadaId" = x."ninhadaId"
FROM (
  SELECT DISTINCT ON (c2."id") c2."id" AS "caoId", n."id" AS "ninhadaId"
  FROM "Cao" c2
  JOIN "Ninhada" n ON n."caoMaeId" = c2."maeId"
  WHERE n."dataParto" IS NOT NULL
    AND c2."dataNascimento" IS NOT NULL
    AND c2."ninhadaId" IS NULL
    AND ABS(EXTRACT(EPOCH FROM (c2."dataNascimento" - n."dataParto"))) <= 7 * 86400
  ORDER BY c2."id", ABS(EXTRACT(EPOCH FROM (c2."dataNascimento" - n."dataParto"))) ASC
) x
WHERE c."id" = x."caoId";
