-- Confirmação de WhatsApp e limite de tentativas
ALTER TABLE "User" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN "whatsappVerificadoEm" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "whatsappPendente" TEXT;
CREATE UNIQUE INDEX "User_whatsapp_key" ON "User"("whatsapp");

CREATE TABLE "LimiteTaxa" (
    "chave" TEXT NOT NULL,
    "contagem" INTEGER NOT NULL DEFAULT 0,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LimiteTaxa_pkey" PRIMARY KEY ("chave")
);
CREATE INDEX "LimiteTaxa_expiraEm_idx" ON "LimiteTaxa"("expiraEm");

-- Contas que já existem (equipe e canis convidados do piloto) entram com o e-mail
-- como confirmado; a exigência vale para os novos cadastros.
UPDATE "User" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;
