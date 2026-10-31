-- CreateEnum
CREATE TYPE "MotivoEncerramento" AS ENUM ('VENDIDO_PLATAFORMA', 'VENDIDO_FORA', 'DESISTI', 'PRECO_ALTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CanalVenda" AS ENUM ('PLATAFORMA_MATCH', 'PLATAFORMA_CONTATO', 'FORA');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('VISUALIZACAO_ANUNCIO', 'VISUALIZACAO_CANIL', 'BUSCA', 'FAVORITO', 'CONTATO', 'MATCH_INTERESSE');

-- CreateEnum
CREATE TYPE "StatusValidacao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoCuidado" AS ENUM ('VACINA', 'VERMIFUGO', 'ANTIPULGAS', 'CONSULTA', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoCriopreservacao" AS ENUM ('SEMEN', 'EMBRIAO', 'OVULO');

-- CreateEnum
CREATE TYPE "StatusCriopreservacao" AS ENUM ('DISPONIVEL', 'USADO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('MENSAGEM_NOVA', 'MATCH_NOVO', 'MATCH_ACEITO', 'COMPRADOR_APROVADO', 'CANIL_VERIFICADO', 'CIO_PROXIMO', 'PARTO_PROXIMO', 'CUIDADO_VENCENDO', 'ANUNCIO_ENCALHADO', 'SISTEMA');

-- AlterTable
ALTER TABLE "Anuncio" ADD COLUMN     "publicadoEm" TIMESTAMP(3),
ADD COLUMN     "encerradoEm" TIMESTAMP(3),
ADD COLUMN     "motivoEncerramento" "MotivoEncerramento";

-- AlterTable
ALTER TABLE "MensagemContato" ADD COLUMN     "respondidaEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DesejoComprador" ADD COLUMN     "validacao" "StatusValidacao" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "validadoEm" TIMESTAMP(3),
ADD COLUMN     "validacaoNota" TEXT;

-- Anúncios que já estavam no ar passam a ter data de publicação (aproximada pela criação)
UPDATE "Anuncio" SET "publicadoEm" = "criadoEm" WHERE "status" IN ('PUBLICADO', 'PAUSADO', 'VENDIDO');

-- CreateTable
CREATE TABLE "EventoMercado" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "anuncioId" TEXT,
    "canilId" TEXT,
    "userId" TEXT,
    "visitante" TEXT,
    "porte" TEXT,
    "cor" TEXT,
    "sexo" "Sexo",
    "estado" TEXT,
    "preco" DECIMAL(10,2),
    "filtros" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoMercado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorito" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoPreco" (
    "id" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPreco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendaRegistro" (
    "id" TEXT NOT NULL,
    "anuncioId" TEXT,
    "canilId" TEXT NOT NULL,
    "precoAnunciado" DECIMAL(10,2) NOT NULL,
    "precoFinal" DECIMAL(10,2) NOT NULL,
    "canal" "CanalVenda" NOT NULL,
    "dataVenda" TIMESTAMP(3) NOT NULL,
    "diasAteVender" INTEGER NOT NULL,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "contatos" INTEGER NOT NULL DEFAULT 0,
    "porte" TEXT,
    "cor" TEXT,
    "sexo" "Sexo",
    "estado" TEXT,
    "temDossie" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendaRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesejoHistorico" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "porte" TEXT,
    "sexo" "Sexo",
    "precoMax" DECIMAL(10,2),
    "cor" TEXT,
    "estado" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesejoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroCuidado" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "tipo" "TipoCuidado" NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "proximaData" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroCuidado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criopreservacao" (
    "id" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "caoId" TEXT,
    "tipo" "TipoCriopreservacao" NOT NULL,
    "doses" INTEGER NOT NULL,
    "dataColeta" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "validade" TIMESTAMP(3),
    "status" "StatusCriopreservacao" NOT NULL DEFAULT 'DISPONIVEL',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Criopreservacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "chave" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoMercado_tipo_criadoEm_idx" ON "EventoMercado"("tipo", "criadoEm");

-- CreateIndex
CREATE INDEX "EventoMercado_anuncioId_tipo_idx" ON "EventoMercado"("anuncioId", "tipo");

-- CreateIndex
CREATE INDEX "EventoMercado_canilId_idx" ON "EventoMercado"("canilId");

-- CreateIndex
CREATE INDEX "Favorito_anuncioId_idx" ON "Favorito"("anuncioId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorito_userId_anuncioId_key" ON "Favorito"("userId", "anuncioId");

-- CreateIndex
CREATE INDEX "HistoricoPreco_anuncioId_idx" ON "HistoricoPreco"("anuncioId");

-- CreateIndex
CREATE UNIQUE INDEX "VendaRegistro_anuncioId_key" ON "VendaRegistro"("anuncioId");

-- CreateIndex
CREATE INDEX "VendaRegistro_dataVenda_idx" ON "VendaRegistro"("dataVenda");

-- CreateIndex
CREATE INDEX "VendaRegistro_porte_cor_idx" ON "VendaRegistro"("porte", "cor");

-- CreateIndex
CREATE INDEX "VendaRegistro_canilId_idx" ON "VendaRegistro"("canilId");

-- CreateIndex
CREATE INDEX "DesejoHistorico_criadoEm_idx" ON "DesejoHistorico"("criadoEm");

-- CreateIndex
CREATE INDEX "DesejoHistorico_cor_porte_idx" ON "DesejoHistorico"("cor", "porte");

-- CreateIndex
CREATE INDEX "RegistroCuidado_caoId_idx" ON "RegistroCuidado"("caoId");

-- CreateIndex
CREATE INDEX "RegistroCuidado_proximaData_idx" ON "RegistroCuidado"("proximaData");

-- CreateIndex
CREATE INDEX "Criopreservacao_canilId_idx" ON "Criopreservacao"("canilId");

-- CreateIndex
CREATE INDEX "Criopreservacao_caoId_idx" ON "Criopreservacao"("caoId");

-- CreateIndex
CREATE INDEX "Notificacao_userId_lida_idx" ON "Notificacao"("userId", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_userId_chave_key" ON "Notificacao"("userId", "chave");

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorito" ADD CONSTRAINT "Favorito_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPreco" ADD CONSTRAINT "HistoricoPreco_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendaRegistro" ADD CONSTRAINT "VendaRegistro_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendaRegistro" ADD CONSTRAINT "VendaRegistro_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesejoHistorico" ADD CONSTRAINT "DesejoHistorico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroCuidado" ADD CONSTRAINT "RegistroCuidado_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criopreservacao" ADD CONSTRAINT "Criopreservacao_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criopreservacao" ADD CONSTRAINT "Criopreservacao_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
