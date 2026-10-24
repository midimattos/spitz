ALTER TABLE "VendaRegistro" ADD COLUMN "compradorTelefone" TEXT;
ALTER TABLE "VendaRegistro" ADD COLUMN "confirmadaEm" TIMESTAMP(3);
ALTER TABLE "VendaRegistro" ADD COLUMN "confirmacao" TEXT;
ALTER TABLE "VendaRegistro" ADD COLUMN "excluida" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VendaRegistro" ADD COLUMN "registroIp" TEXT;
ALTER TABLE "VendaRegistro" ADD COLUMN "confirmacaoIp" TEXT;
