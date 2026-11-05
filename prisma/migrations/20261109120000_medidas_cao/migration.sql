-- Peso e cernelha ao longo do tempo
CREATE TABLE "MedidaCao" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "pesoKg" DECIMAL(7,3),
    "cernelhaCm" DECIMAL(5,1),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedidaCao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MedidaCao_caoId_data_idx" ON "MedidaCao"("caoId", "data");
ALTER TABLE "MedidaCao" ADD CONSTRAINT "MedidaCao_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
