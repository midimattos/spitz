ALTER TABLE "Canil" ADD COLUMN "proGratisAte" TIMESTAMP(3);

CREATE TABLE "ListaEspera" (
    "id" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "preferencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListaEspera_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ListaEspera_canilId_email_key" ON "ListaEspera"("canilId", "email");
CREATE INDEX "ListaEspera_canilId_idx" ON "ListaEspera"("canilId");
ALTER TABLE "ListaEspera" ADD CONSTRAINT "ListaEspera_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AvisoAnuncio" (
    "id" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvisoAnuncio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AvisoAnuncio_anuncioId_email_key" ON "AvisoAnuncio"("anuncioId", "email");
ALTER TABLE "AvisoAnuncio" ADD CONSTRAINT "AvisoAnuncio_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "compradorNome" TEXT NOT NULL,
    "compradorEmail" TEXT,
    "valorSinal" DECIMAL(10,2),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Reserva_anuncioId_idx" ON "Reserva"("anuncioId");
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "garantiaDias" INTEGER NOT NULL DEFAULT 7,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aceitoEm" TIMESTAMP(3),
    "aceitoNome" TEXT,
    "aceitoIp" TEXT,
    "aceitoNavegador" TEXT,
    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contrato_vendaId_key" ON "Contrato"("vendaId");
CREATE UNIQUE INDEX "Contrato_token_key" ON "Contrato"("token");
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaRegistro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PosVendaEnvio" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "marco" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PosVendaEnvio_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PosVendaEnvio_vendaId_marco_key" ON "PosVendaEnvio"("vendaId", "marco");
ALTER TABLE "PosVendaEnvio" ADD CONSTRAINT "PosVendaEnvio_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "VendaRegistro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
