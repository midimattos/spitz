CREATE TABLE "Descendente" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "cor" TEXT,
    "fotoUrl" TEXT,
    "outroGenitor" TEXT,
    "tutorNome" TEXT,
    "mostrarTutor" BOOLEAN NOT NULL DEFAULT false,
    "exibirPublico" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Descendente_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Descendente_caoId_idx" ON "Descendente"("caoId");
ALTER TABLE "Descendente" ADD CONSTRAINT "Descendente_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
