-- Lote B: marca do canil.
ALTER TABLE "Canil" ADD COLUMN "fotos" TEXT[];
ALTER TABLE "Cao" ADD COLUMN "exibirNoCanil" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "VendaRegistro" ADD COLUMN "tokenAvaliacao" TEXT;
CREATE UNIQUE INDEX "VendaRegistro_tokenAvaliacao_key" ON "VendaRegistro"("tokenAvaliacao");

ALTER TABLE "Avaliacao" ADD COLUMN "verificada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Avaliacao" ADD COLUMN "vendaId" TEXT;
CREATE UNIQUE INDEX "Avaliacao_vendaId_key" ON "Avaliacao"("vendaId");
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaRegistro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ninhada" ADD COLUMN "tokenAlbum" TEXT;
CREATE UNIQUE INDEX "Ninhada_tokenAlbum_key" ON "Ninhada"("tokenAlbum");

CREATE TABLE "FotoNinhada" (
    "id" TEXT NOT NULL,
    "ninhadaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legenda" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoNinhada_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FotoNinhada_ninhadaId_idx" ON "FotoNinhada"("ninhadaId");
ALTER TABLE "FotoNinhada" ADD CONSTRAINT "FotoNinhada_ninhadaId_fkey" FOREIGN KEY ("ninhadaId") REFERENCES "Ninhada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Certificado" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "vendaId" TEXT,
    "compradorNome" TEXT,
    "emitidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Certificado_codigo_key" ON "Certificado"("codigo");
CREATE INDEX "Certificado_caoId_idx" ON "Certificado"("caoId");
CREATE INDEX "Certificado_canilId_idx" ON "Certificado"("canilId");
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaRegistro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
