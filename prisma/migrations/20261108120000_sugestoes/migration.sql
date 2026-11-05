-- Caixa de sugestões dos criadores
CREATE TABLE "Sugestao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorEmail" TEXT NOT NULL,
    "canilNome" TEXT,
    "texto" TEXT NOT NULL,
    "pagina" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sugestao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Sugestao_lida_criadoEm_idx" ON "Sugestao"("lida", "criadoEm");
