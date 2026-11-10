-- Galeria de fotos do cão
CREATE TABLE "FotoCao" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoCao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FotoCao_caoId_criadoEm_idx" ON "FotoCao"("caoId", "criadoEm");
ALTER TABLE "FotoCao" ADD CONSTRAINT "FotoCao_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
