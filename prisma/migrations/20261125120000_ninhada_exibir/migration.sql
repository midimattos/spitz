-- Criador escolhe quais ninhadas aparecem na página pública
ALTER TABLE "Ninhada" ADD COLUMN "exibirNoCanil" BOOLEAN NOT NULL DEFAULT true;
